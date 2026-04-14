# 环境Tab 需求分析文档

> 从代码库（plant-detail、metric-item、metric-detail、后端控制器、数据库模型）中提取并确认的需求

---

## 一、数据源与数据结构

### 1.1 数据来源（两种）

| 数据源 | 标识 | 说明 |
|--------|------|------|
| **设备传感器** | `dataSource: 'sensor'` / `'device'` | 植物绑定的IoT设备实时采集 |
| **天气API** | `dataSource: 'weather_api'` | 第三方天气服务获取 |

### 1.2 环境读数产生机制

- **产生频率**：每 **2小时** 产生一次 environment_reading 记录
- **数据流程**：传感器上传 reading → 后端接收 → 后端补充天气指标 → 构建完整 reading（通过同一 `reading_id` 关联同时刻的环境读数）
- **存储模型**：`environment_readings`（主表）→ `environment_reading_values`（指标值表，FK → `environment_metrics`）

### 1.3 指标定义（数据库 `environment_metrics` 表）

> 数据来源：[smart_garden.sql](../../DataBase/smart_garden.sql) 中 `environment_metrics` 表结构与种子数据

#### 设备/传感器指标 (category: device / soil)

| metricCode | category | 名称 | 单位 | 图标 | min_value | max_value | applicable_sources |
|------------|----------|------|------|------|-----------|-----------|-------------------|
| temperature | device | 温度 | °C | 🌡️ | -40 | 85 | ["sensor", "weather_api"] |
| humidity | device | 湿度 | % | 💧 | 0 | 100 | ["sensor", "weather_api"] |
| light_intensity | device | 光照强度 | lux | ☀️ | 0 | 200000 | ["sensor"] |
| pressure | device | 大气压强 | hPa | 🌐 | 800 | 1100 | ["sensor", "weather_api"] |
| battery_level | device | 设备电量 | % | 🔋 | 0 | 100 | ["sensor"] |
| soil_moisture | soil | 土壤湿度 | % | 🌱 | 0 | 100 | ["sensor"] |
| soil_ph | soil | 土壤酸碱度 | pH | 🔬 | 3 | 9 | ["sensor"] |
| soil_temperature | soil | 土壤温度 | °C | 🌡️ | -20 | 60 | ["sensor"] |

#### 天气API指标 (category: weather)

| metricCode | category | 名称 | 单位 | 图标 | min_value | max_value | 特殊处理 |
|------------|----------|------|------|------|-----------|-----------|----------|
| weather_condition | weather | 天气状况 | code | ⛅ | 100 | 999 | **枚举型**，需前端映射 valueText |
| wind_speed | weather | 风速 | km/h | 💨 | 0 | 200 | 数值型 |
| wind_scale | weather | 风力等级 | 级 | 💨 | 0 | 12 | 数值型 |
| wind_direction_360 | weather | 风向 | ° | 🧭 | 0 | 360 | 前端映射方位文字 |
| precip | weather | 降水量 | mm | 🌧️ | 0 | 500 | 数值型 |
| pressure | weather | 大气压 | hPa | 🌐 | 800 | 1100 | 与设备共用 metricCode |
| humidity | weather | 湿度 | % | 💧 | 0 | 100 | 与设备共用 metricCode |
| temperature | weather | 温度 | °C | 🌡️ | -40 | 85 | 与设备共用 metricCode |
| feels_like | weather | 体感温度 | °C | 🌡️ | -50 | 60 | 数值型 |
| dew_point | weather | 露点温度 | °C | 💧 | -50 | 50 | 数值型 |
| cloud_cover | weather | 云量 | % | ☁️ | 0 | 100 | 数值型 |
| visibility | weather | 能见度 | km | 👁️ | 0 | 100 | 数值型 |

### 1.4 后端已实现的 API

| API | 方法 | 路径 | 状态 | 说明 |
|-----|------|------|------|------|
| 获取植物详情（含环境数据） | GET | `/api/plants/:plantId` | ✅ 已实现 | 返回 `environmentData.deviceMetrics` + `environmentData.weatherMetrics` |
| 获取指标历史 | GET | `/api/metrics/history?plantId&metricCode&timeRange` | ✅ 已实现 | 返回时间序列数据点列表 |
| 获取实时环境数据 | GET | `/api/environment/current?plantId` | ✅ 已实现 | 返回最新读数 + 各指标 status 判断 |

