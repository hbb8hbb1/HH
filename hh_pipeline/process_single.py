#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单文件快速处理脚本 - 处理单个HTML文件并自动导入后端

使用方法:
    python3 process_single.py /path/to/file.html

功能:
    1. 解析HTML文件
    2. AI清洗为结构化JSON
    3. 自动导入到MongoDB
    4. 前端可立即使用（支持标签筛选）
"""

import sys
from pathlib import Path

# 导入pipeline的核心功能
from pipeline import (
    parse_html, 
    process_with_ai, 
    check_ai_api,
    AI_TYPE
)

# 导入工具模块
from mongodb_utils import import_to_mongodb

def process_single_file(html_path: str, auto_import: bool = True):
    """处理单个HTML文件"""
    html_path = Path(html_path)
    
    if not html_path.exists():
        print(f"❌ 文件不存在: {html_path}")
        return False
    
    if not html_path.suffix.lower() == '.html':
        print(f"⚠️  警告: 文件不是.html格式: {html_path}")
    
    print(f"\n{'='*60}")
    print(f"📄 处理文件: {html_path.name}")
    print(f"{'='*60}\n")
    
    # 1. 检查AI API
    ai_available, ai_msg = check_ai_api()
    if not ai_available:
        print(f"❌ {ai_msg}")
        return False
    print(f"✅ {ai_msg} (使用 {AI_TYPE.upper()} API)\n")
    
    # 2. 解析HTML
    print("📖 步骤1: 解析HTML文件...")
    try:
        raw_data = parse_html(html_path)
        if not raw_data.get("title") or not raw_data.get("originalContentText"):
            raise ValueError("解析失败：缺少title或content")
        print(f"   ✅ 解析成功")
        print(f"   标题: {raw_data.get('title', '')[:60]}...")
        print(f"   内容长度: {len(raw_data.get('originalContentText', ''))} 字符\n")
    except Exception as e:
        print(f"   ❌ HTML解析失败: {e}")
        return False
    
    # 3. AI清洗
    print("🤖 步骤2: AI清洗处理...")
    try:
        final_data = process_with_ai(raw_data)
        print(f"   ✅ AI清洗成功")
        print(f"   公司: {final_data.get('company', 'N/A')}")
        print(f"   岗位: {final_data.get('role', 'N/A')}")
        print(f"   难度: {final_data.get('difficulty', 'N/A')}/5")
        tag_dims = final_data.get('tagDimensions', {})
        print(f"   Category: {tag_dims.get('category', 'N/A')}")
        print(f"   RecruitType: {tag_dims.get('recruitType', 'N/A')}")
        print(f"   Location: {tag_dims.get('location', 'N/A')}")
        print(f"   Technologies: {', '.join(tag_dims.get('technologies', [])[:5])}")
        print()
    except Exception as e:
        print(f"   ❌ AI清洗失败: {e}")
        return False
    
    # 4. 导入到MongoDB
    if auto_import:
        print("💾 步骤3: 导入到数据库...")
        success = import_to_mongodb(final_data)
        if success:
            print(f"\n{'='*60}")
            print(f"🎉 处理完成！前端可以立即使用标签筛选查看此帖子")
            print(f"{'='*60}\n")
            return True
        else:
            print(f"\n⚠️  处理完成但导入失败，数据已保存但未导入数据库")
            return False
    else:
        print("\n✅ 处理完成（未自动导入，使用 --import 参数启用自动导入）")
        return True

def main():
    if len(sys.argv) < 2:
        print("使用方法: python3 process_single.py <html_file_path> [--no-import]")
        print("\n示例:")
        print("  python3 process_single.py /path/to/file.html")
        print("  python3 process_single.py /path/to/file.html --no-import  # 不自动导入")
        sys.exit(1)
    
    html_path = sys.argv[1]
    auto_import = '--no-import' not in sys.argv
    
    success = process_single_file(html_path, auto_import)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

