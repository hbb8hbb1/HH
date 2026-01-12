#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修正数据库中的公司标签错误
将标题/内容中提到Google相关关键词但公司标记为Meta的帖子修正为Google
"""

import os
import re
from typing import List, Dict

# 导入工具模块
from mongodb_utils import get_mongo_collection, COLLECTION_NAME

# Google相关关键词（用于识别）
GOOGLE_KEYWORDS = [
    "狗家", "谷歌", "Google", "google", "G家", "g家", "骨骼", "狗狗家", "狗云",
    "goog", "GOOGLE", "GooGle"
]

# Meta相关关键词（用于识别）
META_KEYWORDS = [
    "Meta", "meta", "Facebook", "facebook", "FB", "fb", "脸书", "META",
    "买它", "买他", "buyit", "BuyIt", "BUYIT"
]

def detect_company_from_content(title: str, content: str = "") -> str:
    """
    从标题和内容中检测公司名称
    返回: "Google", "Meta", 或 None
    """
    text = f"{title} {content}".lower()
    
    # 检查Google关键词
    google_matches = sum(1 for keyword in GOOGLE_KEYWORDS if keyword.lower() in text)
    meta_matches = sum(1 for keyword in META_KEYWORDS if keyword.lower() in text)
    
    # 如果明确提到Google相关关键词，返回Google
    if google_matches > 0:
        return "Google"
    
    # 如果明确提到Meta相关关键词，返回Meta
    if meta_matches > 0:
        return "Meta"
    
    return None

def fix_title_company_display(title: str, correct_company: str) -> str:
    """
    修正title中的公司显示
    例如："狗家Data Scientist" -> "Google | Data Scientist"
    """
    # 如果title已经包含正确的公司格式，不修改
    if f"{correct_company} |" in title or title.startswith(correct_company):
        return title
    
    # 替换常见的错误公司显示
    replacements = {
        "狗家": "Google",
        "狗狗家": "Google",
        "骨骼": "Google",
        "G家": "Google",
        "g家": "Google",
        "脸书": "Meta",
        "Facebook": "Meta",
        "FB": "Meta"
    }
    
    new_title = title
    for wrong, correct in replacements.items():
        if wrong in new_title and correct_company == correct:
            # 替换开头的公司名
            if new_title.startswith(wrong):
                new_title = new_title.replace(wrong, correct_company, 1)
            # 或者替换 "公司名 |" 格式
            pattern = rf"{re.escape(wrong)}\s*\|\s*"
            new_title = re.sub(pattern, f"{correct_company} | ", new_title, flags=re.IGNORECASE)
    
    return new_title

def main():
    """主函数"""
    print("🔗 连接 MongoDB...")
    client, posts = get_mongo_collection()
    if client is None or posts is None:
        print("❌ MongoDB 连接失败")
        return
    print("✅ MongoDB 连接成功\n")
    
    # 查找需要修正的帖子
    print("🔍 查找需要修正的帖子...")
    
    # 策略1: 公司标记为Meta但内容中提到Google关键词
    query1 = {
        "company": "Meta",
        "$or": [
            {"title": {"$regex": "|".join(GOOGLE_KEYWORDS), "$options": "i"}},
            {"processedContent": {"$regex": "|".join(GOOGLE_KEYWORDS), "$options": "i"}},
            {"originalContent": {"$regex": "|".join(GOOGLE_KEYWORDS), "$options": "i"}}
        ]
    }
    
    # 策略2: 公司标记为Google但内容中提到Meta关键词（较少见，但也检查）
    query2 = {
        "company": "Google",
        "$or": [
            {"title": {"$regex": "|".join(META_KEYWORDS), "$options": "i"}},
            {"processedContent": {"$regex": "|".join(META_KEYWORDS), "$options": "i"}},
            {"originalContent": {"$regex": "|".join(META_KEYWORDS), "$options": "i"}}
        ],
        "$and": [
            {"title": {"$not": {"$regex": "|".join(GOOGLE_KEYWORDS), "$options": "i"}}},
            {"processedContent": {"$not": {"$regex": "|".join(GOOGLE_KEYWORDS), "$options": "i"}}}
        ]
    }
    
    # 查找需要修正的帖子
    posts_to_fix_meta_to_google = list(posts.find(query1))
    posts_to_fix_google_to_meta = list(posts.find(query2))
    
    print(f"📊 找到需要修正的帖子：")
    print(f"   Meta -> Google: {len(posts_to_fix_meta_to_google)} 个")
    print(f"   Google -> Meta: {len(posts_to_fix_google_to_meta)} 个")
    
    if len(posts_to_fix_meta_to_google) == 0 and len(posts_to_fix_google_to_meta) == 0:
        print("\n✅ 没有需要修正的帖子")
        client.close()
        return
    
    # 显示示例
    if posts_to_fix_meta_to_google:
        print("\n📋 Meta -> Google 示例（前5个）：")
        for i, post in enumerate(posts_to_fix_meta_to_google[:5], 1):
            print(f"   {i}. {post.get('title', '')[:60]}...")
            print(f"      当前公司: {post.get('company')}")
    
    # 确认是否继续
    try:
        response = input(f"\n是否继续修正？(y/n): ").strip().lower()
        if response != 'y':
            print("❌ 修正已取消")
            client.close()
            return
    except EOFError:
        # 非交互模式，自动继续
        print("⚠️  非交互模式，自动继续修正...")
    
    # 修正 Meta -> Google
    fixed_count = 0
    updated_titles = 0
    
    print(f"\n🔧 开始修正...\n")
    
    for post in posts_to_fix_meta_to_google:
        try:
            title = post.get("title", "")
            content = post.get("processedContent", "") or post.get("originalContent", "")
            
            # 检测正确的公司
            detected = detect_company_from_content(title, content)
            if detected == "Google":
                # 修正公司
                update_data = {"company": "Google"}
                
                # 修正title中的公司显示
                new_title = fix_title_company_display(title, "Google")
                if new_title != title:
                    update_data["title"] = new_title
                    updated_titles += 1
                
                # 更新数据库
                posts.update_one(
                    {"_id": post["_id"]},
                    {"$set": update_data}
                )
                fixed_count += 1
                
                if fixed_count % 10 == 0:
                    print(f"   ✅ 已修正 {fixed_count} 个帖子...")
        except Exception as e:
            print(f"   ❌ 修正失败 (ID: {post.get('_id')}): {e}")
    
    # 修正 Google -> Meta（较少见）
    for post in posts_to_fix_google_to_meta:
        try:
            title = post.get("title", "")
            content = post.get("processedContent", "") or post.get("originalContent", "")
            
            detected = detect_company_from_content(title, content)
            if detected == "Meta":
                update_data = {"company": "Meta"}
                
                new_title = fix_title_company_display(title, "Meta")
                if new_title != title:
                    update_data["title"] = new_title
                    updated_titles += 1
                
                posts.update_one(
                    {"_id": post["_id"]},
                    {"$set": update_data}
                )
                fixed_count += 1
        except Exception as e:
            print(f"   ❌ 修正失败 (ID: {post.get('_id')}): {e}")
    
    print(f"\n{'='*50}")
    print(f"📊 修正完成统计：")
    print(f"   ✅ 修正公司标签: {fixed_count} 个")
    print(f"   📝 同时修正title: {updated_titles} 个")
    
    # 验证结果
    meta_count = posts.count_documents({"company": "Meta"})
    google_count = posts.count_documents({"company": "Google"})
    
    print(f"\n📊 数据库当前状态：")
    print(f"   Meta 帖子数: {meta_count}")
    print(f"   Google 帖子数: {google_count}")
    
    client.close()
    print("\n✅ 修正完成！")

if __name__ == "__main__":
    main()

