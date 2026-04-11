// metric-detail.js - 环境指标详情页
// 引入 API 服务
const api = require('../../utils/api.js');

// 调试日志工具
const DEBUG = true;
function log(tag, ...args) {
  if (DEBUG) {
    console.log(`[metric-detail][${tag}]`, ...args);
  }
}
function warn(tag, ...args) {
  console.warn(`[metric-detail][${tag}]`, ...args);
}
function error(tag, ...args) {
  console.error(`[metric-detail][${tag}]`, ...args);
}

Page({
  data: {
    plantId: '',
    metricCode: '',
    dataSource: 'device',
    metricInfo: {
      code: '',
      icon: '🌡️',
      name: '温度',
      unit: '°C',
      currentValue: 22.5,
      status: 'normal',
      statusText: '正常',
      min: 15,
      max: 30
    },
    timeRanges: [
      { label: '24小时', value: '24h' },
      { label: '7天', value: '7d' },
      { label: '30天', value: '30d' }
    ],
    currentRange: '7d',
    chartSubtitle: '最近7天趋势',
    statistics: {
      max: 28.5,
      min: 18.2,
      avg: 23.1,
      count: 168
    },
    historyData: [],
    hasMoreData: true,
    lastUpdateTime: '10:30',
    showTooltip: false,
    tooltipX: 0,
    tooltipY: 0,
    tooltipData: {
      time: '',
      value: 0
    },
    canvasContext: null,
    chartData: []
  },

  onLoad(options) {
    log('onLoad', '页面加载，参数:', options);
    
    try {
      const { plantId, metric, source } = options;
      
      if (!plantId) {
        warn('onLoad', '缺少 plantId 参数');
        wx.showToast({ title: '参数错误', icon: 'error' });
        return;
      }
      
      this.setData({
        plantId: plantId || '',
        metricCode: metric || 'temperature',
        dataSource: source || 'device'
      });
      
      log('onLoad', '初始化数据:', { plantId, metricCode: metric, dataSource: source });
      
      this.loadMetricInfo();
      this.loadChartData();
    } catch (err) {
      error('onLoad', '页面加载失败:', err);
      wx.showToast({ title: '页面加载失败', icon: 'error' });
    }
  },

  onReady() {
    setTimeout(() => {
      this.initChart();
    }, 100);
  },

  loadMetricInfo() {
    const { metricCode, plantId, dataSource } = this.data;
    const that = this;
    
    const metricDefinitions = {
      temperature: { name: '温度', unit: '°C', icon: '🌡️', min: 15, max: 30 },
      humidity: { name: '湿度', unit: '%', icon: '💧', min: 40, max: 70 },
      lightIntensity: { name: '光照强度', unit: 'lux', icon: '☀️', min: 0, max: 200000 },
      soilMoisture: { name: '土壤湿度', unit: '%', icon: '🌱', min: 30, max: 70 },
      soilTemperature: { name: '土壤温度', unit: '°C', icon: '🌡️', min: 15, max: 28 },
      soilPh: { name: '土壤酸碱度', unit: 'pH', icon: '🔬', min: 3, max: 9 },
      batteryLevel: { name: '设备电量', unit: '%', icon: '🔋', min: 0, max: 100 },
      cloudCover: { name: '云量', unit: '%', icon: '☁️', min: 0, max: 100 },
      dewPoint: { name: '露点温度', unit: '°C', icon: '💧', min: -50, max: 50 },
      feelsLike: { name: '体感温度', unit: '°C', icon: '🌡️', min: -50, max: 60 },
      precip: { name: '降水量', unit: 'mm', icon: '🌧️', min: 0, max: 500 },
      pressure: { name: '气压', unit: 'hPa', icon: '🌐', min: 800, max: 1100 },
      sunHours: { name: '日照时长', unit: 'h', icon: '☀️', min: 0, max: 24 },
      visibility: { name: '能见度', unit: 'km', icon: '👁️', min: 0, max: 100 },
      weatherCondition: { name: '天气状况', unit: '', icon: '☀️', min: 100, max: 999 },
      windDirection360: { name: '风向', unit: '°', icon: '🧭', min: 0, max: 360 },
      windScale: { name: '风力等级', unit: '级', icon: '💨', min: 0, max: 12 },
      windSpeed: { name: '风速', unit: 'km/h', icon: '💨', min: 0, max: 200 }
    };
    
    const def = metricDefinitions[metricCode] || { name: '未知指标', unit: '', icon: '❓', min: 0, max: 100 };
    
    // 获取真实当前值
    api.getCurrentEnvironment(plantId)
      .then(function(res) {
        log('loadMetricInfo', '获取实时环境数据:', res);
        
        // 从响应中获取当前指标值
        let currentValue = 0;
        let status = 'normal';
        let statusText = '正常';
        
        // 根据数据源选择读取方式
        if (dataSource === 'device') {
          // 从传感器数据中获取
          if (res && res.deviceMetrics && Array.isArray(res.deviceMetrics)) {
            const sensorReading = res.deviceMetrics.find(function(r) {
              return r.metricCode === metricCode;
            });
            if (sensorReading) {
              currentValue = parseFloat(sensorReading.value) || 0;
            }
          }
        } else if (dataSource === 'weather') {
          // 从天气数据中获取
          if (res && res.weatherMetrics && Array.isArray(res.weatherMetrics)) {
            const weatherReading = res.weatherMetrics.find(function(r) {
              return r.metricCode === metricCode;
            });
            if (weatherReading) {
              currentValue = parseFloat(weatherReading.value) || 0;
            }
          }
        }
        
        // 判断状态
        if (currentValue < def.min) {
          status = 'warning';
          statusText = '偏低';
        } else if (currentValue > def.max) {
          status = 'warning';
          statusText = '偏高';
        }
        
        that.setData({
          metricInfo: {
            ...def,
            code: metricCode,
            currentValue: currentValue,
            status: status,
            statusText: statusText
          }
        });
        
        wx.setNavigationBarTitle({
          title: def.name + '趋势'
        });
      })
      .catch(function(err) {
        error('loadMetricInfo', '获取实时环境数据失败:', err);
        // 降级处理：显示默认值
        that.setData({
          metricInfo: {
            ...def,
            code: metricCode,
            currentValue: 0,
            status: 'normal',
            statusText: '暂无数据'
          }
        });
        
        wx.setNavigationBarTitle({
          title: def.name + '趋势'
        });
      });
  },

  loadChartData() {
    const { currentRange, plantId, metricCode, dataSource } = this.data;
    const that = this;
    
    log('loadChartData', '开始加载图表数据:', { plantId, metricCode, currentRange, dataSource });
    
    const apiDataSource = dataSource === 'device' ? 'sensor' : 
                          dataSource === 'weather' ? 'weather_api' : null;
    
    if (!apiDataSource) {
      warn('loadChartData', '无效的数据源:', dataSource);
      this.setData({ chartData: [], historyData: [] });
      return;
    }
    
    api.getMetricHistory(plantId, metricCode, currentRange, apiDataSource)
      .then(function(result) {
        log('loadChartData', 'API 返回结果:', result);
        
        const historyData = result && result.list ? result.list : [];
        log('loadChartData', `获取到 ${historyData.length} 条历史数据`);

        // 为图表数据添加格式化后的显示时间
        const formattedData = historyData.map(function(item, index) {
          if (!item.time) {
            warn('loadChartData', `第 ${index} 条数据缺少 time 字段:`, item);
          }
          return {
            ...item,
            displayTime: that.formatDateTime(item.time)
          };
        });

        that.setData({
          chartData: formattedData
        });

        that.calculateStatistics(formattedData);
        that.loadHistoryData();
      })
      .catch(function(err) {
        error('loadChartData', '加载指标历史失败:', err);
        wx.showToast({ title: '加载数据失败', icon: 'none' });
        that.setData({
          chartData: [],
          historyData: []
        });
      });
  },

  loadHistoryData() {
    const { chartData } = this.data;
    const that = this;
    
    const recentData = chartData.slice(-20).reverse().map(function(item) {
      return {
        ...item,
        displayTime: that.formatDateTime(item.time),
        status: that.getValueStatus(item.value)
      };
    });
    
    this.setData({
      historyData: recentData,
      lastUpdateTime: recentData.length > 0 ? recentData[0].displayTime : '--'
    });
  },

  calculateStatistics(dataPoints) {
    if (dataPoints.length === 0) return;
    
    const values = dataPoints.map(function(p) { return p.value; });
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce(function(a, b) { return a + b; }, 0) / values.length;
    
    this.setData({
      statistics: {
        max: max.toFixed(1),
        min: min.toFixed(1),
        avg: avg.toFixed(1),
        count: dataPoints.length
      }
    });
  },

  getValueStatus(value) {
    const { metricInfo } = this.data;
    // 如果 metricInfo 未加载，返回默认状态
    if (!metricInfo || typeof metricInfo.min === 'undefined' || typeof metricInfo.max === 'undefined') {
      return 'normal';
    }
    if (value < metricInfo.min || value > metricInfo.max) {
      return 'warning';
    }
    return 'normal';
  },

  formatDateTime(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return month + '-' + day + ' ' + hours + ':' + minutes;
  },

  initChart() {
    const query = wx.createSelectorQuery();
    const that = this;
    
    query.select('#trendChart')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res[0] || !res[0].node) {
          console.warn('[metric-detail] canvas not found');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;
        
        if (canvasWidth === 0 || canvasHeight === 0) {
          setTimeout(function() {
            that.initChart();
          }, 200);
          return;
        }
        
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : { pixelRatio: 1 };
        const dpr = windowInfo.pixelRatio || 1;
        
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);
        
        that.setData({ canvasContext: ctx });
        that.drawChart(ctx, canvasWidth, canvasHeight);
      });
  },

  drawChart(ctx, width, height) {
    const { chartData, metricInfo } = this.data;

    log('drawChart', '开始绘制图表:', { dataLength: chartData.length, width, height });

    if (chartData.length === 0) {
      warn('drawChart', '没有数据，跳过绘制');
      return;
    }

    try {
      ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = chartData.map(function(d) { return d.value; });
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const yMin = minValue - valueRange * 0.1;
    const yMax = maxValue + valueRange * 0.1;

    // 计算时间范围（用于X轴按时间距离定位）
    // 预先解析时间，避免重复解析，同时过滤无效时间
    const timeData = chartData.map(function(d) {
      const time = new Date(d.time).getTime();
      return {
        time: isNaN(time) ? 0 : time,
        displayTime: d.displayTime,
        value: d.value
      };
    }).filter(function(d) { return d.time > 0; });

    if (timeData.length === 0) return;

    const timeValues = timeData.map(function(d) { return d.time; });
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const timeRange = maxTime - minTime || 1;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = yMax - (yMax - yMin) / 5 * i;
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3);
    }

    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();

    // 按时间距离计算X坐标
    timeData.forEach(function(point, index) {
      const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
      const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制数据点
    timeData.forEach(function(point, index) {
      if (timeData.length > 20 && index % Math.ceil(timeData.length / 20) !== 0) return;

      const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
      const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;

      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制X轴时间标签（按时间距离均匀分布）
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const labelCount = Math.min(5, timeData.length);
    if (labelCount === 1) {
      // 只有一个数据点，直接显示在中间
      const x = padding.left + chartWidth / 2;
      const time = timeData[0].displayTime;
      ctx.fillText(time, x, height - 10);
    } else {
      for (let i = 0; i < labelCount; i++) {
        // 在时间范围内均匀选择时间点
        const targetTime = minTime + (timeRange * i / (labelCount - 1));
        // 找到最接近该时间的数据点
        let closestIndex = 0;
        let minDiff = Infinity;
        timeData.forEach(function(point, idx) {
          const diff = Math.abs(point.time - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = idx;
          }
        });

        const x = padding.left + ((timeData[closestIndex].time - minTime) / timeRange) * chartWidth;
        const time = timeData[closestIndex].displayTime;
        ctx.fillText(time, x, height - 10);
      }
    }

    // 绘制正常范围色块（如果 metricInfo 已加载）
    if (metricInfo && typeof metricInfo.min !== 'undefined' && typeof metricInfo.max !== 'undefined') {
      const normalYMin = padding.top + chartHeight - ((metricInfo.min - yMin) / (yMax - yMin)) * chartHeight;
      const normalYMax = padding.top + chartHeight - ((metricInfo.max - yMin) / (yMax - yMin)) * chartHeight;

      ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
      ctx.fillRect(padding.left, normalYMax, chartWidth, normalYMin - normalYMax);
    }
      
      log('drawChart', '图表绘制完成');
    } catch (err) {
      error('drawChart', '绘制图表失败:', err);
    }
  },

  switchTimeRange(e) {
    const { value } = e.currentTarget.dataset;
    const rangeLabels = {
      '24h': '最近24小时趋势',
      '7d': '最近7天趋势',
      '30d': '最近30天趋势'
    };
    const that = this;
    
    this.setData({
      currentRange: value,
      chartSubtitle: rangeLabels[value]
    });
    
    this.loadChartData();
    
    setTimeout(function() {
      if (that.data.canvasContext) {
        const query = wx.createSelectorQuery();
        query.select('#trendChart')
          .fields({ node: true, size: true })
          .exec(function(res) {
            if (res[0]) {
              that.drawChart(that.data.canvasContext, res[0].width, res[0].height);
            }
          });
      }
    }, 100);
  },

  onChartTouch(e) {
    this.showTooltipAt(e.touches[0].x, e.touches[0].y);
  },

  onChartMove(e) {
    this.showTooltipAt(e.touches[0].x, e.touches[0].y);
  },

  showTooltipAt(x, y) {
    const { chartData } = this.data;
    if (chartData.length === 0) return;
    
    const query = wx.createSelectorQuery();
    const that = this;
    
    query.select('#trendChart')
      .fields({ size: true })
      .exec(function(res) {
        if (!res[0]) return;
        
        const width = res[0].width;
        const padding = { left: 50, right: 20 };
        const chartWidth = width - padding.left - padding.right;
        
        const relativeX = x - padding.left;
        const index = Math.round((relativeX / chartWidth) * (chartData.length - 1));
        const clampedIndex = Math.max(0, Math.min(chartData.length - 1, index));
        
        const dataPoint = chartData[clampedIndex];
        
        that.setData({
          showTooltip: true,
          tooltipX: x,
          tooltipY: y - 60,
          tooltipData: {
            time: dataPoint.displayTime,
            value: dataPoint.value
          }
        });
        
        clearTimeout(that.tooltipTimer);
        that.tooltipTimer = setTimeout(function() {
          that.setData({ showTooltip: false });
        }, 3000);
      });
  },

  loadMoreHistory() {
    wx.showToast({
      title: '没有更多数据了',
      icon: 'none'
    });
    this.setData({ hasMoreData: false });
  }
});
