# 控制器命名问题修复规格文档

> **创建日期**: 2026-04-01
> **版本**: V1.0
> **状态**: 待确认

---

## 一、背景与问题

### 1.1 问题概述

在后端控制器代码中发现多处字段引用错误，主要涉及：

1. **Plant 模型字段引用错误**：引用了模型中不存在的字段
2. **EnvironmentReadingValue 关联字段错误**：使用了错误的外键名称
3. **CareRecord 模型字段引用错误**：引用了不存在的 `updated_at` 字段

### 1.2 影响范围

| 问题 | 影响功能 | 严重程度 |
|:---|:---|:---|
| Plant 字段引用错误 | AI 分析上下文缺失 | 严重 |
| EnvironmentReadingValue 字段错误 | 环境数据查询失败 | 严重 |
| CareRecord updatedAt 引用错误 | API 响应异常 | 中等 |

---

## 二、修复目标

### 2.1 目标

1. 修复所有控制器中对不存在字段的引用
2. 确保控制器字段映射与模型定义一致
3. 统一命名规范：前端/API 使用 camelCase，数据库使用 snake_case

### 2.2 非目标

- 不修改数据库模型定义
- 不修改前端代码
- 不启用 camelCaseMiddleware 自动转换

---

## 三、详细修复方案

### 3.1 sessionController.js 修复

#### 问题 1：Plant 字段引用错误

**位置**: `prepareContextForMessage` 函数，第 494-497 行

**当前代码**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  growthStage: plant.current_growth_stage,    // 不存在
  healthScore: plant.current_health_score,    // 不存在
  location: plant.location_name,              // 存在
  remark: plant.remark,                       // 不存在
};
```

**修复方案**: 移除不存在的字段，保留有效字段

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

#### 问题 2：EnvironmentReadingValue 关联字段错误

**位置**: `prepareContextForMessage` 函数，第 513-525 行

**当前代码**:
```javascript
const metricIds = readingValues.map(v => v.metric_id);        // 错误
const metrics = metricIds.length > 0
  ? await EnvironmentMetric.findAll({
      where: { metric_id: metricIds },                        // 错误
      attributes: ['metric_id', 'metric_code', 'name', 'unit'], // 错误
    })
  : [];
const metricMap = new Map(metrics.map(m => [m.metric_id, m])); // 错误
```

**修复方案**: 使用正确的 `metric_code` 字段

```javascript
const metricCodes = readingValues.map(v => v.metric_code);
const metrics = metricCodes.length > 0
  ? await EnvironmentMetric.findAll({
      where: { metric_code: metricCodes },
      attributes: ['metric_code', 'name', 'unit'],
    })
  : [];
const metricMap = new Map(metrics.map(m => [m.metric_code, m]));
```

### 3.2 aiController.js 修复

#### 问题：Plant 字段引用错误

**位置**: `prepareContext` 函数，第 139-147 行

**当前代码**:
```javascript
context.plantInfo = {
  plantId: plant.plant_id,
  nickname: plant.nickname,
  species: plant.species,
  growthStage: plant.growth_stage,     // 不存在
  healthScore: plant.health_score,     // 不存在
  location: plant.location,            // 错误字段名
  remark: plant.remark,                // 不存在
};
```

**修复方案**: 与 sessionController.js 保持一致

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

### 3.3 careRecordController.js 修复

#### 问题：updatedAt 字段引用错误

**位置**: `updateCareRecord` 函数，第 160 行

**当前代码**:
```javascript
updatedAt: plain.updated_at,  // CareRecord 模型中 updatedAt: false
```

**修复方案**: 移除该字段

```javascript
// 移除 updatedAt 字段，因为 CareRecord 模型不跟踪更新时间
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

## 四、模型字段对照表

### 4.1 Plant 模型实际字段

| 数据库字段 | 类型 | 说明 |
|:---|:---|:---|
| plant_id | STRING(64) | 主键 |
| user_id | STRING(64) | 外键 |
| nickname | STRING(100) | 植物昵称 |
| plant_category | ENUM | 种类 |
| species | STRING(100) | 品种 |
| cover_image_url | STRING(500) | 封面图 |
| current_device_id | STRING(64) | 绑定设备 |
| location_name | STRING(100) | 位置名称 |
| location_code | STRING(20) | 城市编码 |
| location_lat | DECIMAL | 纬度 |
| location_lng | DECIMAL | 经度 |
| created_at | DATE | 创建时间 |
| updated_at | DATE | 更新时间 |

### 4.2 EnvironmentReadingValue 模型实际字段

| 数据库字段 | 类型 | 说明 |
|:---|:---|:---|
| value_id | STRING(64) | 主键 |
| reading_id | STRING(64) | 外键（关联 EnvironmentReading） |
| metric_code | STRING(50) | 外键（关联 EnvironmentMetric） |
| value | DECIMAL | 数值 |

### 4.3 EnvironmentMetric 模型实际字段

| 数据库字段 | 类型 | 说明 |
|:---|:---|:---|
| metric_code | STRING(50) | 主键 |
| category | ENUM | 类别 |
| name | STRING(100) | 中文名 |
| unit | STRING(20) | 单位 |
| icon | STRING(50) | 图标 |
| description | STRING(200) | 说明 |
| applicable_sources | JSON | 适用来源 |
| is_common | BOOLEAN | 是否常用 |
| sort_order | INTEGER | 排序 |
| min_value | DECIMAL | 最小值 |
| max_value | DECIMAL | 最大值 |
| created_at | DATE | 创建时间 |

### 4.4 CareRecord 模型配置

```javascript
{
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,  // 不跟踪更新时间
}
```

---

## 五、验证方案

### 5.1 语法检查

```bash
node -c server/src/controllers/sessionController.js
node -c server/src/controllers/aiController.js
node -c server/src/controllers/careRecordController.js
```

### 5.2 功能测试

1. 测试 AI 分析功能，验证 plantInfo 上下文正确
2. 测试环境数据获取，验证 metric_code 关联正确
3. 测试养护记录更新，验证响应格式正确

---

## 六、风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|:---|:---:|:---:|:---|
| 修复后 AI 分析仍异常 | 低 | 高 | 完整测试 AI 分析流程 |
| 环境数据查询失败 | 低 | 中 | 验证数据库中存在 metric_code 数据 |
| API 响应格式变化 | 低 | 低 | 前端已做兼容处理 |

---

## 七、附录

### 7.1 相关文件

- `server/src/controllers/sessionController.js`
- `server/src/controllers/aiController.js`
- `server/src/controllers/careRecordController.js`
- `server/src/models/Plant.js`
- `server/src/models/EnvironmentReadingValue.js`
- `server/src/models/EnvironmentMetric.js`
- `server/src/models/CareRecord.js`

### 7.2 参考文档

- `.trae/documents/project-architecture.md`
- `.trae/rules/project_rules.md`
