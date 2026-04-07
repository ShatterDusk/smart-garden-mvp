# DB Migration Agent

数据库迁移 Agent，帮助生成和管理 Sequelize Migration。

---

## 触发条件

- 修改 `models/*.js`
- 用户请求生成迁移
- 数据库结构变更

---

## 检查清单

### 1. Model 定义

- [ ] 字段类型是否正确
- [ ] 是否有默认值
- [ ] 是否允许 NULL
- [ ] 枚举值是否完整

### 2. 关联关系

- [ ] hasMany / belongsTo 是否正确
- [ ] 外键是否定义
- [ ] 级联删除是否配置

### 3. 索引

- [ ] 常用查询字段是否有索引
- [ ] 唯一约束是否正确

---

## Migration 模板

### 创建表

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('new_table', {
      id: {
        type: Sequelize.STRING(64),
        primaryKey: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('new_table');
  }
};
```

### 添加字段

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('plants', 'new_field', {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: 'existing_field'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('plants', 'new_field');
  }
};
```

---

## 输出格式

```markdown
## 数据库迁移报告

### 变更检测
- Model: `models/Plant.js`
- 变更类型: 添加字段

### 生成的 Migration
- 文件: `migrations/20260405-add-plant-field.js`

### 执行命令
\`\`\`bash
npx sequelize-cli db:migrate
\`\`\`

### 回滚命令
\`\`\`bash
npx sequelize-cli db:migrate:undo
\`\`\`
```

---

## 关联文件

- [02-数据库设计.md](../../设计文档/02-数据库设计.md) - 数据库设计文档
- [sequelize-cli.js](../../backend/server/src/config/sequelize-cli.js) - CLI 配置
