/**
 * 文本处理工具函数
 */

/**
 * 提取消息预览文本
 * 去除 Markdown 标记并截断长度
 * @param {string} content - 原始消息内容
 * @param {number} maxLength - 最大长度，默认 50
 * @returns {string} 预览文本
 */
function extractMessagePreview(content, maxLength) {
  maxLength = maxLength || 50;
  if (!content) return '';

  // 去除 Markdown 标记
  var preview = content
    // 去除代码块
    .replace(/```[\s\S]*?```/g, '[代码]')
    // 去除行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 去除图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[图片]')
    // 去除链接，保留文本
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // 去除粗体、斜体、删除线标记
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    // 去除标题标记
    .replace(/^#{1,6}\s*/gm, '')
    // 去除引用标记
    .replace(/^>\s*/gm, '')
    // 去除列表标记
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 去除任务列表标记
    .replace(/^-\s*\[\s*[x\s]\s*\]\s*/gm, '')
    // 去除分割线
    .replace(/^[-*_]{3,}$/gm, '')
    // 去除表格分隔线
    .replace(/\|[-:\s|]+\|/g, '')
    // 去除表格竖线
    .replace(/\|/g, ' ')
    // 去除多余空格
    .replace(/\s+/g, ' ')
    .trim();

  // 截断长度
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength) + '...';
  }

  return preview;
}

module.exports = {
  extractMessagePreview: extractMessagePreview
};
