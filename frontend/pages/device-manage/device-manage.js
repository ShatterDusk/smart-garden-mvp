// device-manage.js - 设备管理页（完整实现版）
// 支持真实设备配网流程：AP模式 + UDP配置 + 局域网发现
const api = require('../../utils/api.js');

// UDP通信管理器（优化版）
const udpManager = {
  socket: null,
  status: 'closed', // 'closed' | 'connecting' | 'connected' | 'error'
  messageHandlers: [],
  reconnectAttempts: 0,
  maxReconnectAttempts: 3,
  
  // 获取当前状态
  getStatus() {
    return this.status;
  },
  
  // 创建UDP Socket（支持自动重连）
  createSocket() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.status === 'connected') {
        resolve(this.socket);
        return;
      }
      
      this.status = 'connecting';
      
      try {
        const socket = wx.createUDPSocket();
        if (!socket) {
          this.status = 'error';
          reject(new Error('创建UDP Socket失败，请检查基础库版本（需>=2.7.0）'));
          return;
        }
        
        // 绑定端口
        const bindResult = socket.bind();
        if (!bindResult) {
          this.status = 'error';
          reject(new Error('UDP Socket绑定失败'));
          return;
        }
        
        this.socket = socket;
        this.status = 'connected';
        this.reconnectAttempts = 0;
        
        // 设置消息监听（统一处理）
        this._setupMessageListener();
        
        console.log('[UDP] Socket创建成功，状态:', this.status);
        resolve(socket);
        
      } catch (err) {
        this.status = 'error';
        console.error('[UDP] 创建Socket失败:', err);
        reject(err);
      }
    });
  },
  
  // 自动重连
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[UDP] 重连次数已达上限');
      return false;
    }
    
    this.reconnectAttempts++;
    console.log(`[UDP] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // 先关闭现有连接
    this.close();
    
    // 延迟后重连
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      await this.createSocket();
      return true;
    } catch (err) {
      console.error('[UDP] 重连失败:', err);
      return false;
    }
  },
  
  // 设置统一的消息监听器
  _setupMessageListener() {
    if (!this.socket) return;
    
    this.socket.onMessage((res) => {
      try {
        const data = JSON.parse(res.message);
        const messageData = {
          ...data,
          remoteInfo: res.remoteInfo,
          receivedAt: Date.now()
        };
        
        // 分发消息到所有注册的处理器
        this.messageHandlers.forEach(handler => {
          try {
            handler(messageData);
          } catch (e) {
            console.error('[UDP] 消息处理器错误:', e);
          }
        });
      } catch (e) {
        // 忽略非JSON消息
        console.log('[UDP] 收到非JSON消息:', res.message);
      }
    });
    
    // 监听错误
    this.socket.onError((err) => {
      console.error('[UDP] Socket错误:', err);
      this.status = 'error';
    });
    
    // 监听关闭
    this.socket.onClose(() => {
      console.log('[UDP] Socket已关闭');
      this.status = 'closed';
      this.socket = null;
    });
  },
  
  // 注册消息处理器
  onMessage(callback) {
    if (typeof callback !== 'function') return;
    
    // 避免重复注册
    if (!this.messageHandlers.includes(callback)) {
      this.messageHandlers.push(callback);
    }
  },
  
  // 移除消息处理器
  offMessage(callback) {
    const index = this.messageHandlers.indexOf(callback);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  },
  
  // 清除所有消息处理器
  clearMessageHandlers() {
    this.messageHandlers = [];
  },
  
  // 发送UDP广播（设备发现）
  async sendDiscoveryBroadcast(port = 8266) {
    if (!this.socket || this.status !== 'connected') {
      // 尝试自动重连
      const reconnected = await this.reconnect();
      if (!reconnected) {
        throw new Error('UDP Socket未连接且重连失败');
      }
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
      try {
        this.socket.send({
          address: address,
          port: port,
          message: discoveryMessage
        });
        sentCount++;
      } catch (e) {
        console.error(`[UDP] 发送广播到 ${address} 失败:`, e);
      }
    });
    
    console.log(`[UDP] 发现广播已发送 (${sentCount}个地址)`);
    return sentCount;
  },
  
  // 发送WiFi配置到设备（支持plantId）
  sendWifiConfig(deviceIp, port, ssid, password, plantId = '') {
    return new Promise(async (resolve, reject) => {
      if (!this.socket || this.status !== 'connected') {
        reject(new Error('UDP Socket未连接'));
        return;
      }
      
      const configMessage = JSON.stringify({
        cmd: 'config_wifi',
        ssid: ssid,
        password: password,
        plantId: plantId,  // 传递plantId给设备
        timestamp: Date.now()
      });
      
      console.log(`[UDP] 发送WiFi配置到 ${deviceIp}:${port}`);
      
      try {
        this.socket.send({
          address: deviceIp,
          port: port,
          message: configMessage
        });
      } catch (e) {
        reject(new Error('发送WiFi配置失败: ' + e.message));
        return;
      }
      
      // 等待设备响应
      const timeout = setTimeout(() => {
        this.offMessage(onMessage);
        reject(new Error('设备响应超时（10秒）'));
      }, 10000);
      
      let isResolved = false;
      
      const onMessage = (data) => {
        if (isResolved) return;
        
        if (data.cmd === 'config_wifi_ack') {
          isResolved = true;
          clearTimeout(timeout);
          this.offMessage(onMessage);
          resolve(data);
        }
      };
      
      this.onMessage(onMessage);
    });
  },
  
  // 关闭Socket
  close() {
    this.clearMessageHandlers();
    
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        console.error('[UDP] 关闭Socket失败:', e);
      }
      this.socket = null;
    }
    
    this.status = 'closed';
    this.reconnectAttempts = 0;
    console.log('[UDP] Socket已关闭');
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

  // 开始配网流程（优化版）
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
    
    console.log('[配网] 开始配网流程:', {
      device: selectedDevice.deviceName,
      mac: selectedDevice.macAddress,
      wifi: wifiSSID
    });
    
    this.setData({
      isConfiguring: true,
      configStep: 'sending_config',
      configProgress: 10
    });
    
    this.showTip('正在发送WiFi配置...', 'info');
    
    try {
      // 检查UDP连接状态
      if (udpManager.getStatus() !== 'connected') {
        console.log('[配网] UDP未连接，尝试重连...');
        const reconnected = await udpManager.reconnect();
        if (!reconnected) {
          throw new Error('UDP连接失败，请检查网络');
        }
      }
      
      this.setData({ configProgress: 20 });
      
      // 发送WiFi配置到设备（传递plantId）
      console.log('[配网] 发送WiFi配置到:', selectedDevice.ipAddress);
      const result = await udpManager.sendWifiConfig(
        selectedDevice.ipAddress,
        selectedDevice.port,
        wifiSSID,
        wifiPassword,
        this.data.plantId  // 传递植物ID给设备
      );
      
      if (result.status === 'ok') {
        this.setData({
          configStep: 'waiting_device',
          configProgress: 40
        });
        
        this.showTip('配置已发送，等待设备连接...', 'info');
        
        // 等待设备连接到家庭WiFi
        const onlineDevice = await this.waitForDeviceOnline(selectedDevice.macAddress);
        
        this.setData({
          configStep: 'done',
          configProgress: 100
        });
        
        this.showTip('设备配网成功！', 'success');
        
        // 更新选中的设备信息
        const updatedDevices = availableDevices.map(d => {
          if (d.macAddress === selectedDeviceId) {
            return { ...d, ...onlineDevice, status: 'online' };
          }
          return d;
        });
        
        this.setData({
          availableDevices: updatedDevices,
          isConfiguring: false
        });
        
        // 延迟后关闭表单
        setTimeout(() => {
          this.setData({ showWifiForm: false });
        }, 1500);
        
        // 刷新设备列表
        this.loadBoundDevices();
        
      } else {
        throw new Error(result.message || '配置失败');
      }
      
    } catch (err) {
      console.error('[配网] 配网失败:', err);
      
      this.setData({
        configStep: 'error',
        configProgress: 0,
        isConfiguring: false
      });
      
      // 显示详细的错误信息
      wx.showModal({
        title: '配网失败',
        content: err.message || '未知错误',
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            this.retryConfigureDevice();
          }
        }
      });
    }
  }

  // 等待设备上线（优化版）
  waitForDeviceOnline(macAddress, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let checkCount = 0;
      const maxChecks = Math.floor(timeout / 3000);
      
      console.log(`[配网] 开始等待设备上线: ${macAddress}, 超时: ${timeout}ms`);
      
      // 更新进度显示
      const updateProgress = () => {
        checkCount++;
        const elapsed = Date.now() - startTime;
        const progress = Math.min(60 + Math.floor((elapsed / timeout) * 35), 95);
        
        this.setData({
          configProgress: progress
        });
        
        console.log(`[配网] 检查进度: ${checkCount}/${maxChecks}, 已用时: ${elapsed}ms`);
      };
      
      // 定期发送发现广播
      const checkInterval = setInterval(() => {
        updateProgress();
        
        // 发送发现广播
        udpManager.sendDiscoveryBroadcast().catch(err => {
          console.error('[配网] 发送发现广播失败:', err);
        });
      }, 3000);
      
      // 超时处理
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        udpManager.offMessage(messageHandler);
        console.error(`[配网] 设备上线等待超时: ${macAddress}`);
        reject(new Error('设备连接超时（30秒），请检查：\n1. WiFi密码是否正确\n2. 设备是否在范围内\n3. 网络是否正常'));
      }, timeout);
      
      // 消息处理器
      const messageHandler = (data) => {
        // 检查是否是目标设备
        if (data.macAddress !== macAddress) return;
        
        console.log(`[配网] 收到设备响应:`, data);
        
        // 检查设备状态是否为online
        if (data.status === 'online' || data.cmd === 'discover_ack') {
          // 设备已上线
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          udpManager.offMessage(messageHandler);
          
          const elapsed = Date.now() - startTime;
          console.log(`[配网] 设备已上线: ${macAddress}, 用时: ${elapsed}ms`);
          
          // 更新设备信息
          const deviceInfo = {
            macAddress: data.macAddress,
            deviceName: data.deviceName,
            ipAddress: data.remoteInfo?.address || data.ip,
            port: data.remoteInfo?.port || data.port || 8266,
            status: 'online',
            firmwareVersion: data.firmwareVersion
          };
          
          resolve(deviceInfo);
        }
      };
      
      // 注册消息处理器
      udpManager.onMessage(messageHandler);
      
      // 立即发送一次发现广播
      udpManager.sendDiscoveryBroadcast().catch(err => {
        console.error('[配网] 初始发现广播失败:', err);
      });
    });
  },
  
  // 配网重试
  async retryConfigureDevice() {
    const { wifiSSID, wifiPassword, selectedDeviceId } = this.data;
    
    if (!wifiSSID || !selectedDeviceId) {
      this.showTip('请重新选择设备并输入WiFi信息', 'error');
      return;
    }
    
    this.showTip('正在重试配网...', 'info');
    
    // 重置状态
    this.setData({
      isConfiguring: true,
      configStep: 'sending_config',
      configProgress: 10
    });
    
    // 延迟后重新配网
    setTimeout(() => {
      this.configureDevice();
    }, 1000);
  }

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
