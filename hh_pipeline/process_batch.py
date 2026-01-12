#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量处理HTML文件并同步CSV中的发布时间到数据库

使用方法:
    python3 process_batch.py --html-dir /path/to/html [--csv /path/to/datas.csv]
    
功能:
    1. 解析HTML文件
    2. AI清洗为结构化JSON
    3. 自动导入到MongoDB（支持发布时间同步）
"""

import sys
import os
import argparse
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# 导入pipeline的核心功能
from pipeline import (
    parse_html, 
    process_with_ai, 
    check_ai_api,
    AI_TYPE,
    CONCURRENCY
)

# 导入工具模块
from mongodb_utils import import_to_mongodb
from csv_utils import load_csv_times, parse_publish_time


def process_batch(html_dir: Path, csv_path: Optional[Path] = None):
    """批量处理HTML文件"""
    
    # 1. 检查AI API
    ai_available, ai_msg = check_ai_api()
    if not ai_available:
        print(f"❌ {ai_msg}")
        return
    print(f"✅ {ai_msg} (使用 {AI_TYPE.upper()} API)\n")
    
    # 2. 加载CSV时间信息（如果提供）
    times_map = {}
    if csv_path and csv_path.exists():
        times_map = load_csv_times(csv_path)
        print()
    
    # 3. 查找HTML文件
    html_files = sorted(html_dir.glob("*.html"))
    if not html_files:
        print(f"❌ 未找到HTML文件: {html_dir}")
        return
    
    print(f"📁 找到 {len(html_files)} 个HTML文件")
    print(f"⚡ 使用并发数: {CONCURRENCY} (可通过环境变量 CONCURRENCY 调整)\n")
    print(f"{'='*60}\n")
    
    # 4. 并发处理文件
    stats = {"total": len(html_files), "ok": 0, "failed": 0, "skipped": 0}
    stats_lock = Lock()
    
    def process_single_file(html_path: Path, index: int):
        """处理单个文件（用于并发）"""
        file_id = html_path.stem
        publish_time_str = times_map.get(file_id)
        publish_time = parse_publish_time(publish_time_str) if publish_time_str else None
        
        try:
            # 解析HTML
            raw_data = parse_html(html_path)
            if not raw_data.get("title") or not raw_data.get("originalContentText"):
                raise ValueError("解析失败：缺少title或content")
            
            # AI清洗
            final_data = process_with_ai(raw_data)
            
            # 导入到MongoDB（带时间）
            success = import_to_mongodb(final_data, publish_time=publish_time, verbose=False)
            
            if success:
                with stats_lock:
                    stats["ok"] += 1
                time_info = f" (发布时间: {publish_time_str})" if publish_time_str else ""
                return ("ok", f"✅ [{index}/{stats['total']}] {html_path.name}{time_info}", None)
            else:
                with stats_lock:
                    stats["failed"] += 1
                return ("failed", f"❌ [{index}/{stats['total']}] {html_path.name} - 导入失败", None)
                
        except Exception as e:
            with stats_lock:
                stats["failed"] += 1
            return ("failed", f"❌ [{index}/{stats['total']}] {html_path.name} - {str(e)[:80]}", None)
    
    # 使用线程池并发处理
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(process_single_file, html_path, i+1): (html_path, i+1) 
                   for i, html_path in enumerate(html_files)}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            html_path, index = futures[future]
            try:
                result_type, result_msg, _ = future.result()
                print(result_msg)
                
                # 每10个文件显示一次进度
                if completed % 10 == 0:
                    with stats_lock:
                        print(f"\n📊 进度: {completed}/{stats['total']} (成功: {stats['ok']}, 失败: {stats['failed']}, 跳过: {stats['skipped']})\n")
            except Exception as e:
                print(f"❌ [{index}/{stats['total']}] {html_path.name} - 处理异常: {e}")
    
    # 5. 输出统计
    print(f"{'='*60}")
    print(f"📊 处理完成统计：")
    print(f"   总计: {stats['total']} 个文件")
    print(f"   ✅ 成功: {stats['ok']} 个")
    print(f"   ❌ 失败: {stats['failed']} 个")
    print(f"   ⏭️  跳过: {stats['skipped']} 个（已存在）")
    print(f"\n✅ 所有数据已导入数据库，前端可以立即使用标签筛选！")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(description="批量处理HTML文件并同步CSV发布时间")
    parser.add_argument("--html-dir", required=True, help="HTML文件目录")
    parser.add_argument("--csv", help="CSV文件路径（包含发布时间，可选）")
    
    args = parser.parse_args()
    
    html_dir = Path(args.html_dir)
    if not html_dir.exists():
        print(f"❌ HTML目录不存在: {html_dir}")
        sys.exit(1)
    
    csv_path = Path(args.csv) if args.csv else None
    
    process_batch(html_dir, csv_path)


if __name__ == "__main__":
    main()

