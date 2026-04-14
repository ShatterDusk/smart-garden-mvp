# 传感器系统实施 Checklist

## Phase 1: 本地任务队列

- [ ] LocalTaskQueue 核心类已创建
  - [ ] `app/core/local_task_queue.py` 文件存在
  - [ ] `add()` 方法正确实现（溢出覆盖最老）
  - [ ] `get_next()` 方法正确实现
  - [ ] `remove()` 方法正确实现
  - [ ] `align_time()` 方法对齐到2小时整点
  - [ ] `persist()` / `restore()` 方法正确实现 JSON 持久化
  - [ ] `get_all_pending()` 方法正确实现

- [ ] 核心模块初始化
  - [ ] `app/core/__init__.py` 文件存在

## Phase 2: Sensor 追赶逻辑

- [ ] Sensor 类追赶逻辑实现
  - [ ] 追赶状态初始化（S, R, k, Δs, has_caught_up）正确
  - [ ] `_schedule_next()` 动态间隔计算正确（Δt = Δs / k，最小间隔 100ms）
  - [ ] `_on_trigger()` 执行顺序正确：
    - [ ] 1. 更新 R = datetime.now()
    - [ ] 2. 推进 S += Δs × k（先推进！）
    - [ ] 3. 判断 S > R（后判断！）
    - [ ] 4. 追赶时 k=1, has_caught_up=True
  - [ ] `align_to_interval(S)` 对齐到整点周期正确
  - [ ] 并发控制超时机制正确（CALLBACK_TIMEOUT=30s，signal.alarm）
  - [ ] TIME_ACCELERATION 上限约束正确（MAX_TIME_ACCELERATION=3600）
  - [ ] 错误处理和日志正确

- [ ] Simulator 更新
  - [ ] `generate_data()` 支持 timestamp 参数
  - [ ] timestamp 正确传递给数据记录

## Phase 3: Device 层

- [ ] Device 类简化
  - [ ] 接收 Sensor 数据的 callback 正确
  - [ ] 调用 HTTPHelper.send_data() 上报正确
  - [ ] 不再包含 LocalTaskQueue（队列在 HTTPHelper 层）

## Phase 4: HTTPHelper 层（集成队列）

- [ ] HTTPHelper 集成 LocalTaskQueue
  - [ ] 初始化时创建 LocalTaskQueue 并 restore()
  - [ ] `send_data()` 入队方法正确（接收 Sensor 数据，加入队列）
  - [ ] `_upload_pending()` 逐条上报方法正确（成功移除，失败保留并 break）
  - [ ] `_start_upload_loop()` 定时上报循环正确（DATA_SYNC_INTERVAL）
  - [ ] 每次操作后 persist() 正确

## Phase 5: 后端适配

- [ ] EnvironmentService 验证
  - [ ] `calculateIsSupplement()` 实现正确
  - [ ] `alignToInterval()` 实现正确（对齐到偶数小时）
  - [ ] UPSERT 逻辑正确

## Phase 6: 配置与测试

- [ ] 环境变量配置
  - [ ] `.env` 包含 SENSOR_INTERVAL（默认7200000）
  - [ ] `.env` 包含 TIME_ACCELERATION（默认1，上限3600）
  - [ ] `.env` 包含 DATA_SYNC_INTERVAL（默认7200000）
  - [ ] `.env` 包含 LOCAL_QUEUE_SIZE（默认50）
  - [ ] `.env` 包含 QUEUE_PERSIST_PATH（默认./data/queue.json）

- [ ] 追赶逻辑单元测试
  - [ ] S += Δs × k 在前，S > R 判断在后 测试
  - [ ] align_to_interval 对齐到2小时整点测试
  - [ ] S > R 触发追赶，k=1 测试
  - [ ] has_caught_up=True 后不再检查追赶 测试
  - [ ] CALLBACK_TIMEOUT 超时触发测试
  - [ ] MAX_TIME_ACCELERATION=3600 上限约束测试
  - [ ] 数据 timestamp 使用 align_to_interval(S) 测试

- [ ] LocalTaskQueue 单元测试
  - [ ] 溢出覆盖最老测试
  - [ ] align_time 对齐测试
  - [ ] 持久化/恢复测试
  - [ ] get_all_pending 测试

- [ ] 集成测试
  - [ ] Sensor → Device → HTTPHelper 全链路测试
  - [ ] 追赶后数据 timestamp 已对齐测试
  - [ ] HTTPHelper 队列入队→上报→移除流程测试
  - [ ] 后端 UPSERT 逻辑测试

---

## 功能验收

- [ ] 模拟器能定时生成数据并对齐到2小时整点
- [ ] 模拟器支持时间加速（TIME_ACCELERATION，上限3600）
- [ ] 模拟器追赶逻辑执行顺序正确（先推进后判断）
- [ ] 模拟器时间追上真实时间后恢复正常流速（k=1）
- [ ] 模拟器回调超时时能正确处理（30s超时）
- [ ] 模拟器数据通过 Device → HTTPHelper → 队列 流转
- [ ] HTTPHelper 能将数据存储到本地队列并持久化到JSON
- [ ] 队列满时覆盖最老数据
- [ ] HTTPHelper 能逐条上报队列中的数据
- [ ] 服务器返回成功后，数据才从队列中移除
- [ ] 网络失败时，数据保留在队列中，下次继续尝试
- [ ] 程序重启后，队列数据能从JSON文件恢复
- [ ] 补传数据能正确覆盖补偿数据
- [ ] 后端按 recorded_at UPSERT，不重复创建

---

## 验收签字

| 检查项 | 检查人 | 日期 | 状态 |
|:---|:---|:---:|:---:|
| Phase 1 | | | |
| Phase 2 | | | |
| Phase 3 | | | |
| Phase 4 | | | |
| Phase 5 | | | |
| Phase 6 | | | |
| 功能验收 | | | |
