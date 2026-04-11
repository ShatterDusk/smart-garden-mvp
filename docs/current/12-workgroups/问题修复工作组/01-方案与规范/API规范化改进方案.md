# API 规范化改进方案

## 元信息
- **文档类型**: 改进方案
- **版本**: V1.0
- **创建日期**: 2026-04-11
- **适用范围**: 问题修复工作组 / API规范化专项
- **关联问题**: SA-6-001, SA-2-001, SA-1-001 等

---

## 一、现状分析

### 1.1 已发现的不规范问题

基于对前后端 API 代码的全面审查，发现以下 10 类不规范问题：

| 序号 | 问题类别 | 严重程度 | 影响范围 | 关联问题 |
|:---|:---|:---:|:---|:---|
| 1 | RESTful 规范混乱 | 🟠 中 | 路由设计 | - |
| 2 | 参数传递方式混乱 | 🟠 中 | 前后端交互 | - |
| 3 | 响应处理不一致 | 🟡 低 | 前端 api.js | SA-1-001 |
| 4 | 重复定义的接口 | 🟡 低 | 消息模块 | - |
| 5 | 文件上传接口冗余 | 🟠 中 | 上传功能 | - |
| 6 | HTTP 方法使用不当 | 🟠 中 | 路由设计 | - |
| 7 | 路由注册缺少统一前缀 | 🟡 低 | app.js | - |
| 8 | 缺少 API 版本控制 | 🟡 低 | 整体架构 | - |
| 9 | 错误处理不一致 | 🟠 中 | 路由层 | SA-6-001 |
| 10 | 前端 API 函数命名混乱 | 🟡 低 | api.js | SA-1-001 |

### 1.2 与现有问题的关联

- **SA-6-001**: 部分路由缺少 asyncHandler 包装 → 属于"错误处理不一致"
- **SA-2-001**: 天气路由缺少用户认证 → 属于"RESTful 规范混乱"
- **SA-1-001**: 未使用的 API 导出函数 → 属于"响应处理不一致/命名混乱"

---

## 二、改进目标

### 2.1 核心目标

1. **统一规范**: 建立前后端统一的 API 设计和使用规范
2. **提升安全**: 修复认证缺失、错误处理不完善等安全问题
3. **减少冗余**: 合并重复接口，统一上传方案
4. **提高可维护性**: 一致的命名、清晰的结构

### 2.2 具体指标

| 指标 | 当前状态 | 目标状态 |
|:---|:---|:---|
| 路由错误处理覆盖率 | ~70% | 100% |
| 认证覆盖率 | ~85% | 100% |
| 接口重复定义数 | 2 组 | 0 |
| 上传方案数 | 3 个 | 1 个 |
| RESTful 规范符合度 | ~60% | 90%+ |

---

## 三、改进方案

### 阶段1: 错误处理规范化（高优先级）

**目标**: 解决 SA-6-001，统一错误处理

#### 3.1.1 任务清单

| 任务 | 文件 | 操作 | 优先级 |
|:---|:---|:---|:---:|
| 添加 asyncHandler | `weather.js` | 所有路由 | 🔴 P0 |
| 添加 asyncHandler | `environment.js` | 所有路由 | 🔴 P0 |
| 添加 asyncHandler | `cos.js` | 所有路由 | 🔴 P0 |
| 添加 asyncHandler | `storage.js` | 所有路由 | 🔴 P0 |
| 统一错误响应格式 | 所有路由 | 验证格式一致 | 🟠 P1 |

#### 3.1.2 代码示例

```javascript
// 修复前 (environment.js)
router.get('/current', environmentController.getCurrentEnvironment);

// 修复后
router.get('/current', asyncHandler(environmentController.getCurrentEnvironment));
```

---

### 阶段2: 认证规范化（高优先级）

**目标**: 解决 SA-2-001，统一认证处理

#### 3.2.1 任务清单

| 任务 | 文件 | 操作 | 优先级 |
|:---|:---|:---|:---:|
| 添加认证 | `weather.js` | `/now`, `/astronomy` | 🔴 P0 |
| 检查其他路由 | 所有 routes | 确保认证完整 | 🟠 P1 |
| 统一认证方式 | 所有路由 | 统一使用 authMiddleware | 🟠 P1 |

#### 3.2.2 代码示例

```javascript
// 修复前 (weather.js)
router.get('/now', weatherController.getCurrentWeather);

// 修复后
router.get('/now', authMiddleware, asyncHandler(weatherController.getCurrentWeather));
```

---

### 阶段3: 接口合并与清理（中优先级）

**目标**: 解决重复定义、清理冗余

#### 3.3.1 任务清单

| 任务 | 文件 | 操作 | 优先级 |
|:---|:---|:---|:---:|
| 合并消息接口 | `api.js` | 删除 `getMessages`/`addMessage` | 🟠 P1 |
| 统一使用 | `api.js` | 统一使用 `getSessionMessages`/`sendMessage` | 🟠 P1 |
| 检查页面引用 | `pages/` | 更新引用 | 🟠 P1 |
| 清理未使用函数 | `api.js` | 删除 `getUserSettings`/`updateUserSettings` | 🟡 P2 |

#### 3.3.2 代码示例

```javascript
// 删除以下重复定义 (api.js L463-481)
// getMessages - 重复
// addMessage - 重复
// markSessionAsRead - 重复
// updateSession - 重复

// 保留统一接口
getSessionMessages,  // 已存在 L252
sendMessage,         // 已存在 L263
```

---

### 阶段4: 上传方案统一（中优先级）

