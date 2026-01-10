#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HH Pipeline - 统一的HTML面经处理流程

功能：
1. 解析HTML文件为raw JSON
2. 通过AI清洗为final JSON（必须有AI API）
3. 可选：导入到后端数据库
4. 幂等去重：基于内容hash，已处理的文件自动跳过

使用方法：
    python pipeline.py run --html-dir ./input_html --out-dir ./out
    python pipeline.py run --html-dir ./input_html --out-dir ./out --api-base http://localhost:5001 --email user@example.com --password pass
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

import requests
from bs4 import BeautifulSoup

# ==================== 配置 ====================

# AI API配置（优先使用QWEN，如果未配置则尝试GEMINI）
QWEN_API_KEY = os.environ.get("QWEN_API_KEY")
GEMINI_API_KEY = os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY")
AI_API_KEY = QWEN_API_KEY or GEMINI_API_KEY
AI_TYPE = "qwen" if QWEN_API_KEY else ("gemini" if GEMINI_API_KEY else None)

QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
GEMINI_MODEL = "gemini-1.5-flash"

CONCURRENCY = int(os.environ.get("CONCURRENCY", "10"))  # 默认并发数从3增加到10
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
API_TIMEOUT = int(os.environ.get("API_TIMEOUT", "30"))  # AI API超时时间（秒）

# ==================== AI处理 ====================

def check_ai_api() -> Tuple[bool, str]:
    """检查AI API是否可用（强制要求）"""
    if not AI_API_KEY:
        return False, "未配置AI API Key。请设置 QWEN_API_KEY 或 API_KEY (Gemini) 环境变量"
    
    # 测试API可用性
    try:
        if AI_TYPE == "qwen":
            response = requests.post(
                QWEN_API_URL,
                headers={'Authorization': f'Bearer {AI_API_KEY}'},
                json={'model': 'qwen-plus', 'input': {'messages': [{'role': 'user', 'content': 'test'}]}},
                timeout=5
            )
            if response.status_code == 401:
                return False, f"QWEN_API_KEY 无效（401错误）"
            return True, "Qwen API可用"
        else:  # gemini
            # 简单检查key格式
            if len(AI_API_KEY) < 10:
                return False, "API_KEY 格式可能无效"
            return True, "Gemini API已配置"
    except Exception as e:
        return False, f"AI API检查失败: {e}"
    
    return True, "AI API可用"

