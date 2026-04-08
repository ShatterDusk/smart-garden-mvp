Page({
  data: {
    latitude: '',
    longitude: '',
    locationName: '',
    loading: true,
    weather: null,
    forecast: [],
    hourlyForecast: [],
    todayWeather: null,
    tomorrowWeather: null,
    airQuality: null,
  },

  onLoad: function(options) {
    const lat = options.lat;
    const lng = options.lng;
    const name = decodeURIComponent(options.name || '当前位置');

    this.setData({
      latitude: lat,
      longitude: lng,
      locationName: name,
    });

    this.loadWeatherData();
  },

  onShow: function() {
    if (this.data.latitude) {
      this.loadWeatherData();
    }
  },

  onPullDownRefresh: function() {
    this.loadWeatherData().then(function() {
      wx.stopPullDownRefresh();
    });
  },

  loadWeatherData: function() {
    const that = this;
    this.setData({ loading: true });

    return this.getWeatherNow()
      .then(function(now) {
        that.setData({ weather: now });
      })
      .catch(function(err) {
        console.error('获取天气数据失败:', err);
        wx.showToast({
          title: '获取天气失败',
          icon: 'none'
        });
      })
      .finally(function() {
        that.setData({ loading: false });
      });
  },

  getWeatherNow: function() {
    return new Promise(function(resolve, reject) {
      const api = require('../../utils/api.js');
      const lat = encodeURIComponent(this.data.latitude);
      const lng = encodeURIComponent(this.data.longitude);
      const locationKey = 'geo:' + lat + ',' + lng;

      api.get('/weather/now', {
        location: locationKey,
      }).then(function(data) {
        resolve(data);
      }).catch(function(err) {
        reject(err);
      });
    }.bind(this));
  },

  formatTime: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  },

  onShareAppMessage: function() {
    return {
      title: this.data.locationName + '天气预报',
      path: '/pages/weather/weather?lat=' + this.data.latitude + '&lng=' + this.data.longitude + '&name=' + encodeURIComponent(this.data.locationName)
    };
  }
});
