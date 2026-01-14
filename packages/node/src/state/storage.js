/**
 * Storage Backends
 *
 * File and memory storage for node state
 *
 * @module @cynic/node/state/storage
 */

'use strict';

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Memory Storage - In-memory storage backend
 */
export class MemoryStorage {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
  }

  async delete(key) {
    this.data.delete(key);
  }

  async has(key) {
    return this.data.has(key);
  }

  async keys() {
    return Array.from(this.data.keys());
  }

  async clear() {
    this.data.clear();
  }
}

/**
 * File Storage - JSON file-based storage backend
 */
export class FileStorage {
  /**
   * @param {string} basePath - Base directory for storage
   */
  constructor(basePath) {
    this.basePath = basePath;
    this.cache = new Map();
  }

  /**
   * Get file path for key
   * @private
   */
  _getPath(key) {
    return join(this.basePath, `${key}.json`);
  }

  /**
   * Ensure directory exists
   * @private
   */
  async _ensureDir(filePath) {
    const dir = dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async get(key) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const filePath = this._getPath(key);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const value = JSON.parse(content);
      this.cache.set(key, value);
      return value;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return undefined;
      }
      throw err;
    }
  }

  async set(key, value) {
    const filePath = this._getPath(key);
    await this._ensureDir(filePath);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    this.cache.set(key, value);
  }

  async delete(key) {
    const filePath = this._getPath(key);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    this.cache.delete(key);
  }

  async has(key) {
    if (this.cache.has(key)) {
      return true;
    }

    const filePath = this._getPath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async keys() {
    try {
      const files = await fs.readdir(this.basePath);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.slice(0, -5));
    } catch (err) {
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  async clear() {
    const keys = await this.keys();
    await Promise.all(keys.map((k) => this.delete(k)));
    this.cache.clear();
  }

  /**
   * Flush cache to disk
   */
  async flush() {
    for (const [key, value] of this.cache) {
      await this.set(key, value);
    }
  }
}

export default {
  MemoryStorage,
  FileStorage,
};
