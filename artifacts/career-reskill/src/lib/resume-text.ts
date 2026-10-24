const MAX_RESUME_BYTES = 15 * 1024 * 1024;

export async function readResumeText(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new Error("file-too-large");
  const extension = file.name.toLowerCase().split(".").pop();
  const buffer = await file.arrayBuffer();
  let text: string;

  if (extension === "txt") {
    text = new TextDecoder().decode(buffer);
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value;
  } else if (extension === "pdf") {
    const [pdfjs, pdfWorkerUrl] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl.default;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const document = await loadingTask.promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
      }
      text = pages.join("\n");
    } finally {
      await loadingTask.destroy();
    }
  } else {
    throw new Error("unsupported-file");
  }

  const extractedText = text.trim();
  if (!extractedText) throw new Error("Could not read text from this file format.");
  return extractedText;
}
