# 单文件快速处理指南

## 🚀 功能

一键处理单个HTML文件，自动完成：
1. ✅ HTML解析
2. ✅ AI清洗（提取结构化信息）
3. ✅ 标签规范化（符合前端筛选标准）
4. ✅ 自动导入MongoDB数据库
5. ✅ **前端可立即使用标签筛选**

## 📋 使用方法

### 方式1：使用便捷脚本（推荐）

```bash
cd /Users/henghuang/Desktop/代码/hh_pipeline
./quick_process.sh /path/to/file.html
```

### 方式2：直接使用Python脚本

```bash
cd /Users/henghuang/Desktop/代码/hh_pipeline
export QWEN_API_KEY='sk-ee01fd9f19b642b3ac6d61ad59da70cf'
python3 process_single.py /path/to/file.html
```

### 方式3：不自动导入（仅处理，不导入数据库）

```bash
python3 process_single.py /path/to/file.html --no-import
```

## ⚡ 处理流程

```
HTML文件 
  ↓
解析HTML（提取标题、内容）
  ↓
AI清洗（提取公司、岗位、难度、标签等）
  ↓
标签规范化（category, recruitType, location等）
  ↓
自动导入MongoDB
  ↓
✅ 前端可立即使用标签筛选查看
```

## 🏷️ 支持的标签筛选维度

处理后的数据支持以下前端筛选：

- **Company** (公司)
- **Category** (部门类别: SWE, Data, PM, Design, Infra, Other)
- **RecruitType** (招聘类型: intern, newgrad, experienced)
- **Location** (地点)
- **Experience** (经验要求: 0, 0-2, 2-5, 5-10, 10+)
- **Salary** (薪资范围)
- **Technologies** (技术栈数组)

## 📊 处理示例

```bash
$ ./quick_process.sh /Users/henghuang/Desktop/Offer\ Magnet/面经合集/Meta/SDE/html/1125083.html

============================================================
📄 处理文件: 1125083.html
============================================================

✅ QWEN API可用 (使用 QWEN API)

📖 步骤1: 解析HTML文件...
   ✅ 解析成功
   标题: Meta SDE 面试经验分享...
   内容长度: 3245 字符

🤖 步骤2: AI清洗处理...
   ✅ AI清洗成功
   公司: Meta
   岗位: Software Engineer
   难度: 4/5
   Category: SWE
   RecruitType: experienced
   Location: San Francisco Bay Area
   Technologies: React, TypeScript, Node.js

💾 步骤3: 导入到数据库...
✅ 已导入到数据库 (ID: 696350f975a2feaf1a78baec)

============================================================
🎉 处理完成！前端可以立即使用标签筛选查看此帖子
============================================================
```

## ⚙️ 环境要求

1. **Python 3.9+**
2. **依赖包**:
   ```bash
   pip install pymongo beautifulsoup4 lxml requests
   ```
3. **API Key** (已内置，或设置环境变量):
   ```bash
   export QWEN_API_KEY='sk-...'
   ```

## 🔍 验证导入结果

### 检查数据库

```bash
# 通过API查看
curl 'http://localhost:5001/api/posts?page=1&limit=1'
```

### 前端查看

1. 打开前端页面: `http://localhost:3000`
2. 使用标签筛选器筛选帖子
3. 新导入的帖子会立即显示

## 🎯 优势

- ⚡ **极低延迟**: 单文件处理，无需等待批量处理
- 🔄 **自动导入**: 处理完成后自动导入，无需手动操作
- 🏷️ **标签完整**: 支持所有前端筛选维度
- ✅ **幂等性**: 相同文件不会重复导入
- 🚀 **即插即用**: 导入后前端可立即使用

## ❓ 常见问题

### Q: 处理失败怎么办？
A: 检查：
1. HTML文件格式是否正确
2. API Key是否有效
3. MongoDB连接是否正常

### Q: 如何查看处理日志？
A: 脚本会实时输出处理进度和结果

### Q: 可以批量处理吗？
A: 可以，使用 `pipeline.py run --html-dir <目录>` 进行批量处理

### Q: 导入后前端看不到？
A: 检查：
1. 后端API是否运行: `curl http://localhost:5001/api/posts`
2. 前端是否刷新页面
3. 筛选条件是否匹配

## 📝 注意事项

- 处理单个文件约需 5-15 秒（取决于AI API响应速度）
- 相同内容的文件不会重复导入（基于title+company去重）
- 确保MongoDB连接正常，否则导入会失败

