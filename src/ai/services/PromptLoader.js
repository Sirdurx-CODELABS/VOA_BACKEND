const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

class PromptLoader {
  constructor(promptsDir = '') {
    this.promptsDir = promptsDir || path.join(__dirname, '..', 'prompts');
    this.cache = new Map();
    this.watchers = new Map();
    this.initialized = false;
  }

  async init() {
    if (!fs.existsSync(this.promptsDir)) {
      fs.mkdirSync(this.promptsDir, { recursive: true });
      logger.warn(`PromptLoader: created prompts directory at ${this.promptsDir}`);
    }
    await this.loadAll();
    this.startWatching();
    this.initialized = true;
    logger.info(`PromptLoader initialized: ${this.cache.size} prompt files loaded from ${this.promptsDir}`);
  }

  async loadAll() {
    try {
      const files = fs.readdirSync(this.promptsDir)
        .filter(f => f.endsWith('.md') || f.endsWith('.txt'));

      for (const file of files) {
        const name = file.replace(/\.prompt\.md$/, '').replace(/\.md$/, '').replace(/\.txt$/, '');
        const filePath = path.join(this.promptsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.cache.set(name, {
            name,
            content,
            filePath,
            loadedAt: Date.now(),
            wordCount: content.split(/\s+/).length,
          });
        } catch (err) {
          logger.warn(`PromptLoader: failed to load ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`PromptLoader: failed to scan prompts directory: ${err.message}`);
    }
  }

  startWatching() {
    try {
      if (fs.watch) {
        const watcher = fs.watch(this.promptsDir, (eventType, filename) => {
          if (!filename || !filename.endsWith('.md')) return;
          const name = filename.replace(/\.prompt\.md$/, '').replace(/\.md$/, '').replace(/\.txt$/, '');
          const filePath = path.join(this.promptsDir, filename);
          try {
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf-8');
              this.cache.set(name, { name, content, filePath, loadedAt: Date.now(), wordCount: content.split(/\s+/).length });
              logger.info(`PromptLoader: auto-reloaded ${filename}`);
            } else {
              this.cache.delete(name);
              logger.info(`PromptLoader: removed ${filename} from cache`);
            }
          } catch { /* ignore */ }
        });
        this.watchers.set('dir', watcher);
      }
    } catch {
      logger.warn('PromptLoader: file watching not available, auto-reload disabled');
    }
  }

  get(name) {
    return this.cache.get(name) || null;
  }

  getContent(name) {
    return this.cache.get(name)?.content || null;
  }

  getAll() {
    return Array.from(this.cache.values());
  }

  getNames() {
    return Array.from(this.cache.keys());
  }

  async merge(names) {
    const parts = [];
    for (const name of names) {
      const prompt = this.cache.get(name);
      if (prompt) {
        parts.push(prompt.content);
      }
    }
    return parts.join('\n\n---\n\n');
  }

  async reload() {
    this.cache.clear();
    await this.loadAll();
    return this.cache.size;
  }

  size() {
    return this.cache.size;
  }

  stopWatching() {
    for (const [, watcher] of this.watchers) {
      try { watcher.close(); } catch { /* ignore */ }
    }
    this.watchers.clear();
  }
}

module.exports = PromptLoader;
