# 插入 user_config 表 - 任务清单

## Task 1: 更新表清单总览
**状态**: pending
**优先级**: P0

- [ ] 在 `### 1.3 表清单总览` 表格中添加 user_config 条目
- [ ] 序号调整为 13（在 care_records 之后）
- [ ] 内容：`|  13 | user_config | 用户配置表 | 用户偏好、设置、置顶等 | 10万+ |`

## Task 2: 更新 E-R 关系说明
**状态**: pending
**优先级**: P0

- [ ] 在 `### 2.2 关系说明` 表格末尾添加关系行
- [ ] 内容：`| users | 1:N | user_config | 一个用户有多条配置 |`

## Task 3: 插入 user_config 表结构
**状态**: pending
**优先级**: P0

- [ ] 在 `### 3.1 users` 之后插入 `### 3.2 user_config`
- [ ] 包含完整的表结构内容（说明、DDL、字段、索引、关联、示例）

## Task 4: 顺延后续表编号
**状态**: pending
**优先级**: P0

- [ ] 3.2 plants → 3.3
- [ ] 3.3 sessions → 3.4
- [ ] 3.4 messages → 3.5
- [ ] 3.5 diagnosis_cards → 3.6
- [ ] 3.6 devices → 3.7
- [ ] 3.7 environment_readings → 3.8
- [ ] 3.8 environment_metrics → 3.9
- [ ] 3.9 environment_reading_values → 3.10
- [ ] 3.10 environment_hourly_stats → 3.11
- [ ] 3.11 care_records → 3.12
- [ ] 3.12 environment_data → 3.13

## Task 5: 更新 users 表关联关系
**状态**: pending
**优先级**: P0

- [ ] 在 `### 3.1 users` 的关联关系部分添加
- [ ] 内容：`- 1:N → user_config（一个用户多条配置）`

## Task 6: 验证检查
**状态**: pending
**优先级**: P1

- [ ] 检查所有表编号连续无重复
- [ ] 检查文档格式一致性
- [ ] 检查分割线（***）完整性
- [ ] 验证所有链接/锚点（如有）
