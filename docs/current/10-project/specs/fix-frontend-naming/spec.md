# 前端命名规范化 Spec

## Why

当前前端代码中存在命名不一致的问题：
1. 部分页面使用 snake_case（如 `plant_id`）
2. 部分页面使用 camelCase（如 `plantId`）
3. 与 Mock 数据返回的 camelCase 格式不一致

需要统一前端所有代码为 camelCase，确保与 Mock 数据返回格式一致。

## What Changes

### 1. 统一前端命名为 camelCase
- 所有变量、函数参数、对象属性使用 camelCase
- 移除所有 snake_case 命名

### 2. 处理耦合关系
- 检查与 Mock 数据的交互点
- 检查页面间参数传递
- 检查组件属性传递
- 确保修改后数据流正常

### 3. 涉及的文件
- `pages/index/index.js`
- `pages/plants/plants.js`
- `pages/plant-detail/plant-detail.js`
- `pages/add-plant/add-plant.js`
- `pages/sessions/sessions.js`
- `pages/qna/qna.js`
- `pages/plant-sessions/plant-sessions.js`
- `pages/quick-analyze/quick-analyze.js`
- `pages/metric-detail/metric-detail.js`
- `pages/device-manage/device-manage.js`
- `pages/device-detail/device-detail.js`
- `components/*/*.js`

## ADDED Requirements

### Requirement: 命名规范统一
The system SHALL ensure all frontend JavaScript code uses camelCase naming convention:

#### Scenario: 变量命名
- **GIVEN** 前端代码中的变量
- **WHEN** 命名包含多个单词
- **THEN** 使用 camelCase（如 `plantId`, `deviceInfo`）

#### Scenario: 对象属性
- **GIVEN** 对象属性名
- **WHEN** 属性名包含多个单词
- **THEN** 使用 camelCase（如 `coverImageUrl`）

#### Scenario: 函数参数
- **GIVEN** 函数参数
- **WHEN** 参数名包含多个单词
- **THEN** 使用 camelCase（如 `plantId`, `sessionType`）

### Requirement: 数据流兼容性
The system SHALL maintain data flow compatibility:

#### Scenario: Mock 数据交互
- **GIVEN** Mock 数据返回 camelCase 格式
- **WHEN** 前端接收数据
- **THEN** 直接使用，无需转换

#### Scenario: 页面间参数传递
- **GIVEN** 页面 A 跳转到页面 B
- **WHEN** 传递参数
- **THEN** 使用 camelCase 命名参数

#### Scenario: 组件属性
- **GIVEN** 父组件传递属性给子组件
- **WHEN** 属性名包含多个单词
- **THEN** 使用 camelCase（如 `plantId`, `deviceInfo`）

## MODIFIED Requirements

### Requirement: 前端代码命名规范
All frontend JavaScript code SHALL use camelCase naming convention consistently.

**Breaking Changes**: 
- 修改 snake_case 为 camelCase
- 需要检查所有引用该变量的地方
- 需要检查模板中的数据绑定

**Migration Guide**:
1. 搜索所有 snake_case 变量
2. 替换为 camelCase
3. 检查模板中的绑定
4. 检查组件属性
5. 测试数据流
