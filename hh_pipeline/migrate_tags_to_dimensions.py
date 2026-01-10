#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
现有数据迁移脚本 - 规则映射阶段
从现有字段（title, company, role, tags, processedContent）推断 tagDimensions
"""

import os
import re
from pymongo import MongoClient
from typing import Dict, Any, List, Tuple

# MongoDB 连接
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/offermagnet")

# 技术栈关键词映射（从 tags 中识别）
TECH_KEYWORDS = {
    # 前端
    "React", "Vue", "Angular", "TypeScript", "JavaScript", "JS", "HTML", "CSS", "SASS", "SCSS",
    "Webpack", "Vite", "Next.js", "Nuxt", "Svelte",
    # 后端
    "Node.js", "Python", "Java", "Go", "Golang", "C++", "C#", "PHP", "Ruby", "Rust",
    "Spring", "Django", "Flask", "Express", "FastAPI", "Laravel", "Rails",
    # 数据库
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
    # 算法/ML
    "PyTorch", "TensorFlow", "Keras", "Scikit-learn", "Pandas", "NumPy",
    "Machine Learning", "ML", "Deep Learning", "NLP", "CV", "Computer Vision",
    # 其他
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "Linux"
}

# 地点关键词
LOCATION_KEYWORDS = {
    "北京", "上海", "深圳", "杭州", "广州", "成都", "南京", "武汉", "西安", "苏州",
    "硅谷", "San Francisco", "SF", "Seattle", "New York", "NYC", "London", "伦敦",
    "新加坡", "Singapore", "香港", "Hong Kong", "Tokyo", "东京"
}

# 招聘类型关键词
RECRUIT_TYPE_KEYWORDS = {
    "校招": ["校招", "校园招聘", "应届", "应届生", "new grad", "newgrad"],
    "社招": ["社招", "社会招聘", "experienced", "senior"],
    "暑期实习": ["暑期实习", "summer intern", "summer internship"],
    "日常实习": ["日常实习", "实习", "intern", "internship"]
}

# Role 到 Category 的映射规则
ROLE_TO_CATEGORY = {
    # 研发相关
    "software engineer": "研发",
    "software engineering": "研发",
    "engineer": "研发",
    "developer": "研发",
    "开发": "研发",
    "研发": "研发",
    "前端": "研发",
    "后端": "研发",
    "full stack": "研发",
    "全栈": "研发",
    # 算法相关
    "data scientist": "算法",
    "data science": "算法",
    "data scientist": "算法",
    "machine learning": "算法",
    "ml engineer": "算法",
    "algorithm": "算法",
    "算法": "算法",
    "算法工程师": "算法",
    # 产品相关
    "product manager": "产品",
    "pm": "产品",
    "产品": "产品",
    "产品经理": "产品"
}

# Role 到 SubRole 的映射规则
ROLE_TO_SUBROLE = {
    # 前端
    "frontend": "前端",
    "front-end": "前端",
    "前端": "前端",
    "前端工程师": "前端",
    "web developer": "前端",
    # 后端
    "backend": "后端",
    "back-end": "后端",
    "后端": "后端",
    "后端工程师": "后端",
    "server": "后端",
    # 移动端
    "mobile": "移动端",
    "ios": "移动端",
    "android": "移动端",
    "移动端": "移动端",
    # 算法
    "machine learning": "机器学习",
    "ml": "机器学习",
    "cv": "CV",
    "computer vision": "CV",
    "nlp": "NLP",
    "natural language processing": "NLP",
    "recommendation": "推荐系统",
    "recommendation system": "推荐系统",
    "llm": "大模型/LLM",
    "large language model": "大模型/LLM"
}


def extract_technologies(tags: List[str], title: str, content: str) -> List[str]:
    """从 tags、title、content 中提取技术栈"""
    found_techs = set()
    all_text = " ".join(tags) + " " + title + " " + (content or "")[:500]
    
    for tech in TECH_KEYWORDS:
        # 检查 tags 中是否包含
        for tag in tags:
            if tech.lower() in tag.lower() or tag.lower() in tech.lower():
                found_techs.add(tech)
        # 检查 title 和 content
        if tech.lower() in all_text.lower():
            found_techs.add(tech)
    
    return sorted(list(found_techs))


def extract_location(tags: List[str], title: str) -> str:
    """从 tags 和 title 中提取地点"""
    all_text = " ".join(tags) + " " + title
    
    for location in LOCATION_KEYWORDS:
        if location in all_text:
            return location
    
    return ""


def extract_recruit_type(tags: List[str], title: str) -> str:
    """从 tags 和 title 中提取招聘类型"""
    all_text = " ".join(tags) + " " + title
    
    for recruit_type, keywords in RECRUIT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in all_text.lower():
                return recruit_type
    
    return "其他"


def infer_category(role: str) -> str:
    """从 role 推断 category"""
    role_lower = role.lower()
    
    for keyword, category in ROLE_TO_CATEGORY.items():
        if keyword.lower() in role_lower:
            return category
    
    return ""


def infer_sub_role(role: str, tags: List[str]) -> str:
    """从 role 和 tags 推断 subRole"""
    role_lower = role.lower()
    all_text = " ".join(tags).lower()
    
    # 先检查 role
    for keyword, sub_role in ROLE_TO_SUBROLE.items():
        if keyword.lower() in role_lower:
            return sub_role
    
    # 再检查 tags
    for keyword, sub_role in ROLE_TO_SUBROLE.items():
        if keyword.lower() in all_text:
            return sub_role
    
    return ""


def extract_custom_tags(tags: List[str], technologies: List[str]) -> List[str]:
    """提取自定义标签（排除技术栈和维度标签）"""
    custom = []
    dimension_keywords = set()
    
    # 收集所有维度关键词
    for keywords in [LOCATION_KEYWORDS, RECRUIT_TYPE_KEYWORDS]:
        for kw in keywords:
            dimension_keywords.add(kw.lower())
    
    for tag in tags:
        tag_lower = tag.lower()
        # 排除技术栈
        is_tech = any(tech.lower() in tag_lower or tag_lower in tech.lower() for tech in technologies)
        # 排除维度关键词
        is_dimension = tag_lower in dimension_keywords
        # 排除公司名称（通常已经在 company 字段中）
        # 排除招聘类型关键词
        is_recruit = any(kw in tag_lower for keywords in RECRUIT_TYPE_KEYWORDS.values() for kw in keywords)
        
        if not (is_tech or is_dimension or is_recruit):
            custom.append(tag)
    
    return custom[:5]  # 限制最多5个自定义标签


def infer_tag_dimensions(post: Dict[str, Any]) -> Dict[str, Any]:
    """从现有字段推断 tagDimensions"""
    tags = post.get("tags", [])
    title = post.get("title", "")
    role = post.get("role", "")
    company = post.get("company", "")
    processed_content = post.get("processedContent", "") or post.get("originalContent", "")
    
    # 提取各个维度
    technologies = extract_technologies(tags, title, processed_content)
    location = extract_location(tags, title)
    recruit_type = extract_recruit_type(tags, title)
    category = infer_category(role)
    sub_role = infer_sub_role(role, tags)
    custom = extract_custom_tags(tags, technologies)
    
    return {
        "technologies": technologies,
        "recruitType": recruit_type,
        "location": location,
        "category": category,
        "subRole": sub_role,
        "custom": custom
    }


def migrate_posts(collection, dry_run: bool = False) -> Tuple[int, int, int]:
    """迁移所有帖子"""
    # 查找没有 tagDimensions 或 tagDimensions 为空的数据
    query = {
        "$or": [
            {"tagDimensions": {"$exists": False}},
            {"tagDimensions": None},
            {"tagDimensions.technologies": {"$exists": False}},
            {"tagDimensions.technologies": []}
        ]
    }
    
    posts = list(collection.find(query))
    total = len(posts)
    print(f"\n📊 找到 {total} 条需要迁移的数据")
    
    if total == 0:
        print("✅ 所有数据已迁移完成")
        return 0, 0, 0
    
    updated = 0
    skipped = 0
    failed = 0
    
    for i, post in enumerate(posts, 1):
        try:
            # 推断 tagDimensions
            tag_dimensions = infer_tag_dimensions(post)
            
            # 检查是否有有效数据
            has_data = (
                tag_dimensions["technologies"] or
                tag_dimensions["location"] or
                tag_dimensions["recruitType"] != "其他" or
                tag_dimensions["category"] or
                tag_dimensions["subRole"] or
                tag_dimensions["custom"]
            )
            
            if not has_data:
                skipped += 1
                if i % 50 == 0:
                    print(f"   [{i}/{total}] ⏭️  跳过（无法推断）")
                continue
            
            if dry_run:
                print(f"   [{i}/{total}] 📝 将更新: {post.get('title', '')[:50]}")
                print(f"      tagDimensions: {tag_dimensions}")
            else:
                # 更新数据库
                collection.update_one(
                    {"_id": post["_id"]},
                    {"$set": {"tagDimensions": tag_dimensions}}
                )
                updated += 1
            
            if i % 50 == 0:
                print(f"   [{i}/{total}] ✅ 已处理 (更新: {updated}, 跳过: {skipped}, 失败: {failed})")
        
        except Exception as e:
            failed += 1
            print(f"   [{i}/{total}] ❌ 处理失败: {e}")
            if failed <= 5:
                print(f"      错误详情: {post.get('title', '')[:50]}")
    
    return updated, skipped, failed


def main():
    import argparse
    parser = argparse.ArgumentParser(description="迁移现有数据到 tagDimensions（规则映射）")
    parser.add_argument("--dry-run", action="store_true", help="仅预览，不实际更新数据库")
    parser.add_argument("--mongo-uri", default=MONGO_URI, help="MongoDB 连接字符串")
    args = parser.parse_args()
    
    print("🔗 连接 MongoDB...")
    try:
        client = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()  # 测试连接
        db = client.get_database()
        collection = db.posts
        print("✅ MongoDB 连接成功")
    except Exception as e:
        print(f"❌ MongoDB 连接失败: {e}")
        return
    
    if args.dry_run:
        print("\n🔍 预览模式（不会实际更新数据库）")
    
    print("\n🚀 开始规则映射迁移...")
    updated, skipped, failed = migrate_posts(collection, dry_run=args.dry_run)
    
    print(f"\n📊 迁移完成:")
    print(f"   ✅ 更新: {updated} 条")
    print(f"   ⏭️  跳过: {skipped} 条（无法推断）")
    print(f"   ❌ 失败: {failed} 条")
    
    if args.dry_run:
        print("\n💡 使用 --dry-run=false 或移除 --dry-run 参数来实际执行更新")
    else:
        # 统计迁移后的数据
        total_with_dims = collection.count_documents({"tagDimensions": {"$exists": True}})
        total_posts = collection.count_documents({})
        print(f"\n📈 数据库统计:")
        print(f"   总帖子数: {total_posts}")
        print(f"   有 tagDimensions: {total_with_dims}")
        print(f"   覆盖率: {total_with_dims/total_posts*100:.1f}%" if total_posts > 0 else "   覆盖率: 0%")


if __name__ == "__main__":
    main()

