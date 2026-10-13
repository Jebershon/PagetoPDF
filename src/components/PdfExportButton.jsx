import { blobToBase64, downloadBlob, openPreviewWindow } from "../pdf/output";
import { clampRenderScale, normalizeMargins, toClassSelector } from "../pdf/layout";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { collectPages } from "../pdf/collectPages";
import { renderPdf } from "../pdf/render";

// Always left out of the PDF, so the export button never shows up in its own output.
const WIDGET_CLASS = "pagetopdf-widget";
const DEFAULT_CAPTION = "Download PDF";
const JPEG_QUALITY = 0.95;

function cleanClass(value) {
    return String(value || "")
        .trim()
        .replace(/^\.+/, "");
}

function revokeUrl(urlRef) {
    if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
    }
}

function setAttribute(attribute, value, label) {
    if (!attribute) {
        return;
    }
    if (attribute.readOnly) {
        console.warn(`[PageToPDF] ${label} attribute is read-only and was not updated.`);
        return;
    }
    attribute.setValue(value);
}

async function generatePdfBlob(props) {
    const rootSelector = toClassSelector(props.ClassName);
    const root = rootSelector && document.querySelector(rootSelector);
    if (!root) {
        throw new Error(`No element with class "${props.ClassName}" found. Check the ClassName property.`);
    }

    const excludedClasses = [cleanClass(props.excludeClass), WIDGET_CLASS].filter(Boolean);
    const defaults = {
        pageSize: props.pageSize || "A4",
        orientation: props.orientation || "Portrait",
        overflowMode: props.overflowMode || "Flow"
    };
    const pages = collectPages(root, props.pages, defaults, excludedClasses);
    if (pages.length === 0) {
        throw new Error("None of the configured page classes matched an element inside the ClassName element.");
    }

    const doc = await renderPdf(pages, {
        margins: normalizeMargins(props),
        renderScale: clampRenderScale(props.renderScale),
        jpegQuality: JPEG_QUALITY,
        excludedClasses,
        avoidBreakClass: cleanClass(props.avoidBreakClass),
        headerText: props.headerText && props.headerText.value,
        footerText: props.footerText && props.footerText.value,
        showPageNumbers: Boolean(props.showPageNumbers),
        pageNumberFormat: props.pageNumberFormat
    });
    return doc.output("blob");
}

// Generates the PDF once, delivers it, then sets PDFName, then Base64, then runs the action.
async function exportPdf(props, previewWindow, previewUrlRef) {
    const { FileName, onChangeAction, PDFName, Base64, fileOption } = props;
    const fileName = `${FileName}.pdf`;
    const blob = await generatePdfBlob(props);

    if (fileOption === "Download") {
        downloadBlob(blob, fileName);
    } else if (fileOption === "Preview") {
        revokeUrl(previewUrlRef);
        previewUrlRef.current = URL.createObjectURL(blob);
        if (previewWindow && !previewWindow.closed) {
            previewWindow.location.href = previewUrlRef.current;
        } else if (!window.open(previewUrlRef.current, "_blank")) {
            console.warn("[PageToPDF] The preview tab was blocked by the browser; downloading instead.");
            downloadBlob(blob, fileName);
        }
    }

    setAttribute(PDFName, fileName, "File name");
    if (Base64) {
        setAttribute(Base64, await blobToBase64(blob), "Base64");
    }
    if (onChangeAction && onChangeAction.canExecute) {
        onChangeAction.execute();
    }
}

export function PdfExportButton(props) {
    const { ButtonStyle, buttonCaption } = props;
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const previewUrlRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    useEffect(() => () => revokeUrl(previewUrlRef), []);

    const handleClick = useCallback(() => {
        if (busyRef.current) {
            return;
        }
        busyRef.current = true;
        setBusy(true);
        // Opened before anything async, while the click still counts as a user gesture.
        const previewWindow = propsRef.current.fileOption === "Preview" ? openPreviewWindow() : null;

        exportPdf(propsRef.current, previewWindow, previewUrlRef)
            .catch(error => {
                console.error("[PageToPDF] Failed to generate the PDF:", error);
                if (previewWindow && !previewWindow.closed) {
                    previewWindow.close();
                }
            })
            .finally(() => {
                busyRef.current = false;
                setBusy(false);
            });
    }, []);

    const caption = (buttonCaption && buttonCaption.value) || DEFAULT_CAPTION;
    const buttonClass = [ButtonStyle, busy ? "pagetopdf-busy" : ""].filter(Boolean).join(" ") || undefined;

    return (
        <div
            className={[WIDGET_CLASS, cleanClass(props.excludeClass), props.class].filter(Boolean).join(" ")}
            style={props.style}
        >
            <button
                type="button"
                onClick={handleClick}
                className={buttonClass}
                disabled={busy}
                aria-busy={busy}
                tabIndex={props.tabIndex}
            >
                {busy ? "Generating PDF..." : caption}
            </button>
        </div>
    );
}
