---
id: "KNOW-2026-04-11-006"
type: "pattern"
category: "project-insights/patterns"
tags: ["unread-message", "notification", "user-config", "json", "wechat-miniprogram", "pattern"]
created: "2026-04-11"
updated: "2026-04-11"
author: "AI"
status: "active"
---

# 未读消息红点提示模式

## 摘要

使用 user_config JSON 存储方案实现会话未读消息红点提示，无需数据库表变更，支持多会话独立追踪。

## 业务场景

- 用户打开小程序，进入会话列表
- 有未读消息的会话显示红点
- 用户点击进入会话后，红点消失
- 新消息到达时，对应会话显示红点

## 核心设计

### 数据模型

```javascript
// user_config 表存储阅读位置
{
  "config_key": "read_positions",
  "config_value": {
    "session_001": "MSG_123456",  // 最后读到的消息ID
    "session_002": "MSG_789012",
    "session_003": "MSG_345678"
  }
}
```

**设计优势**:
- ✅ 零数据库变更（复用 user_config 表）
- ✅ 支持多会话独立追踪
- ✅ 可扩展其他阅读相关配置
- ✅ 用户级别隔离

### 判断逻辑

```javascript
/**
 * 判断会话是否有未读消息
 * @param {string} sessionId - 会话ID
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否有未读
 */
async function hasUnreadMessages(sessionId, userId) {
  // 1. 获取会话的最后一条消息ID
  const lastMessage = await Message.findOne({
    where: { session_id: sessionId },
    order: [['created_at', 'DESC']],
    attributes: ['message_id']
  });
  
  if (!lastMessage) return false;
  
  // 2. 获取用户最后阅读的消息ID
  const readPositions = await getUserConfig(userId, 'read_positions') || {};
  const lastReadMessageId = readPositions[sessionId];
  
  // 3. 对比判断是否已读
  return lastMessage.message_id !== lastReadMessageId;
}
```

## 实现方案

### 后端实现

#### 1. 会话列表接口增强

```javascript
// controllers/sessionController.js
async function getSessionList(req, res, next) {
  try {
    const { userId } = req.user;
    
    // 获取会话列表
    const sessions = await Session.findAll({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']]
    });
    
    // 获取用户阅读位置
    const readPositions = await getUserConfig(userId, 'read_positions') || {};
    
    // 为每个会话添加未读状态
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session) => {
        const lastMessage = await Message.findOne({
          where: { session_id: session.session_id },
          order: [['created_at', 'DESC']],
          attributes: ['message_id']
        });
        
        const hasUnread = lastMessage &&
          lastMessage.message_id !== readPositions[session.session_id];
        
        return {
          ...session.toJSON(),
          hasUnread
        };
      })
    );
    
    res.success({ sessions: sessionsWithUnread });
  } catch (error) {
    next(error);
  }
}
```

#### 2. 标记已读接口

```javascript
/**
 * 更新会话阅读位置
 * POST /api/sessions/:id/read
 */
async function updateReadPosition(req, res, next) {
  try {
    const { id: sessionId } = req.params;
    const { userId } = req.user;
    
    // 获取会话最后一条消息
    const lastMessage = await Message.findOne({
      where: { session_id: sessionId },
      order: [['created_at', 'DESC']],
      attributes: ['message_id']
    });
    
    if (!lastMessage) {
      return res.success({ message: '无消息可标记' });
    }
    
    // 更新阅读位置（注意：创建新对象确保Sequelize检测到变化）
    const readPositions = await getUserConfig(userId, 'read_positions') || {};
    const newPositions = { ...readPositions };
    newPositions[sessionId] = lastMessage.message_id;
    
    await setUserConfig(userId, 'read_positions', newPositions);
    
    res.success({ message: '已标记为已读' });
  } catch (error) {
    next(error);
  }
}
```

### 前端实现

#### 1. 会话列表页面

