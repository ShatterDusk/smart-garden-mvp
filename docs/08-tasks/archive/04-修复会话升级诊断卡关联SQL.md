# 修复会话升级诊断卡关联 SQL

## 元信息
- **状态**: ✅ 已完成
- **优先级**: P1
- **提出时间**: 2026-04-02
- **完成时间**: 2026-04-04
- **预计工时**: 1 小时
- **涉及模块**: 后端

---

## 问题描述

`sessionController.js` 中的 `upgradeSession` 函数，在关联诊断卡到植物时使用了错误的 SQL 语法。

### 问题代码

**文件**: `server/src/controllers/sessionController.js` 第 664-667 行

```javascript
// 关联诊断卡到植物
await DiagnosisCard.update(
  { plant_id: plantId },
  { where: { message_id: { in: sequelize.literal(`(SELECT message_id FROM messages WHERE session_id = '${sessionId}')`) } } }
);
```

### 问题分析

1. **语法错误**: Sequelize 的 `where` 条件中使用 `in` 应该是 `[Op.in]`，而不是 `in`
2. **SQL 注入风险**: 直接拼接 `sessionId` 到 SQL 字符串中
3. **更好的方案**: 使用子查询或先查询再更新

---

## 解决方案

### 方案1：使用 Op.in 和子查询（推荐）

```javascript
const { Op } = require('sequelize');

// 先查询会话中的所有消息ID
const messages = await Message.findAll({
  where: { session_id: sessionId },
  attributes: ['message_id'],
});

const messageIds = messages.map(m => m.message_id);

// 关联诊断卡到植物
if (messageIds.length > 0) {
  await DiagnosisCard.update(
    { plant_id: plantId },
    { where: { message_id: { [Op.in]: messageIds } } }
  );
}
```

### 方案2：使用 include 和关联查询

```javascript
// 关联诊断卡到植物 - 通过消息关联
await DiagnosisCard.update(
  { plant_id: plantId },
  {
    where: {
      message_id: {
        [Op.in]: Sequelize.literal(`(SELECT message_id FROM messages WHERE session_id = ${Sequelize.escape(sessionId)})`)
      }
    }
  }
);
```

---

## 完整修复代码

**文件**: `server/src/controllers/sessionController.js`

```javascript
/**
 * 升级会话
 * POST /api/sessions/:sessionId/upgrade
 */
const upgradeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { plantId } = req.body;
    const userId = req.user.userId;

    const session = await Session.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (!session) {
      return error(res, '会话不存在', 404, 404);
    }

    if (session.type === 'plant') {
      return error(res, '已经是植物会话，无需升级', 400);
    }

    // 验证植物存在
    const plant = await Plant.findOne({
      where: { plant_id: plantId, user_id: userId },
    });

    if (!plant) {
      return error(res, '植物不存在', 404, 404);
    }

    // 更新会话
    await session.update({
      type: 'plant',
      plant_id: plantId,
      title: `${plant.nickname} - 植物会话`,
    });

    // 关联诊断卡到植物
    const messages = await Message.findAll({
      where: { session_id: sessionId },
      attributes: ['message_id'],
    });

    const messageIds = messages.map(m => m.message_id);

    if (messageIds.length > 0) {
      await DiagnosisCard.update(
        { plant_id: plantId },
        { where: { message_id: { [Op.in]: messageIds } } }
      );
    }

    const plain = session.get({ plain: true });
    return success(res, {
      sessionId: plain.session_id,
      type: plain.type,
      plantId: plain.plant_id,
      title: plain.title,
      status: plain.status,
      contextConfig: plain.context_config,
      upgradedAt: plain.updated_at,
    });
  } catch (err) {
    console.error('升级会话失败:', err);
    return error(res, '升级会话失败', 500);
  }
};
```

---

## 需要修改的文件

| 文件 | 修改内容 |
|:---|:---|
| `server/src/controllers/sessionController.js` | 修复 upgradeSession 函数中的诊断卡关联 SQL |

---

## 测试验证

1. 创建一个咨询会话
2. 在会话中发送图片，生成诊断卡
3. 调用升级 API：`POST /api/sessions/:sessionId/upgrade`
4. 验证诊断卡的 `plant_id` 字段是否已更新

```sql
-- 验证诊断卡是否关联到植物
SELECT dc.diagnosis_card_id, dc.plant_id, dc.message_id
FROM diagnosis_cards dc
JOIN messages m ON dc.message_id = m.message_id
WHERE m.session_id = 'SESSION_xxx';
```

---

## 更新记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-04-02 | v1.0 | 创建 TODO，记录会话升级 SQL 问题及修复方案 |

