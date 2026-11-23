# PDF Flattener

**Open the tool: <https://nlimbrunner-nr.github.io/pdf-flat/>**

Browser tool that turns every page of a PDF into an image and rebuilds the PDF from those images.
Form fields, text layers and DocuSign certificate boxes end up as part of a flat picture, so signing
tools like Adobe Sign have nothing left to misread.

## 🔒 Your files never leave your computer

Everything happens locally in your browser. Nothing is uploaded, stored or sent anywhere, so it's
safe to use for contracts and other confidential documents. There is no server behind this tool:
GitHub Pages only delivers the page itself, and the PDF libraries
([pdf.js](https://mozilla.github.io/pdf.js/) and [pdf-lib](https://pdf-lib.js.org/)) are loaded
as code from jsDelivr. Your document is never part of any request.

## Caveats

- A flattened copy shows a picture of a signature but can't be verified as electronically signed.
  Keep the original.
- Text can't be selected or searched afterwards.
- Password-protected PDFs need the password removed first.
