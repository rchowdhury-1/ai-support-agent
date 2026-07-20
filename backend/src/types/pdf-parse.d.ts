declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(buf: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
