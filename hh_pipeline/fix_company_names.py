#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复数据库中的公司名称
将各种谐音和别名统一规范化为标准公司名称

使用方法:
    python3 fix_company_names.py [--dry-run] [--verbose]

示例:
    # 预览模式（不实际修改）
    python3 fix_company_names.py --dry-run

    # 实际执行修复
    python3 fix_company_names.py --verbose
"""

import os
import sys
import argparse
from pymongo import MongoClient
from typing import Dict, List, Tuple

# 从 mongodb_utils 导入连接函数
try:
    from mongodb_utils import connect_mongo, DB_NAME, COLLECTION_NAME
except ImportError:
    # 如果导入失败，使用默认配置
    MONGO_URI = os.environ.get(
        "MONGO_URI",
        "mongodb+srv://henghuang0729_db_user:gzoOfVrsmUhXgkk1@cluster0.px3nvle.mongodb.net/offermagnet?retryWrites=true&w=majority"
    )
    DB_NAME = "offermagnet"
    COLLECTION_NAME = "posts"
    
    def connect_mongo(verbose: bool = False):
        try:
            if verbose:
                print(f"🔗 连接 MongoDB: {MONGO_URI}")
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            db = client[DB_NAME]
            if verbose:
                print(f"✅ MongoDB 连接成功: {db.name}")
            return client, db
        except Exception as e:
            if verbose:
                print(f"❌ MongoDB 连接失败: {e}")
            return None, None

# 公司名称别名映射（与 config/tags.json 保持一致）
COMPANY_ALIASES: Dict[str, str] = {
    "谷歌": "Google",
    "狗家": "Google",
    "G家": "Google",
    "g家": "Google",
    "骨骼": "Google",
    "狗狗家": "Google",
    "狗云": "Google",
    "GOOGLE": "Google",
    "goog": "Google",
    "GooGle": "Google",
    "脸书": "Meta",
    "Facebook": "Meta",
    "FB": "Meta",
    "fb": "Meta",
    "买它": "Meta",
    "买他": "Meta",
    "buyit": "Meta",
    "BuyIt": "Meta",
    "BUYIT": "Meta",
    "META": "Meta",
    "meta": "Meta",
}

# 标准公司名称列表
STANDARD_COMPANIES = [
    "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix",
    "ByteDance", "Alibaba", "Tencent", "Nvidia", "OpenAI", "Stripe",
    "Airbnb", "Uber", "LinkedIn"
]


def normalize_company_name(company: str) -> str:
    """
    规范化公司名称
    返回标准公司名称，如果无法映射则返回原值
    """
    if not company or not isinstance(company, str):
        return company
    
    company_trimmed = company.strip()
    if not company_trimmed:
        return company
    
    company_lower = company_trimmed.lower()
    
    # 1. 精确匹配别名
    for alias, standard in COMPANY_ALIASES.items():
        if alias.lower() == company_lower:
            return standard
    
    # 2. 检查是否是标准公司名称（忽略大小写）
    for standard_company in STANDARD_COMPANIES:
        if standard_company.lower() == company_lower:
            return standard_company
    
    # 3. 部分匹配（按长度排序，优先匹配较长的别名）
    sorted_aliases = sorted(COMPANY_ALIASES.items(), key=lambda x: len(x[0]), reverse=True)
    for alias, standard in sorted_aliases:
        if alias.lower() in company_lower or company_lower in alias.lower():
            return standard
    
    # 无法映射，返回原值
    return company


def find_posts_with_wrong_company_names(db) -> List[Tuple[Dict, str, str]]:
    """
    查找所有需要修复的帖子
    返回: [(post, old_company, new_company), ...]
    """
    posts_collection = db[COLLECTION_NAME]
    posts_to_fix = []
    
    # 获取所有帖子
    all_posts = posts_collection.find({"company": {"$exists": True, "$ne": None, "$ne": ""}})
    
    for post in all_posts:
        old_company = post.get("company", "")
        if not old_company:
            continue
        
        new_company = normalize_company_name(old_company)
        
        # 如果规范化后的名称与原名称不同，需要修复
        if new_company != old_company:
            posts_to_fix.append((post, old_company, new_company))
    
    return posts_to_fix


def fix_company_names(dry_run: bool = True, verbose: bool = False) -> None:
    """
    批量修复公司名称
    """
    client, db = connect_mongo(verbose=verbose)
    if client is None or db is None:
        print("❌ 无法连接到 MongoDB")
        sys.exit(1)
    
    try:
        posts_collection = db[COLLECTION_NAME]
        
        print("\n🔍 查找需要修复的帖子...")
        posts_to_fix = find_posts_with_wrong_company_names(db)
        
        if not posts_to_fix:
            print("✅ 没有找到需要修复的帖子")
            return
        
        print(f"\n📊 找到 {len(posts_to_fix)} 个需要修复的帖子\n")
        
        # 统计修复情况
        fix_stats: Dict[str, Dict[str, int]] = {}
        
        # 显示前10个示例
        print("📋 修复示例（前10个）：")
        for i, (post, old_company, new_company) in enumerate(posts_to_fix[:10], 1):
            print(f"   {i}. ID: {post['_id']}")
            print(f"      标题: {post.get('title', 'N/A')[:50]}...")
            print(f"      公司: '{old_company}' → '{new_company}'")
            
            # 统计
            if old_company not in fix_stats:
                fix_stats[old_company] = {}
            if new_company not in fix_stats[old_company]:
                fix_stats[old_company][new_company] = 0
            fix_stats[old_company][new_company] += 1
        
        if len(posts_to_fix) > 10:
            print(f"   ... 还有 {len(posts_to_fix) - 10} 个帖子需要修复\n")
        
        # 显示统计信息
        print("\n📊 修复统计：")
        for old_company, targets in sorted(fix_stats.items()):
            for new_company, count in targets.items():
                print(f"   '{old_company}' → '{new_company}': {count} 个帖子")
        
        if dry_run:
            print("\n⚠️  这是预览模式（--dry-run），不会实际修改数据库")
            print("   要实际执行修复，请运行: python3 fix_company_names.py")
            return
        
        # 确认执行
        print(f"\n⚠️  即将修复 {len(posts_to_fix)} 个帖子的公司名称")
        response = input("   确认执行？(yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            print("❌ 已取消")
            return
        
        # 执行修复
        print("\n🔧 开始修复...")
        fixed_count = 0
        error_count = 0
        
        for post, old_company, new_company in posts_to_fix:
            try:
                result = posts_collection.update_one(
                    {"_id": post["_id"]},
                    {"$set": {"company": new_company}}
                )
                if result.modified_count > 0:
                    fixed_count += 1
                    if verbose:
                        print(f"   ✅ 已修复: {post['_id']} ({old_company} → {new_company})")
            except Exception as e:
                error_count += 1
                print(f"   ❌ 修复失败: {post['_id']} - {e}")
        
        print(f"\n✅ 修复完成！")
        print(f"   成功: {fixed_count} 个")
        print(f"   失败: {error_count} 个")
        
        # 验证修复结果
        print("\n🔍 验证修复结果...")
        remaining = find_posts_with_wrong_company_names(db)
        if remaining:
            print(f"   ⚠️  仍有 {len(remaining)} 个帖子需要修复")
        else:
            print("   ✅ 所有公司名称已规范化")
        
    except Exception as e:
        print(f"❌ 修复过程中出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="批量修复数据库中的公司名称")
    parser.add_argument("--dry-run", action="store_true", help="预览模式，不实际修改数据库")
    parser.add_argument("--verbose", action="store_true", help="显示详细信息")
    
    args = parser.parse_args()
    
    fix_company_names(dry_run=args.dry_run, verbose=args.verbose)


if __name__ == "__main__":
    main()


