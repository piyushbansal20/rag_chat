import { encode, decode } from 'gpt-tokenizer';
import logger from '../config/logger.js';

/**
 * Enhanced Text Chunking Service for RAG
 * Features:
 * - Accurate token counting with gpt-tokenizer
 * - Multiple chunking strategies: recursive, semantic, markdown, code, fixed
 * - Configurable chunk size and overlap
 */
class TextChunkerService {
  constructor(options = {}) {
    this.config = {
      maxTokens: options.maxTokens || 500,
      overlapTokens: options.overlapTokens || 50,
      defaultStrategy: options.defaultStrategy || 'recursive',

      // Recursive strategy separators (in order of preference)
      separators: options.separators || [
        '\n\n\n', // Major section breaks
        '\n\n', // Paragraph breaks
        '\n', // Line breaks
        '. ', // Sentence breaks
        '? ', // Question breaks
        '! ', // Exclamation breaks
        '; ', // Semicolon breaks
        ', ', // Comma breaks
        ' ', // Word breaks
      ],

      // Markdown separators
      markdownSeparators: [
        /^#{1,6}\s/m, // Headers
        /^```[\s\S]*?```$/m, // Code blocks
        /^\s*[-*+]\s/m, // List items
        /^\s*\d+\.\s/m, // Numbered lists
        /^\s*>/m, // Blockquotes
        '\n\n', // Paragraphs
      ],

      // Code separators
      codeSeparators: [
        /^(class|function|const|let|var|def|async|export)\s/m, // Declarations
        /^(if|else|for|while|switch|try|catch)\s/m, // Control flow
        '\n\n', // Blank lines
        '\n', // Line breaks
      ],
    };
  }

  /**
   * Main entry point - chunks text using the specified or default strategy
   * @param {string} text - Text to chunk
   * @param {Object} options - Override default options
   * @returns {Array<{content: string, index: number, startChar: number, endChar: number, tokens: number}>}
   */
  chunk(text, options = {}) {
    const config = { ...this.config, ...options };
    const strategy = options.strategy || config.defaultStrategy;

    logger.debug(
      `Chunking text of length ${text.length} with strategy '${strategy}', maxTokens ${config.maxTokens}`
    );

    let chunks;
    switch (strategy) {
      case 'recursive':
        chunks = this.recursiveChunk(text, config);
        break;
      case 'semantic':
        chunks = this.semanticChunk(text, config);
        break;
      case 'markdown':
        chunks = this.markdownChunk(text, config);
        break;
      case 'code':
        chunks = this.codeChunk(text, config);
        break;
      case 'fixed':
        chunks = this.fixedChunk(text, config);
        break;
      case 'table-aware':
        chunks = this.tableAwareChunk(text, config);
        break;
      default:
        chunks = this.recursiveChunk(text, config);
    }

    logger.info(`Created ${chunks.length} chunks using '${strategy}' strategy`);
    return chunks;
  }

