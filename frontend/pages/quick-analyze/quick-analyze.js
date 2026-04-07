// quick-analyze.js - 快速分析页
// 引入 API 服务
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
    analysisProgress: 0
  },

  onLoad() {
    this.loadPlantList();
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
    this.setData({
      tempImagePath: '',
      currentStep: 1,
      analysisResult: null,
      createdSession: null,
      sessionId: ''
    });
  },

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
      currentStep: 2
    });

    var progress = 0;
    var progressInterval = setInterval(function() {
      progress += 10;
      that.setData({ analysisProgress: progress });
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        progressInterval = null;
        that.completeAnalysis();
      }
    }, 200);
  },

  completeAnalysis() {
    var that = this;
    var tempImagePath = this.data.tempImagePath;
    var selectedPlant = this.data.selectedPlant;
    
    api.createSession({
      type: 'consultation',
      plantId: selectedPlant ? selectedPlant.plantId : null,
      title: '快速诊断'
    }).then(function(session) {
      var sessionId = session.sessionId;
      
      return api.uploadImage(tempImagePath).then(function(uploadResult) {
        console.log('图片上传成功:', uploadResult.url);
        
        return api.sendMessage(sessionId, {
          content: '这是什么植物？健康状况如何？',
          contentType: 'image',
          imageUrls: [uploadResult.url]
        });
      }).then(function(result) {
        // 后端返回结构: { userMessage, aiResponse }
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
        
        that.setData({
          isAnalyzing: false,
          currentStep: 3,
          analysisResult: diagnosisResult,
          createdSession: {
            sessionId: sessionId,
            type: 'consultation',
            title: '快速诊断'
          }
        });
      });
    }).catch(function(err) {
      console.error('分析失败:', err);
      that.setData({
        isAnalyzing: false,
        currentStep: 3,
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
    this.setData({
      currentStep: 0,
      selectedPlant: null,
      tempImagePath: '',
      analysisResult: null,
      createdSession: null,
      sessionId: '',
      isAnalyzing: false,
      analysisProgress: 0
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
