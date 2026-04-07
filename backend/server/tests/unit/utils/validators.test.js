const validators = require('../../../src/utils/validators');

describe('validators', () => {
  describe('userLoginSchema', () => {
    it('验证有效的登录数据', () => {
      const { error, value } = validators.userLoginSchema.validate({
        code: 'wx_code_123',
        nickname: '测试用户',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(error).toBeUndefined();
      expect(value.code).toBe('wx_code_123');
    });

    it('缺少 code 时返回错误', () => {
      const { error } = validators.userLoginSchema.validate({
        nickname: '测试用户',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('微信登录code');
    });

    it('允许未知字段', () => {
      const { error } = validators.userLoginSchema.validate({
        code: 'wx_code_123',
        unknownField: 'value',
      });

      expect(error).toBeUndefined();
    });
  });

  describe('updateProfileSchema', () => {
    it('验证有效的更新数据', () => {
      const { error, value } = validators.updateProfileSchema.validate({
        nickname: '新昵称',
        avatarUrl: 'https://example.com/new-avatar.png',
      });

      expect(error).toBeUndefined();
      expect(value.nickname).toBe('新昵称');
    });

    it('昵称长度限制', () => {
      const { error } = validators.updateProfileSchema.validate({
        nickname: '',
      });

      expect(error).toBeDefined();
    });

    it('avatarUrl 允许任意字符串（微信 URL 可能不是标准 URI）', () => {
      const { error, value } = validators.updateProfileSchema.validate({
        avatarUrl: 'wx file://xxx',
      });

      expect(error).toBeUndefined();
      expect(value.avatarUrl).toBe('wx file://xxx');
    });

    it('avatarUrl 允许 null', () => {
      const { error, value } = validators.updateProfileSchema.validate({
        avatarUrl: null,
      });

      expect(error).toBeUndefined();
      expect(value.avatarUrl).toBeNull();
    });
  });

  describe('createPlantSchema', () => {
    it('验证有效的植物数据', () => {
      const { error, value } = validators.createPlantSchema.validate({
        nickname: '我的植物',
        species: '虎皮兰',
        plantCategory: 'succulent',
      });

      expect(error).toBeUndefined();
      expect(value.nickname).toBe('我的植物');
    });

    it('缺少必填字段时返回错误', () => {
      const { error } = validators.createPlantSchema.validate({
        nickname: '我的植物',
      });

      expect(error).toBeDefined();
    });

    it('无效的植物分类返回错误', () => {
      const { error } = validators.createPlantSchema.validate({
        nickname: '我的植物',
        species: '虎皮兰',
        plantCategory: 'invalid_category',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('无效的植物分类');
    });

    it('species 为空字符串时应为空字符串（验证器行为）', () => {
      const { error, value } = validators.createPlantSchema.validate({
        nickname: '植物',
        species: '',
        plantCategory: 'succulent',
      });
      expect(error).toBeUndefined();
      expect(value.species).toBe('');
    });

    it('species 为 null 时应允许', () => {
      const { error, value } = validators.createPlantSchema.validate({
        nickname: '植物',
        species: null,
        plantCategory: 'succulent',
      });
      expect(error).toBeUndefined();
      expect(value.species).toBeNull();
    });

    it('nickname 长度超过 50 字符应失败', () => {
      const { error } = validators.createPlantSchema.validate({
        nickname: 'a'.repeat(51),
        plantCategory: 'succulent',
      });
      expect(error).toBeDefined();
    });

    it('plantCategory 为 fruit 应失败（无效枚举值）', () => {
      const { error } = validators.createPlantSchema.validate({
        nickname: '植物',
        plantCategory: 'fruit',
      });
      expect(error).toBeDefined();
    });

    it('coverImageUrl 允许任意字符串（微信 URL）', () => {
      const { error, value } = validators.createPlantSchema.validate({
        nickname: '植物',
        plantCategory: 'succulent',
        coverImageUrl: 'wxfile://xxx',
      });
      expect(error).toBeUndefined();
      expect(value.coverImageUrl).toBe('wxfile://xxx');
    });

    it('location 相关字段都可选', () => {
      const { error, value } = validators.createPlantSchema.validate({
        nickname: '植物',
        plantCategory: 'succulent',
        locationName: '阳台',
        locationCode: '110000',
        locationLat: 39.9042,
        locationLng: 116.4074,
      });
      expect(error).toBeUndefined();
      expect(value.locationName).toBe('阳台');
    });
  });

  describe('updatePlantSchema', () => {
    it('验证有效的更新数据', () => {
      const { error, value } = validators.updatePlantSchema.validate({
        nickname: '新昵称',
        locationName: '阳台',
      });

      expect(error).toBeUndefined();
    });

    it('所有字段都是可选的', () => {
      const { error } = validators.updatePlantSchema.validate({});

      expect(error).toBeUndefined();
    });
  });

  describe('createSessionSchema', () => {
    it('验证有效的咨询会话', () => {
      const { error, value } = validators.createSessionSchema.validate({
        type: 'consultation',
        title: '咨询会话',
      });

      expect(error).toBeUndefined();
    });

    it('验证有效的植物会话', () => {
      const { error, value } = validators.createSessionSchema.validate({
        type: 'plant',
        plantId: 'PLANT_123',
      });

      expect(error).toBeUndefined();
    });

    it('植物会话缺少 plantId 返回错误', () => {
      const { error } = validators.createSessionSchema.validate({
        type: 'plant',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('plantId');
    });

    it('无效的会话类型返回错误', () => {
      const { error } = validators.createSessionSchema.validate({
        type: 'invalid_type',
      });

      expect(error).toBeDefined();
    });
  });

  describe('sendMessageSchema', () => {
    it('验证有效的文本消息', () => {
      const { error, value } = validators.sendMessageSchema.validate({
        contentType: 'text',
        content: '测试消息',
      });

      expect(error).toBeUndefined();
    });

    it('验证有效的图片消息', () => {
      const { error, value } = validators.sendMessageSchema.validate({
        contentType: 'image',
        imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      });

      expect(error).toBeUndefined();
    });

    it('无效的 contentType 返回错误', () => {
      const { error } = validators.sendMessageSchema.validate({
        contentType: 'video',
      });

      expect(error).toBeDefined();
    });
  });

  describe('createCareRecordSchema', () => {
    it('验证有效的养护记录', () => {
      const { error, value } = validators.createCareRecordSchema.validate({
        plantId: 'PLANT_123',
        actionType: 'water',
        description: '浇水',
      });

      expect(error).toBeUndefined();
    });

    it('缺少必填字段返回错误', () => {
      const { error } = validators.createCareRecordSchema.validate({
        plantId: 'PLANT_123',
      });

      expect(error).toBeDefined();
    });

    it('无效的 actionType 返回错误', () => {
      const { error } = validators.createCareRecordSchema.validate({
        plantId: 'PLANT_123',
        actionType: 'invalid_action',
      });

      expect(error).toBeDefined();
    });
  });

  describe('idParamSchema', () => {
    it('验证有效的 ID', () => {
      const { error, value } = validators.idParamSchema.validate({
        id: 'TEST_ID_123',
      });

      expect(error).toBeUndefined();
      expect(value.id).toBe('TEST_ID_123');
    });

    it('缺少 ID 返回错误', () => {
      const { error } = validators.idParamSchema.validate({});

      expect(error).toBeDefined();
    });
  });

  describe('bindDeviceSchema', () => {
    it('验证有效的绑定数据', () => {
      const { error, value } = validators.bindDeviceSchema.validate({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '测试设备',
        plantId: 'PLANT_123',
      });

      expect(error).toBeUndefined();
      expect(value.macAddress).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('缺少 MAC 地址返回错误', () => {
      const { error } = validators.bindDeviceSchema.validate({
        deviceName: '测试设备',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('MAC地址');
    });

    it('无效的 MAC 地址格式返回错误', () => {
      const { error } = validators.bindDeviceSchema.validate({
        macAddress: 'invalid-mac',
      });

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('MAC地址格式');
    });
  });

  describe('unbindDeviceSchema', () => {
    it('验证有效的解绑数据', () => {
      const { error, value } = validators.unbindDeviceSchema.validate({
        deviceId: 'DEVICE_123',
      });

      expect(error).toBeUndefined();
      expect(value.deviceId).toBe('DEVICE_123');
    });

    it('缺少设备 ID 返回错误', () => {
      const { error } = validators.unbindDeviceSchema.validate({});

      expect(error).toBeDefined();
    });
  });
});
