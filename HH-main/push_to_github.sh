#!/bin/bash
# 推送代码到 GitHub 的脚本
# 使用方法：GIT_TOKEN=your_token ./push_to_github.sh
# 如果需要使用代理：HTTP_PROXY=http://proxy:port HTTPS_PROXY=http://proxy:port ./push_to_github.sh

cd "$(dirname "$0")"

# 从环境变量读取 GitHub token（安全方式）
if [ -z "$GIT_TOKEN" ]; then
    echo "错误：请设置 GIT_TOKEN 环境变量"
    echo "使用方法：GIT_TOKEN=your_token ./push_to_github.sh"
    exit 1
fi

# 配置 remote
git remote remove origin 2>/dev/null
git remote add origin https://hbb8hbb1:${GIT_TOKEN}@github.com/hbb8hbb1/HH.git

# 如果设置了代理环境变量，配置 git 使用代理
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    if [ -n "$HTTP_PROXY" ]; then
        git config --global http.proxy "$HTTP_PROXY"
    fi
    if [ -n "$HTTPS_PROXY" ]; then
        git config --global https.proxy "$HTTPS_PROXY"
    fi
    echo "使用代理：HTTP_PROXY=$HTTP_PROXY, HTTPS_PROXY=$HTTPS_PROXY"
fi

# 推送代码
echo "正在推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功！"
    # 清除代理配置（如果之前设置了）
    if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
        git config --global --unset http.proxy 2>/dev/null
        git config --global --unset https.proxy 2>/dev/null
    fi
else
    echo "❌ 推送失败。"
    echo ""
    echo "可能的解决方案："
    echo "1. 检查网络连接：ping github.com"
    echo "2. 使用代理：HTTP_PROXY=http://proxy:port HTTPS_PROXY=http://proxy:port ./push_to_github.sh"
    echo "3. 使用 VPN 后重试"
    echo "4. 稍后在网络环境好的时候再试"
fi
