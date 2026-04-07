// login.js - 登录页面
var api = require('../../utils/api.js');

Page({
  data: {
    isLoading: false
  },

  onLoad: function() {
    // 检查是否已登录
    var token = wx.getStorageSync('auth_token');
    if (token) {
      // 验证token是否有效
      this.checkTokenValid(token);
    }
  },

  // 检查token是否有效
  checkTokenValid: function(token) {
    var that = this;
    api.getUserProfile()
      .then(function() {
        // token有效，跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      })
      .catch(function(err) {
        // token无效，清除存储
        wx.removeStorageSync('auth_token');
        wx.removeStorageSync('user_info');
      });
  },

  // 微信登录
  handleWechatLogin: function() {
    var that = this;
    this.setData({ isLoading: true });

    // 获取微信登录凭证
    wx.login({
      success: function(res) {
        if (res.code) {
          // 调用后端登录接口
          that.loginWithCode(res.code);
        } else {
          that.setData({ isLoading: false });
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      },
      fail: function() {
        that.setData({ isLoading: false });
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 使用code登录
  loginWithCode: function(code) {
    var that = this;

    // 调试日志
    console.log('登录参数:', { code: code });

    // 调用后端登录接口
    api.login({
      code: code,
      nickname: '微信用户',
      avatarUrl: '',
      gender: 0
    })
      .then(function(result) {
        that.setData({ isLoading: false });

        // 保存token和用户信息
        wx.setStorageSync('auth_token', result.token);
        wx.setStorageSync('user_info', result.user);

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 跳转到首页
        setTimeout(function() {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      })
      .catch(function(err) {
        that.setData({ isLoading: false });
        wx.showToast({
          title: err.message || '登录失败',
          icon: 'none'
        });
      });
  },

  // 游客登录
  handleGuestLogin: function() {
    var that = this;
    this.setData({ isLoading: true });

    api.guestLogin()
      .then(function(result) {
        that.setData({ isLoading: false });
        
        // 保存token和用户信息
        wx.setStorageSync('auth_token', result.token);
        wx.setStorageSync('user_info', result.user);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 跳转到首页
        setTimeout(function() {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      })
      .catch(function(err) {
        that.setData({ isLoading: false });
        wx.showToast({
          title: err.message || '登录失败',
          icon: 'none'
        });
      });
  },

  // 显示用户协议
  showUserAgreement: function() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议内容...',
      showCancel: false
    });
  },

  // 显示隐私政策
  showPrivacyPolicy: function() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策内容...',
      showCancel: false
    });
  }
});
