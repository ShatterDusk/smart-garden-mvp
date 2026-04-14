# 修复记录: API 清理 - 删除 getMessages 别名

## 问题信息
- **编号**: API-CLEANUP-002
- **来源**: API 规范化改进方案 - 继续吐槽阶段
- **严重程度**: 🟠 P1
- **问题类型**: 代码规范

---

## 问题分析

### 问题定位
- **文件位置**: 
  - `frontend/utils/api.js` 第561行
  - `frontend/pages/qna/qna.js` 第121行
- **问题描述**: 
  - `api.js` 中导出了 `getMessages` 作为 `getSessionMessages` 的别名
  - 注释说明是"兼容旧代码"，但没有明确哪些旧代码在使用
  - 这种别名会造成维护混乱，增加代码复杂度

### 根因分析
- **根本原因**: 早期开发时函数命名不统一，后来为了兼容保留了别名
- **影响范围**: 
  - 增加代码维护成本
  - 开发者不确定应该使用哪个函数
  - 可能造成混淆

### 修复风险评估
- **风险等级**: 低
- **可能影响**: 需要更新使用别名的页面
- **回滚方案**: 恢复别名导出

---

## 修复方案

### 方案概述
1. 查找所有使用 `getMessages` 的地方
2. 更新为使用 `getSessionMessages`
3. 删除别名导出

### 代码变更

#### 1. 更新 qna.js
```javascript
// 修复前
api.getMessages(sessionId).then(function(result) { ... }

// 修复后
api.getSessionMessages(sessionId).then(function(result) { ... }
```

#### 2. 删除别名导出 (api.js)
```javascript
// 修复前
getSessionMessages: getSessionMessages,
getMessages: getSessionMessages,  // 别名，兼容旧代码

// 修复后
getSessionMessages: getSessionMessages,
```

---

## 修复执行

- **修复人**: AI Assistant
- **修复时间**: 2026-04-11
- **修改文件**:
  - `frontend/utils/api.js` - 删除 `getMessages` 别名导出
  - `frontend/pages/qna/qna.js` - 更新为使用 `getSessionMessages`

---

## 验证结果

### 功能测试

| 测试项 | 预期结果 | 实际结果 | 状态 |
|:---|:---|:---|:---:|
| api.js 编译 | 无语法错误 | 通过 | ✅ |
| qna.js 编译 | 无语法错误 | 通过 | ✅ |
| 全局搜索 getMessages | 无其他引用 | 通过 | ✅ |

### 代码审查检查清单

- [x] 代码符合项目规范
- [x] 已删除别名导出
- [x] 已更新所有引用
- [x] 无功能破坏

---

## 状态更新

- **当前状态**: ✅ 已修复
- **更新时间**: 2026-04-11

---

## 备注

- 全局搜索确认只有 `qna.js` 使用了 `getMessages` 别名
- 已统一使用 `getSessionMessages`，命名更清晰
- 建议后续避免使用别名，统一函数命名

---

**创建时间**: 2026-04-11  
**最后更新**: 2026-04-11
