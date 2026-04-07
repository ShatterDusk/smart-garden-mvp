// device-manage.js - 设备管理页（完整实现版）
// 支持真实设备配网流程：AP模式 + UDP配置 + 局域网发现
const api = require('../../utils/api.js');

// UDP通信管理器
const udpManager = {
  socket: null,
  isListening: false,
  
  // 创建UDP Socket
  createSocket() {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        resolve(this.socket);
        return;
      }
      
      const socket = wx.createUDPSocket();
      if (!socket) {
        reject(new Error('创建UDP Socket失败，请检查基础库版本'));
        return;
      }
      
      socket.bind();
      this.socket = socket;
      resolve(socket);
    });
  },
  
  // 发送UDP广播（设备发现）
  sendDiscoveryBroadcast(port = 8266) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('UDP Socket未初始化'));
        return;
      }
      
      // 发送发现请求到局域网广播地址
      const discoveryMessage = JSON.stringify({
        cmd: 'discover',
        app: 'proj-alpha',
        timestamp: Date.now()
      });
      
      // 尝试多个常见网段广播地址
      const broadcastAddresses = ['255.255.255.255', '192.168.4.255', '192.168.1.255'];
      let sentCount = 0;
      
      broadcastAddresses.forEach(address => {
        this.socket.send({
          address: address,
          port: port,
          message: discoveryMessage
        });
        sentCount++;
      });
      
      resolve(sentCount);
    });
  },
  
  // 发送WiFi配置到设备
  sendWifiConfig(deviceIp, port, ssid, password) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('UDP Socket未初始化'));
        return;
      }
      
      const configMessage = JSON.stringify({
        cmd: 'config_wifi',
        ssid: ssid,
        password: password,
        timestamp: Date.now()
      });
      
      this.socket.send({
        address: deviceIp,
        port: port,
        message: configMessage
      });
      
      // 等待设备响应
      const timeout = setTimeout(() => {
        reject(new Error('设备响应超时'));
      }, 10000);
      
      // 使用标记避免重复处理
      let isResolved = false;
      
      const onMessage = (res) => {
        if (isResolved) return;
        
        try {
          const data = JSON.parse(res.message);
          if (data.cmd === 'config_wifi_ack') {
            isResolved = true;
            clearTimeout(timeout);
            resolve(data);
          }
        } catch (e) {
          // 忽略非JSON消息
        }
      };
      
      this.socket.onMessage(onMessage);
    });
  },
  
  // 监听设备响应
  onMessage(callback) {
    if (!this.socket) return;
    
    this.socket.onMessage((res) => {
      try {
        const data = JSON.parse(res.message);
        callback({
          ...data,
          remoteInfo: res.remoteInfo
        });
      } catch (e) {
        // 忽略非JSON消息
      }
    });
  },
  
  // 关闭Socket
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isListening = false;
    }
  }
};

