#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
现有数据迁移脚本 - AI补充阶段
对规则映射无法确定的数据，使用AI提取缺失的tagDimensions维度
"""

import os
import json
import time
import requests
from pymongo import MongoClient
from typing import Dict, Any, List, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# MongoDB 连接
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/offermagnet")

# AI API配置
QWEN_API_KEY = os.environ.get("QWEN_API_KEY")
GEMINI_API_KEY = os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY")
AI_API_KEY = QWEN_API_KEY or GEMINI_API_KEY
AI_TYPE = "qwen" if QWEN_API_KEY else ("gemini" if GEMINI_API_KEY else None)

QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
GEMINI_MODEL = "gemini-1.5-flash"

CONCURRENCY = int(os.environ.get("CONCURRENCY", "5"))  # AI补充使用较低并发，避免API限流
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
API_TIMEOUT = int(os.environ.get("API_TIMEOUT", "30"))

stats_lock = Lock()


def build_extraction_prompt(title: str, role: str, company: str, content: str, missing_dims: List[str]) -> str:
    """构建AI提取提示词（只提取缺失的维度）"""
    missing_desc = {
        "technologies": "技术栈数组，如 ['React', 'TypeScript', 'Node.js']",
        "recruitType": "招聘类型：'校招'、'社招'、'暑期实习'、'日常实习'、'其他'",
        "location": "地点字符串，如 '北京'、'上海'、'硅谷'",
        "category": "部门类别：'研发'、'算法'、'产品'、'设计'、'运营'、'市场'、'HR'",
        "subRole": "子角色，如 '前端'、'后端'、'机器学习'、'CV'、'NLP'",
        "custom": "自定义标签数组，如 ['手写代码', '系统设计']"
    }
    
    missing_list = "\n".join([f"   - {dim}: {missing_desc[dim]}" for dim in missing_dims])
    
    return f"""请从以下面经信息中提取缺失的标签维度。

标题：{title}
公司：{company}
职位：{role}
内容摘要：{content[:1000]}

请提取以下缺失的维度：
{missing_list}

只返回 JSON 格式，包含这些字段。如果无法确定，使用默认值：
- technologies: []
- recruitType: "其他"
- location: ""
- category: ""
- subRole: ""
- custom: []

只返回 JSON，不要其他文字。"""


def call_qwen_api(prompt: str, retries: int = MAX_RETRIES) -> Dict[str, Any]:
    """调用Qwen API"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {QWEN_API_KEY}'
    }
    
    data = {
        'model': 'qwen-plus',
        'input': {
            'messages': [{'role': 'user', 'content': prompt}]
        },
        'parameters': {'result_format': 'message'}
    }
    
    for attempt in range(retries + 1):
        try:
            response = requests.post(QWEN_API_URL, headers=headers, json=data, timeout=API_TIMEOUT)
            response.raise_for_status()
            result = response.json()
            
            # 解析Qwen响应
            if 'output' in result and 'choices' in result['output']:
                text = result['output']['choices'][0]['message']['content']
            else:
                text = json.dumps(result)
            
            # 提取JSON
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(text.strip())
        except Exception as e:
            if attempt < retries and any(k in str(e).lower() for k in ['429', 'rate', 'timeout']):
                time.sleep(min(2 * (attempt + 1), 12))
                continue
            raise
    
    raise Exception("Max retries exceeded")


def call_gemini_api(prompt: str, retries: int = MAX_RETRIES) -> Dict[str, Any]:
    """调用Gemini API"""
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
    except ImportError:
        raise RuntimeError("需要安装 google-generativeai: pip install google-generativeai")
    
    for attempt in range(retries + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                },
                request_options={"timeout": API_TIMEOUT}
            )
            return json.loads(response.text)
        except Exception as e:
            if attempt < retries and any(k in str(e).lower() for k in ['429', 'rate', 'timeout']):
                time.sleep(min(2 * (attempt + 1), 12))
                continue
            raise
    
    raise Exception("Max retries exceeded")


