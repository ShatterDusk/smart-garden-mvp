# 测试基础设施重构计划

> **目标**：重建完整的、符合当前代码规范的测试基础设施

---

## 一、现状分析

### 1.1 现有测试覆盖

| 类型 | 现有测试 | 状态 |
|:---|:---|:---|
| **集成测试** | users, plants, sessions, devices, ai | ⚠️ 字段命名过时 |
| **单元测试** | auth, camelCase, response, aiService, validators | ⚠️ 部分过时 |
| **E2E测试** | user-journey | ⚠️ 需更新 |

### 1.2 缺失测试

| 类型 | 缺失模块 |
|:---|:---|
| **集成测试** | careRecords, diagnosis, environment, logs, storage, upload, cos |
| **单元测试** | UserService, PlantService, DeviceService, SessionService, CareRecordService, EnvironmentService |

### 1.3 主要问题

1. **字段命名不一致**：测试使用旧版 camelCase（如 `userId`），模型使用 snake_case（`user_id`）
2. **测试数据工厂不完整**：缺少 Message、CareRecord、DiagnosisCard、EnvironmentReading 等
3. **Service 层无测试**：6 个 Service 类完全没有单元测试
4. **API 路由覆盖不足**：12 个路由模块仅测试 5 个

---

## 二、重构策略

### 2.1 命名规范

```
数据库字段：snake_case（user_id, plant_id）
API 响应：camelCase（userId, plantId）- 由 camelCase 中间件自动转换
测试代码：使用 snake_case 创建数据，验证 camelCase 响应
```

### 2.2 测试分层

```
tests/
├── unit/                    # 单元测试（不依赖数据库）
│   ├── middleware/          # 中间件测试
│   ├── services/            # Service 层测试
│   └── utils/               # 工具函数测试
├── integration/             # 集成测试（依赖测试数据库）
│   └── api/                 # API 端点测试
├── e2e/                     # 端到端测试
└── setup/                   # 测试配置
    ├── test-data.js         # 测试数据工厂
    ├── test-helpers.js      # 测试辅助函数（新增）
    ├── globalSetup.js       # 全局初始化
    ├── globalTeardown.js    # 全局清理
    └── jest.setup.js        # Jest 配置
```

---

## 三、执行步骤

### 阶段一：清理旧测试（保留配置）

- [ ] 1.1 备份现有测试文件到 `_tests_backup/`
- [ ] 1.2 删除 `tests/unit/` 下所有测试文件
- [ ] 1.3 删除 `tests/integration/` 下所有测试文件
- [ ] 1.4 删除 `tests/e2e/` 下所有测试文件
- [ ] 1.5 保留 `tests/setup/` 配置文件

### 阶段二：重建测试基础设施

- [ ] 2.1 更新 `tests/setup/test-data.js` - 完善测试数据工厂
- [ ] 2.2 创建 `tests/setup/test-helpers.js` - 测试辅助函数
- [ ] 2.3 更新 `tests/setup/jest.setup.js` - 添加全局配置
- [ ] 2.4 更新 `jest.config.js` - 优化配置

### 阶段三：编写单元测试

#### 3.1 中间件测试
- [ ] `tests/unit/middleware/auth.test.js` - 认证中间件
- [ ] `tests/unit/middleware/camelCase.test.js` - 命名转换中间件
- [ ] `tests/unit/middleware/response.test.js` - 响应中间件
- [ ] `tests/unit/middleware/errorHandler.test.js` - 错误处理中间件（新增）

#### 3.2 Service 层测试
- [ ] `tests/unit/services/UserService.test.js`
- [ ] `tests/unit/services/PlantService.test.js`
- [ ] `tests/unit/services/DeviceService.test.js`
- [ ] `tests/unit/services/SessionService.test.js`
- [ ] `tests/unit/services/CareRecordService.test.js`
- [ ] `tests/unit/services/EnvironmentService.test.js`
- [ ] `tests/unit/services/aiService.test.js`

#### 3.3 工具函数测试
- [ ] `tests/unit/utils/validators.test.js` - 参数校验
- [ ] `tests/unit/utils/logger.test.js` - 日志工具（新增）
- [ ] `tests/unit/utils/response.test.js` - 响应工具（新增）

### 阶段四：编写集成测试

- [ ] `tests/integration/api/users.test.js`
- [ ] `tests/integration/api/plants.test.js`
- [ ] `tests/integration/api/sessions.test.js`
- [ ] `tests/integration/api/devices.test.js`
- [ ] `tests/integration/api/careRecords.test.js`（新增）
- [ ] `tests/integration/api/diagnosis.test.js`（新增）
- [ ] `tests/integration/api/environment.test.js`（新增）
- [ ] `tests/integration/api/ai.test.js`
- [ ] `tests/integration/api/storage.test.js`（新增）
- [ ] `tests/integration/api/logs.test.js`（新增）

### 阶段五：编写 E2E 测试

- [ ] `tests/e2e/user-journey.test.js` - 用户完整旅程
- [ ] `tests/e2e/plant-care-flow.test.js` - 植物养护流程（新增）
- [ ] `tests/e2e/device-integration.test.js` - 设备集成流程（新增）

