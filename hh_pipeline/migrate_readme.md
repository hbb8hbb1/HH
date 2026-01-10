# 现有数据迁移指南

## 概述

本脚本用于将现有数据库中的帖子数据迁移到新的 `tagDimensions` 结构。

## 方案三（混合方案）流程

1. **阶段1：规则映射** - 从现有字段（title, tags, role）快速推断 tagDimensions
2. **阶段2：AI补充** - 对不确定的数据使用AI精确提取缺失维度
3. **统计报告** - 显示迁移进度和质量

## 使用方法

### 1. 环境准备

```bash
# 确保已安装依赖
pip install pymongo

# 配置MongoDB连接（可选，默认使用 mongodb://localhost:27017/offermagnet）
export MONGO_URI="mongodb://localhost:27017/offermagnet"

# 如果使用AI补充功能，需要配置AI API Key
export QWEN_API_KEY="your-qwen-api-key"  # 或
export API_KEY="your-gemini-api-key"
```

### 2. 运行迁移

#### 方式1：完整迁移（推荐）
```bash
# 先运行规则映射，再对不确定的数据进行AI补充
python migrate_existing_data.py --mode full
```

#### 方式2：仅规则映射（快速）
```bash
# 只使用规则映射，不调用AI（速度快，成本低）
python migrate_existing_data.py --mode rules-only
```

#### 方式3：仅AI补充
```bash
# 只对已有tagDimensions但缺失某些维度的数据进行AI补充
python migrate_existing_data.py --mode ai-only
```

### 3. 自定义配置

```bash
# 指定MongoDB URI
python migrate_existing_data.py --mode full --mongo-uri "mongodb+srv://user:pass@cluster.mongodb.net/offermagnet"

# 调整批量处理大小
python migrate_existing_data.py --mode full --batch-size 50
```

## 规则映射逻辑

### 地点提取
- 从 `title` 和 `tags` 中搜索城市关键词
- 支持：北京、上海、深圳、杭州、广州、成都、新加坡、硅谷、纽约、伦敦、香港

### 招聘类型提取
- 从 `title` 和 `tags` 中搜索关键词
- 优先级：校招 > 社招 > 实习
- 支持：校招、社招、暑期实习、日常实习

### 技术栈提取
- 从 `tags` 数组中提取已知技术名称
- 支持常见技术：React, Vue, Python, Java, Node.js, PyTorch 等

### 部门类别推断
- 从 `role` 字段推断
- 支持：研发、算法、产品、设计、运营、市场

### 子角色推断
- 从 `role` 和 `tags` 中推断
- 支持：前端、后端、移动端、全栈、测试、运维、大数据、架构、系统设计、机器学习、CV、NLP等

### 自定义标签
- `tags` 中排除技术栈和维度标签后的剩余标签

## AI补充逻辑

当规则映射后仍有缺失维度时，会调用AI进行补充：

- **缺失 category**：从内容中提取部门类别
- **缺失 subRole**：从内容中提取子角色
- **缺失 location**：从内容中提取地点
- **recruitType 为"其他"**：从内容中提取准确的招聘类型

## 输出示例

```
============================================================
📦 现有数据迁移脚本 - 方案三（混合方案）
============================================================
模式: full
批量大小: 100

🔗 连接MongoDB: mongodb://localhost:27017/offermagnet
✅ MongoDB连接成功

📊 找到 900 条需要迁移的数据
  [10/900] ✅ 已迁移 (规则: 10, AI: 3)
  [20/900] ✅ 已迁移 (规则: 20, AI: 5)
  ...
  [900/900] ✅ 已迁移 (规则: 900, AI: 180)

📊 迁移完成:
   ✅ 规则映射: 900 条
   🤖 AI补充: 180 条
   ❌ 失败: 0 条

✅ 成功迁移: 900/900 条
```

## 注意事项

1. **数据备份**：建议在运行迁移前备份数据库
2. **AI成本**：AI补充会调用API，注意成本控制
3. **批量处理**：默认批量大小为100，可根据实际情况调整
4. **幂等性**：脚本会跳过已有 `tagDimensions` 的数据，可以安全地重复运行

## 验证迁移结果

迁移完成后，可以检查数据质量：

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/offermagnet")
db = client["offermagnet"]
posts = db["posts"]

# 检查迁移完成情况
total = posts.count_documents({})
migrated = posts.count_documents({"tagDimensions": {"$exists": True, "$ne": None, "$ne": {}}})
print(f"迁移完成率: {migrated}/{total} ({migrated/total*100:.1f}%)")

# 检查各维度的填充率
category_filled = posts.count_documents({"tagDimensions.category": {"$exists": True, "$ne": ""}})
subrole_filled = posts.count_documents({"tagDimensions.subRole": {"$exists": True, "$ne": ""}})
location_filled = posts.count_documents({"tagDimensions.location": {"$exists": True, "$ne": ""}})

print(f"category填充率: {category_filled}/{migrated} ({category_filled/migrated*100:.1f}%)")
print(f"subRole填充率: {subrole_filled}/{migrated} ({subrole_filled/migrated*100:.1f}%)")
print(f"location填充率: {location_filled}/{migrated} ({location_filled/migrated*100:.1f}%)")
```

