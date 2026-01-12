#!/bin/bash
# 重建数据脚本
# 1. 清理旧数据
# 2. 重新运行 Pipeline
# 3. 验证数据

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/HH-main/server"
PIPELINE_DIR="$PROJECT_ROOT/hh_pipeline"

echo "🚀 开始重建数据流程"
echo "=========================================="
echo ""

# 步骤 1: 检查数据库状态
echo "📊 步骤 1: 检查数据库状态"
cd "$SERVER_DIR"
node scripts/check_database.js
echo ""

# 步骤 2: 清理旧数据
echo "🗑️  步骤 2: 清理旧数据"
read -p "是否清理旧数据？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    node scripts/clear_posts.js
    echo ""
else
    echo "⚠️  跳过清理旧数据"
    echo ""
fi

# 步骤 3: 检查 HTML 文件
echo "📁 步骤 3: 检查 HTML 文件"
HTML_DIR="$PIPELINE_DIR/input_html"
HTML_COUNT=$(find "$HTML_DIR" -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
echo "找到 $HTML_COUNT 个 HTML 文件"

if [ "$HTML_COUNT" -eq 0 ]; then
    echo "⚠️  未找到 HTML 文件，无法运行 Pipeline"
    echo "   请将 HTML 文件放到 $HTML_DIR 目录"
    exit 1
fi

# 步骤 4: 运行 Pipeline
echo ""
echo "🔄 步骤 4: 运行 Pipeline"
cd "$PIPELINE_DIR"
echo "正在运行 Pipeline..."

# 检查是否有 API 配置
if [ -n "$API_BASE" ] && [ -n "$API_EMAIL" ] && [ -n "$API_PASSWORD" ]; then
    echo "使用 API 上传模式"
    python3 pipeline.py run \
        --html-dir "$HTML_DIR" \
        --out-dir "$PIPELINE_DIR/out" \
        --api-base "$API_BASE" \
        --email "$API_EMAIL" \
        --password "$API_PASSWORD"
else
    echo "使用本地文件模式（仅生成 JSON，不上传）"
    python3 pipeline.py run \
        --html-dir "$HTML_DIR" \
        --out-dir "$PIPELINE_DIR/out"
    echo ""
    echo "⚠️  数据已生成到 $PIPELINE_DIR/out/final/ 目录"
    echo "   如需上传到数据库，请运行："
    echo "   export API_BASE=http://localhost:5001"
    echo "   export API_EMAIL=your-email@example.com"
    echo "   export API_PASSWORD=your-password"
    echo "   $0"
fi

# 步骤 5: 验证数据
echo ""
echo "✅ 步骤 5: 验证数据"
cd "$SERVER_DIR"
node scripts/check_database.js

echo ""
echo "🎉 数据重建完成！"

