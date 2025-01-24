import { createElement } from "react";
import React from 'react';
import { HelloWorldSample } from "./components/HelloWorldSample";
import "./ui/PageToPDF.css";

export function PageToPDF({ClassName,FileName,onChangeAction,PDFName,Base64,ButtonStyle,fileOption}) {
    return <HelloWorldSample ClassName={ClassName} FileName={FileName} onChangeAction={onChangeAction} PDFName={ PDFName} Base64={Base64} ButtonStyle={ButtonStyle} fileOption={fileOption}/>;
}
