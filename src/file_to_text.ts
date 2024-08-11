import * as fs from 'fs';
import { Parser } from "htmlparser2";
import * as officeParser from "officeparser";
import { PdfReader } from "pdfreader";

async function parseHTML(htmlContent: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    let isScript = false;
    let isStyle = false;

    const parser = new Parser({
      onopentag(name) {
        if (name.toLowerCase() === "script") {
          isScript = true;
        } else if (name.toLowerCase() === "style") {
          isStyle = true;
        }
      },
      ontext(data) {
        if (!isScript && !isStyle) {
          text += data.trim() + " ";
        }
      },
      onclosetag(name) {
        if (name.toLowerCase() === "script") {
          isScript = false;
        } else if (name.toLowerCase() === "style") {
          isStyle = false;
        }
      },
      onerror(error) {
        reject(error);
      },
      onend() {
        resolve(text.trim());
      }
    });

    parser.write(htmlContent);
    parser.end();
  });
}

async function parsePDF(file: string): Promise<string> {
return new Promise((resolve, reject) => {
    let text = "";
    new PdfReader().parseFileItems(file, (err, item) => {
    if (err) reject(err);
    else if (!item) resolve(text);
    else if (item.text) text += item.text;
    });
});
};

async function parseOffice(file: string): Promise<string> {
try {
    const data = await officeParser.parseOfficeAsync(file);
    return data;
} catch (err) {
    throw err;
}
};
  
async function fileToText(filePath: string): Promise<string> {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (!ext) throw new Error("Invalid file path");

    const file = fs.readFileSync(filePath, "utf8");
    
    switch (ext) {
      case "pdf":
        return parsePDF(file);
      case "html":
        return parseHTML(file);
      case "docx":
      case "pptx":
      case "xlsx":
      case "odt":
      case "odp":
      case "ods":
        return parseOffice(file);
      default:
        throw new Error("Unsupported file type");
    }
  };

export { fileToText };


  