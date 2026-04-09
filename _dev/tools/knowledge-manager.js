/**
 * 知识管理工具
 * 用于管理 docs/current/11-knowledge/ 目录中的知识资源
 */

const fs = require('fs')
const path = require('path')

// 知识库根目录
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../../docs/current/11-knowledge')
const META_DIR = path.join(KNOWLEDGE_BASE_DIR, 'meta')
const INDEX_FILE = path.join(META_DIR, 'index.json')
const TAGS_FILE = path.join(META_DIR, 'tags.json')

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 生成知识唯一 ID
 * @returns {string} - KNOW-YYYY-MM-DD-NNN 格式的 ID
 */
function generateId() {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const index = getNextSequenceNumber(dateStr)
  return `KNOW-${dateStr}-${String(index).padStart(3, '0')}`
}

/**
 * 获取下一个序号
 * @param {string} dateStr - 日期字符串 YYYY-MM-DD
 * @returns {number} - 下一个序号
 */
function getNextSequenceNumber(dateStr) {
  const index = loadIndex()
  const todayEntries = index.knowledge.filter(k => k.id.startsWith(`KNOW-${dateStr}`))
  return todayEntries.length + 1
}

/**
 * 加载索引文件
 * @returns {Object} - 索引对象
 */
function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      knowledge: [],
      categories: [],
      tags: [],
      stats: { totalKnowledge: 0, activeKnowledge: 0, archivedKnowledge: 0 }
    }
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
}

/**
 * 保存索引文件
 * @param {Object} index - 索引对象
 */
function saveIndex(index) {
  index.lastUpdated = new Date().toISOString().split('T')[0]
  ensureDirectory(META_DIR)
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8')
}

/**
 * 加载标签文件
 * @returns {Object} - 标签对象
 */
function loadTags() {
  if (!fs.existsSync(TAGS_FILE)) {
    return { version: '1.0', tagGroups: [], customTags: [], tagRelations: {} }
  }
  return JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'))
}

/**
 * 解析文档的 YAML frontmatter
 * @param {string} content - 文档内容
 * @returns {Object} - { meta: Object, content: string }
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { meta: {}, content }
  }

  const frontmatter = match[1]
  const body = match[2]

  const meta = {}
  frontmatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      let value = line.substring(colonIndex + 1).trim()

      // 解析数组
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'))
        } catch {
          value = value.slice(1, -1).split(',').map(v => v.trim())
        }
      }

      meta[key] = value
    }
  })

  return { meta, content: body }
}

/**
 * 格式化 YAML frontmatter
 * @param {Object} meta - 元数据对象
 * @returns {string} - YAML frontmatter 字符串
 */
function formatFrontmatter(meta) {
  const lines = ['---']
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`)
    } else {
      lines.push(`${key}: "${value}"`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}

/**
 * 存储新知识
 * @param {Object} data - 知识数据
 * @param {string} data.title - 标题
 * @param {string} data.type - 类型 (decision|learning|pattern|solution|insight)
 * @param {string} data.category - 分类路径
 * @param {string[]} data.tags - 标签数组
 * @param {string} data.content - 内容
 * @param {string} data.fileName - 文件名（可选）
 * @returns {Object} - 存储的知识信息
 */
function storeKnowledge(data) {
  // 生成 ID
  const id = generateId()

  // 构建元数据
  const now = new Date().toISOString().split('T')[0]
  const meta = {
    id,
    type: data.type,
    category: data.category,
    tags: data.tags || [],
    created: now,
    updated: now,
    author: 'AI',
    status: 'active'
  }

  // 构建文件路径
  const fileName = data.fileName || `${data.title.toLowerCase().replace(/\s+/g, '-')}.md`
  const filePath = path.join(KNOWLEDGE_BASE_DIR, data.category, fileName)

  // 确保目录存在
  ensureDirectory(path.dirname(filePath))

  // 构建文档内容
  const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath).replace(/\\/g, '/')
  const documentContent = `${formatFrontmatter(meta)}

# ${data.title}

## 摘要

${data.summary || ''}

## 详细内容

${data.content}

## 相关链接
- 知识ID: ${id}

## 变更记录
| 日期 | 变更内容 |
|:---|:---|
| ${now} | 初始创建 |
`

  // 写入文件
  fs.writeFileSync(filePath, documentContent, 'utf8')

  // 更新索引
  const index = loadIndex()
  index.knowledge.push({
    id,
    title: data.title,
    type: data.type,
    category: data.category,
    tags: data.tags || [],
    path: relativePath,
    created: now,
    updated: now,
    status: 'active'
  })

  // 更新统计
  index.stats.totalKnowledge++
  index.stats.activeKnowledge++

  // 更新标签
  data.tags?.forEach(tag => {
    if (!index.tags.includes(tag)) {
      index.tags.push(tag)
    }
  })

  saveIndex(index)

  return {
    id,
    path: relativePath,
    meta,
    message: '知识存储成功'
  }
}

/**
 * 读取知识
 * @param {string} id - 知识 ID
 * @returns {Object|null} - 知识对象
 */
function readKnowledge(id) {
  const index = loadIndex()
  const entry = index.knowledge.find(k => k.id === id)

  if (!entry) {
    return null
  }

  const filePath = path.join(KNOWLEDGE_BASE_DIR, entry.path)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = parseFrontmatter(content)

  return {
    ...entry,
    meta: parsed.meta,
    content: parsed.content
  }
}

/**
 * 编辑知识
 * @param {string} id - 知识 ID
 * @param {Object} changes - 变更内容
 * @param {string} changes.title - 新标题（可选）
 * @param {string} changes.content - 新内容（可选）
 * @param {string[]} changes.tags - 新标签（可选）
 * @param {string} changes.status - 新状态（可选）
 * @returns {Object} - 更新结果
 */
function editKnowledge(id, changes) {
  const index = loadIndex()
  const entryIndex = index.knowledge.findIndex(k => k.id === id)

  if (entryIndex === -1) {
    return { success: false, message: '知识不存在' }
  }

  const entry = index.knowledge[entryIndex]
  const filePath = path.join(KNOWLEDGE_BASE_DIR, entry.path)

  if (!fs.existsSync(filePath)) {
    return { success: false, message: '知识文件不存在' }
  }

  // 读取现有内容
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const parsed = parseFrontmatter(fileContent)

  // 更新元数据
  const now = new Date().toISOString().split('T')[0]
  const updatedMeta = { ...parsed.meta, updated: now }

  if (changes.tags) {
    updatedMeta.tags = changes.tags
    entry.tags = changes.tags
  }

  if (changes.status) {
    updatedMeta.status = changes.status
    entry.status = changes.status

    // 更新统计
    if (changes.status === 'archived') {
      index.stats.activeKnowledge--
      index.stats.archivedKnowledge++
    } else if (parsed.meta.status === 'archived' && changes.status === 'active') {
      index.stats.activeKnowledge++
      index.stats.archivedKnowledge--
    }
  }

  // 更新内容
  let newContent = parsed.content
  if (changes.content) {
    newContent = changes.content
  }

  // 构建新文档
  let title = parsed.meta.id || entry.title
  if (changes.title) {
    title = changes.title
    entry.title = changes.title
  }

  const documentContent = `${formatFrontmatter(updatedMeta)}\n# ${title}\n${newContent}`

  // 写入文件
  fs.writeFileSync(filePath, documentContent, 'utf8')

  // 更新索引
  entry.updated = now
  saveIndex(index)

  return {
    success: true,
    message: '知识更新成功',
    id,
    updated: now
  }
}

