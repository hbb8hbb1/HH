#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 工具模块 - 统一管理 CSV 时间解析
"""

import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional


def load_csv_times(csv_path: Path) -> Dict[str, str]:
    """
    从 CSV 文件加载时间信息，返回 {file_id: publish_time}
    
    Args:
        csv_path: CSV 文件路径
    
    Returns:
        时间映射字典
    """
    times = {}
    
    if not csv_path.exists():
        print(f"⚠️  CSV文件不存在: {csv_path}")
        return times
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # 尝试检测是否有BOM
            first_line = f.readline()
            f.seek(0)
            
            # 读取CSV（无表头）
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 3:
                    continue
                
                # 第一列是ID（文件名，去掉.html）
                file_id = str(row[0]).strip()
                # 处理可能的BOM
                if file_id.startswith('\ufeff'):
                    file_id = file_id[1:]
                
                # 第三列是发布时间
                publish_time = row[2].strip() if len(row) > 2 else ""
                
                if file_id and publish_time:
                    times[file_id] = publish_time
        
        print(f"✅ 从CSV加载了 {len(times)} 条时间记录")
        return times
    except Exception as e:
        print(f"❌ 读取CSV失败: {e}")
        return times


def parse_publish_time(time_str: str) -> Optional[datetime]:
    """
    解析时间字符串为 datetime 对象
    
    Args:
        time_str: 时间字符串
    
    Returns:
        datetime 对象，解析失败返回 None
    """
    if not time_str:
        return None
    
    # 尝试多种时间格式
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

