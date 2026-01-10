#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
现有数据迁移脚本 - 方案三（混合方案）

功能：
1. 阶段1：规则映射 - 从现有字段（title, tags, role, company）推断 tagDimensions
2. 阶段2：AI补充 - 对不确定的数据使用AI提取 tagDimensions
3. 统计和报告 - 显示迁移进度和质量

使用方法：
    # 只运行规则映射（快速）
    python migrate_existing_data.py --mode rules-only
    
    # 运行规则映射 + AI补充（完整）
    python migrate_existing_data.py --mode full
    
    # 只运行AI补充（对规则映射后仍有缺失的数据）
    python migrate_existing_data.py --mode ai-only
"""

import argparse
import os
import re
import sys
from typing import Dict, Any, List, Optional, Tuple
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# 导入 pipeline 的 AI 处理逻辑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from pipeline import call_qwen_api, call_gemini_api
    # 获取AI配置
    QWEN_API_KEY = os.environ.get("QWEN_API_KEY")
    GEMINI_API_KEY = os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY")
    AI_TYPE = "qwen" if QWEN_API_KEY else ("gemini" if GEMINI_API_KEY else None)
except ImportError:
    print("⚠️  无法导入pipeline模块，AI补充功能将不可用")
    AI_TYPE = None

# ==================== 配置 ====================

# MongoDB 连接
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/offermagnet")
DB_NAME = "offermagnet"
COLLECTION_NAME = "posts"

# 地点关键词映射
LOCATION_KEYWORDS = {
    "北京": ["北京", "beijing", "bj"],
    "上海": ["上海", "shanghai", "sh"],
    "深圳": ["深圳", "shenzhen", "sz"],
    "杭州": ["杭州", "hangzhou", "hz"],
    "广州": ["广州", "guangzhou", "gz"],
    "成都": ["成都", "chengdu", "cd"],
    "新加坡": ["新加坡", "singapore", "sg"],
    "硅谷": ["硅谷", "silicon valley", "sv", "san francisco", "sf", "bay area"],
    "纽约": ["纽约", "new york", "ny"],
    "伦敦": ["伦敦", "london"],
    "香港": ["香港", "hong kong", "hk"]
}

# 招聘类型关键词映射
RECRUIT_TYPE_KEYWORDS = {
    "校招": ["校招", "校园招聘", "应届", "new grad", "campus", "应届生"],
    "社招": ["社招", "社会招聘", "experienced", "社招"],
    "暑期实习": ["暑期实习", "summer intern", "summer internship"],
    "日常实习": ["日常实习", "intern", "internship", "实习"]
}

# 技术栈关键词（用于从tags中提取）
TECH_KEYWORDS = [
    "React", "Vue", "Angular", "TypeScript", "JavaScript", "Python", "Java", "Go", "C++", "C#",
    "Node.js", "Spring", "Django", "Flask", "PyTorch", "TensorFlow", "Keras", "Scikit-learn",
    "MongoDB", "MySQL", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes",
    "AWS", "Azure", "GCP", "Linux", "Git", "CI/CD"
]

# 部门类别映射（从role推断）
CATEGORY_KEYWORDS = {
    "研发": ["engineer", "developer", "开发", "工程师", "software", "研发"],
    "算法": ["algorithm", "ml", "machine learning", "ai", "算法", "机器学习", "data scientist", "数据科学"],
    "产品": ["product", "pm", "产品", "product manager"],
    "设计": ["design", "designer", "设计", "ui", "ux"],
    "运营": ["operation", "运营", "operation manager"],
    "市场": ["marketing", "市场", "marketing manager"]
}

# 子角色映射（从role或tags推断）
SUBROLE_KEYWORDS = {
    "前端": ["frontend", "前端", "react", "vue", "angular", "web"],
    "后端": ["backend", "后端", "server", "api", "java", "python", "go"],
    "移动端": ["mobile", "ios", "android", "移动", "app"],
    "全栈": ["fullstack", "全栈", "full stack"],
    "测试": ["test", "qa", "测试", "quality"],
    "运维": ["devops", "sre", "运维", "infrastructure"],
    "大数据": ["big data", "大数据", "hadoop", "spark"],
    "架构": ["architect", "架构", "system design"],
    "系统设计": ["system design", "系统设计", "distributed"],
    "机器学习": ["machine learning", "ml", "机器学习", "deep learning"],
    "CV": ["cv", "computer vision", "计算机视觉", "图像"],
    "NLP": ["nlp", "natural language", "自然语言", "文本"],
    "推荐系统": ["recommendation", "推荐", "recommender"],
    "强化学习": ["reinforcement learning", "强化学习", "rl"],
    "大模型/LLM": ["llm", "large language model", "大模型", "gpt", "bert"]
}

# ==================== 规则映射逻辑 ====================

def extract_location(title: str, tags: List[str]) -> str:
    """从title和tags中提取地点"""
    text = (title + " " + " ".join(tags)).lower()
    
    for location, keywords in LOCATION_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                return location
    
    return ""

def extract_recruit_type(title: str, tags: List[str]) -> str:
    """从title和tags中提取招聘类型"""
    text = (title + " " + " ".join(tags)).lower()
    
    # 按优先级检查（校招 > 社招 > 实习）
    for recruit_type, keywords in RECRUIT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                return recruit_type
    
    return "其他"

def extract_technologies(tags: List[str]) -> List[str]:
    """从tags中提取技术栈"""
    technologies = []
    tag_text = " ".join(tags).lower()
    
    for tech in TECH_KEYWORDS:
        if tech.lower() in tag_text:
            technologies.append(tech)
    
    # 去重并保持顺序
    seen = set()
    result = []
    for tech in technologies:
        tech_lower = tech.lower()
        if tech_lower not in seen:
            seen.add(tech_lower)
            result.append(tech)
    
    return result

def extract_category(role: str) -> str:
    """从role中推断部门类别"""
    if not role:
        return ""
    
    role_lower = role.lower()
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in role_lower:
                return category
    
    return ""

def extract_sub_role(role: str, tags: List[str]) -> str:
    """从role和tags中推断子角色"""
    text = (role + " " + " ".join(tags)).lower()
    
    for sub_role, keywords in SUBROLE_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                return sub_role
    
    return ""

def extract_custom_tags(tags: List[str], technologies: List[str]) -> List[str]:
    """提取自定义标签（排除技术栈和维度标签）"""
    custom = []
    tech_lower = [t.lower() for t in technologies]
    
    # 排除技术栈
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower not in tech_lower:
            # 排除维度标签（地点、招聘类型等）
            is_dimension_tag = False
            for location in LOCATION_KEYWORDS.keys():
                if location.lower() in tag_lower or tag_lower in location.lower():
                    is_dimension_tag = True
                    break
            for recruit_type in RECRUIT_TYPE_KEYWORDS.keys():
                if recruit_type.lower() in tag_lower or tag_lower in recruit_type.lower():
                    is_dimension_tag = True
                    break
            
            if not is_dimension_tag:
                custom.append(tag)
    
    return custom[:5]  # 最多保留5个自定义标签

def rule_based_migration(post: Dict[str, Any]) -> Dict[str, Any]:
    """规则映射：从现有字段推断 tagDimensions"""
    title = post.get("title", "")
    tags = post.get("tags", [])
    role = post.get("role", "")
    company = post.get("company", "")
    
    # 提取各个维度
    location = extract_location(title, tags)
    recruit_type = extract_recruit_type(title, tags)
    technologies = extract_technologies(tags)
    category = extract_category(role)
    sub_role = extract_sub_role(role, tags)
    custom = extract_custom_tags(tags, technologies)
    
    # 构建 tagDimensions
    tag_dimensions = {
        "technologies": technologies,
        "recruitType": recruit_type if recruit_type else "其他",
        "location": location,
        "category": category,
        "subRole": sub_role,
        "custom": custom
    }
    
    return tag_dimensions

# ==================== AI补充逻辑 ====================

def build_ai_prompt_for_dimensions(title: str, processed_content: str, existing_dims: Dict[str, Any]) -> str:
    """构建AI提示词，只提取缺失的维度"""
    missing = []
    if not existing_dims.get("category"):
        missing.append("category (部门类别：研发、算法、产品等)")
    if not existing_dims.get("subRole"):
        missing.append("subRole (子角色：前端、后端、机器学习等)")
    if not existing_dims.get("location"):
        missing.append("location (地点：北京、上海、硅谷等)")
    if not existing_dims.get("recruitType") or existing_dims.get("recruitType") == "其他":
        missing.append("recruitType (招聘类型：校招、社招、暑期实习、日常实习)")
    
    if not missing:
        return None  # 没有缺失的维度，不需要AI处理
    
    return f"""你是一位专业的数据标注员。请从以下面经内容中提取缺失的维度信息。

