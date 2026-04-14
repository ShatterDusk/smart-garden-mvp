# 修复前端硬编码数据问题 Spec

## Why

当前前端代码存在多处硬编码数据，这些数据应该来自 Mock 数据中心。硬编码导致：

1. 演示时数据不会变化，无法展示动态效果
2. 代码可维护性差，修改数据需要多处改动
3. 生产环境无法使用真实数据源

## What Changes

### 1. 将硬编码数据迁移到 Mock 数据中心

* `device-detail.js` 中的实时数据和历史记录

* `device-manage.js` 中的可用设备列表

* `index.js` 中的养护小贴士和提示数据

* `add-plant.js` 中的植物分类

* `metric-detail.js` 中的指标历史数据生成器

### 2. 创建科学的数据生成器函数

* 基于 360 个原始数据点生成指标历史数据

* 支持时间序列数据生成（24小时/7天/30天）

* 支持数据波动模拟（正弦波 + 随机噪声）

* 支持异常值注入（用于测试告警功能）

### 3. 更新页面代码

* 移除硬编码数据

* 调用新的 Mock API 获取数据

* 保持现有 UI 和交互不变

## Impact

* 影响文件：`utils/mock-data.js`, `pages/device-detail/device-detail.js`, `pages/device-manage/device-manage.js`, `pages/index/index.js`, `pages/add-plant/add-plant.js`, `pages/metric-detail/metric-detail.js`

* 向后兼容：保持现有 API 不变，新增函数

## ADDED Requirements

### Requirement: 创建数据生成器函数

The system SHALL provide data generator functions in `mock-data.js` for:

#### Scenario: 生成指标历史数据

* **GIVEN** 植物ID、指标代码、时间范围

* **WHEN** 调用 `generateMetricHistory(plantId, metricCode, range)`

* **THEN** 返回符合时间序列的模拟数据点数组

#### Scenario: 生成设备实时数据

* **GIVEN** 设备ID

* **WHEN** 调用 `getDeviceRealtimeData(deviceId)`

* **THEN** 返回动态生成的实时监测数据

#### Scenario: 生成可用设备列表

* **GIVEN** 当前植物ID（用于排除已绑定设备）

* **WHEN** 调用 `getAvailableDevices(plantId)`

* **THEN** 返回未绑定的设备列表

#### Scenario: 获取植物分类

* **WHEN** 调用 `getPlantCategories()`

* **THEN** 返回植物分类列表（从配置读取）

#### Scenario: 获取养护小贴士

* **GIVEN** 当前日期/季节

* **WHEN** 调用 `getDailyTips()`

* **THEN** 返回动态生成的小贴士内容

### Requirement: 科学的数据生成算法

The data generator SHALL:

1. **基于基准值生成**：每个指标有合理的基准值范围
2. **时间周期性**：24小时数据呈现昼夜节律（如温度早晚低中午高）
3. **随机波动**：添加 ±10% 的随机噪声模拟真实环境
4. **异常注入**：5% 概率生成异常值用于测试告警
5. **数据连续性**：相邻时间点的数据变化平滑，不跳变

### Requirement: 360数据点处理

The metric history generator SHALL:

1. **原始数据**：基于 360 个原始数据点（可模拟为一年中的第几天）
2. **插值算法**：根据时间范围选择合适的插值密度

   * 24小时：每小时15个数据点（每4分钟一个）

   * 7天：每天约52个数据点（每30分钟一个）

   * 30天：每天12个数据点（每2小时一个）
3. **季节性调整**：根据原始数据点的位置（季节）调整基准值
4. **趋势模拟**：支持长期趋势（如夏季温度整体偏高）

## MODIFIED Requirements

### Requirement: 页面使用 Mock API

The following pages SHALL use new Mock API instead of hardcoded data:

* `device-detail.js`：`loadRealtimeData()` → `mock.getDeviceRealtimeData(deviceId)`

* `device-detail.js`：`loadRecentRecords()` → `mock.getDeviceRecentRecords(deviceId)`

* `device-manage.js`：`loadAvailableDevices()` → `mock.getAvailableDevices(plantId)`

* `index.js`：养护小贴士 → `mock.getDailyTips()`

* `add-plant.js`：植物分类 → `mock.getPlantCategories()`

* `metric-detail.js`：图表数据 → `mock.generateMetricHistory(plantId, metricCode, range)`

