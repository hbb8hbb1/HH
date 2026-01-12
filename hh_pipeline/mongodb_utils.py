#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MongoDB 工具模块 - 统一管理 MongoDB 连接和导入逻辑
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any
from pymongo import MongoClient

# MongoDB 配置（统一配置，优先使用环境变量）
MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://henghuang0729_db_user:gzoOfVrsmUhXgkk1@cluster0.px3nvle.mongodb.net/offermagnet?retryWrites=true&w=majority"
)
DB_NAME = "offermagnet"
COLLECTION_NAME = "posts"


def connect_mongo(verbose: bool = False):
    """
    连接到 MongoDB
    
    Args:
        verbose: 是否打印详细连接信息
    
    Returns:
        (client, db) 元组，失败时返回 (None, None)
    """
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
        print(f"❌ MongoDB 连接失败: {e}")
        if verbose:
            print("\n💡 提示：")
            print("   macOS: brew services start mongodb-community")
            print("   Linux: sudo systemctl start mongod")
        return None, None


def prepare_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    准备导入到 MongoDB 的 payload（添加必要字段）
    
    Args:
        payload: 原始 payload
    
    Returns:
        处理后的 payload
    """
    # 添加必要字段
    if "authorId" not in payload:
        payload["authorId"] = None
    if "authorName" not in payload:
        payload["authorName"] = "System Importer"
    if "authorIsPro" not in payload:
        payload["authorIsPro"] = False
    
    # 确保 tagDimensions 存在
    if "tagDimensions" not in payload:
        payload["tagDimensions"] = {
            "technologies": [],
            "recruitType": "",
            "location": "",
            "category": "Other",
            "experience": "",
            "salary": "",
            "custom": []
        }
    
    return payload


def _parse_time_string(time_str: str) -> Optional[datetime]:
    """内部函数：解析时间字符串（避免循环导入）"""
    if not time_str:
        return None
    
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(time_str.strip(), fmt)
        except ValueError:
            continue
    
    return None


def import_to_mongodb(
    payload: Dict[str, Any],
    publish_time: Optional[Any] = None,
    update_existing: bool = True,
    verbose: bool = True
) -> bool:
    """
    导入单个帖子到 MongoDB
    
    Args:
        payload: 要导入的帖子数据
        publish_time: 发布时间（可以是 datetime 对象或字符串）
        update_existing: 如果帖子已存在，是否更新发布时间
        verbose: 是否打印详细信息
    
    Returns:
        是否成功导入
    """
    client, db = connect_mongo()
    if client is None or db is None:
        return False
    
    try:
        posts_collection = db[COLLECTION_NAME]
        
        # 检查是否已存在（基于 title 和 company）
        existing = posts_collection.find_one({
            "title": payload.get("title"),
            "company": payload.get("company")
        })
        
        if existing:
            # 如果已存在，更新发布时间（如果提供了）
            if update_existing and publish_time:
                if isinstance(publish_time, str):
                    # 如果是字符串，尝试解析
                    parsed_time = _parse_time_string(publish_time)
                    if parsed_time:
                        posts_collection.update_one(
                            {"_id": existing["_id"]},
                            {"$set": {"createdAt": parsed_time, "publishTime": publish_time}}
                        )
                        if verbose:
                            print(f"⏭️  帖子已存在，已更新发布时间: {publish_time}")
                    else:
                        if verbose:
                            print(f"⏭️  帖子已存在，但时间格式无效: {publish_time}")
                elif isinstance(publish_time, datetime):
                    posts_collection.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"createdAt": publish_time, "publishTime": publish_time.isoformat()}}
                    )
                    if verbose:
                        print(f"⏭️  帖子已存在，已更新发布时间")
                else:
                    if verbose:
                        print(f"⏭️  帖子已存在，跳过导入")
            else:
                if verbose:
                    print(f"⏭️  帖子已存在，跳过导入")
                    if payload.get('title'):
                        print(f"   标题: {payload.get('title', '')[:50]}...")
            client.close()
            return True
        
        # 准备 payload
        payload = prepare_payload(payload.copy())
        
        # 设置发布时间
        if publish_time:
            if isinstance(publish_time, str):
                parsed_time = _parse_time_string(publish_time)
                if parsed_time:
                    payload["createdAt"] = parsed_time
                    payload["publishTime"] = publish_time
                else:
                    payload["createdAt"] = datetime.now()
            elif isinstance(publish_time, datetime):
                payload["createdAt"] = publish_time
                payload["publishTime"] = publish_time.isoformat()
            else:
                payload["createdAt"] = datetime.now()
        else:
            payload["createdAt"] = datetime.now()
        
        # 插入到 MongoDB
        result = posts_collection.insert_one(payload)
        if verbose:
            time_info = f" (发布时间: {publish_time})" if publish_time else ""
            print(f"✅ 已导入到数据库 (ID: {result.inserted_id}){time_info}")
        
        client.close()
        return True
    except Exception as e:
        if verbose:
            print(f"❌ 导入失败: {e}")
        if client:
            client.close()
        return False


def get_mongo_collection():
    """
    获取 MongoDB 集合对象（用于需要直接操作集合的场景）
    
    Returns:
        (client, collection) 元组，失败时返回 (None, None)
    """
    client, db = connect_mongo()
    if client is None or db is None:
        return None, None
    return client, db[COLLECTION_NAME]

