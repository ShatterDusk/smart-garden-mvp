# Tasks - API接口设计文档去重与章节重组

## 任务清单

### Phase 1: 分析与准备
- [ ] Task 1: 完整读取03-API接口设计.md，确认所有重复内容
  - [ ] SubTask 1.1: 确认第五章（设备接口旧版）的完整范围（行号）
  - [ ] SubTask 1.2: 确认第八章（环境数据接口）的完整范围
  - [ ] SubTask 1.3: 确认第九章（设备接口新版）的完整范围
  - [ ] SubTask 1.4: 记录所有需要修改的章节编号引用

### Phase 2: 执行删除
- [ ] Task 2: 删除第五章（旧版设备相关接口）
  - [ ] SubTask 2.1: 删除"## 五、设备相关接口"标题及5.1-5.4全部内容
  - [ ] SubTask 2.2: 确保删除后文档结构完整

### Phase 3: 章节重排
- [ ] Task 3: 重排章节编号
  - [ ] SubTask 3.1: 原"六、AI分析接口" → "五、AI分析接口"
  - [ ] SubTask 3.2: 原"八、环境数据接口" → "六、环境数据接口"
  - [ ] SubTask 3.3: 原"九、养护记录接口" → "七、养护记录接口"
  - [ ] SubTask 3.4: 原"九、设备相关接口(第九章)" → "八、设备相关接口"
  - [ ] SubTask 3.5: 原"十、文件相关接口" → "九、文件相关接口"
  - [ ] SubTask 3.6: 更新所有子章节编号（如6.1→5.1, 8.1→6.1等）
  - [ ] SubTask 3.7: 更新目录/索引中的章节引用

### Phase 4: 验证
- [ ] Task 4: 验证文档一致性
  - [ ] SubTask 4.1: 检查无重复接口定义
  - [ ] SubTask 4.2: 检查章节编号连续无跳跃
  - [ ] SubTask 4.3: 检查内部交叉引用正确

### Phase 5: 版本更新
- [ ] Task 5: 更新文档元信息
  - [ ] SubTask 5.1: 版本号 V3.0 → V3.1
  - [ ] SubTask 5.2: 添加变更记录
  - [ ] SubTask 5.3: 更新日期

# Task Dependencies
- Task 2 depends on Task 1 (需先确认删除范围)
- Task 3 depends on Task 2 (需先完成删除)
- Task 4 depends on Task 3 (需先完成重排)
- Task 5 depends on Task 4 (验证通过后更新版本)
