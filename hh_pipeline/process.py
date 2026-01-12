#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一处理入口 - 自动识别文件或文件夹并处理

使用方法:
    python3 process.py <html_file_or_folder> [--csv /path/to/datas.csv]
    
功能:
    - 如果是单个HTML文件：处理并导入MongoDB
    - 如果是文件夹：批量处理所有HTML文件并导入MongoDB
    - 支持可选的CSV时间同步（仅批量处理时）
"""

import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(
        description="统一处理入口 - 自动识别文件或文件夹",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 处理单个文件
  python3 process.py /path/to/file.html
  
  # 处理文件夹
  python3 process.py /path/to/html_folder
  
  # 处理文件夹并同步CSV时间
  python3 process.py /path/to/html_folder --csv /path/to/datas.csv
        """
    )
    parser.add_argument("path", help="HTML文件路径或包含HTML文件的文件夹路径")
    parser.add_argument("--csv", help="CSV文件路径（包含发布时间，仅批量处理时使用）")
    parser.add_argument("--no-import", action="store_true", help="不自动导入到MongoDB（仅单文件处理时）")
    
    args = parser.parse_args()
    
    path = Path(args.path)
    
    # 检查路径是否存在
    if not path.exists():
        print(f"❌ 路径不存在: {path}")
        sys.exit(1)
    
    # 判断是文件还是文件夹
    if path.is_file():
        # 单文件处理
        if not path.suffix.lower() == '.html':
            print(f"⚠️  警告: 文件不是.html格式: {path}")
        
        print(f"📄 检测到单个HTML文件，使用单文件处理模式\n")
        from process_single import process_single_file
        
        success = process_single_file(str(path), auto_import=not args.no_import)
        sys.exit(0 if success else 1)
    
    elif path.is_dir():
        # 文件夹批量处理
        html_files = list(path.glob("*.html"))
        if not html_files:
            print(f"❌ 文件夹中没有找到HTML文件: {path}")
            sys.exit(1)
        
        print(f"📁 检测到文件夹，找到 {len(html_files)} 个HTML文件，使用批量处理模式\n")
        from process_batch import process_batch
        
        csv_path = Path(args.csv) if args.csv else None
        if csv_path and not csv_path.exists():
            print(f"⚠️  CSV文件不存在: {csv_path}")
            csv_path = None
        
        process_batch(path, csv_path)
    else:
        print(f"❌ 无效的路径类型: {path}")
        sys.exit(1)


if __name__ == "__main__":
    main()