**目标**: 统一为 COS 直传方案

#### 3.4.1 现状分析

当前有 3 个上传方案：
1. `storage.js` - `/api/storage/upload` - 获取上传链接（服务器中转）
2. `cos.js` - `/api/cos/upload-sign` - COS 直传
3. `upload.js` - `/api/upload` - 服务器中转上传

#### 3.4.2 改进方案

**推荐**: 统一使用 COS 直传方案（成本低、性能好）

| 任务 | 操作 | 优先级 |
|:---|:---|:---:|
| 标记废弃 | `storage.js`, `upload.js` 添加废弃注释 | 🟠 P1 |
| 更新前端 | 确保前端使用 `cos-upload.js` | 🟠 P1 |
| 后续移除 | 下版本移除废弃接口 | 🟡 P2 |

---

### 阶段5: RESTful 规范化（低优先级）

**目标**: 统一 RESTful 设计规范

#### 3.5.1 命名规范统一

| 当前 | 规范 | 示例 |
|:---|:---|:---|
| `/guest-login` | 动作型保留 | `/users/guest-login` |
| `/devices/unbind` | 改为 DELETE | `DELETE /devices/:deviceId/bindings` |
| `/sessions/:id/read` | 改为 PATCH | `PATCH /sessions/:id` (body: {read: true}) |
| `/sessions/:id/upgrade` | 改为 PUT | `PUT /sessions/:id/upgrade` |

#### 3.5.2 参数规范统一

```javascript
// 统一分页参数
const pagination = {
  page: 1,        // 页码
  pageSize: 20    // 每页数量（统一使用 pageSize）
};

// 统一命名风格（前端 camelCase）
const params = {
  plantId: 'xxx',     // 不用 plant_id
  sessionId: 'xxx'    // 不用 session_id
};
```

#### 3.5.3 响应处理统一

```javascript
// 统一响应处理方式
// 列表接口返回数组
tryGetList: (res) => res?.list || []

// 详情接口返回对象
tryGetDetail: (res) => res || null

// 操作接口返回布尔
tryGetResult: (res) => !!res
```

---

### 阶段6: API 版本控制（可选）

**目标**: 为未来升级预留空间

#### 3.6.1 方案

```javascript
// 在 app.js 中添加版本前缀
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/plants', plantRoutes);
// ...

// 保持向后兼容
app.use('/api/users', userRoutes);  // 兼容旧版本
```

---

## 四、实施计划

### 4.1 时间线

```
Week 1 (Day 1-3):  阶段1 + 阶段2  (错误处理 + 认证)
Week 1 (Day 4-5):  阶段3          (接口合并)
Week 2 (Day 6-7):  阶段4          (上传统一)
Week 2 (Day 8-10): 阶段5          (RESTful 规范)
Week 3+:          阶段6 (可选)    (版本控制)
```

### 4.2 依赖关系

```
阶段1 (错误处理) ──┐
                  ├──→ 阶段3 (接口合并)
阶段2 (认证) ──────┘

阶段4 (上传统一) ──→ 阶段5 (RESTful 规范)
```

### 4.3 风险与应对

| 风险 | 影响 | 应对措施 |
|:---|:---|:---|
| 修改影响现有功能 | 高 | 每个阶段完成后全面回归测试 |
| 前端调用不兼容 | 高 | 同步更新前端 api.js，保持兼容 |
| 第三方依赖 | 中 | 提前检查所有引用点 |
| 测试覆盖不足 | 中 | 补充单元测试和集成测试 |

---

## 五、验收标准

### 5.1 代码层面

- [ ] 所有路由使用 asyncHandler 包装
- [ ] 所有敏感接口有认证保护
- [ ] 无重复定义的接口
- [ ] 统一的错误响应格式
- [ ] 符合项目命名规范

### 5.2 测试层面

- [ ] 单元测试通过率 100%
- [ ] 集成测试通过率 100%
- [ ] 手动回归测试通过
- [ ] 安全测试通过

### 5.3 文档层面

- [ ] API 文档已更新
- [ ] 修复记录已归档
- [ ] 变更日志已记录

---

## 六、关联问题处理

### 6.1 SA-6-001: 路由缺少 asyncHandler

**处理方式**: 在阶段1中完成

**涉及文件**:
- `backend/server/src/routes/weather.js`
- `backend/server/src/routes/environment.js`
- `backend/server/src/routes/cos.js`
- `backend/server/src/routes/storage.js`

### 6.2 SA-2-001: 天气路由缺少认证

**处理方式**: 在阶段2中完成

**涉及文件**:
- `backend/server/src/routes/weather.js`

### 6.3 SA-1-001: 未使用的 API 导出函数

**处理方式**: 在阶段3中完成

**涉及文件**:
- `frontend/utils/api.js`

---

## 七、后续建议

### 7.1 短期（1-2周）

1. 完成阶段1-3的修复
2. 补充缺失的单元测试
3. 更新 API 文档

### 7.2 中期（1个月）

1. 完成阶段4-5的改进
2. 建立 API 规范检查清单
3. 添加自动化 API 测试

### 7.3 长期（3个月）

1. 考虑引入 OpenAPI/Swagger 文档
2. 建立 API 版本管理机制
3. 定期进行 API 规范审查

---

## 八、参考文档

- [项目规则](../../../../.trae/rules/project_rules.md)
- [修复工作流程](修复工作流程.md)
- [执行规范](执行规范.md)
- [待修复问题清单](../02-任务队列/待修复问题.md)

---

**创建时间**: 2026-04-11  
**最后更新**: 2026-04-11
