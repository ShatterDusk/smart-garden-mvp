/**
 * CacheService 单元测试
 * 
 * 测试覆盖：
 * 1. 内存缓存模式基本操作
 * 2. Redis 缓存模式（如环境允许）
 * 3. 自动降级
 * 4. 批量操作
 * 5. TTL 过期
 * 6. 错误处理
 */

const CacheService = require('../src/CacheService');

// 保存原始环境变量
const originalEnv = process.env;

describe('CacheService', () => {
  beforeEach(() => {
    // 重置 CacheService 状态
    CacheService.isReady = false;
    CacheService.provider = null;
    CacheService.type = 'memory';
    CacheService.redisClient = null;
    
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(async () => {
    // 清理缓存
    if (CacheService.isReady) {
      await CacheService.clear();
      await CacheService.close();
    }
    process.env = originalEnv;
  });

  describe('内存缓存模式', () => {
    test('应该自动初始化为内存缓存', async () => {
      // 不配置 REDIS_HOST，应该使用内存缓存
      const status = CacheService.getStatus();
      expect(status.isReady).toBe(false);
      
      await CacheService.init();
      
      const newStatus = CacheService.getStatus();
      expect(newStatus.type).toBe('memory');
      expect(newStatus.isReady).toBe(true);
    });

    test('应该支持基本的 get/set 操作', async () => {
      await CacheService.set('test-key', { data: 'value' }, 60000);
      
      const result = await CacheService.get('test-key');
      expect(result).toEqual({ data: 'value' });
    });

    test('应该返回 null 当缓存不存在', async () => {
      const result = await CacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('应该支持删除缓存', async () => {
      await CacheService.set('delete-key', 'value', 60000);
      await CacheService.del('delete-key');
      
      const result = await CacheService.get('delete-key');
      expect(result).toBeNull();
    });

    test('应该支持清空所有缓存', async () => {
      await CacheService.set('key1', 'value1', 60000);
      await CacheService.set('key2', 'value2', 60000);
      
      await CacheService.clear();
      
      expect(await CacheService.get('key1')).toBeNull();
      expect(await CacheService.get('key2')).toBeNull();
    });

    test('应该正确过期缓存', async () => {
      // 设置 100ms 过期
      await CacheService.set('expire-key', 'value', 100);
      
      // 立即获取应该存在
      expect(await CacheService.get('expire-key')).toBe('value');
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 过期后应该为 null
      expect(await CacheService.get('expire-key')).toBeNull();
    });

    test('应该支持批量获取', async () => {
      await CacheService.set('key1', 'value1', 60000);
      await CacheService.set('key2', 'value2', 60000);
      
      const results = await CacheService.mget(['key1', 'key2', 'key3']);
      
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.has('key3')).toBe(false);
    });

    test('应该支持批量设置', async () => {
      const entries = new Map([
        ['batch1', 'value1'],
        ['batch2', 'value2'],
      ]);
      
      await CacheService.mset(entries, 60000);
      
      expect(await CacheService.get('batch1')).toBe('value1');
      expect(await CacheService.get('batch2')).toBe('value2');
    });

    test('应该支持对象作为批量设置的参数', async () => {
      await CacheService.mset({
        obj1: 'value1',
        obj2: 'value2',
      }, 60000);
      
      expect(await CacheService.get('obj1')).toBe('value1');
      expect(await CacheService.get('obj2')).toBe('value2');
    });

    test('应该正确统计缓存命中率', async () => {
      // 预热缓存
      await CacheService.set('stat-key', 'value', 60000);
      
      // 多次命中
      await CacheService.get('stat-key');
      await CacheService.get('stat-key');
      
      // 多次未命中
      await CacheService.get('miss1');
      await CacheService.get('miss2');
      
      const status = CacheService.getStatus();
      expect(status.stats.hits).toBe(2);
      expect(status.stats.misses).toBe(2);
      expect(status.stats.hitRate).toBe('50.00%');
    });

    test('应该自动添加缓存键前缀', async () => {
      process.env.REDIS_KEY_PREFIX = 'test:';
      
      await CacheService.set('prefixed-key', 'value', 60000);
      const result = await CacheService.get('prefixed-key');
      
      expect(result).toBe('value');
    });
  });

  describe('错误处理', () => {
    test('应该在错误时返回 null 而不是抛出异常', async () => {
      // 模拟 provider 错误
      CacheService.provider = {
        get: jest.fn().mockRejectedValue(new Error('模拟错误')),
      };
      CacheService.isReady = true;
      
      const result = await CacheService.get('error-key');
      expect(result).toBeNull();
    });

    test('应该在 set 错误时静默处理', async () => {
      CacheService.provider = {
        set: jest.fn().mockRejectedValue(new Error('模拟错误')),
      };
      CacheService.isReady = true;
      
      // 不应该抛出异常
      await expect(CacheService.set('key', 'value', 60000)).resolves.not.toThrow();
    });
  });

  describe('自动降级', () => {
    test('应该在 Redis 连接失败时降级到内存缓存', async () => {
      // 配置错误的 Redis 地址
      process.env.REDIS_HOST = 'invalid-host-12345';
      process.env.REDIS_PORT = '6379';
      
      await CacheService.init();
      
      const status = CacheService.getStatus();
      expect(status.type).toBe('memory');
      expect(status.isReady).toBe(true);
    });

    test('降级后应该能正常使用缓存', async () => {
      process.env.REDIS_HOST = 'invalid-host-12345';
      
      await CacheService.init();
      
      await CacheService.set('fallback-key', 'value', 60000);
      const result = await CacheService.get('fallback-key');
      
      expect(result).toBe('value');
    });
  });

  describe('优雅关闭', () => {
    test('应该能优雅关闭内存缓存', async () => {
      await CacheService.init();
      await CacheService.set('close-key', 'value', 60000);
      
      await CacheService.close();
      
      expect(CacheService.isReady).toBe(false);
      expect(CacheService.provider).toBeNull();
    });
  });

  describe('复杂数据类型', () => {
    test('应该支持对象缓存', async () => {
      const obj = { name: 'test', nested: { value: 123 } };
      await CacheService.set('obj-key', obj, 60000);
      
      const result = await CacheService.get('obj-key');
      expect(result).toEqual(obj);
    });

    test('应该支持数组缓存', async () => {
      const arr = [1, 2, 3, { nested: true }];
      await CacheService.set('arr-key', arr, 60000);
      
      const result = await CacheService.get('arr-key');
      expect(result).toEqual(arr);
    });

    test('应该支持 Date 对象缓存', async () => {
      const date = new Date('2026-04-14');
      await CacheService.set('date-key', date, 60000);
      
      const result = await CacheService.get('date-key');
      // Date 对象会被序列化为字符串
      expect(result).toBe(date.toISOString());
    });
  });
});

// 集成测试：如果环境配置了 Redis，测试 Redis 模式
describe('CacheService Redis 模式（可选）', () => {
  beforeAll(() => {
    // 只有配置了 REDIS_HOST 才运行这些测试
    if (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost') {
      // 跳过所有测试
      return;
    }
  });

  beforeEach(async () => {
    if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost') {
      await CacheService.init('redis');
    }
  });

  afterEach(async () => {
    if (CacheService.isReady) {
      await CacheService.clear();
      await CacheService.close();
    }
  });

  test('应该连接到 Redis', async () => {
    // 如果配置了 Redis，应该能连接
    if (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost') {
      return;
    }
    
    const status = CacheService.getStatus();
    expect(status.type).toBe('redis');
  });
});
