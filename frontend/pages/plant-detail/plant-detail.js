// plant-detail.js - 植物详情页
// 引入 API 服务
const api = require('../../utils/api.js');

Page({
  data: {
    plantId: '',
    plantInfo: {
      plantId: '',
      nickname: '',
      species: '',
      plantCategory: '',
      coverImageUrl: '',
      currentDeviceId: '',
      createdAt: ''
    },
    deviceInfo: {
      deviceId: '',
      deviceName: '',
      status: 'unbound',
      batteryLevel: 0,
      lastHeartbeat: ''
    },
    diagnosisCards: [],  // 统一诊断卡数组
    careRecords: [],
    careRecordsPreview: [],
    envDataSource: 'device',
    deviceMetrics: [],
    weatherData: null,
    weatherMetrics: [],
    environmentData: {
      current: {
        recordedAt: ''
      }
    },
    currentTab: 'overview',
    tabs: [
      { id: 'overview', label: '概览' },
      { id: 'environment', label: '环境' },
      { id: 'diagnosis', label: '诊断' },
      { id: 'care', label: '养护' }
    ],
    expandedDiagnosisId: '',
    showCareEditModal: false,
    showCareActionSheet: false,
    editingRecordId: '',
    selectedRecord: null,
    careForm: {
      actionType: 'water',
      description: '',
      performedAt: ''
    },
    actionTypes: [
      { type: 'water', name: '浇水', icon: '💧' },
      { type: 'fertilize', name: '施肥', icon: '🧪' },
      { type: 'prune', name: '修剪', icon: '✂️' },
      { type: 'repot', name: '换盆', icon: '🪴' },
      { type: 'pestControl', name: '除虫', icon: '🐛' },
      { type: 'other', name: '其他', icon: '📝' }
    ],
    dateTimeRange: [],
    dateTimeIndex: [],
    loading: true,
    plantEmoji: '🌱',
    healthScore: '--',
    healthStatusClass: '',
    healthStatusText: '未诊断',
    deviceIcon: '📱',
    deviceStatusText: '未绑定设备',
    deviceStatusClass: 'unbound'
  },

  onLoad: function(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this.setData({ plantId: id });
    this.loadPlantDetail();
  },

  onShow: function() {
    const plantId = this.data.plantId;
    if (plantId && plantId !== 'undefined' && plantId !== '') {
      this.loadPlantDetail();
    }
  },

  onPullDownRefresh: function() {
    const that = this;
    this.loadPlantDetail().then(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadPlantDetail: function() {
    var that = this;
    var plantId = this.data.plantId;
    
    if (!plantId || plantId === 'undefined') {
      console.warn('植物ID无效，跳过加载');
      return Promise.resolve();
    }
    
    this.setData({ loading: true });
    
    return api.getPlantDetail(plantId).then(function(plantData) {
      if (!plantData) {
        wx.showToast({ title: '植物不存在', icon: 'error' });
        that.setData({ loading: false });
        return;
      }
      
      // 格式化养护记录，添加 icon、actionName、displayTime
      var formattedCareRecords = that.formatCareRecords(plantData.careRecords || []);

      // 格式化诊断卡数据，添加 displayTime
      var formattedDiagnosisCards = that.formatDiagnosisCards(plantData.diagnosisCards || []);

      that.setData({
        plantInfo: {
          plantId: plantData.plantId,
          nickname: plantData.nickname,
          species: plantData.species,
          plantCategory: plantData.plantCategory,
          coverImageUrl: plantData.coverImageUrl,
          currentDeviceId: plantData.currentDeviceId,
          createdAt: plantData.createdAt,
          location: plantData.locationName,
          remark: plantData.remark
        },
        diagnosisCards: formattedDiagnosisCards,
        careRecords: formattedCareRecords,
        careRecordsPreview: formattedCareRecords.slice(0, 3),
        deviceInfo: plantData.device || { status: 'unbound' },
        environmentData: plantData.environmentData || { current: {} },
        deviceMetrics: (plantData.environmentData && plantData.environmentData.deviceMetrics) || [],
        weatherMetrics: (plantData.environmentData && plantData.environmentData.weatherMetrics) || [],
        weatherData: (plantData.environmentData && plantData.environmentData.weatherMetrics) ? {
          location: (plantData.environmentData && plantData.environmentData.location) || plantData.locationName || null,
          updateTime: plantData.environmentData && plantData.environmentData.updateTime ? that.formatDateTime(plantData.environmentData.updateTime) : null,
          recordedAt: plantData.environmentData && plantData.environmentData.recordedAt
        } : null
      });
      
      that.updateComputedProperties();
      that.setData({ loading: false });
    }).catch(function(err) {
      console.error('加载植物详情失败:', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    });
  },

  updateComputedProperties: function() {
    const plantInfo = this.data.plantInfo;
    const diagnosisCards = this.data.diagnosisCards;
    const deviceInfo = this.data.deviceInfo;

    // 计算属性：最新诊断为数组第一个
    const latestDiagnosis = diagnosisCards[0] || {};

    const emojiMap = {
      succulent: '🌵',
      flower: '🌹',
      foliage: '🌿',
      vegetable: '🥬'
    };
    const plantEmoji = emojiMap[plantInfo.plantCategory] || '🌱';

    const healthScore = latestDiagnosis.healthScore || '--';
    const healthStatusClass = latestDiagnosis.status || '';
    const statusTextMap = {
      healthy: '健康',
      warning: '警告',
      critical: '严重'
    };
    const healthStatusText = statusTextMap[latestDiagnosis.status] || '未诊断';
    
    const deviceIcon = plantInfo.currentDeviceId ? '📡' : '📱';
    const deviceStatusText = plantInfo.currentDeviceId 
      ? (deviceInfo.status === 'online' ? '设备在线' : '设备离线')
      : '未绑定设备';
    const deviceStatusClass = plantInfo.currentDeviceId ? deviceInfo.status : 'unbound';
    
    const joinedDays = this.calculateJoinedDays(plantInfo.createdAt);
    
    this.setData({
      plantEmoji: plantEmoji,
      healthScore: healthScore,
      healthStatusClass: healthStatusClass,
      healthStatusText: healthStatusText,
      deviceIcon: deviceIcon,
      deviceStatusText: deviceStatusText,
      deviceStatusClass: deviceStatusClass,
      joinedDays: joinedDays
    });
  },

  calculateJoinedDays: function(createdAt) {
    if (!createdAt) return 0;
    const createDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now - createDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  /**
   * 格式化养护记录，添加 icon、actionName、displayTime
   */
  formatCareRecords: function(records) {
    const actionTypeMap = {
      water: { name: '浇水', icon: '💧' },
      fertilize: { name: '施肥', icon: '🧪' },
      prune: { name: '修剪', icon: '✂️' },
      repot: { name: '换盆', icon: '🪴' },
      pestControl: { name: '除虫', icon: '🐛' },
      other: { name: '其他', icon: '📝' }
    };
    const that = this;

    return records.map(function(record) {
      const actionInfo = actionTypeMap[record.actionType] || { name: '其他', icon: '📝' };
      return {
        ...record,
        actionName: actionInfo.name,
        icon: actionInfo.icon,
        displayTime: that.formatDateTime(record.performedAt)
      };
    });
  },

  /**
   * 格式化诊断历史，添加 displayTime
   */
  /**
   * 格式化诊断卡数组，添加 displayTime
   */
  formatDiagnosisCards: function(cards) {
    const that = this;
    return cards.map(function(item) {
      return {
        ...item,
        displayTime: that.formatDateTime(item.createdAt)
      };
    });
  },

  formatDateTime: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return month + '-' + day + ' ' + hours + ':' + minutes;
  },

  formatDate: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  },

  switchTab: function(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentTab: id });
  },

  addCareRecord: function() {
    const now = new Date();
    const dateTimeStr = this.formatDateTimeLocal(now);
    
    this.initDateTimeRange();
    
    this.setData({
      showCareEditModal: true,
      editingRecordId: '',
      careForm: {
        actionType: 'water',
        description: '',
        performedAt: dateTimeStr
      }
    });
  },

  initDateTimeRange: function() {
    const years = [];
    const months = [];
    const days = [];
    const hours = [];
    const minutes = [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    
    for (let i = currentYear - 1; i <= currentYear + 1; i++) {
      years.push(i + '年');
    }
    for (let i = 1; i <= 12; i++) {
      months.push(i + '月');
    }
    for (let i = 1; i <= 31; i++) {
      days.push(i + '日');
    }
    for (let i = 0; i <= 23; i++) {
      hours.push(i.toString().padStart(2, '0') + '时');
    }
    for (let i = 0; i <= 59; i++) {
      minutes.push(i.toString().padStart(2, '0') + '分');
    }
    
    this.setData({
      dateTimeRange: [years, months, days, hours, minutes]
    });
  },

  formatDateTimeLocal: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  },

  closeCareEditModal: function() {
    this.setData({
      showCareEditModal: false,
      editingRecordId: '',
      selectedRecord: null
    });
  },

  preventBubble: function() {
  },

  selectActionType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'careForm.actionType': type
    });
  },

  onCareDescInput: function(e) {
    this.setData({
      'careForm.description': e.detail.value
    });
  },

  onDateTimeChange: function(e) {
    const value = e.detail.value;
    const year = parseInt(this.data.dateTimeRange[0][value[0]]);
    const month = parseInt(this.data.dateTimeRange[1][value[1]]);
    const day = parseInt(this.data.dateTimeRange[2][value[2]]);
    const hour = parseInt(this.data.dateTimeRange[3][value[3]]);
    const minute = parseInt(this.data.dateTimeRange[4][value[4]]);
    
    const dateStr = year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0') + ' ' + 
                  hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
    
    this.setData({
      'careForm.performedAt': dateStr,
      dateTimeIndex: value
    });
  },

  saveCareRecord: function() {
    const that = this;
    const form = this.data.careForm;
    const plantId = this.data.plantId;
    
    if (!form.actionType) {
      wx.showToast({ title: '请选择操作类型', icon: 'none' });
      return;
    }

    const typeNames = {
      water: '浇水',
      fertilize: '施肥',
      prune: '修剪',
      repot: '换盆',
      pestControl: '除虫',
      other: '其他'
    };

    const careData = {
      actionType: form.actionType,
      description: form.description || typeNames[form.actionType],
      performedAt: new Date(form.performedAt).toISOString()
    };

    const apiCall = this.data.editingRecordId 
      ? api.updateCareRecord(this.data.editingRecordId, careData)
      : api.addCareRecord(plantId, careData);

    apiCall.then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' });
      that.loadPlantDetail();
      that.closeCareEditModal();
    }).catch(function(err) {
      console.error('保存养护记录失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  onCareRecordLongPress: function(e) {
    const record = e.currentTarget.dataset.record;
    this.setData({
      showCareActionSheet: true,
      selectedRecord: record,
      editingRecordId: record.recordId
    });
  },

  closeCareActionSheet: function() {
    this.setData({
      showCareActionSheet: false,
      selectedRecord: null,
      editingRecordId: ''
    });
  },

  editCareRecord: function() {
    const record = this.data.selectedRecord;
    if (!record) return;

    this.closeCareActionSheet();
    this.initDateTimeRange();

    const performedDate = new Date(record.performedAt);
    const dateTimeStr = this.formatDateTimeLocal(performedDate);

    this.setData({
      showCareEditModal: true,
      editingRecordId: record.recordId,
      careForm: {
        actionType: record.actionType,
        description: record.description === record.actionName ? '' : record.description,
        performedAt: dateTimeStr
      }
    });
  },

  confirmDeleteCareRecord: function() {
    const that = this;
    this.closeCareActionSheet();
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条养护记录吗？',
      confirmColor: '#ff4d4f',
      success: function(res) {
        if (res.confirm) {
          that.deleteCareRecord();
        }
      }
    });
  },

  deleteCareRecord: function() {
    const that = this;
    const recordId = this.data.editingRecordId;
    if (!recordId) return;

    api.deleteCareRecord(recordId).then(function() {
      wx.showToast({ title: '删除成功', icon: 'success' });
      that.loadPlantDetail();
      that.closeCareEditModal();
    }).catch(function(err) {
      console.error('删除养护记录失败:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  },

  consultAI: function() {
    const plantId = this.data.plantInfo.plantId;
    wx.navigateTo({
      url: '/pages/plant-sessions/plant-sessions?plantId=' + plantId
    });
  },

  editPlant: function() {
    const plantId = this.data.plantId;
    wx.navigateTo({
      url: '/pages/add-plant/add-plant?mode=edit&id=' + plantId
    });
  },

  sharePlant: function() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  goToDeviceManage: function() {
    wx.navigateTo({
      url: '/pages/device-manage/device-manage?plantId=' + this.data.plantId
    });
  },

  viewDiagnosisDetail: function(e) {
    const cardId = e.currentTarget.dataset.diagnosisCardId;
    this.toggleDiagnosisDetail(e);
  },

  toggleDiagnosisDetail: function(e) {
    const cardId = e.currentTarget.dataset.id;
    const currentExpanded = this.data.expandedDiagnosisId;
    const newExpanded = (currentExpanded === cardId) ? '' : cardId;
    this.setData({ expandedDiagnosisId: newExpanded });
  },

  onDiagnosisCardExpand: function(e) {
    const diagnosisCardId = e.detail.diagnosisCardId;
    const currentExpanded = this.data.expandedDiagnosisId;
    const newExpanded = (currentExpanded === diagnosisCardId) ? '' : diagnosisCardId;
    this.setData({ expandedDiagnosisId: newExpanded });
  },

  onDiagnosisCardAction: function(e) {
    const action = e.detail.action;
    const sessionId = e.detail.sessionId;

    if (action === 'chat') {
      if (!sessionId) {
        wx.showToast({ title: '会话信息不存在', icon: 'none' });
        return;
      }
      wx.navigateTo({
        url: '/pages/qna/qna?sessionType=plant&sessionId=' + sessionId + '&title=诊断对话'
      });
    } else if (action === 'share') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
  },

  goToChat: function(e) {
    const sessionId = e.currentTarget.dataset.session;
    if (!sessionId) {
      wx.showToast({ title: '会话信息不存在', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/qna/qna?sessionType=plant&sessionId=' + sessionId + '&title=诊断对话'
    });
  },

  shareDiagnosis: function(e) {
    const cardId = e.currentTarget.dataset.id;
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  viewCareDetail: function(e) {
    const recordId = e.currentTarget.dataset.recordId;
    wx.showToast({ title: '养护详情开发中', icon: 'none' });
  },

  switchEnvDataSource: function(e) {
    const source = e.currentTarget.dataset.source;
    this.setData({ envDataSource: source });
  },

  viewMetricDetail: function(e) {
    const metric = e.currentTarget.dataset.metric;
    wx.navigateTo({
      url: '/pages/metric-detail/metric-detail?plantId=' + this.data.plantId + '&metric=' + metric + '&source=device'
    });
  },

  viewWeatherDetail: function(e) {
    const metric = e.currentTarget.dataset.metric;
    wx.navigateTo({
      url: '/pages/metric-detail/metric-detail?plantId=' + this.data.plantId + '&metric=' + metric + '&source=weather'
    });
  },

  goToDeviceDetail: function() {
    wx.navigateTo({
      url: '/pages/device-detail/device-detail?deviceId=' + this.data.deviceInfo.deviceId
    });
  },

  goToDiagnosisHistory: function() {
    this.setData({ currentTab: 'diagnosis' });
  },

  goToCareRecords: function() {
    this.setData({ currentTab: 'care' });
  },

  goToEnvironment: function() {
    this.setData({ currentTab: 'environment' });
  },

  /**
   * 查看详细天气预报
   */
  viewWeatherForecast: function() {
    const plantInfo = this.data.plantInfo;
    if (!plantInfo.locationLat || !plantInfo.locationLng) {
      wx.showToast({
        title: '请先设置植物位置',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/weather/weather?lat=' + plantInfo.locationLat + '&lng=' + plantInfo.locationLng + '&name=' + encodeURIComponent(plantInfo.location || plantInfo.nickname)
    });
  },

  /**
   * 选择植物位置
   */
  chooseLocation: function() {
    const that = this;
    const plantId = this.data.plantId;

    wx.chooseLocation({
      success: function(res) {
        const locationData = {
          locationName: res.name || res.address,
          locationLat: res.latitude,
          locationLng: res.longitude
        };

        // 更新植物位置（不需要城市代码，后端用经纬度查询天气）
        api.updatePlant(plantId, locationData).then(function() {
          wx.showToast({
            title: '位置设置成功',
            icon: 'success'
          });
          // 刷新页面数据
          that.loadPlantDetail();
        }).catch(function(err) {
          console.error('设置位置失败:', err);
          wx.showToast({
            title: '设置位置失败',
            icon: 'none'
          });
        });
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({
            title: '请选择位置',
            icon: 'none'
          });
        }
      }
    });
  },

  onShareAppMessage: function() {
    const plantInfo = this.data.plantInfo;
    return {
      title: '查看我的植物：' + plantInfo.nickname,
      path: '/pages/plant-detail/plant-detail?id=' + this.data.plantId
    };
  }
});
