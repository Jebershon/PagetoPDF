// Reads break hints from the live DOM, relative to the top of the page element.

const MEASURE_ATTRIBUTE = "data-pagetopdf-measuring";
const LEGACY_PAGE_BREAK_CLASS = "html2pdf__page-break";
const UNSPLITTABLE_TAGS = ["TR", "IMG", "SVG", "CANVAS", "VIDEO"];
const PAGE_BREAK_VALUES = ["page", "always", "left", "right", "recto", "verso"];
const AVOID_VALUES = ["avoid", "avoid-page"];

/**
 * Measures an element for page breaking: its size plus
 * - avoid: [{ top, bottom }] for avoid-break elements, table rows, images and text lines
 * - forced: [y] for break-before / break-after: page and legacy .html2pdf__page-break elements
 *
 * Excluded elements are hidden while measuring, so the layout matches what html2canvas renders
 * (it skips them). Hiding and restoring happen in one synchronous block, so nothing is painted.
 */
export function measureBreakHints(element, { avoidBreakClass, excludedClasses }) {
    const restore = hideExcluded(element, excludedClasses);
    try {
        const origin = element.getBoundingClientRect();
        const relative = rect => ({ top: rect.top - origin.top, bottom: rect.bottom - origin.top });
        const avoid = [];
        const forced = [];

        element.querySelectorAll("*").forEach(node => {
            const rect = node.getBoundingClientRect();
            if (rect.height <= 0) {
                return;
            }
            const style = window.getComputedStyle(node);
            if (
                UNSPLITTABLE_TAGS.includes(node.tagName.toUpperCase()) ||
                (avoidBreakClass && node.classList.contains(avoidBreakClass)) ||
                AVOID_VALUES.includes(style.breakInside) ||
                AVOID_VALUES.includes(style.pageBreakInside)
            ) {
                avoid.push(relative(rect));
            }
            if (
                node.classList.contains(LEGACY_PAGE_BREAK_CLASS) ||
                PAGE_BREAK_VALUES.includes(style.breakBefore) ||
                PAGE_BREAK_VALUES.includes(style.pageBreakBefore)
            ) {
                forced.push(rect.top - origin.top);
            }
            if (PAGE_BREAK_VALUES.includes(style.breakAfter) || PAGE_BREAK_VALUES.includes(style.pageBreakAfter)) {
                forced.push(rect.bottom - origin.top);
            }
        });

        collectTextLines(element).forEach(rect => avoid.push(relative(rect)));

        return { width: origin.width, height: origin.height, avoid, forced };
    } finally {
        restore();
    }
}

function collectTextLines(element) {
    const lines = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: node => (node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        range.selectNodeContents(node);
        // One rect per line box the text node occupies.
        for (const rect of Array.from(range.getClientRects())) {
            if (rect.height > 0) {
                lines.push(rect);
            }
        }
    }
    range.detach();
    return lines;
}

function hideExcluded(element, excludedClasses) {
    const classes = excludedClasses.filter(Boolean);
    if (classes.length === 0) {
        return () => undefined;
    }
    const scope = `[${MEASURE_ATTRIBUTE}]`;
    const style = document.createElement("style");
    style.textContent = classes.map(name => `${scope} .${name}`).join(", ") + " { display: none !important; }";
    document.head.appendChild(style);
    element.setAttribute(MEASURE_ATTRIBUTE, "");
    return () => {
        element.removeAttribute(MEASURE_ATTRIBUTE);
        style.remove();
    };
}
