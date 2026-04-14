# TASK-002: AI 图片 URL 缓存优化

## 任务概述

- **任务ID**: TASK-002
- **优先级**: LOW
- **标签**: TODO[LOW]
- **代码位置**: `backend/server/src/services/aiService.js:295`
- **创建时间**: 2026-04-11
- **计划完成**: 2026-05-01
- **负责人**: 待分配
- **状态**: 🟢 待处理

---

## 问题描述

AI 服务在处理图片分析时，每次都需要下载图片并转换为 base64。对于相同的图片 URL，会重复下载，造成：

1. **网络资源浪费** - 重复下载相同图片
2. **响应时间增加** - 每次都要等待下载
3. **API 成本增加** - 如果图片存储有流量费用

---

## 影响范围

- **AI 诊断功能** - 用户多次上传相同图片时响应变慢
- **图片分析接口** - 批量处理时性能下降

---

## 建议方案

### 缓存策略

使用图片 URL + ETag 作为缓存键：

```javascript
// 缓存键格式: ai:image:{url_hash}
// 缓存值: { base64Data, etag, timestamp }
```

### 实现步骤

1. 在 `convertImageToBase64` 方法中添加缓存检查
2. 下载图片时获取 ETag
3. 缓存 base64 数据和 ETag
4. 下次使用时比较 ETag，如果相同则使用缓存

### 代码示例

```javascript
async convertImageToBase64(imageUrl) {
  if (!imageUrl) return null;

  // 检查缓存
  const cacheKey = `ai:image:${crypto.createHash('md5').update(imageUrl).digest('hex')}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    // 验证 ETag 是否仍然有效
    const headResponse = await axios.head(imageUrl);
    if (headResponse.headers.etag === cached.etag) {
      logger.debug('[AI] 使用缓存的图片', { imageUrl });
      return cached.base64Data;
    }
  }

  // 下载图片...
  const response = await imageDownloadClient.get(imageUrl, {
    responseType: 'arraybuffer',
  });

  // 缓存结果
  await cache.set(cacheKey, {
    base64Data: base64Image,
    etag: response.headers.etag,
    timestamp: Date.now(),
  }, 24 * 60 * 60); // 缓存24小时

  return base64Image;
}
```

---

## 验收标准

- [ ] 相同图片 URL 第二次请求使用缓存
- [ ] ETag 变化时自动更新缓存
- [ ] 缓存命中率统计
- [ ] 缓存过期机制（建议 24 小时）
- [ ] 性能测试：缓存命中时响应时间 < 100ms

---

## 相关文档

- [代码注释规范](../01-方法论与规范/代码注释规范.md)
- [代码标签跟踪](../03-流程治理/代码标签跟踪.md)

---

## 备注

- 需要考虑缓存存储方式（内存/Redis/文件）
- 评估缓存大小限制，避免占用过多存储
- 监控缓存命中率和内存使用

---

*创建时间: 2026-04-11*  
*最后更新: 2026-04-11*  
*任务类型: 性能优化*
