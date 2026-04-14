# API接口设计文档去重与章节重组 Spec

## Why
03-API接口设计.md存在以下问题：
1. **第五章和第九章完全重复** - 设备相关接口定义两次，且参数/返回值不一致
2. **环境数据接口归属不明确** - 第五章包含环境数据接口，与第八章重复
3. **章节编号混乱** - 存在重复编号，影响文档可读性

## What Changes
- 删除第五章（旧版设备接口），保留第九章（完整版）
- 重排所有章节编号（1-9）
- 统一接口定义，消除歧义
- 更新文档版本至V3.1

## Impact
- 受影响文件: `设计文档/03-API接口设计.md`
- 不影响代码实现
- 提升文档可读性和一致性

## ADDED Requirements
无新增功能需求

## MODIFIED Requirements
### Requirement: API接口文档结构清晰
The document SHALL have unique, non-overlapping chapter definitions for each API domain.

#### Scenario: Device API definition uniqueness
- **GIVEN** the API design document
- **WHEN** reading device-related APIs
- **THEN** there SHALL be only ONE definition per endpoint
- **AND** parameters and response structures SHALL be consistent

#### Scenario: Chapter numbering continuity
- **GIVEN** the API design document
- **WHEN** scanning table of contents
- **THEN** chapters SHALL be numbered sequentially without gaps or duplicates

## REMOVED Requirements
### Requirement: 旧版设备接口定义（第五章）
**Reason**: 与第九章重复，且第九章版本更完整（含boundPlant嵌套对象、macAddress绑定参数）
**Migration**: 删除第五章内容，保留第九章作为唯一设备接口定义源