Page({
  data: {
    plantId: '',
    currentDevice: null,
    
    // 配网相关
    showWifiForm: false,
    wifiSSID: '',
    wifiPassword: '',
    isConfiguring: false,
    configStep: '', // 'connecting_ap' | 'sending_config' | 'waiting_device' | 'done'
    configProgress: 0,
    
    // 设备发现相关
    isScanning: false,
    scanProgress: 0,
    availableDevices: [],
    selectedDeviceId: '',
    selectedDeviceName: '',
    
    // 已绑定设备列表（从后端获取）
    boundDevices: [],
    
    // 提示信息
    tipMessage: '',
    tipType: 'info',
    
    // 系统信息
    platform: '',
    wifiEnabled: false,
    wifiConnected: false,
    currentWifiSSID: ''
  },

  onLoad(options) {
    const plantId = options.plantId || '';
    this.setData({ plantId });
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查WiFi状态
    this.checkWifiStatus();
    
    // 加载数据
    this.loadCurrentDevice();
    this.loadBoundDevices();
    
    // 初始化UDP
    this.initUDP();
  },

  onShow() {
    // 页面显示时刷新数据（仅当已有 plantId 时）
    if (this.data.plantId) {
      this.loadCurrentDevice();
    }
    this.loadBoundDevices();
  },

  onUnload() {
    // 页面卸载时清理资源
    this.stopScan();
    udpManager.close();
    this.stopWifiStatusMonitor();
  },

  // ========== 系统信息 ==========
  
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          platform: res.platform
        });
      }
    });
  },

  // ========== WiFi状态管理 ==========
  
  checkWifiStatus() {
    wx.getConnectedWifi({
      success: (res) => {
        this.setData({
          wifiEnabled: true,
          wifiConnected: true,
          currentWifiSSID: res.wifi.SSID
        });
      },
      fail: () => {
        this.setData({
          wifiEnabled: false,
          wifiConnected: false,
          currentWifiSSID: ''
        });
      }
    });
  },

  startWifiStatusMonitor() {
    // 监听WiFi状态变化
    wx.onGetWifiList((res) => {
      // WiFi列表更新
    });
    
    wx.onWifiConnected((res) => {
      this.setData({
        wifiConnected: true,
        currentWifiSSID: res.wifi.SSID
      });
    });
  },

  stopWifiStatusMonitor() {
    wx.offGetWifiList();
    wx.offWifiConnected();
  },

  // ========== UDP初始化 ==========
  
  async initUDP() {
    try {
      await udpManager.createSocket();
      
      // 监听设备响应
      udpManager.onMessage((data) => {
        this.handleDeviceResponse(data);
      });
      
      console.log('UDP Socket初始化成功');
    } catch (err) {
      console.error('UDP初始化失败:', err);
      this.showTip('UDP初始化失败: ' + err.message, 'error');
    }
  },

  // ========== 设备发现（局域网扫描） ==========
  
  async startScan() {
    if (this.data.isScanning) return;
    
    // 检查WiFi是否开启
    const wifiStatus = await this.getWifiStatus();
    if (!wifiStatus.enabled) {
      this.showTip('请先开启WiFi', 'error');
      return;
    }
    
    this.setData({
      isScanning: true,
      scanProgress: 0,
      availableDevices: []
    });
    
    this.showTip('正在扫描局域网设备...', 'info');
    
    try {
      // 确保UDP已初始化
      if (!udpManager.socket) {
        await this.initUDP();
      }
      
      // 发送发现广播
      await udpManager.sendDiscoveryBroadcast();
      
      // 模拟扫描进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        this.setData({ scanProgress: progress });
        
        if (progress >= 100) {
          clearInterval(progressInterval);
          this.setData({ isScanning: false });
          
          if (this.data.availableDevices.length === 0) {
            this.showTip('未发现设备，请确保设备已进入配网模式', 'warning');
          } else {
            this.showTip(`发现 ${this.data.availableDevices.length} 个设备`, 'success');
          }
        }
      }, 300);
      
      // 5秒后停止扫描
      setTimeout(() => {
        clearInterval(progressInterval);
        this.setData({ isScanning: false });
      }, 5000);
      
    } catch (err) {
      console.error('扫描失败:', err);
      this.setData({ isScanning: false });
      this.showTip('扫描失败: ' + err.message, 'error');
    }
  },

  stopScan() {
    this.setData({
      isScanning: false,
      scanProgress: 0
    });
  },

  // 处理设备响应
  handleDeviceResponse(data) {
    console.log('收到设备响应:', data);
    
    if (data.cmd === 'discover_ack' || data.cmd === 'device_info') {
      // 检查设备是否已存在
      const exists = this.data.availableDevices.some(
        d => d.macAddress === data.macAddress
      );
      
      if (!exists) {
        const newDevice = {
          macAddress: data.macAddress,
          deviceName: data.deviceName || `proj-alpha-${data.macAddress.slice(-4)}`,
          deviceType: data.deviceType || 'sensor',
          ipAddress: data.remoteInfo?.address || data.ip,
          port: data.remoteInfo?.port || data.port || 8266,
          rssi: data.rssi || 0,
          status: 'unbound',
          firmwareVersion: data.firmwareVersion,
          discoveredAt: Date.now()
        };
        
        this.setData({
          availableDevices: [...this.data.availableDevices, newDevice]
        });
      }
    }
  },

  getWifiStatus() {
    return new Promise((resolve) => {
      wx.getConnectedWifi({
        success: () => resolve({ enabled: true, connected: true }),
        fail: () => resolve({ enabled: false, connected: false })
      });
    });
  },

  // ========== 加载数据 ==========
  
  loadCurrentDevice() {
    const plantId = this.data.plantId;
    if (!plantId) return;
    
    api.getPlantDetail(plantId).then((plant) => {
      if (plant && plant.currentDevice) {
        this.setData({
          currentDevice: {
            ...plant.currentDevice,
            statusText: this.getStatusText(plant.currentDevice.status)
          }
        });
      } else {
        this.setData({ currentDevice: null });
      }
    }).catch((err) => {
      console.error('加载设备信息失败:', err);
    });
  },

  loadBoundDevices() {
    api.getDeviceList().then((devices) => {
      const boundDevices = (devices || []).map((device) => ({
        ...device,
        statusText: this.getStatusText(device.status)
      }));
      
      this.setData({ boundDevices });
    }).catch((err) => {
      console.error('获取设备列表失败:', err);
    });
  },

  getStatusText(status) {
    const statusMap = {
      'online': '在线',
      'offline': '离线',
      'unbound': '未绑定'
    };
    return statusMap[status] || status;
  },

  // ========== WiFi配网 ==========
  
  toggleWifiForm() {
    this.setData({
      showWifiForm: !this.data.showWifiForm,
      configStep: '',
      configProgress: 0
    });
  },

  onSSIDInput(e) {
    this.setData({ wifiSSID: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ wifiPassword: e.detail.value });
  },

  // 使用当前连接的WiFi
  useCurrentWifi() {
    if (this.data.currentWifiSSID) {
      this.setData({ wifiSSID: this.data.currentWifiSSID });
    } else {
      this.showTip('未获取到当前WiFi', 'warning');
    }
  },

  // 开始配网流程
  async configureDevice() {
    const { wifiSSID, wifiPassword, availableDevices, selectedDeviceId } = this.data;
    
    if (!wifiSSID) {
      this.showTip('请输入WiFi名称', 'error');
      return;
    }
    
    // 查找选中的设备
    const selectedDevice = availableDevices.find(
      d => d.macAddress === selectedDeviceId
    );
    
    if (!selectedDevice) {
      this.showTip('请先选择要配置的设备', 'error');
      return;
    }
    
    this.setData({
      isConfiguring: true,
      configStep: 'sending_config',
      configProgress: 20
    });
    
    this.showTip('正在发送WiFi配置...', 'info');
    
    try {
      // 发送WiFi配置到设备
      const result = await udpManager.sendWifiConfig(
        selectedDevice.ipAddress,
        selectedDevice.port,
        wifiSSID,
        wifiPassword
      );
      
      if (result.status === 'ok') {
        this.setData({
          configStep: 'waiting_device',
          configProgress: 60
        });
        
        this.showTip('配置已发送，等待设备连接...', 'info');
        
        // 等待设备连接到家庭WiFi
        await this.waitForDeviceOnline(selectedDevice.macAddress);
        
        this.setData({
          configStep: 'done',
          configProgress: 100,
          isConfiguring: false,
          showWifiForm: false
        });
        
        this.showTip('设备配网成功！', 'success');
        
        // 刷新设备列表
        this.loadBoundDevices();
        
      } else {
        throw new Error(result.message || '配置失败');
      }
      
    } catch (err) {
      console.error('配网失败:', err);
      this.setData({
        isConfiguring: false,
        configStep: ''
      });
      this.showTip('配网失败: ' + err.message, 'error');
    }
  },

  // 等待设备上线
  waitForDeviceOnline(macAddress, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // 重新扫描，看设备是否已连接
        udpManager.sendDiscoveryBroadcast();
      }, 3000);
      
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('设备连接超时'));
      }, timeout);
      
      // 监听设备响应
      const checkHandler = (data) => {
        if (data.macAddress === macAddress && data.status === 'online') {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          // 微信小程序 UDP Socket 没有 offMessage 方法，使用标记避免重复处理
          checkHandler._resolved = true;
          resolve(data);
        }
      };
      
      // 包装处理函数，避免重复处理
      const wrappedHandler = (data) => {
        if (!checkHandler._resolved) {
          checkHandler(data);
        }
      };
      
      udpManager.onMessage(wrappedHandler);
    });
  },

  // ========== 设备选择 ==========

  selectDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = this.data.availableDevices[index];

    this.setData({
      selectedDeviceId: device.macAddress,
      selectedDeviceName: device.deviceName
    });
  },

  // ========== 设备绑定 ==========
  
  bindDevice() {
    const plantId = this.data.plantId;
    const macAddress = this.data.selectedDeviceId;
    const selectedDevice = this.data.availableDevices.find(
      d => d.macAddress === macAddress
    );
    
    if (!macAddress) {
      this.showTip('请先选择设备', 'error');
      return;
    }
    
    if (!plantId) {
      this.showTip('缺少植物信息', 'error');
      return;
    }
    
    this.showTip('正在绑定...', 'info');
    
    api.bindDevice({
      macAddress: macAddress,
      deviceName: selectedDevice ? selectedDevice.deviceName : undefined,
      plantId: plantId
    }).then((result) => {
      this.showTip('绑定成功', 'success');
      
      this.setData({
        currentDevice: {
          deviceId: result.deviceId,
          deviceName: result.deviceName || selectedDevice.deviceName,
          macAddress: macAddress,
          status: result.status,
          statusText: this.getStatusText(result.status)
        },
        selectedDeviceId: ''
      });
      
      this.loadBoundDevices();
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch((err) => {
      console.error('绑定设备失败:', err);
      this.showTip('绑定失败: ' + (err.message || '未知错误'), 'error');
    });
  },

  // ========== 解绑设备 ==========
  
  unbindDevice() {
    const { currentDevice } = this.data;
    
    if (!currentDevice) {
      this.showTip('当前没有绑定的设备', 'error');
      return;
    }
    
    wx.showModal({
      title: '确认解绑',
      content: `解绑后将无法获取"${currentDevice.deviceName}"的环境数据，是否继续？`,
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          this.performUnbind();
        }
      }
    });
  },

  performUnbind() {
    const deviceId = this.data.currentDevice.deviceId;
    
    this.showTip('正在解绑...', 'info');
    
    api.unbindDevice(deviceId).then(() => {
      this.setData({
        currentDevice: null,
        selectedDeviceId: ''
      });
      this.showTip('解绑成功', 'success');
      this.loadBoundDevices();
    }).catch((err) => {
      console.error('解绑设备失败:', err);
      this.showTip('解绑失败', 'error');
    });
  },

  // ========== 工具方法 ==========
  
  showTip(message, type = 'info') {
    this.setData({
      tipMessage: message,
      tipType: type
    });
    
    setTimeout(() => {
      this.setData({ tipMessage: '' });
    }, 3000);
  },

  // 刷新设备列表
  refreshDevices() {
    this.loadBoundDevices();
    this.startScan();
  }
});
