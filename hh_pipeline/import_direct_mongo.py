#!/usr/bin/env python3
# 直接导入JSON到MongoDB（绕过API）
import json
import sys
import os
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    print("❌ 需要安装 pymongo: pip install pymongo")
    sys.exit(1)

# 尝试多个MongoDB连接字符串
MONGO_URIS = [
    "mongodb://127.0.0.1:27017/offermagnet",
    "mongodb://localhost:27017/offermagnet",
    os.environ.get("MONGO_URI", ""),
    "mongodb://127.0.0.1:27017/offermagnet?directConnection=true"
]

def connect_mongo():
    for uri in MONGO_URIS:
        if not uri:
            continue
        try:
            print(f"🔗 尝试连接: {uri.split('@')[-1] if '@' in uri else uri}")
            client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            client.admin.command('ping')
            db = client.get_database()
            print(f"✅ MongoDB连接成功: {db.name}")
            return client, db
        except Exception as e:
            print(f"   ❌ 失败: {str(e)[:50]}")
            continue
    return None, None

def main():
    client, db = connect_mongo()
    if client is None or db is None:
        print("\n❌ 无法连接到MongoDB")
        print("   请确保MongoDB正在运行，或设置正确的MONGO_URI环境变量")
        return
    
    posts_collection = db.posts
    
    final_dir = Path("out/final")
    if not final_dir.exists():
        print("❌ out/final/ 目录不存在")
        return
    
    json_files = list(final_dir.glob("*.json"))
    if not json_files:
        print("❌ 未找到JSON文件")
        return
    
    print(f"\n📁 找到 {len(json_files)} 个JSON文件")
    
    # 导入文件
    success = 0
    failed = 0
    skipped = 0
    
    for i, json_file in enumerate(json_files, 1):
        print(f"\n[{i}/{len(json_files)}] 导入: {json_file.name}")
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                payload = json.load(f)
            
            # 检查是否已存在（基于title和company）
            existing = posts_collection.find_one({
                "title": payload.get("title"),
                "company": payload.get("company")
            })
            
            if existing:
                print(f"   ⏭️  已存在，跳过")
                skipped += 1
                continue
            
            # 添加必要字段
            payload["authorId"] = None  # 匿名导入
            payload["authorName"] = "System Importer"
            payload["authorIsPro"] = False
            
            # 插入到MongoDB
            result = posts_collection.insert_one(payload)
            print(f"   ✅ 导入成功 (ID: {str(result.inserted_id)[:8]}...)")
            success += 1
        except Exception as e:
            print(f"   ❌ 导入失败: {e}")
            failed += 1
    
    print(f"\n📊 导入完成:")
    print(f"   ✅ 成功: {success} 个")
    print(f"   ⏭️  跳过: {skipped} 个（已存在）")
    print(f"   ❌ 失败: {failed} 个")
    
    # 验证
    google_count = posts_collection.count_documents({"company": "Google"})
    print(f"\n✅ 数据库中Google帖子总数: {google_count}")

if __name__ == "__main__":
    main()
