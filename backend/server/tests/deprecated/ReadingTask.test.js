/**
 * ReadingTask 模型单元测试
 */

const ReadingTask = require('../../../src/models/ReadingTask');

describe('ReadingTask 模型', () => {
  describe('模型定义', () => {
    it('应正确定义表名', () => {
      expect(ReadingTask.tableName).toBe('reading_tasks');
    });

    it('应启用时间戳', () => {
      expect(ReadingTask.options.timestamps).toBe(true);
    });

    it('应使用下划线命名', () => {
      expect(ReadingTask.options.underscored).toBe(true);
    });
  });

  describe('字段定义', () => {
    const fields = ReadingTask.rawAttributes;

    it('应定义 task_id 字段', () => {
      expect(fields.task_id).toBeDefined();
      expect(fields.task_id.type.key).toBe('STRING');
      expect(fields.task_id.primaryKey).toBe(true);
    });

    it('应定义 plant_id 字段', () => {
      expect(fields.plant_id).toBeDefined();
      expect(fields.plant_id.type.key).toBe('STRING');
      expect(fields.plant_id.allowNull).toBe(false);
    });

    it('plant_id 应有外键引用', () => {
      expect(fields.plant_id.references.model).toBe('plants');
      expect(fields.plant_id.references.key).toBe('plant_id');
    });

    it('应定义 recorded_at 字段', () => {
      expect(fields.recorded_at).toBeDefined();
      expect(fields.recorded_at.type.key).toBe('DATE');
      expect(fields.recorded_at.allowNull).toBe(false);
    });

    it('应定义 sensor_status 字段', () => {
      expect(fields.sensor_status).toBeDefined();
      expect(fields.sensor_status.type.key).toBe('ENUM');
      expect(fields.sensor_status.defaultValue).toBe('pending');
      expect(fields.sensor_status.allowNull).toBe(false);
    });

    it('sensor_status 字段应支持正确的枚举值', () => {
      const enumValues = fields.sensor_status.type.values;
      expect(enumValues).toContain('pending');
      expect(enumValues).toContain('received');
      expect(enumValues).toContain('compensated');
      expect(enumValues).toContain('failed');
    });

    it('应定义 weather_status 字段', () => {
      expect(fields.weather_status).toBeDefined();
      expect(fields.weather_status.type.key).toBe('ENUM');
      expect(fields.weather_status.defaultValue).toBe('pending');
      expect(fields.weather_status.allowNull).toBe(false);
    });

    it('weather_status 字段应支持正确的枚举值', () => {
      const enumValues = fields.weather_status.type.values;
      expect(enumValues).toContain('pending');
      expect(enumValues).toContain('received');
      expect(enumValues).toContain('failed');
    });
  });

  describe('索引定义', () => {
    it('应定义 plant_id + recorded_at 复合索引', () => {
      const indexes = ReadingTask.options.indexes;
      const index = indexes.find(i => i.name === 'idx_plant_time');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['plant_id', 'recorded_at']);
    });

    it('应定义 sensor_status 索引', () => {
      const indexes = ReadingTask.options.indexes;
      const index = indexes.find(i => i.name === 'idx_sensor_status');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['sensor_status']);
    });

    it('应定义 weather_status 索引', () => {
      const indexes = ReadingTask.options.indexes;
      const index = indexes.find(i => i.name === 'idx_weather_status');
      expect(index).toBeDefined();
      expect(index.fields).toEqual(['weather_status']);
    });
  });

  describe('getter 方法', () => {
    it('应提供 taskId getter', () => {
      expect(ReadingTask.options.getterMethods.taskId).toBeDefined();
    });

    it('应提供 plantId getter', () => {
      expect(ReadingTask.options.getterMethods.plantId).toBeDefined();
    });

    it('应提供 recordedAt getter', () => {
      expect(ReadingTask.options.getterMethods.recordedAt).toBeDefined();
    });

    it('应提供 sensorStatus getter', () => {
      expect(ReadingTask.options.getterMethods.sensorStatus).toBeDefined();
    });

    it('应提供 weatherStatus getter', () => {
      expect(ReadingTask.options.getterMethods.weatherStatus).toBeDefined();
    });

    it('应提供 createdAt getter', () => {
      expect(ReadingTask.options.getterMethods.createdAt).toBeDefined();
    });

    it('应提供 updatedAt getter', () => {
      expect(ReadingTask.options.getterMethods.updatedAt).toBeDefined();
    });
  });

  describe('实例创建', () => {
    it('应使用默认值创建实例', () => {
      const task = ReadingTask.build({
        task_id: 'TASK_001',
        plant_id: 'PLANT_001',
        recorded_at: new Date(),
      });
      expect(task.task_id).toBe('TASK_001');
      expect(task.plant_id).toBe('PLANT_001');
      expect(task.sensor_status).toBe('pending');
      expect(task.weather_status).toBe('pending');
    });

    it('应允许指定 sensor_status', () => {
      const task = ReadingTask.build({
        task_id: 'TASK_002',
        plant_id: 'PLANT_001',
        recorded_at: new Date(),
        sensor_status: 'received',
      });
      expect(task.sensor_status).toBe('received');
    });

    it('应允许指定 weather_status', () => {
      const task = ReadingTask.build({
        task_id: 'TASK_003',
        plant_id: 'PLANT_001',
        recorded_at: new Date(),
        weather_status: 'failed',
      });
      expect(task.weather_status).toBe('failed');
    });

    it('应支持补偿状态', () => {
      const task = ReadingTask.build({
        task_id: 'TASK_004',
        plant_id: 'PLANT_001',
        recorded_at: new Date(),
        sensor_status: 'compensated',
      });
      expect(task.sensor_status).toBe('compensated');
    });
  });

  describe('状态类型', () => {
    const sensorStatuses = ['pending', 'received', 'compensated', 'failed'];
    const weatherStatuses = ['pending', 'received', 'failed'];

    sensorStatuses.forEach(status => {
      it(`应支持 sensor_status: ${status}`, () => {
        const task = ReadingTask.build({
          task_id: `TASK_S_${status.toUpperCase()}`,
          plant_id: 'PLANT_001',
          recorded_at: new Date(),
          sensor_status: status,
        });
        expect(task.sensor_status).toBe(status);
      });
    });

    weatherStatuses.forEach(status => {
      it(`应支持 weather_status: ${status}`, () => {
        const task = ReadingTask.build({
          task_id: `TASK_W_${status.toUpperCase()}`,
          plant_id: 'PLANT_001',
          recorded_at: new Date(),
          weather_status: status,
        });
        expect(task.weather_status).toBe(status);
      });
    });
  });
});