def build_prompt(title: str, content_text: str) -> str:
    """构建AI清洗提示词"""
    return f"""你是一位专业的互联网求职面经主编。
请将用户提供的原始面经内容清洗、匿名化并重组为"产品级可读"的结构化面经。

硬性要求：
1) 输出语言：必须使用【简体中文】。
2) 匿名化：移除面试官姓名、具体日期、楼主ID、学校/邮箱/电话等隐私。
3) 结构：使用 Markdown，并尽量按以下骨架组织（可按内容增删小节，但保持层级清晰）：
   - ## 基本信息（公司/岗位/结果/难度）
   - ## 时间线（如果能从内容推断）
   - ## 面试过程（按轮次：笔试/OA/一面/二面/HR等）
   - ## 题目总结（把题目列表化）
   - ## 个人总结（经验与建议）
4) 只基于原文，不要编造不存在的轮次或细节；不确定就写"未提及/不明确"。
5) 输出为 JSON 格式，包含以下字段：
   - title: 精炼、专业的中文标题
   - processedContent: Markdown 格式的结构化面经正文
   - company: 公司名称（外企用英文，如"Meta"、"Google"）
   - role: 岗位（中文或英文均可，如"软件工程师"、"Software Engineer"）
   - difficulty: 难度 1-5（整数）
   - tags: 3-8 个标签的数组（保留向后兼容）
   - tagDimensions: 结构化标签对象，包含以下字段：
     * technologies: 技术栈数组，如 ["React", "TypeScript", "Node.js"]（从内容中提取提到的技术）
     * recruitType: 招聘类型，可选值："校招"、"社招"、"暑期实习"、"日常实习"、"其他"（从标题或内容识别）
     * location: 地点字符串，如 "北京"、"上海"、"深圳"、"硅谷"（从标题或内容提取，不确定则空字符串）
     * category: 部门类别，可选值："研发"、"算法"、"产品"、"设计"、"运营"、"市场"、"HR"（根据role和内容判断）
     * subRole: 子角色字符串，如 "前端"、"后端"、"机器学习"、"CV"（根据role和内容判断）
     * custom: 自定义标签数组，如 ["手写代码", "系统设计", "算法题"]（其他有价值的标签）

原始标题（可能很糙）：
{title}

原始正文（已去掉HTML标签，仅保留文本）：
{content_text}

请返回 JSON 格式，包含 title, processedContent, company, role, difficulty, tags, tagDimensions 字段。
tagDimensions 必须包含所有子字段（technologies, recruitType, location, category, subRole, custom）。
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
            
            if response.status_code == 200:
                result = response.json()
                text = result['output']['choices'][0]['message']['content']
                if not text:
                    raise ValueError("Empty model response text")
                
                # 提取JSON
                text = text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                return json.loads(text)
            elif response.status_code == 429:
                if attempt < retries:
                    time.sleep(min(2 * (attempt + 1), 12))
                    continue
                raise Exception(f"Rate limited after {retries} retries")
            else:
                raise Exception(f"API returned {response.status_code}: {response.text[:200]}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {e}")
        except Exception as e:
            if attempt < retries and any(k in str(e).lower() for k in ['429', 'rate', 'timeout']):
                time.sleep(min(2 * (attempt + 1), 12))
                continue
            raise
    
    raise Exception("Max retries exceeded")

def call_gemini_api(prompt: str, retries: int = MAX_RETRIES) -> Dict[str, Any]:
    """调用Gemini API（需要google-generativeai库）"""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("需要安装 google-generativeai: pip install google-generativeai")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    for attempt in range(retries + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                }
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            if attempt < retries and any(k in str(e).lower() for k in ['429', 'rate', 'timeout']):
                time.sleep(min(2 * (attempt + 1), 12))
                continue
            raise
    
    raise Exception("Max retries exceeded")

def process_with_ai(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """使用AI清洗raw数据为final格式"""
    prompt = build_prompt(raw_data.get("title", ""), raw_data.get("originalContentText", ""))
    
    if AI_TYPE == "qwen":
        processed = call_qwen_api(prompt)
    elif AI_TYPE == "gemini":
        processed = call_gemini_api(prompt)
    else:
        raise RuntimeError("AI API未配置")
    
    # 验证必需字段
    required_fields = ["title", "processedContent", "company", "role", "difficulty", "tags", "tagDimensions"]
    missing = [f for f in required_fields if f not in processed]
    if missing:
        raise ValueError(f"AI返回缺少必需字段: {missing}")
    
    # 验证 tagDimensions 结构
    tag_dims = processed.get("tagDimensions", {})
    required_dims = ["technologies", "recruitType", "location", "category", "subRole", "custom"]
    missing_dims = [d for d in required_dims if d not in tag_dims]
    if missing_dims:
        raise ValueError(f"tagDimensions 缺少必需字段: {missing_dims}")
    
    # 验证和规范化 tagDimensions
    tag_dimensions = {
        "technologies": list(tag_dims.get("technologies", [])) if isinstance(tag_dims.get("technologies"), list) else [],
        "recruitType": str(tag_dims.get("recruitType", "其他")).strip() or "其他",
        "location": str(tag_dims.get("location", "")).strip(),
        "category": str(tag_dims.get("category", "")).strip() or "",
        "subRole": str(tag_dims.get("subRole", "")).strip() or "",
        "custom": list(tag_dims.get("custom", [])) if isinstance(tag_dims.get("custom"), list) else []
    }
    
    # 验证 recruitType 值
    valid_recruit_types = ["校招", "社招", "暑期实习", "日常实习", "其他"]
    if tag_dimensions["recruitType"] not in valid_recruit_types:
        tag_dimensions["recruitType"] = "其他"
    
    # 构建final payload
    return {
        "title": processed["title"],
        "originalContent": raw_data.get("originalContentHtml", ""),
        "processedContent": processed["processedContent"],
        "company": processed["company"],
        "role": processed["role"],
        "difficulty": int(processed["difficulty"]),
        "tags": list(processed["tags"]),  # 保留向后兼容
        "tagDimensions": tag_dimensions,  # 新增结构化标签
        "comments": [],
        "usefulVotes": 0,
        "uselessVotes": 0,
        "shareCount": 0,
        "isAnonymous": True
    }

# ==================== HTML解析 ====================

def parse_html(html_path: Path) -> Dict[str, Any]:
    """解析单个HTML文件为raw JSON"""
    raw_html = html_path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(raw_html, "lxml")
    
    # 移除anti-crawling元素
    for node in soup.select(".jammer"):
        node.decompose()
    
    # 提取标题
    title_node = soup.select_one(".thread_subject")
    title = title_node.get_text(" ", strip=True) if title_node else (soup.title.get_text(strip=True) if soup.title else "未命名面经")
    
    # 提取时间
    time_node = soup.select_one(".post_time")
    publish_time_raw = time_node.get_text(" ", strip=True) if time_node else ""
    
    # 提取正文
    body_node = soup.select_one(".article_body")
    if body_node:
        body_html = str(body_node)
    else:
        body_html = str(soup.body) if soup.body else raw_html
    
    body_text = BeautifulSoup(body_html, "lxml").get_text("\n", strip=True)
    
    # 提取ID
    m = re.search(r"(\d+)", html_path.name)
    post_id = m.group(1) if m else html_path.stem
    
    return {
        "id": post_id,
        "sourceFile": html_path.name,
        "title": title,
        "publishTimeRaw": publish_time_raw,
        "originalContentHtml": body_html,
        "originalContentText": body_text,
    }

# ==================== 状态管理（幂等去重）====================

def init_state_db(state_db_path: Path) -> sqlite3.Connection:
    """初始化状态数据库"""
    conn = sqlite3.connect(str(state_db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS processing_state (
            content_hash TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            file_id TEXT,
            error_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON processing_state(status)")
    conn.commit()
    return conn

def compute_content_hash(html_path: Path) -> str:
    """计算HTML文件内容hash（用于去重）"""
    content = html_path.read_bytes()
    return hashlib.sha256(content).hexdigest()

def is_content_already_processed(processed_content: str) -> bool:
    """AI检测processedContent是否已被清洗过"""
    if not processed_content or len(processed_content.strip()) < 100:
        return False
    
    # 检查清洗后的特征：
    # 1. 包含Markdown格式（##标题）
    # 2. 不包含HTML标签（<div, <br/>等）
    # 3. 不包含加密数字（蠡口、散散等）
    # 4. 结构清晰（包含分段）
    has_markdown = "##" in processed_content
    has_html = bool(re.search(r"<[a-z][^>]*>", processed_content, re.I))
    has_encrypted = bool(re.search(r"[蠡散利耳酒伞衣移佰叁贰壹]|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[口散流凌尔伞]", processed_content))
    has_structure = "\n\n" in processed_content or processed_content.count("\n") > 5
    
    return has_markdown and not has_html and not has_encrypted and has_structure


def update_state(conn: sqlite3.Connection, content_hash: str, status: str, file_id: Optional[str] = None, error_reason: Optional[str] = None):
    """更新处理状态"""
    conn.execute("""
        INSERT OR REPLACE INTO processing_state 
        (content_hash, status, file_id, error_reason, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (content_hash, status, file_id, error_reason))
    conn.commit()

