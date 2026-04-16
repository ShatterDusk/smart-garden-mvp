# 虚拟传感器系统时序图

## 1. 正常数据采集与上报时序

```mermaid
sequenceDiagram
    autonumber
    participant Timer as 定时器 (Δt=Δs/k)
    participant Device as DeviceCustom
    participant Sim as Simulator (×8)
    participant Queue as LocalTaskQueue
    participant HTTP as HTTPHelper
    participant Backend as 后端服务

    Note over Timer,Backend: 初始状态: S=2026-04-10T00:00, R=now(), k=240

    %% 第一次采集周期
    Timer->>Device: 触发 (30秒后)
    activate Device
    
    Device->>Device: S += Δs (推进2小时)
    Device->>Device: R = now()
    Device->>Device: 检查 S > R? (否,继续)
    
    loop 8个传感器
        Device->>Sim: generate_data(timestamp=S)
        Sim-->>Device: {sensorName, value, unit}
    end
    
    Device->>Device: 合并8传感器数据
    Device->>Queue: add(recorded_at=S, metrics)
    activate Queue
    Queue-->>Device: 入队成功
    
    Note right of Queue: 队列状态: [04-10T02:00]
    
    Queue->>HTTP: 触发上报 (新数据入队)
    deactivate Queue
    deactivate Device
    
    activate HTTP
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: [04-10T02:00]
    
    HTTP->>Backend: POST /api/devices/data<br/>{deviceId, plantId, timestamp, metrics}
    activate Backend
    Backend->>Backend: UPSERT ReadingTask<br/>sensor_status=RECEIVED
    Backend-->>HTTP: {code: 0, message: "success"}
    deactivate Backend
    
    HTTP->>Queue: remove(04-10T02:00)
    activate Queue
    Queue-->>HTTP: 移除成功
    deactivate Queue
    
    Note right of Queue: 队列状态: []
    
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: [] (空)
    HTTP->>HTTP: 无数据, 停止上报循环
    deactivate HTTP

    Note over Timer,Backend: 等待下一次定时器触发...
```

## 2. 网络失败与重试时序

```mermaid
sequenceDiagram
    autonumber
    participant Device as DeviceCustom
    participant Queue as LocalTaskQueue
    participant HTTP as HTTPHelper
    participant Backend as 后端服务

    Note over Device,Backend: 场景: 网络中断, 上报失败

    Device->>Queue: add(recorded_at=S, metrics)
    activate Queue
    Queue->>HTTP: 触发上报
    deactivate Queue
    
    activate HTTP
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: [04-10T02:00]
    
    HTTP->>Backend: POST /api/devices/data
    Backend--xHTTP: 连接失败 (网络中断)
    
    Note right of HTTP: 上报失败, 停止本次循环<br/>数据保留在队列中
    
    HTTP->>HTTP: 停止上报 (不remove)
    deactivate HTTP
    
    Note over Queue: 队列状态: [04-10T02:00] (保留)

    %% 第二次采集周期
    Device->>Queue: add(recorded_at=S+2h, metrics)
    activate Queue
    Queue->>HTTP: 触发上报
    deactivate Queue
    
    activate HTTP
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: [04-10T02:00, 04-10T04:00] (2条)
    
    HTTP->>Backend: POST 04-10T02:00
    Backend-->>HTTP: {code: 0} (网络恢复)
    HTTP->>Queue: remove(04-10T02:00)
    
    HTTP->>Backend: POST 04-10T04:00
    Backend-->>HTTP: {code: 0}
    HTTP->>Queue: remove(04-10T04:00)
    
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: []
    HTTP->>HTTP: 停止上报
    deactivate HTTP
    
    Note over Queue: 队列状态: [] (全部送达)
```

## 3. 追赶逻辑时序

