import { createElement } from "react";

// Design-mode preview: a plain button with the configured caption. It doesn't load the PDF code.
export function preview({ buttonCaption, ButtonStyle, class: className }) {
    return (
        <div className={className}>
            <button type="button" className={ButtonStyle}>
                {buttonCaption || "Download PDF"}
            </button>
        </div>
    );
}

export function getPreviewCss() {
    return require("./ui/PageToPDF.css");
}
