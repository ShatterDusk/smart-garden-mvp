# Mermaid 图表集合

> 演示时直接展示这些图表

---

## 1. 系统架构图（整体）

```mermaid
flowchart TB
    subgraph Client["客户端"]
        MP["微信小程序"]
        DeviceHW["IoT设备"]
    end

    subgraph Middleware["中间件"]
        Auth["auth.js<br/>JWT认证"]
        DeviceAuth["deviceAuth.js<br/>设备认证"]
        LogAuth["logAuth.js<br/>日志访问认证"]
        ErrorHandler["errorHandler.js<br/>错误处理"]
        Validator["validator.js<br/>参数校验"]
        Response["response.js<br/>响应格式化"]
    end

    subgraph Controllers["控制器层"]
        UserCtrl["userController"]
        PlantCtrl["plantController"]
        SessionCtrl["sessionController"]
        DeviceCtrl["deviceController"]
        EnvCtrl["environmentController"]
        AICtrl["aiController"]
        CareCtrl["careRecordController"]
        DiagCtrl["diagnosisController"]
        LogCtrl["logController"]
        COSCtrl["cosController"]
        WeatherCtrl["weatherController"]
        StorageCtrl["storageController"]
    end

    subgraph Services["服务层"]
        UserService["UserService"]
        PlantService["PlantService"]
        SessionService["SessionService"]
        DeviceService["DeviceService"]
        EnvService["EnvironmentService"]
        AIService["aiService"]
        AsyncAIService["asyncAiService"]
        CareService["CareRecordService"]
        WechatAuth["WechatAuthService"]
        WeatherService["weatherService"]
        CompService["compensationService"]
        CacheService["CacheService"]
        BaseService["BaseService"]
    end

    subgraph Models["数据模型层"]
        User["User"]
        Plant["Plant"]
        Session["Session"]
        Message["Message"]
        Device["Device"]
        EnvReading["EnvironmentReading"]
        EnvValue["EnvironmentReadingValue"]
        DiagnosisCard["DiagnosisCard"]
        CareRecord["CareRecord"]
        UserConfig["UserConfig"]
        ReadingTask["ReadingTask"]
        SystemLog["SystemLog"]
        ClientLog["ClientLog"]
    end

    subgraph Data["数据层"]
        MySQL[("MySQL 8.0")]
        Redis[("Redis")]
    end

    subgraph External["外部服务"]
        WeChat["微信服务"]
        GLM["智谱GLM"]
        WeatherAPI["和风天气"]
        COS["腾讯云COS"]
    end

    %% 客户端请求
    MP -->|用户请求| Auth
    DeviceHW -->|设备数据| DeviceAuth
    
    %% 中间件到控制器
    Auth --> UserCtrl
    Auth --> PlantCtrl
    Auth --> SessionCtrl
    Auth --> AICtrl
    Auth --> CareCtrl
    Auth --> DiagCtrl
    Auth --> COSCtrl
    Auth --> WeatherCtrl
    Auth --> LogCtrl
    DeviceAuth --> DeviceCtrl
    DeviceAuth --> EnvCtrl
    LogAuth --> LogCtrl
    
    %% 控制器到服务
    UserCtrl --> UserService
    PlantCtrl --> PlantService
    SessionCtrl --> SessionService
    DeviceCtrl --> DeviceService
    EnvCtrl --> EnvService
    AICtrl --> AIService
    AICtrl --> AsyncAIService
    CareCtrl --> CareService
    DiagCtrl --> SessionService
    LogCtrl --> BaseService
    COSCtrl --> BaseService
    WeatherCtrl --> WeatherService
    StorageCtrl --> BaseService
    
    %% 服务间调用
    UserService --> WechatAuth
    UserService --> CacheService
    SessionService --> AIService
    SessionService --> PlantService
    SessionService --> EnvService
    DeviceService --> WeatherService
    DeviceService --> PlantService
    EnvService --> CompService
    AIService --> SessionService
    
    %% 服务到模型
    UserService --> User
    UserService --> UserConfig
    PlantService --> Plant
    SessionService --> Session
    SessionService --> Message
    DeviceService --> Device
    EnvService --> EnvReading
    EnvService --> EnvValue
    EnvService --> ReadingTask
    AIService --> DiagnosisCard
    CareService --> CareRecord
    LogCtrl --> SystemLog
    LogCtrl --> ClientLog
    
    %% 模型到数据库
    User --> MySQL
    Plant --> MySQL
    Session --> MySQL
    Message --> MySQL
    Device --> MySQL
    EnvReading --> MySQL
    DiagnosisCard --> MySQL
    CareRecord --> MySQL
    UserConfig --> MySQL
    ReadingTask --> MySQL
    SystemLog --> MySQL
    ClientLog --> MySQL
    
    %% 缓存
    CacheService --> Redis
    UserService --> Redis
    
    %% 外部服务
    WechatAuth --> WeChat
    AIService --> GLM
    AsyncAIService --> GLM
    WeatherService --> WeatherAPI
    COSCtrl --> COS
    
    %% 继承关系
    BaseService -.->|继承| UserService
    BaseService -.->|继承| PlantService
    BaseService -.->|继承| SessionService
    BaseService -.->|继承| DeviceService
    BaseService -.->|继承| EnvService
    BaseService -.->|继承| CareService
```

