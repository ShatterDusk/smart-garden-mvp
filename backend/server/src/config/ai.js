/**
 * AI 服务配置抱歉
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

  // 百度文心一言配置
  wenxin: {
    apiKey: process.env.WENXIN_API_KEY,
    secretKey: process.env.WENXIN_SECRET_KEY,
    model: process.env.WENXIN_MODEL || 'ernie-bot-4',
    maxTokens: parseInt(process.env.WENXIN_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.WENXIN_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.WENXIN_TIMEOUT) || 30000,
  },

  // 阿里通义千问配置
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    model: process.env.QWEN_MODEL || 'qwen-max',
    maxTokens: parseInt(process.env.QWEN_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.QWEN_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.QWEN_TIMEOUT) || 30000,
  },

  // 腾讯混元配置
  hunyuan: {
    apiKey: process.env.HUNYUAN_API_KEY,
    model: process.env.HUNYUAN_MODEL || 'hunyuan-lite',
    maxTokens: parseInt(process.env.HUNYUAN_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.HUNYUAN_TEMPERATURE) || 0.7,
    timeout: parseInt(process.env.HUNYUAN_TIMEOUT) || 30000,
  },
};

module.exports = aiConfig;
