# 重构数据库设计文档结构 - 规格说明

## 问题分析

当前文档存在以下结构问题：

1. **表清单总览** - 包含了非实体表（environment_hourly_stats、environment_data）
2. **E-R 图** - 缺少 user_config 实体（已修复）
3. **第三章结构混乱**:
   - 3.11 environment_hourly_stats - 这是可选的预聚合表，不应在第三章
   - 3.13 environment_data - 这是视图，不应在第三章
   - 正确的实体表应该只到 3.11（user_config是3.2, care_records应该是3.11）

## 当前结构

```
3.1 users
3.2 user_config
3.3 plants
3.4 sessions
3.5 messages
3.6 diagnosis_cards
3.7 devices
3.8 environment_readings
3.9 environment_metrics
3.10 environment_reading_values
3.11 environment_hourly_stats ← 应该移到第八章
3.12 care_records
3.13 environment_data ← 应该移到第八章
```

## 目标结构

```
第三章 - 实体表（11个）:
3.1 users
3.2 user_config
3.3 plants
3.4 sessions
3.5 messages
3.6 diagnosis_cards
3.7 devices
3.8 environment_readings
3.9 environment_metrics
3.10 environment_reading_values
3.11 care_records

第八章 - 辅助表/视图:
8.1 environment_hourly_stats（预聚合表）
8.2 environment_data（视图）
```

## 需要执行的操作

### 操作1: 修正第三章编号
- 3.10 environment_reading_values → 保持
- 3.11 environment_hourly_stats → 删除（移到第八章）
- 3.12 care_records → 改为 3.11
- 3.13 environment_data → 删除（移到第八章）

### 操作2: 在第八章插入辅助表
在"八、待确认问题"之前插入：

```markdown
### 8.1 environment_hourly_stats（环境小时统计表）【可选】

[原3.11的完整内容]

***

### 8.2 environment_data（环境数据视图）

[原3.13的完整内容]
```

### 操作3: 更新表清单总览
已修复：移除了 environment_hourly_stats 和 environment_data，添加了说明

### 操作4: 更新E-R图
已修复：添加了 user_config

## 验收标准

- [ ] 第三章只包含11个实体表（3.1-3.11）
- [ ] 第八章包含2个辅助表/视图（8.1-8.2）
- [ ] 表清单总览正确（11个实体表+2个辅助说明）
- [ ] E-R图包含所有实体（包括user_config）
- [ ] 文档结构清晰合理