---

## 2. 后端分层架构图（详细）

```mermaid
graph TB
    subgraph client
        MP["微信小程序"]
        DEVICE["IoT设备"]
    end

    subgraph gateway
        EXPRESS["Express.js服务器"]
        MW_AUTH["认证中间件"]
        MW_ERR["错误处理中间件"]
        MW_RES["响应格式中间件"]
    end

    subgraph routes
        R_USER["/api/users"]
        R_PLANT["/api/plants"]
        R_SESSION["/api/sessions"]
        R_DEVICE["/api/devices"]
        R_ENV["/api/environment"]
        R_AI["/api/ai"]
    end

    subgraph controllers
        C_USER["userController"]
        C_PLANT["plantController"]
        C_SESSION["sessionController"]
        C_DEVICE["deviceController"]
        C_ENV["environmentController"]
    end

    subgraph services
        S_BASE["BaseService"]
        S_USER["UserService"]
        S_PLANT["PlantService"]
        S_SESSION["SessionService"]
        S_DEVICE["DeviceService"]
        S_ENV["EnvironmentService"]
        S_AI["aiService"]
        S_WEATHER["weatherService"]
        S_COMP["compensationService"]
    end

    subgraph models
        M_USER["User"]
        M_PLANT["Plant"]
        M_SESSION["Session"]
        M_DEVICE["Device"]
        M_ENV["EnvironmentReading"]
    end

    subgraph external
        AI_API["AI服务-GLM/OpenAI"]
        WEATHER_API["天气API"]
    end

    subgraph db
        MYSQL[(MySQL)]
    end

    MP --> EXPRESS
    DEVICE --> EXPRESS
    EXPRESS --> MW_AUTH --> MW_RES --> MW_ERR
    
    R_USER --> C_USER --> S_USER
    R_PLANT --> C_PLANT --> S_PLANT
    R_SESSION --> C_SESSION --> S_SESSION
    R_DEVICE --> C_DEVICE --> S_DEVICE
    R_ENV --> C_ENV --> S_ENV
    
    S_BASE --> S_USER
    S_BASE --> S_PLANT
    S_BASE --> S_SESSION
    S_BASE --> S_DEVICE
    S_BASE --> S_ENV
    
    S_USER --> M_USER --> MYSQL
    S_PLANT --> M_PLANT --> MYSQL
    S_SESSION --> M_SESSION --> MYSQL
    S_DEVICE --> M_DEVICE --> MYSQL
    S_ENV --> M_ENV --> MYSQL
    
    S_AI --> AI_API
    S_WEATHER --> WEATHER_API
```

---

## 3. 数据库ER图

