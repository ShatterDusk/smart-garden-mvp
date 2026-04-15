# 测试覆盖率提升计划

> 目标：整体覆盖率从 ~60% 提升到 70%+

---

## 当前覆盖率快照

### 整体统计
| 模块 | 覆盖率 | 目标 | 差距 |
|:---|:---|:---|:---|
| **整体** | ~60% | 70% | -10% |
| Controllers | ~75% | 80% | -5% |
| Services | 68.39% | 70% | -2% |
| Routes | 80.21% | 80% | ✅ |
| Models | ~45% | 60% | -15% |
| Utils | 74.09% | 70% | ✅ |

### 具体文件覆盖率（低于 60% 的）

| 文件 | 语句 | 分支 | 函数 | 行 | 优先级 |
|:---|:---|:---|:---|:---|:---|
| `models/SystemLog.js` | 0% | 100% | 0% | 0% | 🔴 高 |
| `models/User.js` | 40% | 100% | 0% | 40% | 🔴 高 |
| `models/Device.js` | 50% | 100% | 0% | 50% | 🔴 高 |
| `models/ReadingTask.js` | 36% | 100% | 0% | 36% | 🔴 高 |
| `models/DiagnosisCard.js` | 33% | 100% | 0% | 33% | 🔴 高 |
| `services/BaseService.js` | 33% | 0% | 62.5% | 35% | 🔴 高 |
| `services/DeviceService.js` | 50% | 41% | 69% | 50% | 🔴 高 |
| `services/UserService.js` | 59% | 61% | 80% | 59% | 🟡 中 |
| `services/SessionService.js` | 63% | 68% | 72% | 65% | 🟡 中 |
| `services/aiService.js` | 60% | 53% | 66% | 60% | 🟡 中 |
| `routes/upload.js` | 32% | 25% | 0% | 32% | 🔴 高 |
| `utils/initDatabase.js` | 0% | 0% | 0% | 0% | 🟢 低 |
| `utils/syncDatabase.js` | 0% | 100% | 0% | 0% | 🟢 低 |
| `utils/logger.js` | 49% | 33% | 33% | 50% | 🟡 中 |

---

## 提升策略

### Phase 1: Model 层测试（预计提升 5-8%）

Model 层测试相对简单，主要测试：
- 模型定义和关联
- 实例方法
- 类方法
- 虚拟字段

**待测试模型**：
1. `SystemLog.js` - 0% → 80%
2. `User.js` - 40% → 80%
3. `Device.js` - 50% → 80%
4. `ReadingTask.js` - 36% → 80%
5. `DiagnosisCard.js` - 33% → 80%

**预计新增测试**：~15 个文件，~100 个测试用例

---

### Phase 2: Service 层核心逻辑（预计提升 3-5%）

重点测试业务逻辑复杂的 Service：

1. **BaseService.js** (33%)
   - 基础 CRUD 方法
   - 事务处理
   - 错误处理

2. **DeviceService.js** (50%)
   - 设备绑定/解绑
   - 设备状态检查
   - MAC 地址验证

3. **UserService.js** (59%)
   - 用户注册/登录
   - 微信授权
   - 用户信息更新

4. **SessionService.js** (63%)
   - 上下文组装
   - 会话升级
   - 消息历史

**预计新增测试**：~8 个文件，~80 个测试用例

---

### Phase 3: 路由和边界情况（预计提升 2-3%）

1. **upload.js** (32%)
   - 文件上传处理
   - 图片压缩
   - 错误处理

2. **边界测试**
   - 参数验证
   - 权限检查
   - 错误响应

**预计新增测试**：~5 个文件，~40 个测试用例

---

### Phase 4: 前端 API 层测试（预计提升 3-5%）

根据 `API-JSDOC-FIX.md` 修复记录，前端 `frontend/utils/api.js` 有 36 个 API 函数需要测试。

**待测试模块**：

| 模块 | 函数数 | 优先级 |
|:---|:---:|:---|
| 会话模块 | 8个 | 🔴 高（核心功能）|
| 植物模块 | 5个 | 🔴 高 |
| 用户模块 | 6个 | 🟡 中 |
| 养护记录模块 | 4个 | 🟡 中 |
| 设备模块 | 4个 | 🟡 中 |
| 诊断模块 | 2个 | 🟢 低 |
| AI 模块 | 1个 | 🟢 低 |
| 用户配置模块 | 2个 | 🟢 低 |
| 环境数据模块 | 2个 | 🟢 低 |
| 云存储模块 | 2个 | 🟢 低 |

**测试重点**：
- Mock `wx.request` 微信小程序请求
- 验证请求参数组装
- 验证响应数据处理
- 验证错误处理逻辑

**预计新增测试**：~10 个文件，~80 个测试用例

---

## 执行计划

### Week 1: Model 层测试
- [ ] SystemLog 模型测试
- [ ] User 模型测试
- [ ] Device 模型测试
- [ ] ReadingTask 模型测试
- [ ] DiagnosisCard 模型测试

### Week 2: Service 层核心
- [ ] BaseService 测试
- [ ] DeviceService 测试
- [ ] UserService 补充测试

### Week 3: 复杂业务逻辑
- [ ] SessionService 补充测试
- [ ] aiService 补充测试
- [ ] upload 路由测试

### Week 4: 前端 API 测试
- [ ] 会话模块 API 测试
- [ ] 植物模块 API 测试
- [ ] 用户模块 API 测试
- [ ] 设备模块 API 测试

### Week 5: 边界和集成
- [ ] 边界测试
- [ ] 集成测试补充
- [ ] E2E 测试准备

---

## 测试模板

### Model 测试模板
```javascript
describe('ModelName', () => {
  describe('模型定义', () => {
    it('应正确定义字段', () => {});
    it('应正确定义关联', () => {});
  });

  describe('实例方法', () => {
    it('方法名 - 正常情况', () => {});
    it('方法名 - 边界情况', () => {});
    it('方法名 - 错误处理', () => {});
  });

  describe('类方法', () => {
    it('静态方法 - 正常情况', () => {});
  });
});
```

### Service 测试模板
```javascript
describe('ServiceName', () => {
  describe('方法名', () => {
    it('正常情况', async () => {});
    it('参数无效', async () => {});
    it('数据不存在', async () => {});
    it('权限不足', async () => {});
    it('数据库错误', async () => {});
  });
});
```

---

## 成功标准

- [ ] 整体代码覆盖率达到 70%
- [ ] 所有 Controller 覆盖率达到 80%
- [ ] 所有 Service 覆盖率达到 70%
- [ ] 所有 Model 覆盖率达到 60%
- [ ] CI 中测试全部通过
- [ ] 无异步句柄警告

---

## 监控指标

每周检查：
1. 覆盖率报告
2. 测试通过率
3. 测试执行时间
4. 新增测试数量

**报告位置**: `测试工作组/test-coverage-report/`

---

**计划制定**: 2026-04-12
**目标完成**: 2026-05-17（延长一周以包含前端测试）
**负责人**: AI 测试助手

---

## 相关文档

- [API-JSDOC-FIX.md](../../docs/current/12-workgroups/问题修复工作组/03-修复记录/API-JSDOC-FIX.md) - 前端 API JSDoc 修复记录
- [测试工作组/change-log.md](./change-log.md) - 测试变更记录
