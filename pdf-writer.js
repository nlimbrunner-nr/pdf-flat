// Minimal PDF writer: each page is one full-page image. That's all a flattened PDF needs.
//
// pages: [{ width, height, image: { kind: "jpeg" | "flate", width, height, bytes } }]
//   width/height   page size in PDF points (1/72 inch)
//   image.width/height  pixel size
//   image.bytes    "jpeg": a complete JPEG file (embedded as-is)
//                  "flate": zlib-compressed RGB pixels, 8 bits per channel, no row filters
// Returns a Blob containing the PDF.

const enc = new TextEncoder();
const num = n => String(Math.round(n * 1000) / 1000);

export function buildPdf(pages) {
  const chunks = [];
  const offsets = [];
  let pos = 0;
  const write = data => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    pos += bytes.length;
  };
  const object = (id, dict, stream) => {
    offsets[id] = pos;
    write(`${id} 0 obj\n${dict}\n`);
    if (stream) {
      write("stream\n");
      write(stream);
      write("\nendstream\n");
    }
    write("endobj\n");
  };

  // Header plus a comment with high bytes, which marks the file as binary.
  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Object ids: 1 catalog, 2 page tree, then three per page (page, content stream, image).
  const pageId = i => 3 + 3 * i;
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] ` +
            `/Count ${pages.length} >>`);

  pages.forEach((p, i) => {
    const id = pageId(i);
    const w = num(p.width), h = num(p.height);
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
               `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);

    // Scale the 1×1 image space to the full page and draw the image.
    const content = enc.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
    object(id + 1, `<< /Length ${content.length} >>`, content);

    const filter = p.image.kind === "jpeg" ? "/DCTDecode" : "/FlateDecode";
    object(id + 2, `<< /Type /XObject /Subtype /Image /Width ${p.image.width} ` +
                   `/Height ${p.image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
                   `/Filter ${filter} /Length ${p.image.bytes.length} >>`, p.image.bytes);
  });

  // Cross-reference table: byte offset of every object, each entry exactly 20 bytes.
  const size = pageId(pages.length);
  const xrefPos = pos;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let id = 1; id < size; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  write(xref);
  write(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}
