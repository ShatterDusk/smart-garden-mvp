# CI/CD Mock 策略指南

> 说明如何在 CI 环境中处理外部依赖（COS、AI 服务等）

---

## 一、外部依赖分类

### 1.1 需要 Mock 的服务

| 服务 | 原因 | Mock 方式 |
|------|------|----------|
| **COS (腾讯云存储)** | 需要真实密钥和 bucket | Jest Mock |
| **AI 对话 (GLM)** | 需要真实 API Key，成本高 | Jest Mock |
| **微信 API** | 需要真实微信账号 | Jest Mock |
| **天气 API** | 需要真实 API Key | Jest Mock |
| **MySQL 数据库** | ✅ 可用容器化服务 | GitHub Actions Service |

### 1.2 Mock 层级

```
┌─────────────────────────────────────────┐
│           测试代码 (Test Code)           │
├─────────────────────────────────────────┤
│  Controller Test  →  Mock Service Layer │
│  Service Test     →  Mock HTTP/API      │
│  Utils Test       →  Mock SDK/Axios     │
├─────────────────────────────────────────┤
│         Mock 实现 (Mock Implement)       │
├─────────────────────────────────────────┤
│  jest.mock('cos-nodejs-sdk-v5')         │
│  jest.mock('axios')                     │
│  jest.mock('../../services/aiService')  │
└─────────────────────────────────────────┘
```

---

## 二、具体 Mock 实现

### 2.1 COS 服务 Mock

```javascript
// tests/unit/utils/cosService.test.js

// Mock COS SDK
const mockCosGetObjectUrl = jest.fn();

jest.mock('cos-nodejs-sdk-v5', () => {
  return jest.fn().mockImplementation(() => ({
    getObjectUrl: (...args) => mockCosGetObjectUrl(...args),
  }));
});

// Mock axios
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: mockAxiosGet,
    post: mockAxiosPost,
  })),
}));

describe('cosService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置环境变量
    process.env.WECHAT_APPID = 'test_appid';
    process.env.WECHAT_SECRET = 'test_secret';
    process.env.COS_BUCKET = 'test-bucket';
  });

  it('获取上传签名', async () => {
    // Mock 微信 API 响应
    mockAxiosGet.mockResolvedValue({
      data: { access_token: 'test_token', expires_in: 7200 }
    });
    
    mockAxiosPost.mockResolvedValue({
      data: {
        errcode: 0,
        url: 'https://upload.example.com',
        token: 'upload_token',
      }
    });

    const result = await cosService.getUploadSign({
      key: 'test.jpg',
      userId: 'user_123'
    });

    expect(result.uploadUrl).toBe('https://upload.example.com');
  });
});
```

### 2.2 AI 服务 Mock

```javascript
// tests/unit/services/aiService.test.js

jest.mock('../../../src/services/aiService', () => ({
  analyze: jest.fn(),
  chat: jest.fn(),
  generateResponse: jest.fn(),
}));

describe('AI Service', () => {
  it('分析植物图片', async () => {
    const { analyze } = require('../../../src/services/aiService');
    
    analyze.mockResolvedValue({
      healthScore: 85,
      suggestions: ['浇水', '施肥'],
      diagnosis: '健康',
    });

    const result = await analyze({
      imageUrl: 'https://example.com/plant.jpg',
      plantType: 'succulent',
    });

    expect(result.healthScore).toBe(85);
    expect(analyze).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: expect.any(String),
    }));
  });
});
```

### 2.3 天气服务 Mock

```javascript
// tests/unit/services/weatherService.test.js

jest.mock('axios');

const axios = require('axios');

describe('Weather Service', () => {
  it('获取当前天气', async () => {
    axios.get.mockResolvedValue({
      data: {
        code: '200',
        now: {
          temp: '25',
          humidity: '60',
          text: '晴',
        }
      }
    });

    const result = await getCurrentWeather('101010100');

    expect(result.temperature).toBe(25);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('weather')
    );
  });
});
```

---

## 三、CI 环境变量配置

### 3.1 GitHub Actions Secrets（可选）

对于需要真实测试的情况，可以配置 Secrets：