---

## 二、环境 Tab 页面功能

### 2.1 页面布局（从 WXML 分析）

```
┌─────────────────────────────────────┐
│  数据来源切换: [📡设备数据] [🌤️天气数据] │
├─────────────────────────────────────┤
│  (设备数据视图)                       │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │温度  │ │湿度  │ │光照  │         │
│  │25°C  │ │65%   │ │35000 │         │
│  └──────┘ └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │土壤湿│ │pH值  │ │电量  │         │
│  │45%   │ │6.5   │ │85%   │         │
│  └──────┘ └──────┘ └──────┘         │
├─────────────────────────────────────┤
│  设备信息卡片                        │
│  📡 设备名 · 在线 · 🔋85%           │
│  最后更新: 刚刚                      │
│  [设备详情]  [换绑设备]              │
├─────────────────────────────────────┤
│  (天气数据视图)                       │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │温度  │ │湿度  │ │天气状│         │
│  │22°C  │ │45%   │ │多云  │         │
│  └──────┘ └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │风速  │ │降雨量│ │气压  │         │
│  │2.3km/h│ │0mm  │ │1013  │         │
│  └──────┘ └──────┘ └──────┘         │
│  📍 北京市朝阳区 · 更新于14:30       │
│  [查看详细天气预报 →]                │
└─────────────────────────────────────┘
```

### 2.2 组件复用

- **指标卡片**：使用内联模板渲染（WXML 中直接使用 `data-card` 类），每个指标项包含 `{icon, name, value, unit, status, metricCode}`
- **组件属性**（参考 `metric-item` 组件定义）：`icon`, `name`, `value`, `unit`, `status`(normal/warning/critical), `clickable`
- **点击事件**：
  - 设备指标 → `viewMetricDetail` → 跳转 `metric-detail?plantId=&metric=&source=device`
  - 天气指标 → `viewWeatherDetail` → 跳转 `metric-detail?plantId=&metric=&source=weather`
- **特殊字段**：天气枚举型指标使用 `valueText || value` 显示（如"多云"而非原始code）

### 2.3 设备状态场景

| 场景 | 条件 | 显示内容 | 状态 |
|------|------|---------|------|
| **在线** | `deviceInfo.status === 'online'` | 正常指标卡片 + 实时数据 | ✅ 已实现 |
| **离线** | `deviceInfo.status === 'offline'` | 卡片灰显 + 最后已知值 + "离线"角标 + 停止更新时间提示 | 🔧 待补充 |
| **未绑定** | `!plantInfo.currentDeviceId` | 空状态引导 + "去绑定设备"按钮 | ✅ 已实现 |

### 2.4 无数据占位场景

| 场景 | 条件 | 占位文案 | 状态 |
|------|------|---------|------|
| 设备未绑定 | `!currentDeviceId` | "未绑定监测设备" + 引导文案 + 绑定按钮 | ✅ 已实现 |
| 无天气数据 | `!weatherData` | "暂无天气数据" + "请检查网络连接或稍后再试" | ✅ 已实现 |
| 设备已绑定但暂无读数 | `currentDeviceId && deviceMetrics.length === 0` | "等待设备上报数据..." + 加载动画 | 🔧 待补充 |
| 单个指标缺值 | 某项 `value` 为空/null | 该卡片显示 `--` | 🔧 待补充 |

---

## 三、指标详情页 (metric-detail)

### 3.1 页面结构

```
┌─────────────────────────────────────┐
│  ← 返回          温度趋势            │
├─────────────────────────────────────┤
│  当前值: 22.5°C    状态: 正常        │
│  范围: -40°C ~ 85°C                 │  ← 使用数据库 min/max 值
├─────────────────────────────────────┤
│  [24小时] [7天] [30天]              │
├─────────────────────────────────────┤
│  ╭────────────────────────╮         │
│  │      Canvas 折线图      │         │
│  │  (带正常范围高亮区域)    │         │
│  ╰────────────────────────╯         │
├─────────────────────────────────────┤
│  统计信息                           │
│  最高: 28.5°C  最低: 18.2°C         │
│  平均: 23.1°C  记录数: 168          │
├─────────────────────────────────────┤
│  历史记录列表 (最近20条)             │
│  • 03-20 10:30  22.5°C  正常        │
│  • 03-20 09:30  21.8°C  正常        │
│  ...                               │
└─────────────────────────────────────┘
```

