# Tasks

## Phase 1: 本地任务队列（基础层）

- [ ] Task 1: 创建 LocalTaskQueue 核心类
  - [ ] SubTask 1.1: 创建 `app/core/local_task_queue.py`
  - [ ] SubTask 1.2: 实现 `add()` 方法（溢出覆盖最老）
  - [ ] SubTask 1.3: 实现 `get_next()` 方法
  - [ ] SubTask 1.4: 实现 `remove()` 方法
  - [ ] SubTask 1.5: 实现 `align_time()` 方法
  - [ ] SubTask 1.6: 实现 `persist()` / `restore()` 方法
  - [ ] SubTask 1.7: 实现 `get_all_pending()` 方法

- [ ] Task 2: 创建核心模块初始化
  - [ ] SubTask 2.1: 创建 `app/core/__init__.py`

## Phase 2: Sensor 追赶逻辑实现

- [ ] Task 3: 改造 Sensor 类（追赶逻辑）
  - [ ] SubTask 3.1: 添加追赶逻辑状态初始化（S, R, k, Δs, has_caught_up）
  - [ ] SubTask 3.2: 实现 `_schedule_next()` 动态间隔方法（Δt = Δs / k，最小间隔 100ms）
  - [ ] SubTask 3.3: 实现 `_on_trigger()` 追赶逻辑（执行顺序：先 S += Δs × k，后判断 S > R）
  - [ ] SubTask 3.4: 实现 `align_to_interval()` 函数（对齐到2小时整点）
  - [ ] SubTask 3.5: 实现并发控制超时机制（CALLBACK_TIMEOUT = 30s，signal.alarm）
  - [ ] SubTask 3.6: 添加 TIME_ACCELERATION 上限约束（MAX_TIME_ACCELERATION = 3600）
  - [ ] SubTask 3.7: 更新 `stop_simulation()` 方法

- [ ] Task 4: 更新 Simulator 生成数据方法
  - [ ] SubTask 4.1: 修改 `generate_data()` 支持 timestamp 参数
  - [ ] SubTask 4.2: 确保 timestamp 用于数据记录

## Phase 3: Device 层简化

- [ ] Task 5: 简化 Device 类
  - [ ] SubTask 5.1: 移除数据生成逻辑（交给 Sensor）
  - [ ] SubTask 5.2: 简化为接收+上报模式（调用 HTTPHelper.send_data）

## Phase 4: HTTPHelper 层适配（集成队列）

- [ ] Task 6: 改造 HTTPHelper（集成 LocalTaskQueue）
  - [ ] SubTask 6.1: 集成 LocalTaskQueue（初始化 + restore）
  - [ ] SubTask 6.2: 实现 `send_data()` 入队方法（接收 Sensor 数据，加入队列）
  - [ ] SubTask 6.3: 实现 `_upload_pending()` 逐条上报方法（成功移除，失败保留）
  - [ ] SubTask 6.4: 实现 `_start_upload_loop()` 定时上报循环（DATA_SYNC_INTERVAL）
  - [ ] SubTask 6.5: 确保队列持久化（每次 add/remove 后 persist）

## Phase 5: 后端适配

- [ ] Task 7: 后端 EnvironmentService 验证
  - [ ] SubTask 7.1: 确认 calculateIsSupplement 实现正确
  - [ ] SubTask 7.2: 确认 alignToInterval 实现正确

## Phase 6: 配置与测试

- [ ] Task 8: 环境变量配置
  - [ ] SubTask 8.1: 更新 `.env` 配置示例
  - [ ] SubTask 8.2: 添加追赶逻辑相关变量（TIME_ACCELERATION, SENSOR_INTERVAL, CALLBACK_TIMEOUT）
  - [ ] SubTask 8.3: 添加队列相关变量（LOCAL_QUEUE_SIZE, QUEUE_PERSIST_PATH, DATA_SYNC_INTERVAL）

- [ ] Task 9: 单元测试
  - [ ] SubTask 9.1: 测试追赶逻辑执行顺序（S += Δs × k 在前，判断在后）
  - [ ] SubTask 9.2: 测试 align_to_interval 对齐到2小时整点
  - [ ] SubTask 9.3: 测试追赶后 k=1 恢复正常
  - [ ] SubTask 9.4: 测试并发控制超时机制（CALLBACK_TIMEOUT）
  - [ ] SubTask 9.5: 测试 TIME_ACCELERATION 上限约束（MAX_TIME_ACCELERATION = 3600）
  - [ ] SubTask 9.6: 测试 LocalTaskQueue 溢出覆盖最老
  - [ ] SubTask 9.7: 测试 LocalTaskQueue 持久化/恢复

- [ ] Task 10: 集成测试
  - [ ] SubTask 10.1: 测试 Sensor → Device → HTTPHelper 全链路
  - [ ] SubTask 10.2: 测试追赶后数据上报正确（timestamp 已对齐）
  - [ ] SubTask 10.3: 测试 HTTPHelper 队列入队→上报→移除流程
  - [ ] SubTask 10.4: 测试后端 UPSERT 逻辑

---

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 1, Task 5]
- [Task 7] depends on []
- [Task 8] depends on []
- [Task 9] depends on [Task 3, Task 4, Task 5, Task 6]
- [Task 10] depends on [Task 7, Task 8]

---

# Parallelizable Tasks

以下任务可以并行执行：
- Task 1, Task 2 (基础设施)
- Task 7, Task 8 (后端和配置)
