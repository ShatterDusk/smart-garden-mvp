/**
 * User 模型单元测试
 */

const User = require('../../../src/models/User');

describe('User 模型', () => {
  describe('模型定义', () => {
    it('应正确定义表名', () => {
      expect(User.tableName).toBe('users');
    });

    it('应启用时间戳', () => {
      expect(User.options.timestamps).toBe(true);
    });

    it('应使用下划线命名', () => {
      expect(User.options.underscored).toBe(true);
    });
  });

  describe('字段定义', () => {
    const fields = User.rawAttributes;

    it('应定义 user_id 字段', () => {
      expect(fields.user_id).toBeDefined();
      expect(fields.user_id.type.key).toBe('STRING');
      expect(fields.user_id.primaryKey).toBe(true);
    });

    it('应定义 wx_openid 字段', () => {
      expect(fields.wx_openid).toBeDefined();
      expect(fields.wx_openid.type.key).toBe('STRING');
      expect(fields.wx_openid.unique).toBe(true);
      expect(fields.wx_openid.allowNull).toBe(true);
    });

    it('应定义 nickname 字段', () => {
      expect(fields.nickname).toBeDefined();
      expect(fields.nickname.type.key).toBe('STRING');
      expect(fields.nickname.allowNull).toBe(false);
    });

    it('应定义 avatar_url 字段', () => {
      expect(fields.avatar_url).toBeDefined();
      expect(fields.avatar_url.type.key).toBe('STRING');
      expect(fields.avatar_url.allowNull).toBe(true);
    });

    it('应定义 role 字段', () => {
      expect(fields.role).toBeDefined();
      expect(fields.role.type.key).toBe('ENUM');
      expect(fields.role.defaultValue).toBe('user');
      expect(fields.role.allowNull).toBe(false);
    });

    it('role 字段应支持正确的枚举值', () => {
      const enumValues = fields.role.type.values;
      expect(enumValues).toContain('user');
      expect(enumValues).toContain('expert');
      expect(enumValues).toContain('admin');
    });

    it('应定义 status 字段', () => {
      expect(fields.status).toBeDefined();
      expect(fields.status.type.key).toBe('ENUM');
      expect(fields.status.defaultValue).toBe('active');
      expect(fields.status.allowNull).toBe(false);
    });

    it('status 字段应支持正确的枚举值', () => {
      const enumValues = fields.status.type.values;
      expect(enumValues).toContain('active');
      expect(enumValues).toContain('inactive');
      expect(enumValues).toContain('banned');
    });

    it('应定义 last_login_at 字段', () => {
      expect(fields.last_login_at).toBeDefined();
      expect(fields.last_login_at.type.key).toBe('DATE');
      expect(fields.last_login_at.allowNull).toBe(true);
    });
  });

  describe('索引定义', () => {
    it('应定义 role 索引', () => {
      const indexes = User.options.indexes;
      const index = indexes.find(i => i.name === 'idx_role');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['role']);
    });
  });

  describe('getter 方法', () => {
    it('应提供 userId getter', () => {
      expect(User.options.getterMethods.userId).toBeDefined();
    });

    it('应提供 wxOpenid getter', () => {
      expect(User.options.getterMethods.wxOpenid).toBeDefined();
    });

    it('应提供 avatarUrl getter', () => {
      expect(User.options.getterMethods.avatarUrl).toBeDefined();
    });

    it('应提供 lastLoginAt getter', () => {
      expect(User.options.getterMethods.lastLoginAt).toBeDefined();
    });

    it('应提供 createdAt getter', () => {
      expect(User.options.getterMethods.createdAt).toBeDefined();
    });

    it('应提供 updatedAt getter', () => {
      expect(User.options.getterMethods.updatedAt).toBeDefined();
    });
  });

  describe('实例创建', () => {
    it('应使用默认值创建实例', () => {
      const user = User.build({
        user_id: 'USER_001',
        nickname: '测试用户',
      });
      expect(user.user_id).toBe('USER_001');
      expect(user.nickname).toBe('测试用户');
      expect(user.role).toBe('user');
      expect(user.status).toBe('active');
    });

    it('应允许指定角色', () => {
      const user = User.build({
        user_id: 'USER_002',
        nickname: '专家用户',
        role: 'expert',
      });
      expect(user.role).toBe('expert');
    });

    it('应允许指定状态', () => {
      const user = User.build({
        user_id: 'USER_003',
        nickname: '禁用用户',
        status: 'banned',
      });
      expect(user.status).toBe('banned');
    });

    it('应支持微信相关信息', () => {
      const user = User.build({
        user_id: 'USER_004',
        nickname: '微信用户',
        wx_openid: 'wx_openid_123',
        avatar_url: 'https://example.com/avatar.jpg',
      });
      expect(user.wx_openid).toBe('wx_openid_123');
      expect(user.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('应支持最后登录时间', () => {
      const lastLogin = new Date('2026-04-12');
      const user = User.build({
        user_id: 'USER_005',
        nickname: '活跃用户',
        last_login_at: lastLogin,
      });
      expect(user.last_login_at).toEqual(lastLogin);
    });
  });

  describe('角色类型', () => {
    const roles = ['user', 'expert', 'admin'];

    roles.forEach(role => {
      it(`应支持 ${role} 角色`, () => {
        const user = User.build({
          user_id: `USER_${role.toUpperCase()}`,
          nickname: `${role}用户`,
          role,
        });
        expect(user.role).toBe(role);
      });
    });
  });

  describe('状态类型', () => {
    const statuses = ['active', 'inactive', 'banned'];

    statuses.forEach(status => {
      it(`应支持 ${status} 状态`, () => {
        const user = User.build({
          user_id: `USER_${status.toUpperCase()}`,
          nickname: `${status}用户`,
          status,
        });
        expect(user.status).toBe(status);
      });
    });
  });
});
