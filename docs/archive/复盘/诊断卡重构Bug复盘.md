# 诊断卡重构 Bug 复盘

## 日期
2026-04-08

## 问题描述
植物详情页的概览 Tab 和诊断 Tab 无法显示诊断卡数据，显示"暂无诊断记录"。

---

## 根本原因

### 核心问题
**后端分层数据流断裂** - Controller 和 Service 之间的字段命名不一致

```
PlantService (已重构)          plantController (未更新)
        ↓                              ↓
  diagnosisCards: []      ≠    latestDiagnosis + diagnosisHistory
        ↓                              ↓
        └────────── 数据丢失 ──────────┘
```

### 完整问题链

| 阶段 | 问题 | 影响 |
|:---|:---|:---|
| 1. 创建诊断卡 | `sessionController` 未传递 `species` | 诊断卡 species 为 null |
| 2. 升级会话 | `upgradeSession` 日志未输出（服务未重启） | 诊断卡 plant_id 未更新 |
| 3. 查询数据 | `PlantService` 返回 `diagnosisCards` | 数据结构变更 |
| 4. **关键断裂** | `plantController` 仍解构旧字段 | **前端收不到数据** |
| 5. 前端显示 | 空数组导致"暂无诊断记录" | 用户看不到诊断卡 |

---

## 修复过程

### 修复的文件清单

| 文件 | 修复内容 | 优先级 |
|:---|:---|:---:|
| `sessionController.js` | 添加 `species` 传递 | P1 |
| `SessionService.js` | 修复 `messageId` 获取，添加日志 | P1 |
| `PlantService.js` | 精简查询，统一返回 `diagnosisCards` | P1 |
| `plantController.js` | **同步修改为 `diagnosisCards`** | **P0** |
| `plant-detail.js` | 使用新数据结构 | P1 |
| `plant-detail.wxml` | 统一组件使用 | P1 |
| `formatters.js` | 新增统一格式化工具 | P2 |
| `PlantService.test.js` | 更新测试覆盖新结构 | P2 |
| `formatters.test.js` | 新增格式化工具测试 | P2 |

### 关键修复点

#### 1. Controller 层字段同步
```javascript
// 修改前
const { plant, device, latestDiagnosis, diagnosisHistory, careRecords, environmentData } = detail;

// 修改后
const { plant, device, diagnosisCards, careRecords, environmentData } = detail;
```

#### 2. 统一数据结构
```javascript
// 统一返回格式
diagnosisCards: [{
  diagnosisCardId: String,
  messageId: String,
  sessionId: String,
  plantId: String,
  species: String,        // AI识别的品种
  healthScore: Number,
  status: String,
  issues: Array,
  suggestions: Array,
  confidence: Number,
  analysisType: String,
  createdAt: String
}]
```

---

## 反思与改进

### 1. 接口契约意识 ⭐⭐⭐

**问题**：修改 Service 时没同步修改 Controller

**改进措施**：
- [ ] 建立 API 变更检查清单
- [ ] 使用 TypeScript 或 JSDoc 定义接口类型
- [ ] 修改数据结构时全局搜索所有引用点
- [ ] 强制要求：修改 Service 必须同步修改 Controller

### 2. 测试覆盖不足 ⭐⭐⭐

**问题**：自动化测试没有覆盖 Controller 层的数据结构验证

**改进措施**：
- [ ] 添加 Controller 层集成测试
- [ ] 测试必须验证返回数据结构完整性
- [ ] CI/CD 中增加契约测试

```javascript
// 应该添加的测试
describe('GET /api/plants/:id', () => {
  it('返回 diagnosisCards 数组', () => {
    // 验证返回结构包含 diagnosisCards
    expect(res.body.data).toHaveProperty('diagnosisCards');
    expect(Array.isArray(res.body.data.diagnosisCards)).toBe(true);
  });
});
```

### 3. 日志监控缺失 ⭐⭐

**问题**：数据丢失没有错误日志，难以定位

**改进措施**：
- [ ] Controller 层添加数据验证日志
- [ ] 关键字段缺失时输出警告日志
- [ ] 建立数据完整性监控

### 4. 重构流程不规范 ⭐⭐⭐

**问题**：分层修改不同步，缺乏系统性

**标准重构流程**：
```
1. 制定重构方案（文档）
   ↓
2. 修改 Service 层
   ↓
3. 【必须】同步修改 Controller 层
   ↓
4. 【必须】同步修改前端
   ↓
5. 更新测试
   ↓
6. 全链路验证（手动+自动）
   ↓
7. 部署并监控
```

### 5. 字段命名一致性 ⭐⭐

**问题**：同一概念多个命名，增加认知负担

| 概念 | 旧命名 | 新命名 |
|:---|:---|:---|
| 单条诊断卡 | latestDiagnosis / firstDiagnosis | diagnosisCards[0] |
| 诊断卡列表 | diagnosisHistory | diagnosisCards |
| AI识别品种 | plantInfo.species | diagnosisCard.species |

**命名规范**：
```
单条：diagnosisCard
列表：diagnosisCards
最新：diagnosisCards[0]
```

---

## 经验总结

### 核心教训
> **分层架构中，任何一层的接口变更都必须同步修改所有依赖层！**

### Checklist（后续重构必做）

- [ ] 修改前全局搜索所有引用点
- [ ] 制定完整的变更影响范围文档
- [ ] Service 层修改 → 必须同步 Controller
- [ ] Controller 修改 → 必须同步前端 API 调用
- [ ] 更新对应层级的单元测试
- [ ] 更新集成测试
- [ ] 手动全链路验证
- [ ] 添加关键位置日志
- [ ] 灰度发布并监控

### 工具改进建议

1. **接口契约工具**：使用 OpenAPI/Swagger 定义接口，生成类型代码
2. **自动化检查**：CI 中增加接口变更检测，提醒同步修改
3. **数据流追踪**：添加请求链路追踪，快速定位数据丢失点

---

## 相关文档

- 重构方案：`docs/技术方案/诊断卡重构方案.md`
- API 文档：`docs/API/植物详情接口.md`
- 测试用例：`backend/server/tests/unit/services/PlantService.test.js`
