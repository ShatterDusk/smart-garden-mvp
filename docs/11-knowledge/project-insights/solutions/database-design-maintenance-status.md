---
id: "KNOW-2026-04-18-005"
type: "solution"
category: "project-insights/solutions"
tags: ["database", "maintenance", "documentation", "consistency", "technical-debt"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# 数据库设计文档维护状态报告

> 本文档记录数据库设计文档与实际代码的一致性状态，以及维护计划。

---

## 一、当前状态概览

### 1.1 文档与代码对比

| 项目 | 文档记录 | 实际代码 | 状态 |
|:---|:---|:---|:---:|
| **核心表数量** | 12 个 | 14 个 | ❌ 不一致 |
| **日志表** | 未记录 | SystemLog, ClientLog | ❌ 缺失 |
| **ER 图** | 有简化版 | 未生成完整图 | ⚠️ 待完善 |
| **详细字段定义** | 部分表有 | 需要补充 | ⚠️ 待完善 |
| **关联关系** | 有文字描述 | 代码中完整定义 | ✅ 一致 |

### 1.2 表清单对比

**文档记录的表 (12个)**:
1. users ✅
2. plants ✅
3. sessions ✅
4. messages ✅
5. diagnosis_cards ✅
6. devices ✅
7. environment_readings ✅
8. environment_reading_values ✅
9. environment_metrics ✅
10. reading_tasks ✅
11. care_records ✅
12. user_config ✅

**实际代码中的表 (14个)**:
1. users ✅
2. plants ✅
3. sessions ✅
4. messages ✅
5. diagnosis_cards ✅
6. devices ✅
7. environment_readings ✅
8. environment_reading_values ✅
9. environment_metrics ✅
10. reading_tasks ✅
11. care_records ✅
12. user_config ✅
13. **system_logs** ❌ 文档缺失
14. **client_logs** ❌ 文档缺失

**结论**: 文档缺少 2 个日志表的说明。

---

## 二、缺失内容清单

### 2.1 缺失的表文档

#### system_logs (系统日志表)

**用途**: 存储后端系统日志

**关键字段**:
- `id` (PK) - 自增ID
- `level` - 日志级别 (debug/info/warn/error/fatal)
- `message` - 日志消息
- `source` - 日志来源模块
- `request_id` - 请求追踪ID
- `error_stack` - 错误堆栈
- `metadata` - 元数据 (JSON)
- `created_at` - 创建时间

**用途**: 生产环境问题排查、系统监控

#### client_logs (客户端日志表)

**用途**: 存储微信小程序前端日志

**关键字段**:
- `id` (PK) - 自增ID
- `user_id` (FK) - 关联用户
- `session_id` - 会话ID
- `level` - 日志级别
- `message` - 日志消息
- `page_path` - 页面路径
- `action` - 用户操作
- `device_info` - 设备信息 (JSON)
- `metadata` - 额外数据 (JSON)
- `created_at` - 创建时间

**用途**: 前端问题排查、用户行为分析

### 2.2 需要完善的文档

| 表名 | 缺失内容 | 优先级 |
|:---|:---|:---:|
| users | 完整字段列表、索引定义 | 高 |
| plants | 完整字段列表、索引定义 | 高 |
| sessions | 完整字段列表、context_config 结构 | 中 |
| messages | content_type 枚举值、image_urls 结构 | 中 |
| environment_readings | data_source 枚举值说明 | 中 |
| system_logs | 整表缺失 | 高 |
| client_logs | 整表缺失 | 高 |

### 2.3 需要更新的关联关系

**文档中已定义的关联**:
- User → Plant, Session, Device, CareRecord, UserConfig
- Plant → DiagnosisCard, EnvironmentReading, CareRecord, Session, ReadingTask, Device
- Session → Message
- Message → Message (回复), DiagnosisCard
- EnvironmentReading → EnvironmentReadingValue
- EnvironmentMetric → EnvironmentReadingValue

**需要补充的关联**:
- 日志表通常不建立外键关联（避免影响核心业务性能）

---

## 三、维护计划

### 3.1 短期任务（本周）

- [ ] **补充日志表文档**
  - 添加 system_logs 表说明
  - 添加 client_logs 表说明
  - 更新数据库概览文档

- [ ] **更新表数量统计**
  - 文档中表数量从 12 改为 14
  - 更新数据量预估

### 3.2 中期任务（本月）

- [ ] **生成完整 ER 图**
  - 使用工具生成可视化 ER 图
  - 包含所有 14 个表
  - 标注关联关系和级联规则

- [ ] **补充核心表字段定义**
  - users 表完整字段
  - plants 表完整字段
  - messages 表 content_type 枚举

- [ ] **建立文档更新流程**
  - 模型变更时同步更新文档
  - 代码审查检查数据库文档

### 3.3 长期任务（本季度）

- [ ] **数据库版本管理**
  - 创建初始迁移文件
  - 建立迁移文档规范
  - 数据库变更审查流程

- [ ] **数据库监控**
  - 表大小监控
  - 慢查询监控
  - 索引使用情况分析

---

## 四、文档更新建议

### 4.1 更新 database-schema-overview.md

```markdown
## 数据库表清单 (更新后)

| 序号 | 表名 | 中文名 | 说明 | 数据量预估 |
|:---:|:---|:---|:---|:---:|
| 1 | users | 用户表 | 微信授权登录 | 1万+ |
| 2 | plants | 植物档案表 | 核心实体 | 5万+ |
| ... | ... | ... | ... | ... |
| 13 | system_logs | 系统日志表 | 后端日志存储 | 100万+/月 |
| 14 | client_logs | 客户端日志表 | 前端日志存储 | 50万+/月 |
```

### 4.2 创建数据库变更检查清单

**代码审查时检查**:
- [ ] 模型变更是否同步更新文档
- [ ] 新增字段是否有默认值
- [ ] 新增索引是否合理
- [ ] 外键关联是否正确
- [ ] 是否影响现有数据

### 4.3 建立自动同步机制（可选）

**方案**: 使用 Sequelize 反射生成文档
```javascript
// 从模型自动生成文档脚本
const models = require('./models');
// 读取模型定义，生成 Markdown 文档
```

---

## 五、相关文档

- [数据库设计概览](../../domain-knowledge/technical/database-schema-overview.md) - 需要更新
- [项目技术全景](../../domain-knowledge/technical/project-technical-landscape.md)
- [代码注释规范](../best-practices/code-commenting-standards.md)

## 六、相关代码

- [models/](../../../../../../backend/server/src/models/) - 模型定义（实际代码）
- [associations.config.js](../../../../../../backend/server/src/models/associations.config.js) - 关联定义

## 七、变更记录

| 日期 | 变更内容 | 作者 |
|:---|:---|:---|
| 2026-04-18 | 初始创建 - 数据库文档维护状态评估 | AI |

---

## 八、备注

**为什么文档会落后于代码？**

1. **快速迭代** - 项目初期快速开发，文档滞后
2. **日志表后加** - system_logs 和 client_logs 是后期添加的监控功能
3. **缺乏检查机制** - 代码审查时没有检查数据库文档更新

**如何避免？**

1. 建立模型变更检查清单
2. 代码审查时强制检查文档
3. 定期