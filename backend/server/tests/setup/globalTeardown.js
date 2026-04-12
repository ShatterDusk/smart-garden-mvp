module.exports = async () => {
  try {
    // 延迟一点确保所有测试资源已释放
    await new Promise(resolve => setTimeout(resolve, 100));

    const { sequelize } = require('../../src/models');
    
    if (sequelize) {
      // 先删除数据库
      try {
        await sequelize.drop();
        console.log('[Global Teardown] 测试数据库清理完成');
      } catch (error) {
        console.log('[Global Teardown] 数据库清理跳过:', error.message);
      }
      
      // 关闭连接
      await sequelize.close();
      console.log('[Global Teardown] 测试数据库连接关闭');
    }

    // 清理所有可能的定时器
    const intervals = Object.keys(global).filter(key => 
      key.startsWith('_idle') || key.startsWith('_timer')
    );
    intervals.forEach(key => {
      try {
        clearTimeout(global[key]);
        clearInterval(global[key]);
      } catch (e) {
        // 忽略
      }
    });

    // 给进程一点时间完成清理
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error('[Global Teardown] 清理失败:', error.message);
  }
};