```mermaid
erDiagram
    users {
        string user_id PK
        string wx_openid UK
        string nickname
        string avatar_url
        enum role
        enum status
        datetime last_login_at
        datetime created_at
        datetime updated_at
    }
    
    plants {
        string plant_id PK
        string user_id FK
        string nickname
        enum plant_category
        string species
        string cover_image_url
        string current_device_id FK
        string location_name
        string location_code
        decimal location_lat
        decimal location_lng
        datetime created_at
        datetime updated_at
    }
    
    sessions {
        string session_id PK
        string user_id FK
        enum type
        string plant_id FK
        string title
        json context_config
        enum status
        datetime created_at
        datetime updated_at
    }
    
    messages {
        string message_id PK
        string session_id FK
        enum role
        enum content_type
        text content
        json image_urls
        string reply_to_message_id FK
        enum status
        datetime created_at
        datetime updated_at
    }
    
    diagnosis_cards {
        string diagnosis_card_id PK
        string message_id FK
        string plant_id FK
        enum analysis_type
        int health_score
        enum status
        json issues
        json suggestions
        decimal confidence
        json context_used
        datetime created_at
    }
    
    devices {
        string device_id PK
        string user_id FK
        string mac_address
        string device_name
        enum status
        int battery_level
        datetime last_heartbeat
        datetime created_at
    }
    
    reading_tasks {
        string task_id PK
        string plant_id FK
        datetime recorded_at
        enum sensor_status
        enum weather_status
        datetime created_at
        datetime updated_at
    }
    
    environment_readings {
        string reading_id PK
        string plant_id FK
        enum data_source
        string source_id
        datetime recorded_at
        boolean is_stale
    }
    
    environment_metrics {
        string metric_code PK
        enum category
        string name
        string unit
        string icon
        string description
        json applicable_sources
        boolean is_common
        int sort_order
        decimal min_value
        decimal max_value
        datetime created_at
    }
    
    environment_reading_values {
        string value_id PK
        string reading_id FK
        string metric_code FK
        decimal value
    }
    
    care_records {
        string record_id PK
        string plant_id FK
        string user_id FK
        enum action_type
        text description
        json images
        datetime performed_at
        datetime created_at
    }
    
    user_config {
        string config_id PK
        string user_id FK
        string config_key
        json config_value
        enum config_type
        datetime created_at
        datetime updated_at
    }
    
    system_logs {
        bigint id PK
        enum level
        text message
        json metadata
        string source
        string request_id
        string ip_address
        string user_agent
        string url
        string method
        text error_stack
        datetime created_at
    }
    
    client_logs {
        bigint id PK
        string user_id FK
        string session_id
        enum level
        text message
        string page_path
        string action
        json device_info
        json metadata
        string network_type
        datetime created_at
    }
    
    users ||--o{ plants : "拥有"
    users ||--o{ sessions : "创建"
    users ||--o{ devices : "拥有"
    users ||--o{ care_records : "记录"
    users ||--o{ user_config : "配置"
    users ||--o{ client_logs : "产生"
    
    plants ||--o{ diagnosis_cards : "诊断历史"
    plants ||--o{ environment_readings : "环境数据"
    plants ||--o{ care_records : "养护记录"
    plants ||--o{ reading_tasks : "采集任务"
    plants ||--o| devices : "当前绑定（通过current_device_id）"
    
    environment_readings ||--o{ environment_reading_values : "包含"
    environment_metrics ||--o{ environment_reading_values : "定义"
    
    sessions ||--o{ messages : "包含"
    sessions }o--|| plants : "植物会话绑定"
    
    messages ||--o| diagnosis_cards : "产生诊断"
    messages ||--o| messages : "回复"
```

---

## 4. 分层架构图（简化）

```mermaid
flowchart TB
    subgraph Controller["Controller层"]
        C1[参数校验]
        C2[认证检查]
        C3[响应格式化]
    end

    subgraph Service["Service层"]
        S1[业务逻辑]
        S2[事务管理]
        S3[跨模块协调]
    end

    subgraph Model["Model层"]
        M1[数据访问]
        M2[关联定义]
    end

    Client --> Controller
    Controller --> Service
    Service --> Model
    Model --> Database[(数据库)]
```

---

## 5. 环境数据补偿流程

