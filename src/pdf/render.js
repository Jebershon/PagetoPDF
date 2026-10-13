import {
    computePlacement,
    effectiveRenderScale,
    formatPageNumber,
    groupIntoChunks,
    headerFooterPositions,
    maxChunkHeightPx,
    pageDimensions,
    printableArea,
    safeCanvasScale,
    selectBreakPoints
} from "./layout";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { measureBreakHints } from "./measure";

const HEADER_FOOTER_FONT_SIZE = 9;
const HEADER_FOOTER_GAP_MM = 4;

/**
 * Renders the pages to one jsPDF document.
 *
 * pages: [{ element, settings: { pageSize, orientation, overflowMode } }] (see collectPages)
 * options: { margins, renderScale, jpegQuality, excludedClasses, avoidBreakClass,
 *            headerText, footerText, showPageNumbers, pageNumberFormat }
 */
export async function renderPdf(pages, options) {
    const { margins, excludedClasses } = options;
    const ignoreElements = node =>
        Boolean(node.classList) && excludedClasses.some(name => node.classList.contains(name));
    let doc = null;

    const addPage = dimensions => {
        const format = [dimensions.width, dimensions.height];
        const orientation = dimensions.width > dimensions.height ? "landscape" : "portrait";
        if (doc) {
            doc.addPage(format, orientation);
        } else {
            doc = new jsPDF({ unit: "mm", format, orientation, compress: true });
        }
    };

    for (const [index, { element, settings }] of pages.entries()) {
        const dimensions = pageDimensions(settings.pageSize, settings.orientation);
        const area = printableArea(dimensions, margins);
        if (!area) {
            throw new Error(
                `The margins leave no room on page ${index + 1} (${settings.pageSize} ${settings.orientation}).`
            );
        }

        const hints = measureBreakHints(element, { avoidBreakClass: options.avoidBreakClass, excludedClasses });
        if (hints.width <= 0 || hints.height <= 0) {
            console.warn(`[PageToPDF] Page element ${index + 1} is not visible and is skipped.`, element);
            continue;
        }

        const placement = computePlacement(settings.overflowMode, hints.width, hints.height, area);
        const slices =
            settings.overflowMode === "FitToPage"
                ? [{ start: 0, end: hints.height }]
                : selectBreakPoints(hints.height, placement.pageHeightPx, hints);
        const renderScale = effectiveRenderScale(options.renderScale, placement, hints.width, area);
        const chunks = groupIntoChunks(slices, maxChunkHeightPx(hints.width, renderScale));

        for (const chunk of chunks) {
            const chunkHeight = chunk.end - chunk.start;
            const scale = safeCanvasScale(hints.width, chunkHeight, renderScale);
            const canvas = await html2canvas(element, {
                scale,
                y: chunk.start,
                height: Math.ceil(chunkHeight),
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
                ignoreElements
            });
            try {
                for (const slice of chunk.slices) {
                    const image = cropToJpeg(
                        canvas,
                        (slice.start - chunk.start) * scale,
                        (slice.end - slice.start) * scale,
                        options.jpegQuality
                    );
                    addPage(dimensions);
                    doc.addImage(
                        image,
                        "JPEG",
                        placement.x,
                        placement.y,
                        hints.width * placement.mmPerPx,
                        (slice.end - slice.start) * placement.mmPerPx
                    );
                }
            } finally {
                // Free the canvas memory right away instead of waiting for garbage collection.
                canvas.width = 0;
                canvas.height = 0;
            }
        }
    }

    if (!doc) {
        throw new Error("Nothing to export: none of the page elements is visible.");
    }
    drawHeaderAndFooter(doc, options);
    return doc;
}

function cropToJpeg(source, sourceY, sourceHeight, quality) {
    const y = Math.max(0, Math.floor(sourceY));
    const height = Math.max(1, Math.min(Math.round(sourceHeight), source.height - y));
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, y, source.width, height, 0, 0, source.width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
}

// Drawn after all pages exist, so {total} is known.
function drawHeaderAndFooter(doc, { margins, headerText, footerText, showPageNumbers, pageNumberFormat }) {
    if (!headerText && !footerText && !showPageNumbers) {
        return;
    }
    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(HEADER_FOOTER_FONT_SIZE);
        doc.setTextColor(80, 80, 80);
        const dimensions = { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() };
        const position = headerFooterPositions(dimensions, margins);
        const printableWidth = position.right - position.left;
        const textOptions = { baseline: "middle" };

        if (headerText) {
            const text = truncate(doc, headerText, printableWidth);
            doc.text(text, position.center, position.headerY, { ...textOptions, align: "center" });
        }

        const pageNumber = showPageNumbers ? formatPageNumber(pageNumberFormat, page, total) : "";
        if (footerText && pageNumber) {
            const numberWidth = doc.getTextWidth(pageNumber);
            const text = truncate(doc, footerText, printableWidth - numberWidth - HEADER_FOOTER_GAP_MM);
            doc.text(text, position.left, position.footerY, { ...textOptions, align: "left" });
            doc.text(pageNumber, position.right, position.footerY, { ...textOptions, align: "right" });
        } else if (footerText || pageNumber) {
            const text = truncate(doc, footerText || pageNumber, printableWidth);
            doc.text(text, position.center, position.footerY, { ...textOptions, align: "center" });
        }
    }
}

function truncate(doc, text, maxWidth) {
    const singleLine = String(text).replace(/\s+/g, " ").trim();
    if (doc.getTextWidth(singleLine) <= maxWidth) {
        return singleLine;
    }
    let end = singleLine.length;
    while (end > 0 && doc.getTextWidth(singleLine.slice(0, end) + "...") > maxWidth) {
        end--;
    }
    return end > 0 ? singleLine.slice(0, end) + "..." : "";
}
