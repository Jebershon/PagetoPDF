# PageToPDF
*A Mendix pluggable widget that converts a page, or parts of it, to a formatted PDF.*

---

## Features
- Export one element as a flowing document, or lay the PDF out **page by page**: every marked container starts its own page with its own size, orientation and overflow mode.
- Page sizes A4, A3, A5, Letter and Legal, portrait or landscape, with margins in millimetres.
- **Smart page breaks**: table rows, images, text lines and elements you mark are never cut in half. CSS `break-before: page`, `break-after: page` and `break-inside: avoid` are honoured.
- **Fit to page**: shrink a container so it fits on exactly one page.
- Optional header, footer and page numbers ("Page 2 of 5").
- Download the PDF, preview it in a new tab, or just store it: the file name and Base64 content are written to Mendix attributes and an action runs afterwards.

---

## Usage
1. Add the widget to a page, inside or next to the content you want to export.
2. Give the container you want to export a class (for example `report-root`) and enter it in **ClassName**.
3. Set **FileName**, and optionally map **PDFName** and **Base64** to String attributes (Base64 needs an unlimited-length String attribute).
4. Choose a **File Option** and, if needed, an **On Change** action. The action runs after both attributes are set.

### Properties

| Group | Property | Description |
| --- | --- | --- |
| General | ClassName | Class of the element to export. With an empty *Pages* list it is exported as one flowing document; otherwise page containers are looked up inside it. |
| | FileName | File name without `.pdf`. |
| | On Change | Action executed after the PDF is generated and the attributes are set. |
| | Button Style ClassName | Class(es) for the button, e.g. `btn btn-primary`. |
| Data Source | File Name Attribute (PDFName) | Receives `<FileName>.pdf`. |
| | Base64 String (Base64) | Receives the PDF as Base64 (no `data:` prefix). |
| File Options | File Option | *Download*, *Preview* (new tab) or *Do nothing*. Attributes and the action are handled in all three cases. |
| Page layout | Page size | A4 (default), A3, A5, Letter, Legal. |
| | Orientation | Portrait (default) or Landscape. |
| | Margin top / right / bottom / left | In mm, default 10. |
| | Overflow mode | *Flow* (default): continue on extra pages with smart breaks. *Fit to page*: scale down to one page. |
| | Render scale | 1 to 4, default 2. Higher is sharper but slower and gives a bigger file. |
| Pages | Pages | List of page containers, see below. Empty = flowing document. |
| Header & footer | Header text / Footer text | Optional text templates, drawn in the top and bottom margins. |
| | Show page numbers | Draws a page number in the bottom margin. |
| | Page number format | Default `Page {page} of {total}`. |
| Formatting & button | Exclude class | Default `pdf-exclude`. Elements with this class are left out of the PDF. |
| | Avoid break class | Default `pdf-avoid-break`. Elements with this class are never split across pages. |
| | Button caption | Default "Download PDF". |

Each **Pages** item has a **Page class** (required) plus *Page size*, *Orientation* and *Overflow mode*, which default to *Inherit* (use the *Page layout* values). Pages follow the list order. When a class matches several elements inside the ClassName element, each match becomes its own page, in the order they appear on the page.

### Helper classes
- `pdf-exclude`: hide an element from the PDF (buttons, filters, navigation). The export widget itself is always left out.
- `pdf-avoid-break`: keep an element (a card, a chart with its caption, a signature block) together on one page in *Flow* mode. If it is taller than a page it is split anyway.
- `html2pdf__page-break` (from earlier versions) still forces a new page.

### Page-wise example
A report with a cover page and a landscape details section:

1. Put a container with class `report-root` around the content and set **ClassName** to `report-root`.
2. Inside it, add a container with class `pdf-page-cover` and one (or a list view of them) with class `pdf-page-details`.
3. In **Pages** add:
   - Page class `pdf-page-cover`, everything *Inherit* → an A4 portrait cover.
   - Page class `pdf-page-details`, Orientation *Landscape*, Overflow mode *Flow* → each details container starts a new landscape page and continues onto more pages when it is long, breaking between table rows.
4. Optional: footer text `Confidential`, *Show page numbers* on.
5. Add class `pdf-exclude` to anything inside `report-root` that shouldn't be printed.

---

## Known limitations
- Pages are images of the rendered HTML: text in the PDF can't be selected or searched, and file sizes are larger than a text PDF. Lower the render scale for smaller files.
- Very large pages (long data grids, high render scale) take a while to render and use a lot of memory. They are rendered in strips to stay within browser canvas limits.
- Rendering uses html2canvas, which supports most but not all CSS (for example some newer color functions, `backdrop-filter` and complex `clip-path`). Images from other domains need CORS headers to appear.
- Header and footer text use the PDF's built-in Helvetica font, which only covers Western European characters.
- Content is rendered at the width it has on screen; a narrower browser window gives a different layout.

---

## Issues, Suggestions, and Feature Requests
If you encounter issues, have feature suggestions, or want to request enhancements, please visit the [GitHub Issues page](https://github.com/Jebershon/PagetoPDF/issues).

---

## Development and Contribution
1. Clone the repository and navigate to the project folder.
2. Install the dependencies: `npm install`
3. Useful scripts:
   - `npm test`: unit tests for the layout logic (`src/pdf/__tests__`)
   - `npm run lint`: Prettier and ESLint
   - `npm run build`: development build, `.mpk` in `dist/<version>/`
   - `npm run release`: production build
4. Code layout:
   - `src/components/PdfExportButton.jsx`: the button, busy state and outputs
   - `src/pdf/collectPages.js`: finds and orders the page elements, merges page settings
   - `src/pdf/layout.js`: pure page-size, margin, break-point and page-number logic
   - `src/pdf/measure.js`: reads break hints (rows, images, text lines) from the DOM
   - `src/pdf/render.js`: html2canvas + jsPDF rendering
   - `rollup.config.mjs`: keeps jsPDF's unused optional helpers (canvg, dompurify) out of the bundle