```mermaid
flowchart TD
    Start[定时触发] --> Generate[生成ReadingTasks]
    Generate --> Wait[等待设备上报 - 5分钟容忍期]
    Wait --> Check{设备上报了?}
    Check -->|是| SaveReal[保存真实数据]
    Check -->|否| Compensate[调用天气API补偿]
    Compensate --> SaveCompensate[保存补偿数据 - 标记is_stale=true]
    SaveReal --> End[结束]
    SaveCompensate --> End
```

---

## 6. 双轨会话设计

```mermaid
flowchart LR
    subgraph Consultation["咨询会话"]
        C1[临时对话]
        C2[不绑定植物]
    end

    subgraph PlantSession["植物会话"]
        P1[绑定特定植物]
        P2[有完整上下文]
    end

    Consultation -->|保存诊断结果| PlantSession
    PlantSession -->|保留历史| PlantSession
```

---

## 7. 环境数据采集时序图

```mermaid
sequenceDiagram
    participant Job as 定时任务
    participant Backend as 后端服务
    participant DB as 数据库
    participant Weather as 天气API

    Note over Job: 每2小时执行一次
    
    Job->>Backend: 触发采集任务
    Backend->>DB: 查询所有有设备的植物
    
    loop 每株植物
        Backend->>DB: INSERT reading_tasks (pending)
    end
    
    par 天气数据获取
        Backend->>Weather: 批量请求天气数据
        Weather-->>Backend: 天气数据
        Backend->>DB: INSERT environment_readings (weather_api)
        Backend->>DB: UPDATE reading_tasks SET weather_status='received'
    end
    
    Backend-->>Job: 任务创建完成
```

---

## 8. 传感器数据上报时序图

```mermaid
sequenceDiagram
    participant Device as 硬件设备
    participant Backend as 后端服务
    participant DB as 数据库

    Device->>Backend: POST 传感器数据
    Backend->>Backend: 验证设备 & 获取绑定植物
    
    par 并行处理
        Backend->>DB: INSERT sensor数据
    and
        Backend->>Backend: 获取天气数据
        Backend->>DB: INSERT weather数据
    end
    
    Backend-->>Device: 成功响应
```

---

## 9. AI诊断流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant MP as 小程序
    participant Backend as 后端服务
    participant AI as AI服务
    participant DB as 数据库

    User->>MP: 上传植物照片
    MP->>Backend: POST /api/ai/diagnose
    
    Backend->>Backend: 查询植物档案
    Backend->>Backend: 查询环境数据
    Backend->>Backend: 组装Prompt
    
    Backend->>AI: 调用视觉模型识别品种
    AI-->>Backend: 品种信息
    
    Backend->>AI: 调用语言模型诊断
    AI-->>Backend: 诊断结果
    
    Backend->>DB: 保存诊断记录
    Backend->>DB: 生成诊断卡片
    
    Backend-->>MP: 返回诊断结果
    MP-->>User: 展示诊断卡片
```

---

## 10. CI/CD流水线

```mermaid
flowchart LR
    subgraph 触发
        PUSH[Push到main分支]
    end
    
    subgraph 流水线
        LINT[ESLint检查]
        TEST[单元测试]
        INTEGRATION[集成测试]
        BUILD[构建检查]
        DEPLOY[部署通知]
    end
    
    subgraph 报告
        CODECOV[Codecov覆盖率]
    end
    
    PUSH --> LINT --> TEST --> INTEGRATION --> BUILD --> DEPLOY
    TEST --> CODECOV
```

---

## 11. 中间件处理流程

```mermaid
flowchart LR
    Request[HTTP请求] --> Security[安全中间件 helmet/cors]
    Security --> Logger[日志中间件]
    Logger --> Response[响应中间件]
    Response --> Auth[认证中间件]
    Auth --> Router[路由处理]
    Router --> Error[错误处理中间件]
    Error --> Response2[响应中间件]
