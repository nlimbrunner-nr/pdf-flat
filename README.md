# PDF Flattener

Browser tool that turns every page of a PDF into an image and rebuilds the PDF from those images.
Form fields, text layers and DocuSign certificate boxes end up as part of a flat picture, so signing
tools like Adobe Sign have nothing left to misread.

Everything runs locally in the browser. The PDF is never uploaded anywhere; the page only loads
[pdf.js](https://mozilla.github.io/pdf.js/) and [pdf-lib](https://pdf-lib.js.org/) from jsDelivr.

## Use

Open the page, drop one or more PDFs, click **Download**. Output is saved as `<name> (flattened).pdf`.

- **Resolution**: 300 DPI is sharp, 150 DPI gives much smaller files.
- **Format**: JPEG keeps files small; PNG is lossless but larger.

Page sizes and orientation are kept from the original.

## Caveats

- A flattened copy shows a picture of a signature but can't be verified as electronically signed.
  Keep the original.
- Text can't be selected or searched afterwards.
- Password-protected PDFs need the password removed first.

## Host on GitHub Pages

1. Push this repo to GitHub.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/` after a minute or two.

On a personal account the repo must be public (only the code is public, never the documents).
A GitHub Enterprise org can publish Pages privately.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
