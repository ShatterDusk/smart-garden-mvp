/**
 * Markdown 渲染组件
 * 完整支持 Markdown 语法渲染
 */
Component({
  properties: {
    content: {
      type: String,
      value: ''
    }
  },

  data: {
    richTextNodes: []
  },

  observers: {
    'content': function(content) {
      if (content) {
        const nodes = this.parseMarkdown(content);
        this.setData({ richTextNodes: nodes });
      }
    }
  },

  methods: {
    /**
     * 解析 Markdown 为 rich-text 节点
     */
    parseMarkdown(text) {
      if (!text) return '';
      
      let html = text;
      
      // 1. 转义 HTML 特殊字符（但保留部分标记）
      html = this.escapeHtml(html);
      
      // 2. 解析删除线 (~~text~~)
      html = html.replace(/~~(.+?)~~/g, '<del style="text-decoration:line-through;color:#999;">$1</del>');
      
      // 3. 解析图片 ![alt](url)
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
        '<img src="$2" alt="$1" style="max-width:100%;border-radius:8rpx;margin:8rpx 0;" />');
      
      // 4. 解析链接 [text](url) - 放在图片之后避免冲突
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
        '<a href="$2" style="color:#4CAF50;text-decoration:underline;" data-url="$2">$1</a>');
      
      // 5. 解析代码块 (```code```) - 在行内代码之前处理
      html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre style="background:#1e1e1e;color:#d4d4d4;padding:20rpx;border-radius:12rpx;font-size:24rpx;white-space:pre-wrap;word-break:break-all;margin:16rpx 0;overflow-x:auto;"><code>${code}</code></pre>`;
      });
      
      // 6. 解析行内代码 (`code`)
      html = html.replace(/`([^`]+)`/g, 
        '<span style="font-family:Consolas, Monaco, monospace;background:#f0f0f0;padding:4rpx 8rpx;border-radius:6rpx;font-size:24rpx;color:#e83e8c;">$1</span>');
      
      // 7. 解析粗体 (**text** 或 __text__)
      html = html.replace(/\*\*(.+?)\*\*/g, 
        '<strong style="font-weight:bold;color:#1a1a1a;">$1</strong>');
      html = html.replace(/__(.+?)__/g, 
        '<strong style="font-weight:bold;color:#1a1a1a;">$1</strong>');
      
      // 8. 解析斜体 (*text* 或 _text_)
      html = html.replace(/\*(.+?)\*/g, 
        '<em style="font-style:italic;color:#4a4a4a;">$1</em>');
      html = html.replace(/_(.+?)_/g, 
        '<em style="font-style:italic;color:#4a4a4a;">$1</em>');
      
      // 9. 解析标题 (# ## ### #### ##### ######)
      html = html.replace(/^###### (.+)$/gm, 
        '<h6 style="font-size:28rpx;font-weight:bold;color:#4a4a4a;margin:12rpx 0 6rpx 0;">$1</h6>');
      html = html.replace(/^##### (.+)$/gm, 
        '<h5 style="font-size:30rpx;font-weight:bold;color:#3a3a3a;margin:14rpx 0 7rpx 0;">$1</h5>');
      html = html.replace(/^#### (.+)$/gm, 
        '<h4 style="font-size:32rpx;font-weight:bold;color:#3a3a3a;margin:16rpx 0 8rpx 0;">$1</h4>');
      html = html.replace(/^### (.+)$/gm, 
        '<h3 style="font-size:34rpx;font-weight:bold;color:#2a2a2a;margin:18rpx 0 9rpx 0;">$1</h3>');
      html = html.replace(/^## (.+)$/gm, 
        '<h2 style="font-size:38rpx;font-weight:bold;color:#1a1a1a;margin:20rpx 0 10rpx 0;">$1</h2>');
      html = html.replace(/^# (.+)$/gm, 
        '<h1 style="font-size:42rpx;font-weight:bold;color:#0a0a0a;margin:24rpx 0 12rpx 0;">$1</h1>');
      
      // 10. 解析表格
      html = this.parseTables(html);
      
      // 11. 解析引用块 (>)
      html = this.parseBlockquotes(html);
      
      // 12. 解析任务列表 (- [ ] 或 - [x])
      html = html.replace(/^- \[x\] (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:40rpx;position:relative;"><span style="position:absolute;left:8rpx;top:8rpx;color:#4CAF50;font-size:28rpx;">☑</span>$1</p>');
      html = html.replace(/^- \[ \] (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:40rpx;position:relative;"><span style="position:absolute;left:8rpx;top:8rpx;color:#ccc;font-size:28rpx;">☐</span>$1</p>');
      html = html.replace(/^\* \[x\] (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:40rpx;position:relative;"><span style="position:absolute;left:8rpx;top:8rpx;color:#4CAF50;font-size:28rpx;">☑</span>$1</p>');
      html = html.replace(/^\* \[ \] (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:40rpx;position:relative;"><span style="position:absolute;left:8rpx;top:8rpx;color:#ccc;font-size:28rpx;">☐</span>$1</p>');
      
      // 13. 解析无序列表 (- item 或 * item)
      html = html.replace(/^- (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:32rpx;position:relative;"><span style="position:absolute;left:8rpx;top:6rpx;color:#81C784;font-weight:bold;font-size:28rpx;">•</span>$1</p>');
      html = html.replace(/^\* (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:32rpx;position:relative;"><span style="position:absolute;left:8rpx;top:6rpx;color:#81C784;font-weight:bold;font-size:28rpx;">•</span>$1</p>');
      
      // 14. 解析有序列表 (1. item)
      html = html.replace(/^(\d+)\. (.+)$/gm, 
        '<p style="margin:8rpx 0;padding-left:32rpx;position:relative;"><span style="position:absolute;left:0;top:0;color:#81C784;font-weight:bold;font-size:24rpx;">$1.</span>$2</p>');
      
      // 15. 解析分割线 (--- 或 *** 或 ___)
      html = html.replace(/^[-*_]{3,}$/gm, 
        '<hr style="border:none;border-top:2rpx solid #e0e0e0;margin:24rpx 0;" />');
      
      // 16. 处理换行和段落
      html = this.processParagraphs(html);
      
      return html;
    },

    /**
     * 解析表格
     */
    parseTables(html) {
      const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
      
      return html.replace(tableRegex, (match, headerLine, bodyLines) => {
        // 解析表头
        const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
        
        // 解析对齐方式
        const alignLine = match.split('\n')[1];
        const aligns = alignLine.split('|').map(a => {
          a = a.trim();
          if (a.startsWith(':') && a.endsWith(':')) return 'center';
          if (a.endsWith(':')) return 'right';
          return 'left';
        }).filter((_, i) => i > 0 && i <= headers.length);
        
        // 解析表格行
        const rows = bodyLines.trim().split('\n').map(row => 
          row.split('|').map(cell => cell.trim()).filter((_, i) => i > 0 && i <= headers.length)
        );
        
        // 生成表头 HTML
        let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:16rpx 0;font-size:26rpx;">';
        
        // 表头行
        tableHtml += '<thead><tr>';
        headers.forEach((header, i) => {
          const align = aligns[i] || 'left';
          const alignStyle = align === 'center' ? 'text-align:center;' : align === 'right' ? 'text-align:right;' : 'text-align:left;';
          tableHtml += `<th style="background:#f5f5f5;padding:12rpx 16rpx;border:1rpx solid #e0e0e0;font-weight:bold;color:#333;${alignStyle}">${header}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // 表体行
        tableHtml += '<tbody>';
        rows.forEach(row => {
          tableHtml += '<tr>';
          row.forEach((cell, i) => {
            const align = aligns[i] || 'left';
            const alignStyle = align === 'center' ? 'text-align:center;' : align === 'right' ? 'text-align:right;' : 'text-align:left;';
            tableHtml += `<td style="padding:12rpx 16rpx;border:1rpx solid #e0e0e0;color:#666;${alignStyle}">${cell}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        
        return tableHtml;
      });
    },

    /**
     * 解析引用块
     */
    parseBlockquotes(html) {
      const lines = html.split('\n');
      let result = [];
      let inBlockquote = false;
      let blockquoteContent = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.match(/^&gt;\s*/)) {
          if (!inBlockquote) {
            inBlockquote = true;
          }
          blockquoteContent.push(line.replace(/^&gt;\s*/, ''));
        } else {
          if (inBlockquote) {
            result.push(this.wrapBlockquote(blockquoteContent.join('\n')));
            blockquoteContent = [];
            inBlockquote = false;
          }
          result.push(line);
        }
      }
      
      if (inBlockquote) {
        result.push(this.wrapBlockquote(blockquoteContent.join('\n')));
      }
      
      return result.join('\n');
    },

    /**
     * 包装引用块内容
     */
    wrapBlockquote(content) {
      return `<blockquote style="border-left:6rpx solid #81C784;background:#f8f9fa;padding:16rpx 20rpx;margin:16rpx 0;border-radius:0 8rpx 8rpx 0;color:#666;font-style:italic;">${content}</blockquote>`;
    },

    /**
     * 处理段落和换行
     */
    processParagraphs(html) {
      const lines = html.split('\n');
      const nodes = [];
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.trim() === '') {
          nodes.push('<p style="height:12rpx;margin:0;"></p>');
          continue;
        }
        
        if (line.startsWith('<h') || line.startsWith('<pre') || line.startsWith('<blockquote') || 
            line.startsWith('<table') || line.startsWith('<hr') || line.startsWith('<img')) {
          nodes.push(line);
          continue;
        }
        
        nodes.push(`<p style="margin:8rpx 0;line-height:1.8;font-size:28rpx;color:#333;">${line}</p>`);
      }
      
      return nodes.join('');
    },

    /**
     * 转义 HTML 特殊字符
     */
    escapeHtml(text) {
      return text
        .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * 点击链接
     */
    onLinkTap(e) {
      const url = e.currentTarget.dataset.url;
      if (url) {
        wx.setClipboardData({
          data: url,
          success: () => {
            wx.showToast({ title: '链接已复制', icon: 'none' });
          }
        });
      }
    }
  }
});
