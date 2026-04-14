---
id: "KNOW-2026-04-09-003"
type: "technical"
category: "domain-knowledge/technical"
tags: ["database", "mysql", "sequelize", "schema", "architecture"]
created: "2026-04-09"
updated: "2026-04-09"
author: "AI"
status: "active"
---

# 项目数据库设计概览

## 摘要

智能园艺助手项目使用 MySQL 数据库，通过 Sequelize ORM 进行管理。共包含 12 张核心数据表，支持用户管理、植物档案、会话消息、设备管理、环境数据监测和养护记录等核心功能。

## 技术栈

- **数据库**: MySQL
- **ORM**: Sequelize
- **命名规范**: 数据库使用 snake_case，API 使用 camelCase（通过 namingConverter 自动转换）

## 数据库表清单

| 序号 | 表名 | 中文名 | 说明 | 数据量预估 |
|:---:|:---|:---|:---|:---:|
| 1 | `users` | 用户表 | 微信授权登录 | 1万+ |
| 2 | `plants` | 植物档案表 | 核心实体 | 5万+ |
| 3 | `sessions` | 会话表 | 咨询/植物会话 | 10万+ |
| 4 | `messages` | 消息表 | 完整对话存储 | 100万+ |
| 5 | `diagnosis_cards` | 诊断卡表 | 诊断结果结构化 | 20万+ |
| 6 | `devices` | 设备表 | 硬件设备管理 | 2万+ |
| 7 | `environment_readings` | 环境读数主表 | 统一存储设备+天气数据 | 1000万+ |
| 8 | `environment_reading_values` | 环境数值表 | 存储各指标具体数值 | 5000万+ |
| 9 | `environment_metrics` | 环境指标定义表 | 支持多来源动态指标配置 | 50条以内 |
| 10 | `reading_tasks` | 读数任务表 | 追踪数据采集状态 | 500万+ |
| 11 | `care_records` | 养护记录表 | 用户手动记录 | 10万+ |
| 12 | `user_config` | 用户配置表 | 用户偏好、设置、置顶等 | 10万+ |

## 核心 E-R 关系

```
users (1) ───< (N) plants
  │
  ├──< (N) sessions ───< (N) messages
  │              │
  │              └──< (N) diagnosis_cards
  │
  ├──< (N) devices
  │
  ├──< (N) care_records
  │
  └──< (N) user_config

plants (1) ───< (N) environment_readings ───< (N) environment_reading_values
  │                    │
  │                    └── 关联 environment_metrics
  │
  ├──< (N) reading_tasks
  │
  └──< (N) care_records
```

## 命名规范

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| 表名 | 小写，下划线分隔 | `diagnosis_cards` |
| 字段名 | 小写，下划线分隔 | `plant_category` |
| 主键 | 表名缩写_id | `plant_id` |
| 外键 | 引用表_id | `user_id` |
| 索引 | idx_字段名 | `idx_plant_created` |
| 状态字段 | status | `active`/`archived`/`deleted` |
| 时间字段 | xxx_at | `created_at`/`updated_at` |

## 核心表结构

### 1. users（用户表）
- `user_id` (PK): 用户唯一标识
- `wx_openid` (UK): 微信 OpenID
- `nickname`: 昵称
- `avatar_url`: 头像URL
- `role`: 角色（user/expert/admin）
- `status`: 状态
- `last_login_at`: 最后登录时间
- `created_at`/`updated_at`: 时间戳

### 2. plants（植物档案表）
- `plant_id` (PK): 植物唯一标识
- `user_id` (FK): 关联用户
- `nickname`: 植物昵称
- `plant_category`: 分类（多肉/花卉/绿植/蔬菜/其他）
- `species`: 品种
- `cover_image_url`: 封面图
- `current_device_id` (FK): 当前绑定设备
- `location_name`/`location_code`: 位置信息
- `location_lat`/`location_lng`: 经纬度

### 3. sessions（会话表）
- `session_id` (PK): 会话唯一标识
- `user_id` (FK): 关联用户
- `type`: 类型（consult/plant）
- `plant_id` (FK): 关联植物（可选）
- `title`: 会话标题
- `context_config`: 上下文配置（JSON）
- `status`: 状态

### 4. messages（消息表）
- `message_id` (PK): 消息唯一标识
- `session_id` (FK): 关联会话
- `role`: 角色（user/assistant）
- `content_type`: 内容类型
- `content`: 内容
- `image_urls`: 图片URL数组（JSON）
- `reply_to_message_id`: 回复消息ID

### 5. environment_readings（环境读数主表）
- `reading_id` (PK): 读数唯一标识
- `plant_id` (FK): 关联植物
- `data_source`: 数据来源（sensor/weather_api）
- `source_id`: 来源ID
- `recorded_at`: 记录时间
- `is_stale`: 是否过期/补偿数据

### 6. environment_reading_values（环境数值表）
- `value_id` (PK): 数值唯一标识
- `reading_id` (FK): 关联读数主表
- `metric_code` (FK): 关联指标定义
- `value`: 数值

### 7. environment_metrics（环境指标定义表）
- `metric_code` (PK): 指标代码
- `category`: 分类（soil/air/light/water）
- `name`: 名称
- `unit`: 单位
- `icon`: 图标
- `applicable_sources`: 适用来源（JSON）
- `min_value`/`max_value`: 正常范围

## 关键技术点

1. **命名转换**: 数据库字段使用 snake_case，API 响应使用 camelCase，通过 `namingConverter.js` 自动转换

2. **关联查询**: 使用 Sequelize `include` 进行关联查询，关联定义在 `models/associations.config.js`

3. **环境数据双源**: 支持传感器（sensor）和天气 API（weather_api）两种数据来源，通过 `data_source` 字段区分

4. **补偿机制**: 环境数据支持补偿机制，通过 `is_stale` 字段标记补偿数据

5. **软删除**: 部分表支持 `deleted_at` 字段实现软删除

## 相关文档

- [数据库设计完整文档](../../../02-architecture/数据库设计.md) - 详细的表结构和字段定义
- [API接口设计](../../../02-architecture/API接口设计.md) - 数据库操作接口
- [命名规范迁移指南](../../../03-frontend/guides/命名规范迁移指南.md) - 前后端命名转换规范

## 相关代码

- [models/](../../../../../../backend/server/src/models/) - Sequelize 模型定义
- [namingConverter.js](../../../../../../backend/server/src/utils/namingConverter.js) - 命名转换工具

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-09 | 初始创建 - 整理项目数据库设计概览 |
