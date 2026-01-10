# HH Pipeline - 统一的HTML面经处理流程

## 概述

`pipeline.py` 是一个单入口脚本，实现从HTML文件到后端数据库的完整处理流程：
1. **解析HTML** → raw JSON
2. **AI清洗** → final JSON（必须有AI API）
3. **可选上传** → 后端数据库

## 核心特性

✅ **幂等去重**：基于内容hash（sha256），已处理的文件自动跳过  
✅ **AI-gate**：必须有AI API才能运行，未配置则立即停止  
✅ **状态追踪**：使用SQLite记录处理状态，支持重试失败文件  
✅ **强校验**：输出前验证必需字段，确保数据质量  

## 环境要求

### Python依赖
```bash
pip install -r requirements.txt
```

### 必需环境变量（AI API，二选一）
```bash
# 方式1: 使用Qwen API（推荐）
export QWEN_API_KEY="sk-..."

# 方式2: 使用Gemini API
export API_KEY="your-gemini-api-key"
```

⚠️ **重要**：如果没有配置AI API，pipeline会立即退出，不处理任何文件。

## 使用方法

### 基本用法（仅生成JSON，不上传）
```bash
python pipeline.py run --html-dir ./input_html --out-dir ./out
```

### 完整用法（生成JSON并上传到后端）
```bash
python pipeline.py run \
  --html-dir ./input_html \
  --out-dir ./out \
  --api-base http://localhost:5001 \
  --email user@example.com \
  --password yourpassword
```

### 参数说明

- `--html-dir`: HTML文件目录（必需）
- `--out-dir`: 输出目录（默认: `./out`）
- `--api-base`: 后端API地址（可选，用于上传）
- `--email`: 登录邮箱（与`--api-base`一起使用）
- `--password`: 登录密码（与`--api-base`一起使用）

### 可选环境变量

```bash
export CONCURRENCY=3      # 并发数（默认: 3）
export MAX_RETRIES=3      # 重试次数（默认: 3）
```

## 输出结构

```
out/
├── final/              # 处理成功的JSON文件（后端格式）
│   ├── 1142160.json
│   └── 1142161.json
├── bad/                # 处理失败的错误记录
│   ├── 1142162.error.txt
│   └── 1142163.error.txt
└── state.sqlite        # 处理状态数据库（幂等去重）
```

### Final JSON 格式

每个 `final/*.json` 文件符合后端 `Post` 模型格式：
```json
{
  "title": "精炼的中文标题",
  "originalContent": "<div>原始HTML内容</div>",
  "processedContent": "## 基本信息\n\n...Markdown格式的结构化内容...",
  "company": "Meta",
  "role": "软件工程师",
  "difficulty": 3,
  "tags": ["算法", "系统设计", "BQ"],
  "comments": [],
  "usefulVotes": 0,
  "uselessVotes": 0,
  "shareCount": 0,
  "isAnonymous": true
}
```

## 幂等机制

Pipeline基于**内容hash（sha256）**实现幂等：

1. **第一次处理**：计算HTML内容hash → 解析 → AI清洗 → 保存final JSON → 记录状态为`ok`
2. **重复输入**：检测到相同hash且状态为`ok` → 验证final文件存在且有效 → **自动跳过**
3. **失败重试**：状态为`bad`的文件可以重新处理

### 状态数据库（state.sqlite）

```sql
CREATE TABLE processing_state (
    content_hash TEXT PRIMARY KEY,  -- HTML内容hash
    status TEXT NOT NULL,           -- 'ok' 或 'bad'
    file_id TEXT,                   -- 输出文件名（不含扩展名）
    error_reason TEXT,              -- 失败原因（仅status='bad'时）
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## AI检测已清洗内容

Pipeline会检测`processedContent`是否已被AI清洗过，判断标准：

- ✅ 包含Markdown格式（`##`标题）
- ✅ 不包含HTML标签（`<div>`, `<br/>`等）
- ✅ 不包含加密数字（蠡口、散散等非结构化特征）
- ✅ 结构清晰（包含分段，长度>100字符）

如果final文件已存在且检测通过，直接跳过处理。

## 错误处理

- **HTML解析失败** → 记录到`bad/*.error.txt`，状态标记为`bad`
- **AI清洗失败** → 记录错误原因，状态标记为`bad`，可重试
- **字段验证失败** → 标记为`bad`，不会生成final JSON
- **上传失败** → 不影响final JSON生成，仅警告提示

## 示例工作流

### 1. 准备HTML文件
```bash
mkdir -p input_html
# 将HTML文件复制到 input_html/
cp /path/to/*.html input_html/
```

### 2. 运行Pipeline
```bash
export QWEN_API_KEY="sk-..."
python pipeline.py run --html-dir ./input_html --out-dir ./out
```

### 3. 查看结果
```bash
# 查看成功处理的文件
ls out/final/

# 查看失败记录
ls out/bad/

# 查看处理状态
sqlite3 out/state.sqlite "SELECT status, COUNT(*) FROM processing_state GROUP BY status;"
```

### 4. 重复运行（验证幂等）
```bash
# 再次运行相同的HTML目录
python pipeline.py run --html-dir ./input_html --out-dir ./out
# 应该看到所有文件都被跳过（skipped）
```

### 5. 上传到后端（可选）
```bash
python pipeline.py run \
  --html-dir ./input_html \
  --out-dir ./out \
  --api-base http://localhost:5001 \
  --email importer@example.com \
  --password yourpass
```

## 测试

### 最小测试（验证幂等）
```bash
# 准备2个HTML文件（其中1个重复）
mkdir -p test_input
cp test1.html test_input/
cp test1.html test_input/test1_duplicate.html  # 重复文件
cp test2.html test_input/

# 第一次运行
python pipeline.py run --html-dir ./test_input --out-dir ./test_out
# 应该看到：total=3, ok=2, skipped=0（test1和test1_duplicate相同hash，只处理一次）

# 第二次运行
python pipeline.py run --html-dir ./test_input --out-dir ./test_out
# 应该看到：total=3, ok=0, skipped=3（全部跳过）
```

## 故障排查

### 问题1: "未配置AI API Key"
**解决**：设置环境变量 `QWEN_API_KEY` 或 `API_KEY`

### 问题2: "AI API检查失败"
**解决**：检查API Key是否有效，网络是否正常

### 问题3: 重复文件仍然被处理
**解决**：检查`out/state.sqlite`是否存在且可写，检查final文件是否被手动删除

### 问题4: 上传失败但JSON已生成
**解决**：这是正常行为。JSON已保存到`out/final/`，可以手动重新上传。

## 与旧版本的区别

| 旧版本 | 新版本 |
|--------|--------|
| 多个脚本（parse_html_batch.py, process_raw_to_final.mjs, import_posts_via_api.py） | 单入口脚本（pipeline.py） |
| 需要手动运行多个步骤 | 一键运行完整流程 |
| 无幂等机制，会重复处理 | 基于hash幂等，自动跳过已处理 |
| AI API可选，可以跳过清洗 | AI API强制要求，无API则停止 |
| 多个输出目录（data_raw, data_final） | 统一输出目录（out/final, out/bad） |
| 无状态追踪 | SQLite状态数据库 |

## 迁移指南

如果你有旧的`data_final/*.json`文件，可以：

1. **保留旧文件**：手动复制到`out/final/`
2. **重新处理**：将原始HTML放到`input_html/`，运行pipeline（会自动跳过已处理的）

## License

ISC
