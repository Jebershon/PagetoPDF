import { createElement } from "react";
import { HelloWorldSample } from "./components/HelloWorldSample.jsx";

export function preview({ClassName, FileName, onChangeAction,PDFName,Base64,ButtonStyle,fileOption}) {
    return <HelloWorldSample ClassName={ClassName} FileName={FileName} onChangeAction={onChangeAction} PDFName={ PDFName} Base64={Base64} ButtonStyle={ButtonStyle} fileOption={fileOption}/>;
}

export function getPreviewCss() {
    return require("./ui/PageToPDF.css");
}
