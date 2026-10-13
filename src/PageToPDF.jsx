import "./ui/PageToPDF.css";
import { PdfExportButton } from "./components/PdfExportButton";
import { createElement } from "react";

export function PageToPDF(props) {
    return <PdfExportButton {...props} />;
}
