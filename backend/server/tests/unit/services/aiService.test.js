/**
 * AIService 单元测试
 * 注意：此测试使用 Mock 的 axios，不调用真实 API
 */

// 在导入模块前设置 Mock
jest.mock('axios');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
  extname: jest.fn(),
}));

// Mock aiConfig - 只包含已实现的提供商
jest.mock('../../../src/config/ai', () => ({
  defaultProvider: 'glm',
  glm: {
    baseURL: 'https://api.glm.com',
    apiKey: 'test-api-key',
    model: 'glm-4v',
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 60000,
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'test-openai-key',
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 60000,
  },
  // 注意：wenxin、qwen 等未实现，测试中会验证抛出错误
}));

const axios = require('axios');
const aiService = require('../../../src/services/aiService');
const logger = require('../../../src/utils/logger');

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置 provider 为 glm（默认）
    aiService.setProvider('glm');
  });

  describe('setProvider', () => {
    it('设置有效的 provider', () => {
      aiService.setProvider('openai');
      expect(aiService.provider).toBe('openai');
    });

    it('设置无效的 provider 抛出错误', () => {
      expect(() => {
        aiService.setProvider('invalid');
      }).toThrow('不支持的 AI 提供商: invalid');
    });
  });

  describe('analyze', () => {
    it('纯文本分析成功（GLM）', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                content: '这是一个测试回复',
                diagnosisCard: null,
              }),
            },
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await aiService.analyze({
        content: '你好',
        imageUrl: null,
        analysisType: 'normal',
        context: {},
      });

      expect(result.content).toBe('这是一个测试回复');
      expect(result.diagnosisCard).toBeNull();
    });

    it('API 调用超时处理', async () => {
      const error = new Error('timeout');
      error.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(error);

      await expect(
        aiService.analyze({
          content: '测试',
          analysisType: 'normal',
          context: {},
        })
      ).rejects.toThrow('timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'AI 分析超时',
        expect.objectContaining({
          timeoutStage: expect.any(String),
        })
      );
    });

    it('API HTTP 错误处理', async () => {
      const error = new Error('HTTP Error');
      error.response = { status: 429, data: { error: 'Rate limit' } };
      axios.post.mockRejectedValue(error);

      await expect(
        aiService.analyze({
          content: '测试',
          analysisType: 'normal',
          context: {},
        })
      ).rejects.toThrow('HTTP Error');
    });
  });

  describe('parseResponse', () => {
    it('解析标准 JSON 响应', () => {
      const response = JSON.stringify({
        content: '测试内容',
        diagnosisCard: {
          species: '绿萝',
          healthScore: 85,
          status: 'healthy',
          issues: [],
          suggestions: [],
          confidence: 0.9,
        },
      });

      const result = aiService.parseResponse(response);

      expect(result.content).toBe('测试内容');
      expect(result.diagnosisCard.species).toBe('绿萝');
      expect(result.diagnosisCard.healthScore).toBe(85);
    });

    it('解析带 Markdown 代码块的响应', () => {
      const response = '```json\n{"content": "测试", "diagnosisCard": null}\n```';

      const result = aiService.parseResponse(response);

      expect(result.content).toBe('测试');
      expect(result.diagnosisCard).toBeNull();
    });

    it('解析无效的 JSON 返回容错内容', () => {
      const response = 'invalid json';

      const result = aiService.parseResponse(response);

      expect(result.content).toBe('抱歉，分析过程中出现了问题，请稍后重试。');
      expect(result.diagnosisCard).toBeNull();
    });

    it('处理无效的 status 值', () => {
      const response = JSON.stringify({
        content: '测试',
        diagnosisCard: {
          status: 'invalid_status',
          healthScore: 80,
        },
      });

      const result = aiService.parseResponse(response);

      expect(result.diagnosisCard.status).toBe('healthy');
    });
  });

  describe('buildPrompt', () => {
    it('构建深度分析 prompt', () => {
      const context = {
        plantInfo: {
          nickname: '小绿',
          species: '绿萝',
          healthScore: 85,
        },
      };

      const prompt = aiService.buildPrompt('这植物怎么了？', 'deep', context, null);

      expect(prompt).toContain('深度分析');
      expect(prompt).toContain('小绿');
      expect(prompt).toContain('绿萝');
    });

    it('构建普通分析 prompt', () => {
      const prompt = aiService.buildPrompt('你好', 'normal', {}, null);

      expect(prompt).toContain('普通分析');
    });

    it('包含环境数据', () => {
      const context = {
        environmentData: [
          { metricName: '温度', value: 25, unit: '°C' },
        ],
      };

      const prompt = aiService.buildPrompt('测试', 'deep', context, null);

      expect(prompt).toContain('环境数据');
    });

    it('标记需要诊断卡', () => {
      const prompt = aiService.buildPrompt('测试', 'deep', {}, 'https://example.com/img.jpg');

      expect(prompt).toContain('需要返回诊断卡');
    });
  });

  describe('convertImageToBase64', () => {
    it('已经是 base64 格式直接返回', async () => {
      const base64Url = 'data:image/jpeg;base64,/9j/4AAQ...';

      const result = await aiService.convertImageToBase64(base64Url);

      expect(result).toBe(base64Url);
    });

    it('不支持的格式抛出错误', async () => {
      await expect(
        aiService.convertImageToBase64('ftp://example.com/plant.jpg')
      ).rejects.toThrow('不支持的图片格式');
    });
  });

  describe('未实现的 provider', () => {
    it('百度文心一言抛出错误', () => {
      // setProvider 是同步函数，会在 provider 不存在时抛出错误
      expect(() => {
        aiService.setProvider('wenxin');
      }).toThrow('不支持的 AI 提供商: wenxin');
    });

    it('阿里通义千问抛出错误', () => {
      // setProvider 是同步函数，会在 provider 不存在时抛出错误
      expect(() => {
        aiService.setProvider('qwen');
      }).toThrow('不支持的 AI 提供商: qwen');
    });
  });
});
