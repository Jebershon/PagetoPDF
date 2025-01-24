import { createElement, useCallback } from "react";
import html2pdf from "html2pdf.js";

export function HelloWorldSample({ 
    ClassName, 
    FileName, 
    onChangeAction,
    PDFName, 
    Base64 
}) {
    const handleDownload = useCallback(() => {
        const element = document.querySelector(`.${ClassName}`);
        if (element) {
            const options = {
                filename: `${FileName}.pdf`,
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            };

            html2pdf()
                .set(options)
                .from(element)
                .outputPdf("blob")
                .then((pdfBlob) => {
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl, "_blank");

                    // Update PDF Name
                    if (PDFName && PDFName.setValue) {
                        PDFName.setValue(`${FileName}.pdf`);
                    }

                    // Read the blob and convert it to Base64
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result.split(",")[1];

                        // Ensure Base64 is set before executing onChangeAction
                        if (Base64 && Base64.setValue) {
                            Base64.setValue(base64data);

                            // Execute onChangeAction only after Base64 is updated
                            if (onChangeAction && onChangeAction.canExecute) {
                                onChangeAction.execute();
                            } else {
                                console.log("onChangeAction is not set or cannot execute.");
                            }
                        } else {
                            console.warn("Base64 attribute is not set or cannot be updated.");
                        }
                    };

                    reader.readAsDataURL(pdfBlob);
                })
                .catch((error) => {
                    console.error("Error generating PDF:", error);
                });
        } else {
            console.warn("Element not found. Check if the ClassName is correct.");
        }
    }, [ClassName, FileName, onChangeAction, PDFName, Base64]);

    return (
        <div>
            <button onClick={handleDownload}>Download PDF</button>
        </div>
    );
}
