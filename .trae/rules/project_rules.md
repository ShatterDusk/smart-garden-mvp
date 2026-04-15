# PlantGPT 知识索引

## 快速定位

### 我要查...
- **API怎么设计** → `docs/current/02-architecture/API接口设计.md`
- **数据库字段** → `docs/current/02-architecture/数据库设计.md`
- **某个流程** → `docs/current/05-process/`
- **AI诊断逻辑** → `services/aiService.js` + `services/diagnosisCardService.js`
- **环境数据补偿** → `jobs/environmentSyncJob.js`
- **上下文组装** → `services/SessionService.js` (prepareContext)
- **日志排查** → 下方SQL模板
- **文档在哪** → `docs/current/` 对应目录
- **任务待办** → `docs/current/08-tasks/backlog/`

## 核心上下文
微信小程序 + Node.js(Express+Sequelize+MySQL)
响应格式:{code,message,data}
DB(snake_case)→API(camelCase)自动转换

## 实体速查
| 实体 | 模型 | 关键字段 | 关联 |
|:---|:---|:---|:---|
| User | User.js | user_id,wx_openid | hasMany Plant |
| Plant | Plant.js | plant_id,user_id,nickname,plant_category,current_device_id | belongsTo User,hasMany Session |
| Session | Session.js | session_id,user_id,plant_id,type,context_config | hasMany Message |
| Message | Message.js | message_id,session_id,role,content_type | belongsTo Session |
| DiagnosisCard | DiagnosisCard.js | diagnosis_card_id,message_id,plant_id,health_score | belongsTo Message |
| Device | Device.js | device_id,user_id,mac_address,bound_plant_id | belongsTo Plant |
| EnvironmentReading | EnvironmentReading.js | reading_id,plant_id,data_source,is_stale | hasMany EnvironmentReadingValue |
| CareRecord | CareRecord.js | care_record_id,plant_id,type,recorded_at | belongsTo Plant |

## 代码定位
| 功能 | 文件 |
|:---|:---|
| AI分析入口 | `controllers/aiController.js` → `services/aiService.js` |
| 诊断卡生成 | `services/diagnosisCardService.js` |
| 上下文组装 | `services/SessionService.js` (prepareContext) |
| 环境同步 | `jobs/environmentSyncJob.js` |
| 天气数据 | `services/weatherService.js` |
| 设备绑定 | `services/DeviceService.js` |
| 消息处理 | `services/MessageService.js` |
| 命名转换 | `utils/namingConverter.js` |
| 错误处理 | `middleware/errorHandler.js` |

## 文档定位
| 类型 | 位置 |
|:---|:---|
| 架构设计 | `docs/current/02-architecture/` |
| 业务流程 | `docs/current/05-process/` |
| 待办任务 | `docs/current/08-tasks/backlog/` |
| 知识库 | `docs/current/11-knowledge/` |
| 文档治理 | `docs/current/12-workgroups/文档治理委员会/` |
| 债项跟踪 | `docs/current/12-workgroups/文档治理委员会/03-跟踪与报告/文档债跟踪清单.md` |

## 日志排查SQL
```sql
-- 最近错误
SELECT level,message,source,created_at FROM system_logs WHERE level IN('error','fatal') ORDER BY created_at DESC LIMIT 100;
-- 追踪请求
SELECT level,message,source,request_id,created_at FROM system_logs WHERE request_id='xxx' ORDER BY created_at ASC;
-- 查用户日志
SELECT level,message,page_path,action,created_at FROM client_logs WHERE user_id='xxx' ORDER BY created_at DESC LIMIT 100;
```

## AI约束
1. 改API同步更新`frontend/utils/api.js`
2. 改model检查关联service/controller
3. 禁止假设枚举值,必须查模型定义
4. 文档引用优先`docs/current/`
5. 代码与文档冲突以代码为准,记录不一致到文档债清单
6. 新增文档检查重复,更新README索引

## 业务速记
- 植物分类:succulent,flower,foliage,vegetable,other
- 环境来源:sensor,weather_api,compensation
- 会话类型:consultation(咨询),plant(植物)
- 关键判断:data_source区分来源,is_stale标记补偿

