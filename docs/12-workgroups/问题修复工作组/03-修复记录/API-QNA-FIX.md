# 修复记录: API 和 QnA 页面优化

## 问题信息
- **编号**: API-QNA-FIX
- **来源**: 继续吐槽阶段发现的问题
- **严重程度**: 🟠 P1
- **问题类型**: 代码规范/性能优化

---

## 问题分析

### 问题定位

#### 1. ES6 对象简写语法
- **文件位置**: `frontend/utils/api.js:589`
- **问题**: `{ fileId }` 是 ES6 简写，ES5 不支持

#### 2. cosUpload 动态引入问题
- **文件位置**: `frontend/utils/api.js:575`
- **问题**: 每次调用都重新 require，性能差

#### 3. 图片上传扩展名处理
- **文件位置**: `frontend/utils/api.js:576-580`
- **问题**: 强制使用 'image/jpeg'，不支持 PNG/GIF/WebP

#### 4. 轮询魔法数字
- **文件位置**: `frontend/pages/qna/qna.js:319, 356`
- **问题**: 3000ms、2000ms、30 次等魔法数字

#### 5. 轮询无限循环风险
- **文件位置**: `frontend/pages/qna/qna.js:348-352`
- **问题**: 出错后继续轮询，可能无限循环

#### 6. 轮询无用户反馈
- **文件位置**: `frontend/pages/qna/qna.js:323-326`
- **问题**: 超时或错误只打日志，用户看不到

---

## 修复方案

### 1. ES5 兼容修复
```javascript
// 修复前
{ fileId }

// 修复后
{ fileId: fileId }
```

### 2. cosUpload 延迟加载
```javascript
// 文件顶部定义
var cosUpload = null;

// 函数内使用
if (!cosUpload) {
  cosUpload = require('./cos-upload.js');
}
```

### 3. 智能识别图片类型
```javascript
var extMatch = fileName.match(/\.([^.]+)$/);
var ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

var contentType = 'image/jpeg';
if (ext === 'png') {
  contentType = 'image/png';
} else if (ext === 'gif') {
  contentType = 'image/gif';
} else if (ext === 'webp') {
  contentType = 'image/webp';
}
```

### 4. 轮询配置常量
```javascript
POLLING_CONFIG: {
  FIRST_DELAY: 3000,
  INTERVAL: 2000,
  MAX_POLLS: 30,
  MAX_ERRORS: 3
}
```

### 5. 错误处理和用户反馈
```javascript
// 增加错误计数
errorCount++;

// 超过最大错误次数停止轮询
if (errorCount >= config.MAX_ERRORS) {
  that.updateMessageStatus('error');
  return;
}

// 更新UI提示用户
updateMessageStatus: function(status) {
  // 更新消息为错误状态
}
```

---

## 修复执行

- **修复人**: AI Assistant
- **修复时间**: 2026-04-11
- **修改文件**:
  - `frontend/utils/api.js`
  - `frontend/pages/qna/qna.js`

---

## 优化统计

| 优化项 | 数量 | 说明 |
|:---|:---:|:---|
| ES6 语法修复 | 1处 | 对象简写改为 ES5 格式 |
| 模块加载优化 | 1处 | cosUpload 延迟加载 |
| 图片类型支持 | 4种 | jpeg/png/gif/webp |
| 魔法数字提取 | 4个 | 轮询配置常量 |
| 错误处理增强 | 2处 | 错误计数和UI反馈 |

---

## 验证结果

### 功能测试

| 测试项 | 预期结果 | 实际结果 | 状态 |
|:---|:---|:---|:---:|
| ES5 语法 | 无简写语法 | 通过 | ✅ |
| 模块加载 | 只加载一次 | 通过 | ✅ |
| PNG 上传 | 识别为 image/png | 通过 | ✅ |
| 轮询超时 | 30次后停止 | 通过 | ✅ |
| 错误处理 | 3次错误后停止 | 通过 | ✅ |
| UI 反馈 | 显示错误消息 | 通过 | ✅ |

---

## 状态更新

- **当前状态**: ✅ 已修复
- **更新时间**: 2026-04-11

---

## 后续建议

1. 考虑添加更多图片格式支持（bmp, svg 等）
2. 轮询可以改为 WebSocket 长连接
3. 添加重试按钮让用户手动刷新

---

**创建时间**: 2026-04-11  
**最后更新**: 2026-04-11
