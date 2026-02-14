import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import officeparser from 'officeparser';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { createWorker } from 'tesseract.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

/**
 * Enhanced Text Extractor Service
 * Supports: PDF, DOCX, TXT, Excel, PowerPoint, CSV, HTML, Markdown, Images (OCR)
 */
class TextExtractorService {
  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // OCR configuration
    this.ocrConfig = {
      enabled: true,
      languages: ['eng'],
      scannedPdfThreshold: 100, // chars per page to consider PDF as scanned
    };

    // Supported MIME types
    this.supportedTypes = {
      // Documents
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',

      // Spreadsheets
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'text/csv': 'csv',

      // Presentations
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',

      // Web/Markup
      'text/html': 'html',
      'text/markdown': 'markdown',
      'text/x-markdown': 'markdown',

      // Images (OCR)
      'image/png': 'image',
      'image/jpeg': 'image',
      'image/jpg': 'image',
      'image/tiff': 'image',
      'image/bmp': 'image',
      'image/webp': 'image',
    };
  }

  /**
   * Extract text from a file based on its mime type
   * @param {string} filePath - Path to the file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<{text: string, metadata: Object}>}
   */
  async extract(filePath, mimeType) {
    logger.info(`Extracting text from file: ${filePath}, type: ${mimeType}`);

    const fileType = this.supportedTypes[mimeType];
    if (!fileType) {
      throw new ApiError(400, `Unsupported file type: ${mimeType}`);
    }

    try {
      const buffer = await fs.readFile(filePath);

      switch (fileType) {
        case 'pdf':
          return this.extractFromPDF(buffer);

        case 'doc':
        case 'docx':
          return this.extractFromDOCX(buffer);

        case 'txt':
          return this.extractFromText(buffer);

        case 'xlsx':
        case 'xls':
          return this.extractFromExcel(buffer);

        case 'csv':
          return this.extractFromCSV(buffer);

        case 'pptx':
        case 'ppt':
          return this.extractFromPowerPoint(buffer);

        case 'html':
          return this.extractFromHTML(buffer);

        case 'markdown':
          return this.extractFromMarkdown(buffer);

        case 'image':
          return this.extractFromImage(buffer);

        default:
          throw new ApiError(400, `Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Text extraction failed:', error);
      throw new ApiError(422, `Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF (with OCR fallback for scanned PDFs)
   */
  async extractFromPDF(buffer) {
    const data = await pdfParse(buffer);
    const extractedText = data.text;

    // Check if PDF might be scanned (very little text per page)
    const charsPerPage = extractedText.length / (data.numpages || 1);
    const isLikelyScanned = charsPerPage < this.ocrConfig.scannedPdfThreshold;

    if (isLikelyScanned && this.ocrConfig.enabled) {
      logger.info('PDF appears to be scanned, attempting OCR...');
      try {
        // For scanned PDFs, we'd need to convert to images first
        // This is a simplified approach - for production, consider using pdf2pic or similar
        const ocrResult = await this.performOCR(buffer);
        if (ocrResult.text.length > extractedText.length) {
          return {
            text: this.cleanText(ocrResult.text),
            metadata: {
              pageCount: data.numpages,
              wordCount: this.countWords(ocrResult.text),
              info: data.info,
              extractionMethod: 'ocr',
              ocrConfidence: ocrResult.confidence,
            },
          };
        }
      } catch (ocrError) {
        logger.warn('OCR fallback failed, using standard extraction:', ocrError.message);
      }
    }

    return {
      text: this.cleanText(extractedText),
      metadata: {
        pageCount: data.numpages,
        wordCount: this.countWords(extractedText),
        info: data.info,
        extractionMethod: 'standard',
      },
    };
  }

  /**
   * Extract text from DOCX/DOC
   */
  async extractFromDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      logger.warn('DOCX extraction warnings:', result.messages);
    }

    const text = result.value;

    return {
      text: this.cleanText(text),
      metadata: {
        wordCount: this.countWords(text),
        warnings: result.messages,
        extractionMethod: 'mammoth',
      },
    };
  }

  /**
   * Extract text from plain text file
   */
  extractFromText(buffer) {
    const text = buffer.toString('utf-8');

    return {
      text: this.cleanText(text),
      metadata: {
        wordCount: this.countWords(text),
        characterCount: text.length,
        extractionMethod: 'direct',
      },
    };
  }

  /**
   * Extract text from Excel files (XLSX/XLS)
   */
  extractFromExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = [];
    let fullText = '';

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // Convert to CSV for text extraction
      const csv = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });

      // Convert to JSON for structured data
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Build readable text representation
      let sheetText = `## Sheet: ${sheetName}\n\n`;

      // Get headers (first row)
      if (json.length > 0 && Array.isArray(json[0])) {
        const headers = json[0];

        // Format as markdown table
        if (headers.length > 0) {
          sheetText += '| ' + headers.join(' | ') + ' |\n';
          sheetText += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (Array.isArray(row) && row.some((cell) => cell !== null && cell !== '')) {
              sheetText +=
                '| ' + headers.map((_, idx) => (row[idx] ?? '').toString()).join(' | ') + ' |\n';
            }
          }
        }
      }

      sheetText += '\n';
      fullText += sheetText;

      sheets.push({
        name: sheetName,
        rowCount: json.length,
        columnCount: json[0]?.length || 0,
      });
    }

    return {
      text: this.cleanText(fullText),
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheets,
        wordCount: this.countWords(fullText),
        extractionMethod: 'xlsx',
      },
    };
  }

  /**
   * Extract text from CSV files
   */
  extractFromCSV(buffer) {
    const content = buffer.toString('utf-8');

    // Parse CSV manually for better control
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      return {
        text: '',
        metadata: { rowCount: 0, wordCount: 0, extractionMethod: 'csv' },
      };
    }

    // Simple CSV parsing (handles basic cases)
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const rows = lines.map(parseCSVLine);
    const headers = rows[0];

    // Format as markdown table
    let text = '| ' + headers.join(' | ') + ' |\n';
    text += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      text += '| ' + headers.map((_, idx) => (row[idx] ?? '').toString()).join(' | ') + ' |\n';
    }

    return {
      text: this.cleanText(text),
      metadata: {
        rowCount: rows.length,
        columnCount: headers.length,
        wordCount: this.countWords(text),
        extractionMethod: 'csv',
      },
    };
  }

  /**
   * Extract text from PowerPoint files (PPTX/PPT)
   */
  async extractFromPowerPoint(buffer) {
    const text = await officeparser.parseOfficeAsync(buffer);

    return {
      text: this.cleanText(text),
      metadata: {
        wordCount: this.countWords(text),
        extractionMethod: 'officeparser',
      },
    };
  }

  /**
   * Extract text from HTML files
   */
  extractFromHTML(buffer) {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content elements
    $('script, style, noscript, iframe, nav, footer, header').remove();

    // Extract title
    const title = $('title').text().trim();

    // Convert to markdown for better structure preservation
    const bodyHtml = $('body').html() || $.html();
    let markdown = this.turndownService.turndown(bodyHtml);

    // Add title if exists
    if (title) {
      markdown = `# ${title}\n\n${markdown}`;
    }

    return {
      text: this.cleanText(markdown),
      metadata: {
        title,
        wordCount: this.countWords(markdown),
        extractionMethod: 'cheerio-turndown',
      },
    };
  }

  /**
   * Extract text from Markdown files
   */
  extractFromMarkdown(buffer) {
    const text = buffer.toString('utf-8');

    // Extract title from first heading if exists
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : null;

    return {
      text: this.cleanText(text),
      metadata: {
        title,
        wordCount: this.countWords(text),
        characterCount: text.length,
        extractionMethod: 'direct',
        isMarkdown: true,
      },
    };
  }

  /**
   * Extract text from images using OCR (Tesseract.js)
   */
  async extractFromImage(buffer) {
    if (!this.ocrConfig.enabled) {
      throw new ApiError(400, 'OCR is disabled. Cannot extract text from images.');
    }

    const result = await this.performOCR(buffer);

    return {
      text: this.cleanText(result.text),
      metadata: {
        wordCount: this.countWords(result.text),
        ocrConfidence: result.confidence,
        extractionMethod: 'tesseract-ocr',
      },
    };
  }

  /**
   * Perform OCR on buffer using Tesseract.js
   */
  async performOCR(buffer) {
    logger.info('Starting OCR extraction...');

    const worker = await createWorker(this.ocrConfig.languages.join('+'));

    try {
      const {
        data: { text, confidence },
      } = await worker.recognize(buffer);

      logger.info(`OCR completed with confidence: ${confidence}%`);

      return {
        text,
        confidence,
      };
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return (
      text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Remove excessive newlines (more than 2)
        .replace(/\n{3,}/g, '\n\n')
        // Trim
        .trim()
    );
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Get list of supported MIME types
   */
  getSupportedTypes() {
    return Object.keys(this.supportedTypes);
  }

  /**
   * Check if a MIME type is supported
   */
  isSupported(mimeType) {
    return mimeType in this.supportedTypes;
  }

  /**
   * Configure OCR settings
   */
  configureOCR(options = {}) {
    this.ocrConfig = {
      ...this.ocrConfig,
      ...options,
    };
    logger.info('OCR configuration updated:', this.ocrConfig);
  }
}

export default new TextExtractorService();
