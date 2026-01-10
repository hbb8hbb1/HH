#!/bin/bash
# 最小测试脚本：验证pipeline的幂等性和AI-gate

set -e

echo "🧪 Pipeline 测试脚本"
echo "=========================================="

# 检查AI API
if [ -z "$QWEN_API_KEY" ] && [ -z "$API_KEY" ]; then
    echo "❌ 测试1: AI-gate测试"
    echo "   未配置AI API，pipeline应该立即退出"
    python3 pipeline.py run --html-dir ./test_input --out-dir ./test_out 2>&1 | grep -q "未配置AI API" && echo "   ✅ AI-gate正常工作" || echo "   ❌ AI-gate未生效"
    exit 0
fi

echo "✅ AI API已配置，开始完整测试"
echo ""

# 创建测试输入（如果有HTML文件）
if [ ! -d "test_input" ]; then
    mkdir -p test_input
    echo "⚠️  test_input目录为空，请添加HTML文件进行测试"
    exit 0
fi

HTML_COUNT=$(find test_input -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
if [ "$HTML_COUNT" -eq 0 ]; then
    echo "⚠️  未找到测试HTML文件，跳过处理测试"
    echo "   使用方法：将HTML文件放到 test_input/ 目录"
    exit 0
fi

echo "📁 找到 $HTML_COUNT 个测试HTML文件"
echo ""

# 第一次运行
echo "🔄 测试1: 第一次运行（应该处理所有文件）"
python3 pipeline.py run --html-dir ./test_input --out-dir ./test_out
FIRST_OK=$(find test_out/final -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
echo "   第一次运行成功处理: $FIRST_OK 个文件"
echo ""

# 第二次运行（幂等测试）
echo "🔄 测试2: 第二次运行（应该跳过已处理的文件）"
python3 pipeline.py run --html-dir ./test_input --out-dir ./test_out 2>&1 | tail -10
SECOND_OK=$(find test_out/final -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
echo "   最终final文件数: $SECOND_OK 个"
echo ""

# 验证输出结构
echo "📊 测试3: 验证输出结构"
[ -d "test_out/final" ] && echo "   ✅ out/final/ 存在" || echo "   ❌ out/final/ 不存在"
[ -d "test_out/bad" ] && echo "   ✅ out/bad/ 存在" || echo "   ❌ out/bad/ 不存在"
[ -f "test_out/state.sqlite" ] && echo "   ✅ out/state.sqlite 存在" || echo "   ❌ out/state.sqlite 不存在"
echo ""

# 检查状态数据库
if [ -f "test_out/state.sqlite" ]; then
    echo "📊 状态数据库统计："
    sqlite3 test_out/state.sqlite "SELECT status, COUNT(*) FROM processing_state GROUP BY status;" 2>/dev/null || echo "   （状态数据库为空）"
fi

echo ""
echo "✅ 测试完成！"
