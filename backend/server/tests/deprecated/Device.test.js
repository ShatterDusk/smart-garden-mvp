/**
 * Device 模型单元测试
 */

const Device = require('../../../src/models/Device');

describe('Device 模型', () => {
  describe('模型定义', () => {
    it('应正确定义表名', () => {
      expect(Device.tableName).toBe('devices');
    });

    it('应启用时间戳', () => {
      expect(Device.options.timestamps).toBe(true);
    });

    it('应使用 created_at 作为创建时间字段', () => {
      expect(Device.options.createdAt).toBe('created_at');
    });

    it('应禁用 updatedAt', () => {
      expect(Device.options.updatedAt).toBe(false);
    });
  });

  describe('字段定义', () => {
    const fields = Device.rawAttributes;

    it('应定义 device_id 字段', () => {
      expect(fields.device_id).toBeDefined();
      expect(fields.device_id.type.key).toBe('STRING');
      expect(fields.device_id.primaryKey).toBe(true);
    });

    it('应定义 user_id 字段', () => {
      expect(fields.user_id).toBeDefined();
      expect(fields.user_id.type.key).toBe('STRING');
      expect(fields.user_id.allowNull).toBe(false);
    });

    it('user_id 应有外键引用', () => {
      expect(fields.user_id.references.model).toBe('users');
      expect(fields.user_id.references.key).toBe('user_id');
    });

    it('应定义 mac_address 字段', () => {
      expect(fields.mac_address).toBeDefined();
      expect(fields.mac_address.type.key).toBe('STRING');
      expect(fields.mac_address.allowNull).toBe(false);
      expect(fields.mac_address.unique).toBe(true);
    });

    it('应定义 device_name 字段', () => {
      expect(fields.device_name).toBeDefined();
      expect(fields.device_name.type.key).toBe('STRING');
      expect(fields.device_name.allowNull).toBe(true);
    });

    it('应定义 status 字段', () => {
      expect(fields.status).toBeDefined();
      expect(fields.status.type.key).toBe('ENUM');
      expect(fields.status.defaultValue).toBe('unbound');
      expect(fields.status.allowNull).toBe(false);
    });

    it('status 字段应支持正确的枚举值', () => {
      const enumValues = fields.status.type.values;
      expect(enumValues).toContain('online');
      expect(enumValues).toContain('offline');
      expect(enumValues).toContain('unbound');
    });

    it('应定义 battery_level 字段', () => {
      expect(fields.battery_level).toBeDefined();
      expect(fields.battery_level.type.key).toBe('INTEGER');
      expect(fields.battery_level.allowNull).toBe(true);
    });

    it('应定义 last_heartbeat 字段', () => {
      expect(fields.last_heartbeat).toBeDefined();
      expect(fields.last_heartbeat.type.key).toBe('DATE');
      expect(fields.last_heartbeat.allowNull).toBe(true);
    });
  });

  describe('索引定义', () => {
    it('应定义 user_id 索引', () => {
      const indexes = Device.options.indexes;
      const index = indexes.find(i => i.name === 'idx_user');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['user_id']);
    });
  });

  describe('getter 方法', () => {
    it('应提供 deviceId getter', () => {
      expect(Device.options.getterMethods.deviceId).toBeDefined();
    });

    it('应提供 userId getter', () => {
      expect(Device.options.getterMethods.userId).toBeDefined();
    });

    it('应提供 macAddress getter', () => {
      expect(Device.options.getterMethods.macAddress).toBeDefined();
    });

    it('应提供 deviceName getter', () => {
      expect(Device.options.getterMethods.deviceName).toBeDefined();
    });

    it('应提供 batteryLevel getter', () => {
      expect(Device.options.getterMethods.batteryLevel).toBeDefined();
    });

    it('应提供 lastHeartbeat getter', () => {
      expect(Device.options.getterMethods.lastHeartbeat).toBeDefined();
    });

    it('应提供 createdAt getter', () => {
      expect(Device.options.getterMethods.createdAt).toBeDefined();
    });
  });

  describe('实例创建', () => {
    it('应使用默认值创建实例', () => {
      const device = Device.build({
        device_id: 'DEV_001',
        user_id: 'USER_001',
        mac_address: 'AA:BB:CC:DD:EE:FF',
      });
      expect(device.device_id).toBe('DEV_001');
      expect(device.user_id).toBe('USER_001');
      expect(device.mac_address).toBe('AA:BB:CC:DD:EE:FF');
      expect(device.status).toBe('unbound');
    });

    it('应允许指定设备名称', () => {
      const device = Device.build({
        device_id: 'DEV_002',
        user_id: 'USER_001',
        mac_address: '11:22:33:44:55:66',
        device_name: '客厅传感器',
      });
      expect(device.device_name).toBe('客厅传感器');
    });

    it('应允许指定状态', () => {
      const device = Device.build({
        device_id: 'DEV_003',
        user_id: 'USER_001',
        mac_address: 'AA:11:BB:22:CC:33',
        status: 'online',
      });
      expect(device.status).toBe('online');
    });

    it('应支持电池电量', () => {
      const device = Device.build({
        device_id: 'DEV_004',
        user_id: 'USER_001',
        mac_address: 'FF:EE:DD:CC:BB:AA',
        battery_level: 85,
      });
      expect(device.battery_level).toBe(85);
    });

    it('应支持最后心跳时间', () => {
      const lastHeartbeat = new Date('2026-04-12 10:00:00');
      const device = Device.build({
        device_id: 'DEV_005',
        user_id: 'USER_001',
        mac_address: '12:34:56:78:9A:BC',
        last_heartbeat: lastHeartbeat,
      });
      expect(device.last_heartbeat).toEqual(lastHeartbeat);
    });
  });

  describe('状态类型', () => {
    const statuses = ['online', 'offline', 'unbound'];

    statuses.forEach(status => {
      it(`应支持 ${status} 状态`, () => {
        const device = Device.build({
          device_id: `DEV_${status.toUpperCase()}`,
          user_id: 'USER_001',
          mac_address: `AA:BB:CC:DD:EE:${status === 'online' ? '01' : status === 'offline' ? '02' : '03'}`,
          status,
        });
        expect(device.status).toBe(status);
      });
    });
  });
});
