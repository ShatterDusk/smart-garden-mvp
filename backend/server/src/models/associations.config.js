/**
 * 模型关联配置常量
 * 与数据库外键约束保持一致
 */

const AssociationConfig = {
  // 级联删除 - 删除父表时自动删除子表
  CASCADE: { onDelete: 'CASCADE', onUpdate: 'CASCADE' },

  // 置空 - 删除父表时将外键设为 NULL
  SET_NULL: { onDelete: 'SET NULL', onUpdate: 'CASCADE' },

  // 限制 - 有子表关联时禁止删除父表
  RESTRICT: { onDelete: 'RESTRICT', onUpdate: 'CASCADE' },

  // 无操作 - 不处理（可能产生野数据）
  NO_ACTION: { onDelete: 'NO ACTION', onUpdate: 'CASCADE' },
}

module.exports = AssociationConfig
