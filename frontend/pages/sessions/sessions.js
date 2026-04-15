// sessions.js - 会话列表页
// 引入 API 服务
const api = require('../../utils/api.js');
const textUtils = require('../../utils/text-utils.js');

Page({
  data: {
    sessionList: [],
    loading: true,
    isEditMode: false,
    editingSessionId: '',
    editTitle: ''
  },

  onLoad() {
    this.loadSessionList();
  },

  onShow() {
    this.loadSessionList();
  },

  onPullDownRefresh() {
    this.loadSessionList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  enterEditMode(e) {
    const sessionId = e.currentTarget.dataset.id;
    const session = this.data.sessionList.find(function(s) {
      return s.sessionId === sessionId;
    });

    if (!session) return;

    this.setData({
      isEditMode: true,
      editingSessionId: sessionId,
      editTitle: session.title
    });
  },

  exitEditMode() {
    if (this.data.editingSessionId && this.data.editTitle) {
      this.saveSessionTitle();
    }

    this.setData({
      isEditMode: false,
      editingSessionId: '',
      editTitle: ''
    });
  },

  onSessionItemTap(e) {
    if (!this.data.isEditMode) {
      this.enterSession(e);
      return;
    }

    const sessionId = e.currentTarget.dataset.id;
    const session = this.data.sessionList.find(function(s) {
      return s.sessionId === sessionId;
    });

    this.setData({
      editingSessionId: sessionId,
      editTitle: session ? session.title : ''
    });
  },

  onTitleInput(e) {
    this.setData({
      editTitle: e.detail.value
    });
  },

  saveSessionTitle() {
    const that = this;
    const sessionId = this.data.editingSessionId;
    const newTitle = this.data.editTitle.trim();

    if (!sessionId || !newTitle) return;

    api.updateSession(sessionId, { title: newTitle }).then(function() {
      const sessionList = that.data.sessionList.map(function(s) {
        if (s.sessionId === sessionId) {
          s.title = newTitle;
        }
        return s;
      });
      that.setData({ sessionList: sessionList });
    }).catch(function(err) {
      console.error('更新会话标题失败:', err);
    });
  },

  deleteSessionInEdit(e) {
    const that = this;
    const sessionId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '删除后将清空该会话的所有消息记录，是否继续？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          api.deleteSession(sessionId).then(function() {
            const sessionList = that.data.sessionList.filter(function(s) {
              return s.sessionId !== sessionId;
            });

            that.setData({
              sessionList: sessionList,
              isEditMode: false,
              editingSessionId: '',
              editTitle: ''
            });

            wx.showToast({ title: '已删除', icon: 'success' });
          }).catch(function(err) {
            console.error('删除会话失败:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  loadSessionList() {
    const that = this;
    this.setData({ loading: true });
    
    return api.getSessionList().then(function(sessions) {
      var formattedSessions = (sessions || []).map(function(session) {
        var lastMessageText = '';
        if (session.lastMessage) {
          if (typeof session.lastMessage === 'string') {
            lastMessageText = session.lastMessage;
          } else if (session.lastMessage.content) {
            lastMessageText = textUtils.extractMessagePreview(session.lastMessage.content, 50);
          }
        }
        
        var lastTimeText = '';
        if (session.lastMessage && session.lastMessage.createdAt) {
          var date = new Date(session.lastMessage.createdAt);
          lastTimeText = that.formatTime(date);
        }
        
        return {
          sessionId: session.sessionId,
          type: session.type,
          plantId: session.plantId,
          title: session.title,
          status: session.status,
          lastMessage: lastMessageText,
          lastTime: lastTimeText,
          hasUnread: session.hasUnread || false
        };
      });
      
      that.setData({
        sessionList: formattedSessions,
        loading: false
      });
    }).catch(function(err) {
      console.error('加载会话列表失败:', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },

  enterSession(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    const title = e.currentTarget.dataset.title;
    const plantId = e.currentTarget.dataset.plantid;
    
    var url = '/pages/qna/qna?sessionType=' + type + '&sessionId=' + id + '&title=' + encodeURIComponent(title);
    if (plantId) {
      url += '&plantId=' + plantId;
    }
    
    wx.navigateTo({ url: url });
  },

  deleteSession(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后将清空该会话的所有消息记录，是否继续？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          api.deleteSession(id).then(function() {
            const sessionList = that.data.sessionList.filter(function(s) { 
              return s.sessionId !== id; 
            });
            that.setData({ sessionList: sessionList });
            wx.showToast({ title: '已删除', icon: 'success' });
          }).catch(function(err) {
            console.error('删除会话失败:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  createConsultation() {
    const that = this;
    
    api.createSession({ type: 'consultation' }).then(function(session) {
      wx.navigateTo({
        url: '/pages/qna/qna?sessionType=consultation&sessionId=' + session.sessionId + '&title=' + encodeURIComponent(session.title)
      });
    }).catch(function(err) {
      console.error('创建会话失败:', err);
      wx.showToast({ title: '创建失败', icon: 'none' });
    });
  },

  createNewSession() {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['💬 咨询会话', '🌱 植物会话'],
      success: function(res) {
        if (res.tapIndex === 0) {
          that.createConsultation();
        } else if (res.tapIndex === 1) {
          that.selectPlantForSession();
        }
      }
    });
  },

  selectPlantForSession() {
    const that = this;
    
    api.getPlantList().then(function(plantList) {
      if (!plantList || plantList.length === 0) {
        wx.showToast({ title: '暂无植物，请先创建', icon: 'none' });
        return;
      }
      
      const emojiMap = {
        succulent: '🌵',
        flower: '🌹',
        foliage: '🌿',
        vegetable: '🥬'
      };
      const itemList = plantList.map(function(plant) {
        const emoji = emojiMap[plant.plantCategory] || '🌱';
        return emoji + ' ' + plant.nickname;
      });
      
      wx.showActionSheet({
        itemList: itemList,
        success: function(res) {
          const selectedPlant = plantList[res.tapIndex];
          if (selectedPlant) {
            that.createPlantSession(selectedPlant);
          }
        }
      });
    }).catch(function(err) {
      console.error('获取植物列表失败:', err);
      wx.showToast({ title: '获取植物列表失败', icon: 'none' });
    });
  },

  createPlantSession(plant) {
    api.createSession({ 
      type: 'plant', 
      plantId: plant.plantId,
      title: plant.nickname + '的咨询'
    }).then(function(session) {
      wx.navigateTo({
        url: '/pages/qna/qna?sessionType=plant&sessionId=' + session.sessionId + '&plantId=' + plant.plantId + '&title=' + encodeURIComponent(session.title)
      });
    }).catch(function(err) {
      console.error('创建会话失败:', err);
      wx.showToast({ title: '创建失败', icon: 'none' });
    });
  },

  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
