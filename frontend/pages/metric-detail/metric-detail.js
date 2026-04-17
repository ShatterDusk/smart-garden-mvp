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
      
      // 串行加载：先加载指标信息，再加载图表数据
      // 确保上方内容渲染完成后再初始化 Canvas
      this.loadMetricInfo().then(() => {
        log('onLoad', '指标信息加载完成，开始加载图表数据');
        this.loadChartData();
      });
    } catch (err) {
      error('onLoad', '页面加载失败:', err);
      wx.showToast({ title: '页面加载失败', icon: 'error' });
    }
  },

  onReady() {
    // canvas 在 chartData 加载完成后才会渲染
    // initChart 将在 loadChartData 成功后调用
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
    
    // 返回 Promise，确保调用方知道何时完成
    return new Promise((resolve) => {
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
          }, () => {
            // setData 回调中 resolve，确保 DOM 已更新
            wx.setNavigationBarTitle({
              title: def.name + '趋势'
            });
            resolve();
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
          }, () => {
            wx.setNavigationBarTitle({
              title: def.name + '趋势'
            });
            resolve();
          });
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
        }, () => {
          // 延迟初始化图表，确保 DOM 完全布局完成
          // 解决 Canvas 在上方内容动态渲染后位置错位的问题
          setTimeout(() => {
            that.initChart();
          }, 100);
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

  // 计算自适应网格线数量
  _calculateGridLines(valueRange) {
    if (valueRange < 5) return 10;
    if (valueRange < 10) return 8;
    if (valueRange < 20) return 6;
    if (valueRange < 50) return 5;
    return 4;
  },

  // 绘制X轴时间标签（按固定时间间隔均匀分布）
  _drawTimeAxisLabels(ctx, timeData, minTime, maxTime, timeRange, padding, chartWidth, height) {
    const { currentRange } = this.data;

    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    // 根据时间范围确定标签间隔和格式
    const timeSpan = maxTime - minTime;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    let interval; // 标签间隔（毫秒）
    let format;   // 时间格式函数

    if (currentRange === '24h' || timeSpan <= oneDay) {
      // 24小时：每6小时一个标签
      interval = 6 * oneHour;
      format = (date) => {
        const h = date.getHours();
        return `${h.toString().padStart(2, '0')}:00`;
      };
    } else if (currentRange === '7d' || timeSpan <= 7 * oneDay) {
      // 7天：每天一个标签
      interval = oneDay;
      format = (date) => {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return `周${days[date.getDay()]}`;
      };
    } else {
      // 30天：每5天一个标签
      interval = 5 * oneDay;
      format = (date) => {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      };
    }

    // 计算第一个标签的时间（对齐到间隔边界）
    const firstLabelTime = Math.ceil(minTime / interval) * interval;

    // 绘制标签
    for (let t = firstLabelTime; t <= maxTime; t += interval) {
      // 检查该时间点附近是否有数据（避免在无数据区域显示标签）
      const hasNearbyData = timeData.some(point => {
        return Math.abs(point.time - t) < interval / 2;
      });

      if (!hasNearbyData) continue;

      const x = padding.left + ((t - minTime) / timeRange) * chartWidth;
      const date = new Date(t);
      const label = format(date);

      ctx.fillText(label, x, height - 10);
    }
  },

  // 绘制折线（无动画）
  _drawLine(ctx, timeData, padding, chartWidth, chartHeight, minTime, timeRange, yMin, yMax) {
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();

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
  },

  // 绘制折线（带动画）
  _drawLineWithAnimation(ctx, timeData, padding, chartWidth, chartHeight, minTime, timeRange, yMin, yMax) {
    const totalPoints = timeData.length;
    const animationDuration = 500; // 动画持续时间（毫秒）
    const frameCount = 30; // 总帧数
    let currentFrame = 0;

    const animate = () => {
      currentFrame++;
      const progress = Math.min(currentFrame / frameCount, 1);

      // 计算当前应该显示到第几个点
      const currentIndex = Math.floor(progress * (totalPoints - 1));

      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();

      // 绘制已动画的部分
      for (let i = 0; i <= currentIndex && i < totalPoints; i++) {
        const point = timeData[i];
        const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
        const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      if (progress < 1) {
        this._chartAnimationId = setTimeout(animate, animationDuration / frameCount);
      }
    };

    animate();
  },

  // 智能采样：保留关键数据点（极值点 + 均匀采样）
  sampleDataPoints(timeData, values, minValue, maxValue) {
    const totalPoints = timeData.length;
    const maxDisplayPoints = 20;

    // 如果数据点少，全部显示
    if (totalPoints <= maxDisplayPoints) {
      return new Set(Array.from({ length: totalPoints }, (_, i) => i));
    }

    const sampledIndices = new Set();

    // 1. 始终显示第一个和最后一个点
    sampledIndices.add(0);
    sampledIndices.add(totalPoints - 1);

    // 2. 显示最大值和最小值点
    const maxIndex = values.indexOf(maxValue);
    const minIndex = values.indexOf(minValue);
    sampledIndices.add(maxIndex);
    sampledIndices.add(minIndex);

    // 3. 均匀采样其他点
    const remainingSlots = maxDisplayPoints - sampledIndices.size;
    if (remainingSlots > 0) {
      const step = (totalPoints - 1) / (remainingSlots + 1);
      for (let i = 1; i <= remainingSlots; i++) {
        const index = Math.round(i * step);
        if (!sampledIndices.has(index)) {
          sampledIndices.add(index);
        }
      }
    }

    return sampledIndices;
  },

  // 计算图表数据（供绘制和 Tooltip 复用）
  computeChartData(chartData) {
    if (!chartData || chartData.length === 0) return null;

    const values = chartData.map(function(d) { return d.value; });
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;
    const yMin = minValue - valueRange * 0.1;
    const yMax = maxValue + valueRange * 0.1;

    // 计算时间范围（用于X轴按时间距离定位）
    const timeData = chartData.map(function(d) {
      const time = new Date(d.time).getTime();
      return {
        time: isNaN(time) ? 0 : time,
        displayTime: d.displayTime,
        value: d.value,
        isStale: d.isStale || false
      };
    }).filter(function(d) { return d.time > 0; });

    if (timeData.length === 0) return null;

    const timeValues = timeData.map(function(d) { return d.time; });
    const minTime = Math.min(...timeValues);
    const maxTime = Math.max(...timeValues);
    const timeRange = maxTime - minTime || 1;

    return {
      values, minValue, maxValue, valueRange, yMin, yMax,
      timeData, timeValues, minTime, maxTime, timeRange
    };
  },

  drawChart(ctx, width, height, animate = true) {
    const { chartData, metricInfo } = this.data;

    log('drawChart', '开始绘制图表:', { dataLength: chartData.length, width, height, animate });

    if (chartData.length === 0) {
      warn('drawChart', '没有数据，跳过绘制');
      return;
    }

    // 如果有动画正在进行，先取消
    if (this._chartAnimationId) {
      clearTimeout(this._chartAnimationId);
      this._chartAnimationId = null;
    }

    try {
      ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 计算图表数据
    const chartComputed = this.computeChartData(chartData);
    if (!chartComputed) return;

    const { values, minValue, maxValue, valueRange, yMin, yMax,
            timeData, minTime, maxTime, timeRange } = chartComputed;

    // 自适应 Y 轴刻度数量
    const gridLines = this._calculateGridLines(valueRange);

    // 保存计算结果供 Tooltip 使用
    this.chartComputed = {
      padding, chartWidth, chartHeight,
      minTime, maxTime, timeRange, timeData
    };

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // 使用自适应的网格线数量
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = yMax - (yMax - yMin) / gridLines * i;
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      // 根据数值范围动态调整小数位数
      const decimals = valueRange < 1 ? 2 : valueRange < 10 ? 1 : 0;
      ctx.fillText(value.toFixed(decimals), padding.left - 5, y + 3);
    }

    // 智能采样：保留关键数据点
    const sampledIndices = this.sampleDataPoints(timeData, values, minValue, maxValue);

    // 绘制折线（带动画）
    if (animate) {
      this._drawLineWithAnimation(ctx, timeData, padding, chartWidth, chartHeight, minTime, timeRange, yMin, yMax);
    } else {
      this._drawLine(ctx, timeData, padding, chartWidth, chartHeight, minTime, timeRange, yMin, yMax);
    }

    // 绘制数据点（在动画完成后显示）
    const drawPoints = () => {
      timeData.forEach(function(point, index) {
        // 只显示采样点
        if (!sampledIndices.has(index)) return;

        const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
        const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;

        // 补偿数据使用紫色虚线边框样式（与卡片样式一致）
        if (point.isStale) {
          // 外圈：紫色虚线边框
          ctx.strokeStyle = '#9C27B0';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // 内圈：紫色填充
          ctx.fillStyle = '#9C27B0';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 正常数据：实心绿色圆点
          ctx.fillStyle = '#4CAF50';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    if (animate) {
      // 延迟绘制数据点，等线条动画完成后
      setTimeout(drawPoints, 600);
    } else {
      drawPoints();
    }

    // 绘制X轴时间标签（按固定时间间隔均匀分布）
    this._drawTimeAxisLabels(ctx, timeData, minTime, maxTime, timeRange, padding, chartWidth, height);

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
    const touch = e.touches[0];
    log('touch', '触摸坐标:', { x: touch.x, y: touch.y });
    this.showTooltipAt(touch.x, touch.y);
  },

  onChartMove(e) {
    const touch = e.touches[0];
    this.showTooltipAt(touch.x, touch.y);
  },

  showTooltipAt(canvasX, canvasY) {
    const { chartData } = this.data;
    if (chartData.length === 0) return;

    // 使用预计算的图表数据
    if (!this.chartComputed) return;

    const { padding, chartWidth, minTime, maxTime, timeRange, timeData } = this.chartComputed;

    // 计算相对位置（相对于图表绘制区域）
    const relativeX = canvasX - padding.left;

    // 按时间距离查找最近的数据点（与绘制逻辑一致）
    const targetTimeRatio = Math.max(0, Math.min(1, relativeX / chartWidth));
    const targetTime = minTime + targetTimeRatio * timeRange;

    let closestIndex = 0;
    let minTimeDiff = Infinity;
    timeData.forEach(function(point, idx) {
      const diff = Math.abs(point.time - targetTime);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        closestIndex = idx;
      }
    });

    const dataPoint = timeData[closestIndex];

    // tooltip 定位：相对于 chart-container
    // canvasX/canvasY 是相对于 canvas 的，而 canvas 在 chart-container 内
    // tooltip 水平居中于触摸点，显示在触摸点上方
    const tooltipX = canvasX;
    const tooltipY = Math.max(10, canvasY - 80);
    
    log('tooltip', '定位:', { canvasX, canvasY, tooltipX, tooltipY });
    
    this.setData({
      showTooltip: true,
      tooltipX: tooltipX,
      tooltipY: tooltipY,
      tooltipData: {
        time: dataPoint.displayTime,
        value: dataPoint.value,
        isStale: dataPoint.isStale
      }
    });

    clearTimeout(this.tooltipTimer);
    this.tooltipTimer = setTimeout(() => {
      this.setData({ showTooltip: false });
    }, 3000);
  },

  loadMoreHistory() {
    wx.showToast({
      title: '没有更多数据了',
      icon: 'none'
    });
    this.setData({ hasMoreData: false });
  }
});