标题：{title}

内容（前2000字）：
{processed_content[:2000]}

当前已有的 tagDimensions：
{existing_dims}

请只提取以下缺失的维度（如果无法确定，使用空字符串或默认值）：
{', '.join(missing)}

返回 JSON 格式，只包含缺失的维度字段，例如：
{{
  "category": "研发",
  "subRole": "前端",
  "location": "北京",
  "recruitType": "校招"
}}

只返回 JSON，不要其他文字。"""

def ai_supplement_dimensions(post: Dict[str, Any], existing_dims: Dict[str, Any]) -> Dict[str, Any]:
    """使用AI补充缺失的维度"""
    if not AI_TYPE:
        return existing_dims  # AI未配置
    
    title = post.get("title", "")
    processed_content = post.get("processedContent", "")
    
    if not processed_content or len(processed_content) < 50:
        return existing_dims  # 没有内容，无法AI处理
    
    prompt = build_ai_prompt_for_dimensions(title, processed_content, existing_dims)
    if not prompt:
        return existing_dims  # 没有缺失的维度
    
    try:
        if AI_TYPE == "qwen":
            result = call_qwen_api(prompt)
        elif AI_TYPE == "gemini":
            result = call_gemini_api(prompt)
        else:
            return existing_dims
        
        # 合并AI结果到现有维度
        updated_dims = existing_dims.copy()
        for key, value in result.items():
            if key in updated_dims:
                # 只更新空值或默认值
                if not updated_dims[key] or updated_dims[key] == "其他":
                    if value:  # AI返回了有效值
                        updated_dims[key] = value
        
        return updated_dims
    except Exception as e:
        print(f"⚠️  AI处理失败: {e}")
        return existing_dims

# ==================== 主流程 ====================

def migrate_posts(mode: str = "full", batch_size: int = 100):
    """迁移帖子数据"""
    print(f"🔗 连接MongoDB: {MONGO_URI}")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info()  # 测试连接
        db = client[DB_NAME]
        posts_collection = db[COLLECTION_NAME]
        print("✅ MongoDB连接成功")
    except ConnectionFailure as e:
        print(f"❌ MongoDB连接失败: {e}")
        return
    
    # 查询需要迁移的数据（没有tagDimensions或tagDimensions为空）
    query = {
        "$or": [
            {"tagDimensions": {"$exists": False}},
            {"tagDimensions": None},
            {"tagDimensions": {}}
        ]
    }
    
    total_count = posts_collection.count_documents(query)
    print(f"\n📊 找到 {total_count} 条需要迁移的数据")
    
    if total_count == 0:
        print("✅ 所有数据已迁移完成")
        return
    
    # 统计
    stats = {
        "total": total_count,
        "rules_migrated": 0,
        "ai_supplemented": 0,
        "skipped": 0,
        "failed": 0
    }
    
    # 批量处理
    cursor = posts_collection.find(query).batch_size(batch_size)
    
    for i, post in enumerate(cursor, 1):
        try:
            post_id = post.get("_id")
            
            # 阶段1：规则映射
            if mode in ["full", "rules-only"]:
                tag_dimensions = rule_based_migration(post)
                stats["rules_migrated"] += 1
            else:
                # ai-only模式：先获取现有的tagDimensions（如果有）
                tag_dimensions = post.get("tagDimensions", {})
                if not tag_dimensions:
                    tag_dimensions = {
                        "technologies": [],
                        "recruitType": "其他",
                        "location": "",
                        "category": "",
                        "subRole": "",
                        "custom": []
                    }
            
            # 阶段2：AI补充（如果需要）
            if mode in ["full", "ai-only"]:
                # 检查是否有缺失的维度
                needs_ai = (
                    not tag_dimensions.get("category") or
                    not tag_dimensions.get("subRole") or
                    not tag_dimensions.get("location") or
                    tag_dimensions.get("recruitType") == "其他"
                )
                
                if needs_ai:
                    tag_dimensions = ai_supplement_dimensions(post, tag_dimensions)
                    stats["ai_supplemented"] += 1
            
            # 更新数据库
            posts_collection.update_one(
                {"_id": post_id},
                {"$set": {"tagDimensions": tag_dimensions}}
            )
            
            # 进度显示
            if i % 10 == 0 or i == total_count:
                print(f"  [{i}/{total_count}] ✅ 已迁移 (规则: {stats['rules_migrated']}, AI: {stats['ai_supplemented']})")
        
        except Exception as e:
            stats["failed"] += 1
            print(f"  [{i}/{total_count}] ❌ 迁移失败: {e}")
    
    # 输出统计
    print(f"\n📊 迁移完成:")
    print(f"   ✅ 规则映射: {stats['rules_migrated']} 条")
    print(f"   🤖 AI补充: {stats['ai_supplemented']} 条")
    print(f"   ❌ 失败: {stats['failed']} 条")
    
    # 验证和统计
    remaining = posts_collection.count_documents(query)
    migrated = total_count - remaining
    print(f"\n✅ 成功迁移: {migrated}/{total_count} 条")
    if remaining > 0:
        print(f"⚠️  仍有 {remaining} 条数据未迁移")
    
    # 数据质量评估（使用聚合查询，避免游标超时）
    print(f"\n📈 数据质量评估:")
    try:
        # 使用聚合管道统计，避免游标超时
        pipeline = [
            {"$match": {"tagDimensions": {"$exists": True, "$ne": None, "$ne": {}}}},
            {"$project": {
                "has_category": {"$cond": [{"$ne": ["$tagDimensions.category", ""]}, 1, 0]},
                "has_subrole": {"$cond": [{"$ne": ["$tagDimensions.subRole", ""]}, 1, 0]},
                "has_location": {"$cond": [{"$ne": ["$tagDimensions.location", ""]}, 1, 0]},
                "has_recruit_type": {"$cond": [
                    {"$and": [
                        {"$ne": ["$tagDimensions.recruitType", ""]},
                        {"$ne": ["$tagDimensions.recruitType", "其他"]}
                    ]}, 1, 0]},
                "has_technologies": {"$cond": [
                    {"$gt": [{"$size": {"$ifNull": ["$tagDimensions.technologies", []]}}, 0]}, 1, 0]},
                "complete": {"$cond": [
                    {"$and": [
                        {"$ne": ["$tagDimensions.category", ""]},
                        {"$ne": ["$tagDimensions.subRole", ""]},
                        {"$ne": ["$tagDimensions.location", ""]}
                    ]}, 1, 0]}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "has_category": {"$sum": "$has_category"},
                "has_subrole": {"$sum": "$has_subrole"},
                "has_location": {"$sum": "$has_location"},
                "has_recruit_type": {"$sum": "$has_recruit_type"},
                "has_technologies": {"$sum": "$has_technologies"},
                "complete": {"$sum": "$complete"}
            }}
        ]
        
        result = list(posts_collection.aggregate(pipeline))
        
        if result and result[0]:
            stats = result[0]
            total = stats.get("total", 0)
            
            if total > 0:
                print(f"   category填充率: {stats['has_category']}/{total} ({stats['has_category']/total*100:.1f}%)")
                print(f"   subRole填充率: {stats['has_subrole']}/{total} ({stats['has_subrole']/total*100:.1f}%)")
                print(f"   location填充率: {stats['has_location']}/{total} ({stats['has_location']/total*100:.1f}%)")
                print(f"   recruitType填充率: {stats['has_recruit_type']}/{total} ({stats['has_recruit_type']/total*100:.1f}%)")
                print(f"   technologies填充率: {stats['has_technologies']}/{total} ({stats['has_technologies']/total*100:.1f}%)")
                print(f"   完整度（category+subRole+location）: {stats['complete']}/{total} ({stats['complete']/total*100:.1f}%)")
            else:
                print("   ⚠️  没有找到已迁移的数据")
        else:
            print("   ⚠️  数据质量评估失败")
    except Exception as e:
        print(f"   ⚠️  数据质量评估出错: {e}")
        print("   💡 数据已成功迁移，可以手动验证")

def main():
    parser = argparse.ArgumentParser(description="现有数据迁移脚本")
    parser.add_argument(
        "--mode",
        choices=["rules-only", "ai-only", "full"],
        default="full",
        help="迁移模式: rules-only(仅规则映射), ai-only(仅AI补充), full(完整流程)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="批量处理大小"
    )
    parser.add_argument(
        "--mongo-uri",
        type=str,
        default=None,
        help="MongoDB连接URI（可选，默认使用环境变量MONGO_URI）"
    )
    
    args = parser.parse_args()
    
    if args.mongo_uri:
        global MONGO_URI
        MONGO_URI = args.mongo_uri
    
    print("=" * 60)
    print("📦 现有数据迁移脚本 - 方案三（混合方案）")
    print("=" * 60)
    print(f"模式: {args.mode}")
    print(f"批量大小: {args.batch_size}")
    print()
    
    migrate_posts(mode=args.mode, batch_size=args.batch_size)

if __name__ == "__main__":
    main()

