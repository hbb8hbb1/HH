#!/bin/bash
# MongoDB 启动脚本

echo "🔍 检查 MongoDB 状态..."

# 检查 MongoDB 是否已运行
if pgrep -x mongod > /dev/null; then
    echo "✅ MongoDB 已经在运行"
    exit 0
fi

# 尝试不同的启动方式
echo "🚀 尝试启动 MongoDB..."

# 方式1: 使用 brew services（如果可用）
if command -v brew &> /dev/null; then
    echo "尝试使用 brew services..."
    brew services start mongodb-community 2>/dev/null || \
    brew services start mongodb 2>/dev/null || \
    brew services start mongodb-community@7.0 2>/dev/null || \
    echo "brew services 启动失败"
fi

# 方式2: 直接运行 mongod（如果找到）
if command -v mongod &> /dev/null; then
    echo "尝试直接运行 mongod..."
    mongod --dbpath ~/data/db --fork --logpath ~/mongod.log 2>/dev/null || \
    mongod --dbpath /usr/local/var/mongodb --fork --logpath /usr/local/var/log/mongodb/mongo.log 2>/dev/null || \
    echo "直接运行 mongod 失败"
fi

# 等待几秒让 MongoDB 启动
sleep 3

# 检查是否成功启动
if pgrep -x mongod > /dev/null; then
    echo "✅ MongoDB 启动成功"
else
    echo "❌ MongoDB 启动失败"
    echo ""
    echo "💡 请手动启动 MongoDB："
    echo "   方式1: brew services start mongodb-community"
    echo "   方式2: mongod --dbpath ~/data/db"
    echo "   方式3: 查看 MongoDB 安装文档"
    exit 1
fi

