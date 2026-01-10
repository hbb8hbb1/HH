#!/usr/bin/env python3
# 手动导入JSON文件到后端
import json
import requests
import sys
from pathlib import Path

API_BASE = "http://localhost:5001"
EMAIL = "importer@example.com"
PASSWORD = "importer123"

def register_user():
    try:
        requests.post(f"{API_BASE}/api/auth/register", json={
            "name": "Importer",
            "email": EMAIL,
            "password": PASSWORD
        }, timeout=5)
    except:
        pass

def login():
    response = requests.post(f"{API_BASE}/api/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    }, timeout=5)
    response.raise_for_status()
    data = response.json()
    return data.get("token") or data.get("accessToken") or data.get("jwt")

def upload_post(token, payload):
    response = requests.post(
        f"{API_BASE}/api/posts",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
        timeout=30
    )
    response.raise_for_status()
    return response.json()

def main():
    final_dir = Path("out/final")
    if not final_dir.exists():
        print("❌ out/final/ 目录不存在")
        return
    
    json_files = list(final_dir.glob("*.json"))
    if not json_files:
        print("❌ 未找到JSON文件")
        return
    
    print(f"📁 找到 {len(json_files)} 个JSON文件")
    
    # 注册和登录
    print("🔐 注册/登录用户...")
    register_user()
    try:
        token = login()
        print("✅ 登录成功")
    except Exception as e:
        print(f"❌ 登录失败: {e}")
        return
    
    # 导入文件
    success = 0
    failed = 0
    
    for i, json_file in enumerate(json_files, 1):
        print(f"\n[{i}/{len(json_files)}] 导入: {json_file.name}")
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                payload = json.load(f)
            
            result = upload_post(token, payload)
            print(f"   ✅ 导入成功: {result.get('title', 'N/A')[:50]}")
            success += 1
        except Exception as e:
            print(f"   ❌ 导入失败: {e}")
            failed += 1
    
    print(f"\n📊 导入完成: 成功 {success} 个, 失败 {failed} 个")

if __name__ == "__main__":
    main()
