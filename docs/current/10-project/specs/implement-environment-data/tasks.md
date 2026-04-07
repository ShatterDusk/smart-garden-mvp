# Tasks

- [x] Task 1: 创建环境数据控制器
  - [x] SubTask 1.1: 创建 `server/src/controllers/environmentController.js`
  - [x] SubTask 1.2: 实现 `getMetricHistory` 方法 - 获取指标历史数据
  - [x] SubTask 1.3: 实现 `getCurrentEnvironment` 方法 - 获取实时环境数据

- [x] Task 2: 创建环境数据路由
  - [x] SubTask 2.1: 创建 `server/src/routes/environment.js`
  - [x] SubTask 2.2: 注册路由 `GET /api/metrics/history`
  - [x] SubTask 2.3: 注册路由 `GET /api/environment/current`

- [x] Task 3: 注册路由到应用
  - [x] SubTask 3.1: 在 `server/src/app.js` 中导入并注册环境数据路由

- [x] Task 4: 初始化环境指标数据
  - [x] SubTask 4.1: 创建 `server/src/scripts/initEnvironmentMetrics.js` 初始化脚本
  - [x] SubTask 4.2: 运行脚本填充 `environment_metrics` 表

- [x] Task 5: 更新 API 设计文档
  - [x] SubTask 5.1: 更新 `设计文档/03-API接口设计.md` 中的环境数据接口定义
  - [x] SubTask 5.2: 统一接口路径为前端已使用的 `/api/metrics/history`

- [x] Task 6: 更新项目架构文档
  - [x] SubTask 6.1: 更新 `.trae/documents/project-architecture.md` 记录新增的路由和控制器

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 5] depends on [Task 1, Task 2]
- [Task 6] depends on [Task 1, Task 2, Task 3]