```yaml
# .github/workflows/test.yml
- name: 运行集成测试
  env:
    # 基础配置（Mock 足够）
    NODE_ENV: test
    JWT_SECRET: ${{ secrets.JWT_SECRET || 'test-secret' }}
    
    # 外部服务（使用 Mock，不需要真实值）
    COS_BUCKET: test-bucket
    WECHAT_APPID: test-appid
    GLM_API_KEY: test-key
    
    # 数据库（使用真实容器）
    DB_HOST: 127.0.0.1
    DB_USER: root
    DB_PASSWORD: root
```

### 3.2 不需要配置的 Secrets

以下服务在 CI 中完全使用 Mock，**不需要**真实配置：

- ❌ `COS_SECRET_ID` / `COS_SECRET_KEY`
- ❌ `WECHAT_SECRET`（单元测试）
- ❌ `GLM_API_KEY`（单元测试）
- ❌ `WEATHER_API_KEY`

---

## 四、测试分层策略

### 4.1 单元测试（完全 Mock）

```
测试目标: Controller / Service / Utils
外部依赖: 100% Mock
运行速度: 快 (< 1分钟)
CI 要求: 必须通过 ✅
```

### 4.2 集成测试（部分 Mock）

```
测试目标: API 端点 + 数据库
外部依赖: 数据库真实，其他 Mock
运行速度: 中等 (1-3分钟)
CI 要求: 必须通过 ✅
```

### 4.3 E2E 测试（可选真实服务）

```
测试目标: 完整业务流程
外部依赖: 可配置真实服务
运行速度: 慢 (> 5分钟)
CI 要求: 可选运行
```

---

## 五、Mock 最佳实践

### 5.1 原则

1. **不要测试第三方服务** - 测试你的代码如何与它们交互
2. **Mock 稳定的接口** - 基于 API 契约，不是实现细节
3. **验证调用参数** - 确保你的代码传递正确的参数
4. **模拟错误场景** - 网络错误、API 错误、超时等

### 5.2 示例：验证调用参数

```javascript
// ✅ 好的做法：验证调用参数
it('应该调用 COS 服务上传文件', async () => {
  await uploadController(req, res);
  
  expect(cosService.getUploadSign).toHaveBeenCalledWith({
    key: expect.stringContaining('uploads/'),
    userId: 'user_123',
  });
});

// ❌ 避免：验证内部实现细节
it('不应该检查具体实现', async () => {
  await uploadController(req, res);
  
  // 不要这样做
  expect(cosService.internalMethod).toHaveBeenCalled();
});
```

### 5.3 示例：模拟错误场景

```javascript
it('处理 COS 服务失败', async () => {
  cosService.getUploadSign.mockRejectedValue(
    new Error('COS Service Error')
  );

  await uploadController(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 500,
    message: expect.stringContaining('失败'),
  });
});
```

---

## 六、现有 Mock 覆盖检查

### 6.1 已完成的 Mock

| 模块 | Mock 状态 | 测试文件 |
|------|----------|---------|
| cosService | ✅ 完整 | cosService.test.js |
| cosController | ✅ 完整 | cosController.test.js |
| aiService | ✅ 完整 | aiService.test.js |
| aiController | ✅ 完整 | aiController.test.js |
| weatherService | ⚠️ 部分 | weatherService.test.js |

### 6.2 需要修复的测试

```bash
# weatherService 测试需要修复
npm test -- weatherService.test.js

# 主要问题：
# 1. axios mock 未正确设置
# 2. 期望返回值与实际不符
```

---

## 七、快速验证

```bash
# 本地验证 CI 环境
cd backend/server

# 1. 设置 CI 环境变量
export NODE_ENV=test
export COS_BUCKET=test-bucket
export WECHAT_APPID=test-appid
export WECHAT_SECRET=test-secret

# 2. 运行单元测试（Mock 模式）
npm run test:unit

# 3. 运行集成测试（需要本地 MySQL）
npm run test:integration
```

---

## 八、总结

| 问题 | 解决方案 |
|------|---------|
| COS 服务需要真实密钥 | Jest Mock axios 和 SDK |
| AI 服务需要真实 API | Jest Mock aiService 模块 |
| 微信 API 需要账号 | Jest Mock HTTP 请求 |
| 数据库需要真实实例 | GitHub Actions MySQL Service |

**关键原则**：单元测试 100% Mock，不依赖任何外部服务。