### 3.2 功能点

| 功能 | 描述 | 状态 |
|------|------|------|
| 时间范围切换 | 24h / 7d / 30d | ✅ 已实现 |
| Canvas折线图 | 带正常范围高亮区域 | ✅ 已实现 |
| 触摸tooltip | 显示具体时间点的值 | ✅ 已实现 |
| 统计计算 | max/min/avg/count | ✅ 已实现 |
| 历史记录列表 | 最近20条倒序 | ✅ 已实现 |
| 加载更多 | 分页加载 | ⚠️ 占位 |
| 支持设备数据源 | source=device | ✅ 已实现 |
| 支持天气数据源 | source=weather | 🔧 需补全 metricDefinitions |
| 指标阈值来源 | 数据库 min_value/max_value | 🔧 需替换硬编码 |

### 3.3 天气数据源特殊处理

当 `dataSource === 'weather'` 时：

| 处理项 | 说明 |
|--------|------|
| metricDefinitions 补全 | 需增加 weather_condition, wind_speed, precip, pressure, feels_like, uvIndex 等天气指标定义 |
| 枚举型指标 | `weather_condition` 的 value 需通过映射表转为 valueText（如 101 → "多云"） |
| 正常范围高亮 | 大部分天气指标无明确"正常范围"，图表中可隐藏或调整语义 |
| 历史查询过滤 | `getMetricHistory` API 需增加 `dataSource` 参数过滤 `data_source` 字段 |

---

## 四、需求确认结果

### 4.1 功能范围

| 问题 | 确认结果 | 说明 |
|------|---------|------|
| **Q1**: 天气预报页是否需要实现？ | **暂不实现** | mock 中只有"查看天气预报"按钮，当前保留跳转入口但不做目标页面 |
| **Q2**: 设备未绑定时的显示逻辑？ | **前端已有逻辑** | 显示空状态引导 + "去绑定设备"按钮，见 WXML L224-L236 |
| **Q3**: 是否需要手动刷新环境数据的按钮？ | **需要** | 在环境 Tab 区域添加手动刷新按钮 |
| **Q4**: 环境数据更新频率？是否需要定时轮询？ | **每2小时产生一次 reading** | 传感器上传 reading 到后端 → 后端补充天气指标 → 通过同一 reading_id 关联同时刻数据；前端进入页面时拉取最新数据即可，无需定时轮询 |

### 4.2 数据处理

| 问题 | 确认结果 | 技术方案 |
|------|---------|----------|
| **Q5**: `deviceMetrics` 和 `weatherMetrics` 由谁格式化？ | **后端格式化，前端修复绑定** | 后端 `getPlantDetail`（plantController.js L256-L310）已通过 Sequelize include 关联 EnvironmentMetric 表，构建了完整的 `{metricCode, name, unit, icon, value}` 结构。前端需在 `loadPlantDetail` 中从 `environmentData` 提取 `deviceMetrics` 和 `weatherMetrics` 并 setData。后端还需补充每个指标的 `status` 字段判断（复用 `getCurrentEnvironment` 中基于 min_value/max_value 的逻辑） |
| **Q6**: 天气状况枚举映射表放哪里？ | **前端 `utils/metricConstants.js`**（新建文件） | 映射表属于纯 UI 层关注点，包含：① weather_condition code → {text, icon} 映射；② wind_direction_360 angle → 方位文字映射（如 0°="北风", 90°="东风"）；③ wind_scale level → 描述映射。后端存储原始编码，前端负责展示层转换 |
| **Q7**: 指标正常范围阈值固定还是可配置？ | **使用数据库 `min_value` / `max_value`（已可配置），淘汰前端硬编码** | `environment_metrics` 表已有 `min_value` 和 `max_value` 字段。当前 metric-detail.js 中硬编码的 metricDefinitions（如 temperature: 15~30）与数据库实际值（-40~85）不一致，需替换为从 API 获取。后续可通过管理后台按植物类别调整阈值（P2 增强） |

### 4.3 UI/UX

