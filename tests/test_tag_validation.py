#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
标签验证自动化测试
确保 Pipeline 输出的数据符合规范，前后端值匹配
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "hh_pipeline"))

from validators import TagValidator, validate_tag_dimensions, normalize_category, normalize_recruit_type


def test_normalize_category():
    """测试 category 规范化"""
    print("🧪 测试 category 规范化...")
    
    test_cases = [
        ("算法", "Data"),
        ("数据", "Data"),
        ("数据科学", "Data"),
        ("研发", "SWE"),
        ("软件工程", "SWE"),
        ("产品", "PM"),
        ("设计", "Design"),
        ("基础设施", "Infra"),
        ("SWE", "SWE"),  # 已经是标准值
        ("Data", "Data"),  # 已经是标准值
        ("Other", "Other"),  # 已经是标准值
    ]
    
    validator = TagValidator()
    passed = 0
    failed = 0
    
    for input_value, expected in test_cases:
        result = validator.normalize_value("category", input_value)
        if result == expected:
            print(f"  ✅ '{input_value}' → '{result}'")
            passed += 1
        else:
            print(f"  ❌ '{input_value}' → '{result}' (期望: '{expected}')")
            failed += 1
    
    print(f"\n结果: {passed} 通过, {failed} 失败\n")
    return failed == 0


def test_normalize_recruit_type():
    """测试 recruitType 规范化"""
    print("🧪 测试 recruitType 规范化...")
    
    test_cases = [
        ("实习", "intern"),
        ("校招", "newgrad"),
        ("社招", "experienced"),
        ("intern", "intern"),  # 已经是标准值
        ("newgrad", "newgrad"),  # 已经是标准值
        ("experienced", "experienced"),  # 已经是标准值
    ]
    
    validator = TagValidator()
    passed = 0
    failed = 0
    
    for input_value, expected in test_cases:
        result = validator.normalize_value("recruitType", input_value)
        if result == expected:
            print(f"  ✅ '{input_value}' → '{result}'")
            passed += 1
        else:
            print(f"  ❌ '{input_value}' → '{result}' (期望: '{expected}')")
            failed += 1
    
    print(f"\n结果: {passed} 通过, {failed} 失败\n")
    return failed == 0


def test_validate_tag_dimensions():
    """测试 tagDimensions 验证"""
    print("🧪 测试 tagDimensions 验证...")
    
    validator = TagValidator()
    passed = 0
    failed = 0
    
    # 测试用例 1: 有效的 tagDimensions
    valid_tag_dims = {
        "category": "Data",
        "recruitType": "intern",
        "location": "San Francisco Bay Area",
        "experience": "0-2",
        "salary": "100k-150k",
        "technologies": ["Python", "React"],
        "custom": ["算法题", "系统设计"]
    }
    is_valid, errors, warnings = validator.validate_tag_dimensions(valid_tag_dims)
    if is_valid and len(errors) == 0:
        print(f"  ✅ 有效 tagDimensions 通过验证")
        passed += 1
    else:
        print(f"  ❌ 有效 tagDimensions 验证失败: {errors}")
        failed += 1
    
    # 测试用例 2: 无效的 category（中文值）
    invalid_tag_dims = {
        "category": "算法",  # 应该规范化
        "recruitType": "intern",
        "location": "",
        "experience": "",
        "salary": "",
        "technologies": [],
        "custom": []
    }
    is_valid, errors, warnings = validator.validate_tag_dimensions(invalid_tag_dims)
    if not is_valid:
        print(f"  ✅ 无效 category 正确被拒绝: {errors[0] if errors else 'N/A'}")
        passed += 1
    else:
        print(f"  ❌ 无效 category 应该被拒绝")
        failed += 1
    
    # 测试用例 3: 缺少必需字段
    missing_category = {
        "recruitType": "intern",
        "location": "",
        "experience": "",
        "salary": "",
        "technologies": [],
        "custom": []
    }
    is_valid, errors, warnings = validator.validate_tag_dimensions(missing_category)
    if not is_valid:
        print(f"  ✅ 缺少 category 正确被拒绝: {errors[0] if errors else 'N/A'}")
        passed += 1
    else:
        print(f"  ❌ 缺少 category 应该被拒绝")
        failed += 1
    
    print(f"\n结果: {passed} 通过, {failed} 失败\n")
    return failed == 0


def test_validate_and_normalize_post():
    """测试 Post 对象验证和规范化"""
    print("🧪 测试 Post 对象验证和规范化...")
    
    validator = TagValidator()
    passed = 0
    failed = 0
    
    # 测试用例: 包含中文 category 的 Post
    post_with_chinese_category = {
        "title": "Google 数据科学岗位面试经验",
        "company": "Google",
        "role": "Data Scientist",
        "tagDimensions": {
            "category": "算法",  # 中文值，应该规范化
            "recruitType": "校招",  # 中文值，应该规范化
            "location": "San Francisco Bay Area",
            "experience": "",
            "salary": "",
            "technologies": ["Python"],
            "custom": []
        }
    }
    
    is_valid, normalized_post, errors, warnings = validator.validate_and_normalize_post(post_with_chinese_category)
    
    if is_valid:
        # 检查是否已规范化
        if (normalized_post["tagDimensions"]["category"] == "Data" and 
            normalized_post["tagDimensions"]["recruitType"] == "newgrad"):
            print(f"  ✅ Post 验证通过，已规范化: category={normalized_post['tagDimensions']['category']}, recruitType={normalized_post['tagDimensions']['recruitType']}")
            passed += 1
        else:
            print(f"  ❌ Post 验证通过，但未正确规范化: category={normalized_post['tagDimensions']['category']}, recruitType={normalized_post['tagDimensions']['recruitType']}")
            failed += 1
    else:
        print(f"  ❌ Post 验证失败: {errors}")
        failed += 1
    
    print(f"\n结果: {passed} 通过, {failed} 失败\n")
    return failed == 0


def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("🚀 开始运行标签验证自动化测试")
    print("=" * 60)
    print()
    
    results = []
    results.append(("category 规范化", test_normalize_category()))
    results.append(("recruitType 规范化", test_normalize_recruit_type()))
    results.append(("tagDimensions 验证", test_validate_tag_dimensions()))
    results.append(("Post 对象验证和规范化", test_validate_and_normalize_post()))
    
    print("=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    passed_count = sum(1 for _, result in results if result)
    total_count = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {test_name}")
    
    print()
    print(f"总计: {passed_count}/{total_count} 通过")
    print("=" * 60)
    
    if passed_count == total_count:
        print("✅ 所有测试通过！")
        return 0
    else:
        print("❌ 部分测试失败！")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)


