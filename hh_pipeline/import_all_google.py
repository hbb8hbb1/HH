#!/usr/bin/env python3
# 批量导入所有未导入的Google JSON文件
import json
import sys
import os
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    print("❌ 需要安装 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://henghuang0729_db_user:gzoOfVrsmUhXgkk1@cluster0.px3nvle.mongodb.net/offermagnet?retryWrites=true&w=majority")

def main():
    print("🔗 连接MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.offermagnet
        posts_collection = db.posts
        
        client.admin.command('ping')
        print("✅ MongoDB连接成功")
    except Exception as e:
        print(f"❌ MongoDB连接失败: {e}")
        return
    
    final_dir = Path("out/final")
    if not final_dir.exists():
        print("❌ out/final/ 目录不存在")
        return
    
    json_files = list(final_dir.glob("*.json"))
    if not json_files:
        print("❌ 未找到JSON文件")
        return
    
    print(f"\n📁 找到 {len(json_files)} 个JSON文件")
    
    # 获取数据库中已有的Google帖子（基于title和company）
    print("🔍 检查数据库中已有的Google帖子...")
    imported_keys = set()
    for post in posts_collection.find({"company": "Google"}, {"title": 1, "company": 1}):
        title = post.get("title", "").strip()
        company = post.get("company", "").strip()
        if title and company:
            imported_keys.add((title, company))
    
    print(f"   数据库中已有: {len(imported_keys)} 个Google帖子")
    
    # 找出未导入的文件
    to_import = []
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                payload = json.load(f)
            
            company = payload.get("company", "").strip()
            if company != "Google":
                continue
            
            title = payload.get("title", "").strip()
            if not title:
                continue
            
            key = (title, company)
            if key not in imported_keys:
                to_import.append((json_file, payload))
        except Exception as e:
            print(f"   ⚠️  读取失败 {json_file.name}: {e}")
            continue
    
    print(f"\n📤 需要导入: {len(to_import)} 个Google JSON文件")
    
    if not to_import:
        print("✅ 所有文件都已导入！")
        return
    
    # 批量导入
    success = 0
    failed = 0
    skipped = 0
    
    for i, (json_file, payload) in enumerate(to_import, 1):
        try:
            # 再次检查是否已存在（防止并发导入）
            existing = posts_collection.find_one({
                "title": payload.get("title"),
                "company": payload.get("company")
            })
            
            if existing:
                skipped += 1
                if i % 20 == 0:
                    print(f"   [{i}/{len(to_import)}] ⏭️  已存在，跳过")
                continue
            
            # 添加必要字段
            payload["authorId"] = None
            payload["authorName"] = "System Importer"
            payload["authorIsPro"] = False
            
            # 插入到MongoDB
            result = posts_collection.insert_one(payload)
            success += 1
            
            if i % 10 == 0 or i == len(to_import):
                print(f"   [{i}/{len(to_import)}] ✅ 导入成功 (已导入: {success}, 跳过: {skipped}, 失败: {failed})")
        except Exception as e:
            failed += 1
            if i % 10 == 0 or failed <= 5:
                print(f"   [{i}/{len(to_import)}] ❌ 导入失败: {e}")
    
    print(f"\n📊 导入完成:")
    print(f"   ✅ 成功: {success} 个")
    print(f"   ⏭️  跳过: {skipped} 个（已存在）")
    print(f"   ❌ 失败: {failed} 个")
    
    # 验证
    google_count = posts_collection.count_documents({"company": "Google"})
    print(f"\n✅ 数据库中Google帖子总数: {google_count}")

if __name__ == "__main__":
    main()