| 问题 | 确认结果 | 详细设计 |
|------|---------|----------|
| **Q8**: 设备离线时指标卡片样式？ | **三种状态差异化呈现** | ① 在线：正常显示 ✅；② 离线：卡片灰色半透明(opacity: 0.6) + 显示最后已知值 + 右上角"离线"角标 + 底部"数据于 HH:mm 停止更新"提示 + 点击仍可跳转详情看历史趋势；③ 未绑定：整区空状态引导 ✅ |
| **Q9**: 无数据时占位文案？ | **补充两个缺失场景** | ① "设备已绑定但暂无读数"：显示"等待设备上报数据..." + 骨架屏/加载动画；② "单个指标缺值"：该指标卡片显示 `--` 而非隐藏整张卡片 |
| **Q10**: metric-detail 是否支持天气数据源？ | **需要支持** | 导航跳转已实现（viewWeatherDetail 传 source=weather），需补全：① metricDefinitions 增加天气指标完整定义；② 枚举型指标 valueText 映射；③ 天气指标正常范围高亮的图表策略（大部分天气指标无明确正常范围，考虑隐藏或改为语义化区间）；④ getMetricHistory API 增加 dataSource 参数以按 data_source 过滤 |

### 4.4 后端补充

| 问题 | 确认结果 | 说明 |
|------|---------|------|
| **Q11**: 是否需要新增天气相关 API？ | **暂不需要新增** | 当前天气数据随 environment_reading 一并存储（data_source='weather_api'），通过 plantDetail 和 getCurrentEnvironment 已可获取。如后续需要实时拉取外部天气 API 再补充 weatherService |
| **Q12**: plantDetail 接口返回字段是否需要补全？ | **基本完整，需补充 status 字段** | `getPlantDetail` 已返回 `environmentData.current`、`environmentData.deviceMetrics`、`environmentData.weatherMetrics`。需补充：① 每个 metricData 中增加 `status` 字段（normal/warning/critical，基于 min_value/max_value 判断）；② 确保 `weatherData`（含 location、updateTime）被正确组装返回 |

---

## 五、当前缺失项汇总

### 5.1 前端缺失（需修复/实现）

| 缺失项 | 文件 | 优先级 | 说明 |
|--------|------|--------|------|
| deviceMetrics 数据绑定 | [plant-detail.js](../../pages/plant-detail/plant-detail.js) L145 | **P0** | `loadPlantDetail` 只设置了 `environmentData`，未提取 `environmentData.deviceMetrics` 到 data |
| weatherMetrics 数据绑定 | [plant-detail.js](../../pages/plant-detail/plant-detail.js) L145 | **P0** | 同上，未提取 `environmentData.weatherMetrics` |
| weatherData 数据绑定 | [plant-detail.js](../../pages/plant-detail/plant-detail.js) L145 | **P1** | 未提取 weatherData（location、updateTime 等） |
| 手动刷新按钮 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) 环境 Tab 区域 | **P1** | Q3 确认需要，需在设备/天气数据视图上方添加刷新按钮 |
| 设备离线样式 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) L164-182 | **P1** | Q8 确认需灰显+离线角标+停止更新时间 |
| "等待设备上报"占位 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) 设备视图区 | **P1** | Q9 确认需补充此场景 |
| 天气常量映射表 | `utils/metricConstants.js`（新建） | **P1** | Q6 确认需存放 weather_condition code→text/icon、风向角度→方位等映射 |
| metric-detail 天气指标定义 | [metric-detail.js](../../pages/metric-detail/metric-detail.js) L69-78 | **P1** | Q10 确认需补全天气指标 metricDefinitions + 枚举处理 |
| metric-detail 阈值来源替换 | [metric-detail.js](../../pages/metric-detail/metric-detail.js) L69-78 | **P0** | Q7 确认需淘汰硬编码，改用 API 返回的 min/max |
| getMetricHistory dataSource 过滤 | [environmentController.js](../../server/src/controllers/environmentController.js) L49-59 | **P1** | Q10 确认需增加 data_source 参数过滤 |

### 5.2 后端缺失（需补充）

