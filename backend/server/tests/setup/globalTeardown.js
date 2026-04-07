require('dotenv').config({ path: '.env.test' });

const { sequelize } = require('../../src/models');

module.exports = async () => {
  try {
    await sequelize.drop();
    console.log('测试数据库清理完成');
    
    await sequelize.close();
    console.log('测试数据库连接关闭');
  } catch (error) {
    console.error('测试数据库清理失败:', error.message);
  }
};
