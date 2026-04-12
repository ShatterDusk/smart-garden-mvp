jest.setTimeout(30000);

// 在所有测试之前执行
beforeAll(async () => {
  // 可以在这里添加全局初始化
});

// 在所有测试之后执行 - 清理资源
afterAll(async () => {
  // 关闭数据库连接
  try {
    const { sequelize } = require('../../src/models');
    if (sequelize) {
      await sequelize.close();
      console.log('[Jest Teardown] 数据库连接已关闭');
    }
  } catch (error) {
    // 忽略错误，可能连接已经关闭
  }

  // 清理 logAuth 中的定时器
  try {
    const { clearCleanupInterval } = require('../../src/middleware/logAuth');
    if (clearCleanupInterval) {
      clearCleanupInterval();
      console.log('[Jest Teardown] logAuth 定时器已清理');
    }
  } catch (error) {
    // 忽略错误
  }

  // 清理可能存在的定时器
  const timers = Object.keys(global);
  timers.forEach(key => {
    if (key.startsWith('_timer')) {
      clearTimeout(global[key]);
      clearInterval(global[key]);
    }
  });

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
});

// 自定义匹配器
expect.extend({
  toBeValidUserId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_USER_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test user ID`,
    };
  },
  toBeValidPlantId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_PLANT_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test plant ID`,
    };
  },
  toBeValidSessionId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_SESSION_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test session ID`,
    };
  },
});
