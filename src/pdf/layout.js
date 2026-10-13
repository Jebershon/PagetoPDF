// Pure layout helpers: no DOM, no jsPDF. Distances are in mm unless the name says Px (CSS pixels).

export const PAGE_SIZES_MM = {
    A4: [210, 297],
    A3: [297, 420],
    A5: [148, 210],
    Letter: [215.9, 279.4],
    Legal: [215.9, 355.6]
};

export const DEFAULT_PAGE_NUMBER_FORMAT = "Page {page} of {total}";
export const MIN_RENDER_SCALE = 1;
export const MAX_RENDER_SCALE = 4;
export const DEFAULT_RENDER_SCALE = 2;

// Conservative canvas limits that hold in every current browser, including iOS Safari.
export const MAX_CANVAS_AREA = 16777216;
export const MAX_CANVAS_DIMENSION = 16384;

// Tolerance for sub-pixel rounding in getBoundingClientRect values.
const EPSILON_PX = 0.5;

/** Page width and height in mm for a page size key and orientation ("Portrait" | "Landscape"). */
export function pageDimensions(pageSize, orientation) {
    const [short, long] = PAGE_SIZES_MM[pageSize] || PAGE_SIZES_MM.A4;
    return orientation === "Landscape" ? { width: long, height: short } : { width: short, height: long };
}

/** Margins in mm from the widget's integer properties; missing or negative values become 0. */
export function normalizeMargins({ marginTop, marginRight, marginBottom, marginLeft }) {
    const mm = value => (typeof value === "number" && isFinite(value) && value > 0 ? value : 0);
    return { top: mm(marginTop), right: mm(marginRight), bottom: mm(marginBottom), left: mm(marginLeft) };
}

/** The area inside the margins, or null when the margins leave no room on the page. */
export function printableArea(dimensions, margins) {
    const width = dimensions.width - margins.left - margins.right;
    const height = dimensions.height - margins.top - margins.bottom;
    if (width <= 0 || height <= 0) {
        return null;
    }
    return { x: margins.left, y: margins.top, width, height };
}

export function clampRenderScale(value) {
    if (typeof value !== "number" || !isFinite(value)) {
        return DEFAULT_RENDER_SCALE;
    }
    return Math.min(MAX_RENDER_SCALE, Math.max(MIN_RENDER_SCALE, Math.round(value)));
}

export function formatPageNumber(format, page, total) {
    const template = format && format.trim() ? format : DEFAULT_PAGE_NUMBER_FORMAT;
    return template.replace(/\{page\}/g, String(page)).replace(/\{total\}/g, String(total));
}

/**
 * Turns a class property ("my-class", ".my-class" or "a b") into a selector (".my-class", ".a.b").
 * Returns null for an empty value.
 */
export function toClassSelector(className) {
    const classes = String(className || "")
        .split(/\s+/)
        .map(name => name.replace(/^\.+/, ""))
        .filter(Boolean);
    return classes.length ? "." + classes.join(".") : null;
}

/**
 * How an element of contentWidthPx x contentHeightPx is placed in the printable area.
 * Flow scales to the printable width; FitToPage scales uniformly so the whole element fits.
 * mmPerPx converts CSS pixels of the element to mm on the page.
 */
export function computePlacement(overflowMode, contentWidthPx, contentHeightPx, area) {
    if (overflowMode === "FitToPage") {
        const mmPerPx = Math.min(area.width / contentWidthPx, area.height / contentHeightPx);
        const width = contentWidthPx * mmPerPx;
        return {
            mmPerPx,
            x: area.x + (area.width - width) / 2,
            y: area.y,
            pageHeightPx: contentHeightPx
        };
    }
    const mmPerPx = area.width / contentWidthPx;
    return { mmPerPx, x: area.x, y: area.y, pageHeightPx: area.height / mmPerPx };
}

/**
 * Splits content of contentHeightPx into page slices [{ start, end }] no taller than pageHeightPx.
 *
 * - forced: y positions where a new page must start (break-before / break-after: page).
 * - avoid: [{ top, bottom }] ranges that must not be cut (rows, images, text lines, avoid-break
 *   elements). Ranges taller than a page cannot be honoured and are ignored, so their children
 *   (for example the rows of a long table) decide the cut instead.
 *
 * A cut is moved up to the top of any range it would go through. When that leaves no room, the
 * page is cut at its full height.
 */
