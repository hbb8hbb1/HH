#!/bin/bash
# 快速处理单个HTML文件的便捷脚本

# 设置API Key（如果未设置）
export QWEN_API_KEY="${QWEN_API_KEY:-sk-ee01fd9f19b642b3ac6d61ad59da70cf}"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查参数
if [ $# -lt 1 ]; then
    echo "使用方法: $0 <html_file_path>"
    echo ""
    echo "示例:"
    echo "  $0 /path/to/file.html"
    echo "  $0 ~/Desktop/file.html"
    exit 1
fi

HTML_FILE="$1"

# 检查文件是否存在
if [ ! -f "$HTML_FILE" ]; then
    echo "❌ 文件不存在: $HTML_FILE"
    exit 1
fi

# 运行处理脚本
echo "🚀 开始处理: $HTML_FILE"
python3 "$SCRIPT_DIR/process_single.py" "$HTML_FILE"

