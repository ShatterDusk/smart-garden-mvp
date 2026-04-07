// components/diagnosis-card/diagnosis-card.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 诊断数据
    diagnosisCardId: String,
    sessionId: String,
    title: {
      type: String,
      value: '诊断结果'
    },
    time: String,
    healthScore: Number,
    status: {
      type: String,
      value: 'healthy' // healthy, warning, critical
    },
    species: {
      type: String,
      value: ''  // 植物品种
    },
    confidence: {
      type: Number,
      value: 0   // 置信度 0-1
    },
    issues: {
      type: Array,
      value: []
    },
    suggestions: {
      type: Array,
      value: []
    },
    // 显示控制
    showSummary: {
      type: Boolean,
      value: true
    },
    showSpecies: {
      type: Boolean,
      value: true  // 是否显示品种
    },
    showConfidence: {
      type: Boolean,
      value: true  // 是否显示置信度
    },
    showIssues: {
      type: Boolean,
      value: true
    },
    showSuggestions: {
      type: Boolean,
      value: true
    },
    showActions: {
      type: Boolean,
      value: false
    },
    expandable: {
      type: Boolean,
      value: false
    },
    expanded: {
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
   * 数据监听器
   */
  observers: {
    'confidence': function(confidence) {
      // 计算置信度百分比值
      var value = Math.round((confidence || 0) * 100);
      this.setData({
        confidenceValue: value
      });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    toggleExpand: function() {
      if (!this.data.expandable) return;
      var newExpanded = !this.data.expanded;
      this.setData({
        expanded: newExpanded
      });
      this.triggerEvent('expand', {
        expanded: newExpanded,
        diagnosisCardId: this.data.diagnosisCardId
      });
    },

    onAction: function(e) {
      var action = e.currentTarget.dataset.action;
      this.triggerEvent('action', {
        action: action,
        diagnosisCardId: this.data.diagnosisCardId,
        sessionId: this.data.sessionId
      });
    }
  }
});
