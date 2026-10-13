/** Base64 content of a blob, without the "data:...;base64," prefix. */
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser time to start the download before releasing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Opens the preview tab synchronously, inside the click handler, so popup blockers allow it.
 * Returns null when the browser blocked it anyway.
 */
export function openPreviewWindow() {
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
        try {
            previewWindow.document.title = "Generating PDF...";
            previewWindow.document.body.textContent = "Generating PDF...";
        } catch (e) {
            // Not fatal: the tab just stays blank until the PDF is ready.
        }
    }
    return previewWindow;
}