```

---

## 12. 用户登录认证流程

```mermaid
sequenceDiagram
    participant MP as 小程序
    participant R as /api/users/login
    participant C as userController
    participant S as UserService
    participant M as User Model
    participant DB as MySQL

    MP->>R: POST code, nickname, avatarUrl
    R->>C: login
    C->>S: createUser openId, userInfo
    S->>M: findOne wx_openid
    M->>DB: SELECT
    DB-->>M: User or null
    
    alt 新用户
        S->>M: create user
        M->>DB: INSERT
        S->>S: createDefaultConfig
    else 已存在
        S->>M: update last_login_at
        M->>DB: UPDATE
    end
    
    C->>C: generateToken
    C-->>MP: token, user
```

---

## 13. 会话消息处理流程

```mermaid
sequenceDiagram
    participant MP as 小程序
    participant C as sessionController
    participant SS as SessionService
    participant AI as aiService
    participant EXT as GLM API

    MP->>C: POST /sessions/id/messages
    C->>SS: getSessionById
    C->>SS: createMessage user
    C->>SS: prepareContext
    SS-->>C: plantInfo, envData, careRecords
    C->>SS: getConversationHistory
    
    C->>AI: analyze content, imageUrl, context
    AI->>AI: buildPrompt
    AI->>AI: convertImageToBase64
    AI->>EXT: callGLM prompt, image
    EXT-->>AI: JSON response
    AI->>AI: parseResponse
    AI-->>C: content, diagnosisCard
    
    C->>SS: createMessage assistant
    C->>SS: createDiagnosisCard
    C-->>MP: userMessage, aiResponse
```

---

## 14. 环境数据系统架构

```mermaid
graph TB
    subgraph 数据来源
        IOT[IoT设备传感器]
        WEATHER[天气API]
        USER[用户手动录入]
    end

    subgraph 数据采集层
        DEVICE_API[/api/devices/data -- 设备认证/]
        ENV_API[/api/environment/readings -- 统一入口/]
    end

    subgraph 数据处理层
        DS[DeviceService]
        ES[EnvironmentService]
        WS[weatherService]
        CS[compensationService]
    end

    subgraph 数据存储层
        ER[(EnvironmentReading)]
        ERV[(EnvironmentReadingValue)]
        EM[(EnvironmentMetric)]
        RT[(ReadingTask)]
    end

    subgraph 数据查询层
        ENV_QUERY[/api/environment/current]
        HIST_QUERY[/api/environment/history]
    end

    subgraph 消费端
        MP[微信小程序]
        JOB[定时任务补偿]
    end

    IOT --> DEVICE_API
    WEATHER --> WS
    USER --> ENV_API
    
    DEVICE_API --> DS
    ENV_API --> ES
    
    DS --> ES
    DS --> WS
    WS --> ER
    ES --> CS
    
    ES --> ER
    ER --> ERV
    EM --> ERV
    ES --> RT
    
    MP --> ENV_QUERY
    MP --> HIST_QUERY
    ENV_QUERY --> ES
    HIST_QUERY --> ES
    
    JOB --> CS
    CS --> ER
```

---

## 15. 虚拟设备数据流（GitHub二次开发）

```mermaid
flowchart TD
    subgraph DeviceSide [传感器端]
        A[定时器触发 Δt=Δs/k] --> B[推进模拟时间 S += Δs]
        B --> C{检查追赶? S > R}
        C -->|是| D[追赶: S=R, k=1]
        C -->|否| E[采集8传感器]
        D --> E
        E --> F[合并数据]
        F --> G[入队 LocalTaskQueue]
        G --> H{正在上报?}
        H -->|否| I[触发上报]
        H -->|是| J[仅入队]
        I --> K[HTTPHelper 逐条POST]
        J --> K
    end
    
    subgraph BackendSide [后端]
        K --> L[UPSERT ReadingTask]
        L --> M{判断补传?}
        M -->|是| N[覆盖补偿数据]
        M -->|否| O[正常接收]
        N --> P[Response code: 0]
        O --> P
    end
    
    subgraph QueueManagement [队列管理]
        P --> Q{上报成功?}
        Q -->|是| R[从队列移除]
        Q -->|否| S[保留在队列]
        R --> T[检查队列空?]
        S --> U[停止上报 等待下次触发]
        T -->|否| K
        T -->|是| V[停止上报循环]
    end
