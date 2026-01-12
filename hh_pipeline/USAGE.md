# HH Pipeline 使用指南

## 快速开始

### 最简单的方式 - 统一入口

只需要一个命令，自动识别是文件还是文件夹：

```bash
# 处理单个HTML文件
python3 process.py /path/to/file.html

# 处理整个文件夹
python3 process.py /path/to/html_folder

# 处理文件夹并同步CSV时间
python3 process.py /path/to/html_folder --csv /path/to/datas.csv
```

### 详细使用方式

#### 1. 处理单个HTML文件

```bash
# 方式1: 使用统一入口（推荐）
python3 process.py /path/to/file.html

# 方式2: 使用便捷脚本
./quick_process.sh /path/to/file.html

# 方式3: 直接使用处理脚本
python3 process_single.py /path/to/file.html

# 不自动导入数据库
python3 process_single.py /path/to/file.html --no-import
```

#### 2. 批量处理文件夹

```bash
# 方式1: 使用统一入口（推荐）
python3 process.py /path/to/html_folder

# 方式2: 直接使用批量处理脚本
python3 process_batch.py --html-dir /path/to/html_folder

# 带CSV时间同步
python3 process_batch.py --html-dir /path/to/html_folder --csv /path/to/datas.csv
```

#### 3. 仅生成JSON文件（不导入数据库）

```bash
python3 pipeline.py run --html-dir /path/to/html_folder --out-dir ./out
```

## 功能说明

### 处理流程

1. **解析HTML** - 提取标题、内容等信息
2. **AI清洗** - 使用AI将原始内容清洗为结构化数据
3. **标签规范化** - 自动提取和规范化标签（公司、岗位、技术栈等）
4. **导入数据库** - 自动导入到MongoDB（单文件和批量处理默认启用）

### 环境变量配置

```bash
# AI API配置（必需）
export QWEN_API_KEY="sk-..."  # 或
export API_KEY="your-gemini-key"  # Gemini API

# MongoDB配置（可选，有默认值）
export MONGO_URI="mongodb://..."

# 并发数配置（可选，默认10）
export CONCURRENCY=5
```

## 常见场景

### 场景1: 快速处理一个文件

```bash
python3 process.py ~/Downloads/interview.html
```

### 场景2: 批量处理下载的HTML文件

```bash
python3 process.py ~/Downloads/html_files/
```

### 场景3: 批量处理并同步发布时间

```bash
python3 process.py ~/Downloads/html_files/ --csv ~/Downloads/datas.csv
```

### 场景4: 只生成JSON，稍后导入

```bash
# 生成JSON
python3 pipeline.py run --html-dir ~/Downloads/html_files/ --out-dir ./out

# 稍后导入
python3 import_to_mongodb.py
```

## 注意事项

1. **AI API必需** - 处理前必须配置 `QWEN_API_KEY` 或 `API_KEY`
2. **自动去重** - 相同内容的文件会自动跳过（基于内容hash）
3. **幂等性** - 可以安全地重复运行，已处理的文件会自动跳过
4. **并发处理** - 批量处理默认使用10个并发，可通过环境变量调整

## 输出说明

- **单文件处理**: 直接导入MongoDB，前端可立即使用
- **批量处理**: 自动导入MongoDB，显示处理统计
- **pipeline.py**: 生成JSON文件到 `out/final/` 目录

