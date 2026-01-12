# 数据重建脚本

## 📋 概述

这些脚本用于清理旧数据并重新上传符合新标签规范的数据。

## 🔧 脚本说明

### 1. check_database.js
检查数据库状态，显示当前数据是否符合新规范。

```bash
cd HH-main/server
node scripts/check_database.js
```

### 2. clear_posts.js
清理所有 posts 数据（谨慎使用！）

```bash
cd HH-main/server
node scripts/clear_posts.js
```

### 3. rebuild_data.sh
完整的数据重建流程：
1. 检查数据库状态
2. 清理旧数据（需确认）
3. 运行 Pipeline 处理 HTML 文件
4. 验证数据

```bash
# 基本用法（仅生成 JSON，不上传）
./scripts/rebuild_data.sh

# 完整用法（生成 JSON 并上传到数据库）
export API_BASE=http://localhost:5001
export API_EMAIL=your-email@example.com
export API_PASSWORD=your-password
./scripts/rebuild_data.sh
```

## 📝 使用步骤

### 步骤 1: 准备 HTML 文件

将 HTML 文件放到 `hh_pipeline/input_html/` 目录。

### 步骤 2: 检查数据库状态

```bash
cd HH-main/server
node scripts/check_database.js
```

### 步骤 3: 清理旧数据（可选）

如果数据不符合新规范，可以清理：

```bash
cd HH-main/server
node scripts/clear_posts.js
```

### 步骤 4: 运行 Pipeline

#### 方式 1: 仅生成 JSON（不上传）

```bash
cd hh_pipeline
python3 pipeline.py run --html-dir ./input_html --out-dir ./out
```

#### 方式 2: 生成 JSON 并上传到数据库

```bash
cd hh_pipeline
python3 pipeline.py run \
    --html-dir ./input_html \
    --out-dir ./out \
    --api-base http://localhost:5001 \
    --email your-email@example.com \
    --password your-password
```

### 步骤 5: 验证数据

```bash
cd HH-main/server
node scripts/check_database.js
```

应该看到所有 category 值都是: `["SWE", "Data", "PM", "Design", "Infra", "Other"]`
应该看到所有 recruitType 值都是: `["intern", "newgrad", "experienced"]` 或空数组

## ⚠️ 注意事项

1. **清理数据是不可逆的操作**，请谨慎使用
2. **确保已配置 AI API**，Pipeline 需要 AI API 才能运行
3. **确保后端服务正在运行**，如果使用 API 上传模式
4. **确保有足够的 HTML 文件**，Pipeline 需要 HTML 文件作为输入

## 🐛 常见问题

### 问题 1: Pipeline 失败

**解决方案**:
- 检查 AI API 是否已配置
- 查看 Pipeline 日志中的错误信息
- 检查 HTML 文件格式是否正确

### 问题 2: 数据上传失败

**解决方案**:
- 检查后端服务是否正在运行
- 检查 API 地址、邮箱、密码是否正确
- 查看后端日志中的错误信息

### 问题 3: 数据不符合规范

**解决方案**:
- 确保 Pipeline 使用了新的验证器
- 检查 Pipeline 日志，查看验证错误
- 重新运行 Pipeline


