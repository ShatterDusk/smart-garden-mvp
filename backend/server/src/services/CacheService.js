/**
 * 缓存抽象层
 * 支持内存缓存和Redis缓存无缝切换
 * 
 * 设计原则：
 * 1. 零侵入 - 业务代码无需修改，只替换缓存实现
 * 2. 自动降级 - Redis连接失败时自动回退到内存缓存
 * 3. 行为一致 - 内存缓存与Redis缓存行为完全一致
 * 4. 渐进式改造 - 通过环境变量控制，可随时切换
 * 
 * 使用方式：
 * 1. 将此文件复制到 backend/server/src/services/CacheService.js
 * 2. 无需修改其他代码，CacheService 会自动适配路径
 */

// 动态适配路径 - 支持工作区和实际部署两种场景
let logger;
try {
  // 实际部署路径: backend/server/src/services/CacheService.js
  logger = require('../utils/logger');
} catch (e) {
  try {
    // 工作区路径: workspace-20260414-redis-cache/src/CacheService.js
    logger = require('../../../backend/server/src/utils/logger');
  } catch (e2) {
    // 兜底：创建简易 logger
    logger = {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.log,
    };
  }
}

// 缓存键前缀配置
const CACHE_PREFIX = process.env.REDIS_KEY_PREFIX || 'plantgpt:';

/**
 * 生成带前缀的缓存键
 * @param {string} key - 原始键
 * @returns {string} 带前缀的键
 */
function formatKey(key) {
  if (key.startsWith(CACHE_PREFIX)) {
    return key;
  }
  return `${CACHE_PREFIX}${key}`;
}

/**
 * 缓存抽象层
 */
class CacheService {
  constructor() {
    this.provider = null;
    this.isReady = false;
    this.type = 'memory'; // 'memory' | 'redis'
    this.redisClient = null; // 原始 Redis 客户端（用于关闭连接）
  }

