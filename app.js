import * as pdfjsLib from "./vendor/pdf.min.mjs";

// Start the worker from a blob URL: blob workers inherit this page's Content-Security-Policy,
// while a worker loaded directly from a file would get none on GitHub Pages.
const workerUrl = new URL("vendor/pdf.worker.min.mjs", import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  URL.createObjectURL(new Blob([`import "${workerUrl}";`], { type: "text/javascript" })),
  { type: "module" });

const { PDFDocument } = window.PDFLib;
const drop = document.getElementById("drop");
const input = document.getElementById("file");
const jobs = document.getElementById("jobs");

// Process files one at a time to keep memory use bounded.
let queue = Promise.resolve();
function enqueue(files) {
  for (const file of files) {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) continue;
    const ui = createJobUI(file.name);
    queue = queue.then(() => flatten(file, ui)).catch(() => {});
  }
}

input.addEventListener("change", () => { enqueue(input.files); input.value = ""; });
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault(); drop.classList.add("over");
}));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault(); drop.classList.remove("over");
}));
drop.addEventListener("drop", e => enqueue(e.dataTransfer.files));
// Avoid the browser opening a PDF dropped next to the target.
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => e.preventDefault());

function createJobUI(name) {
  const el = document.createElement("div");
  el.className = "job";
  el.innerHTML = `
    <div class="job-head">
      <div><div class="job-name"></div><div class="job-status">Waiting…</div></div>
    </div>
    <progress value="0" max="1"></progress>
    <div class="thumbs"></div>`;
  el.querySelector(".job-name").textContent = name;
  jobs.prepend(el);
  return {
    head: el.querySelector(".job-head"),
    status: el.querySelector(".job-status"),
    bar: el.querySelector("progress"),
    thumbs: el.querySelector(".thumbs"),
  };
}

function canvasToBytes(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? blob.arrayBuffer().then(b => resolve(new Uint8Array(b)), reject)
                 : reject(new Error("Page too large to render at this resolution")),
    type, quality));
}

async function flatten(file, ui) {
  const dpi = Number(document.getElementById("dpi").value);
  const fmt = document.getElementById("fmt").value;
  const mime = fmt === "png" ? "image/png" : "image/jpeg";
  let src;
  try {
    ui.status.textContent = "Opening…";
    src = await pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
      isEvalSupported: false,                                // no eval() on untrusted PDFs
    }).promise;
    const out = await PDFDocument.create();
    ui.bar.max = src.numPages;

    for (let i = 1; i <= src.numPages; i++) {
      ui.status.textContent = `Rendering page ${i} of ${src.numPages}…`;
      const page = await src.getPage(i);
      const size = page.getViewport({ scale: 1 });           // PDF points, rotation applied
      const viewport = page.getViewport({ scale: dpi / 72 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";                                // JPEG has no alpha
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draws form fields and signature widgets (with their filled values) into the canvas.
      await page.render({
        canvasContext: ctx, viewport,
        annotationMode: pdfjsLib.AnnotationMode.ENABLE_STORAGE,
      }).promise;

      const bytes = await canvasToBytes(canvas, mime, 0.92);
      const img = fmt === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
      out.addPage([size.width, size.height])
         .drawImage(img, { x: 0, y: 0, width: size.width, height: size.height });

      const thumb = document.createElement("img");
      thumb.src = URL.createObjectURL(new Blob([bytes], { type: mime }));
      thumb.alt = `Page ${i}`;
      ui.thumbs.append(thumb);

      canvas.width = canvas.height = 0;                      // release canvas memory early
      page.cleanup();
      ui.bar.value = i;
    }

    ui.status.textContent = "Saving…";
    const pdfBytes = await out.save();
    const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    const outName = file.name.replace(/\.pdf$/i, "") + " (flattened).pdf";
    const a = document.createElement("a");
    a.className = "dl"; a.href = url; a.download = outName; a.textContent = "Download";
    ui.head.append(a);
    ui.status.textContent =
      `${src.numPages} page${src.numPages > 1 ? "s" : ""} · ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`;
    ui.bar.remove();
  } catch (err) {
    ui.status.classList.add("err");
    ui.status.textContent = err?.name === "PasswordException"
      ? "This PDF is password-protected. Remove the password first."
      : `Failed: ${err?.message || err}`;
    ui.bar.remove();
    throw err;
  } finally {
    src?.destroy();
  }
}
