---
id: "KNOW-2026-04-11-005"
type: "pattern"
category: "project-insights/patterns"
tags: ["sequelize", "json", "database", "nodejs", "pattern", "troubleshooting"]
created: "2026-04-11"
updated: "2026-04-11"
author: "AI"
status: "active"
---

# Sequelize JSON 字段更新模式

## 问题描述

在使用 Sequelize 的 JSON 字段时，直接修改对象属性不会触发变更检测，导致更新操作无效。

## 错误示例

```javascript
// ❌ 错误：直接修改对象属性
const readPositions = readPositionConfig.config_value || {};
readPositions[sessionId] = lastMessage.message_id;

// 更新操作不会生效，因为 Sequelize 检测不到变化
await readPositionConfig.update({ config_value: readPositions });
```

**现象**: 更新操作执行成功，但数据库中的数据没有变化。

## 根本原因

Sequelize 使用脏检查（dirty checking）来检测字段变化：
1. 读取数据时，Sequelize 记录字段的原始值
2. 调用 `update()` 时，对比当前值和原始值
3. 只有值发生变化时，才会生成 UPDATE SQL

对于 JSON 字段，直接修改对象属性不会改变对象的引用，Sequelize 认为值没有变化。

## 正确模式

### 模式1：创建新对象（推荐）

```javascript
// ✅ 正确：创建新对象确保变更检测
const readPositions = { ...(readPositionConfig.config_value || {}) };
readPositions[sessionId] = lastMessage.message_id;

// 新对象会触发变更检测
await readPositionConfig.update({ config_value: readPositions });
```

**原理**: 使用展开运算符 `...` 创建新对象，改变引用，Sequelize 检测到变化。

### 模式2：使用 set 方法

```javascript
// ✅ 正确：使用 set 方法标记字段变更
readPositionConfig.set('config_value', {
  ...readPositionConfig.config_value,
  [sessionId]: lastMessage.message_id
});

await readPositionConfig.save();
```

**原理**: `set()` 方法显式标记字段为已更改，强制 Sequelize 更新。

### 模式3：使用 changed 方法

```javascript
// ✅ 正确：手动标记字段为已更改
const readPositions = readPositionConfig.config_value || {};
readPositions[sessionId] = lastMessage.message_id;

readPositionConfig.config_value = readPositions;
readPositionConfig.changed('config_value', true);

await readPositionConfig.save();
```

**原理**: `changed()` 方法手动标记字段状态，绕过脏检查。

## 通用解决方案

### 封装工具函数

```javascript
/**
 * 安全更新 JSON 字段
 * @param {Model} instance - Sequelize 实例
 * @param {string} fieldName - JSON 字段名
 * @param {Function} updater - 更新函数 (currentValue) => newValue
 */
const updateJsonField = async (instance, fieldName, updater) => {
  const currentValue = instance.getDataValue(fieldName) || {};
  const newValue = updater({ ...currentValue });
  
  await instance.update({ [fieldName]: newValue });
};

// 使用示例
await updateJsonField(
  readPositionConfig,
  'config_value',
  (positions) => ({
    ...positions,
    [sessionId]: lastMessage.message_id
  })
);
```

### Model 层封装

```javascript
// models/UserConfig.js
class UserConfig extends Model {
  /**
   * 更新阅读位置
   * @param {string} sessionId - 会话ID
   * @param {string} messageId - 消息ID
   */
  async updateReadPosition(sessionId, messageId) {
    const positions = { ...this.config_value };
    positions[sessionId] = messageId;
    
    return this.update({ config_value: positions });
  }
}
```

## 最佳实践

### ✅ 推荐做法

1. **始终创建新对象** - 使用展开运算符 `...`
2. **封装更新逻辑** - 在 Model 层提供更新方法
3. **使用事务** - 并发更新时使用事务保证一致性

```javascript
// 使用事务保证并发安全
await sequelize.transaction(async (t) => {
  const config = await UserConfig.findOne({
    where: { user_id: userId, config_key: 'read_positions' },
    transaction: t,
    lock: t.LOCK.UPDATE  // 行级锁
  });
  
  const positions = { ...config.config_value };
  positions[sessionId] = messageId;
  
  await config.update({ config_value: positions }, { transaction: t });
});
```

### ❌ 避免做法

1. **直接修改对象属性** - 不会触发变更检测
2. **使用 JSON.stringify 对比** - 性能差且不必要
3. **强制更新所有字段** - 会覆盖其他字段的更改

```javascript
// ❌ 避免：强制更新所有字段
await instance.update({
  config_value: newValue,
  updated_at: new Date()
}, {
  fields: ['config_value', 'updated_at']  // 危险：可能覆盖其他更改
});
```

## 相关代码

- 使用场景: `backend/server/src/controllers/sessionController.js`
- Model定义: `backend/server/src/models/UserConfig.js`

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-11 | 初始创建，沉淀Sequelize JSON字段更新模式 |
