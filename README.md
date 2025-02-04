# PageToPDF  
*A widget to convert a page or HTML element to PDF format and download the PDF.*

---

## Features  
- Convert a specific page section or HTML element to a PDF using `html2pdf.js`.  
- Store the PDF in Base64 format in Mendix attributes.  
- Customize the PDF filename dynamically.  
- Preview the generated PDF in the browser.  
- Trigger Mendix actions after PDF generation.

---

## Usage  
1. Add the widget to your page in Mendix.  
2. Configure the following widget properties:  
   - **ClassName**: Specify the CSS class of the HTML element to be converted to a PDF.  
   - **FileName**: Set the desired PDF filename.  
   - **PDFName**: Map a Mendix attribute to store the filename.  
   - **Base64**: Map a Mendix attribute to store the Base64-encoded PDF.  
   - **onChangeAction**: (Optional) Configure a custom action to execute after PDF generation.  
3. Add styles to ensure the HTML content inside the target element renders properly in PDF format.  
4. Click the button generated by the widget to download the PDF or preview it in a new tab.

---

## Demo Project  
[Link to a live demo or sandbox environment]

---

## Issues, Suggestions, and Feature Requests  
If you encounter issues, have feature suggestions, or want to request enhancements, please visit the [GitHub Issues page](#).

---

## Development and Contribution  

1. Clone the repository and navigate to the project folder.  
2. Install the required NPM dependencies:  
   ```bash
   npm install
