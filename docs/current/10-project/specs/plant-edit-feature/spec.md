# 植物编辑功能 - 规格说明

## 目标
实现植物档案编辑功能，支持双入口（列表页长按菜单 + 详情页编辑按钮），全部导向 add-plant 页面编辑模式。

## 入口位置

### 入口1：plants 列表页 - 长按菜单
**位置**: `pages/plants/plants.js` - `onPlantLongPress` 方法
**触发**: 长按植物卡片 → 弹出 ActionSheet → 选择"编辑"
**跳转**: `/pages/add-plant/add-plant?mode=edit&id=PLANT_ID`

### 入口2：plant-detail 详情页 - 编辑按钮
**位置**: `pages/plant-detail/plant-detail.wxml` - 右上角操作区域
**触发**: 点击编辑图标（✏️）
**跳转**: `/pages/add-plant/add-plant?mode=edit&id=PLANT_ID`

## 需要修改的文件

| 文件 | 修改内容 |
|:---|:---|
| `pages/add-plant/add-plant.js` | 支持编辑模式：加载植物数据、更新表单提交 |
| `pages/add-plant/add-plant.wxml` | 编辑模式显示标题"编辑植物"，创建模式显示"添加植物" |
| `pages/plants/plants.js` | 长按菜单"编辑"选项实现跳转 |
| `pages/plant-detail/plant-detail.wxml` | 添加编辑按钮 |
| `pages/plant-detail/plant-detail.js` | 编辑按钮点击事件 |
| `utils/mock-data.js` | 添加 `updatePlant` 方法 |

## add-plant 页面编辑模式逻辑

### onLoad 处理
```javascript
onLoad: function(options) {
  var mode = options.mode || 'create'; // 'create' | 'edit'
  var plantId = options.id;
  
  if (mode === 'edit' && plantId) {
    this.setData({ 
      mode: 'edit',
      plantId: plantId,
      pageTitle: '编辑植物'
    });
    this.loadPlantData(plantId);
  } else {
    this.setData({ 
      mode: 'create',
      pageTitle: '添加植物'
    });
  }
}
```

### 加载植物数据
```javascript
loadPlantData: function(plantId) {
  var plant = mock.getPlantDetail(plantId);
  if (plant) {
    this.setData({
      nickname: plant.nickname,
      species: plant.species,
      plantCategory: plant.plantCategory,
      coverImageUrl: plant.coverImageUrl,
      // ... 其他字段
    });
  }
}
```

### 表单提交处理
```javascript
submitForm: function() {
  if (this.data.mode === 'edit') {
    this.updatePlant();
  } else {
    this.createPlant();
  }
}
```

## mock-data 添加方法

```javascript
// 更新植物信息
updatePlant: function(plantId, updateData) {
  this._initPlants();
  
  var plant = this.plants.find(function(p) {
    return p.plant_id === plantId;
  });
  
  if (!plant) return false;
  
  // 更新字段
  Object.assign(plant, updateData, {
    updated_at: new Date().toISOString()
  });
  
  // 保存到本地存储
  wx.setStorageSync('mock_plants', this.plants);
  return true;
}
```

## 验收标准

- [ ] plants 列表页长按菜单有"编辑"选项
- [ ] plant-detail 详情页有编辑按钮
- [ ] 两个入口都跳转到 add-plant 页面并携带 mode=edit&id=xxx
- [ ] add-plant 页面编辑模式正确加载植物数据
- [ ] add-plant 页面编辑模式显示"编辑植物"标题
- [ ] 编辑后保存成功，数据更新
- [ ] 编辑完成后返回上一页
