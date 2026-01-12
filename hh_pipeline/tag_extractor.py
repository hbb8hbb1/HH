#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
标签提取器 - 从标题、内容、角色中提取结构化标签

功能：
1. 读取 config/tags.json 配置文件
2. 实现数据清洗和规范化
3. 提取所有标签维度（company, location, category, recruitType, experience, salary）
"""

import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List


class TagExtractor:
    def __init__(self, config_path: str = None):
        """初始化标签提取器，加载配置文件"""
        if config_path is None:
            # 自动查找配置文件
            possible_paths = [
                Path(__file__).parent.parent / "config" / "tags.json",
                Path(__file__).parent / "config" / "tags.json",
                Path(__file__).parent.parent.parent / "config" / "tags.json",
                Path("../config/tags.json"),
                Path("./config/tags.json"),
            ]
            for p in possible_paths:
                if p.exists():
                    config_path = str(p)
                    break
        
        if config_path is None or not Path(config_path).exists():
            raise FileNotFoundError(f"Cannot find tags.json config file. Tried: {possible_paths}")
        
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        self.dimensions = self.config['dimensions']
    
    def extract_all(self, title: str, content: str = "", role: str = "") -> Dict[str, Any]:
        """从标题、内容、角色中提取所有标签"""
        text = f"{title} {content} {role}".lower()
        
        return {
            "company": self._extract_company(title, text),
            "location": self._extract_location(text),
            "category": self._extract_category(text),
            "recruitType": self._extract_recruit_type(text),
            "experience": self._extract_experience(text),
            "salary": self._extract_salary(text),
            "technologies": self._extract_technologies(text)  # 技术栈作为数组
        }
    
    def _normalize_value(self, raw: str, dimension: str) -> str:
        """规范化标签值，防止重复: 去除首尾空格, 匹配别名"""
        if not raw:
            return ""
        cleaned = raw.strip()
        dim = self.dimensions.get(dimension, {})
        aliases = dim.get('aliases', {})
        
        # 检查别名映射（精确匹配）
        cleaned_lower = cleaned.lower()
        for alias, standard in aliases.items():
            if alias.lower() == cleaned_lower:
                return standard
        
        # 对于公司名称，也检查是否包含别名（部分匹配）
        if dimension == 'company':
            # 按长度排序，优先匹配较长的别名
            sorted_aliases = sorted(aliases.items(), key=lambda x: len(x[0]), reverse=True)
            for alias, standard in sorted_aliases:
                if alias.lower() in cleaned_lower or cleaned_lower in alias.lower():
                    return standard
        
        return cleaned
    
    def _extract_company(self, title: str, text: str) -> str:
        """提取公司名称（支持谐音和别名识别）"""
        dim = self.dimensions['company']
        text_lower = text.lower()
        title_lower = title.lower()
        combined_text = f"{title_lower} {text_lower}"
        
        # 1. 先检查别名（使用单词边界匹配，避免部分匹配错误）
        # 按长度排序，优先匹配较长的别名（避免"买"匹配到"买它"）
        sorted_aliases = sorted(dim['aliases'].items(), key=lambda x: len(x[0]), reverse=True)
        for alias, standard in sorted_aliases:
            alias_lower = alias.lower()
            # 使用单词边界或独立出现来匹配
            pattern = r'\b' + re.escape(alias_lower) + r'\b'
            if re.search(pattern, combined_text, re.IGNORECASE):
                return standard
        
        # 2. 检查预定义公司（使用单词边界匹配）
        for company in dim['predefined']:
            company_lower = company.lower()
            pattern = r'\b' + re.escape(company_lower) + r'\b'
            if re.search(pattern, combined_text, re.IGNORECASE):
                return company
        
        # 3. 从标题提取（常见格式：公司名 - 岗位名）
        title_parts = re.split(r'[\-\|·]', title)
        if title_parts:
            potential_company = title_parts[0].strip()
            normalized = self._normalize_value(potential_company, 'company')
            if normalized:
                return normalized
        
        return ""
    
    def _extract_location(self, text: str) -> str:
        """提取地点"""
        dim = self.dimensions['location']
        
        # 1. 检查别名
        for alias, standard in dim['aliases'].items():
            if alias.lower() in text:
                return standard
        
        # 2. 检查预定义地点（扁平化处理）
        predefined_flat = []
        if isinstance(dim['predefined'], dict):
            for region, locations in dim['predefined'].items():
                predefined_flat.extend(locations)
        else:
            predefined_flat = dim['predefined']
        
        for loc in predefined_flat:
            if loc.lower() in text:
                return loc
        
        return ""
    
    def _extract_category(self, text: str) -> str:
        """提取岗位类别"""
        dim = self.dimensions['category']
        
        # 按优先级匹配（SWE 优先级最高）
        for cat in dim['values']:
            for keyword in cat['keywords']:
                # 使用单词边界匹配，避免部分匹配
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                if re.search(pattern, text, re.IGNORECASE):
                    return cat['value']
        
        return "Other"
    
    def _extract_recruit_type(self, text: str) -> str:
        """提取招聘类型"""
        dim = self.dimensions['recruitType']
        
        for rt in dim['values']:
            for keyword in rt['keywords']:
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                if re.search(pattern, text, re.IGNORECASE):
                    return rt['value']
        
        return ""
    
    def _extract_experience(self, text: str) -> str:
        """提取经验要求"""
        # 匹配 "X years" 或 "X年"
        patterns = [
            (r'(\d+)\+?\s*(?:years?|yrs?|年)', lambda m: self._map_years(int(m.group(1)))),
            (r'(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?|年)', lambda m: self._map_years_range(int(m.group(1)), int(m.group(2)))),
            (r'\b(?:entry\s*level|junior|无经验|应届)\b', lambda m: "0"),
            (r'\b(?:senior|高级|sr\.?)\b', lambda m: "5-10"),
            (r'\b(?:staff|principal|lead)\b', lambda m: "10+"),
        ]
        
        for pattern, mapper in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return mapper(match)
                except:
                    continue
        
        return ""
    
    def _map_years(self, years: int) -> str:
        """将年数映射到经验范围"""
        if years == 0:
            return "0"
        elif years <= 2:
            return "0-2"
        elif years <= 5:
            return "2-5"
        elif years <= 10:
            return "5-10"
        else:
            return "10+"
    
    def _map_years_range(self, min_y: int, max_y: int) -> str:
        """将年数范围映射到经验范围"""
        avg = (min_y + max_y) / 2
        return self._map_years(int(avg))
    
    def _extract_salary(self, text: str) -> str:
        """提取薪资范围"""
        patterns = [
            (r'\$(\d{2,3})k\b', lambda m: int(m.group(1)) * 1000),
            (r'\$(\d{1,3}),?(\d{3})\s*k?\b', lambda m: int(m.group(1)) * 1000 + (int(m.group(2)) if m.group(2) else 0)),
        ]
        
        for pattern, extractor in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    salary = extractor(match)
                    return self._map_salary(salary)
                except:
                    continue
        
        return ""
    
    def _map_salary(self, salary: int) -> str:
        """将薪资映射到薪资范围"""
        ranges = self.dimensions['salary']['values']
        
        for r in ranges:
            if r['max'] is None:
                if salary >= r['min']:
                    return r['value']
            else:
                if r['min'] <= salary < r['max']:
                    return r['value']
        
        return ""
    
    def _extract_technologies(self, text: str) -> List[str]:
        """提取技术栈（基础实现，可根据需要扩展）"""
        # 常见技术栈关键词
        tech_keywords = [
            "React", "Vue", "Angular", "TypeScript", "JavaScript", "Python", "Java", "Go", "C++", "C#",
            "Node.js", "Spring", "Django", "Flask", "PyTorch", "TensorFlow", "Keras", "Scikit-learn",
            "MongoDB", "MySQL", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes",
            "AWS", "Azure", "GCP", "Linux", "Git"
        ]
        
        technologies = []
        text_lower = text.lower()
        
        for tech in tech_keywords:
            if tech.lower() in text_lower:
                technologies.append(tech)
        
        # 去重并保持顺序
        seen = set()
        result = []
        for tech in technologies:
            tech_lower = tech.lower()
            if tech_lower not in seen:
                seen.add(tech_lower)
                result.append(tech)
        
        return result[:10]  # 最多返回10个

