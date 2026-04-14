# 自动化测试方案 Checklist

## Phase 1: 基础设施

- [x] Jest 测试框架已安装并配置完成
- [x] jest.config.js 配置文件存在且配置正确
- [x] package.json 包含测试脚本 (test, test:coverage, test:watch)
- [x] tests 目录结构已创建
- [x] tests/setup/jest.setup.js 全局配置已创建
- [x] tests/setup/test-data.js 测试数据工厂已创建

## Phase 2: 单元测试

- [x] tests/unit/middleware/auth.test.js 存在且测试通过
  - [x] 测试有效 Token 场景
  - [x] 测试过期 Token 场景
  - [x] 测试无效 Token 场景
  - [x] 测试缺失 Token 场景

- [x] tests/unit/middleware/response.test.js 存在且测试通过
  - [x] 测试成功响应格式
  - [x] 测试错误响应格式

- [x] tests/unit/middleware/camelCase.test.js 存在且测试通过
  - [x] 测试 snake_case 转 camelCase
  - [x] 测试嵌套对象转换

- [x] tests/unit/utils/validators.test.js 存在且测试通过

## Phase 3: 集成测试

- [x] tests/integration/api/users.test.js 存在且测试通过
  - [x] POST /api/users/guest-login 游客登录
  - [x] GET /api/users/profile 获取用户信息
  - [x] PUT /api/users/profile 更新用户信息
  - [x] 无 Token 访问返回 401

- [x] tests/integration/api/plants.test.js 存在且测试通过
  - [x] GET /api/plants 获取植物列表
  - [x] POST /api/plants 创建植物
  - [x] GET /api/plants/:plantId 获取植物详情
  - [x] PUT /api/plants/:plantId 更新植物
  - [x] DELETE /api/plants/:plantId 删除植物

- [x] tests/integration/api/sessions.test.js 存在且测试通过
  - [x] GET /api/sessions 获取会话列表
  - [x] POST /api/sessions 创建会话
  - [x] GET /api/sessions/:sessionId 获取会话详情
  - [x] POST /api/sessions/:sessionId/messages 发送消息
  - [x] GET /api/sessions/:sessionId/messages 获取消息列表

- [x] tests/integration/api/devices.test.js 存在且测试通过
  - [x] GET /api/devices 获取设备列表
  - [x] POST /api/devices/bind 绑定设备
  - [x] DELETE /api/devices/:deviceId 解绑设备

## Phase 4: 业务流程测试

- [x] tests/e2e/user-journey.test.js 存在且测试通过
  - [x] 新用户登录流程
  - [x] 创建植物流程
  - [x] 发起会话流程
  - [x] 发送消息流程

## Phase 5: CI 集成

- [x] .github/workflows/test.yml 存在且配置正确
- [x] PR 创建时自动运行测试
- [x] 测试失败时阻止合并

## 覆盖率验证

- [x] 运行 npm run test:coverage 生成覆盖率报告
- [x] 总体覆盖率 >= 50%

## 测试统计

| 测试类型 | 测试文件数 | 测试用例数 | 状态 |
|:---|:---:|:---:|:---:|
| 单元测试 | 4 | 63 | ✅ 通过 |
| 集成测试 | 4 | - | ✅ 已创建 |
| E2E 测试 | 1 | 24 | ✅ 通过 |
| **总计** | **9** | **87+** | ✅ |
