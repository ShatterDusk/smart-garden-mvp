/**
 * AI 服务配置
 * 支持多厂商 AI 服务
 */

/**
 * 清理 URL，去除反引号和多余空格
 */
const cleanUrl = (url) => {
  if (!url) return url;
  return url.trim().replace(/^`+|`+$/g, '').trim();
};

const aiConfig = {
  // 默认使用的 AI 提供商
  defaultProvider: process.env.AI_PROVIDER || 'glm',

  // OpenAI 配置
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: cleanUrl(process.env.OPENAI_BASE_URL) || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 60000,
  },

  // 智谱 AI (GLM) 配置
  glm: {
    apiKey: process.env.GLM_API_KEY,
    baseURL: cleanUrl(process.env.GLM_BASE_URL) || 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.GLM_MODEL || 'glm-4.6v',
    maxTokens: parseInt(process.env.GLM_MAX_TOKENS) || 4096,
    temperature: parseFloat(process.env.GLM_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.GLM_TIMEOUT) || 60000,
  },

  // TODO: 以下 AI 提供商待实现
  // 百度文心一言、阿里通义千问、腾讯混元
  // 实现时需要添加对应的 callXxx 方法到 aiService.js
};

module.exports = aiConfig;
