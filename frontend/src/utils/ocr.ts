export interface OcrResult {
  text: string;
  source: 'image' | 'pdf' | 'none';
  error?: 'unsupported' | 'ocr-failed' | 'pdf-failed' | 'too-large';
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

async function recognizeImage(file: File, ocrLang: 'ara' | 'eng'): Promise<OcrResult> {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    const worker = await Tesseract.createWorker(ocrLang, 1, {
      logger: () => {},
    });
    try {
      const { data } = await worker.recognize(file);
      const text = (data.text || '').trim();
      return text ? { text, source: 'image' } : { text: '', source: 'image', error: 'ocr-failed' };
    } finally {
      await worker.terminate();
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[OCR] Image recognition failed:', e);
    return { text: '', source: 'image', error: 'ocr-failed' };
  }
}

async function extractPdfText(file: File): Promise<OcrResult> {
  try {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const doc = await loadingTask.promise;
    try {
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? (item as { str: string }).str : ''))
          .join(' ');
        text += pageText + '\n';
      }
      const trimmed = text.trim();
      if (!trimmed) return { text: '', source: 'pdf', error: 'ocr-failed' };
      return { text: trimmed, source: 'pdf' };
    } finally {
      await loadingTask.destroy();
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[OCR] PDF text extraction failed:', e);
    return { text: '', source: 'pdf', error: 'pdf-failed' };
  }
}

/**
 * Extract text from an uploaded image or PDF for the AI quiz. Both libraries are
 * lazy-loaded on first use to keep the initial bundle small. For PDFs that are
 * scans (no embedded text layer) it falls back to the caller's paste option.
 */
export async function extractTextFromFile(
  file: File,
  ocrLang: 'ara' | 'eng' = 'ara'
): Promise<OcrResult> {
  if (file.size > MAX_FILE_BYTES) return { text: '', source: 'none', error: 'too-large' };
  if (isPdf(file)) return extractPdfText(file);
  if (isImage(file)) return recognizeImage(file, ocrLang);
  return { text: '', source: 'none', error: 'unsupported' };
}