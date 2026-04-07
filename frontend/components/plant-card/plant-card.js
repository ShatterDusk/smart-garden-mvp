// components/plant-card/plant-card.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 植物数据
    plantId: String,
    nickname: String,
    species: String,
    coverImageUrl: String,
    emoji: {
      type: String,
      value: '🌱'
    },
    healthScore: Number,
    healthStatus: {
      type: String,
      value: 'healthy' // healthy, warning, critical
    },
    statusText: {
      type: String,
      value: '健康'
    },
    deviceConnected: {
      type: Boolean,
      value: false
    },
    joinedDays: {
      type: Number,
      value: 0
    },
    // 显示控制
    showHealthScore: {
      type: Boolean,
      value: true
    },
    showTags: {
      type: Boolean,
      value: true
    },
    showAction: {
      type: Boolean,
      value: false
    },
    customClass: String
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
    onTap: function(e) {
      this.triggerEvent('tap', {
        plantId: this.data.plantId
      });
    },

    onActionTap: function(e) {
      // 阻止事件冒泡
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      this.triggerEvent('action', {
        plantId: this.data.plantId,
        nickname: this.data.nickname
      });
    },

    onLongPress: function(e) {
      // 阻止事件冒泡
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      this.triggerEvent('longpress', {
        plantId: this.data.plantId,
        nickname: this.data.nickname
      });
    }
  }
});
