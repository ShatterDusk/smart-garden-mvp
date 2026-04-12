/**
 * envValidator 工具函数测试
 */

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const logger = require('../../../src/utils/logger');
const {
  validateEnv,
  getEnv,
  getRequiredEnv,
  REQUIRED_VARS,
  OPTIONAL_VARS,
} = require('../../../src/utils/envValidator');

describe('envValidator utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // 备份原始环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('常量定义', () => {
    it('REQUIRED_VARS 包含必需的环境变量', () => {
      expect(REQUIRED_VARS).toContain('DB_HOST');
      expect(REQUIRED_VARS).toContain('DB_NAME');
      expect(REQUIRED_VARS).toContain('DB_USER');
      expect(REQUIRED_VARS).toContain('DB_PASSWORD');
      expect(REQUIRED_VARS).toContain('JWT_SECRET');
    });

    it('OPTIONAL_VARS 包含可选的环境变量', () => {
      // WECHAT_APPID 和 WECHAT_SECRET 在 REQUIRED_VARS 中
      expect(OPTIONAL_VARS).toContain('DB_PORT');
      expect(OPTIONAL_VARS).toContain('DB_DIALECT');
      expect(OPTIONAL_VARS).toContain('DB_SSL');
      expect(OPTIONAL_VARS).toContain('DB_LOGGING');
    });
  });

  describe('validateEnv', () => {
    it('所有必需变量存在时返回 true', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.JWT_SECRET = 'test_secret';
      process.env.WECHAT_APPID = 'test_appid';
      process.env.WECHAT_SECRET = 'test_secret';
      process.env.COS_BUCKET = 'test_bucket';
      process.env.GLM_API_KEY = 'test_glm_key';

      const result = validateEnv(true);

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('环境变量校验通过');
    });

    it('生产环境缺少必需变量返回 false', () => {
      delete process.env.DB_HOST;
      delete process.env.JWT_SECRET;

      const result = validateEnv(true);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        '缺少必需的环境变量:',
        expect.stringContaining('DB_HOST')
      );
    });

    it('开发环境缺少变量只记录警告', () => {
      delete process.env.DB_HOST;

      const result = validateEnv(false);

      expect(result).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        '开发环境缺少部分环境变量:',
        expect.stringContaining('DB_HOST')
      );
    });

    it('默认使用非生产环境模式', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.JWT_SECRET = 'test_secret';

      const result = validateEnv();

      expect(result).toBe(true);
    });

    it('检测多个缺失的必需变量', () => {
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.DB_PASSWORD;

      const result = validateEnv(true);

      expect(result).toBe(false);
      const errorCall = logger.error.mock.calls[0];
      expect(errorCall[1]).toContain('DB_HOST');
      expect(errorCall[1]).toContain('DB_NAME');
      expect(errorCall[1]).toContain('DB_PASSWORD');
    });
  });

  describe('getEnv', () => {
    it('获取存在的环境变量', () => {
      process.env.TEST_VAR = 'test_value';

      const result = getEnv('TEST_VAR');

      expect(result).toBe('test_value');
    });

    it('获取不存在的环境变量返回默认值', () => {
      delete process.env.NON_EXISTENT_VAR;

      const result = getEnv('NON_EXISTENT_VAR', 'default_value');

      expect(result).toBe('default_value');
    });

    it('获取不存在的环境变量无默认值返回 undefined', () => {
      delete process.env.NON_EXISTENT_VAR;

      const result = getEnv('NON_EXISTENT_VAR');

      expect(result).toBeUndefined();
    });

    it('处理空字符串环境变量', () => {
      process.env.EMPTY_VAR = '';

      const result = getEnv('EMPTY_VAR', 'default');

      expect(result).toBe('');
    });

    it('处理数值类型的默认值', () => {
      delete process.env.NUMBER_VAR;

      const result = getEnv('NUMBER_VAR', 3306);

      expect(result).toBe(3306);
    });

    it('处理布尔类型的默认值', () => {
      delete process.env.BOOL_VAR;

      const result = getEnv('BOOL_VAR', true);

      expect(result).toBe(true);
    });
  });

  describe('getRequiredEnv', () => {
    it('获取存在的环境变量', () => {
      process.env.REQUIRED_TEST = 'required_value';

      const result = getRequiredEnv('REQUIRED_TEST');

      expect(result).toBe('required_value');
    });

    it('获取不存在的环境变量抛出错误', () => {
      delete process.env.MISSING_REQUIRED;

      expect(() => {
        getRequiredEnv('MISSING_REQUIRED');
      }).toThrow('缺少必需的环境变量: MISSING_REQUIRED');
    });

    it('错误消息包含变量名', () => {
      delete process.env.SPECIFIC_VAR;

      try {
        getRequiredEnv('SPECIFIC_VAR');
      } catch (error) {
        expect(error.message).toContain('SPECIFIC_VAR');
      }
    });
  });

  describe('实际使用场景', () => {
    it('数据库配置场景', () => {
      process.env.DB_HOST = 'mysql.example.com';
      process.env.DB_PORT = '3306';
      process.env.DB_NAME = 'production_db';

      const host = getEnv('DB_HOST');
      const port = parseInt(getEnv('DB_PORT', '3306'), 10);
      const name = getRequiredEnv('DB_NAME');

      expect(host).toBe('mysql.example.com');
      expect(port).toBe(3306);
      expect(name).toBe('production_db');
    });

    it('JWT 密钥配置场景', () => {
      process.env.JWT_SECRET = 'super_secret_key_123';

      const secret = getRequiredEnv('JWT_SECRET');

      expect(secret).toBe('super_secret_key_123');
    });

    it('可选配置使用默认值场景', () => {
      delete process.env.DB_DIALECT;

      const dialect = getEnv('DB_DIALECT', 'mysql');

      expect(dialect).toBe('mysql');
    });
  });
});
