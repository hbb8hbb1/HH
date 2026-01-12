#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接导入JSON到MongoDB（使用正确的数据库和目录）
"""
import json
import sys
import os
from pathlib import Path

# 导入工具模块
from mongodb_utils import connect_mongo, get_mongo_collection, COLLECTION_NAME

def main():
    """主函数"""
    client, db = connect_mongo(verbose=True)
    if client is None or db is None:
        return
    
    posts_collection = db[COLLECTION_NAME]
    
    # 使用 out_new/final 目录（Pipeline 最新输出）
    final_dir = Path("out_new/final")
    if not final_dir.exists():
        print(f"❌ 目录不存在: {final_dir}")
        print("   请确保 Pipeline 已运行并生成了 JSON 文件")
        return
    
    json_files = sorted(final_dir.glob("*.json"))
    if not json_files:
        print(f"❌ 未找到 JSON 文件: {final_dir}")
        return
    
    print(f"\n📁 找到 {len(json_files)} 个 JSON 文件")
    
    # 检查数据库中已有数据
    existing_count = posts_collection.count_documents({})
    if existing_count > 0:
        print(f"⚠️  数据库中已有 {existing_count} 条数据")
        # 支持环境变量自动确认（非交互模式）
        auto_confirm = os.environ.get('AUTO_IMPORT', '').lower() in ('y', 'yes', '1', 'true')
        if not auto_confirm:
            try:
                response = input("是否继续导入？(y/n): ").strip().lower()
                if response != 'y':
                    print("❌ 导入已取消")
                    client.close()
                    return
            except EOFError:
                # 非交互模式下，默认继续导入
                print("⚠️  非交互模式，自动继续导入...")
    
    # 导入文件
    success = 0
    failed = 0
    skipped = 0
    
    print(f"\n🚀 开始导入...\n")
    
    # 记录导入前的数量
    initial_count = posts_collection.count_documents({})
    
    for i, json_file in enumerate(json_files, 1):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                payload = json.load(f)
            
            # 检查是否已存在
            existing = posts_collection.find_one({
                "title": payload.get("title"),
                "company": payload.get("company")
            })
            
            if existing:
                skipped += 1
                if i % 50 == 0:
                    print(f"   [{i}/{len(json_files)}] ⏭️  已存在，跳过 (成功: {success}, 跳过: {skipped}, 失败: {failed})")
                continue
            
            # 使用统一的导入函数
            from mongodb_utils import import_to_mongodb
            result = import_to_mongodb(payload, verbose=False)
            
            if result:
                success += 1
            else:
                failed += 1
            
            if i % 20 == 0 or i == len(json_files):
                print(f"   [{i}/{len(json_files)}] ✅ 导入中... (成功: {success}, 跳过: {skipped}, 失败: {failed})")
        except Exception as e:
            failed += 1
            if failed <= 5 or i % 50 == 0:
                print(f"   [{i}/{len(json_files)}] ❌ 导入失败: {str(e)[:100]}")
    
    print(f"\n{'='*50}")
    print(f"📊 导入完成统计：")
    print(f"   ✅ 成功: {success} 个")
    print(f"   ⏭️  跳过: {skipped} 个（已存在）")
    print(f"   ❌ 失败: {failed} 个")
    
    # 验证导入结果
    total_count = posts_collection.count_documents({})
    google_count = posts_collection.count_documents({"company": "Google"})
    
    print(f"\n📊 数据库状态：")
    print(f"   总帖子数: {total_count}")
    print(f"   Google 帖子数: {google_count}")
    
    # 检查标签维度
    categories = posts_collection.distinct("tagDimensions.category")
    categories = [c for c in categories if c]
    if categories:
        print(f"   Category 值: {categories[:10]}{'...' if len(categories) > 10 else ''}")
    
    client.close()
    print("\n✅ 导入完成！")

if __name__ == "__main__":
    main()

