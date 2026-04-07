// add-plant.js - 添加植物页面
// 引入 API 服务
const api = require('../../utils/api.js');

Page({
  data: {
    mode: 'create',
    plantId: '',
    pageTitle: '添加植物',
    form: {
      nickname: '',
      plantCategory: '',
      species: '',
      coverImageUrl: '',
      remark: ''
    },
    categories: [
      { value: 'succulent', label: '多肉植物', icon: '🌵' },
      { value: 'flower', label: '花卉', icon: '🌹' },
      { value: 'foliage', label: '绿植', icon: '🌿' },
      { value: 'vegetable', label: '蔬菜', icon: '🥬' }
    ],
    isFormValid: false,
    fromSource: '',
    diagnosisInfo: null
  },

  onLoad(options) {
    var mode = options.mode || 'create';
    var plantId = options.id || options.plantId || '';
    var from = options.from || '';
    var pageTitle = mode === 'edit' ? '编辑植物' : '添加植物';

    wx.setNavigationBarTitle({
      title: pageTitle
    });

    this.setData({
      mode: mode,
      plantId: plantId,
      pageTitle: pageTitle,
      fromSource: from,
      diagnosisInfo: null
    });

    if (mode === 'edit' && plantId) {
      this.loadPlantData(plantId);
    }

    if (from === 'diagnosis') {
      this.loadDiagnosisInfo(options);
    }
  },

  loadDiagnosisInfo(options) {
    var diagnosisInfo = {
      diagnosisCardId: options.diagnosisCardId || '',
      imageUrl: options.imageUrl ? decodeURIComponent(options.imageUrl) : '',
      species: options.species ? decodeURIComponent(options.species) : '',
      healthScore: options.healthScore || '',
      status: options.status || '',
      sessionId: options.sessionId || ''
    };

    var suggestedNickname = diagnosisInfo.species ? '我的' + diagnosisInfo.species : '我的植物';
    
    this.setData({
      diagnosisInfo: diagnosisInfo,
      'form.species': diagnosisInfo.species,
      'form.coverImageUrl': diagnosisInfo.imageUrl,
      'form.nickname': suggestedNickname
    });

    wx.showToast({
      title: '已预填诊断信息',
      icon: 'none',
      duration: 2000
    });
  },

  loadPlantData(plantId) {
    var that = this;
    
    api.getPlantDetail(plantId).then(function(plant) {
      if (plant) {
        that.setData({
          'form.nickname': plant.nickname || '',
          'form.plantCategory': plant.plantCategory || '',
          'form.species': plant.species || '',
          'form.coverImageUrl': plant.coverImageUrl || '',
          'form.remark': plant.remark || ''
        });
        that.checkFormValid();
      } else {
        wx.showToast({
          title: '植物不存在',
          icon: 'error'
        });
      }
    }).catch(function(err) {
      console.error('加载植物数据失败:', err);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },

  onNicknameInput(e) {
    this.setData({
      'form.nickname': e.detail.value
    }, () => {
      this.checkFormValid();
    });
  },

  onCategorySelect(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'form.plantCategory': value
    }, () => {
      this.checkFormValid();
    });
  },

  onSpeciesInput(e) {
    this.setData({
      'form.species': e.detail.value
    });
  },

  onRemarkInput(e) {
    this.setData({
      'form.remark': e.detail.value
    });
  },

  chooseImage() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({
          'form.coverImageUrl': tempFilePath
        });
      },
      fail: function(err) {
        console.log('选择图片失败', err);
      }
    });
  },

  checkFormValid() {
    const { nickname, plantCategory } = this.data.form;
    const isValid = nickname.trim() !== '' && plantCategory !== '';
    this.setData({
      isFormValid: isValid
    });
  },

  submitForm() {
    if (!this.data.isFormValid) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      });
      return;
    }

    var that = this;
    var form = this.data.form;
    var mode = this.data.mode;
    var plantId = this.data.plantId;
    var coverImageUrl = form.coverImageUrl;

    wx.showLoading({
      title: '提交中...',
      mask: true
    });

    var uploadPromise = Promise.resolve(coverImageUrl);
    if (coverImageUrl && (coverImageUrl.startsWith('wxfile://') || coverImageUrl.startsWith('http://tmp') || coverImageUrl.startsWith('https://tmp'))) {
      uploadPromise = api.uploadImage(coverImageUrl).then(function(result) {
        console.log('[add-plant] 封面图上传成功:', result.url);
        return result.url;
      });
    }

    uploadPromise.then(function(finalCoverImageUrl) {
      var plantData = {
        nickname: form.nickname.trim(),
        plantCategory: form.plantCategory,
        species: form.species.trim() || null,
        coverImageUrl: finalCoverImageUrl || 'https://picsum.photos/400/400?random=99',
        remark: form.remark.trim() || null
      };

      if (mode === 'edit') {
        return that.updatePlant(plantId, plantData);
      } else {
        return that.createPlant(plantData);
      }
    }).catch(function(err) {
      wx.hideLoading();
      console.error('[add-plant] 提交失败:', err);
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    });
  },

  createPlant(plantData) {
    var that = this;

    wx.showLoading({
      title: '创建中...',
      mask: true
    });

    api.addPlant(plantData).then(function(result) {
      wx.hideLoading();
      
      var newPlantId = result ? result.plantId : null;
      if (that.data.diagnosisInfo && newPlantId) {
        that.associateDiagnosisToPlant(newPlantId, that.data.diagnosisInfo);
      }
      
      wx.showToast({
        title: '创建成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(function() {
        wx.navigateBack({
          success: function() {
            var pages = getCurrentPages();
            if (pages.length > 1) {
              var prevPage = pages[pages.length - 2];
              if (prevPage && prevPage.loadPlants) {
                prevPage.loadPlants();
              }
            }
          }
        });
      }, 1500);
    }).catch(function(err) {
      wx.hideLoading();
      console.error('创建植物失败:', err);
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      });
    });
  },

  associateDiagnosisToPlant(plantId, diagnosisInfo) {
    console.log('[add-plant] 关联诊断到植物:', plantId, diagnosisInfo);
    
    var sessionId = diagnosisInfo.sessionId;
    var diagnosisCardId = diagnosisInfo.diagnosisCardId;
    
    if (!sessionId) {
      console.log('[add-plant] 无会话ID，跳过升级');
      return;
    }
    
    api.upgradeSessionToPlant(sessionId, plantId).then(function(result) {
      console.log('[add-plant] 会话升级成功:', result);
    }).catch(function(err) {
      console.error('[add-plant] 会话升级失败:', err);
    });
  },

  updatePlant(plantId, plantData) {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    api.updatePlant(plantId, plantData).then(function() {
      wx.hideLoading();
      
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(function() {
        wx.navigateBack({
          success: function() {
            var pages = getCurrentPages();
            if (pages.length > 1) {
              var prevPage = pages[pages.length - 2];
              if (prevPage && prevPage.loadPlants) {
                prevPage.loadPlants();
              }
            }
          }
        });
      }, 1500);
    }).catch(function(err) {
      wx.hideLoading();
      console.error('更新植物失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
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