```

---

## 16. 核心模块依赖关系

```mermaid
flowchart TB
    subgraph UserDomain["用户域"]
        AuthModule[认证模块]
        UserModule[用户模块]
    end
    
    subgraph PlantDomain["植物域"]
        PlantModule[植物模块]
        CareModule[养护模块]
        DiagnosisModule[诊断模块]
    end
    
    subgraph DeviceDomain["设备域"]
        DeviceModule[设备模块]
        EnvironmentModule[环境模块]
    end
    
    subgraph AIDomain["AI域"]
        SessionModule[会话模块]
        AIModule[AI模块]
    end
    
    subgraph InfraDomain["基础设施域"]
        FileModule[文件模块]
        LogModule[日志模块]
    end
    
    AuthModule --> UserModule
    UserModule --> PlantModule
    PlantModule --> CareModule
    PlantModule --> DiagnosisModule
    PlantModule --> DeviceModule
    DeviceModule --> EnvironmentModule
    PlantModule --> SessionModule
    SessionModule --> AIModule
    PlantModule --> AIModule
    EnvironmentModule --> AIModule
```

---

## 17. ReadingTask状态流转

```mermaid
flowchart TD
    subgraph 传感器状态
        PENDING1[pending]
        RECEIVED1[received]
        COMPENSATED[compensated]
        FAILED1[failed]
    end
    
    subgraph 天气状态
        PENDING2[pending]
        RECEIVED2[received]
        FAILED2[failed]
    end
    
    PENDING1 -->|正常上报| RECEIVED1
    PENDING1 -->|超时补偿| COMPENSATED
    COMPENSATED -->|补传覆盖| RECEIVED1
    PENDING1 -->|设备故障| FAILED1
    
    PENDING2 -->|API成功| RECEIVED2
    PENDING2 -->|API失败| FAILED2
```

---

## 18. 异步AI分析流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant MiniApp as 小程序
    participant Backend as 后端服务
    participant Queue as 异步队列
    participant AI as AI服务
    participant DB as 数据库
    participant WSS as WebSocket服务

    User->>MiniApp: 发送消息/上传图片
    MiniApp->>Backend: POST /api/sessions/:sessionId/messages
    
    Backend->>DB: INSERT messages (user message)
    Backend->>DB: INSERT placeholder message (AI占位)
    Backend-->>MiniApp: 返回占位消息ID {messageId, placeholder: true}
    
    MiniApp-->>User: 显示用户消息 + "AI分析中..."
    
    par 异步处理
        Backend->>Queue: 提交AI分析任务
        Queue->>AI: 异步调用AI分析
        AI-->>Queue: 分析结果
        Queue->>Backend: 回调处理结果
        
        Backend->>DB: UPDATE placeholder message (填充结果)
        Backend->>DB: INSERT diagnosis_cards (如有诊断)
        
        alt WebSocket连接中
            Backend->>WSS: 推送消息更新
            WSS-->>MiniApp: 实时通知
            MiniApp->>MiniApp: 替换占位消息
        else WebSocket断开
            Backend->>DB: 保存待推送状态
        end
    end
```

---

## 使用说明

1. 打开本文档，找到需要展示的图表
2. 确保浏览器或VS Code安装了Mermaid插件
3. 演示时直接滚动到对应图表

---

## 演示顺序建议

| 顺序 | 图表 | 用途 | 必讲 |
|:---:|:---|:---:|:---:|
| 1 | 系统架构图（整体） | 讲技术架构 | ✅ |
| 2 | 后端分层架构图（详细） | 讲分层设计 | ✅ |
| 3 | 分层架构图（简化） | 快速说明三层 | ✅ |
| 4 | 核心模块依赖关系 | 讲模块划分 | ✅ |
| 5 | 环境数据补偿流程 | 讲数据补偿亮点 | 可选 |
| 6 | 虚拟设备数据流 | 讲GitHub二次开发 | 可选 |
| 7 | CI/CD流水线 | 顺嘴提自动化 | 可选 |
| 8 | 数据库ER图 | 时间充裕时展示 | 可选 |
| 9-18 | 其他时序图 | 被问到时展示 | 备用 |
