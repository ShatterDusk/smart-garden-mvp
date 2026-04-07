// app.js - 应用入口
App({
  globalData: {
    userInfo: null,
    systemInfo: null
  },

  onLaunch() {
    console.log('App Launch');
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    console.log('App Show');
  },

  onHide() {
    console.log('App Hide');
  },

  onError(msg) {
    console.log('App Error:', msg);
  },

  // 获取系统信息（使用新 API）
  getSystemInfo() {
    // 使用 wx.getDeviceInfo 和 wx.getWindowInfo 替代已弃用的 wx.getSystemInfo
    const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
    const appBaseInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
    
    this.globalData.systemInfo = {
      ...deviceInfo,
      ...windowInfo,
      ...appBaseInfo
    };
    console.log('SystemInfo:', this.globalData.systemInfo);
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      console.log('User logged in:', userInfo);
    } else {
      console.log('User not logged in');
    }
  }
});
