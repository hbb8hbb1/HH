#!/bin/bash
cd "$(dirname "$0")/server"
echo "🚀 启动后端服务器..."
echo "📁 目录: $(pwd)"
echo ""
PORT=5001 node index.js
