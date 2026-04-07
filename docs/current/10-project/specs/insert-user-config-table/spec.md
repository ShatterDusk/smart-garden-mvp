# 插入 user_config 表到数据库设计文档 - 规格说明

## 目标
将 `user_config` 用户配置表插入到 `02-数据库设计.md` 文档中，确保所有相关位置都得到更新。

## 背景
user_config 表用于存储用户级别的个性化配置和偏好设置，采用 Key-Value 结构，支持灵活的数据扩展。

## 需要变更的位置清单

### 1. 表清单总览（第30-46行）
**位置**: `### 1.3 表清单总览` 表格中
**操作**: 在 care_records 之后添加 user_config 表
**内容**:
```markdown
|  13 | user_config                  | 用户配置表   | 用户偏好、设置、置顶等 | 10万+   |
```

### 2. E-R 关系说明（第195-214行）
**位置**: `### 2.2 关系说明` 表格末尾
**操作**: 添加 users 与 user_config 的关系
**内容**:
```markdown
| users                 | 1:N | user_config                  | 一个用户有多条配置    |
```

### 3. 表结构设计 - 插入 user_config 表
**位置**: 在 `### 3.1 users（用户表）` 之后插入新的 `### 3.2 user_config（用户配置表）`
**注意**: 后续所有表编号需要顺延（3.2→3.3, 3.3→3.4...）

**插入内容**: 完整的 user_config 表结构，包括：
- 表说明
- DDL
- 字段说明表格
- 索引设计表格
- 关联关系
- 配置项示例
- 命名规范
- 使用示例

### 4. users 表关联关系更新（第255-261行）
**位置**: `### 3.1 users` 的关联关系部分
**操作**: 添加指向 user_config 的关系
**内容**:
```markdown
- 1:N → user_config（一个用户多条配置）
```

### 5. 文档目录/导航（如有）
**检查**: 确认文档顶部是否有目录，如有需要添加 user_config 链接

## 插入的表结构内容

### 3.2 user_config（用户配置表）

**说明**：存储用户级别的个性化配置和偏好设置。采用 Key-Value 结构，config_value 使用 JSON 类型支持灵活的数据结构。用于管理用户偏好、功能开关、排序设置等非核心但个性化的数据。

**配置类型说明**：
- `preference`：用户偏好（主题、排序方式等）
- `setting`：功能设置（通知开关、提醒时间等）
- `data`：业务数据（置顶列表、上下文开关状态等）

#### DDL

```sql
CREATE TABLE user_config (
    config_id VARCHAR(64) PRIMARY KEY COMMENT '配置项唯一标识，UUID',
    user_id VARCHAR(64) NOT NULL COMMENT '所属用户ID',
    config_key VARCHAR(100) NOT NULL COMMENT '配置键名，如 plant_sort_order',
    config_value JSON NOT NULL COMMENT '配置值，JSON格式',
    config_type ENUM('preference', 'setting', 'data') DEFAULT 'preference' COMMENT '配置类型',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    UNIQUE KEY uk_user_key (user_id, config_key),
    INDEX idx_user_type (user_id, config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户配置表';
```

#### 字段说明

| 字段名 | 中文名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :---: | :-: | :--- | :--- |
| config_id | 配置ID | VARCHAR(64) | 是 | - | 主键，UUID |
| user_id | 用户ID | VARCHAR(64) | 是 | - | 外键，关联 users 表 |
| config_key | 配置键 | VARCHAR(100) | 是 | - | 配置项名称，如 plant_sort_order |
| config_value | 配置值 | JSON | 是 | - | JSON格式，存储具体配置内容 |
| config_type | 配置类型 | ENUM | 否 | preference | preference/setting/data |
| created_at | 创建时间 | DATETIME | 是 | CURRENT_TIMESTAMP | 记录创建时间 |
| updated_at | 更新时间 | DATETIME | 是 | CURRENT_TIMESTAMP | 最后更新时间 |

#### 索引设计

| 索引名 | 字段 | 类型 | 说明 |
| :--- | :--- | :-: | :--- |
| PRIMARY | config_id | 主键 | 唯一标识 |
| uk_user_key | user_id + config_key | 唯一 | 一个用户的同一配置唯一 |
| idx_user_type | user_id + config_type | 普通 | 按用户和类型查询 |

#### 关联关系

- N:1 → users（多个配置项属于一个用户）

#### 配置项示例

| config_key | config_type | config_value 示例 | 说明 |
| :--- | :--- | :--- | :--- |
| plant_sort_order | preference | `{"pinned": ["PLANT_001", "PLANT_003"], "sortBy": "time"}` | 植物列表排序偏好 |
| notification_settings | setting | `{"diagnosis": true, "care": true, "alert": true, "time": "09:00"}` | 通知设置 |
| context_switches | data | `{"plant_001": {"env": true, "care": false, "diagnosis": true}}` | 会话上下文开关状态 |
| ui_preferences | preference | `{"theme": "light", "fontSize": "medium"}` | UI偏好设置 |
| feature_flags | setting | `{"expert_mode": false, "beta_features": true}` | 功能开关 |

#### 命名规范

- **preference 类型**：使用 `xxx_preference` 或 `xxx_order` 后缀
- **setting 类型**：使用 `xxx_settings` 或 `xxx_config` 后缀
- **data 类型**：使用 `xxx_switches` 或 `xxx_state` 后缀
- **键名风格**：snake_case，小写字母+下划线

#### 使用示例

```sql
-- 查询用户的植物排序配置
SELECT config_value FROM user_config 
WHERE user_id = 'USER_001' AND config_key = 'plant_sort_order';

-- 更新通知设置
INSERT INTO user_config (config_id, user_id, config_key, config_value, config_type)
VALUES ('CFG_001', 'USER_001', 'notification_settings', 
        '{"diagnosis": true, "care": true, "alert": true, "time": "09:00"}', 'setting')
ON DUPLICATE KEY UPDATE 
config_value = VALUES(config_value),
updated_at = CURRENT_TIMESTAMP;

-- 查询用户所有偏好设置
SELECT config_key, config_value FROM user_config 
WHERE user_id = 'USER_001' AND config_type = 'preference';
```

## 验收标准

- [ ] 表清单总览中添加了 user_config 条目
- [ ] E-R 关系说明中添加了 users → user_config 关系
- [ ] 表结构设计中插入了完整的 user_config 表（3.2节）
- [ ] 后续表编号已正确顺延（3.2→3.3, 3.3→3.4...）
- [ ] users 表的关联关系中添加了指向 user_config 的关系
- [ ] 文档格式与其他表保持一致
