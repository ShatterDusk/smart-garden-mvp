# TabBar 配置计划

## 背景

用户希望微信小程序的 tabBar 只有两个页面：
1. `pages/login/login` - 登录页
2. `pages/index/index` - 首页

## 当前状态

- `app.json` 中没有 tabBar 配置
- `app.json` 的 pages 数组中没有 `pages/login/login`
- `pages/login/` 目录存在（login.js, login.json, login.wxml, login.wxss）

## 实施步骤

### Step 1: 添加登录页面到 pages 数组

将 `pages/login/login` 添加到 `app.json` 的 pages 数组首位（作为小程序入口页面）

### Step 2: 配置 tabBar

在 `app.json` 中添加 tabBar 配置，只包含两个页面：
- 首页 (pages/index/index)
- 我的 (pages/login/login) - 注：用户指定 login 作为 tabBar 页面

### Step 3: 检查登录页面配置

确认 `pages/login/login.json` 配置正确

## 注意事项

- 登录页面作为 tabBar 页面是用户明确要求的
- tabBar 页面必须在 pages 数组中
- 微信小程序 tabBar 最多 5 个页面，最少 2 个页面

## 预期结果

修改后的 `app.json` 结构：

```json
{
  "pages": [
    "pages/login/login",
    "pages/index/index",
    "pages/sessions/sessions",
    "pages/qna/qna",
    "pages/plants/plants",
    ...
  ],
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#4CAF50",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页"
      },
      {
        "pagePath": "pages/login/login",
        "text": "我的"
      }
    ]
  }
}
```
