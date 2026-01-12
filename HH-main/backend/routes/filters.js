const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');

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
  TTL: 60 * 60 * 1000 // 1小时
};

/**
 * 计算筛选选项（合并配置文件和数据库实际值）
 */
async function computeFilterOptions() {
  const options = {};
  
  for (const [dimKey, dimConfig] of Object.entries(tagsConfig.dimensions || {})) {
    if (dimConfig.type === 'fixed') {
      // 固定维度：直接从配置读取
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
    } else {
      // 动态维度：合并配置文件预定义值和数据库实际值
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
      
      options[dimKey] = {
        label: dimConfig.label,
        labelEn: dimConfig.labelEn || dimConfig.label,
        type: 'dynamic',
        values: allValues.map(v => ({
          value: v,
          label: v
        }))
      };
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

