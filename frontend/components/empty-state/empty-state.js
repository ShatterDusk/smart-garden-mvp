// components/empty-state/empty-state.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    icon: {
      type: String,
      value: '📭'
    },
    imageUrl: String,
    title: String,
    description: String,
    showAction: {
      type: Boolean,
      value: false
    },
    actionText: {
      type: String,
      value: '去添加'
    },
    actionIcon: String,
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
    onAction: function() {
      this.triggerEvent('action');
    }
  }
});
