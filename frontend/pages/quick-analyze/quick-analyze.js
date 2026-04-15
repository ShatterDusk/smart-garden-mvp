// quick-analyze.js - 快速分析页
// SA-7-001: 支持异步 AI 分析
const api = require('../../utils/api.js');

Page({
  data: {
    currentStep: 0,
    steps: ['选择植物', '拍照上传', 'AI分析', '查看结果'],
    selectedPlant: null,
    plantList: [],
    tempImagePath: '',
    analysisResult: null,
    createdSession: null,
    sessionId: '',
    isAnalyzing: false,
    analysisProgress: 0,
    analysisStatus: '', // 分析状态提示
    pollTimer: null     // 轮询定时器
  },

  onLoad() {
    this.loadPlantList();
  },

  onUnload() {
    // 页面卸载时清理轮询
    this.clearPolling();
  },

  // 清理轮询
  clearPolling() {
    if (this.data.pollTimer) {
      clearTimeout(this.data.pollTimer);
      this.setData({ pollTimer: null });
    }
  },

  loadPlantList() {
    var that = this;
    
    api.getPlantList().then(function(plants) {
      var plantList = (plants || []).map(function(plant) {
        var emojiMap = {
          succulent: '🌵',
          flower: '🌹',
          foliage: '🌿',
          vegetable: '🥬'
        };
        return {
          plantId: plant.plantId,
          nickname: plant.nickname,
          species: plant.species,
          emoji: emojiMap[plant.plantCategory] || '🌱',
          coverImageUrl: plant.coverImageUrl
        };
      });
      
      that.setData({ plantList: plantList });
    }).catch(function(err) {
      console.error('加载植物列表失败:', err);
      that.setData({ plantList: [] });
    });
  },

  selectPlant(e) {
    var id = e.currentTarget.dataset.id;
    var plant = this.data.plantList.find(function(p) { return p.plantId === id; });
    
    this.setData({
      selectedPlant: plant,
      currentStep: 1
    });
  },

  skipPlantSelection() {
    this.setData({
      selectedPlant: null,
      currentStep: 1
    });
  },

  chooseImage() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({
          tempImagePath: tempFilePath,
          currentStep: 2
        });
      }
    });
  },

  rechooseImage() {
    this.clearPolling();
    this.setData({
      tempImagePath: '',
      currentStep: 1,
      analysisResult: null,
      createdSession: null,
      sessionId: '',
      analysisProgress: 0,
      analysisStatus: ''
    });
  },

  // SA-7-001: 开始分析（支持异步模式）
  startAnalysis() {
    var that = this;
    var tempImagePath = this.data.tempImagePath;
    
    if (!tempImagePath) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isAnalyzing: true,
      analysisProgress: 0,
      analysisStatus: '正在创建会话...',
      currentStep: 2
    });

    // 模拟进度条（前端动画）
    var progress = 0;
    var progressInterval = setInterval(function() {
      progress += 5;
      if (progress <= 90) {
        that.setData({ analysisProgress: progress });
      }
    }, 500);

    var selectedPlant = this.data.selectedPlant;
    
    api.createSession({
      type: 'consultation',
      plantId: selectedPlant ? selectedPlant.plantId : null,
      title: '快速诊断'
    }).then(function(session) {
      var sessionId = session.sessionId;
      
      that.setData({ 
        sessionId: sessionId,
        analysisStatus: '正在上传图片...'
      });
      
      return api.uploadImage(tempImagePath).then(function(uploadResult) {
        console.log('图片上传成功:', uploadResult.url);
        
        that.setData({ analysisStatus: 'AI 正在分析中...' });
        
        return api.sendMessage(sessionId, {
          content: '这是什么植物？健康状况如何？',
          contentType: 'image',
          imageUrls: [uploadResult.url]
        });
      }).then(function(result) {
        clearInterval(progressInterval);

        // 检查是否是异步模式
        if (result.isAsync) {
          // 异步模式：启动轮询
          console.log('【异步模式】AI 分析已提交，开始轮询');
          that.setData({
            createdSession: {
              sessionId: sessionId,
              type: 'consultation',
              title: '快速诊断'
            },
            analysisStatus: 'AI 正在分析中，请稍候...'
          });
          that.startPolling(sessionId);
        } else {
          // 同步模式：直接处理结果，确保 sessionId 被保存
          that.setData({
            sessionId: sessionId,
            createdSession: {
              sessionId: sessionId,
              type: 'consultation',
              title: '快速诊断'
            }
          });
          that.processAnalysisResult(result);
        }
      });
    }).catch(function(err) {
      clearInterval(progressInterval);
      console.error('分析失败:', err);
      that.setData({
        isAnalyzing: false,
        currentStep: 3,
        analysisProgress: 100,
        analysisStatus: '分析失败',
        analysisResult: {
          healthScore: 0,
          status: 'error',
          statusText: '分析失败',
          issues: [],
          suggestions: [],
          aiContent: '抱歉，分析服务暂时不可用，请稍后再试。'
        }
      });
    });
  },

  // SA-7-001: 启动消息轮询
  startPolling: function(sessionId) {
    var that = this;
    var pollCount = 0;
    var maxPolls = 30;      // 最多轮询30次
    var pollInterval = 2000; // 轮询间隔2秒
    
    var doPoll = function() {
      pollCount++;
      
      // 更新进度条（模拟）
      var progress = 90 + Math.min(pollCount * 0.3, 9); // 90% -> 99%
      that.setData({ analysisProgress: progress });
      
      if (pollCount > maxPolls) {
        // 轮询超时
        console.log('【异步模式】轮询超时');
        that.setData({
          isAnalyzing: false,
          currentStep: 3,
          analysisProgress: 100,
          analysisStatus: '分析超时',
          analysisResult: {
            healthScore: 0,
            status: 'timeout',
            statusText: '分析超时',
            issues: [],
            suggestions: [{
              type: 'info',
              action: '稍后查看',
              details: 'AI 分析耗时较长，请稍后刷新页面查看结果',
              priority: 'high'
            }],
            aiContent: 'AI 分析耗时较长，请稍后刷新页面查看结果。您可以在"我的会话"中查看完整分析结果。'
          }
        });
        return;
      }
      
      // 查询会话消息
      api.getSessionMessages(sessionId).then(function(messages) {
        if (!messages || messages.length === 0) {
          // 继续轮询
          var timer = setTimeout(doPoll, pollInterval);
          that.setData({ pollTimer: timer });
          return;
        }
        
        var lastMessage = messages[messages.length - 1];
        
        // 检查是否有 AI 回复（非占位消息）
        if (lastMessage && lastMessage.role === 'assistant' && 
            lastMessage.content !== 'AI 正在分析中，请稍候...') {
          // 拿到真实结果
          console.log('【异步模式】获取到 AI 回复:', lastMessage.messageId);
          that.processAnalysisResult({ aiResponse: lastMessage });
        } else {
          // 继续轮询
          var timer = setTimeout(doPoll, pollInterval);
          that.setData({ pollTimer: timer });
        }
      }).catch(function(err) {
        console.error('【异步模式】轮询出错:', err);
        // 错误后继续轮询（最多允许3次连续错误）
        if (pollCount < maxPolls) {
          var timer = setTimeout(doPoll, pollInterval);
          that.setData({ pollTimer: timer });
        } else {
          // 错误次数过多，停止轮询
          that.setData({
            isAnalyzing: false,
            currentStep: 3,
            analysisProgress: 100,
            analysisStatus: '获取结果失败',
            analysisResult: {
              healthScore: 0,
              status: 'error',
              statusText: '获取失败',
              issues: [],
              suggestions: [],
              aiContent: '获取分析结果失败，请稍后刷新页面重试。'
            }
          });
        }
      });
    };
    
    // 延迟 3 秒后开始轮询（给 AI 一点初始处理时间）
    var timer = setTimeout(doPoll, 3000);
    this.setData({ pollTimer: timer });
  },

  // 处理分析结果
  processAnalysisResult: function(result) {
    var that = this;
    var aiResponse = result.aiResponse || result.aiMessage;
    var diagnosisCard = aiResponse ? aiResponse.diagnosisCard : null;

    var diagnosisResult = {
      diagnosisCardId: diagnosisCard ? diagnosisCard.diagnosisCardId : '',
      healthScore: diagnosisCard ? diagnosisCard.healthScore : 85,
      status: diagnosisCard ? diagnosisCard.status : 'healthy',
      statusText: that.getStatusText(diagnosisCard ? diagnosisCard.status : 'healthy'),
      issues: diagnosisCard ? diagnosisCard.issues : [],
      suggestions: diagnosisCard ? diagnosisCard.suggestions : [],
      plantName: diagnosisCard ? diagnosisCard.species : '未知植物',
      species: diagnosisCard && diagnosisCard.species ? diagnosisCard.species : '未知植物',
      confidence: diagnosisCard ? diagnosisCard.confidence : 0.75,
      aiContent: aiResponse ? aiResponse.content : ''
    };

    this.clearPolling();

    // 确保 createdSession 包含 sessionId，用于后续跳转
    var currentSessionId = this.data.sessionId;
    var createdSession = this.data.createdSession;
    if (currentSessionId && !createdSession) {
      createdSession = {
        sessionId: currentSessionId,
        type: 'consultation',
        title: '快速诊断'
      };
    }

    this.setData({
      isAnalyzing: false,
      currentStep: 3,
      analysisProgress: 100,
      analysisStatus: '分析完成',
      analysisResult: diagnosisResult,
      createdSession: createdSession
    });
  },

  getStatusText(status) {
    var statusMap = {
      healthy: '健康',
      warning: '警告',
      critical: '严重'
    };
    return statusMap[status] || '未知';
  },

  goToSession() {
    var sessionId = this.data.createdSession ? this.data.createdSession.sessionId : '';
    if (sessionId) {
      wx.navigateTo({
        url: '/pages/qna/qna?sessionType=consultation&sessionId=' + sessionId + '&title=快速诊断'
      });
    }
  },

  createPlant() {
    var result = this.data.analysisResult;
    var imageUrl = this.data.tempImagePath;
    var sessionId = this.data.createdSession ? this.data.createdSession.sessionId : '';
    
    wx.navigateTo({
      url: '/pages/add-plant/add-plant?mode=create&from=diagnosis&imageUrl=' + encodeURIComponent(imageUrl) + '&species=' + encodeURIComponent(result.plantName || '') + '&healthScore=' + result.healthScore + '&status=' + result.status + '&sessionId=' + sessionId
    });
  },

  startNewAnalysis() {
    this.clearPolling();
    this.setData({
      currentStep: 0,
      selectedPlant: null,
      tempImagePath: '',
      analysisResult: null,
      createdSession: null,
      sessionId: '',
      isAnalyzing: false,
      analysisProgress: 0,
      analysisStatus: ''
    });
  },

  reanalyze() {
    this.startNewAnalysis();
  },

  goToChat() {
    this.goToSession();
  },

  goBack() {
    wx.navigateBack({
      fail: function() {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }
});
