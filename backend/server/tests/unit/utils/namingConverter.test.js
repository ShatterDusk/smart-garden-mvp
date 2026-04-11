const {
  keysToCamel,
  keysToSnake,
  snakeToCamel,
  camelToSnake,
} = require('../../../src/utils/namingConverter');

describe('namingConverter utils', () => {
  describe('snakeToCamel', () => {
    it('转换 snake_case 为 camelCase', () => {
      expect(snakeToCamel('user_id')).toBe('userId');
      expect(snakeToCamel('plant_category')).toBe('plantCategory');
      expect(snakeToCamel('created_at')).toBe('createdAt');
      expect(snakeToCamel('is_stale')).toBe('isStale');
    });

    it('不改变已经是 camelCase 的字符串', () => {
      expect(snakeToCamel('userId')).toBe('userId');
      expect(snakeToCamel('plantCategory')).toBe('plantCategory');
    });

    it('处理没有下划线的字符串', () => {
      expect(snakeToCamel('name')).toBe('name');
      expect(snakeToCamel('status')).toBe('status');
    });
  });

  describe('camelToSnake', () => {
    it('转换 camelCase 为 snake_case', () => {
      expect(camelToSnake('userId')).toBe('user_id');
      expect(camelToSnake('plantCategory')).toBe('plant_category');
      expect(camelToSnake('createdAt')).toBe('created_at');
      expect(camelToSnake('isStale')).toBe('is_stale');
    });

    it('不改变已经是 snake_case 的字符串', () => {
      expect(camelToSnake('user_id')).toBe('user_id');
      expect(camelToSnake('plant_category')).toBe('plant_category');
    });

    it('处理没有大写字母的字符串', () => {
      expect(camelToSnake('name')).toBe('name');
      expect(camelToSnake('status')).toBe('status');
    });
  });

  describe('keysToCamel', () => {
    it('转换对象的键名', () => {
      const input = {
        user_id: '123',
        plant_category: 'succulent',
        created_at: '2024-01-01',
      };

      const result = keysToCamel(input);

      expect(result).toEqual({
        userId: '123',
        plantCategory: 'succulent',
        createdAt: '2024-01-01',
      });
    });

    it('递归转换嵌套对象', () => {
      const input = {
        user_id: '123',
        context_config: {
          environment_data: true,
          care_records: false,
        },
      };

      const result = keysToCamel(input);

      expect(result).toEqual({
        userId: '123',
        contextConfig: {
          environmentData: true,
          careRecords: false,
        },
      });
    });

    it('处理数组', () => {
      const input = [
        { user_id: '1', plant_category: 'succulent' },
        { user_id: '2', plant_category: 'foliage' },
      ];

      const result = keysToCamel(input);

      expect(result).toEqual([
        { userId: '1', plantCategory: 'succulent' },
        { userId: '2', plantCategory: 'foliage' },
      ]);
    });

    it('处理 null 和 undefined', () => {
      expect(keysToCamel(null)).toBeNull();
      expect(keysToCamel(undefined)).toBeUndefined();
    });

    it('处理原始类型', () => {
      expect(keysToCamel('string')).toBe('string');
      expect(keysToCamel(123)).toBe(123);
      expect(keysToCamel(true)).toBe(true);
    });
  });

  describe('keysToSnake', () => {
    it('转换对象的键名', () => {
      const input = {
        userId: '123',
        plantCategory: 'succulent',
        createdAt: '2024-01-01',
      };

      const result = keysToSnake(input);

      expect(result).toEqual({
        user_id: '123',
        plant_category: 'succulent',
        created_at: '2024-01-01',
      });
    });

    it('递归转换嵌套对象', () => {
      const input = {
        userId: '123',
        contextConfig: {
          environmentData: true,
          careRecords: false,
        },
      };

      const result = keysToSnake(input);

      expect(result).toEqual({
        user_id: '123',
        context_config: {
          environment_data: true,
          care_records: false,
        },
      });
    });

    it('处理数组', () => {
      const input = [
        { userId: '1', plantCategory: 'succulent' },
        { userId: '2', plantCategory: 'foliage' },
      ];

      const result = keysToSnake(input);

      expect(result).toEqual([
        { user_id: '1', plant_category: 'succulent' },
        { user_id: '2', 'plant_category': 'foliage' },
      ]);
    });

    it('处理 null 和 undefined', () => {
      expect(keysToSnake(null)).toBeNull();
      expect(keysToSnake(undefined)).toBeUndefined();
    });

    it('处理原始类型', () => {
      expect(keysToSnake('string')).toBe('string');
      expect(keysToSnake(123)).toBe(123);
      expect(keysToSnake(true)).toBe(true);
    });

    it('处理多层嵌套对象', () => {
      const input = {
        userId: '123',
        profileData: {
          firstName: 'John',
          lastName: 'Doe',
          contactInfo: {
            phoneNumber: '1234567890',
            emailAddress: 'john@example.com',
          },
        },
      };

      const result = keysToSnake(input);

      expect(result).toEqual({
        user_id: '123',
        profile_data: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '1234567890',
            email_address: 'john@example.com',
          },
        },
      });
    });

    it('处理空对象和空数组', () => {
      expect(keysToSnake({})).toEqual({});
      expect(keysToSnake([])).toEqual([]);
      expect(keysToCamel({})).toEqual({});
      expect(keysToCamel([])).toEqual([]);
    });

    it('处理包含特殊字符的键名', () => {
      const input = {
        'user-id': '123',
        'plant.category': 'succulent',
      };

      const result = keysToCamel(input);

      expect(result).toEqual({
        'user-id': '123',
        'plant.category': 'succulent',
      });
    });

    it('处理连续大写字母', () => {
      expect(camelToSnake('HTTPRequest')).toBe('h_t_t_p_request');
      expect(camelToSnake('XMLParser')).toBe('x_m_l_parser');
    });

    it('处理连续下划线', () => {
      // 连续下划线的实际行为：第二个下划线后跟小写字母会被转换为大写
      expect(snakeToCamel('user__id')).toBe('user_Id');
      expect(snakeToCamel('created__at')).toBe('created_At');
    });

    it('处理以数字开头的键名', () => {
      const input = {
        '1st_place': 'gold',
        '2nd_place': 'silver',
      };

      const result = keysToCamel(input);

      expect(result).toEqual({
        '1stPlace': 'gold',
        '2ndPlace': 'silver',
      });
    });
  });
});
