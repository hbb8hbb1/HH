/**
 * 标签验证模块 - 后端使用
 * 确保前后端值匹配，验证标签值是否符合规范
 */

const fs = require('fs');
const path = require('path');

// 标准值定义（必须与 Python validators.py 保持一致）
const STANDARD_VALUES = {
  category: ['SWE', 'Data', 'PM', 'Design', 'Infra', 'Other'],
  recruitType: ['intern', 'newgrad', 'experienced'],
  experience: ['0', '0-2', '2-5', '5-10', '10+'],
  salary: ['0-100k', '100k-150k', '150k-200k', '200k-300k', '300k+']
};

// 公司名称别名映射（必须与 config/tags.json 保持一致）
const COMPANY_ALIASES = {
  '谷歌': 'Google',
  '狗家': 'Google',
  'G家': 'Google',
  'g家': 'Google',
  '骨骼': 'Google',
  '狗狗家': 'Google',
  '狗云': 'Google',
  'GOOGLE': 'Google',
  'goog': 'Google',
  'GooGle': 'Google',
  '脸书': 'Meta',
  'Facebook': 'Meta',
  'FB': 'Meta',
  'fb': 'Meta',
  '买它': 'Meta',
  '买他': 'Meta',
  'buyit': 'Meta',
  'BuyIt': 'Meta',
  'BUYIT': 'Meta',
  'META': 'Meta',
  'meta': 'Meta'
};

// 别名映射（中文/其他格式 → 英文标准值）
const ALIAS_MAPPINGS = {
  company: COMPANY_ALIASES,  // 添加公司别名映射
  category: {
    '算法': 'Data',
    '数据': 'Data',
    '数据科学': 'Data',
    '数据分析': 'Data',
    '数据科学家': 'Data',
    '算法工程师': 'Data',
    '机器学习': 'Data',
    'AI': 'Data',
    '研发': 'SWE',
    '软件工程': 'SWE',
    '软件开发': 'SWE',
    '工程师': 'SWE',
    '开发': 'SWE',
    'Software Engineering': 'SWE',
    '产品': 'PM',
    '产品经理': 'PM',
    'PM': 'PM',
    'Product': 'PM',
    'Product Manager': 'PM',
    '设计': 'Design',
    '设计师': 'Design',
    'Design': 'Design',
    '基础设施': 'Infra',
    '运维': 'Infra',
    'DevOps': 'Infra',
    'SRE': 'Infra',
    'Infrastructure': 'Infra'
  },
  recruitType: {
    '实习': 'intern',
    '实习生': 'intern',
    'internship': 'intern',
    'Internship': 'intern',
    '暑期实习': 'intern',
    '日常实习': 'intern',
    '校招': 'newgrad',
    '应届': 'newgrad',
    '应届生': 'newgrad',
    'new grad': 'newgrad',
    'New Grad': 'newgrad',
    'entry level': 'newgrad',
    'junior': 'newgrad',
    '社招': 'experienced',
    'experienced': 'experienced',
    'Experienced': 'experienced',
    'senior': 'experienced',
    'staff': 'experienced'
  }
};

class TagValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 规范化标签值（将中文/其他格式转换为英文标准值）
   * @param {string} dimension - 维度名称（如 "category", "recruitType", "company"）
   * @param {string} value - 原始值（可能是中文或其他格式）
   * @returns {string} - 标准值（英文）
   */
  normalizeValue(dimension, value) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    value = value.trim();
    if (!value) {
      return '';
    }

    // 对于公司名称，特殊处理
    if (dimension === 'company') {
      // 先去除空格并转换为小写，用于匹配
      const valueNoSpaces = value.replace(/\s+/g, '').toLowerCase();
      const valueLower = value.toLowerCase();
      const valueTrimmed = value.trim();
      
      // 首先检查是否是预定义的标准公司名称（精确匹配，大小写不敏感）
      const standardCompanies = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'ByteDance', 'Alibaba', 'Tencent', 'Nvidia', 'OpenAI', 'Stripe', 'Airbnb', 'Uber', 'LinkedIn'];
      for (const company of standardCompanies) {
        if (company.toLowerCase() === valueLower || company.toLowerCase() === valueNoSpaces) {
          return company; // 返回标准大小写
        }
      }
      
      // 精确匹配别名（大小写不敏感，忽略空格）
      for (const [alias, standardValue] of Object.entries(COMPANY_ALIASES)) {
        const aliasLower = alias.toLowerCase();
        const aliasNoSpaces = aliasLower.replace(/\s+/g, '');
        if (aliasLower === valueLower || aliasNoSpaces === valueNoSpaces) {
          return standardValue;
        }
      }
      
      // 部分匹配：检查值是否包含别名（按长度排序，优先匹配长别名）
      // 例如："买它Ng"、"买它新鲜"、"买他"、"Buy It"、"BuyIt (E6)"等都应该匹配到"Meta"
      const sortedAliases = Object.entries(COMPANY_ALIASES).sort((a, b) => b[0].length - a[0].length);
      for (const [alias, standardValue] of sortedAliases) {
        const aliasLower = alias.toLowerCase();
        const aliasNoSpaces = aliasLower.replace(/\s+/g, '');
        // 如果值包含别名（如"买它Ng"包含"买它"），则规范化
        // 要求别名长度至少2个字符，避免单字符误匹配
        if (aliasLower.length >= 2) {
          // 检查原始值（带空格）和去除空格后的值
          if (valueLower.includes(aliasLower) || valueNoSpaces.includes(aliasNoSpaces)) {
            return standardValue;
          }
        }
      }
      
      // 无法映射，返回原值（但会被筛选逻辑过滤掉）
      return value;
    }

    // 首先检查是否已经是标准值
    if (STANDARD_VALUES[dimension] && STANDARD_VALUES[dimension].includes(value)) {
      return value;
    }

    // 使用别名映射转换
    if (ALIAS_MAPPINGS[dimension]) {
      const mapping = ALIAS_MAPPINGS[dimension];
      for (const [alias, standardValue] of Object.entries(mapping)) {
        if (alias.toLowerCase() === value.toLowerCase() || 
            alias.includes(value) || 
            value.includes(alias)) {
          return standardValue;
        }
      }
    }

    // 如果无法映射，返回原始值（验证时会标记为错误）
    return value;
  }

  /**
   * 验证标签值是否符合规范
   * @param {string} dimension - 维度名称
   * @param {string} value - 标签值
   * @param {boolean} required - 是否必需
   * @returns {{valid: boolean, error: string}} - 验证结果
   */
  validateValue(dimension, value, required = false) {
    // 空值处理
    if (!value || typeof value !== 'string' || !value.trim()) {
      if (required) {
        return { valid: false, error: `${dimension} 是必需字段，不能为空` };
      }
      return { valid: true, error: '' }; // 非必需字段可以为空
    }

    value = value.trim();

    // 验证标准值
    if (STANDARD_VALUES[dimension]) {
      if (!STANDARD_VALUES[dimension].includes(value)) {
        // 尝试规范化后再验证
        const normalized = this.normalizeValue(dimension, value);
        if (normalized !== value && STANDARD_VALUES[dimension].includes(normalized)) {
          return { 
            valid: false, 
            error: `${dimension} 值 '${value}' 应规范化为 '${normalized}'` 
          };
        }
        return { 
          valid: false, 
          error: `${dimension} 值 '${value}' 不在允许值列表中: ${STANDARD_VALUES[dimension].join(', ')}` 
        };
      }
    }

    return { valid: true, error: '' };
  }

  /**
   * 验证 tagDimensions 对象
   * @param {Object} tagDimensions - tagDimensions 对象
   * @returns {{valid: boolean, errors: Array<string>, warnings: Array<string>, normalized: Object}} - 验证结果
   */
  validateTagDimensions(tagDimensions) {
    const errors = [];
    const warnings = [];
    const normalized = { ...tagDimensions };

    if (!tagDimensions || typeof tagDimensions !== 'object') {
      return { valid: false, errors: ['tagDimensions 必须是对象类型'], warnings: [], normalized: {} };
    }

    // 验证 category（必需）
    const category = tagDimensions.category || '';
    const categoryResult = this.validateValue('category', category, true);
    if (!categoryResult.valid) {
      errors.push(categoryResult.error);
    } else if (category && !STANDARD_VALUES.category.includes(category)) {
      // 尝试规范化
      const normalizedCategory = this.normalizeValue('category', category);
      if (STANDARD_VALUES.category.includes(normalizedCategory)) {
        warnings.push(`category 值 '${category}' 已规范化为 '${normalizedCategory}'`);
        normalized.category = normalizedCategory;
      }
    }

    // 验证 recruitType（可选）
    const recruitType = tagDimensions.recruitType || '';
    if (recruitType) {
      const recruitTypeResult = this.validateValue('recruitType', recruitType);
      if (!recruitTypeResult.valid) {
        errors.push(recruitTypeResult.error);
      } else if (!STANDARD_VALUES.recruitType.includes(recruitType)) {
        const normalizedRecruitType = this.normalizeValue('recruitType', recruitType);
        if (STANDARD_VALUES.recruitType.includes(normalizedRecruitType)) {
          warnings.push(`recruitType 值 '${recruitType}' 已规范化为 '${normalizedRecruitType}'`);
          normalized.recruitType = normalizedRecruitType;
        }
      }
    }

    // 验证 experience（可选）
    const experience = tagDimensions.experience || '';
    if (experience) {
      const experienceResult = this.validateValue('experience', experience);
      if (!experienceResult.valid) {
        errors.push(experienceResult.error);
      }
    }

    // 验证 salary（可选）
    const salary = tagDimensions.salary || '';
    if (salary) {
      const salaryResult = this.validateValue('salary', salary);
      if (!salaryResult.valid) {
        errors.push(salaryResult.error);
      }
    }

    // 验证 technologies（数组）
    const technologies = tagDimensions.technologies || [];
    if (technologies && !Array.isArray(technologies)) {
      errors.push('technologies 必须是数组类型');
    } else if (technologies) {
      for (const tech of technologies) {
        if (typeof tech !== 'string' || !tech.trim()) {
          errors.push('technologies 数组中的元素必须是非空字符串');
          break;
        }
      }
    }

    // 验证 custom（数组）
    const custom = tagDimensions.custom || [];
    if (custom && !Array.isArray(custom)) {
      errors.push('custom 必须是数组类型');
    } else if (custom) {
      for (const tag of custom) {
        if (typeof tag !== 'string' || !tag.trim()) {
          errors.push('custom 数组中的元素必须是非空字符串');
          break;
        }
      }
    }

    normalized.technologies = normalized.technologies || [];
    normalized.custom = normalized.custom || [];

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalized
    };
  }

  /**
   * 验证并规范化整个 Post 对象
   * @param {Object} post - Post 对象
   * @returns {{valid: boolean, post: Object, errors: Array<string>, warnings: Array<string>}} - 验证结果
   */
  validateAndNormalizePost(post) {
    const errors = [];
    const warnings = [];
    const normalizedPost = { ...post };

    // 验证必需字段
    if (!post.title || !post.title.trim()) {
      errors.push('title 是必需字段');
    }

    if (!post.company || !post.company.trim()) {
      errors.push('company 是必需字段');
    }

    // 先规范化 tagDimensions
    const tagDimensions = { ...(post.tagDimensions || {}) };
    
    // 规范化各个字段
    if (tagDimensions.category) {
      const original = tagDimensions.category;
      const normalized = this.normalizeValue('category', original);
      if (normalized !== original && normalized) {
        warnings.push(`category 值 '${original}' 已规范化为 '${normalized}'`);
        tagDimensions.category = normalized;
      }
    }
    
    if (tagDimensions.recruitType) {
      const original = tagDimensions.recruitType;
      const normalized = this.normalizeValue('recruitType', original);
      if (normalized !== original && normalized) {
        warnings.push(`recruitType 值 '${original}' 已规范化为 '${normalized}'`);
        tagDimensions.recruitType = normalized;
      }
    }
    
    if (tagDimensions.experience) {
      const original = tagDimensions.experience;
      const normalized = this.normalizeValue('experience', original);
      if (normalized !== original && normalized) {
        warnings.push(`experience 值 '${original}' 已规范化为 '${normalized}'`);
        tagDimensions.experience = normalized;
      }
    }
    
    if (tagDimensions.salary) {
      const original = tagDimensions.salary;
      const normalized = this.normalizeValue('salary', original);
      if (normalized !== original && normalized) {
        warnings.push(`salary 值 '${original}' 已规范化为 '${normalized}'`);
        tagDimensions.salary = normalized;
      }
    }

    // 验证规范化后的 tagDimensions
    const tagDimensionsResult = this.validateTagDimensions(tagDimensions);
    errors.push(...tagDimensionsResult.errors);
    warnings.push(...tagDimensionsResult.warnings);
    
    // 设置规范化后的 tagDimensions
    normalizedPost.tagDimensions = tagDimensionsResult.normalized;

    return {
      valid: errors.length === 0,
      post: normalizedPost,
      errors,
      warnings
    };
  }
}

module.exports = TagValidator;
module.exports.STANDARD_VALUES = STANDARD_VALUES;
module.exports.ALIAS_MAPPINGS = ALIAS_MAPPINGS;