def extract_missing_dimensions(post: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """使用AI提取缺失的维度"""
    tag_dims = post.get("tagDimensions", {})
    
    # 确定缺失的维度
    missing_dims = []
    if not tag_dims.get("technologies"):
        missing_dims.append("technologies")
    if not tag_dims.get("recruitType") or tag_dims.get("recruitType") == "其他":
        missing_dims.append("recruitType")
    if not tag_dims.get("location"):
        missing_dims.append("location")
    if not tag_dims.get("category"):
        missing_dims.append("category")
    if not tag_dims.get("subRole"):
        missing_dims.append("subRole")
    if not tag_dims.get("custom"):
        missing_dims.append("custom")
    
    if not missing_dims:
        return None  # 没有缺失的维度
    
    # 构建prompt
    title = post.get("title", "")
    role = post.get("role", "")
    company = post.get("company", "")
    content = post.get("processedContent", "") or post.get("originalContent", "")[:2000]
    
    prompt = build_extraction_prompt(title, role, company, content, missing_dims)
    
    # 调用AI
    try:
        if AI_TYPE == "qwen":
            extracted = call_qwen_api(prompt)
        elif AI_TYPE == "gemini":
            extracted = call_gemini_api(prompt)
        else:
            raise RuntimeError("AI API未配置")
        
        # 合并结果（只更新缺失的维度）
        result = tag_dims.copy()
        for dim in missing_dims:
            if dim in extracted:
                if dim == "technologies" or dim == "custom":
                    result[dim] = list(extracted[dim]) if isinstance(extracted[dim], list) else []
                else:
                    result[dim] = str(extracted[dim]).strip()
        
        # 验证 recruitType
        valid_recruit_types = ["校招", "社招", "暑期实习", "日常实习", "其他"]
        if result.get("recruitType") not in valid_recruit_types:
            result["recruitType"] = "其他"
        
        return result
    except Exception as e:
        print(f"      ⚠️  AI提取失败: {e}")
        return None


def supplement_single_post(collection, post: Dict[str, Any], index: int, total: int) -> Tuple[str, str]:
    """补充单个帖子的tagDimensions"""
    try:
        extracted = extract_missing_dimensions(post)
        
        if extracted is None:
            return "skipped", "无需补充"
        
        # 更新数据库
        collection.update_one(
            {"_id": post["_id"]},
            {"$set": {"tagDimensions": extracted}}
        )
        
        return "success", f"已补充 {len([k for k, v in extracted.items() if v])} 个维度"
    except Exception as e:
        return "failed", str(e)


def supplement_posts(collection, dry_run: bool = False) -> Tuple[int, int, int]:
    """补充所有需要AI处理的帖子"""
    # 查找需要补充的数据：
    # 1. tagDimensions 不存在
    # 2. tagDimensions 存在但关键字段为空
    query = {
        "$or": [
            {"tagDimensions": {"$exists": False}},
            {"tagDimensions": None},
            {"$or": [
                {"tagDimensions.technologies": {"$exists": False}},
                {"tagDimensions.technologies": []},
                {"tagDimensions.location": {"$exists": False}},
                {"tagDimensions.location": ""},
                {"tagDimensions.category": {"$exists": False}},
                {"tagDimensions.category": ""},
                {"tagDimensions.subRole": {"$exists": False}},
                {"tagDimensions.subRole": ""}
            ]}
        ]
    }
    
    posts = list(collection.find(query))
    total = len(posts)
    print(f"\n📊 找到 {total} 条需要AI补充的数据")
    
    if total == 0:
        print("✅ 所有数据已补充完成")
        return 0, 0, 0
    
    if not AI_API_KEY:
        print("❌ 未配置AI API Key，无法执行AI补充")
        print("   请设置 QWEN_API_KEY 或 API_KEY (Gemini) 环境变量")
        return 0, 0, 0
    
    print(f"🤖 使用 {AI_TYPE.upper()} API 进行补充")
    print(f"⚡ 并发数: {CONCURRENCY}")
    
    if dry_run:
        print("\n🔍 预览模式（不会实际更新数据库）")
        for i, post in enumerate(posts[:10], 1):  # 只预览前10条
            extracted = extract_missing_dimensions(post)
            print(f"   [{i}] {post.get('title', '')[:50]}")
            if extracted:
                print(f"      将补充: {extracted}")
        return 0, 0, 0
    
    stats = {"success": 0, "skipped": 0, "failed": 0}
    
    def process_post(post, index):
        result_type, message = supplement_single_post(collection, post, index, total)
        with stats_lock:
            stats[result_type] += 1
        return index, result_type, message, post.get("title", "")[:50]
    
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(process_post, post, i+1): (post, i+1) 
                  for i, post in enumerate(posts)}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            try:
                index, result_type, message, title = future.result()
                if result_type != "skipped":
                    print(f"   [{index}/{total}] {'✅' if result_type == 'success' else '❌'} {title}: {message}")
                
                if completed % 10 == 0:
                    with stats_lock:
                        print(f"\n📊 进度: {completed}/{total} (成功: {stats['success']}, 跳过: {stats['skipped']}, 失败: {stats['failed']})\n")
            except Exception as e:
                with stats_lock:
                    stats["failed"] += 1
                print(f"   ❌ 处理异常: {e}")
    
    return stats["success"], stats["skipped"], stats["failed"]


def main():
    import argparse
    parser = argparse.ArgumentParser(description="使用AI补充缺失的tagDimensions维度")
    parser.add_argument("--dry-run", action="store_true", help="仅预览，不实际更新数据库")
    parser.add_argument("--mongo-uri", default=MONGO_URI, help="MongoDB 连接字符串")
    args = parser.parse_args()
    
    print("🔗 连接 MongoDB...")
    try:
        client = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        db = client.get_database()
        collection = db.posts
        print("✅ MongoDB 连接成功")
    except Exception as e:
        print(f"❌ MongoDB 连接失败: {e}")
        return
    
    if args.dry_run:
        print("\n🔍 预览模式（不会实际更新数据库）")
    
    print("\n🚀 开始AI补充...")
    success, skipped, failed = supplement_posts(collection, dry_run=args.dry_run)
    
    print(f"\n📊 补充完成:")
    print(f"   ✅ 成功: {success} 条")
    print(f"   ⏭️  跳过: {skipped} 条")
    print(f"   ❌ 失败: {failed} 条")
    
    if not args.dry_run:
        # 统计补充后的数据
        total_with_dims = collection.count_documents({"tagDimensions": {"$exists": True}})
        total_complete = collection.count_documents({
            "tagDimensions": {"$exists": True},
            "tagDimensions.category": {"$ne": ""},
            "tagDimensions.subRole": {"$ne": ""}
        })
        total_posts = collection.count_documents({})
        print(f"\n📈 数据库统计:")
        print(f"   总帖子数: {total_posts}")
        print(f"   有 tagDimensions: {total_with_dims}")
        print(f"   完整 tagDimensions: {total_complete}")
        print(f"   完整率: {total_complete/total_posts*100:.1f}%" if total_posts > 0 else "   完整率: 0%")


if __name__ == "__main__":
    main()

