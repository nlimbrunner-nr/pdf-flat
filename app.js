import * as pdfjsLib from "./vendor/pdf.mjs";
import { buildPdf } from "./pdf-writer.js";

// Start the worker from a blob URL: blob workers inherit this page's Content-Security-Policy,
// while a worker loaded directly from a file would get none on GitHub Pages.
const workerUrl = new URL("vendor/pdf.worker.mjs", import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  URL.createObjectURL(new Blob([`import "${workerUrl}";`], { type: "text/javascript" })),
  { type: "module" });

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

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("Page too large to render at this resolution")),
    type, quality));
}

// Turns the rendered page into image data for pdf-writer.js.
async function encodePage(canvas, fmt) {
  const { width, height } = canvas;
  if (fmt === "jpeg") {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    return { kind: "jpeg", width, height, bytes: new Uint8Array(await blob.arrayBuffer()) };
  }
  // Lossless: drop the alpha channel and zlib-compress the RGB pixels with the browser's own
  // CompressionStream ("deflate" is zlib format, which is what PDF's FlateDecode expects).
  const rgba = canvas.getContext("2d").getImageData(0, 0, width, height).data;
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2];
  }
  const zipped = new Blob([rgb]).stream().pipeThrough(new CompressionStream("deflate"));
  return { kind: "flate", width, height, bytes: new Uint8Array(await new Response(zipped).arrayBuffer()) };
}

// Small preview image, so the full-size page doesn't have to be kept around.
function thumbnail(canvas) {
  const t = document.createElement("canvas");
  t.height = 240;
  t.width = Math.round(canvas.width * t.height / canvas.height);
  t.getContext("2d").drawImage(canvas, 0, 0, t.width, t.height);
  return canvasToBlob(t, "image/jpeg", 0.8);
}

async function flatten(file, ui) {
  const dpi = Number(document.getElementById("dpi").value);
  const fmt = document.getElementById("fmt").value;
  let src;
  try {
    ui.status.textContent = "Opening…";
    src = await pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
      isEvalSupported: false,                                // no eval() on untrusted PDFs
    }).promise;
    const pages = [];
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

      pages.push({ width: size.width, height: size.height, image: await encodePage(canvas, fmt) });

      const thumb = document.createElement("img");
      thumb.src = URL.createObjectURL(await thumbnail(canvas));
      thumb.alt = `Page ${i}`;
      ui.thumbs.append(thumb);

      canvas.width = canvas.height = 0;                      // release canvas memory early
      page.cleanup();
      ui.bar.value = i;
    }

    ui.status.textContent = "Saving…";
    const pdf = buildPdf(pages);
    const url = URL.createObjectURL(pdf);
    const outName = file.name.replace(/\.pdf$/i, "") + " (flattened).pdf";
    const a = document.createElement("a");
    a.className = "dl"; a.href = url; a.download = outName; a.textContent = "Download";
    ui.head.append(a);
    ui.status.textContent =
      `${src.numPages} page${src.numPages > 1 ? "s" : ""} · ${(pdf.size / 1024 / 1024).toFixed(2)} MB`;
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
