/**
 * 用户消息渲染组件
 * 仅支持分割线语法 (---)
 */
Component({
  properties: {
    content: {
      type: String,
      value: ''
    }
  },

  data: {
    contentNodes: []
  },

  observers: {
    'content': function(content) {
      if (content) {
        const nodes = this.parseContent(content);
        this.setData({ contentNodes: nodes });
      }
    }
  },

  methods: {
    /**
     * 解析内容，仅支持分割线
     */
    parseContent(text) {
      if (!text) return [];
      
      const nodes = [];
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测分割线 (--- 或 *** 或 ___)
        if (/^[-*_]{3,}$/.test(line.trim())) {
          nodes.push({ type: 'hr', id: 'hr-' + i });
        } else {
          // 普通文本
          if (line || i < lines.length - 1) {
            nodes.push({
              type: 'text',
              id: 'text-' + i,
              content: line + (i < lines.length - 1 ? '\n' : '')
            });
          }
        }
      }
      
      return nodes;
    }
  }
});