  /**
   * 初始化缓存
   * @param {string} type - 'memory' | 'redis'
   */
  async init(type = 'memory') {
    if (this.isReady) return;

    // 如果环境变量配置了Redis，优先尝试Redis
    if (type === 'redis' || process.env.REDIS_HOST) {
      let redisClient = null;
      
      try {
        const Redis = require('ioredis');
        redisClient = new Redis({
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 5000,
        });

        // 等待连接就绪
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis连接超时'));
          }, 5000);

          redisClient.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          redisClient.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // 使用包装后的 Provider
        this.redisClient = redisClient;
        this.provider = new RedisCacheProvider(redisClient);
        this.type = 'redis';
        this.isReady = true;
        
        logger.info('[CacheService] Redis 缓存已启用', { 
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          prefix: CACHE_PREFIX,
        });
      } catch (error) {
        // 关闭失败的 Redis 连接，防止连接泄漏
        if (redisClient) {
          try {
            redisClient.disconnect();
          } catch (disconnectErr) {
            // 忽略关闭时的错误
          }
        }
        
        logger.warn('[CacheService] Redis 连接失败，回退到内存缓存', { 
          error: error.message,
          host: process.env.REDIS_HOST,
        });
        
        this.provider = new MemoryCacheProvider();
        this.type = 'memory';
        this.isReady = true;
      }
    } else {
      this.provider = new MemoryCacheProvider();
      this.type = 'memory';
      this.isReady = true;
      logger.info('[CacheService] 内存缓存已启用', { prefix: CACHE_PREFIX });
    }
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存值，不存在返回null
   */
  async get(key) {
    if (!this.isReady) await this.init();
    
    const formattedKey = formatKey(key);
    
    try {
      return await this.provider.get(formattedKey);
    } catch (error) {
      logger.error('[CacheService] get 失败', { key: formattedKey, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttlMs - 过期时间（毫秒）
   * @returns {Promise<void>}
   */
  async set(key, value, ttlMs) {
    if (!this.isReady) await this.init();
    
    const formattedKey = formatKey(key);
    
    try {
      await this.provider.set(formattedKey, value, ttlMs);
    } catch (error) {
      logger.error('[CacheService] set 失败', { key: formattedKey, error: error.message });
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<void>}
   */
  async del(key) {
    if (!this.isReady) await this.init();
    
    const formattedKey = formatKey(key);
    
    try {
      await this.provider.del(formattedKey);
    } catch (error) {
      logger.error('[CacheService] del 失败', { key: formattedKey, error: error.message });
    }
  }

  /**
   * 清空所有缓存
   * @param {string} pattern - 可选，只清空匹配前缀的缓存（仅Redis支持）
 * @returns {Promise<void>}
   */
  async clear(pattern = null) {
    if (!this.isReady) await this.init();
    
    try {
      if (pattern && this.type === 'redis') {
        // Redis 模式：按前缀删除
        await this.provider.clearByPattern(formatKey(pattern));
      } else {
        // 全部清空
        await this.provider.clear();
      }
      
      logger.info('[CacheService] 缓存已清空', { pattern, type: this.type });
    } catch (error) {
      logger.error('[CacheService] clear 失败', { pattern, error: error.message });
    }
  }

  /**
   * 批量获取缓存
   * @param {string[]} keys - 缓存键数组
   * @returns {Promise<Map>} key -> value
   */
  async mget(keys) {
    if (!this.isReady) await this.init();
    
    const formattedKeys = keys.map(formatKey);
    
    try {
      return await this.provider.mget(formattedKeys);
    } catch (error) {
      logger.error('[CacheService] mget 失败', { keys: formattedKeys, error: error.message });
      return new Map();
    }
  }

  /**
   * 批量设置缓存
   * @param {Map|Object} entries - 键值对
   * @param {number} ttlMs - 过期时间（毫秒）
   * @returns {Promise<void>}
   */
  async mset(entries, ttlMs) {
    if (!this.isReady) await this.init();
    
    // 统一转换为 Map 并添加前缀
    const formattedEntries = new Map();
    if (entries instanceof Map) {
      for (const [key, value] of entries) {
        formattedEntries.set(formatKey(key), value);
      }
    } else {
      for (const [key, value] of Object.entries(entries)) {
        formattedEntries.set(formatKey(key), value);
      }
    }
    
    try {
      await this.provider.mset(formattedEntries, ttlMs);
    } catch (error) {
      logger.error('[CacheService] mset 失败', { error: error.message });
    }
  }

  /**
   * 获取缓存状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    const status = {
      type: this.type,
      isReady: this.isReady,
      prefix: CACHE_PREFIX,
      provider: this.provider ? this.provider.constructor.name : null,
    };
    
    // 添加 Provider 特定状态
    if (this.provider && this.provider.getStats) {
      status.stats = this.provider.getStats();
    }
    
    return status;
  }

  /**
   * 关闭连接（用于优雅关闭）
   */
  async close() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        logger.info('[CacheService] Redis 连接已关闭');
      } catch (error) {
        logger.error('[CacheService] 关闭 Redis 连接失败', { error: error.message });
      }
    }
    
    if (this.provider && this.provider.destroy) {
      this.provider.destroy();
    }
    
    this.isReady = false;
    this.provider = null;
    this.redisClient = null;
  }
}

/**
 * 内存缓存实现
 * 与原有 weatherService 中的 Map 缓存行为完全一致
 */
class MemoryCacheProvider {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      dels: 0,
    };

    // 定期清理过期项（每5分钟）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  async set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttlMs,
    });
    this.stats.sets++;
  }

  async del(key) {
    this.cache.delete(key);
    this.stats.dels++;
  }

  async clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, dels: 0 };
  }

  async mget(keys) {
    const results = new Map();
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    return results;
  }

  async mset(entries, ttlMs) {
    for (const [key, value] of entries) {
      await this.set(key, value, ttlMs);
    }
  }

  /**
   * 清理过期项
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug('[MemoryCacheProvider] 清理过期缓存', { cleaned, remaining: this.cache.size });
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : 'N/A',
    };
  }

  /**
   * 销毁（清理定时器）
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Redis 缓存实现
 */
class RedisCacheProvider {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async get(key) {
    const value = await this.redis.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key, value, ttlMs) {
    const serialized = JSON.stringify(value);
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  async del(key) {
    await this.redis.del(key);
  }

  async clear() {
    await this.redis.flushdb();
  }

  async clearByPattern(pattern) {
    // 使用 SCAN 避免阻塞
    const stream = this.redis.scanStream({
      match: `${pattern}*`,
      count: 100,
    });
    
    const keys = [];
    stream.on('data', (resultKeys) => {
      keys.push(...resultKeys);
    });
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    if (keys.length > 0) {
      // 分批删除，每批 1000 个
      const batchSize = 1000;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await this.redis.del(...batch);
      }
    }
  }

  async mget(keys) {
    if (keys.length === 0) return new Map();
    
    const values = await this.redis.mget(keys);
    const results = new Map();
    
    keys.forEach((key, index) => {
      const value = values[index];
      if (value !== null) {
        try {
          results.set(key, JSON.parse(value));
        } catch {
          results.set(key, value);
        }
      }
    });
    
    return results;
  }

  async mset(entries, ttlMs) {
    if (entries.size === 0) return;
    
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    const pipeline = this.redis.pipeline();
    
    for (const [key, value] of entries) {
      const serialized = JSON.stringify(value);
      pipeline.setex(key, ttlSeconds, serialized);
    }
    
    await pipeline.exec();
  }

  /**
   * 获取 Redis 信息
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const usedMemory = info.match(/used_memory:(\d+)/)?.[1];
      
      return {
        type: 'redis',
        usedMemory: usedMemory ? parseInt(usedMemory) : null,
      };
    } catch {
      return { type: 'redis' };
    }
  }
}

// 导出单例
module.exports = new CacheService();
