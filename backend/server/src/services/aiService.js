/**
 * AI 服务封装
 * 支持多厂商 AI 服务调用
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const aiConfig = require('../config/ai');
const logger = require('../utils/logger');

// 尝试导入 sharp，如果未安装则使用备用方案
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  logger.warn('sharp 未安装，图片将不会压缩');
}

const SYSTEM_PROMPT = `你是一个专业的植物养护AI助手"小园"。

## 身份
- 名字：小园
- 性格：友好、专业、易懂
- 专长：植物品种识别、健康诊断、养护建议

## 核心能力
1. 植物品种识别 - 从图片中识别植物种类
2. 健康状况诊断 - 评估植物健康状态
3. 养护建议提供 - 给出实用的养护指导

## 回复风格
- 使用Markdown格式美化回复
- 关键建议使用emoji点缀（🌱💧🌡️☀️）
- 保持专业但亲切的语气
- 建议要具体、可执行

## 安全准则
- 不提供医疗建议（人用）
- 不夸大植物病情
- 建议不明确时如实告知用户
- 遇到不确定的情况建议咨询专业人士

## 输入数据说明

你会收到以下上下文数据（JSON格式），请解析并充分利用这些信息进行分析：

### 1. 用户输入 (userMessage, imageUrls)
- userMessage: 用户的文字提问
- imageUrls: 用户上传的植物图片URL数组（可能为空）

### 2. 植物档案 (plantProfile) - 植物会话时提供
- plantId: 植物唯一标识
- nickname: 用户设置的植物昵称
- species: 植物品种
- plantCategory: 植物类别（succulent/flower/foliage/vegetable/other）
- locationName: 植物所在位置
- healthScore: 当前健康评分（0-100）
- createdAt: 植物档案创建时间

### 3. 环境数据 (environmentData) - 用户开启时提供
传感器与天气数据合并，包含温度、湿度、光照、土壤湿度、风速、气压、日照时长等。
注意：不同用户可用的指标可能不同，请根据实际提供的数据进行分析。

### 4. 养护记录 (careRecords) - 用户开启时提供
最近30天的养护操作数组，每条记录包含：
- actionType: 操作类型（water/fertilize/prune/repot/pest_control/other）
- description: 操作描述
- performedAt: 操作执行时间

### 5. 历史诊断 (historyDiagnosis) - 用户开启时提供
最近5次诊断记录数组，每条包含：
- healthScore: 诊断时的健康评分
- status: 健康状态（healthy/warning/critical）
- issues: 问题列表
- createdAt: 诊断时间

### 6. 对话历史 (historyMessages)
最近6轮对话记录，用于保持上下文连贯

## 输出格式要求

你必须返回符合以下 JSON Schema 的 JSON 对象：

{
  "content": "string - 给用户的文字回复（Markdown格式）",
  "diagnosisCard": {
    "species": "string - 识别到的植物品种，未知则填'未知植物'",
    "healthScore": "number - 健康评分 0-100",
    "status": "string - 健康状态：healthy/warning/critical",
    "issues": [
      {
        "type": "string - 问题类型：watering/light/temperature/pest/disease/nutrition/other",
        "name": "string - 问题名称",
        "severity": "string - 严重程度：low/medium/high",
        "description": "string - 问题描述"
      }
    ],
    "suggestions": [
      {
        "type": "string - 建议类型：watering/light/temperature/fertilizer/pruning/pest_control/other",
        "action": "string - 建议操作",
        "details": "string - 详细说明",
        "priority": "string - 优先级：high/medium/low"
      }
    ],
    "confidence": "number - 置信度 0-1"
  }
}

## 字段说明

### content（必填）
- 给用户的文字回复
- 使用 Markdown 格式
- 应包含分析过程和建议总结

### diagnosisCard（条件必填）
- 当用户上传图片或明确要求诊断时必须返回
- 纯文字咨询对话可以省略此字段（设为 null）

### healthScore 取值范围
- 90-100：健康（healthy）
- 60-89：警告（warning）
- 0-59：严重（critical）

### status 取值
- healthy：植物状态良好
- warning：存在轻微问题，需要关注
- critical：存在严重问题，需要立即处理

### issues.type 取值
- watering：浇水问题
- light：光照问题
- temperature：温度问题
- pest：虫害
- disease：病害
- nutrition：营养问题
- other：其他问题

### suggestions.type 取值
- watering：浇水建议
- light：光照建议
- temperature：温度建议
- fertilizer：施肥建议
- pruning：修剪建议
- pest_control：病虫害防治
- other：其他建议

## 输出示例

### 示例1：图片诊断（需要诊断卡）

{
  "content": "从图片来看，您的**冬美人**叶片发黄，可能是浇水过多导致的。\\n\\n### 问题分析\\n- 🌡️ 叶片发黄、边缘透明化\\n- 💧 土壤过湿，根系可能受损\\n\\n### 建议措施\\n1. **减少浇水频率**：当前土壤湿度偏高，建议等土壤完全干透再浇水\\n2. **增加通风**：放在通风良好的位置，帮助水分蒸发\\n3. **检查根系**：如果情况持续，建议检查是否有烂根",
  "diagnosisCard": {
    "species": "冬美人",
    "healthScore": 65,
    "status": "warning",
    "issues": [
      {
        "type": "watering",
        "name": "浇水过多",
        "severity": "medium",
        "description": "叶片发黄透明，疑似水渍化"
      }
    ],
    "suggestions": [
      {
        "type": "watering",
        "action": "减少浇水频率",
        "details": "等土壤完全干透再浇水，约7-10天一次",
        "priority": "high"
      },
      {
        "type": "other",
        "action": "增加通风",
        "details": "放在通风良好的位置",
        "priority": "medium"
      }
    ],
    "confidence": 0.85
  }
}

### 示例2：纯文字咨询（不需要诊断卡）

{
  "content": "多肉植物一般**7-10天浇一次水**比较合适，但具体频率要根据以下因素调整：\\n\\n### 影响因素\\n- 🌡️ **温度**：夏季高温时减少浇水，冬季低温时更要控水\\n- ☀️ **光照**：光照充足时蒸发快，可适当增加频率\\n- 🪴 **土壤**：颗粒土多的配土干得快\\n\\n### 浇水技巧\\n1. **干透浇透**：等土壤完全干透再浇，浇则浇透\\n2. **避免积水**：花盆底部要有排水孔\\n3. **观察叶片**：叶片发皱是缺水信号",
  "diagnosisCard": null
}

## 重要提示

1. **必须返回有效的 JSON**：不要在 JSON 外添加任何文字
2. **不要添加 Markdown 代码块标记**：不要包裹在代码块中
3. **直接返回纯 JSON 文本**：从 { 开始，到 } 结束
4. **content 字段始终必填**：即使是纯诊断也要给用户文字说明
5. **diagnosisCard 可为 null**：纯对话场景不需要诊断卡
6. **confidence 反映真实置信度**：不确定时如实反映，不要夸大`;

class AIService {
  constructor() {
    this.provider = aiConfig.defaultProvider;
    this.config = aiConfig[this.provider];
  }

  setProvider(provider) {
    if (!aiConfig[provider]) {
      throw new Error(`不支持的 AI 提供商: ${provider}`);
    }
    this.provider = provider;
    this.config = aiConfig[provider];
  }

  async convertImageToBase64(imageUrl) {
    if (!imageUrl) return null;

    // 已经是 base64 格式
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // 本地开发环境图片
    if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('http://127.0.0.1')) {
      try {
        const urlObj = new URL(imageUrl);
        const filePath = path.join(process.cwd(), urlObj.pathname);

        if (fs.existsSync(filePath)) {
          let fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' :
                          ext === '.gif' ? 'image/gif' :
                          ext === '.webp' ? 'image/webp' : 'image/jpeg';

          // 压缩图片
          fileBuffer = await this.compressImage(fileBuffer, mimeType);

          return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (err) {
        logger.warn('本地图片转换失败，尝试直接使用 URL', { imageUrl, error: err.message });
      }
    }

    // 远程 URL（COS 等）- 下载并转换为 base64
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const downloadStart = Date.now();
      try {
        // 直接下载图片转 base64
        // tcb.qcloud.la 的 URL 自带签名，可以直接访问
        logger.info('开始下载远程图片', { 
          imageUrl: imageUrl.substring(0, 100) + '...',
          urlDomain: new URL(imageUrl).hostname,
        });
        
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 60000, // 60 秒超时
          maxContentLength: 10 * 1024 * 1024, // 最大 10MB
        });
        const downloadTime = Date.now() - downloadStart;

        logger.info('图片下载完成', {
          downloadTime: `${downloadTime}ms`,
          contentLength: response.data?.length,
          contentType: response.headers['content-type'],
        });

        let buffer = Buffer.from(response.data, 'binary');
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // 压缩图片
        const compressStart = Date.now();
        buffer = await this.compressImage(buffer, contentType);
        const compressTime = Date.now() - compressStart;

        const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

        logger.info('远程图片处理完成', {
          totalTime: `${Date.now() - downloadStart}ms`,
          downloadTime: `${downloadTime}ms`,
          compressTime: `${compressTime}ms`,
          originalSize: response.data.length,
          compressedSize: buffer.length,
          compressionRatio: `${((1 - buffer.length / response.data.length) * 100).toFixed(1)}%`,
          contentType,
        });

        return base64;
      } catch (err) {
        const errorTime = Date.now() - downloadStart;
        const errorInfo = {
          imageUrl: imageUrl.substring(0, 100) + '...',
          errorTime: `${errorTime}ms`,
          error: err.message,
          errorCode: err.code,
          errorType: err.name,
        };

        // 细化错误类型
        if (err.code === 'ECONNABORTED') {
          errorInfo.errorStage = 'downloadTimeout';
          errorInfo.errorDetail = `图片下载超时（超过60秒）`;
        } else if (err.response) {
          errorInfo.errorStage = 'downloadHttpError';
          errorInfo.errorDetail = `HTTP ${err.response.status}: ${err.response.statusText}`;
          errorInfo.httpStatus = err.response.status;
        } else if (err.request) {
          errorInfo.errorStage = 'downloadNetworkError';
          errorInfo.errorDetail = '网络请求失败，无响应';
        } else {
          errorInfo.errorStage = 'downloadUnknownError';
          errorInfo.errorDetail = '请求配置错误';
        }

        logger.error('远程图片下载失败', errorInfo);
        throw err;
      }
    }

    // 不支持的图片格式
    logger.error('不支持的图片格式', { imageUrl: imageUrl.substring(0, 100) });
    throw new Error(`不支持的图片格式: ${imageUrl.substring(0, 50)}...`);
  }

  /**
   * 压缩图片
   * @param {Buffer} buffer - 图片 buffer
   * @param {string} mimeType - 图片类型
   * @returns {Promise<Buffer>} - 压缩后的 buffer
   */
  async compressImage(buffer, mimeType) {
    // 如果图片小于 1MB，不压缩
    if (buffer.length < 1024 * 1024) {
      return buffer;
    }

    // 如果没有 sharp，直接返回原图
    if (!sharp) {
      logger.warn('sharp 未安装，跳过图片压缩');
      return buffer;
    }

    try {
      const startTime = Date.now();
      let sharpInstance = sharp(buffer);

      // 获取图片信息
      const metadata = await sharpInstance.metadata();
      logger.info('压缩图片', {
        originalSize: buffer.length,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      });

      // 如果图片尺寸太大，先缩小
      const maxDimension = 1920;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        sharpInstance = sharpInstance.resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // 根据格式压缩
      let compressedBuffer;
      if (mimeType.includes('png')) {
        compressedBuffer = await sharpInstance
          .png({ quality: 80, compressionLevel: 9 })
          .toBuffer();
      } else if (mimeType.includes('webp')) {
        compressedBuffer = await sharpInstance
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // 默认 jpeg
        compressedBuffer = await sharpInstance
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();
      }

      const compressionTime = Date.now() - startTime;
      const compressionRatio = ((buffer.length - compressedBuffer.length) / buffer.length * 100).toFixed(1);

      logger.info('图片压缩完成', {
        originalSize: buffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: `${compressionRatio}%`,
        compressionTime: `${compressionTime}ms`,
      });

      return compressedBuffer;
    } catch (err) {
      logger.error('图片压缩失败，使用原图', { error: err.message });
      return buffer;
    }
  }

  async analyze(params) {
    const { content, imageUrl, analysisType, context } = params;
    const startTime = Date.now();
    let stage = 'init'; // 用于追踪执行阶段

    try {
      logger.info('AI 分析开始', {
        provider: this.provider,
        analysisType,
        hasImage: !!imageUrl,
        imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : null,
        contentLength: content?.length,
      });

      stage = 'buildPrompt';
      const promptStart = Date.now();
      const prompt = this.buildPrompt(content, analysisType, context, imageUrl);
      logger.info('构建 Prompt 完成', { stageTime: `${Date.now() - promptStart}ms` });

      stage = 'convertImage';
      let processedImageUrl = null;
      if (imageUrl) {
        const imageStart = Date.now();
        processedImageUrl = await this.convertImageToBase64(imageUrl);
        logger.info('图片处理完成', { 
          stageTime: `${Date.now() - imageStart}ms`,
          resultType: processedImageUrl?.startsWith('data:') ? 'base64' : 'url',
          resultLength: processedImageUrl?.length,
        });
      }

      stage = 'callAI';
      const aiStart = Date.now();
      let response;
      switch (this.provider) {
        case 'openai':
          response = await this.callOpenAI(prompt, processedImageUrl);
          break;
        case 'glm':
          response = await this.callGLM(prompt, processedImageUrl);
          break;
        case 'wenxin':
          response = await this.callWenxin(prompt, processedImageUrl);
          break;
        case 'qwen':
          response = await this.callQwen(prompt, processedImageUrl);
          break;
        case 'hunyuan':
          response = await this.callHunyuan(prompt, processedImageUrl);
          break;
        default:
          throw new Error(`未实现的 AI 提供商: ${this.provider}`);
      }
      logger.info('AI 服务调用完成', { stageTime: `${Date.now() - aiStart}ms` });

      stage = 'parseResponse';
      logger.info('AI 原始响应', {
        responseLength: response.length,
        responsePreview: response.substring(0, 300),
      });
      
      const result = this.parseResponse(response);
      
      logger.info('AI 分析成功', {
        totalTime: `${Date.now() - startTime}ms`,
        provider: this.provider,
        analysisType,
        hasImage: !!imageUrl,
        resultContentLength: result.content?.length,
        hasDiagnosisCard: !!result.diagnosisCard,
      });

      return result;
    } catch (err) {
      const errorInfo = {
        stage, // 错误发生的阶段
        totalTime: `${Date.now() - startTime}ms`,
        provider: this.provider,
        analysisType,
        hasImage: !!imageUrl,
        error: err.message,
        errorCode: err.code,
        errorType: err.name,
      };

      // 细化超时错误
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorInfo.timeoutStage = stage;
        if (stage === 'convertImage') {
          errorInfo.timeoutDetail = '图片下载/转换超时';
        } else if (stage === 'callAI') {
          errorInfo.timeoutDetail = 'AI 服务调用超时';
        } else {
          errorInfo.timeoutDetail = '未知阶段超时';
        }
        logger.error('AI 分析超时', errorInfo);
      } else {
        logger.error('AI 分析失败', errorInfo);
      }

      throw err;
    }
  }

  buildPrompt(content, analysisType, context, imageUrl) {
    const { plantInfo, environmentData, careRecords, historyDiagnosis, conversationHistory } = context || {};

    let prompt = '';

    if (analysisType === 'deep') {
      prompt += `## 当前任务：深度分析（植物会话）\n\n`;
      prompt += `用户正在进行植物会话，已绑定植物档案。\n\n`;
    } else {
      prompt += `## 当前任务：普通分析（咨询会话）\n\n`;
      prompt += `用户正在进行咨询会话，无植物档案关联。\n\n`;
    }

    prompt += `【用户输入】\n`;
    prompt += `- 消息：${content}\n`;
    prompt += `- 图片：${imageUrl ? '[有图片]' : '无'}\n\n`;

    if (plantInfo) {
      prompt += `【植物档案】\n`;
      if (plantInfo.plantId) prompt += `- 植物ID: ${plantInfo.plantId}\n`;
      if (plantInfo.nickname) prompt += `- 昵称: ${plantInfo.nickname}\n`;
      if (plantInfo.species) prompt += `- 品种: ${plantInfo.species}\n`;
      if (plantInfo.growthStage) prompt += `- 生长阶段: ${plantInfo.growthStage}\n`;
      if (plantInfo.healthScore !== undefined) prompt += `- 当前健康评分: ${plantInfo.healthScore}\n`;
      if (plantInfo.location) prompt += `- 位置: ${plantInfo.location}\n`;
      if (plantInfo.remark) prompt += `- 备注: ${plantInfo.remark}\n`;
      prompt += `\n`;
    }

    if (environmentData && environmentData.length > 0) {
      prompt += `【环境数据】\n`;
      environmentData.forEach((data) => {
        prompt += `- ${data.metricName}: ${data.value}${data.unit}\n`;
      });
      prompt += `\n`;
    }

    if (careRecords && careRecords.length > 0) {
      prompt += `【养护记录】\n`;
      careRecords.slice(0, 5).forEach((record) => {
        prompt += `- ${record.performedAt}: ${record.actionType}${record.description ? ' - ' + record.description : ''}\n`;
      });
      prompt += `\n`;
    }

    if (historyDiagnosis && historyDiagnosis.length > 0) {
      prompt += `【历史诊断】\n`;
      historyDiagnosis.slice(0, 3).forEach((diag) => {
        prompt += `- ${diag.createdAt}: 健康评分${diag.healthScore}，状态${diag.status}\n`;
      });
      prompt += `\n`;
    }

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `【对话历史】\n`;
      conversationHistory.slice(-6).forEach((msg) => {
        const role = msg.role === 'user' ? 'user' : 'assistant';
        prompt += `- ${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}\n`;
      });
      prompt += `\n`;
    }

    prompt += `【输出要求】\n`;
    if (imageUrl) {
      prompt += `- 用户上传了图片，需要返回诊断卡\n`;
    } else {
      prompt += `- 这是纯文字对话，不需要返回诊断卡（diagnosisCard 设为 null）\n`;
    }
    prompt += `- 请返回符合 JSON Schema 的完整 JSON 对象\n`;
    prompt += `- 不要在 JSON 外添加任何文字说明`;

    return prompt;
  }

  async callOpenAI(prompt, imageUrl) {
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: imageUrl
          ? [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ]
          : prompt,
      },
    ];

    const response = await axios.post(
      `${this.config.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.config.timeout,
      }
    );

    return response.data.choices[0].message.content;
  }

  async callGLM(prompt, imageUrl) {
    // GLM-4V 支持的消息格式
    // 参考: https://open.bigmodel.cn/dev/api#glm-4v
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ];

    if (imageUrl) {
      // 有图片时使用多模态格式
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl, // 可以是 base64 data URL 或 http URL
            },
          },
        ],
      });
    } else {
      // 纯文本
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    // 构建请求体
    const requestBody = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      response_format: { type: 'json_object' },
    };

    // 确保超时时间至少为 60 秒（图片分析需要较长时间）
    const actualTimeout = Math.max(this.config.timeout || 60000, 60000);

    // 记录发送给 GLM 的完整请求（用于调试）
    const apiUrl = `${this.config.baseURL}/chat/completions`;

    // 构建简化的消息日志（去除敏感/长内容）
    const messagesForLog = messages.map(m => ({
      role: m.role,
      contentType: typeof m.content === 'string' ? 'string' : 'array',
      contentLength: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length,
      hasImage: Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'),
    }));

    logger.info('GLM API 请求开始', {
      url: apiUrl,
      model: this.config.model,
      messagesCount: messages.length,
      messages: messagesForLog,
      hasImage: !!imageUrl,
      imageType: imageUrl ? (imageUrl.startsWith('data:') ? 'base64' : 'url') : null,
      imageLength: imageUrl ? imageUrl.length : 0,
      configTimeout: this.config.timeout,
      actualTimeout: actualTimeout,
    });

    const callStart = Date.now();
    try {
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: actualTimeout,
        }
      );

      const callTime = Date.now() - callStart;

      // 记录 GLM 响应
      logger.info('GLM API 响应成功', {
        status: response.status,
        responseTime: `${callTime}ms`,
        contentLength: response.data?.choices?.[0]?.message?.content?.length,
        usage: response.data?.usage,
      });

      return response.data.choices[0].message.content;
    } catch (err) {
      const errorTime = Date.now() - callStart;
      const errorInfo = {
        url: apiUrl,
        model: this.config.model,
        errorTime: `${errorTime}ms`,
        timeout: this.config.timeout,
        error: err.message,
        errorCode: err.code,
        errorType: err.name,
      };

      // 细化 GLM 调用错误
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorInfo.errorStage = 'glmTimeout';
        errorInfo.errorDetail = `GLM API 调用超时（超过${actualTimeout}ms）`;
        errorInfo.actualTimeout = actualTimeout;
        logger.error('GLM API 超时', errorInfo);
      } else if (err.response) {
        errorInfo.errorStage = 'glmHttpError';
        errorInfo.errorDetail = `GLM API HTTP 错误 ${err.response.status}`;
        errorInfo.httpStatus = err.response.status;
        errorInfo.httpData = err.response.data;
        logger.error('GLM API HTTP 错误', errorInfo);
      } else if (err.request) {
        errorInfo.errorStage = 'glmNetworkError';
        errorInfo.errorDetail = 'GLM API 网络请求失败，无响应';
        logger.error('GLM API 网络错误', errorInfo);
      } else {
        errorInfo.errorStage = 'glmRequestError';
        errorInfo.errorDetail = 'GLM API 请求配置错误';
        logger.error('GLM API 请求错误', errorInfo);
      }

      throw err;
    }
  }

  async callWenxin(prompt) {
    throw new Error('百度文心一言 API 待实现');
  }

  async callQwen(prompt) {
    throw new Error('阿里通义千问 API 待实现');
  }

  async callHunyuan(prompt) {
    throw new Error('腾讯混元 API 待实现');
  }

  parseResponse(response) {
    logger.info('开始解析 AI 响应', { 
      responseLength: response.length,
      responsePreview: response.substring(0, 500),
      responseSuffix: response.substring(response.length - 200),
    });
    
    try {
      // 清理响应内容：去除 Markdown 代码块标记
      let cleanedResponse = response.trim();
      
      logger.debug('清理前响应', { 
        startsWithCodeBlock: cleanedResponse.startsWith('```'),
        firstChars: cleanedResponse.substring(0, 50),
      });
      
      // 去除 ```json 和 ``` 标记（包括前面可能有换行的情况）
      cleanedResponse = cleanedResponse.replace(/^\s*```json\s*/, '');
      cleanedResponse = cleanedResponse.replace(/^\s*```\s*/, '');
      cleanedResponse = cleanedResponse.replace(/\s*```\s*$/, '');
      
      cleanedResponse = cleanedResponse.trim();
      
      logger.debug('清理后响应', { 
        cleanedLength: cleanedResponse.length,
        firstChars: cleanedResponse.substring(0, 100),
      });
      
      const result = JSON.parse(cleanedResponse);
      
      logger.info('AI 响应解析成功', { 
        hasContent: !!result.content,
        contentLength: result.content?.length,
        hasDiagnosisCard: !!result.diagnosisCard,
        diagnosisCardStatus: result.diagnosisCard?.status,
      });
      
      const parsedResult = {
        content: result.content || '',
        diagnosisCard: null,
        rawResponse: response,
      };

      if (result.diagnosisCard) {
        const validStatuses = ['healthy', 'warning', 'critical'];
        const status = validStatuses.includes(result.diagnosisCard.status) 
          ? result.diagnosisCard.status 
          : 'healthy';
        parsedResult.diagnosisCard = {
          species: result.diagnosisCard.species || '未知植物',
          healthScore: result.diagnosisCard.healthScore || 0,
          status: status,
          issues: result.diagnosisCard.issues || [],
          suggestions: result.diagnosisCard.suggestions || [],
          confidence: result.diagnosisCard.confidence || 0,
        };
        
        logger.info('诊断卡解析成功', {
          species: parsedResult.diagnosisCard.species,
          healthScore: parsedResult.diagnosisCard.healthScore,
          status: parsedResult.diagnosisCard.status,
        });
      }

      return parsedResult;
    } catch (err) {
      logger.error('解析 AI 响应失败', { 
        response: response.substring(0, 500), 
        error: err.message,
        errorStack: err.stack,
      });
      
      // 尝试提取 content 字段（即使 JSON 解析失败）
      // 使用更强大的正则，支持多行内容
      const contentMatch = response.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|$)/);
      let extractedContent = contentMatch ? contentMatch[1] : null;
      
      // 如果上面的正则失败，尝试匹配 JSON 中的 content 值（处理转义）
      if (!extractedContent) {
        try {
          // 尝试找到 content 字段并解析
          const contentJsonMatch = response.match(/"content"\s*:\s*"([\s\S]+?)"\s*,\s*"diagnosisCard"/);
          if (contentJsonMatch) {
            extractedContent = contentJsonMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
        } catch (e) {
          // 忽略
        }
      }
      
      logger.warn('尝试提取 content 字段', { extracted: !!extractedContent, contentLength: extractedContent?.length });
      
      return {
        content: extractedContent || '抱歉，分析过程中出现了问题，请稍后重试。',
        diagnosisCard: null,
        rawResponse: response,
      };
    }
  }
}

module.exports = new AIService();
