"""
标签验证模块 - Pipeline 阶段使用
确保 Pipeline 输出的数据符合标签规范
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# 标准值定义
STANDARD_VALUES = {
    "category": ["SWE", "Data", "PM", "Design", "Infra", "Other"],
    "recruitType": ["intern", "newgrad", "experienced"],
    "experience": ["0", "0-2", "2-5", "5-10", "10+"],
    "salary": ["0-100k", "100k-150k", "150k-200k", "200k-300k", "300k+"]
}

# 别名映射（中文/其他格式 → 英文标准值）
ALIAS_MAPPINGS = {
    "category": {
        "算法": "Data",
        "数据": "Data",
        "数据科学": "Data",
        "数据分析": "Data",
        "数据科学家": "Data",
        "算法工程师": "Data",
        "机器学习": "Data",
        "AI": "Data",
        "研发": "SWE",
        "软件工程": "SWE",
        "软件开发": "SWE",
        "工程师": "SWE",
        "开发": "SWE",
        "Software Engineering": "SWE",
        "产品": "PM",
        "产品经理": "PM",
        "PM": "PM",
        "Product": "PM",
        "Product Manager": "PM",
        "设计": "Design",
        "设计师": "Design",
        "Design": "Design",
        "基础设施": "Infra",
        "运维": "Infra",
        "DevOps": "Infra",
        "SRE": "Infra",
        "Infrastructure": "Infra"
    },
    "recruitType": {
        "实习": "intern",
        "实习生": "intern",
        "internship": "intern",
        "Internship": "intern",
        "暑期实习": "intern",
        "日常实习": "intern",
        "校招": "newgrad",
        "应届": "newgrad",
        "应届生": "newgrad",
        "new grad": "newgrad",
        "New Grad": "newgrad",
        "entry level": "newgrad",
        "junior": "newgrad",
        "社招": "experienced",
        "experienced": "experienced",
        "Experienced": "experienced",
        "senior": "experienced",
        "staff": "experienced"
    },
    "experience": {
        "5+": "5-10",
        "1-2": "0-2",
        "1": "0-2",
        "2": "0-2",
        "3": "2-5",
        "4": "2-5",
        "5": "2-5",
        "6": "5-10",
        "7": "5-10",
        "8": "5-10",
        "9": "5-10",
        "10": "5-10",
        "10+": "10+",
        "11+": "10+",
        "15+": "10+",
        "20+": "10+"
    }
}


class TagValidator:
    """标签验证器"""
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        初始化验证器
        
        Args:
            config_path: tags.json 配置文件路径（可选）
        """
        self.config_path = config_path or Path(__file__).parent.parent / "config" / "tags.json"
        self.tags_config = self._load_config()
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def _load_config(self) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"⚠️  无法加载配置文件 {self.config_path}: {e}")
            return {}
    
    def normalize_value(self, dimension: str, value: str) -> str:
        """
        规范化标签值（将中文/其他格式转换为英文标准值）
        
        Args:
            dimension: 维度名称（如 "category", "recruitType"）
            value: 原始值（可能是中文或其他格式）
        
        Returns:
            标准值（英文）
        """
        if not value or not isinstance(value, str):
            return ""
        
        value = value.strip()
        if not value:
            return ""
        
        # 首先检查是否已经是标准值
        if dimension in STANDARD_VALUES:
            if value in STANDARD_VALUES[dimension]:
                return value
        
        # 使用别名映射转换
        if dimension in ALIAS_MAPPINGS:
            # 对于experience，需要精确匹配（避免部分匹配）
            if dimension == "experience":
                for alias, standard_value in ALIAS_MAPPINGS[dimension].items():
                    if alias.lower() == value.lower():
                        return standard_value
            else:
                for alias, standard_value in ALIAS_MAPPINGS[dimension].items():
                    if alias.lower() == value.lower() or alias in value or value in alias:
                        return standard_value
        
        # 如果无法映射，返回原始值（验证时会标记为错误）
        return value
    
    def validate_value(self, dimension: str, value: str, required: bool = False) -> Tuple[bool, str]:
        """
        验证标签值是否符合规范
        
        Args:
            dimension: 维度名称
            value: 标签值
            required: 是否必需
        
        Returns:
            (是否有效, 错误信息)
        """
        # 空值处理
        if not value or not isinstance(value, str) or not value.strip():
            if required:
                return False, f"{dimension} 是必需字段，不能为空"
            return True, ""  # 非必需字段可以为空
        
        value = value.strip()
        
        # 验证标准值
        if dimension in STANDARD_VALUES:
            if value not in STANDARD_VALUES[dimension]:
                # 尝试规范化后再验证
                normalized = self.normalize_value(dimension, value)
                if normalized != value and normalized in STANDARD_VALUES[dimension]:
                    return False, f"{dimension} 值 '{value}' 应规范化为 '{normalized}'"
                return False, f"{dimension} 值 '{value}' 不在允许值列表中: {STANDARD_VALUES[dimension]}"
        
        return True, ""
    
    def validate_tag_dimensions(self, tag_dimensions: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
        """
        验证 tagDimensions 对象
        
        Args:
            tag_dimensions: tagDimensions 对象
        
        Returns:
            (是否有效, 错误列表, 警告列表)
        """
        errors = []
        warnings = []
        
        if not isinstance(tag_dimensions, dict):
            errors.append("tagDimensions 必须是字典类型")
            return False, errors, warnings
        
        # 验证 category（必需）
        category = tag_dimensions.get("category", "")
        is_valid, error_msg = self.validate_value("category", category, required=True)
        if not is_valid:
            errors.append(error_msg)
        elif category and category not in STANDARD_VALUES["category"]:
            # 尝试规范化
            normalized = self.normalize_value("category", category)
            if normalized in STANDARD_VALUES["category"]:
                warnings.append(f"category 值 '{category}' 应规范化为 '{normalized}'")
                tag_dimensions["category"] = normalized
        
        # 验证 recruitType（可选）
        recruit_type = tag_dimensions.get("recruitType", "")
        if recruit_type:
            is_valid, error_msg = self.validate_value("recruitType", recruit_type)
            if not is_valid:
                errors.append(error_msg)
            elif recruit_type not in STANDARD_VALUES["recruitType"]:
                normalized = self.normalize_value("recruitType", recruit_type)
                if normalized in STANDARD_VALUES["recruitType"]:
                    warnings.append(f"recruitType 值 '{recruit_type}' 应规范化为 '{normalized}'")
                    tag_dimensions["recruitType"] = normalized
        
        # 验证 experience（可选）
        experience = tag_dimensions.get("experience", "")
        if experience:
            is_valid, error_msg = self.validate_value("experience", experience)
            if not is_valid:
                errors.append(error_msg)
        
        # 验证 salary（可选）
        salary = tag_dimensions.get("salary", "")
        if salary:
            is_valid, error_msg = self.validate_value("salary", salary)
            if not is_valid:
                errors.append(error_msg)
        
        # 验证 technologies（数组）
        technologies = tag_dimensions.get("technologies", [])
        if technologies and not isinstance(technologies, list):
            errors.append("technologies 必须是数组类型")
        elif technologies:
            for tech in technologies:
                if not isinstance(tech, str) or not tech.strip():
                    errors.append("technologies 数组中的元素必须是非空字符串")
        
        # 验证 custom（数组）
        custom = tag_dimensions.get("custom", [])
        if custom and not isinstance(custom, list):
            errors.append("custom 必须是数组类型")
        elif custom:
            for tag in custom:
                if not isinstance(tag, str) or not tag.strip():
                    errors.append("custom 数组中的元素必须是非空字符串")
        
        return len(errors) == 0, errors, warnings
    
    def validate_and_normalize_post(self, post: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str], List[str]]:
        """
        验证并规范化整个 Post 对象
        
        Args:
            post: Post 对象
        
        Returns:
            (是否有效, 规范化后的 Post, 错误列表, 警告列表)
        """
        errors = []
        warnings = []
        normalized_post = post.copy()
        
        # 验证必需字段
        if "title" not in post or not post["title"]:
            errors.append("title 是必需字段")
        
        if "company" not in post or not post["company"]:
            errors.append("company 是必需字段")
        
        # 先规范化 tagDimensions
        tag_dimensions = post.get("tagDimensions", {}).copy()
        
        # 规范化各个字段
        if "category" in tag_dimensions and tag_dimensions["category"]:
            original = tag_dimensions["category"]
            normalized = self.normalize_value("category", original)
            if normalized != original and normalized:
                warnings.append(f"category 值 '{original}' 已规范化为 '{normalized}'")
                tag_dimensions["category"] = normalized
        
        if "recruitType" in tag_dimensions and tag_dimensions["recruitType"]:
            original = tag_dimensions["recruitType"]
            normalized = self.normalize_value("recruitType", original)
            if normalized != original and normalized:
                warnings.append(f"recruitType 值 '{original}' 已规范化为 '{normalized}'")
                tag_dimensions["recruitType"] = normalized
        
        if "experience" in tag_dimensions and tag_dimensions["experience"]:
            original = tag_dimensions["experience"]
            normalized = self.normalize_value("experience", original)
            if normalized != original and normalized:
                warnings.append(f"experience 值 '{original}' 已规范化为 '{normalized}'")
                tag_dimensions["experience"] = normalized
        
        if "salary" in tag_dimensions and tag_dimensions["salary"]:
            original = tag_dimensions["salary"]
            normalized = self.normalize_value("salary", original)
            if normalized != original and normalized:
                warnings.append(f"salary 值 '{original}' 已规范化为 '{normalized}'")
                tag_dimensions["salary"] = normalized
        
        # 验证规范化后的 tagDimensions
        is_valid, tag_errors, tag_warnings = self.validate_tag_dimensions(tag_dimensions)
        errors.extend(tag_errors)
        warnings.extend(tag_warnings)
        
        # 设置规范化后的 tagDimensions
        normalized_post["tagDimensions"] = tag_dimensions
        
        return len(errors) == 0, normalized_post, errors, warnings


# 便捷函数
def validate_tag_dimensions(tag_dimensions: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
    """验证 tagDimensions 对象（便捷函数）"""
    validator = TagValidator()
    return validator.validate_tag_dimensions(tag_dimensions)


def normalize_category(value: str) -> str:
    """规范化 category 值（便捷函数）"""
    validator = TagValidator()
    return validator.normalize_value("category", value)


def normalize_recruit_type(value: str) -> str:
    """规范化 recruitType 值（便捷函数）"""
    validator = TagValidator()
    return validator.normalize_value("recruitType", value)

