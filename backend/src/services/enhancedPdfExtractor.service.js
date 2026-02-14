import fs from 'fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import logger from '../config/logger.js';

/**
 * Enhanced PDF Extractor Service
 * Features:
 * - Position-aware text extraction for table reconstruction
 * - Table detection and markdown conversion
 * - Document type detection (financial, legal, general)
 * - Better handling of multi-column layouts
 */
class EnhancedPdfExtractorService {
  constructor() {
    // Configuration for table detection
    this.config = {
      // Tolerance for grouping text items into rows (in PDF units)
      rowTolerance: 5,
      // Tolerance for detecting column alignment
      columnTolerance: 10,
      // Minimum items in a row to consider it part of a table
      minTableColumns: 3,
      // Minimum consecutive table-like rows to identify a table
      minTableRows: 2,
      // Financial document indicators
      financialKeywords: [
        'prospectus', 'drhp', 'shareholding', 'equity share', 'promoter',
        'financial statement', 'balance sheet', 'profit and loss',
        'cash flow', 'contingent liabilities', 'borrowings', 'net worth',
        'ipo', 'offer price', 'sebi', 'registrar', 'debenture',
        'dividend', 'eps', 'book value', 'market capitalization'
      ],
      // Legal document indicators
      legalKeywords: [
        'whereas', 'hereinafter', 'pursuant to', 'notwithstanding',
        'aforementioned', 'herein', 'thereof', 'jurisdiction',
        'indemnify', 'arbitration', 'litigation', 'statutory'
      ]
    };
  }

