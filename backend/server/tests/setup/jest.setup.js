jest.setTimeout(30000);

// 在所有测试之前执行
beforeAll(async () => {
  // 可以在这里添加全局初始化
});

// 在所有测试之后执行 - 清理资源
afterAll(async () => {
  // 等待所有异步 AI 任务完成
  // AI 服务有 60 秒超时，我们等待 65 秒确保所有请求都已完成或超时
  try {
    const asyncAiService = require('../../src/services/asyncAiService');
    if (asyncAiService.waitForAllTasks) {
      console.log('[Jest Teardown] 等待异步 AI 任务完成（最多 65 秒）...');
      await asyncAiService.waitForAllTasks(65000);
      const pendingCount = asyncAiService.getPendingTasksCount ? asyncAiService.getPendingTasksCount() : 0;
      if (pendingCount > 0) {
        console.log(`[Jest Teardown] 警告: 仍有 ${pendingCount} 个异步 AI 任务未完成`);
      } else {
        console.log('[Jest Teardown] 所有异步 AI 任务已完成');
      }
    }
  } catch (error) {
    // 忽略错误
  }

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

  // 强制退出进程，避免挂起的 HTTP 请求阻止 Jest 退出
  // 延迟 100ms 确保日志输出完成
  setTimeout(() => {
    process.exit(0);
  }, 100);
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
