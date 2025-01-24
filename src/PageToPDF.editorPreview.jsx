import { createElement } from "react";
import { HelloWorldSample } from "./components/HelloWorldSample.jsx";

export function preview({ClassName, FileName, onChangeAction,PDFName,Base64}) {
    return <HelloWorldSample ClassName={ClassName} FileName={FileName} onChangeAction={onChangeAction} PDFName={ PDFName} Base64={Base64}/>;
}

export function getPreviewCss() {
    return require("./ui/PageToPDF.css");
}
