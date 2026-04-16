const validators = require('../../../src/utils/validators');

describe('validators', () => {
  describe('userLoginSchema', () => {
    it('验证有效的登录数据', () => {
      const { error, value } = validators.userLoginSchema.validate({
        code: 'wx_code_123',
        nickname: '测试用户',
      });

      expect(error).toBeUndefined();
      expect(value.code).toBe('wx_code_123');
    });

    it('缺少code时返回错误', () => {
      const { error } = validators.userLoginSchema.validate({
        nickname: '测试用户',
      });

      expect(error).toBeDefined();
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

    it('无效的植物分类返回错误', () => {
      const { error } = validators.createPlantSchema.validate({
        nickname: '我的植物',
        plantCategory: 'invalid_category',
      });

      expect(error).toBeDefined();
    });
  });

  describe('createSessionSchema', () => {
    it('验证有效的咨询会话', () => {
      const { error } = validators.createSessionSchema.validate({
        type: 'consultation',
        title: '咨询会话',
      });

      expect(error).toBeUndefined();
    });

    it('植物会话缺少plantId返回错误', () => {
      const { error } = validators.createSessionSchema.validate({
        type: 'plant',
      });

      expect(error).toBeDefined();
    });
  });

  describe('sendMessageSchema', () => {
    it('验证有效的文本消息', () => {
      const { error } = validators.sendMessageSchema.validate({
        contentType: 'text',
        content: '测试消息',
      });

      expect(error).toBeUndefined();
    });

    it('无效的contentType返回错误', () => {
      const { error } = validators.sendMessageSchema.validate({
        contentType: 'video',
      });

      expect(error).toBeDefined();
    });
  });

  describe('bindDeviceSchema', () => {
    it('验证有效的绑定数据', () => {
      const { error, value } = validators.bindDeviceSchema.validate({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        deviceName: '测试设备',
      });

      expect(error).toBeUndefined();
      expect(value.macAddress).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('无效的MAC地址格式返回错误', () => {
      const { error } = validators.bindDeviceSchema.validate({
        macAddress: 'invalid-mac',
      });

      expect(error).toBeDefined();
    });
  });
});
