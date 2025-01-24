import { createElement, useCallback } from "react";
import html2pdf from "html2pdf.js";

export function HelloWorldSample({ 
    ClassName, 
    FileName, 
    onChangeAction,
    PDFName, 
    Base64,
    ButtonStyle,
    fileOption
}) {
    const handleDownload = useCallback(() => {
        console.info("Download button clicked");
        const element = document.querySelector(`.${ClassName}`);
        if (element) {
            console.info("Element found with class name:", ClassName);
            const options = {
                filename: `${FileName}.pdf`,
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            };
            console.info("PDF options set:", options);
            html2pdf()
                .set(options)
                .from(element)
                .outputPdf("blob")
                .then((pdfBlob) => {
                    console.info("PDF generated successfully");
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    if (fileOption === "Download") {
                        console.info("File option is Download");
                        html2pdf().from(element).save(`${FileName}.pdf`);
                        console.info("File downloaded");
                        if (PDFName && PDFName.setValue) {
                            PDFName.setValue(`${FileName}.pdf`);
                            console.info("PDFName updated");
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result.split(",")[1];
                            if (Base64 && Base64.setValue) {
                                Base64.setValue(base64data);
                                console.info("Base64 updated");
                                if (onChangeAction && onChangeAction.canExecute) {
                                    onChangeAction.execute();
                                    console.info("onChangeAction executed");
                                } else {
                                    console.info("onChangeAction is not set or cannot execute.");
                                }
                            } else {
                                console.warn("Base64 attribute is not set or cannot be updated.");
                            }
                        };
                        reader.readAsDataURL(pdfBlob);
                    } else if (fileOption === "Preview") {
                        console.info("File option is Preview");
                        window.open(pdfUrl, "_blank");
                        console.info("File previewed");
                        if (PDFName && PDFName.setValue) {
                            PDFName.setValue(`${FileName}.pdf`);
                            console.info("PDFName updated");
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result.split(",")[1];
                            if (Base64 && Base64.setValue) {
                                Base64.setValue(base64data);
                                console.info("Base64 updated");
                                if (onChangeAction && onChangeAction.canExecute) {
                                    onChangeAction.execute();
                                    console.info("onChangeAction executed");
                                } else {
                                    console.info("onChangeAction is not set or cannot execute.");
                                }
                            } else {
                                console.warn("Base64 attribute is not set or cannot be updated.");
                            }
                        };
                        reader.readAsDataURL(pdfBlob);
                    } else if (fileOption === "Nothing") {
                        console.info("File option is Nothing");
                        if (PDFName && PDFName.setValue) {
                            PDFName.setValue(`${FileName}.pdf`);
                            console.info("PDFName updated");
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result.split(",")[1];
                            if (Base64 && Base64.setValue) {
                                Base64.setValue(base64data);
                                console.info("Base64 updated");
                                if (onChangeAction && onChangeAction.canExecute) {
                                    onChangeAction.execute();
                                    console.info("onChangeAction executed");
                                } else {
                                    console.info("onChangeAction is not set or cannot execute.");
                                }
                            } else {
                                console.warn("Base64 attribute is not set or cannot be updated.");
                            }
                        };
                        reader.readAsDataURL(pdfBlob);
                    } else {
                        console.warn("Option Not Available");
                    }
                }).catch((error) => {
                    console.error("Error generating PDF:", error);
                });
        } else {
            console.warn("Element not found. Check if the ClassName is correct.");
        }
    }, [ClassName, FileName, onChangeAction, PDFName, Base64, ButtonStyle, fileOption]);

    return (
        <div>
            <button onClick={handleDownload} className={ButtonStyle}>Download PDF</button>
        </div>
    );
}