### 阶段六：验证与清理

- [ ] 6.1 运行所有测试确保通过
- [ ] 6.2 生成测试覆盖率报告
- [ ] 6.3 删除备份目录 `_tests_backup/`
- [ ] 6.4 更新 `.dockerignore` 和 `.gitignore`

---

## 四、测试数据工厂设计

```javascript
// tests/setup/test-data.js

const createTestUser = (overrides = {}) => ({
  user_id: `TEST_USER_${Date.now()}`,
  wx_openid: `test_openid_${Date.now()}`,
  nickname: '测试用户',
  role: 'user',
  status: 'active',
  ...overrides,
});

const createTestPlant = (userId, overrides = {}) => ({
  plant_id: `TEST_PLANT_${Date.now()}`,
  user_id: userId,
  nickname: '测试植物',
  plant_category: 'succulent',
  species: '虎皮兰',
  ...overrides,
});

const createTestSession = (userId, plantId = null, overrides = {}) => ({
  session_id: `TEST_SESSION_${Date.now()}`,
  user_id: userId,
  type: plantId ? 'plant' : 'consultation',
  plant_id: plantId,
  status: 'active',
  context_config: { environmentData: false, careRecords: false, historyDiagnosis: false },
  ...overrides,
});

const createTestDevice = (userId, overrides = {}) => ({
  device_id: `TEST_DEVICE_${Date.now()}`,
  user_id: userId,
  mac_address: `AA:BB:CC:DD:EE:${Date.now().toString().slice(-2)}`,
  status: 'online',
  ...overrides,
});

const createTestMessage = (sessionId, overrides = {}) => ({
  message_id: `TEST_MSG_${Date.now()}`,
  session_id: sessionId,
  role: 'user',
  content_type: 'text',
  content: '测试消息',
  status: 'normal',
  ...overrides,
});

const createTestCareRecord = (userId, plantId, overrides = {}) => ({
  record_id: `TEST_RECORD_${Date.now()}`,
  user_id: userId,
  plant_id: plantId,
  action_type: 'water',
  description: '浇水',
  performed_at: new Date(),
  ...overrides,
});

const createTestDiagnosisCard = (plantId, messageId, overrides = {}) => ({
  diagnosis_card_id: `TEST_DIAG_${Date.now()}`,
  plant_id: plantId,
  message_id: messageId,
  health_score: 85,
  status: 'healthy',
  issues: [],
  suggestions: [],
  confidence: 0.9,
  ...overrides,
});

const createTestEnvironmentReading = (plantId, overrides = {}) => ({
  reading_id: `TEST_READ_${Date.now()}`,
  plant_id: plantId,
  data_source: 'sensor',
  recorded_at: new Date(),
  is_stale: false,
  ...overrides,
});
```

---

## 五、测试辅助函数设计

```javascript
// tests/setup/test-helpers.js

const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const { generateToken } = require('../../src/middleware/auth');

// 创建测试用户并获取 token
async function createAuthenticatedUser(userData = {}) {
  const user = await User.create({
    user_id: `TEST_AUTH_USER_${Date.now()}`,
    wx_openid: `test_auth_openid_${Date.now()}`,
    nickname: '认证测试用户',
    role: 'user',
    status: 'active',
    ...userData,
  });

  const token = generateToken({ user_id: user.user_id });

  return { user, token, userId: user.user_id };
}

// 发送认证请求
function authRequest(method, path, token) {
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

// 清理测试数据
async function cleanupTestData(models) {
  for (const [Model, where] of models) {
    await Model.destroy({ where, force: true });
  }
}

module.exports = {
  createAuthenticatedUser,
  authRequest,
  cleanupTestData,
};
```

---

## 六、预期成果

### 6.1 测试覆盖率目标

| 层级 | 目标覆盖率 |
|:---|:---|
| Controllers | ≥ 80% |
| Services | ≥ 85% |
| Middleware | ≥ 90% |
| Utils | ≥ 90% |
| **总体** | ≥ 80% |

### 6.2 测试数量预估

| 类型 | 数量 |
|:---|:---|
| 单元测试文件 | 15 个 |
| 集成测试文件 | 10 个 |
| E2E 测试文件 | 3 个 |
| **总计** | 28 个测试文件 |

---

## 七、风险与应对

| 风险 | 应对措施 |
|:---|:---|
| 测试数据库配置问题 | 使用独立的 `.env.test` 配置 |
| 外部 API 依赖 | Mock 外部服务调用 |
| 测试数据污染 | 每个测试用例独立清理数据 |
| 测试执行时间过长 | 合理使用 `beforeAll`/`afterAll` 批量处理 |

---

## 八、时间估算

| 阶段 | 预计时间 |
|:---|:---|
| 阶段一：清理旧测试 | 5 分钟 |
| 阶段二：重建基础设施 | 15 分钟 |
| 阶段三：单元测试 | 45 分钟 |
| 阶段四：集成测试 | 60 分钟 |
| 阶段五：E2E 测试 | 30 分钟 |
| 阶段六：验证清理 | 15 分钟 |
| **总计** | 约 2.5 小时 |
