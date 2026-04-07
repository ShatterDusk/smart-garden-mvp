# Tasks - 修复前端硬编码数据问题

## Task 1: 创建数据生成器基础函数
在 `utils/mock-data.js` 中创建科学的数据生成器函数。

### SubTask 1.1: 创建指标历史数据生成器
- [x] 实现 `generateMetricHistory(plantId, metricCode, range)` 函数
- [x] 基于 360 个原始数据点生成时间序列数据
- [x] 实现插值算法（根据时间范围选择密度）
- [x] 添加季节性调整和趋势模拟
- [x] 添加随机噪声和异常值注入

### SubTask 1.2: 创建设备实时数据生成器
- [x] 实现 `getDeviceRealtimeData(deviceId)` 函数
- [x] 定义各指标的基准值范围（温度、湿度、光照等）
- [x] 实现动态数据生成（基于时间变化）
- [x] 添加设备状态模拟（在线/离线）

### SubTask 1.3: 创建设备历史记录生成器
- [x] 实现 `getDeviceRecentRecords(deviceId)` 函数
- [x] 生成最近几条上报记录
- [x] 包含时间戳和各项指标值

### SubTask 1.4: 创建可用设备列表生成器
- [x] 实现 `getAvailableDevices(plantId)` 函数
- [x] 从设备池中选择未绑定的设备
- [x] 随机生成设备属性（信号强度、电量等）

### SubTask 1.5: 创建植物分类配置
- [x] 实现 `getPlantCategories()` 函数
- [x] 将硬编码的分类数据移到配置对象
- [x] 返回分类列表（含图标、名称、值）

### SubTask 1.6: 创建养护小贴士生成器
- [x] 实现 `getDailyTips()` 函数
- [x] 基于季节/日期返回不同的小贴士
- [x] 支持多条贴士随机选择

---

## Task 2: 更新 device-detail.js
移除硬编码数据，使用 Mock API。

- [x] 修改 `loadRealtimeData()` 方法，调用 `mock.getDeviceRealtimeData()`
- [x] 修改 `loadRecentRecords()` 方法，调用 `mock.getDeviceRecentRecords()`
- [x] 移除硬编码的默认状态（第12行）
- [x] 移除硬编码的信号强度（第40行）
- [x] 测试数据加载和显示

---

## Task 3: 更新 device-manage.js
移除硬编码数据，使用 Mock API。

- [x] 修改 `loadAvailableDevices()` 方法，调用 `mock.getAvailableDevices()`
- [x] 移除硬编码的设备列表（第59-76行）
- [x] 测试设备列表加载

---

## Task 4: 更新 index.js
移除硬编码数据，使用 Mock API。

- [x] 修改养护小贴士获取逻辑，调用 `mock.getDailyTips()`
- [x] 移除硬编码的标题（第22行）
- [x] 移除硬编码的提示数据（第105行）
- [x] 测试首页数据加载

---

## Task 5: 更新 add-plant.js
移除硬编码数据，使用 Mock API。

- [x] 修改 `data.categories` 初始化，调用 `mock.getPlantCategories()`
- [x] 移除硬编码的分类数据（第18-23行）
- [x] 测试分类加载和显示

---

## Task 6: 更新 metric-detail.js
使用新的数据生成器。

- [x] 修改 `loadChartData()` 方法，调用 `mock.generateMetricHistory()`
- [x] 确保图表数据格式兼容
- [x] 测试不同时间范围的数据加载
- [x] 测试图表渲染

---

## Task Dependencies
- Task 1 必须在 Task 2-6 之前完成
- Task 2-6 可以并行执行（无相互依赖）
