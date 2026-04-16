/**
 * CacheService 单元测试
 */

// 在 require 之前设置内存缓存模式
process.env.REDIS_HOST = '';

const cacheService = require('../../../src/services/CacheService');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('CacheService', () => {
  beforeEach(async () => {
    // 重置缓存服务状态
    await cacheService.close();
    cacheService.isReady = false;
    cacheService.provider = null;
    cacheService.type = 'memory';
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cacheService.close();
  });

  describe('初始化', () => {
    it('应默认使用内存缓存', async () => {
      await cacheService.init();
      expect(cacheService.type).toBe('memory');
      expect(cacheService.isReady).toBe(true);
    });

    it('应返回缓存状态', async () => {
      await cacheService.init();
      const status = cacheService.getStatus();
      expect(status).toHaveProperty('type', 'memory');
      expect(status).toHaveProperty('isReady', true);
      expect(status).toHaveProperty('prefix');
      expect(status).toHaveProperty('stats');
    });
  });

  describe('基本操作 - 内存模式', () => {
    beforeEach(async () => {
      await cacheService.init('memory');
    });

    it('应设置和获取缓存值', async () => {
      await cacheService.set('test-key', { data: 'value' }, 60000);
      const value = await cacheService.get('test-key');
      expect(value).toEqual({ data: 'value' });
    });

    it('应返回 null 当键不存在', async () => {
      const value = await cacheService.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('应返回 null 当缓存过期', async () => {
      await cacheService.set('expiring-key', 'value', 1); // 1ms TTL
      await new Promise(resolve => setTimeout(resolve, 10));
      const value = await cacheService.get('expiring-key');
      expect(value).toBeNull();
    });

    it('应删除缓存', async () => {
      await cacheService.set('delete-key', 'value', 60000);
      await cacheService.del('delete-key');
      const value = await cacheService.get('delete-key');
      expect(value).toBeNull();
    });

    it('应清空所有缓存', async () => {
      await cacheService.set('key1', 'value1', 60000);
      await cacheService.set('key2', 'value2', 60000);
      await cacheService.clear();
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
    });
  });

  describe('批量操作', () => {
    beforeEach(async () => {
      await cacheService.init('memory');
    });

    it('应批量获取缓存', async () => {
      await cacheService.set('key1', 'value1', 60000);
      await cacheService.set('key2', 'value2', 60000);

      const results = await cacheService.mget(['key1', 'key2', 'key3']);

      // mget 返回的 Map 使用格式化后的键（带前缀）
      const status = cacheService.getStatus();
      const prefix = status.prefix;
      expect(results.get(`${prefix}key1`)).toBe('value1');
      expect(results.get(`${prefix}key2`)).toBe('value2');
      expect(results.has(`${prefix}key3`)).toBe(false);
    });

    it('应批量设置缓存', async () => {
      const entries = new Map([
        ['batch1', 'value1'],
        ['batch2', 'value2'],
      ]);

      await cacheService.mset(entries, 60000);

      expect(await cacheService.get('batch1')).toBe('value1');
      expect(await cacheService.get('batch2')).toBe('value2');
    });

    it('应支持对象作为批量设置参数', async () => {
      const entries = {
        obj1: 'value1',
        obj2: 'value2',
      };

      await cacheService.mset(entries, 60000);

      expect(await cacheService.get('obj1')).toBe('value1');
      expect(await cacheService.get('obj2')).toBe('value2');
    });
  });

  describe('缓存键前缀', () => {
    beforeEach(async () => {
      await cacheService.init('memory');
    });

    it('应自动添加前缀', async () => {
      await cacheService.set('mykey', 'myvalue', 60000);
      const status = cacheService.getStatus();
      expect(status.prefix).toBeDefined();
    });

    it('应避免重复添加前缀', async () => {
      const status = cacheService.getStatus();
      const prefix = status.prefix;
      await cacheService.set(`${prefix}key`, 'value', 60000);
      const value = await cacheService.get('key');
      expect(value).toBe('value');
    });
  });

  describe('统计信息', () => {
    beforeEach(async () => {
      await cacheService.init('memory');
    });

    it('应返回命中统计', async () => {
      await cacheService.set('stat-key', 'value', 60000);
      await cacheService.get('stat-key'); // hit
      await cacheService.get('stat-key'); // hit
      await cacheService.get('missing-key'); // miss

      const status = cacheService.getStatus();
      expect(status.stats).toHaveProperty('hits', 2);
      expect(status.stats).toHaveProperty('misses', 1);
      expect(status.stats).toHaveProperty('hitRate');
    });

    it('应返回缓存大小', async () => {
      await cacheService.set('size1', 'v1', 60000);
      await cacheService.set('size2', 'v2', 60000);

      const status = cacheService.getStatus();
      expect(status.stats.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await cacheService.init('memory');
    });

    it('应在获取失败时返回 null', async () => {
      // 模拟 provider 错误
      const originalGet = cacheService.provider.get;
      cacheService.provider.get = jest.fn().mockRejectedValue(new Error('Provider error'));

      const value = await cacheService.get('error-key');
      expect(value).toBeNull();
      expect(logger.error).toHaveBeenCalled();

      cacheService.provider.get = originalGet;
    });

    it('应在设置失败时记录错误', async () => {
      const originalSet = cacheService.provider.set;
      cacheService.provider.set = jest.fn().mockRejectedValue(new Error('Set error'));

      await cacheService.set('error-key', 'value', 60000);
      expect(logger.error).toHaveBeenCalled();

      cacheService.provider.set = originalSet;
    });
  });

  describe('连接关闭', () => {
    it('应能关闭连接', async () => {
      await cacheService.init('memory');
      await cacheService.close();
      expect(cacheService.isReady).toBe(false);
      expect(cacheService.provider).toBeNull();
    });

    it('关闭后应能重新初始化', async () => {
      await cacheService.init('memory');
      await cacheService.close();
      await cacheService.init('memory');
      expect(cacheService.isReady).toBe(true);
    });
  });

  describe('自动初始化', () => {
    it('应在首次操作时自动初始化', async () => {
      cacheService.isReady = false;
      await cacheService.set('auto-init', 'value', 60000);
      expect(cacheService.isReady).toBe(true);
    });
  });
});