```javascript
// pages/sessions/sessions.js
Page({
  data: {
    sessions: []
  },
  
  async loadSessions() {
    try {
      const res = await api.getSessionList();
      const sessions = res.data.map(session => ({
        ...session,
        showUnreadDot: session.hasUnread
      }));
      
      this.setData({ sessions });
    } catch (error) {
      console.error('加载会话列表失败', error);
    }
  }
});
```

#### 2. 会话列表 UI

```xml
<!-- pages/sessions/sessions.wxml -->
<view class="session-list">
  <view 
    class="session-item" 
    wx:for="{{sessions}}" 
    wx:key="session_id"
    data-id="{{item.session_id}}"
    bindtap="enterSession"
  >
    <view class="session-info">
      <text class="session-title">{{item.title}}</text>
      <text class="session-preview">{{item.last_message}}</text>
    </view>
    
    <view class="session-meta">
      <text class="session-time">{{item.last_message_time}}</text>
      <!-- 未读红点 -->
      <view wx:if="{{item.showUnreadDot}}" class="unread-dot"></view>
    </view>
  </view>
</view>
```

```css
/* pages/sessions/sessions.wxss */
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.session-meta {
  display: flex;
  align-items: center;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #ff4d4f;
  border-radius: 50%;
  margin-left: 8px;
}
```

#### 3. 进入会话时标记已读

```javascript
// pages/qna/qna.js
Page({
  async onLoad(options) {
    const { sessionId } = options;
    this.setData({ sessionId });
    
    // 加载消息
    await this.loadMessages();
    
    // 标记会话为已读
    try {
      await api.markSessionAsRead(sessionId);
    } catch (error) {
      console.error('标记已读失败', error);
    }
  }
});
```

## 性能优化

### 1. 数据库查询优化

```javascript
// 使用子查询优化最后消息获取
const sessionsWithLastMessage = await Session.findAll({
  where: { user_id: userId },
  include: [{
    model: Message,
    as: 'lastMessage',
    where: {
      created_at: {
        [Op.eq]: sequelize.literal(`(
          SELECT MAX(created_at) 
          FROM messages 
          WHERE messages.session_id = sessions.session_id
        )`)
      }
    },
    required: false
  }],
  order: [['updated_at', 'DESC']]
});
```

### 2. 缓存优化

```javascript
// 使用内存缓存减少数据库查询
const readPositionsCache = new Map();

async function getReadPositionsWithCache(userId) {
  const cacheKey = `read_positions:${userId}`;
  
  if (readPositionsCache.has(cacheKey)) {
    return readPositionsCache.get(cacheKey);
  }
  
  const positions = await getUserConfig(userId, 'read_positions') || {};
  readPositionsCache.set(cacheKey, positions);
  
  // 5分钟后过期
  setTimeout(() => {
    readPositionsCache.delete(cacheKey);
  }, 5 * 60 * 1000);
  
  return positions;
}
```

## 注意事项

### ✅ 推荐做法

1. **AI 会话只需要红点提示** - 不需要精确未读计数
2. **用户进入会话时更新 `read_positions`** - 确保及时清除红点
3. **新消息到达时对比最后阅读位置** - 判断是否显示红点
4. **使用事务保证并发安全** - 避免更新丢失

### ❌ 避免做法

1. **不要存储未读计数** - 增加复杂性，不需要精确计数
2. **不要实时推送红点状态** - 轮询或进入页面时检查即可
3. **不要删除历史阅读位置** - 保留历史数据用于其他功能

## 扩展应用

此模式可应用于其他场景：
- **文章阅读进度** - 记录用户阅读到文章的哪个位置
- **通知已读状态** - 追踪用户已读的通知ID列表
- **功能引导状态** - 记录用户是否看过某个功能引导

## 相关代码

- 后端控制器: `backend/server/src/controllers/sessionController.js`
- 前端页面: `frontend/pages/sessions/sessions.js`
- API封装: `frontend/utils/api.js`

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-11 | 初始创建，沉淀未读消息红点提示模式 |
