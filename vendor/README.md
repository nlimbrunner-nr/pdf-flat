# Vendored libraries

Unmodified files from Mozilla's official pdf.js release
[v4.10.38](https://github.com/mozilla/pdf.js/releases/tag/v4.10.38)
(`pdfjs-4.10.38-dist.zip`, folder `build/`). Licensed under Apache-2.0, see `LICENSE-pdfjs`.

| File | SHA-256 |
|---|---|
| `pdf.mjs` | `a209a2124baa35cbb9015b809926f1bcec9dd1c247296290e205dd9d76cb9128` |
| `pdf.worker.mjs` | `7c237f83fa56bce645d8af51d183c9c56ba7b2d2928ff42754dc7020bea36323` |

To verify:

```sh
curl -LO https://github.com/mozilla/pdf.js/releases/download/v4.10.38/pdfjs-4.10.38-dist.zip
unzip -o pdfjs-4.10.38-dist.zip build/pdf.mjs build/pdf.worker.mjs
shasum -a 256 build/pdf.mjs build/pdf.worker.mjs vendor/pdf.mjs vendor/pdf.worker.mjs
```

The same files are also published on npm as `pdfjs-dist@4.10.38` (`build/`), with identical hashes.
