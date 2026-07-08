const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const vectorStore = require('./VectorStore');
const AIKnowledge = require('../models/AIKnowledge');

class KnowledgeService {
  constructor(embeddingService, knowledgeDir = '') {
    this.knowledgeDir = knowledgeDir || path.join(__dirname, '..', 'knowledge');
    this.embeddingService = embeddingService;
    this.initialized = false;
  }

  async init() {
    if (!fs.existsSync(this.knowledgeDir)) {
      fs.mkdirSync(this.knowledgeDir, { recursive: true });
    }
    this.initialized = true;
    const count = await vectorStore.count();
    logger.info(`KnowledgeService initialized: ${count} indexed chunks in vector store`);
  }

  async indexAll() {
    const files = this.scanKnowledgeFiles();
    let totalChunks = 0;

    for (const file of files) {
      try {
        const chunks = await this.indexFile(file);
        totalChunks += chunks;
      } catch (err) {
        logger.error(`KnowledgeService: failed to index ${file.filename}: ${err.message}`);
      }
    }

    logger.info(`KnowledgeService: indexed ${totalChunks} chunks from ${files.length} files`);
    return { files: files.length, chunks: totalChunks };
  }

  scanKnowledgeFiles() {
    if (!fs.existsSync(this.knowledgeDir)) return [];

    const entries = fs.readdirSync(this.knowledgeDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const supported = ['.md', '.txt', '.json'];
      if (!supported.includes(ext)) continue;

      const topic = path.basename(entry.name, ext);
      files.push({
        filename: entry.name,
        topic,
        filePath: path.join(this.knowledgeDir, entry.name),
        contentType: ext === '.md' ? 'markdown' : ext === '.json' ? 'json' : 'txt',
      });
    }

    return files;
  }

  async indexFile(fileInfo) {
    const content = fs.readFileSync(fileInfo.filePath, 'utf-8');
    if (!content.trim()) return 0;

    const chunks = this.embeddingService.chunkText(content, { maxChunkSize: 300, overlap: 30 });

    await vectorStore.removeByFilename(fileInfo.filename);

    const docs = [];
    let hadFailures = false;
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await this.embeddingService.generateEmbedding(chunks[i]);
        docs.push({
          filename: fileInfo.filename,
          originalName: fileInfo.filename,
          topic: fileInfo.topic,
          contentType: fileInfo.contentType,
          chunkIndex: i,
          content: chunks[i],
          embedding,
          metadata: {
            source: fileInfo.filename,
            wordCount: chunks[i].split(/\s+/).length,
          },
        });
      } catch (err) {
        hadFailures = true;
        docs.push({
          filename: fileInfo.filename,
          originalName: fileInfo.filename,
          topic: fileInfo.topic,
          contentType: fileInfo.contentType,
          chunkIndex: i,
          content: chunks[i],
          embedding: [],
          metadata: { source: fileInfo.filename, wordCount: chunks[i].split(/\s+/).length },
        });
      }
    }
    if (hadFailures) logger.warn(`KnowledgeService: some chunks for ${fileInfo.filename} stored without embeddings (fallback mode)`);

    if (docs.length > 0) {
      await vectorStore.store(docs);
    }

    return docs.length;
  }

  async getContentByTopic(topic) {
    return AIKnowledge.find({ topic, isActive: true })
      .sort({ chunkIndex: 1 })
      .select('content chunkIndex metadata filename')
      .lean();
  }

  async removeKnowledge(filename) {
    await AIKnowledge.deleteMany({ filename });
    return true;
  }

  async reindexFile(filename) {
    const fileInfo = this.scanKnowledgeFiles().find(f => f.filename === filename);
    if (!fileInfo) throw new Error(`File not found: ${filename}`);
    return this.indexFile(fileInfo);
  }

  getStats() {
    const files = this.scanKnowledgeFiles();
    return {
      filesAvailable: files.length,
      fileNames: files.map(f => f.filename),
    };
  }
}

module.exports = KnowledgeService;
