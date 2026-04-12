/**
 * SystemLog 模型单元测试
 */

const SystemLog = require('../../../src/models/SystemLog');

describe('SystemLog 模型', () => {
  describe('模型定义', () => {
    it('应正确定义表名', () => {
      expect(SystemLog.tableName).toBe('system_logs');
    });

    it('应启用时间戳', () => {
      expect(SystemLog.options.timestamps).toBe(true);
    });

    it('应使用下划线命名', () => {
      expect(SystemLog.options.underscored).toBe(true);
    });
  });

  describe('字段定义', () => {
    const fields = SystemLog.rawAttributes;

    it('应定义 id 字段', () => {
      expect(fields.id).toBeDefined();
      expect(fields.id.primaryKey).toBe(true);
      expect(fields.id.autoIncrement).toBe(true);
    });

    it('应定义 level 字段', () => {
      expect(fields.level).toBeDefined();
      expect(fields.level.type.key).toBe('ENUM');
      expect(fields.level.defaultValue).toBe('info');
      expect(fields.level.allowNull).toBe(false);
    });

    it('level 字段应支持正确的枚举值', () => {
      const enumValues = fields.level.type.values;
      expect(enumValues).toContain('debug');
      expect(enumValues).toContain('info');
      expect(enumValues).toContain('warn');
      expect(enumValues).toContain('error');
      expect(enumValues).toContain('fatal');
    });

    it('应定义 message 字段', () => {
      expect(fields.message).toBeDefined();
      expect(fields.message.type.key).toBe('TEXT');
      expect(fields.message.allowNull).toBe(false);
    });

    it('应定义 metadata 字段', () => {
      expect(fields.metadata).toBeDefined();
      expect(fields.metadata.type.key).toBe('JSON');
      expect(fields.metadata.allowNull).toBe(true);
    });

    it('应定义 source 字段', () => {
      expect(fields.source).toBeDefined();
      expect(fields.source.type.key).toBe('STRING');
      expect(fields.source.allowNull).toBe(true);
    });

    it('应定义 request_id 字段', () => {
      expect(fields.request_id).toBeDefined();
      expect(fields.request_id.type.key).toBe('STRING');
    });

    it('应定义 ip_address 字段', () => {
      expect(fields.ip_address).toBeDefined();
      expect(fields.ip_address.type.key).toBe('STRING');
    });

    it('应定义 user_agent 字段', () => {
      expect(fields.user_agent).toBeDefined();
      expect(fields.user_agent.type.key).toBe('STRING');
    });

    it('应定义 url 字段', () => {
      expect(fields.url).toBeDefined();
      expect(fields.url.type.key).toBe('STRING');
    });

    it('应定义 method 字段', () => {
      expect(fields.method).toBeDefined();
      expect(fields.method.type.key).toBe('STRING');
    });

    it('应定义 error_stack 字段', () => {
      expect(fields.error_stack).toBeDefined();
      expect(fields.error_stack.type.key).toBe('TEXT');
    });
  });

  describe('索引定义', () => {
    it('应定义 level + created_at 复合索引', () => {
      const indexes = SystemLog.options.indexes;
      const index = indexes.find(i => i.name === 'idx_level_created');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['level', 'created_at']);
    });

    it('应定义 source + created_at 复合索引', () => {
      const indexes = SystemLog.options.indexes;
      const index = indexes.find(i => i.name === 'idx_source_created');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['source', 'created_at']);
    });

    it('应定义 request_id 索引', () => {
      const indexes = SystemLog.options.indexes;
      const index = indexes.find(i => i.name === 'idx_request_id');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['request_id']);
    });

    it('应定义 created_at 索引', () => {
      const indexes = SystemLog.options.indexes;
      const index = indexes.find(i => i.name === 'idx_created_at');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['created_at']);
    });
  });

  describe('getter 方法', () => {
    it('应提供 logId getter', () => {
      const log = SystemLog.build({ id: 123 });
      expect(log.logId).toBe(123);
    });

    it('应提供 createdAt getter', () => {
      // 由于 Sequelize getterMethods 的工作方式，这里仅检查模型配置
      expect(SystemLog.options.getterMethods.createdAt).toBeDefined();
    });
  });

  describe('实例创建', () => {
    it('应使用默认 level 值创建实例', () => {
      const log = SystemLog.build({ message: '测试消息' });
      expect(log.level).toBe('info');
      expect(log.message).toBe('测试消息');
    });

    it('应允许指定 level 值', () => {
      const log = SystemLog.build({
        message: '错误消息',
        level: 'error',
      });
      expect(log.level).toBe('error');
    });

    it('应支持 metadata JSON 数据', () => {
      const metadata = { userId: '123', action: 'login' };
      const log = SystemLog.build({
        message: '用户登录',
        metadata,
      });
      expect(log.metadata).toEqual(metadata);
    });

    it('应支持完整的日志数据', () => {
      const logData = {
        level: 'error',
        message: '数据库连接失败',
        metadata: { retryCount: 3 },
        source: 'database',
        request_id: 'req-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        url: '/api/users',
        method: 'POST',
        error_stack: 'Error: Connection refused\n    at ...',
      };
      const log = SystemLog.build(logData);
      expect(log.level).toBe('error');
      expect(log.message).toBe('数据库连接失败');
      expect(log.source).toBe('database');
      expect(log.request_id).toBe('req-123');
    });
  });

  describe('日志级别', () => {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];

    levels.forEach(level => {
      it(`应支持 ${level} 级别`, () => {
        const log = SystemLog.build({
          message: `${level} 日志`,
          level,
        });
        expect(log.level).toBe(level);
      });
    });
  });
});
