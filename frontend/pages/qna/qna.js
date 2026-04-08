// qna.js - 智能问答页
// 引入 API 服务
const api = require('../../utils/api.js');
const textUtils = require('../../utils/text-utils.js');

Page({
  data: {
    sessionId: '',
    sessionType: '',
    plantId: '',
    currentTitle: '',
    currentMessages: [],
    inputValue: '',
    isRecording: false,
    contextOptions: [
      { id: 'env', label: '环境数据', icon: '📊', checked: true },
      { id: 'history', label: '历史诊断', icon: '📋', checked: true },
      { id: 'care', label: '养护记录', icon: '📝', checked: false }
    ],
    showContextMenu: false,
    isLoading: false,
    scrollToView: '',
    showSidebar: false,
    sessionList: [],
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    showImagePreview: false,
    previewImagePath: '',
    previewInputValue: '',
    // 图片预上传相关
    pendingImage: null, // { localPath, remoteUrl, isUploading, uploadProgress, uploadTask }
  },

  onLoad: function(options) {
    var sessionType = options.sessionType;
    var sessionId = options.sessionId;
    var plantId = options.plantId;
    var title = options.title;
    var imageUrl = options.imageUrl;
    var message = options.message;

    var decodedTitle = title ? decodeURIComponent(title) : '';
    if (!decodedTitle) {
      decodedTitle = sessionType === 'plant' ? '植物咨询' : '智能问答';
    }

    var decodedMessage = message ? decodeURIComponent(message) : '';

    wx.setNavigationBarTitle({
      title: decodedTitle
    });

    this.setData({
      sessionType: sessionType || 'consultation',
      sessionId: sessionId || '',
      plantId: plantId || '',
      currentTitle: decodedTitle
    });

    if (sessionId) {
      this.loadMessages();
      // 标记会话为已读
      this.markSessionAsRead(sessionId);
    } else {
      this.initNewSession(sessionType, plantId, decodedTitle);
    }

    this.loadSessionList();
    this.loadContextConfig();

    if (imageUrl) {
      var that = this;
      setTimeout(function() {
        that.sendImageMessage(decodeURIComponent(imageUrl), decodedMessage);
      }, 500);
    }
  },

  loadContextConfig: function() {
    var that = this;
    api.getUserConfig('context_options').then(function(config) {
      if (config && config.configValue) {
        var savedOptions = config.configValue;
        var contextOptions = that.data.contextOptions;
        
        contextOptions.forEach(function(option) {
          if (savedOptions[option.id] !== undefined) {
            option.checked = savedOptions[option.id];
          }
        });
        
        that.setData({ contextOptions: contextOptions });
      }
    }).catch(function() {
    });
  },

  saveContextConfig: function() {
    var contextOptions = this.data.contextOptions;
    var configValue = {};
    contextOptions.forEach(function(option) {
      configValue[option.id] = option.checked;
    });
    
    api.setUserConfig('context_options', configValue, 'preference');
  },

  onReady: function() {
    this.scrollToBottom();
  },

  loadMessages: function() {
    var that = this;
    var sessionId = this.data.sessionId;
    var sessionType = this.data.sessionType;
    var currentTitle = this.data.currentTitle;

    if (!sessionId) return;

    api.getMessages(sessionId).then(function(result) {
      var messages = (result || []).map(function(msg) {
        var diagnosisCard = null;
        if (msg.diagnosisCard) {
          diagnosisCard = {
            diagnosisCardId: msg.diagnosisCard.diagnosisCardId || '',
            healthScore: msg.diagnosisCard.healthScore,
            status: msg.diagnosisCard.status,
            species: msg.diagnosisCard.species || '',
            confidence: msg.diagnosisCard.confidence || 0,
            issues: msg.diagnosisCard.issues,
            suggestions: msg.diagnosisCard.suggestions
          };
        }
        
        return {
          id: msg.messageId || 'msg_' + Date.now(),
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          imageUrl: msg.imageUrls && msg.imageUrls.length > 0 ? msg.imageUrls[0] : '',
          diagnosisCard: diagnosisCard,
          time: that.formatTime(new Date(msg.createdAt))
        };
      });

      if (messages.length === 0) {
        messages = [{
          id: 'welcome_' + Date.now(),
          type: 'ai',
          content: sessionType === 'plant' 
            ? '你好！我是小园。\n\n当前植物：' + currentTitle + '\n\n今天有什么可以帮你的吗？'
            : '你好！我是小园，你的植物养护助手。\n\n我可以帮你：\n🌱 识别植物品种\n💧 诊断健康问题\n📸 分析植物照片',
          time: that.formatTime(new Date())
        }];
      }

      that.setData({ currentMessages: messages });
      that.scrollToBottom();
    }).catch(function(err) {
      console.error('加载消息失败:', err);
      var messages = [{
        id: 'welcome_' + Date.now(),
        type: 'ai',
        content: '你好！我是小园，你的植物养护助手。',
        time: that.formatTime(new Date())
      }];
      that.setData({ currentMessages: messages });
    });
  },

  /**
   * 标记会话为已读
   */
  markSessionAsRead: function(sessionId) {
    if (!sessionId) return;

    api.markSessionAsRead(sessionId).then(function() {
      console.log('会话已标记为已读:', sessionId);
    }).catch(function(err) {
      console.error('标记会话已读失败:', err);
    });
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  sendMessage: function() {
    var inputValue = this.data.inputValue;
    var currentMessages = this.data.currentMessages;
    var isLoading = this.data.isLoading;
    var sessionId = this.data.sessionId;

    if (!inputValue.trim() || isLoading) return;

    var now = new Date();
    var timeStr = this.formatTime(now);

    var userMessage = {
      id: 'user_' + Date.now(),
      type: 'user',
      content: inputValue,
      time: timeStr
    };

    this.setData({
      currentMessages: currentMessages.concat(userMessage),
      inputValue: '',
      isLoading: true
    });

    this.scrollToBottom();

    var that = this;
    
    // 只有植物会话才发送 contextConfig
    var requestData = {
      content: inputValue,
      contentType: 'text'
    };
    
    if (that.data.sessionType === 'plant') {
      requestData.contextConfig = {
        environmentData: that.data.contextOptions.find(function(o) { return o.id === 'env'; }).checked,
        careRecords: that.data.contextOptions.find(function(o) { return o.id === 'care'; }).checked,
        historyDiagnosis: that.data.contextOptions.find(function(o) { return o.id === 'history'; }).checked
      };
    }

    api.sendMessage(sessionId, requestData).then(function(result) {
      if (result.error) {
        var errorMessage = {
          id: 'error_' + Date.now(),
          type: 'ai',
          content: result.error.message || 'AI 服务暂时不可用，请稍后重试。',
          time: that.formatTime(new Date())
        };
        that.setData({
          currentMessages: that.data.currentMessages.concat(errorMessage),
          isLoading: false
        });
        that.scrollToBottom();
        return;
      }
      
      // 后端返回结构: { userMessage, aiResponse }
      var aiResponse = result.aiResponse || result.aiMessage;
      var aiMessage = {
        id: 'ai_' + Date.now(),
        type: 'ai',
        content: aiResponse ? aiResponse.content : '抱歉，我暂时无法回答这个问题。',
        time: that.formatTime(new Date())
      };

      // 诊断卡在 aiResponse.diagnosisCard 中
      var diagnosisCard = aiResponse ? aiResponse.diagnosisCard : result.diagnosisCard;
      if (diagnosisCard) {
        aiMessage.diagnosisCard = {
          diagnosisCardId: diagnosisCard.diagnosisCardId || '',
          healthScore: diagnosisCard.healthScore,
          status: diagnosisCard.status,
          species: diagnosisCard.species || '',
          confidence: diagnosisCard.confidence || 0,
          issues: diagnosisCard.issues,
          suggestions: diagnosisCard.suggestions
        };
      }

      that.setData({
        currentMessages: that.data.currentMessages.concat(aiMessage),
        isLoading: false
      });
      that.scrollToBottom();
    }).catch(function(err) {
      console.error('发送消息失败:', err);
      var errorMessage = {
        id: 'error_' + Date.now(),
        type: 'ai',
        content: '抱歉，服务暂时不可用，请稍后再试。',
        time: that.formatTime(new Date())
      };
      that.setData({
        currentMessages: that.data.currentMessages.concat(errorMessage),
        isLoading: false
      });
      that.scrollToBottom();
    });
  },

  showImageOptions: function() {
    var that = this;
    wx.showActionSheet({
      itemList: ['📷 拍照', '📁 从相册选择'],
      success: function(res) {
        if (res.tapIndex === 0) {
          that.selectImageFromCamera();
        } else if (res.tapIndex === 1) {
          that.selectImageFromAlbum();
        }
      }
    });
  },

  selectImageFromCamera: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.handleImageSelected(tempFilePath);
      },
      fail: function() {
      }
    });
  },

  selectImageFromAlbum: function() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.handleImageSelected(tempFilePath);
      },
      fail: function() {
      }
    });
  },

  /**
   * 处理图片选择 - 立即开始预上传
   */
  handleImageSelected: function(imagePath) {
    var that = this;

    // 设置预览状态并开始上传
    this.setData({
      showImagePreview: true,
      previewImagePath: imagePath,
      previewInputValue: '',
      pendingImage: {
        localPath: imagePath,
        remoteUrl: null,
        isUploading: true,
        uploadProgress: 0,
        uploadTask: null,
      }
    });

    // 立即开始上传图片（后台进行）
    this.startImageUpload(imagePath);
  },

  /**
   * 开始上传图片（预上传）
   */
  startImageUpload: function(imagePath) {
    var that = this;
    var cosUpload = require('../../utils/cos-upload.js');

    cosUpload.uploadToCloudStorage(imagePath, {
      onProgress: function(progress, sent, total) {
        // 更新上传进度
        var pendingImage = that.data.pendingImage;
        if (pendingImage) {
          pendingImage.uploadProgress = progress;
          that.setData({ pendingImage: pendingImage });
        }
      }
    }).then(function(result) {
      console.log('图片预上传成功:', result.url);

      // 更新 pendingImage 状态
      var pendingImage = that.data.pendingImage;
      if (pendingImage && pendingImage.localPath === imagePath) {
        pendingImage.remoteUrl = result.url;
        pendingImage.isUploading = false;
        pendingImage.uploadProgress = 100;
        that.setData({ pendingImage: pendingImage });
      }
    }).catch(function(err) {
      console.error('图片预上传失败:', err);

      // 更新状态为失败
      var pendingImage = that.data.pendingImage;
      if (pendingImage && pendingImage.localPath === imagePath) {
        pendingImage.isUploading = false;
        pendingImage.uploadError = err.message || '上传失败';
        that.setData({ pendingImage: pendingImage });

        wx.showToast({
          title: '图片上传失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  enterImagePreviewMode: function(imagePath) {
    this.setData({
      showImagePreview: true,
      previewImagePath: imagePath,
      previewInputValue: ''
    });
  },

  exitImagePreviewMode: function() {
    this.setData({
      showImagePreview: false,
      previewImagePath: '',
      previewInputValue: '',
      pendingImage: null
    });
  },

  onPreviewInput: function(e) {
    this.setData({
      previewInputValue: e.detail.value
    });
  },

  cancelImageSend: function() {
    this.exitImagePreviewMode();
  },

  confirmImageSend: function() {
    var pendingImage = this.data.pendingImage;
    var textContent = this.data.previewInputValue.trim();

    // 检查图片是否已上传完成
    if (!pendingImage) {
      wx.showToast({ title: '图片信息丢失', icon: 'none' });
      return;
    }

    if (pendingImage.isUploading) {
      wx.showToast({ title: '图片上传中，请稍候...', icon: 'none' });
      return;
    }

    if (pendingImage.uploadError) {
      wx.showToast({ title: '图片上传失败，请重新选择', icon: 'none' });
      return;
    }

    if (!pendingImage.remoteUrl) {
      wx.showToast({ title: '图片上传未完成', icon: 'none' });
      return;
    }

    // 使用已上传的图片 URL 发送消息
    var remoteUrl = pendingImage.remoteUrl;
    this.exitImagePreviewMode();
    this.sendImageMessageWithUrl(remoteUrl, textContent);
  },

  /**
   * 使用已上传的图片 URL 发送消息（预上传模式）
   */
  sendImageMessageWithUrl: function(remoteUrl, messageContent) {
    var currentMessages = this.data.currentMessages;
    var sessionId = this.data.sessionId;
    var that = this;

    var finalContent = messageContent || '这是什么？';
    var now = new Date();
    var timeStr = this.formatTime(now);

    // 立即显示用户消息（使用远程 URL）
    var imageMessage = {
      id: 'img_' + Date.now(),
      type: 'user',
      content: finalContent,
      imageUrl: remoteUrl,
      time: timeStr
    };

    this.setData({
      currentMessages: currentMessages.concat(imageMessage),
      isLoading: true
    });

    this.scrollToBottom();

    // 直接发送消息（图片已上传好）
    var messageData = {
      content: finalContent,
      contentType: 'image',
      imageUrls: [remoteUrl]
    };

    if (that.data.sessionType === 'plant') {
      messageData.contextConfig = {
        environmentData: that.data.contextOptions.find(function(o) { return o.id === 'env'; }).checked,
        careRecords: that.data.contextOptions.find(function(o) { return o.id === 'care'; }).checked,
        historyDiagnosis: that.data.contextOptions.find(function(o) { return o.id === 'history'; }).checked
      };
    }

    api.sendMessage(sessionId, messageData).then(function(result) {
      if (result.error) {
        var errorMessage = {
          id: 'error_' + Date.now(),
          type: 'ai',
          content: result.error.message || 'AI 服务暂时不可用，请稍后重试。',
          time: that.formatTime(new Date())
        };
        that.setData({
          currentMessages: that.data.currentMessages.concat(errorMessage),
          isLoading: false
        });
        that.scrollToBottom();
        return;
      }

      // 后端返回结构: { userMessage, aiResponse }
      var aiResponse = result.aiResponse || result.aiMessage;
      var aiMessage = {
        id: 'ai_' + Date.now(),
        type: 'ai',
        content: aiResponse ? aiResponse.content : '我已收到您的图片。',
        time: that.formatTime(new Date())
      };

      // 诊断卡在 aiResponse.diagnosisCard 中
      var diagnosisCard = aiResponse ? aiResponse.diagnosisCard : result.diagnosisCard;
      if (diagnosisCard) {
        aiMessage.diagnosisCard = {
          diagnosisCardId: diagnosisCard.diagnosisCardId || '',
          healthScore: diagnosisCard.healthScore,
          status: diagnosisCard.status,
          species: diagnosisCard.species || '',
          confidence: diagnosisCard.confidence || 0,
          issues: diagnosisCard.issues,
          suggestions: diagnosisCard.suggestions
        };
      }

      that.setData({
        currentMessages: that.data.currentMessages.concat(aiMessage),
        isLoading: false
      });
      that.scrollToBottom();
    }).catch(function(err) {
      console.error('发送图片消息失败:', err);
      that.setData({ isLoading: false });
      wx.showToast({ title: '发送失败', icon: 'none' });
    });
  },

  /**
   * 旧版发送图片消息方法（保留兼容）
   * 用于外部直接传入图片路径的场景
   */
  sendImageMessage: function(imagePath, messageContent) {
    var that = this;

    // 如果传入的是远程 URL，直接使用
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      this.sendImageMessageWithUrl(imagePath, messageContent);
      return;
    }

    // 本地路径需要先上传
    var finalContent = messageContent || '这是什么？';
    var now = new Date();
    var timeStr = this.formatTime(now);

    var imageMessage = {
      id: 'img_' + Date.now(),
      type: 'user',
      content: finalContent,
      imageUrl: imagePath,
      time: timeStr
    };

    this.setData({
      currentMessages: this.data.currentMessages.concat(imageMessage),
      isLoading: true
    });

    this.scrollToBottom();

    // 上传图片
    api.uploadImage(imagePath).then(function(uploadResult) {
      console.log('图片上传成功:', uploadResult.url);
      // 使用上传后的 URL 发送
      that.sendImageMessageWithUrl(uploadResult.url, messageContent);
    }).catch(function(err) {
      console.error('发送图片消息失败:', err);
      that.setData({ isLoading: false });
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    });
  },

  toggleContextMenu: function() {
    this.setData({
      showContextMenu: !this.data.showContextMenu
    });
  },

  toggleContextOption: function(e) {
    var id = e.currentTarget.dataset.id;
    var contextOptions = this.data.contextOptions;
    var toggledItem = null;

    for (var i = 0; i < contextOptions.length; i++) {
      if (contextOptions[i].id === id) {
        contextOptions[i].checked = !contextOptions[i].checked;
        toggledItem = contextOptions[i];
        break;
      }
    }
    this.setData({ contextOptions: contextOptions });
    this.saveContextConfig();

    if (toggledItem) {
      var status = toggledItem.checked ? '已开启' : '已关闭';
      wx.showToast({
        title: toggledItem.label + status,
        icon: 'none',
        duration: 1500
      });
    }
  },

  closeContextMenu: function() {
    this.setData({
      showContextMenu: false
    });
  },

  startVoiceInput: function() {
    this.setData({ isRecording: true });
  },

  stopVoiceInput: function() {
    this.setData({ isRecording: false });
  },

  scrollToBottom: function() {
    var messages = this.data.currentMessages;
    if (messages.length > 0) {
      var lastMessage = messages[messages.length - 1];
      this.setData({
        scrollToView: 'msg-' + lastMessage.id
      });
    }
  },

  formatTime: function(date) {
    var hours = date.getHours().toString().padStart(2, '0');
    var minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  previewImage: function(e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url]
    });
  },

  viewDiagnosisDetail: function(e) {
    var cardId = e.currentTarget.dataset.cardId;
    wx.showToast({
      title: '诊断详情开发中',
      icon: 'none'
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  bindInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onShareAppMessage: function() {
    return {
      title: '智能园艺助手 - ' + this.data.currentTitle,
      path: '/pages/qna/qna?sessionType=' + this.data.sessionType + '&title=' + encodeURIComponent(this.data.currentTitle)
    };
  },

  loadSessionList: function() {
    var that = this;
    
    api.getSessionList().then(function(sessions) {
      var sessionList = (sessions || []).map(function(session) {
        var lastMessageContent = session.lastMessage ? textUtils.extractMessagePreview(session.lastMessage.content, 50) : '暂无消息';
        return {
          sessionId: session.sessionId,
          type: session.type,
          title: session.title,
          lastMessage: lastMessageContent,
          lastTime: session.lastMessage ? that.formatTime(new Date(session.lastMessage.createdAt)) : '',
          unread: 0
        };
      });

      that.setData({ sessionList: sessionList });
    }).catch(function(err) {
      console.error('加载会话列表失败:', err);
    });
  },

  openSidebar: function() {
    this.setData({ showSidebar: true });
  },

  closeSidebar: function() {
    this.setData({ showSidebar: false });
  },

  switchSession: function(e) {
    var id = e.currentTarget.dataset.id;
    var type = e.currentTarget.dataset.type;
    var title = e.currentTarget.dataset.title;

    this.setData({ showSidebar: false });

    if (id === this.data.sessionId) {
      return;
    }

    this.setData({
      sessionId: id,
      sessionType: type,
      currentTitle: title
    });

    wx.setNavigationBarTitle({
      title: title
    });

    this.loadMessages();
  },

  initNewSession: function(sessionType, plantId, title) {
    var that = this;
    var now = new Date();
    var timeStr = this.formatTime(now);

    api.createSession({
      type: sessionType || 'consultation',
      plantId: plantId || null,
      title: title
    }).then(function(session) {
      that.setData({
        sessionId: session.sessionId,
        sessionType: session.type,
        currentTitle: session.title
      });

      var welcomeContent = sessionType === 'plant'
        ? '你好！我是小园。\n\n当前植物：' + title + '\n\n今天有什么可以帮你的吗？'
        : '你好！我是小园，你的植物养护助手。\n\n我可以帮你：\n🌱 识别植物品种\n💧 诊断健康问题\n📸 分析植物照片';

      var welcomeMessage = {
        id: 'welcome_' + Date.now(),
        type: 'ai',
        content: welcomeContent,
        time: timeStr
      };

      that.setData({
        currentMessages: [welcomeMessage]
      });
    }).catch(function(err) {
      console.error('创建会话失败:', err);
      wx.showToast({ title: '创建会话失败', icon: 'none' });
    });
  },

  createNewSession: function() {
    var that = this;
    this.setData({ showSidebar: false });
    
    wx.showActionSheet({
      itemList: ['新建咨询会话', '新建植物会话'],
      success: function(res) {
        if (res.tapIndex === 0) {
          wx.navigateTo({
            url: '/pages/qna/qna?sessionType=consultation&title=智能问答'
          });
        } else if (res.tapIndex === 1) {
          wx.navigateTo({
            url: '/pages/plants/plants?mode=select'
          });
        }
      }
    });
  },

  onTouchStart: function(e) {
    var touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY
    });
  },

  onTouchMove: function(e) {
  },

  onTouchEnd: function(e) {
    var touch = e.changedTouches[0];
    var startX = this.data.touchStartX;
    var startY = this.data.touchStartY;
    var endX = touch.clientX;
    var endY = touch.clientY;

    var deltaX = endX - startX;
    var deltaY = endY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && startX < 50) {
        this.openSidebar();
      } else if (deltaX < 0 && this.data.showSidebar) {
        this.closeSidebar();
      }
    }
  }
});
