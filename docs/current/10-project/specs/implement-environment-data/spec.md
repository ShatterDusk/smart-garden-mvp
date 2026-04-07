# 环境数据功能实现 Spec

## Why
环境数据是智能园艺助手的核心功能之一，用于记录和展示植物的环境指标（温度、湿度、光照等）。当前数据模型已定义，但后端 API 和数据初始化缺失，导致前端页面无法正常获取和展示环境数据。

## What Changes
- 创建环境数据控制器和路由
- 实现 `GET /api/metrics/history` 接口（前端已调用）
- 实现 `GET /api/environment/current` 接口
- 初始化 `environment_metrics` 表的指标数据
- 同步 API 设计文档

## Impact
- Affected specs: 环境数据模块
- Affected code: 
  - `server/src/routes/` (新增 environment.js)
  - `server/src/controllers/` (新增 environmentController.js)
  - `server/src/app.js` (注册路由)
  - `设计文档/03-API接口设计.md` (更新接口定义)

## ADDED Requirements

### Requirement: 环境数据 API 接口
系统应提供环境数据相关的 RESTful API 接口。

#### Scenario: 获取指标历史数据
- **WHEN** 前端调用 `GET /api/metrics/history?plantId=xxx&metricCode=temperature&timeRange=7d`
- **THEN** 返回该植物指定指标在时间范围内的历史数据点列表

#### Scenario: 获取实时环境数据
- **WHEN** 前端调用 `GET /api/environment/current?plantId=xxx`
- **THEN** 返回该植物最新的所有环境指标数据

### Requirement: 环境指标初始化
系统应预置常用的环境指标定义数据。

#### Scenario: 指标数据初始化
- **WHEN** 数据库初始化时
- **THEN** `environment_metrics` 表包含以下指标：
  - temperature (温度)
  - humidity (湿度)
  - lightIntensity (光照强度)
  - soilMoisture (土壤湿度)
  - soilTemperature (土壤温度)

## MODIFIED Requirements

### Requirement: API 路由注册
应用启动时应注册环境数据相关路由。

## REMOVED Requirements
无
