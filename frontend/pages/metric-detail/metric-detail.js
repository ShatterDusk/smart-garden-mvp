// metric-detail.js - 环境指标详情页
// 引入 API 服务
const api = require('../../utils/api.js');

Page({
  data: {
    plantId: '',
    metricCode: '',
    dataSource: 'device',
    metricInfo: {
      icon: '🌡️',
      name: '温度',
      unit: '°C',
      currentValue: 22.5,
      status: 'normal',
      statusText: '正常',
      minValue: 15,
      maxValue: 30
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
    const { plantId, metric, source } = options;
    
    this.setData({
      plantId: plantId || '',
      metricCode: metric || 'temperature',
      dataSource: source || 'device'
    });
    
    this.loadMetricInfo();
    this.loadChartData();
  },

  onReady() {
    setTimeout(() => {
      this.initChart();
    }, 100);
  },

  loadMetricInfo() {
    const { metricCode } = this.data;
    
    const metricDefinitions = {
      temperature: { name: '温度', unit: '°C', icon: '🌡️', min: 15, max: 30 },
      humidity: { name: '湿度', unit: '%', icon: '💧', min: 40, max: 70 },
      lightIntensity: { name: '光照', unit: 'lux', icon: '☀️', min: 1000, max: 50000 },
      soilMoisture: { name: '土壤湿度', unit: '%', icon: '🌱', min: 30, max: 70 },
      soilTemperature: { name: '土壤温度', unit: '°C', icon: '🌡️', min: 15, max: 28 },
      battery: { name: '电量', unit: '%', icon: '🔋', min: 20, max: 100 },
      ph: { name: 'pH值', unit: '', icon: '🧪', min: 5.5, max: 7.5 },
      ec: { name: 'EC值', unit: 'ms/cm', icon: '⚡', min: 0.8, max: 2.0 }
    };
    
    const def = metricDefinitions[metricCode] || { name: '未知指标', unit: '', icon: '❓', min: 0, max: 100 };
    
    const currentValue = (def.min + Math.random() * (def.max - def.min)).toFixed(1);
    
    let status = 'normal';
    let statusText = '正常';
    if (currentValue < def.min) {
      status = 'warning';
      statusText = '偏低';
    } else if (currentValue > def.max) {
      status = 'warning';
      statusText = '偏高';
    }
    
    this.setData({
      metricInfo: {
        ...def,
        code: metricCode,
        currentValue: parseFloat(currentValue),
        status,
        statusText
      }
    });
    
    wx.setNavigationBarTitle({
      title: def.name + '趋势'
    });
  },

  loadChartData() {
    const { currentRange, plantId, metricCode, dataSource } = this.data;
    const that = this;
    
    const apiDataSource = dataSource === 'device' ? 'sensor' : 
                          dataSource === 'weather' ? 'weather_api' : null;
    
    api.getMetricHistory(plantId, metricCode, currentRange, apiDataSource).then(function(result) {
      const historyData = result && result.list ? result.list : [];
      
      that.setData({
        chartData: historyData
      });
      
      that.calculateStatistics(historyData);
      that.loadHistoryData();
    }).catch(function(err) {
      console.error('加载指标历史失败:', err);
      that.setData({
        chartData: [],
        historyData: []
      });
    });
  },

  loadHistoryData() {
    const { chartData } = this.data;
    
    const recentData = chartData.slice(-20).reverse().map(function(item) {
      return {
        ...item,
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
    if (value < metricInfo.min || value > metricInfo.max) {
      return 'warning';
    }
    return 'normal';
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
    
    if (chartData.length === 0) return;
    
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
    
    const xStep = chartData.length > 1 ? chartWidth / (chartData.length - 1) : 0;
    
    chartData.forEach(function(point, index) {
      const x = padding.left + xStep * index;
      const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    chartData.forEach(function(point, index) {
      if (chartData.length > 20 && index % Math.ceil(chartData.length / 20) !== 0) return;
      
      const x = padding.left + xStep * index;
      const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;
      
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    const labelCount = Math.min(5, chartData.length);
    const labelStep = chartData.length > 1 ? (chartData.length - 1) / (labelCount - 1) : 0;
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor(labelStep * i);
      const x = padding.left + xStep * index;
      const time = chartData[index].displayTime;
      ctx.fillText(time, x, height - 10);
    }
    
    const normalYMin = padding.top + chartHeight - ((metricInfo.min - yMin) / (yMax - yMin)) * chartHeight;
    const normalYMax = padding.top + chartHeight - ((metricInfo.max - yMin) / (yMax - yMin)) * chartHeight;
    
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.fillRect(padding.left, normalYMax, chartWidth, normalYMin - normalYMax);
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