/**
 * 搜索知识
 * @param {Object} query - 查询条件
 * @param {string} query.keyword - 关键词
 * @param {string} query.type - 类型过滤
 * @param {string} query.category - 分类过滤
 * @param {string[]} query.tags - 标签过滤
 * @param {string} query.status - 状态过滤
 * @returns {Object[]} - 匹配的知识列表
 */
function searchKnowledge(query = {}) {
  const index = loadIndex()
  let results = index.knowledge

  // 按类型过滤
  if (query.type) {
    results = results.filter(k => k.type === query.type)
  }

  // 按分类过滤
  if (query.category) {
    results = results.filter(k => k.category.includes(query.category))
  }

  // 按标签过滤
  if (query.tags && query.tags.length > 0) {
    results = results.filter(k =>
      query.tags.some(tag => k.tags.includes(tag))
    )
  }

  // 按状态过滤
  if (query.status) {
    results = results.filter(k => k.status === query.status)
  }

  // 按关键词搜索
  if (query.keyword) {
    const keyword = query.keyword.toLowerCase()
    results = results.filter(k =>
      k.title.toLowerCase().includes(keyword) ||
      k.tags.some(tag => tag.toLowerCase().includes(keyword))
    )
  }

  return results
}

/**
 * 归档知识
 * @param {string} id - 知识 ID
 * @returns {Object} - 归档结果
 */
function archiveKnowledge(id) {
  return editKnowledge(id, { status: 'archived' })
}

/**
 * 获取知识库统计
 * @returns {Object} - 统计信息
 */
function getStats() {
  const index = loadIndex()
  return {
    ...index.stats,
    categories: index.categories.length,
    tags: index.tags.length
  }
}

/**
 * 列出所有分类
 * @returns {Object[]} - 分类列表
 */
function listCategories() {
  const index = loadIndex()
  return index.categories
}

/**
 * 列出所有标签
 * @returns {string[]} - 标签列表
 */
function listTags() {
  const index = loadIndex()
  return index.tags
}

// 导出 API
module.exports = {
  // 核心功能
  store: storeKnowledge,
  read: readKnowledge,
  edit: editKnowledge,
  search: searchKnowledge,
  archive: archiveKnowledge,

  // 工具函数
  generateId,
  parseFrontmatter,
  formatFrontmatter,

  // 索引管理
  loadIndex,
  saveIndex,

  // 统计和列表
  getStats,
  listCategories,
  listTags,

  // 常量
  KNOWLEDGE_BASE_DIR
}

// CLI 支持
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'stats':
      console.log('知识库统计:', getStats())
      break
    case 'list':
      console.log('知识列表:', loadIndex().knowledge)
      break
    case 'search':
      const keyword = args[1]
      console.log('搜索结果:', searchKnowledge({ keyword }))
      break
    default:
      console.log(`
知识管理工具

用法:
  node knowledge-manager.js <command> [options]

命令:
  stats              显示统计信息
  list               列出所有知识
  search <keyword>   搜索知识

示例:
  node knowledge-manager.js stats
  node knowledge-manager.js search "API"
      `)
  }
}
