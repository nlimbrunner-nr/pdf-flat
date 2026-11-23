# PDF Flattener

© Nikolai Limbrunner

**Open the tool: <https://nlimbrunner-nr.github.io/pdf-flat/>**

Browser tool that turns every page of a PDF into an image and rebuilds the PDF from those images.
Form fields, text layers and DocuSign certificate boxes end up as part of a flat picture, so signing
tools like Adobe Sign have nothing left to misread.

## 🔒 Your files never leave your computer

Everything happens locally in your browser. Nothing is uploaded, stored or sent anywhere.

- **Only local dependencies.** The PDF libraries ([pdf.js](https://mozilla.github.io/pdf.js/)
  4.10.38 and [pdf-lib](https://pdf-lib.js.org/) 1.17.1) are stored in this repo under `vendor/`.
  Nothing is fetched from a CDN.
- **All outgoing connections are blocked.** The page's Content Security Policy forbids any network
  connection (`connect-src 'none'`), including from the PDF rendering worker, and only code from
  this site may run.

There is no server behind this tool: GitHub Pages only delivers the page itself.

## Caveats

- A flattened copy shows a picture of a signature but can't be verified as electronically signed.
  Keep the original.
- Text can't be selected or searched afterwards.
- Password-protected PDFs need the password removed first.
