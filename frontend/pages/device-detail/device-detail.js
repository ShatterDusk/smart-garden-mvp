// device-detail.js - 设备详情页（重新设计版）
// 专注于设备信息展示和管理，不涉及环境数据详情（由 metric-detail 负责）
const api = require('../../utils/api.js');

Page({
  data: {
    deviceId: '',
    plantId: '',

    // 设备基本信息
    deviceInfo: {
      deviceId: '',
      deviceName: '',
      macAddress: '',
      status: 'offline',
      statusText: '离线',
      batteryLevel: 0,
      firmwareVersion: '',
      lastHeartbeat: '',
      createdAt: ''
    },

    // 网络信息
    networkInfo: {
      ssid: '',
      ipAddress: '',
      signalStrength: 0
    },

    // 绑定植物
    boundPlant: {
      plantId: '',
      nickname: '',
      coverImageUrl: '',
      species: ''
    },

    // 加载状态
    isLoading: true
  },

  onLoad(options) {
    const { deviceId, plantId } = options;

    if (!deviceId && !plantId) {
      wx.showToast({
        title: '缺少设备或植物信息',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      deviceId: deviceId || '',
      plantId: plantId || ''
    });

    this.loadDeviceDetail();
  },

  onShow() {
    // 页面显示时刷新设备状态
    if (this.data.deviceId) {
      this.loadDeviceDetail();
    }
  },

  // 加载设备详情
  loadDeviceDetail() {
    const { deviceId, plantId } = this.data;

    this.setData({ isLoading: true });

    // 优先使用 deviceId 加载，否则通过 plantId 查找
    if (deviceId) {
      this.loadDeviceById(deviceId);
    } else if (plantId) {
      this.loadDeviceByPlantId(plantId);
    }
  },

  // 通过设备ID加载
  loadDeviceById(deviceId) {
    api.getDeviceDetail(deviceId)
      .then((device) => {
        this.processDeviceData(device);
      })
      .catch((err) => {
        console.error('加载设备详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },

  // 通过植物ID加载设备
  loadDeviceByPlantId(plantId) {
    api.getPlantDetail(plantId)
      .then((plant) => {
        if (plant && plant.currentDevice) {
          this.processDeviceData(plant.currentDevice);
          this.setData({
            deviceId: plant.currentDevice.deviceId
          });
        } else {
          wx.showToast({
            title: '该植物未绑定设备',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        console.error('加载植物详情失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },

  // 处理设备数据
  processDeviceData(device) {
    if (!device) return;

    this.setData({
      deviceInfo: {
        deviceId: device.deviceId || '',
        deviceName: device.deviceName || '未命名设备',
        macAddress: device.macAddress || '',
        status: device.status || 'offline',
        statusText: this.getStatusText(device.status),
        batteryLevel: device.batteryLevel || 0,
        firmwareVersion: device.firmwareVersion || 'v1.0.0',
        lastHeartbeat: this.formatTime(device.lastHeartbeat),
        createdAt: this.formatDate(device.createdAt)
      },
      networkInfo: {
        ssid: device.ssid || device.networkInfo?.ssid || '未知',
        ipAddress: device.ipAddress || device.networkInfo?.ipAddress || '--',
        signalStrength: device.signalStrength || device.networkInfo?.signalStrength || 0
      },
      boundPlant: device.boundPlant ? {
        plantId: device.boundPlant.plantId || '',
        nickname: device.boundPlant.nickname || '未命名植物',
        coverImageUrl: device.boundPlant.coverImageUrl || '/images/default-plant.png',
        species: device.boundPlant.species || ''
      } : {
        plantId: this.data.plantId,
        nickname: '未获取植物信息',
        coverImageUrl: '/images/default-plant.png',
        species: ''
      }
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      online: '在线',
      offline: '离线',
      unbound: '未绑定'
    };
    return statusMap[status] || status;
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '--';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return '--';

    const now = new Date();
    const diff = now - date;

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    }
    // 小于24小时
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    }
    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前';
    }

    // 超过7天显示具体日期
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取信号强度文本
  getSignalText(rssi) {
    if (!rssi || rssi === 0) return '--';
    if (rssi >= -50) return '强';
    if (rssi >= -65) return '中';
    return '弱';
  },

  // 跳转到植物详情
  goToPlantDetail() {
    const { boundPlant } = this.data;
    if (!boundPlant.plantId) {
      wx.showToast({
        title: '暂无植物信息',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/plant-detail/plant-detail?plantId=${boundPlant.plantId}`
    });
  },

  // 跳转到设备管理页（换绑）
  goToManage() {
    const { deviceId, boundPlant } = this.data;
    const plantId = boundPlant.plantId || this.data.plantId;

    if (!plantId) {
      wx.showToast({
        title: '缺少植物信息',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/device-manage/device-manage?plantId=${plantId}&currentDeviceId=${deviceId}`
    });
  },

  // 解绑设备
  unbindDevice() {
    const { deviceInfo, boundPlant } = this.data;

    wx.showModal({
      title: '确认解绑',
      content: `解绑后将无法获取"${deviceInfo.deviceName}"的环境数据，是否继续？`,
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          this.performUnbind();
        }
      }
    });
  },

  // 执行解绑
  performUnbind() {
    const { deviceId } = this.data;

    wx.showLoading({
      title: '解绑中...'
    });

    api.unbindDevice(deviceId)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '解绑成功',
          icon: 'success'
        });

        // 通知上一页刷新
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.refreshData) {
          prevPage.refreshData();
        }

        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('解绑失败:', err);
        wx.showToast({
          title: '解绑失败',
          icon: 'none'
        });
      });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDeviceDetail();
    wx.stopPullDownRefresh();
  }
});