```mermaid
sequenceDiagram
    autonumber
    participant Timer as 定时器
    participant Device as DeviceCustom
    participant Queue as LocalTaskQueue
    participant HTTP as HTTPHelper
    participant Backend as 后端服务

    Note over Timer,Backend: 场景: 经过60次触发, 即将追上真实时间<br/>S=2026-04-15T00:00, R≈09:30:00

    Timer->>Device: 触发 (第61次)
    activate Device
    
    Device->>Device: S += Δs (04-15T00:00 → 04-15T02:00)
    Device->>Device: R = now() (≈09:30:30)
    Device->>Device: 检查 S > R? <br/>04-15T02:00 > 09:30:30? 是!
    
    Note right of Device: 触发追赶逻辑
    
    Device->>Device: S = R (重置为09:30:30)
    Device->>Device: k = 1 (恢复常速)
    Device->>Device: has_caught_up = true
    
    Note right of Device: 追赶完成, 恢复正常速度
    
    Device->>Sim: 生成数据 (timestamp=09:30:30)
    Sim-->>Device: sensor_data
    Device->>Queue: add(recorded_at=09:30:30, metrics)
    Queue->>HTTP: 触发上报
    deactivate Device
    
    HTTP->>Backend: POST (timestamp=09:30:30)
    Backend-->>HTTP: success
    HTTP->>Queue: remove

    Note over Timer,Backend: 下一次触发: Δt = Δs/k = 2h/1 = 2小时<br/>真实等待2小时后再次采集
```

## 4. 并发控制时序（防止重复上报）

```mermaid
sequenceDiagram
    autonumber
    participant Device as DeviceCustom
    participant Queue as LocalTaskQueue
    participant HTTP as HTTPHelper

    Note over Device,HTTP: 场景: 数据快速入队, 避免并发上报

    %% 第一次入队, 启动上报
    Device->>Queue: add(数据A)
    activate Queue
    Queue->>HTTP: 触发上报
    deactivate Queue
    
    activate HTTP
    Note right of HTTP: is_uploading = true
    
    %% 第二次入队, 正在上报中
    Device->>Queue: add(数据B)
    activate Queue
    Queue->>Queue: 检查 is_uploading?
    Note right of Queue: 是, 只入队不触发
    Queue-->>Device: 入队成功
    deactivate Queue
    
    Note over HTTP: 正在发送数据A...
    HTTP->>Backend: POST 数据A
    Backend-->>HTTP: success
    HTTP->>Queue: remove(数据A)
    
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: [数据B]
    
    Note right of HTTP: 发现还有数据, 继续发送
    HTTP->>Backend: POST 数据B
    Backend-->>HTTP: success
    HTTP->>Queue: remove(数据B)
    
    HTTP->>Queue: get_all_pending()
    Queue-->>HTTP: []
    HTTP->>HTTP: is_uploading = false
    deactivate HTTP
```

## 5. 完整数据流总结

```mermaid
flowchart TD
    subgraph DeviceSide [传感器端]
        A[定时器触发<br/>Δt = Δs/k] --> B[推进模拟时间<br/>S += Δs]
        B --> C{检查追赶?<br/>S > R}
        C -->|是| D[追赶: S=R, k=1]
        C -->|否| E[采集8传感器]
        D --> E
        E --> F[合并数据]
        F --> G[入队 LocalTaskQueue]
        G --> H{正在上报?}
        H -->|否| I[触发上报]
        H -->|是| J[仅入队]
        I --> K[HTTPHelper<br/>逐条POST]
        J --> K
    end
    
    subgraph BackendSide [后端]
        K --> L[UPSERT ReadingTask]
        L --> M{判断补传?}
        M -->|是| N[覆盖补偿数据]
        M -->|否| O[正常接收]
        N --> P[Response<br/>code: 0]
        O --> P
    end
    
    subgraph QueueManagement [队列管理]
        P --> Q{上报成功?}
        Q -->|是| R[从队列移除]
        Q -->|否| S[保留在队列]
        R --> T[检查队列空?]
        S --> U[停止上报<br/>等待下次触发]
        T -->|否| K
        T -->|是| V[停止上报循环]
    end
```

## 关键设计点

| 设计点 | 说明 |
|:---|:---|
| **触发时机** | 新数据入队时触发上报（非定时） |
| **上报策略** | 逐条POST，成功移除，失败保留 |
| **并发控制** | 正在上报时，新数据只入队不触发新循环 |
| **追赶逻辑** | S > R 时，S=R, k=1，恢复常速 |
| **队列溢出** | FIFO，覆盖最老数据 |
