# Checklist - 修复前端硬编码数据问题

## 数据生成器函数

- [x] `generateMetricHistory(plantId, metricCode, range)` 函数已实现
  - [x] 基于 360 个原始数据点生成
  - [x] 支持 24h/7d/30d 时间范围
  - [x] 实现插值算法
  - [x] 添加季节性调整
  - [x] 添加随机噪声
  - [x] 支持异常值注入

- [x] `getDeviceRealtimeData(deviceId)` 函数已实现
  - [x] 定义各指标基准值范围
  - [x] 动态生成实时数据
  - [x] 数据随时间变化

- [x] `getDeviceRecentRecords(deviceId)` 函数已实现
  - [x] 生成多条上报记录
  - [x] 包含时间戳和指标值

- [x] `getAvailableDevices(plantId)` 函数已实现
  - [x] 返回未绑定设备列表
  - [x] 随机生成设备属性

- [x] `getPlantCategories()` 函数已实现
  - [x] 返回分类配置列表
  - [x] 包含图标、名称、值

- [x] `getDailyTips()` 函数已实现
  - [x] 基于日期/季节返回贴士
  - [x] 支持多条随机选择

## 页面更新

- [x] device-detail.js 已更新
  - [x] 使用 `mock.getDeviceRealtimeData()`
  - [x] 使用 `mock.getDeviceRecentRecords()`
  - [x] 移除硬编码默认状态
  - [x] 移除硬编码信号强度

- [x] device-manage.js 已更新
  - [x] 使用 `mock.getAvailableDevices()`
  - [x] 移除硬编码设备列表

- [x] index.js 已更新
  - [x] 使用 `mock.getDailyTips()`
  - [x] 移除硬编码标题
  - [x] 移除硬编码提示数据

- [x] add-plant.js 已更新
  - [x] 使用 `mock.getPlantCategories()`
  - [x] 移除硬编码分类数据

- [x] metric-detail.js 已更新
  - [x] 使用 `mock.generateMetricHistory()`（通过 getMetricHistory 调用）
  - [x] 图表数据格式兼容
  - [x] 测试各时间范围

## 验证测试

- [x] 设备详情页数据动态变化
- [x] 设备管理页设备列表动态生成
- [x] 首页小贴士每日变化
- [x] 添加植物页分类从配置读取
- [x] 指标详情页图表数据科学生成
- [x] 所有页面无硬编码数据残留