# ==================== 后端导入 ====================

def register_user(api_base: str, name: str, email: str, password: str):
    """注册用户（忽略错误）"""
    try:
        requests.post(
            f"{api_base}/api/auth/register",
            json={"name": name, "email": email, "password": password},
            timeout=10
        )
    except:
        pass

def login(api_base: str, email: str, password: str) -> str:
    """登录获取token"""
    response = requests.post(
        f"{api_base}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    token = data.get("token") or data.get("accessToken") or data.get("jwt")
    if not token:
        raise RuntimeError(f"登录成功但未返回token: {data}")
    return token

def upload_to_backend(api_base: str, token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """上传到后端"""
    response = requests.post(
        f"{api_base}/api/posts",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
        timeout=API_TIMEOUT
    )
    response.raise_for_status()
    return response.json()

# ==================== 主流程 ====================

def run_pipeline(html_dir: Path, out_dir: Path, api_base: Optional[str] = None, 
                 email: Optional[str] = None, password: Optional[str] = None):
    """运行pipeline主流程"""
    
    # 1. AI-gate：检查AI API
    ai_available, ai_msg = check_ai_api()
    if not ai_available:
        print(f"❌ {ai_msg}")
        print("\n⚠️  Pipeline要求必须配置AI API才能运行。")
        print("   请设置环境变量：")
        print("   export QWEN_API_KEY='sk-...'  # 或")
        print("   export API_KEY='your-gemini-key'")
        sys.exit(1)
    
    print(f"✅ {ai_msg} (使用 {AI_TYPE.upper()} API)")
    
    # 2. 创建输出目录
    final_dir = out_dir / "final"
    bad_dir = out_dir / "bad"
    final_dir.mkdir(parents=True, exist_ok=True)
    bad_dir.mkdir(parents=True, exist_ok=True)
    
    # 3. 初始化状态数据库
    state_db_path = out_dir / "state.sqlite"
    state_conn = init_state_db(state_db_path)
    
    # 4. 查找HTML文件
    html_files = sorted(html_dir.glob("*.html"))
    if not html_files:
        print(f"⚠️  未找到HTML文件: {html_dir}")
        return
    
    print(f"\n📁 找到 {len(html_files)} 个HTML文件")
    print(f"⚡ 使用并发数: {CONCURRENCY} (可通过环境变量 CONCURRENCY 调整)")
    
    # 5. 处理每个文件（并发处理）
    stats = {"total": len(html_files), "ok": 0, "bad": 0, "skipped": 0}
    stats_lock = Lock()  # 用于线程安全的统计更新
    state_lock = Lock()  # 状态数据库锁
    
    def process_single_file(html_path: Path, index: int) -> Tuple[str, str, Optional[str]]:
        """处理单个HTML文件（用于并发）"""
        result_type = None
        result_msg = ""
        file_id = None
        
        try:
            # 计算内容hash（用于去重）
            content_hash = compute_content_hash(html_path)
            
            # 步骤1: 检查hash是否已处理（快速检查状态数据库）
            with state_lock:
                cursor = state_conn.execute(
                    "SELECT status, error_reason, file_id FROM processing_state WHERE content_hash = ?",
                    (content_hash,)
                )
                state_row = cursor.fetchone()
            
            prev_error = None
            if state_row:
                status, error_reason, saved_file_id = state_row
                if status == "ok" and saved_file_id:
                    # 验证final文件是否真的存在且有效
                    final_path = final_dir / f"{saved_file_id}.json"
                    if final_path.exists():
                        try:
                            final_data = json.loads(final_path.read_text(encoding="utf-8"))
                            processed = final_data.get("processedContent", "")
                            # AI检测是否真的已清洗
                            if is_content_already_processed(processed):
                                with stats_lock:
                                    stats["skipped"] += 1
                                return ("skipped", f"⏭️  已处理过，跳过（content_hash: {content_hash[:8]}...）", None)
                        except:
                            pass  # 文件损坏，重新处理
                elif status == "bad":
                    prev_error = error_reason
            
            # 步骤2: 解析HTML
            try:
                raw_data = parse_html(html_path)
                if not raw_data.get("title") or not raw_data.get("originalContentText"):
                    raise ValueError("解析失败：缺少title或content")
                file_id = raw_data["id"]
            except Exception as e:
                error_msg = str(e)
                error_path = bad_dir / f"{html_path.stem}.error.txt"
                error_path.write_text(f"{html_path}\n{type(e).__name__}: {error_msg}\n", encoding="utf-8")
                with state_lock:
                    update_state(state_conn, content_hash, "bad", html_path.stem, error_msg[:500])
                with stats_lock:
                    stats["bad"] += 1
                return ("bad", f"❌ HTML解析失败: {error_msg[:100]}", None)
            
            # 步骤3: 再次检查（基于file_id检查final文件）
            final_path = final_dir / f"{file_id}.json"
            if final_path.exists():
                try:
                    final_data = json.loads(final_path.read_text(encoding="utf-8"))
                    processed = final_data.get("processedContent", "")
                    if is_content_already_processed(processed):
                        with state_lock:
                            update_state(state_conn, content_hash, "ok", file_id)
                        with stats_lock:
                            stats["skipped"] += 1
                        return ("skipped", f"⏭️  已处理过，跳过（final文件已存在且有效）", None)
                except:
                    pass  # 文件损坏，重新处理
            
            if prev_error:
                pass  # 之前失败，重试
            
            # 步骤4: AI清洗
            final_data = process_with_ai(raw_data)
            
            # 步骤5: 验证必需字段
            required = ["title", "processedContent", "company", "role", "difficulty", "tags"]
            missing = [f for f in required if not final_data.get(f)]
            if missing:
                raise ValueError(f"最终数据缺少必需字段: {missing}")
            
            # 步骤6: 保存final JSON
            final_path.write_text(json.dumps(final_data, ensure_ascii=False, indent=2), encoding="utf-8")
            
            # 步骤7: 更新状态
            with state_lock:
                update_state(state_conn, content_hash, "ok", file_id)
            with stats_lock:
                stats["ok"] += 1
            
            return ("ok", f"✅ 处理成功（保存到: {final_path.name}）", file_id)
            
        except Exception as e:
            error_msg = str(e)
            file_id = html_path.stem
            error_path = bad_dir / f"{file_id}.error.txt"
            error_path.write_text(f"{html_path}\n{type(e).__name__}: {error_msg}\n", encoding="utf-8")
            
            with state_lock:
                update_state(state_conn, content_hash, "bad", file_id, error_msg[:500])
            with stats_lock:
                stats["bad"] += 1
            
            return ("bad", f"❌ 处理失败: {error_msg[:100]}", None)
    
    # 并发处理文件
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(process_single_file, html_path, i+1): (html_path, i+1) 
                   for i, html_path in enumerate(html_files)}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            html_path, index = futures[future]
            try:
                result_type, result_msg, file_id = future.result()
                if result_type != "skipped":  # 跳过的不打印（太多）
                    print(f"[{index}/{stats['total']}] {result_msg}")
                
                # 每10个文件显示一次进度
                if completed % 10 == 0:
                    with stats_lock:
                        print(f"\n📊 进度: {completed}/{stats['total']} (成功: {stats['ok']}, 失败: {stats['bad']}, 跳过: {stats['skipped']})")
            except Exception as e:
                print(f"[{index}/{stats['total']}] ❌ 处理异常: {e}")
    
    
    # 6. 输出统计
    print(f"\n{'='*50}")
    print(f"📊 处理完成统计：")
    print(f"   总计: {stats['total']} 个文件")
    print(f"   ✅ 成功: {stats['ok']} 个")
    print(f"   ❌ 失败: {stats['bad']} 个")
    print(f"   ⏭️  跳过: {stats['skipped']} 个（已处理过）")
    print(f"\n输出目录：")
    print(f"   Final JSON: {final_dir}")
    print(f"   失败记录: {bad_dir}")
    print(f"   状态数据库: {state_db_path}")
    
    state_conn.close()

# ==================== 命令行入口 ====================

def main():
    parser = argparse.ArgumentParser(description="HH Pipeline - HTML面经处理流程")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # run命令
    run_parser = subparsers.add_parser("run", help="运行pipeline")
    run_parser.add_argument("--html-dir", required=True, help="HTML文件目录")
    run_parser.add_argument("--out-dir", default="./out", help="输出目录（默认: ./out）")
    run_parser.add_argument("--api-base", help="后端API地址（可选，用于上传）")
    run_parser.add_argument("--email", help="登录邮箱（与--api-base一起使用）")
    run_parser.add_argument("--password", help="登录密码（与--api-base一起使用）")
    
    args = parser.parse_args()
    
    if args.command == "run":
        html_dir = Path(args.html_dir)
        if not html_dir.exists():
            print(f"❌ HTML目录不存在: {html_dir}")
            sys.exit(1)
        
        out_dir = Path(args.out_dir)
        
        # 验证上传参数
        if args.api_base and (not args.email or not args.password):
            print("❌ 使用--api-base时必须同时提供--email和--password")
            sys.exit(1)
        
        run_pipeline(html_dir, out_dir, args.api_base, args.email, args.password)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