| 缺失项 | 文件 | 优先级 | 说明 |
|--------|------|--------|------|
| deviceMetrics status 字段 | [plantController.js](../../server/src/controllers/plantController.js) L281-294 | **P0** | 当前未计算每个指标的 status（normal/warning），需复用 getCurrentEnvironment 的 min/max 判断逻辑 |
| weatherMetrics status 字段 | [plantController.js](../../server/src/controllers/plantController.js) L281-294 | **P0** | 同上 |
| weatherData 对象组装 | [plantController.js](../../server/src/controllers/plantController.js) L305-309 | **P1** | 需从植物 location 信息 + 最新天气 reading 元数据中组装 `{location, updateTime}` |
| getMetricHistory data_source 过滤 | [environmentController.js](../../server/src/controllers/environmentController.js) L49-59 | **P1** | 当前查询未按 data_source 过滤，天气指标详情页会混入 sensor 数据 |

### 5.3 已实现项（经代码验证）

| 项目 | 文件 | 说明 |
|------|------|------|
| 后端 deviceMetrics 构建 | [plantController.js](../../server/src/controllers/plantController.js) L276-L293 | ✅ 已通过 EnvironmentReadingValue + include(EnvironmentMetric) 组装 |
| 后端 weatherMetrics 构建 | [plantController.js](../../server/src/controllers/plantDetail.js) L293-294 | ✅ 已按 data_source='weather_api' 分组 |
| viewMetricDetail 跳转 | [plant-detail.js](../../pages/plant-detail/plant-detail.js) L574-578 | ✅ 已实现，传 source=device |
| viewWeatherDetail 跳转 | [plant-detail.js](../../pages/plant-detail/plant-detail.js) L581-585 | ✅ 已实现，传 source=weather |
| 设备未绑定空状态 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) L224-236 | ✅ 已实现引导绑定 |
| 无天气数据空状态 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) L274-278 | ✅ 已实现 |
| 设备信息卡片 | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) L185-222 | ✅ 含设备名/状态/电量/操作按钮 |
| metric-item 组件 | [metric-item.js](../../components/metric-item/metric-item.js) | ✅ 属性完整（icon/name/value/unit/status/trend/clickable/size） |
| 数据来源切换Tab | [plant-detail.wxml](../../pages/plant-detail/plant-detail.wxml) L144-161 | ✅ 设备数据 / 天气数据 切换 |
| getCurrentEnvironment status 判断 | [environmentController.js](../../server/src/controllers/environmentController.js) L166-173 | ✅ 基于 min_value/max_value 判断 normal/warning |

---

## 六、实施计划与优先级

### P0 - 必须完成（核心功能打通）

| # | 任务 | 涉及文件 | 依赖 |
|---|------|---------|------|
| 1 | **前端绑定 deviceMetrics / weatherMetrics** | `plant-detail.js` loadPlantDetail 方法 | 后端已返回数据 |
| 2 | **后端补充 metrics status 字段** | `plantController.js` getPlantDetail | 无 |
| 3 | **替换 metric-detail 硬编码阈值为动态获取** | `metric-detail.js` loadMetricInfo + 新增 API 调用 | 任务2 或复用 getCurrentEnvironment |
| 4 | **验证端到端数据流** | 全链路 | 任务1-3 完成 |

### P1 - 应该完成（体验优化）

| # | 任务 | 涉及文件 | 依赖 |
|---|------|---------|------|
| 5 | **新建 `utils/metricConstants.js` 天气枚举映射表** | 新建文件 | 无 |
| 6 | **metric-detail 补全天气指标定义 + 枚举处理** | `metric-detail.js` | 任务5 |
| 7 | **设备离线状态样式** | `plant-detail.wxml` + `plant-detail.wxss` | 无 |
| 8 | **补充无数据占位场景（等待上报/单指标缺值）** | `plant-detail.wxml` | 无 |
| 9 | **手动刷新按钮** | `plant-detail.wxml` + `plant-detail.js` | 无 |
| 10 | **后端组装 weatherData 对象** | `plantController.js` | 无 |
| 11 | **getMetricHistory 增加 data_source 过滤** | `environmentController.js` | 无 |

### P2 - 可以延后（增强功能）

| # | 任务 | 说明 |
|---|------|------|
| 12 | 天气预报页面 | Q1 确认暂不实现 |
| 13 | 环境数据自动轮询 | Q4 确认按需拉取即可，无需定时轮询 |
| 14 | 指标阈值按植物类别自定义配置 | 数据库已有字段支撑，待管理后台 |
| 15 | 天气数据实时拉取外部 API | 当前走 reading 存储模式，待评估需求 |

---