export function selectBreakPoints(contentHeightPx, pageHeightPx, { avoid = [], forced = [] } = {}) {
    if (!(contentHeightPx > 0)) {
        return [];
    }
    if (!(pageHeightPx > 0)) {
        throw new Error("Page height must be greater than 0.");
    }

    const blocks = avoid.filter(
        block => block.bottom - block.top > 0 && block.bottom - block.top <= pageHeightPx + EPSILON_PX
    );
    const breaks = forced.filter(y => y > EPSILON_PX && y < contentHeightPx - EPSILON_PX).sort((a, b) => a - b);

    const slices = [];
    let start = 0;
    while (contentHeightPx - start > EPSILON_PX) {
        const limit = start + pageHeightPx;
        const forcedBreak = nextForcedBreak(breaks, start, limit);
        let end;
        if (forcedBreak !== undefined) {
            end = forcedBreak;
        } else if (limit >= contentHeightPx - EPSILON_PX) {
            end = contentHeightPx;
        } else {
            end = findCut(start, limit, blocks);
        }
        slices.push({ start, end });
        start = end;
    }
    return slices;
}

function nextForcedBreak(breaks, start, limit) {
    return breaks.find(y => y > start + EPSILON_PX && y <= limit + EPSILON_PX);
}

function findCut(start, limit, blocks) {
    let cut = limit;
    let moved = true;
    while (moved) {
        moved = false;
        for (const block of blocks) {
            const crossesCut = block.top < cut - EPSILON_PX && block.bottom > cut + EPSILON_PX;
            // A block that starts at the top of this page can't be pushed further down.
            if (crossesCut && block.top > start + EPSILON_PX) {
                cut = block.top;
                moved = true;
            }
        }
    }
    return cut;
}

/**
 * html2canvas scale for a placed element. renderScale is defined for content that fills the
 * printable width; content shrunk further (FitToPage) gets proportionally fewer pixels, so it
 * isn't rendered at a resolution the page can't show.
 */
export function effectiveRenderScale(renderScale, placement, contentWidthPx, area) {
    const fullWidthMmPerPx = area.width / contentWidthPx;
    return Math.min(renderScale, (renderScale * placement.mmPerPx) / fullWidthMmPerPx);
}

/** Largest html2canvas scale (<= desiredScale) that keeps a widthPx x heightPx canvas within limits. */
export function safeCanvasScale(widthPx, heightPx, desiredScale) {
    const byDimension = MAX_CANVAS_DIMENSION / Math.max(widthPx, heightPx, 1);
    const byArea = Math.sqrt(MAX_CANVAS_AREA / Math.max(widthPx * heightPx, 1));
    return Math.min(desiredScale, byDimension, byArea);
}

/** Tallest strip (in CSS px) of a widthPx-wide element that can be rendered in one canvas at scale. */
export function maxChunkHeightPx(widthPx, scale) {
    const byDimension = MAX_CANVAS_DIMENSION / scale;
    const byArea = MAX_CANVAS_AREA / (Math.max(widthPx, 1) * scale * scale);
    return Math.max(1, Math.floor(Math.min(byDimension, byArea)));
}

/**
 * Groups consecutive slices into chunks no taller than maxHeightPx, so several pages can share one
 * html2canvas call. A slice taller than maxHeightPx gets a chunk of its own.
 * Returns [{ start, end, slices }].
 */
export function groupIntoChunks(slices, maxHeightPx) {
    const chunks = [];
    for (const slice of slices) {
        const current = chunks[chunks.length - 1];
        if (current && slice.end - current.start <= maxHeightPx) {
            current.end = slice.end;
            current.slices.push(slice);
        } else {
            chunks.push({ start: slice.start, end: slice.end, slices: [slice] });
        }
    }
    return chunks;
}

/** Baselines for the header and footer: vertically centred in the top and bottom margins. */
export function headerFooterPositions(dimensions, margins) {
    return {
        headerY: margins.top / 2,
        footerY: dimensions.height - margins.bottom / 2,
        left: margins.left,
        right: dimensions.width - margins.right,
        center: margins.left + (dimensions.width - margins.left - margins.right) / 2
    };
}