  /**
   * Recursive chunking (LangChain-style)
   * Tries larger separators first, falls back to smaller ones
   */
  recursiveChunk(text, config) {
    const { maxTokens, overlapTokens, separators } = config;
    const chunks = [];
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      // Try to get a chunk of approximately maxTokens
      let chunkEnd = this.findChunkEnd(text, position, maxTokens, separators);
      let chunkContent = text.slice(position, chunkEnd).trim();

      // If chunk is still too large, force split
      if (this.countTokens(chunkContent) > maxTokens * 1.2) {
        chunkContent = this.truncateToTokens(chunkContent, maxTokens);
        chunkEnd = position + chunkContent.length;
      }

      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          index: chunkIndex,
          startChar: position,
          endChar: chunkEnd,
          tokens: this.countTokens(chunkContent),
        });
        chunkIndex++;
      }

      if (chunkEnd >= text.length) break;

      // Calculate overlap in characters based on token overlap
      const overlapChars = this.tokensToApproxChars(overlapTokens);
      position = Math.max(chunkEnd - overlapChars, position + 1);
    }

    return chunks;
  }

  /**
   * Semantic chunking - groups sentences together
   * Better for long-form text, preserves meaning
   */
  semanticChunk(text, config) {
    const { maxTokens, overlapTokens } = config;
    const sentences = this.splitIntoSentences(text);
    const chunks = [];

    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);

      // If single sentence exceeds max, split it
      if (sentenceTokens > maxTokens) {
        // Flush current chunk first
        if (currentChunk.length > 0) {
          const content = currentChunk.join(' ').trim();
          chunks.push({
            content,
            index: chunkIndex++,
            startChar,
            endChar: startChar + content.length,
            tokens: currentTokens,
          });
          startChar += content.length;
          currentChunk = [];
          currentTokens = 0;
        }

        // Split the long sentence using fixed chunking
        const subChunks = this.fixedChunk(sentence, { ...config, overlapTokens: 20 });
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            index: chunkIndex++,
            startChar: startChar + subChunk.startChar,
            endChar: startChar + subChunk.endChar,
          });
        }
        startChar += sentence.length;
        continue;
      }

      // Check if adding this sentence exceeds limit
      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        const content = currentChunk.join(' ').trim();
        chunks.push({
          content,
          index: chunkIndex++,
          startChar,
          endChar: startChar + content.length,
          tokens: currentTokens,
        });

        // Calculate overlap - keep last few sentences
        const overlapSentences = [];
        let overlapTokenCount = 0;
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const sentTokens = this.countTokens(currentChunk[i]);
          if (overlapTokenCount + sentTokens > overlapTokens) break;
          overlapSentences.unshift(currentChunk[i]);
          overlapTokenCount += sentTokens;
        }

        startChar += content.length - overlapSentences.join(' ').length;
        currentChunk = overlapSentences;
        currentTokens = overlapTokenCount;
      }

      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const content = currentChunk.join(' ').trim();
      chunks.push({
        content,
        index: chunkIndex,
        startChar,
        endChar: startChar + content.length,
        tokens: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Markdown-aware chunking
   * Preserves headers, code blocks, lists as units
   */
  markdownChunk(text, config) {
    const { maxTokens, overlapTokens } = config;
    const blocks = this.parseMarkdownBlocks(text);
    const chunks = [];

    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const block of blocks) {
      const blockTokens = this.countTokens(block.content);

      // If single block exceeds max, recursively chunk it
      if (blockTokens > maxTokens) {
        // Flush current chunk
        if (currentChunk.length > 0) {
          const content = currentChunk.map((b) => b.content).join('\n\n');
          chunks.push({
            content,
            index: chunkIndex++,
            startChar,
            endChar: startChar + content.length,
            tokens: currentTokens,
          });
          startChar += content.length + 2;
          currentChunk = [];
          currentTokens = 0;
        }

        // Use recursive chunking for oversized blocks
        const subChunks = this.recursiveChunk(block.content, config);
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            index: chunkIndex++,
            startChar: startChar + subChunk.startChar,
            endChar: startChar + subChunk.endChar,
          });
        }
        startChar += block.content.length + 2;
        continue;
      }

      // Check if adding this block exceeds limit
      if (currentTokens + blockTokens > maxTokens && currentChunk.length > 0) {
        const content = currentChunk.map((b) => b.content).join('\n\n');
        chunks.push({
          content,
          index: chunkIndex++,
          startChar,
          endChar: startChar + content.length,
          tokens: currentTokens,
        });

        // Overlap: keep last block if it's a header
        const lastBlock = currentChunk[currentChunk.length - 1];
        if (lastBlock.type === 'header' && this.countTokens(lastBlock.content) <= overlapTokens) {
          startChar += content.length - lastBlock.content.length;
          currentChunk = [lastBlock];
          currentTokens = this.countTokens(lastBlock.content);
        } else {
          startChar += content.length + 2;
          currentChunk = [];
          currentTokens = 0;
        }
      }

      currentChunk.push(block);
      currentTokens += blockTokens;
    }

    // Last chunk
    if (currentChunk.length > 0) {
      const content = currentChunk.map((b) => b.content).join('\n\n');
      chunks.push({
        content,
        index: chunkIndex,
        startChar,
        endChar: startChar + content.length,
        tokens: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Code-aware chunking
   * Respects function/class boundaries
   */
  codeChunk(text, config) {
    const { maxTokens, overlapTokens } = config;
    const blocks = this.parseCodeBlocks(text);
    const chunks = [];

    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const block of blocks) {
      const blockTokens = this.countTokens(block);

      // If single block exceeds max, use fixed chunking
      if (blockTokens > maxTokens) {
        if (currentChunk.length > 0) {
          const content = currentChunk.join('\n\n');
          chunks.push({
            content,
            index: chunkIndex++,
            startChar,
            endChar: startChar + content.length,
            tokens: currentTokens,
          });
          startChar += content.length + 2;
          currentChunk = [];
          currentTokens = 0;
        }

        const subChunks = this.fixedChunk(block, config);
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            index: chunkIndex++,
            startChar: startChar + subChunk.startChar,
            endChar: startChar + subChunk.endChar,
          });
        }
        startChar += block.length + 2;
        continue;
      }

      if (currentTokens + blockTokens > maxTokens && currentChunk.length > 0) {
        const content = currentChunk.join('\n\n');
        chunks.push({
          content,
          index: chunkIndex++,
          startChar,
          endChar: startChar + content.length,
          tokens: currentTokens,
        });
        startChar += content.length + 2;
        currentChunk = [];
        currentTokens = 0;
      }

      currentChunk.push(block);
      currentTokens += blockTokens;
    }

    if (currentChunk.length > 0) {
      const content = currentChunk.join('\n\n');
      chunks.push({
        content,
        index: chunkIndex,
        startChar,
        endChar: startChar + content.length,
        tokens: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Fixed-size chunking
   * Simple token-based splitting with overlap
   */
  fixedChunk(text, config) {
    const { maxTokens, overlapTokens } = config;
    const tokens = encode(text);
    const chunks = [];

    let position = 0;
    let chunkIndex = 0;

    while (position < tokens.length) {
      const end = Math.min(position + maxTokens, tokens.length);
      const chunkTokens = tokens.slice(position, end);
      const content = decode(chunkTokens).trim();

      if (content.length > 0) {
        // Calculate approximate character positions
        const startChar = this.tokensToApproxChars(position);
        const endChar = startChar + content.length;

        chunks.push({
          content,
          index: chunkIndex++,
          startChar,
          endChar,
          tokens: chunkTokens.length,
        });
      }

      if (end >= tokens.length) break;

      position = end - overlapTokens;
      position = Math.max(position, position > 0 ? position : 1);
    }

    return chunks;
  }

  /**
   * Table-aware chunking for financial/business documents
   * Preserves tables as single units when possible, uses larger chunks
   */
  tableAwareChunk(text, config) {
    // Use larger chunks for table-aware strategy
    const tableConfig = {
      ...config,
      maxTokens: config.maxTokens || 1000,
      overlapTokens: config.overlapTokens || 75,
    };

    const blocks = this.parseTableAwareBlocks(text);
    const chunks = [];

    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startChar = 0;

    for (const block of blocks) {
      const blockTokens = this.countTokens(block.content);

      // If a single table exceeds max tokens, split it intelligently
      if (block.type === 'table' && blockTokens > tableConfig.maxTokens) {
        // Flush current chunk first
        if (currentChunk.length > 0) {
          const content = currentChunk.map(b => b.content).join('\n\n');
          chunks.push({
            content,
            index: chunkIndex++,
            startChar,
            endChar: startChar + content.length,
            tokens: currentTokens,
          });
          startChar += content.length + 2;
          currentChunk = [];
          currentTokens = 0;
        }

        // Split table by rows while preserving header
        const tableChunks = this.splitLargeTable(block.content, tableConfig.maxTokens);
        for (const tableChunk of tableChunks) {
          chunks.push({
            content: tableChunk,
            index: chunkIndex++,
            startChar,
            endChar: startChar + tableChunk.length,
            tokens: this.countTokens(tableChunk),
          });
          startChar += tableChunk.length + 2;
        }
        continue;
      }

      // If adding this block exceeds limit
      if (currentTokens + blockTokens > tableConfig.maxTokens && currentChunk.length > 0) {
        const content = currentChunk.map(b => b.content).join('\n\n');
        chunks.push({
          content,
          index: chunkIndex++,
          startChar,
          endChar: startChar + content.length,
          tokens: currentTokens,
        });

        // Overlap: keep headers and context
        const overlapBlocks = [];
        let overlapTokens = 0;

        // Look for section headers to include in overlap
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const b = currentChunk[i];
          const bTokens = this.countTokens(b.content);
          if (b.type === 'header' || (overlapTokens + bTokens <= tableConfig.overlapTokens)) {
            overlapBlocks.unshift(b);
            overlapTokens += bTokens;
            if (b.type === 'header') break; // Stop after including a header
          }
        }

        startChar += content.length - overlapBlocks.map(b => b.content).join('\n\n').length;
        currentChunk = overlapBlocks;
        currentTokens = overlapTokens;
      }

      currentChunk.push(block);
      currentTokens += blockTokens;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const content = currentChunk.map(b => b.content).join('\n\n');
      chunks.push({
        content,
        index: chunkIndex,
        startChar,
        endChar: startChar + content.length,
        tokens: currentTokens,
      });
    }

    return chunks;
  }

  /**
   * Parse text into blocks, identifying tables, headers, and paragraphs
   */
  parseTableAwareBlocks(text) {
    const blocks = [];
    const lines = text.split('\n');

    let currentBlock = { type: 'paragraph', content: [] };
    let inTable = false;
    let tableContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Detect markdown table row (starts with |)
      const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
      // Detect table separator row
      const isTableSeparator = /^\|[\s\-:|]+\|$/.test(trimmedLine);

      if (isTableRow || isTableSeparator) {
        if (!inTable) {
          // Flush current paragraph
          if (currentBlock.content.length > 0) {
            blocks.push({
              type: currentBlock.type,
              content: currentBlock.content.join('\n')
            });
            currentBlock = { type: 'paragraph', content: [] };
          }
          inTable = true;
          tableContent = [];
        }
        tableContent.push(line);
      } else {
        if (inTable) {
          // End of table
          if (tableContent.length > 0) {
            blocks.push({
              type: 'table',
              content: tableContent.join('\n')
            });
          }
          inTable = false;
          tableContent = [];
        }

        // Check for header
        if (/^#{1,6}\s/.test(trimmedLine)) {
          if (currentBlock.content.length > 0) {
            blocks.push({
              type: currentBlock.type,
              content: currentBlock.content.join('\n')
            });
            currentBlock = { type: 'paragraph', content: [] };
          }
          blocks.push({ type: 'header', content: trimmedLine });
        }
        // Check for section-like headers (ALL CAPS lines that aren't too long)
        else if (
          trimmedLine.length > 3 &&
          trimmedLine.length < 100 &&
          trimmedLine === trimmedLine.toUpperCase() &&
          /^[A-Z\s\d.,\-()]+$/.test(trimmedLine)
        ) {
          if (currentBlock.content.length > 0) {
            blocks.push({
              type: currentBlock.type,
              content: currentBlock.content.join('\n')
            });
            currentBlock = { type: 'paragraph', content: [] };
          }
          blocks.push({ type: 'header', content: trimmedLine });
        }
        // Empty line - paragraph break
        else if (trimmedLine === '') {
          if (currentBlock.content.length > 0) {
            blocks.push({
              type: currentBlock.type,
              content: currentBlock.content.join('\n')
            });
            currentBlock = { type: 'paragraph', content: [] };
          }
        }
        // Regular content
        else {
          currentBlock.content.push(line);
        }
      }
    }

    // Flush remaining content
    if (inTable && tableContent.length > 0) {
      blocks.push({ type: 'table', content: tableContent.join('\n') });
    } else if (currentBlock.content.length > 0) {
      blocks.push({
        type: currentBlock.type,
        content: currentBlock.content.join('\n')
      });
    }

    return blocks;
  }

  /**
   * Split a large table into smaller chunks while preserving headers
   */
  splitLargeTable(tableText, maxTokens) {
    const lines = tableText.split('\n');
    const chunks = [];

    if (lines.length < 3) {
      return [tableText]; // Can't split a table with no data rows
    }

    // Find header and separator
    let headerLines = [];
    let dataStartIndex = 0;

    for (let i = 0; i < lines.length && i < 3; i++) {
      if (/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
        // Found separator, header is everything before it
        headerLines = lines.slice(0, i + 1);
        dataStartIndex = i + 1;
        break;
      }
    }

    if (headerLines.length === 0) {
      // No separator found, assume first line is header
      headerLines = [lines[0]];
      dataStartIndex = 1;
    }

    const headerText = headerLines.join('\n');
    const headerTokens = this.countTokens(headerText);
    const maxDataTokens = maxTokens - headerTokens - 10; // Buffer for newlines

    let currentDataRows = [];
    let currentTokens = 0;

    for (let i = dataStartIndex; i < lines.length; i++) {
      const rowTokens = this.countTokens(lines[i]);

      if (currentTokens + rowTokens > maxDataTokens && currentDataRows.length > 0) {
        // Create chunk with header + current rows
        chunks.push(headerText + '\n' + currentDataRows.join('\n'));
        currentDataRows = [];
        currentTokens = 0;
      }

      currentDataRows.push(lines[i]);
      currentTokens += rowTokens;
    }

    // Don't forget the last chunk
    if (currentDataRows.length > 0) {
      chunks.push(headerText + '\n' + currentDataRows.join('\n'));
    }

    return chunks;
  }

  // ========== HELPER METHODS ==========

  /**
   * Count tokens in text using gpt-tokenizer
   */
  countTokens(text) {
    if (!text) return 0;
    return encode(text).length;
  }

  /**
   * Truncate text to approximately maxTokens
   */
  truncateToTokens(text, maxTokens) {
    const tokens = encode(text);
    if (tokens.length <= maxTokens) return text;
    return decode(tokens.slice(0, maxTokens));
  }

  /**
   * Convert tokens to approximate character count
   * Average ~4 chars per token for English
   */
  tokensToApproxChars(tokens) {
    return Math.round(tokens * 4);
  }

  /**
   * Find the best end position for a chunk
   */
  findChunkEnd(text, start, maxTokens, separators) {
    // Estimate end position based on tokens
    const approxEnd = start + this.tokensToApproxChars(maxTokens);
    let end = Math.min(approxEnd, text.length);

    // If we're at the end, just return
    if (end >= text.length) return text.length;

    // Try to find a good break point
    for (const separator of separators) {
      const searchStart = Math.floor(start + (end - start) * 0.7);
      const lastIndex = text.lastIndexOf(separator, end);

      if (lastIndex > searchStart) {
        return lastIndex + separator.length;
      }
    }

    return end;
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    // Handle common abbreviations and edge cases
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g;
    const sentences = text.match(sentenceRegex) || [text];

    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Parse markdown into structural blocks
   */
  parseMarkdownBlocks(text) {
    const blocks = [];
    const lines = text.split('\n');

    let currentBlock = { type: 'paragraph', content: [] };
    let inCodeBlock = false;
    let codeBlockContent = [];

    for (const line of lines) {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          codeBlockContent.push(line);
          blocks.push({ type: 'code', content: codeBlockContent.join('\n') });
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Flush current block
          if (currentBlock.content.length > 0) {
            blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
            currentBlock = { type: 'paragraph', content: [] };
          }
          inCodeBlock = true;
          codeBlockContent.push(line);
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headers
      if (/^#{1,6}\s/.test(line)) {
        if (currentBlock.content.length > 0) {
          blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
        }
        blocks.push({ type: 'header', content: line });
        currentBlock = { type: 'paragraph', content: [] };
        continue;
      }

      // Handle list items
      if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
        if (currentBlock.type !== 'list') {
          if (currentBlock.content.length > 0) {
            blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
          }
          currentBlock = { type: 'list', content: [] };
        }
        currentBlock.content.push(line);
        continue;
      }

      // Handle blockquotes
      if (/^\s*>/.test(line)) {
        if (currentBlock.type !== 'quote') {
          if (currentBlock.content.length > 0) {
            blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
          }
          currentBlock = { type: 'quote', content: [] };
        }
        currentBlock.content.push(line);
        continue;
      }

      // Handle blank lines (paragraph separator)
      if (line.trim() === '') {
        if (currentBlock.content.length > 0) {
          blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
          currentBlock = { type: 'paragraph', content: [] };
        }
        continue;
      }

      // Regular paragraph content
      if (currentBlock.type !== 'paragraph') {
        if (currentBlock.content.length > 0) {
          blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
        }
        currentBlock = { type: 'paragraph', content: [] };
      }
      currentBlock.content.push(line);
    }

    // Flush remaining content
    if (inCodeBlock && codeBlockContent.length > 0) {
      blocks.push({ type: 'code', content: codeBlockContent.join('\n') });
    } else if (currentBlock.content.length > 0) {
      blocks.push({ type: currentBlock.type, content: currentBlock.content.join('\n') });
    }

    return blocks;
  }

  /**
   * Parse code into logical blocks (functions, classes, etc.)
   */
  parseCodeBlocks(text) {
    const blocks = [];
    const lines = text.split('\n');

    let currentBlock = [];
    let braceDepth = 0;
    let parenDepth = 0;

    for (const line of lines) {
      // Count braces and parentheses
      for (const char of line) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
      }

      currentBlock.push(line);

      // Block ends when we return to depth 0 after being deeper
      if (
        braceDepth === 0 &&
        parenDepth === 0 &&
        currentBlock.length > 0 &&
        currentBlock.some((l) => l.includes('{') || l.includes('function') || l.includes('class'))
      ) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }

      // Also split on blank lines when at depth 0
      if (line.trim() === '' && braceDepth === 0 && parenDepth === 0 && currentBlock.length > 1) {
        const content = currentBlock.join('\n').trim();
        if (content) {
          blocks.push(content);
        }
        currentBlock = [];
      }
    }

    // Flush remaining
    if (currentBlock.length > 0) {
      const content = currentBlock.join('\n').trim();
      if (content) {
        blocks.push(content);
      }
    }

    return blocks.filter((b) => b.length > 0);
  }

  /**
   * Auto-detect content type and suggest best strategy
   */
  detectContentType(text) {
    // Check for markdown indicators
    const markdownScore =
      (text.match(/^#{1,6}\s/gm) || []).length +
      (text.match(/```/g) || []).length / 2 +
      (text.match(/^\s*[-*+]\s/gm) || []).length / 5;

    // Check for code indicators
    const codeScore =
      (text.match(/function\s+\w+/g) || []).length +
      (text.match(/class\s+\w+/g) || []).length +
      (text.match(/const|let|var|def|import|export/g) || []).length / 3;

    if (markdownScore > 3) return 'markdown';
    if (codeScore > 3) return 'code';
    if (text.length > 5000) return 'semantic';
    return 'recursive';
  }

  /**
   * Get chunk statistics
   */
  getChunkStats(chunks) {
    if (chunks.length === 0) {
      return {
        count: 0,
        avgTokens: 0,
        minTokens: 0,
        maxTokens: 0,
        totalTokens: 0,
        avgLength: 0,
        minLength: 0,
        maxLength: 0,
      };
    }

    const tokens = chunks.map((c) => c.tokens);
    const lengths = chunks.map((c) => c.content.length);

    return {
      count: chunks.length,
      avgTokens: Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length),
      minTokens: Math.min(...tokens),
      maxTokens: Math.max(...tokens),
      totalTokens: tokens.reduce((a, b) => a + b, 0),
      avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
    };
  }
}

export default new TextChunkerService();
