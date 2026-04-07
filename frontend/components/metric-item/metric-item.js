// components/metric-item/metric-item.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 指标数据
    metricCode: String,
    icon: {
      type: String,
      value: '📊'
    },
    name: String,
    value: {
      type: [String, Number],
      value: '--'
    },
    unit: String,
    status: {
      type: String,
      value: 'normal' // normal, warning, critical
    },
    trend: String, // up, down, stable
    // 显示控制
    showTrend: {
      type: Boolean,
      value: false
    },
    size: {
      type: String,
      value: 'normal' // small, normal, large
    },
    clickable: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    onTap: function() {
      if (!this.data.clickable) return;
      this.triggerEvent('tap', {
        metricCode: this.data.metricCode,
        name: this.data.name,
        value: this.data.value,
        unit: this.data.unit
      });
    }
  }
});
