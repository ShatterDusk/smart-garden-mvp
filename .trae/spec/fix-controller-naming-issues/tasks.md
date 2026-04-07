# 控制器命名问题修复任务列表

> **创建日期**: 2026-04-01
> **版本**: V1.0
> **关联规格**: [spec.md](./spec.md)

---

## 任务概览

| 任务ID | 任务名称 | 优先级 | 状态 | 依赖 |
|:---|:---|:---:|:---:|:---:|
| T1 | 修复 sessionController.js Plant 字段引用 | P0 | 待开始 | - |
| T2 | 修复 sessionController.js EnvironmentReadingValue 字段引用 | P0 | 待开始 | - |
| T3 | 修复 aiController.js Plant 字段引用 | P0 | 待开始 | T1 |
| T4 | 修复 careRecordController.js updatedAt 字段引用 | P1 | 待开始 | - |
| T5 | 语法检查验证 | P1 | 待开始 | T1-T4 |
| T6 | 更新项目文档 | P2 | 待开始 | T5 |

---

## 详细任务

### T1: 修复 sessionController.js Plant 字段引用

**优先级**: P0 (严重)
**预计耗时**: 10分钟
**文件**: `server/src/controllers/sessionController.js`

**修复内容**:
- 位置: `prepareContextForMessage` 函数，第 489-499 行
- 移除不存在的字段: `current_growth_stage`, `current_health_score`, `remark`
- 添加有效字段: `plant_category`, `location_code`

**修复前**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  growthStage: plant.current_growth_stage,
  healthScore: plant.current_health_score,
  location: plant.location_name,
  remark: plant.remark,
};
```

**修复后**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  plantCategory: plant.plant_category,
  locationName: plant.location_name,
  locationCode: plant.location_code,
};
```

---

### T2: 修复 sessionController.js EnvironmentReadingValue 字段引用

**优先级**: P0 (严重)
**预计耗时**: 15分钟
**文件**: `server/src/controllers/sessionController.js`

**修复内容**:
- 位置: `prepareContextForMessage` 函数，第 509-531 行
- 将 `metric_id` 改为 `metric_code`
- 更新 EnvironmentMetric 查询条件

**修复前**:
```javascript
const metricIds = readingValues.map(v => v.metric_id);
const metrics = metricIds.length > 0
  ? await EnvironmentMetric.findAll({
      where: { metric_id: metricIds },
      attributes: ['metric_id', 'metric_code', 'name', 'unit'],
    })
  : [];
const metricMap = new Map(metrics.map(m => [m.metric_id, m]));

context.environmentData = readingValues.map((v) => {
  const metric = metricMap.get(v.metric_id);
  return {
    metricCode: metric?.metric_code || '',
    metricName: metric?.name || '',
    value: v.value,
    unit: metric?.unit || '',
  };
});
```

**修复后**:
```javascript
const metricCodes = readingValues.map(v => v.metric_code);
const metrics = metricCodes.length > 0
  ? await EnvironmentMetric.findAll({
      where: { metric_code: metricCodes },
      attributes: ['metric_code', 'name', 'unit'],
    })
  : [];
const metricMap = new Map(metrics.map(m => [m.metric_code, m]));

context.environmentData = readingValues.map((v) => {
  const metric = metricMap.get(v.metric_code);
  return {
    metricCode: metric?.metric_code || '',
    metricName: metric?.name || '',
    value: v.value,
    unit: metric?.unit || '',
  };
});
```

---

### T3: 修复 aiController.js Plant 字段引用

**优先级**: P0 (严重)
**预计耗时**: 10分钟
**文件**: `server/src/controllers/aiController.js`
**依赖**: T1 (保持一致)

**修复内容**:
- 位置: `prepareContext` 函数，第 134-148 行
- 与 sessionController.js 保持一致的修复方案

**修复前**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  growthStage: plant.growth_stage,
  healthScore: plant.health_score,
  location: plant.location,
  remark: plant.remark,
};
```

**修复后**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  plantCategory: plant.plant_category,
  locationName: plant.location_name,
  locationCode: plant.location_code,
};
```

---

### T4: 修复 careRecordController.js updatedAt 字段引用

**优先级**: P1 (中等)
**预计耗时**: 5分钟
**文件**: `server/src/controllers/careRecordController.js`

**修复内容**:
- 位置: `updateCareRecord` 函数，第 152-161 行
- 移除 `updatedAt` 字段（CareRecord 模型不跟踪更新时间）

**修复前**:
```javascript
return success(res, {
  recordId: plain.record_id,
  plantId: plain.plant_id,
  actionType: plain.action_type,
  description: plain.description,
  images: plain.images,
  performedAt: plain.performed_at,
  updatedAt: plain.updated_at,  // 不存在
});
```

**修复后**:
```javascript
return success(res, {
  recordId: plain.record_id,
  plantId: plain.plant_id,
  actionType: plain.action_type,
  description: plain.description,
  images: plain.images,
  performedAt: plain.performed_at,
  createdAt: plain.created_at,
});
```

---

### T5: 语法检查验证

**优先级**: P1 (中等)
**预计耗时**: 5分钟
**依赖**: T1-T4

**执行命令**:
```bash
cd server
node -c src/controllers/sessionController.js
node -c src/controllers/aiController.js
node -c src/controllers/careRecordController.js
```

**验证标准**:
- 所有文件语法检查通过
- 无运行时错误

---

### T6: 更新项目文档

**优先级**: P2 (低)
**预计耗时**: 10分钟
**依赖**: T5

**更新内容**:
- 更新 `.trae/documents/project-architecture.md` 中的常见问题记录
- 记录本次修复的问题和解决方案

---

## 执行顺序

```
T1 ─────────────────────┐
                        │
T2 ─────────────────────┼──► T5 ──► T6
                        │
T3 ─────────────────────┤
                        │
T4 ─────────────────────┘
```

**建议执行顺序**: T1 → T2 → T3 → T4 → T5 → T6

---

## 回滚方案

如果修复后出现问题，可通过 Git 回滚：

```bash
git checkout -- server/src/controllers/sessionController.js
git checkout -- server/src/controllers/aiController.js
git checkout -- server/src/controllers/careRecordController.js
```
