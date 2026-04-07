// plant-sessions.js - 植物会话列表页
// 引入 API 服务
const api = require('../../utils/api.js');
const textUtils = require('../../utils/text-utils.js');

Page({
  data: {
    plantId: '',
    plantInfo: {
      plantId: '',
      nickname: '',
      species: '',
      coverImageUrl: ''
    },
    sessionList: [],
    loading: true
  },

  onLoad: function(options) {
    var plantId = options.plantId;
    
    if (!plantId) {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(function() {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ plantId: plantId });
    this.loadPlantInfo();
    this.loadSessionList();
  },

  loadPlantInfo: function() {
    var that = this;
    
    api.getPlantDetail(this.data.plantId).then(function(plant) {
      if (plant) {
        that.setData({
          plantInfo: {
            plantId: plant.plantId,
            nickname: plant.nickname,
            species: plant.species,
            coverImageUrl: plant.coverImageUrl
          }
        });
        
        wx.setNavigationBarTitle({
          title: plant.nickname + '的会话'
        });
      }
    }).catch(function(err) {
      console.error('加载植物信息失败:', err);
    });
  },

  loadSessionList: function() {
    var that = this;
    this.setData({ loading: true });
    
    api.getSessionList(null, this.data.plantId).then(function(sessions) {
      var sessionList = (sessions || []).map(function(session) {
        var lastMessageContent = session.lastMessage ? textUtils.extractMessagePreview(session.lastMessage.content, 50) : '暂无消息';
        return {
          sessionId: session.sessionId,
          title: session.title,
          lastMessage: lastMessageContent,
          lastTime: session.lastMessage ? that.formatTime(new Date(session.lastMessage.createdAt)) : '',
          messageCount: session.messageCount || 0
        };
      });
      
      that.setData({
        sessionList: sessionList,
        loading: false
      });
    }).catch(function(err) {
      console.error('加载会话列表失败:', err);
      that.setData({
        sessionList: [],
        loading: false
      });
    });
  },

  formatTime: function(date) {
    var hours = date.getHours().toString().padStart(2, '0');
    var minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  createNewSession: function() {
    var that = this;
    var plantId = this.data.plantId;
    var plantInfo = this.data.plantInfo;
    
    api.createSession({
      type: 'plant',
      plantId: plantId,
      title: plantInfo.nickname + '的咨询'
    }).then(function(session) {
      wx.navigateTo({
        url: '/pages/qna/qna?sessionType=plant&sessionId=' + session.sessionId + '&plantId=' + plantId + '&title=' + encodeURIComponent(session.title)
      });
    }).catch(function(err) {
      console.error('创建会话失败:', err);
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      });
    });
  },

  enterSession: function(e) {
    var sessionId = e.currentTarget.dataset.id;
    var title = e.currentTarget.dataset.title;
    var plantId = this.data.plantId;

    wx.navigateTo({
      url: '/pages/qna/qna?sessionType=plant&sessionId=' + sessionId + '&plantId=' + plantId + '&title=' + encodeURIComponent(title)
    });
  },

  goBack: function() {
    wx.navigateBack();
  }
});