## 测试
```bash
cd backend/server
npm run test:unit
npm run test:integration
```

## 问题诊断地图

| 问题现象 | 排查路径 |
|:---|:---|
| API返回500 | `middleware/errorHandler.js` → 查`system_logs` |
| 诊断卡未生成 | `services/aiService.js` → 查AI调用日志 |
| 环境数据缺失 | `jobs/environmentSyncJob.js` → 查`is_stale` |
| 设备绑定失败 | `services/DeviceService.js` → 查`bound_plant_id` |
| 消息未送达 | `services/MessageService.js` → 查`status` |
| 前端显示乱码 | `utils/namingConverter.js` → 查命名转换 |
| 图片上传失败 | COS配置 + `sharp`处理逻辑 |
| 会话加载慢 | `services/SessionService.js` → 查`prepareContext` |

## 快速决策

```
是否需要更新文档?
├── 修改API → 更新`api-reference.md` + `frontend/utils/api.js`
├── 修改Model → 更新`数据库设计.md` + 检查关联
├── 新增功能 → 创建spec.md + 更新README
└── 仅修复bug → 否

是否需要记录文档债?
├── 发现文档与代码不一致 → 记录到`文档债跟踪清单.md`
├── 发现重复文档 → 记录并标记清理
└── 仅补充说明 → 否
```

## 高频代码模板

### 新增API端点
```javascript
// routes/xxx.js
router.post('/path', authMiddleware, xxxController.method)

// controllers/xxxController.js
async method(req, res, next) {
  try {
    const result = await xxxService.method(req.body)
    res.json({ code: 0, message: 'success', data: result })
  } catch (error) {
    next(error)
  }
}
```

### 新增Model
```javascript
// models/Xxx.js
const Xxx = sequelize.define('Xxx', {
  xxx_id: { type: DataTypes.STRING(64), primaryKey: true },
  // ...
}, { tableName: 'xxxs', timestamps: true, underscored: true })

// models/associations.config.js
Xxx.belongsTo(Yyy, { foreignKey: 'yyy_id' })
```

### 查询日志
```javascript
const logs = await SystemLog.findAll({
  where: { level: { [Op.in]: ['error', 'fatal'] } },
  order: [['created_at', 'DESC']],
  limit: 100
})
```

## 知识库索引

| 主题 | 位置 |
|:---|:---|
| 会话性能优化 | `11-knowledge/project-insights/solutions/session-performance-issue.md` |
| 日志API安全加固 | `11-knowledge/project-insights/solutions/log-api-security-hardening.md` |
| Sequelize JSON更新 | `11-knowledge/project-insights/patterns/sequelize-json-field-update.md` |
| 未读消息红点 | `11-knowledge/project-insights/patterns/unread-message-red-dot.md` |
| 文档治理机制 | `11-knowledge/project-insights/best-practices/documentation-management.md` |
| 三线工作流 | `11-knowledge/project-insights/best-practices/three-line-workflow.md` |
| 工作区模式 | `11-knowledge/project-insights/best-practices/workspace-pattern.md` |
| API设计规范 | `11-knowledge/project-insights/best-practices/api-design-standards.md` |
| 新人入职指南 | `11-knowledge/project-insights/best-practices/newcomer-onboarding-guide.md` |
| 数据库设计概览 | `11-knowledge/domain-knowledge/technical/database-schema-overview.md` |
| 传感器数据流 | `11-knowledge/domain-knowledge/technical/sensor-data-flow-design.md` |
| 养护任务系统 | `11-knowledge/domain-knowledge/technical/care-task-system/` |
| 项目技术全景 | `11-knowledge/domain-knowledge/technical/project-technical-landscape.md` |

## Commit Message 规范

### 变更记录
**重要**: 进行重要变更前，先在`测试工作组/change-log.md`记录变更上下文：
- 变更原因（为什么做）
- 影响范围
- 实现细节
- 测试情况

这样即使代码 diff 看不出业务意图，也能通过变更记录了解完整上下文。

