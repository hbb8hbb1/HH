# 标签体系规范文档

## 📋 概述

本文档定义了完整的数据标签体系规范，确保 Pipeline、后端和前端使用统一的标签值。

**版本**: 2.0.0  
**最后更新**: 2025-01-11  
**规范类型**: 强制规范（所有数据必须符合）

---

## 🎯 核心原则

1. **统一格式**: 所有标签值使用英文标准值（如 "SWE", "Data", "intern"）
2. **值验证**: 所有标签值必须在允许值列表中
3. **别名映射**: 支持中文到英文的别名映射（仅在输入阶段）
4. **向后兼容**: 数据库存储统一使用英文值

---

## 📊 标签维度规范

### 1. category (部门类别)

**标准值**: 
- `"SWE"` - 软件工程
- `"Data"` - 数据科学/算法
- `"PM"` - 产品管理
- `"Design"` - 设计
- `"Infra"` - 基础设施/运维
- `"Other"` - 其他

**规则**:
- ✅ 必须使用英文标准值
- ✅ 数据科学家、数据分析师、算法工程师 → `"Data"`
- ✅ 软件工程师、开发工程师、后端/前端工程师 → `"SWE"`
- ✅ 产品经理、项目经理 → `"PM"`
- ❌ 禁止使用中文值（如 "算法"、"研发"、"产品"）

**别名映射**（输入阶段）:
```json
{
  "算法": "Data",
  "数据": "Data",
  "数据科学": "Data",
  "研发": "SWE",
  "软件工程": "SWE",
  "产品": "PM",
  "设计": "Design",
  "基础设施": "Infra",
  "运维": "Infra"
}
```

---

### 2. recruitType (招聘类型)

**标准值**:
- `"intern"` - 实习
- `"newgrad"` - 校招
- `"experienced"` - 社招

**规则**:
- ✅ 必须使用英文标准值
- ❌ 禁止使用中文值（如 "实习"、"校招"、"社招"）

**别名映射**（输入阶段）:
```json
{
  "实习": "intern",
  "internship": "intern",
  "校招": "newgrad",
  "应届": "newgrad",
  "社招": "experienced",
  "experienced": "experienced"
}
```

---

### 3. location (地点)

**标准值**: 见 `config/tags.json` 中的预定义值

**规则**:
- ✅ 使用标准地点名称（支持中英文）
- ✅ 支持别名映射（如 "硅谷" → "San Francisco Bay Area"）
- ✅ 允许动态值（新地点会自动添加）

**常用标准值**:
- 北美: "San Francisco Bay Area", "Seattle", "New York", "Austin", "Los Angeles"
- 亚洲: "北京", "上海", "深圳", "杭州", "广州", "新加坡", "东京", "香港"
- 欧洲: "London", "Berlin", "Amsterdam", "Dublin"
- 远程: "Remote", "Hybrid"

---

### 4. experience (经验要求)

**标准值**:
- `"0"` - 无经验要求
- `"0-2"` - 0-2年
- `"2-5"` - 2-5年
- `"5-10"` - 5-10年
- `"10+"` - 10年以上

**规则**:
- ✅ 必须使用标准格式
- ❌ 禁止使用其他格式（如 "1-3年", "junior", "senior"）

---

### 5. salary (薪资范围)

**标准值**:
- `"0-100k"` - $0-100K
- `"100k-150k"` - $100K-150K
- `"150k-200k"` - $150K-200K
- `"200k-300k"` - $200K-300K
- `"300k+"` - $300K+

**规则**:
- ✅ 必须使用标准格式（USD，年度）
- ❌ 禁止使用其他格式（如 "20-30万", "50k"）

---

### 6. technologies (技术栈)

**标准值**: 字符串数组，如 `["React", "TypeScript", "Python"]`

**规则**:
- ✅ 使用标准技术名称（首字母大写，如 "React", "Python", "Java"）
- ✅ 支持动态值（新技术会自动添加）
- ❌ 禁止使用不规范名称（如 "react", "python", "PYTHON"）

---

### 7. company (公司)

**标准值**: 见 `config/tags.json` 中的预定义值和别名映射

**规则**:
- ✅ 使用标准公司名称（英文，如 "Google", "Meta", "ByteDance"）
- ✅ 支持别名映射（如 "谷歌" → "Google", "字节跳动" → "ByteDance"）
- ✅ 允许动态值（新公司会自动添加）

---

## 🔄 数据流规范

### Pipeline 阶段

1. **AI 提取**: AI 可能返回中文或英文值
2. **规范化处理**: 使用别名映射将中文值转换为英文标准值
3. **验证**: 验证所有值是否符合规范
4. **输出**: 输出统一使用英文标准值

### 数据库存储

- ✅ 所有 `tagDimensions` 字段使用英文标准值
- ✅ `company` 字段使用英文标准名称
- ❌ 禁止存储中文值（除了 `location` 可能包含中文）

### 后端 API

- ✅ 接收和返回都使用英文标准值
- ✅ 无需转换（前后端值一致）

### 前端

- ✅ 使用英文标准值进行筛选
- ✅ 显示时使用标签映射表转换为中文显示

---

## ✅ 验证规则

### 必需字段

所有 Post 数据必须包含以下字段：
- `title` (String, required)
- `company` (String, required)
- `role` (String, optional)
- `tagDimensions.category` (String, 必须是标准值)
- `tagDimensions.recruitType` (String, 必须是标准值或空字符串)
- `tagDimensions.location` (String, optional)
- `tagDimensions.experience` (String, 必须是标准值或空字符串)
- `tagDimensions.salary` (String, 必须是标准值或空字符串)
- `tagDimensions.technologies` (Array<String>, optional)
- `tagDimensions.custom` (Array<String>, optional)

### 验证函数

参见 `hh_pipeline/validators.py` 和 `HH-main/server/utils/tagValidator.js`

---

## 🧪 测试规范

参见 `tests/test_tag_validation.py` 和 `HH-main/server/tests/tagValidator.test.js`

---

## 📝 变更日志

### v2.0.0 (2025-01-11)
- 统一使用英文标准值
- 建立完整的验证体系
- 添加自动化测试

### v1.0.0 (2024-01-15)
- 初始版本


