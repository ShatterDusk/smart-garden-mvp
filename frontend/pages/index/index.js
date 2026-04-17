// index.js - 首页
const api = require('../../utils/api.js');

Page({
  data: {
    // 用户信息
    greeting: '早上好',
    userNickname: '小园丁',
    notificationCount: 0,
    
    // 植物数据
    plantCount: 0,
    myPlants: [],
    
    // 养护小贴士
    dailyTip: {
      icon: '💧',
      title: '浇水提示',
      content: '夏季多肉植物需减少浇水频率，避免积水烂根。建议每周检查土壤湿度，干透后再浇水。'
    },
    
    // 加载状态
    loading: true
  },

  onLoad() {
    this.initApp();
    this.setGreeting();
  },

  onShow() {
    if (api.getToken()) {
      this.loadHomeData();
    }
  },

  onPullDownRefresh() {
    this.loadHomeData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReady() {
    // 健康环已改用 CSS 实现，无需 Canvas 绘制
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 12 && hour < 18) {
      greeting = '下午好';
    } else if (hour >= 18) {
      greeting = '晚上好';
    }
    this.setData({ greeting });
  },

  // 初始化应用
  initApp() {
    const token = api.getToken();
    if (!token) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    } else {
      this.loadHomeData();
    }
  },

  // 加载首页数据
  loadHomeData() {
    this.setData({ loading: true });
    
    return Promise.all([
      api.getUserProfile(),
      api.getPlantList(),
      api.getDeviceList()
    ]).then((results) => {
      const user = results[0];
      const plants = results[1] || [];
      const devices = results[2] || [];
      
      // 创建设备映射
      const deviceMap = new Map();
      devices.forEach(device => {
        deviceMap.set(device.deviceId, device);
      });
      
      // 处理植物数据
      const emojiMap = {
        succulent: '🌵',
        flower: '🌹',
        foliage: '🌿',
        vegetable: '🥬',
        other: '🌱'
      };
      
      const myPlants = plants.map((plant) => {
        const device = plant.currentDeviceId ? deviceMap.get(plant.currentDeviceId) : null;
        const healthScore = plant.latestDiagnosis ? plant.latestDiagnosis.healthScore : 80;
        const status = plant.latestDiagnosis ? plant.latestDiagnosis.status : 'healthy';
        
        return {
          id: plant.plantId,
          name: plant.nickname,
          type: emojiMap[plant.plantCategory] || '🌱',
          status: status,
          score: healthScore,
          hasDevice: !!plant.currentDeviceId,
          deviceStatus: device ? device.status : 'unbound',
          image: plant.coverImageUrl
        };
      });
      
      // 计算需要关注的植物数（作为通知数）
      const warningCount = plants.filter(p => {
        return p.latestDiagnosis && (p.latestDiagnosis.status === 'warning' || p.latestDiagnosis.status === 'critical');
      }).length;
      
      this.setData({
        userNickname: user.nickname || '小园丁',
        plantCount: plants.length,
        myPlants: myPlants,
        notificationCount: warningCount,
        loading: false
      });
      
      // 健康环已改用 CSS 实现，无需绘制
      
    }).catch((err) => {
      console.error('加载首页数据失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },



  // 刷新养护小贴士
  refreshTip() {
    const tips = [
      { icon: '💧', title: '浇水提示', content: '夏季多肉植物需减少浇水频率，避免积水烂根。建议每周检查土壤湿度，干透后再浇水。' },
      { icon: '☀️', title: '光照提示', content: '保证每天4-6小时的散射光照射，避免强光直射。室内植物可放置在明亮的窗边。' },
      { icon: '🌡️', title: '温度提示', content: '保持环境温度在15-28°C之间，避免温差过大。冬季注意防寒保暖。' },
      { icon: '🌱', title: '施肥提示', content: '生长期每月施肥一次，休眠期停止施肥。薄肥勤施，避免烧根。' },
      { icon: '💨', title: '通风提示', content: '保持良好的通风环境，有助于植物呼吸和减少病虫害发生。' },
      { icon: '✂️', title: '修剪提示', content: '及时修剪枯黄叶片，促进新芽生长。修剪工具要消毒，避免感染。' }
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    this.setData({ dailyTip: randomTip });
  },

  // 页面跳转方法
  goToPlants() {
    wx.navigateTo({
      url: '/pages/plants/plants'
    });
  },

  goToPlantDetail(e) {
    // 防止重复跳转
    if (this._navigatingToDetail) return;
    this._navigatingToDetail = true;
    
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/plant-detail/plant-detail?id=${id}`,
      complete: () => {
        setTimeout(() => {
          this._navigatingToDetail = false;
        }, 500);
      }
    });
  },

  goToAddPlant() {
    wx.navigateTo({
      url: '/pages/add-plant/add-plant'
    });
  },

  goToQuickAnalyze() {
    wx.navigateTo({
      url: '/pages/quick-analyze/quick-analyze'
    });
  },

  goToSessions() {
    wx.navigateTo({
      url: '/pages/sessions/sessions'
    });
  },

  goToNotifications() {
    wx.showToast({
      title: '通知功能开发中',
      icon: 'none'
    });
  },

  goToSettings() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '智能园艺助手 - 让植物养护更简单',
      path: '/pages/index/index'
    };
  }
});
