# 数据格式规范文档

## 概述

本文档定义了面经数据的标准格式，确保 pipeline、后端数据库和前端展示的一致性。

## 核心数据结构

### Post 数据模型

```json
{
  "title": "帖子标题",
  "originalContent": "原始HTML内容",
  "processedContent": "AI处理后的Markdown内容",
  "company": "公司名称",
  "role": "职位名称",
  "difficulty": 3,
  "tags": ["标签1", "标签2"],
  "tagDimensions": {
    "technologies": ["React", "TypeScript", "Node.js"],
    "recruitType": "校招",
    "location": "北京",
    "category": "研发",
    "subRole": "前端",
    "custom": ["手写代码", "系统设计", "算法题"]
  }
}
```

## tagDimensions 字段规范

### 1. technologies (技术栈)
- **类型**: `string[]`
- **说明**: 涉及的技术栈列表
- **示例**: `["React", "TypeScript", "Node.js", "Python", "PyTorch"]`
- **规则**: 
  - 使用标准技术名称（英文优先）
  - 大小写敏感，首字母大写
  - 常见技术：React, Vue, Angular, TypeScript, JavaScript, Python, Java, Go, C++, Node.js, Spring, Django, PyTorch, TensorFlow 等

### 2. recruitType (招聘类型)
- **类型**: `string`
- **说明**: 招聘类型，单选
- **可选值**: 
  - `"校招"` - 校园招聘
  - `"社招"` - 社会招聘
  - `"暑期实习"` - 暑期实习
  - `"日常实习"` - 日常实习
  - `"其他"` - 其他类型
- **规则**: 如果无法确定，使用 `"其他"`

### 3. location (地点)
- **类型**: `string`
- **说明**: 工作地点
- **示例**: `"北京"`, `"上海"`, `"深圳"`, `"杭州"`, `"硅谷"`, `"新加坡"`
- **规则**: 
  - 使用标准城市名称（中文）
  - 海外地点可用英文，如 `"硅谷"`, `"新加坡"`, `"London"`
  - 如果不明确，使用空字符串 `""`

### 4. category (部门类别)
- **类型**: `string`
- **说明**: 部门或类别
- **可选值**（互联网行业）:
  - `"研发"` - 研发部门
  - `"算法"` - 算法部门
  - `"产品"` - 产品部门
  - `"设计"` - 设计部门
  - `"运营"` - 运营部门
  - `"市场"` - 市场部门
  - `"HR"` - 人力资源
- **规则**: 根据行业不同，类别可能不同

### 5. subRole (子角色)
- **类型**: `string`
- **说明**: 具体子角色
- **示例**（研发类别）:
  - `"前端"`, `"后端"`, `"移动端"`, `"全栈"`, `"测试"`, `"运维"`, `"大数据"`, `"架构"`, `"系统设计"`, `"嵌入式"`
- **示例**（算法类别）:
  - `"机器学习"`, `"CV"`, `"NLP"`, `"推荐系统"`, `"强化学习"`, `"大模型/LLM"`
- **规则**: 根据 category 不同，subRole 不同

### 6. custom (自定义标签)
- **类型**: `string[]`
- **说明**: 其他自定义标签
- **示例**: `["手写代码", "系统设计", "算法题", "行为面试", "英文面试"]`
- **规则**: 
  - 用于补充其他维度无法覆盖的标签
  - 如面试类型、题目类型、特殊要求等

## 字段映射关系

### 前端筛选维度 → tagDimensions 字段

| 前端筛选维度 | tagDimensions 字段 | 说明 |
|------------|-------------------|------|
| `filters.company` | `company` (顶层字段) | 公司名称 |
| `filters.location` | `tagDimensions.location` | 地点 |
| `filters.recruitType` | `tagDimensions.recruitType` | 招聘类型 |
| `filters.category` | `tagDimensions.category` | 部门类别 |
| `filters.subRole` | `tagDimensions.subRole` | 子角色 |
| 技术栈筛选 | `tagDimensions.technologies` | 技术栈（数组） |

## AI Prompt 要求

pipeline 中的 AI 需要按照以下规则提取 tagDimensions：

1. **technologies**: 从内容中提取提到的技术栈
2. **recruitType**: 从标题或内容中识别招聘类型（校招/社招/实习）
3. **location**: 从标题或内容中提取地点信息
4. **category**: 根据 role 和内容判断部门类别
5. **subRole**: 根据 role 和内容判断具体子角色
6. **custom**: 提取其他有价值的标签（如"手写代码"、"系统设计"等）

## 向后兼容

- `tags` 字段保留，用于向后兼容
- 新数据同时包含 `tags` 和 `tagDimensions`
- 旧数据可以逐步迁移，或通过脚本补充 `tagDimensions`

## 数据验证规则

1. `tagDimensions.recruitType` 必须是预定义值之一
2. `tagDimensions.technologies` 数组长度建议 1-10
3. `tagDimensions.custom` 数组长度建议 0-5
4. 所有字符串字段不能为空字符串（除非明确允许）

