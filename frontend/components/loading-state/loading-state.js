// components/loading-state/loading-state.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    type: {
      type: String,
      value: 'spinner' // spinner, dots, mask, page, section
    },
    text: {
      type: String,
      value: '加载中...'
    },
    progress: {
      type: Number,
      value: 0
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

  }
});
