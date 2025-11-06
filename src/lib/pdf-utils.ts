// Only import pdfjs in the browser environment
let pdfjsLib: any;

if (typeof window !== 'undefined') {
  // Dynamic import to avoid server-side issues
  pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
  
  // Set the worker source to the minified worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Cache for storing PDF page counts
const pageCountCache = new Map<string, number>();

// Simple in-memory cache for PDF content
const pdfContentCache = new Map<string, ArrayBuffer>();

export async function getPdfPageCount(pdfUrl: string): Promise<number> {
  // Return a default value during server-side rendering
  if (typeof window === 'undefined') {
    return 0;
  }

  // Check cache first
  if (pageCountCache.has(pdfUrl)) {
    return pageCountCache.get(pdfUrl) || 0;
  }

  try {
    // First try to get the page count directly from the URL
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      if (contentType && !contentType.includes('application/pdf')) {
        throw new Error('URL does not point to a PDF file');
      }
    } catch (e) {
      console.warn('Could not verify PDF via HEAD request, proceeding with full load');
    }
    
    // Fetch the full PDF
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Store the content in cache for later use
    pdfContentCache.set(pdfUrl, arrayBuffer);
    
    // Load the PDF document with error handling for corrupted PDFs
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
      cMapPacked: true,
      disableStream: true, // Load entire document at once for more reliable page counting
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    
    if (pageCount <= 0) {
      throw new Error('PDF has no pages');
    }
    
    // Cache the result
    pageCountCache.set(pdfUrl, pageCount);
    
    return pageCount;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    // Return -1 to indicate error (different from 0 which might be a valid page count)
    return -1;
  }
}

// Function to get a PDF page as an image URL
export async function getPdfPageAsImage(pdfUrl: string, pageNumber: number = 1): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    let arrayBuffer: ArrayBuffer;
    
    // Try to get from cache first
    if (pdfContentCache.has(pdfUrl)) {
      arrayBuffer = pdfContentCache.get(pdfUrl)!;
    } else {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
      pdfContentCache.set(pdfUrl, arrayBuffer);
    }
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    
    // Get the page
    const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
    
    // Set up the viewport and canvas
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render the page
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Return the data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    throw error;
  }
}