  /**
   * Extract text from PDF with enhanced table handling
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Promise<{text: string, metadata: Object}>}
   */
  async extract(buffer) {
    logger.info('Starting enhanced PDF extraction...');

    try {
      // Convert buffer to Uint8Array for pdfjs-dist
      const data = new Uint8Array(buffer);
      const pdf = await getDocument({ data, useSystemFonts: true }).promise;

      const numPages = pdf.numPages;
      const pages = [];
      let allTextItems = [];

      // Extract text with position info from all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        const pageItems = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5], // Flip Y coordinate
          width: item.width,
          height: item.height || 12,
          page: pageNum
        })).filter(item => item.text.trim().length > 0);

        pages.push({
          pageNum,
          width: viewport.width,
          height: viewport.height,
          items: pageItems
        });

        allTextItems = allTextItems.concat(pageItems);
      }

      // Process pages to reconstruct text with tables
      let fullText = '';
      for (const page of pages) {
        const pageText = this.processPage(page);
        fullText += pageText + '\n\n';
      }

      // Detect document type
      const docType = this.detectDocumentType(fullText);

      // Count words
      const wordCount = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;

      const metadata = {
        pageCount: numPages,
        wordCount,
        documentType: docType,
        extractionMethod: 'enhanced-pdfjs',
        hasDetectedTables: fullText.includes('|'),
        recommendedChunkSize: this.getRecommendedChunkSize(docType),
        recommendedChunkingStrategy: this.getRecommendedStrategy(docType)
      };

      logger.info(`Enhanced extraction complete: ${numPages} pages, type: ${docType}`);

      return { text: this.cleanText(fullText), metadata };

    } catch (error) {
      logger.error('Enhanced PDF extraction failed:', error);
      throw error;
    }
  }

  /**
   * Process a single page - detect tables and reconstruct text
   */
  processPage(page) {
    const { items, width } = page;

    if (items.length === 0) return '';

    // Group items by rows (similar Y coordinates)
    const rows = this.groupIntoRows(items);

    // Detect tables within rows
    const blocks = this.detectTablesAndText(rows, width);

    // Convert blocks to text
    let pageText = '';
    for (const block of blocks) {
      if (block.type === 'table') {
        pageText += this.formatTable(block.rows) + '\n\n';
      } else {
        pageText += block.text + '\n';
      }
    }

    return pageText;
  }

  /**
   * Group text items into rows based on Y position
   */
  groupIntoRows(items) {
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    let currentRow = [];
    let currentY = null;

    for (const item of sorted) {
      if (currentY === null || Math.abs(item.y - currentY) <= this.config.rowTolerance) {
        currentRow.push(item);
        currentY = currentY || item.y;
      } else {
        if (currentRow.length > 0) {
          // Sort row items by X position
          currentRow.sort((a, b) => a.x - b.x);
          rows.push({
            y: currentY,
            items: currentRow
          });
        }
        currentRow = [item];
        currentY = item.y;
      }
    }

    // Don't forget the last row
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push({
        y: currentY,
        items: currentRow
      });
    }

    return rows;
  }

  /**
   * Detect tables within rows and separate from regular text
   */
  detectTablesAndText(rows, pageWidth) {
    const blocks = [];
    let tableRows = [];
    let textLines = [];

    // Analyze column structure
    const columnPositions = this.detectColumnPositions(rows);
    const hasTableStructure = columnPositions.length >= this.config.minTableColumns;

    for (const row of rows) {
      const isTableRow = this.isLikelyTableRow(row, columnPositions, pageWidth);

      if (isTableRow && hasTableStructure) {
        // Flush text block if any
        if (textLines.length > 0) {
          blocks.push({ type: 'text', text: textLines.join('\n') });
          textLines = [];
        }
        tableRows.push(row);
      } else {
        // Flush table block if any
        if (tableRows.length >= this.config.minTableRows) {
          blocks.push({ type: 'table', rows: tableRows });
        } else if (tableRows.length > 0) {
          // Not enough rows for a table, treat as text
          for (const tr of tableRows) {
            textLines.push(tr.items.map(i => i.text).join(' '));
          }
        }
        tableRows = [];

        // Add current row as text
        textLines.push(row.items.map(i => i.text).join(' '));
      }
    }

    // Flush remaining content
    if (tableRows.length >= this.config.minTableRows) {
      blocks.push({ type: 'table', rows: tableRows });
    } else if (tableRows.length > 0) {
      for (const tr of tableRows) {
        textLines.push(tr.items.map(i => i.text).join(' '));
      }
    }

    if (textLines.length > 0) {
      blocks.push({ type: 'text', text: textLines.join('\n') });
    }

    return blocks;
  }

  /**
   * Detect common column positions across rows
   */
  detectColumnPositions(rows) {
    const xPositions = {};

    for (const row of rows) {
      for (const item of row.items) {
        // Round X position to group nearby positions
        const roundedX = Math.round(item.x / this.config.columnTolerance) * this.config.columnTolerance;
        xPositions[roundedX] = (xPositions[roundedX] || 0) + 1;
      }
    }

    // Find frequently occurring X positions (likely column starts)
    const threshold = rows.length * 0.3; // At least 30% of rows
    const columns = Object.entries(xPositions)
      .filter(([, count]) => count >= threshold)
      .map(([x]) => parseInt(x))
      .sort((a, b) => a - b);

    return columns;
  }

  /**
   * Check if a row looks like part of a table
   */
  isLikelyTableRow(row, columnPositions, pageWidth) {
    if (row.items.length < this.config.minTableColumns) return false;

    // Check if items align with detected columns
    let alignedItems = 0;
    for (const item of row.items) {
      const roundedX = Math.round(item.x / this.config.columnTolerance) * this.config.columnTolerance;
      if (columnPositions.includes(roundedX)) {
        alignedItems++;
      }
    }

    // Row is likely a table row if most items align with columns
    const alignmentRatio = alignedItems / row.items.length;

    // Also check if content spans significant width (not just left-aligned text)
    const rowWidth = Math.max(...row.items.map(i => i.x + i.width)) - Math.min(...row.items.map(i => i.x));
    const widthRatio = rowWidth / pageWidth;

    return alignmentRatio >= 0.5 && widthRatio >= 0.4;
  }

  /**
   * Format detected table rows as markdown table
   */
  formatTable(tableRows) {
    if (tableRows.length === 0) return '';

    // Find all unique column positions
    const allX = new Set();
    for (const row of tableRows) {
      for (const item of row.items) {
        allX.add(Math.round(item.x / this.config.columnTolerance) * this.config.columnTolerance);
      }
    }
    const columnPositions = Array.from(allX).sort((a, b) => a - b);

    // Build table data
    const tableData = tableRows.map(row => {
      const cells = new Array(columnPositions.length).fill('');

      for (const item of row.items) {
        const roundedX = Math.round(item.x / this.config.columnTolerance) * this.config.columnTolerance;
        const colIndex = columnPositions.indexOf(roundedX);
        if (colIndex >= 0) {
          cells[colIndex] = (cells[colIndex] + ' ' + item.text).trim();
        }
      }

      return cells;
    });

    // Generate markdown table
    const lines = [];

    // First row as header
    if (tableData.length > 0) {
      lines.push('| ' + tableData[0].map(c => c || ' ').join(' | ') + ' |');
      lines.push('| ' + tableData[0].map(() => '---').join(' | ') + ' |');

      // Data rows
      for (let i = 1; i < tableData.length; i++) {
        lines.push('| ' + tableData[i].map(c => c || ' ').join(' | ') + ' |');
      }
    }

    return lines.join('\n');
  }

  /**
   * Detect document type based on content
   */
  detectDocumentType(text) {
    const lowerText = text.toLowerCase();

    // Count keyword matches
    let financialScore = 0;
    let legalScore = 0;

    for (const keyword of this.config.financialKeywords) {
      if (lowerText.includes(keyword)) {
        financialScore++;
      }
    }

    for (const keyword of this.config.legalKeywords) {
      if (lowerText.includes(keyword)) {
        legalScore++;
      }
    }

    // Check for specific patterns
    if (lowerText.includes('draft red herring prospectus') || lowerText.includes('drhp')) {
      financialScore += 10;
    }
    if (lowerText.includes('₹') || lowerText.includes('inr') || /\d+\.\d{2}\s*(million|crore|lakh)/i.test(text)) {
      financialScore += 3;
    }
    if (/equity\s+share/i.test(text) && /promoter/i.test(text)) {
      financialScore += 5;
    }

    // Determine type
    if (financialScore >= 5) {
      return 'financial';
    } else if (legalScore >= 5) {
      return 'legal';
    } else if (financialScore >= 3 || legalScore >= 3) {
      return 'business';
    }

    return 'general';
  }

  /**
   * Get recommended chunk size based on document type
   */
  getRecommendedChunkSize(docType) {
    switch (docType) {
      case 'financial':
        return 1000; // Larger chunks for financial docs with tables
      case 'legal':
        return 800; // Medium-large for legal docs
      case 'business':
        return 700;
      default:
        return 500;
    }
  }

  /**
   * Get recommended chunking strategy
   */
  getRecommendedStrategy(docType) {
    switch (docType) {
      case 'financial':
        return 'table-aware';
      case 'legal':
        return 'semantic';
      case 'business':
        return 'semantic';
      default:
        return 'recursive';
    }
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Fix common OCR/extraction issues
      .replace(/\s+([.,;:!?])/g, '$1')
      // Remove excessive whitespace but preserve table structure
      .replace(/[ \t]+/g, ' ')
      // Preserve paragraph breaks but remove excessive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim();
  }
}

export default new EnhancedPdfExtractorService();
