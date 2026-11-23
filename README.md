# PDF Flattener

**Open the tool: <https://nlimbrunner-nr.github.io/pdf-flat/>**

Browser tool that turns every page of a PDF into an image and rebuilds the PDF from those images.
Form fields, text layers and DocuSign certificate boxes end up as part of a flat picture, so signing
tools like Adobe Sign have nothing left to misread.

Everything runs locally in the browser. The PDF is never uploaded anywhere; the page only loads
[pdf.js](https://mozilla.github.io/pdf.js/) and [pdf-lib](https://pdf-lib.js.org/) from jsDelivr.

## Caveats

- A flattened copy shows a picture of a signature but can't be verified as electronically signed.
  Keep the original.
- Text can't be selected or searched afterwards.
- Password-protected PDFs need the password removed first.
