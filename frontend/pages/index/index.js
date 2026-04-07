// index.js - 首页
// 引入 API 服务
const api = require('../../utils/api.js');

Page({
  data: {
    welcomeMessage: '',
    plantCount: 0,
    healthyCount: 0,
    warningCount: 0,
    pendingTasks: 0,
    myPlants: [],
    dailyTip: {
      icon: '💡',
      title: '今日养护小贴士',
      content: ''
    },
    deviceStatus: {
      online: 0,
      offline: 0,
      unbound: 0
    },
    loading: true,
    notificationCount: 0
  },

  onLoad() {
    this.initApp();
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

  refreshDashboard() {
    this.loadHomeData();
  },

  initApp() {
    const that = this;
    const token = api.getToken();

    if (!token) {
      this.setData({ loading: true });
      // 没有token时跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
    } else {
      this.loadHomeData();
    }
  },

  loadHomeData() {
    const that = this;
    this.setData({ loading: true });
    
    return Promise.all([
      api.getUserProfile(),
      api.getPlantList(),
      api.getDeviceList()
    ]).then(function(results) {
      const user = results[0];
      const plants = results[1] || [];
      const devices = results[2] || [];
      
      const plantCount = plants.length;
      const healthyCount = plants.filter(function(p) { 
        return p.latestDiagnosis && p.latestDiagnosis.status === 'healthy'; 
      }).length;
      const warningCount = plants.filter(function(p) { 
        return p.latestDiagnosis && (p.latestDiagnosis.status === 'warning' || p.latestDiagnosis.status === 'critical'); 
      }).length;
      
      const deviceStatus = {
        online: devices.filter(function(d) { return d.status === 'online'; }).length,
        offline: devices.filter(function(d) { return d.status === 'offline'; }).length,
        unbound: devices.filter(function(d) { return d.status === 'unbound'; }).length
      };
      
      const emojiMap = {
        succulent: '🌵',
        flower: '🌹',
        foliage: '🌿',
        vegetable: '🥬'
      };
      
      const myPlants = plants.map(function(plant) {
        return {
          id: plant.plantId,
          name: plant.nickname,
          type: emojiMap[plant.plantCategory] || '🌱',
          status: plant.latestDiagnosis ? plant.latestDiagnosis.status : 'healthy',
          score: plant.latestDiagnosis ? plant.latestDiagnosis.healthScore : 80,
          hasDevice: !!plant.currentDeviceId,
          image: plant.coverImageUrl
        };
      });
      
      const tips = [
        { icon: '💧', title: '浇水提示', content: '夏季多肉植物需减少浇水频率，避免积水烂根' },
        { icon: '☀️', title: '光照提示', content: '保证每天4-6小时的散射光照射，避免强光直射' },
        { icon: '🌡️', title: '温度提示', content: '保持环境温度在15-28°C之间，避免温差过大' },
        { icon: '🌱', title: '施肥提示', content: '生长期每月施肥一次，休眠期停止施肥' }
      ];
      const dailyTip = tips[Math.floor(Math.random() * tips.length)];
      
      that.setData({
        welcomeMessage: '早上好' + (user.nickname || '用户') + '！',
        plantCount: plantCount,
        healthyCount: healthyCount,
        warningCount: warningCount,
        pendingTasks: warningCount,
        myPlants: myPlants,
        dailyTip: dailyTip,
        deviceStatus: deviceStatus,
        notificationCount: warningCount,
        loading: false
      });
    }).catch(function(err) {
      console.error('加载首页数据失败:', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },

  goToPlants() {
    wx.navigateTo({
      url: '/pages/plants/plants'
    });
  },

  goToPlantDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/plant-detail/plant-detail?id=' + id
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

  goToDevices() {
    wx.navigateTo({
      url: '/pages/device-manage/device-manage'
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

  goToProfile() {
    wx.showToast({
      title: '个人中心开发中',
      icon: 'none'
    });
  },

  goToSettings() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  goToIdentify() {
    wx.navigateTo({
      url: '/pages/quick-analyze/quick-analyze'
    });
  },

  goToQna() {
    wx.navigateTo({
      url: '/pages/sessions/sessions'
    });
  },

  goToExpert() {
    wx.showToast({
      title: '专家咨询开发中',
      icon: 'none'
    });
  },

  handleTask(e) {
    const { type } = e.currentTarget.dataset;
    
    switch(type) {
      case 'water':
        wx.showToast({ title: '已提醒浇水', icon: 'success' });
        break;
      case 'fertilize':
        wx.showToast({ title: '已提醒施肥', icon: 'success' });
        break;
      case 'check':
        wx.navigateTo({
          url: '/pages/plant-detail/plant-detail?id=PLANT_002'
        });
        break;
    }
  },

  onShareAppMessage() {
    return {
      title: '智能园艺助手 - 让植物养护更简单',
      path: '/pages/index/index'
    };
  }
});
