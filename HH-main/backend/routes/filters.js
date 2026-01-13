const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const TagValidator = require('../utils/tagValidator');
const fs = require('fs');
const path = require('path');

/**
 * 计算发布时间月份维度
 */
async function computePublishMonthDimension() {
  try {
    const startTime = Date.now();
    
    // 从数据库中获取所有帖子的创建时间，提取年月
    const months = await Post.aggregate([
      { $match: { createdAt: { $exists: true, $ne: null } } },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        }
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 24 } // 最多显示最近24个月
    ]);
    
    // 转换为 "YYYY-MM" 格式，并生成中文标签
    const monthOptions = months.map(item => {
      const year = item._id.year;
      const month = String(item._id.month).padStart(2, '0');
      const value = `${year}-${month}`;
      const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const label = `${year}年${monthNames[item._id.month - 1]}`;
      
      return {
        value: value,
        label: label
      };
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Filters] publishMonth 查询完成: ${duration}ms, 找到 ${monthOptions.length} 个月份`);
    
    return {
      label: '发布时间',
      labelEn: 'Publish Time',
      type: 'dynamic',
      values: monthOptions
    };
  } catch (e) {
    console.error(`[Filters] 查询 publishMonth 失败:`, e);
    return {
      label: '发布时间',
      labelEn: 'Publish Time',
      type: 'dynamic',
      values: []
    };
  }
}

// 尝试多个可能的配置文件路径
const possiblePaths = [
  path.join(__dirname, '../../../config/tags.json'),
  path.join(__dirname, '../../config/tags.json'),
  path.join(__dirname, '../../../../config/tags.json'),
  path.resolve(__dirname, '../../../config/tags.json')
];

let tagsConfig = { dimensions: {} };
let tagsConfigPath = null;

for (const configPath of possiblePaths) {
  try {
    if (fs.existsSync(configPath)) {
      tagsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tagsConfigPath = configPath;
      console.log(`[Filters] 已加载配置文件: ${configPath}`);
      break;
    }
  } catch (error) {
    console.warn(`[Filters] 无法加载配置文件 ${configPath}:`, error.message);
  }
}

if (!tagsConfigPath) {
  console.warn('[Filters] ⚠️  未找到 tags.json 配置文件，使用空配置');
}

// 内存缓存
const cache = {
  data: null,
  timestamp: 0,
  TTL: 2 * 60 * 60 * 1000 // 2小时（延长缓存时间，减少数据库查询）
};

// 强制清除缓存（用于调试）
function clearCache() {
  cache.data = null;
  cache.timestamp = 0;
  console.log('[Filters] 缓存已清除');
}

/**
 * 计算单个动态维度的筛选选项
 */
async function computeDynamicDimension(dimKey, dimConfig) {
  // 特殊处理：发布时间月份维度
  if (dimKey === 'publishMonth') {
    return await computePublishMonthDimension();
  }
  
  const fieldPath = dimKey === 'company' ? 'company' : `tagDimensions.${dimKey}`;
  
  let dbValues = [];
  try {
    const startTime = Date.now();
    // 性能优化：使用聚合管道替代 distinct（在某些情况下更快）
    const aggregationResult = await Post.aggregate([
      { $match: { [fieldPath]: { $exists: true, $ne: null } } }, // 只查询有值的文档
      { $group: { _id: `$${fieldPath}` } },
      { $match: { _id: { $ne: null, $ne: '', $ne: '全部' } } },
      { $sort: { _id: 1 } },
      { $limit: 1000 } // 限制结果数量，避免内存问题
    ]);
    dbValues = aggregationResult.map(r => r._id).filter(v => v && v.trim());
    const duration = Date.now() - startTime;
    console.log(`[Filters] ${dimKey} 查询完成: ${duration}ms, 找到 ${dbValues.length} 个唯一值`);
  } catch (e) {
    console.error(`[Filters] 查询 ${dimKey} 失败:`, e);
    // 降级到 distinct
    try {
      dbValues = await Post.distinct(fieldPath);
      dbValues = dbValues.filter(v => v && v.trim() && v !== '全部' && v !== '');
    } catch (distinctError) {
      console.error(`[Filters] distinct 也失败:`, distinctError);
    }
  }
  
  // 扁平化预定义值（如果是嵌套对象）
  let predefinedFlat = [];
  if (Array.isArray(dimConfig.predefined)) {
    predefinedFlat = dimConfig.predefined;
  } else if (typeof dimConfig.predefined === 'object') {
    predefinedFlat = Object.values(dimConfig.predefined).flat();
  }
  
  // 对于公司维度，进行严格的规范化处理
  if (dimKey === 'company') {
    const validator = new TagValidator();
    const normalizedValues = new Set();
    
    // 先添加所有预定义的标准公司名称
    predefinedFlat.forEach(v => normalizedValues.add(v));
    
    // 规范化数据库中的公司名称，只保留能映射到标准公司的名称
    dbValues.forEach(rawValue => {
      if (!rawValue || typeof rawValue !== 'string') return;
      
      const trimmedValue = rawValue.trim();
      if (!trimmedValue) return;
      
      // 尝试规范化
      const normalized = validator.normalizeValue('company', trimmedValue);
      
      // 只保留规范化后与预定义值匹配的公司名称
      if (normalized && predefinedFlat.includes(normalized)) {
        // 规范化成功且是标准公司名称，添加规范化后的值
        normalizedValues.add(normalized);
      } else if (predefinedFlat.includes(trimmedValue)) {
        // 如果已经是标准名称，直接添加
        normalizedValues.add(trimmedValue);
      }
      // 其他情况（无法规范化或不在预定义列表中）一律不添加
    });
    
    // 转换为数组并排序
    const allValues = Array.from(normalizedValues).sort((a, b) => {
      // 预定义值优先排序
      const aInPredefined = predefinedFlat.includes(a);
      const bInPredefined = predefinedFlat.includes(b);
      if (aInPredefined && !bInPredefined) return -1;
      if (!aInPredefined && bInPredefined) return 1;
      return String(a).localeCompare(String(b));
    });
    
    console.log(`[Filters] ${dimKey} 规范化后: ${dbValues.length} 个原始值 → ${allValues.length} 个标准值`);
    console.log(`[Filters] ${dimKey} 原始值示例:`, dbValues.slice(0, 10));
    console.log(`[Filters] ${dimKey} 规范化后的值:`, allValues);
    
    return {
      label: dimConfig.label,
      labelEn: dimConfig.labelEn || dimConfig.label,
      type: 'dynamic',
      values: allValues.map(v => ({
        value: v,
        label: v
      }))
    };
  }
  
  // 其他维度保持原有逻辑
  // 合并并去重
  const allValues = [...new Set([...predefinedFlat, ...dbValues])]
    .filter(v => v && v.trim())
    .sort((a, b) => {
      // 预定义值优先排序
      const aInPredefined = predefinedFlat.includes(a);
      const bInPredefined = predefinedFlat.includes(b);
      if (aInPredefined && !bInPredefined) return -1;
      if (!aInPredefined && bInPredefined) return 1;
      return String(a).localeCompare(String(b));
    });
  
  return {
    label: dimConfig.label,
    labelEn: dimConfig.labelEn || dimConfig.label,
    type: 'dynamic',
    values: allValues.map(v => ({
      value: v,
      label: v
    }))
  };
}

/**
 * 计算筛选选项（合并配置文件和数据库实际值）
 * 性能优化：并行执行所有动态维度的数据库查询
 */
async function computeFilterOptions() {
  const options = {};
  const dimensions = Object.entries(tagsConfig.dimensions || {});
  
  // 先处理固定维度（不需要数据库查询）
  const fixedDimensions = [];
  const dynamicDimensions = [];
  
  for (const [dimKey, dimConfig] of dimensions) {
    if (dimConfig.type === 'fixed') {
      fixedDimensions.push([dimKey, dimConfig]);
    } else {
      dynamicDimensions.push([dimKey, dimConfig]);
    }
  }
  
  // 处理固定维度（同步，很快）
  for (const [dimKey, dimConfig] of fixedDimensions) {
    options[dimKey] = {
      label: dimConfig.label,
      labelEn: dimConfig.labelEn || dimConfig.label,
      type: 'fixed',
      values: dimConfig.values.map(v => ({
        value: v.value,
        label: v.label,
        labelEn: v.labelEn || v.label
      }))
    };
  }
  
  // 并行处理所有动态维度（性能优化：同时查询多个维度）
  if (dynamicDimensions.length > 0) {
    const startTime = Date.now();
    const promises = dynamicDimensions.map(([dimKey, dimConfig]) => 
      computeDynamicDimension(dimKey, dimConfig).then(result => [dimKey, result])
    );
    
    try {
      const results = await Promise.all(promises);
      for (const [dimKey, result] of results) {
        options[dimKey] = result;
      }
      const totalDuration = Date.now() - startTime;
      console.log(`[Filters] ✅ 所有动态维度查询完成: ${totalDuration}ms (并行执行 ${dynamicDimensions.length} 个查询)`);
    } catch (error) {
      console.error('[Filters] ❌ 并行查询失败:', error);
      // 降级到串行执行
      for (const [dimKey, dimConfig] of dynamicDimensions) {
        try {
          options[dimKey] = await computeDynamicDimension(dimKey, dimConfig);
        } catch (e) {
          console.error(`[Filters] 查询 ${dimKey} 失败:`, e);
        }
      }
    }
  }
  
  return options;
}

/**
 * GET /api/filter-options
 * 获取筛选选项（带缓存）
 */
router.get('/filter-options', async (req, res) => {
  const now = Date.now();
  const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
  
  // 如果请求刷新，清除缓存
  if (refresh) {
    clearCache();
  }
  
  // 检查缓存
  if (!refresh && cache.data && (now - cache.timestamp < cache.TTL)) {
    console.log(`[Filters] 返回缓存数据 (缓存剩余时间: ${Math.round((cache.TTL - (now - cache.timestamp)) / 1000)}秒)`);
    return res.json(cache.data);
  }
  
  try {
    console.log('[Filters] 重新计算筛选选项...');
    const options = await computeFilterOptions();
    const response = {
      success: true,
      data: options,
      timestamp: now,
      fromCache: false
    };
    
    // 更新缓存
    cache.data = response;
    cache.timestamp = now;
    
    console.log('[Filters] ✅ 筛选选项计算完成');
    res.json(response);
  } catch (error) {
    console.error('[Filters] ❌ 计算筛选选项失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/filter-options/stats
 * 获取各筛选维度的统计数据（可选，用于调试）
 */
router.get('/filter-options/stats', async (req, res) => {
  try {
    const stats = {};
    
    // 统计各维度的数据量
    const dimensions = ['company', 'location', 'category', 'recruitType'];
    
    for (const dim of dimensions) {
      const fieldPath = dim === 'company' ? 'company' : `tagDimensions.${dim}`;
      try {
        const distinctValues = await Post.distinct(fieldPath);
        const counts = await Promise.all(
          distinctValues
            .filter(v => v && v.trim())
            .map(async (value) => {
              const count = await Post.countDocuments({
                [fieldPath]: value
              });
              return { value, count };
            })
        );
        stats[dim] = counts.sort((a, b) => b.count - a.count);
      } catch (e) {
        stats[dim] = { error: e.message };
      }
    }
    
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

