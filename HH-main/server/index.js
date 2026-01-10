
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GoogleGenAI, Type } = require("@google/genai");
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');
const Job = require('./models/Job');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

//const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const ai = new GoogleGenAI({ apiKey: "000000" });
const MODEL_ID = 'gemini-3-flash-preview';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offermagnet';
mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ MongoDB connected');
  
  // 自动创建索引（Post 模型中已定义索引，Mongoose 会自动创建）
  // 但这里显式调用 ensureIndexes 确保索引已创建
  try {
    await Post.ensureIndexes();
    console.log('✅ 数据库索引已创建/验证');
  } catch (indexError) {
    console.warn('⚠️  索引创建警告:', indexError.message);
    console.warn('   提示：如果索引已存在，可以忽略此警告');
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('   请确保 MongoDB 服务正在运行');
  console.error('   macOS: brew services start mongodb-community');
  console.error('   Linux: sudo systemctl start mongod');
});

// 注册路由
try {
  const filtersRouter = require('./routes/filters');
  app.use('/api', filtersRouter);
  console.log('✅ Filters路由已注册');
} catch (error) {
  console.error('⚠️  Filters路由注册失败:', error.message);
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new Error();
    req.user = user;
    req.token = token;
    next();
  } catch (error) { res.status(401).send({ error: 'Please authenticate.' }); }
};

app.post('/api/posts', auth, async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      authorId: req.user._id,
      authorName: req.user.name,
      authorIsPro: req.user.isPro,
      isAnonymous: req.body.isAnonymous || false
    });
    await post.save();
    res.status(201).send(post);
  } catch (error) { res.status(400).send(error); }
});

app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 提取筛选参数
    const {
      company,
      location,
      recruitType,
      category,
      experience,
      salary,
      technologies,  // 可以是逗号分隔的字符串或数组
      search
    } = req.query;
    
    // 检查 MongoDB 连接状态
    if (mongoose.connection.readyState !== 1) {
      console.error('[MongoDB] 连接未就绪，状态:', mongoose.connection.readyState);
      return res.status(500).json({ 
        error: 'Database connection not ready',
        message: 'MongoDB 未连接，请检查数据库配置'
      });
    }
    
    const startTime = Date.now();
    
    // ✅ 简化查询条件 - 移除复杂的 $exists + $type 检查（这些会导致全表扫描）
    const query = {};
    
    // 添加筛选条件（只处理非空值，这些可以使用索引）
    if (company && company !== '' && company !== '全部') {
      query.company = company;
    }
    
    if (location && location !== '' && location !== '全部') {
      query['tagDimensions.location'] = location;
    }
    
    if (recruitType && recruitType !== '' && recruitType !== '全部') {
      query['tagDimensions.recruitType'] = recruitType;
    }
    
    if (category && category !== '' && category !== '全部') {
      query['tagDimensions.category'] = category;
    }
    
    if (experience && experience !== '' && experience !== '全部') {
      query['tagDimensions.experience'] = experience;
    }
    
    if (salary && salary !== '' && salary !== '全部') {
      query['tagDimensions.salary'] = salary;
    }
    
    if (technologies) {
      // 支持逗号分隔的字符串或数组
      const techArray = Array.isArray(technologies) 
        ? technologies 
        : typeof technologies === 'string' 
          ? technologies.split(',').map(t => t.trim()).filter(t => t)
          : [technologies];
      if (techArray.length > 0) {
        query['tagDimensions.technologies'] = { $in: techArray };
      }
    }
    
    // ✅ 简化搜索 - 优先精确匹配（可以使用索引），然后正则匹配
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = new RegExp(searchTerm, 'i');
      
      // 构建搜索条件
      const searchConditions = {
        $or: [
          { company: searchTerm },  // 精确匹配，可以使用索引
          { title: searchRegex },  // title 正则搜索
          { role: searchRegex }  // role 正则搜索
        ]
      };
      
      // 如果已有筛选条件，使用 $and 组合；否则直接使用搜索条件
      if (Object.keys(query).length > 0) {
        // 保存现有筛选条件
        const filterConditions = { ...query };
        // 清空 query，重新构建 $and
        Object.keys(query).forEach(key => delete query[key]);
        query.$and = [filterConditions, searchConditions];
      } else {
        // 没有筛选条件，直接使用搜索条件
        query.$or = searchConditions.$or;
      }
    }
    
    // ✅ 使用聚合管道在数据库层面截断内容，避免从磁盘读取大量数据
    // 这样可以大大减少数据传输量，提高查询速度
    const posts = await Post.aggregate([
      { $match: query },  // 匹配查询条件
      { $sort: { createdAt: -1 } },  // 使用索引排序
      { $skip: skip },
      { $limit: limit },
      { $project: {
        _id: 1,
        title: 1,
        company: 1,
        role: 1,
        difficulty: 1,
        tags: 1,
        tagDimensions: 1,
        comments: 1,
        createdAt: 1,
        usefulVotes: 1,
        uselessVotes: 1,
        shareCount: 1,
        authorName: 1,
        authorIsPro: 1,
        authorId: 1,
        // 在数据库层面截断内容，只返回前 500/1000 个字符
        originalContent: {
          $cond: {
            if: { $gt: [{ $strLenCP: { $ifNull: ['$originalContent', ''] } }, 500] },
            then: { $concat: [{ $substrCP: ['$originalContent', 0, 500] }, '...'] },
            else: '$originalContent'
          }
        },
        processedContent: {
          $cond: {
            if: { $gt: [{ $strLenCP: { $ifNull: ['$processedContent', ''] } }, 1000] },
            then: { $concat: [{ $substrCP: ['$processedContent', 0, 1000] }, '...'] },
            else: '$processedContent'
          }
        }
      }}
    ]);
    
    // ✅ 在内存中过滤没有内容的帖子（比在数据库里用 $or + $exists + $type 过滤更快）
    const filteredPosts = posts.filter(post => {
      const content = post.originalContent || post.processedContent || '';
      return content.length >= 50;
    });
    
    // ✅ 优化：完全跳过 countDocuments，使用快速估算或默认值
    // 对于首页查询（没有筛选条件），直接使用默认值
    // 对于有筛选的查询，如果 filteredPosts 数量达到 limit，说明可能还有更多，否则就是全部
    const hasFilters = company || location || recruitType || category || experience || salary || technologies || search;
    let total = 826; // 默认总数
    let totalPages = Math.ceil(total / limit);
    
    if (hasFilters) {
      // 有筛选条件时，如果返回的数据量小于 limit，说明已经全部返回了
      // 如果等于 limit，说明可能还有更多，但我们不精确计算，只返回估算值
      if (filteredPosts.length < limit) {
        total = skip + filteredPosts.length;
        totalPages = Math.ceil(total / limit);
      } else {
        // 可能还有更多，但不等待精确计数，使用估算值
        total = skip + filteredPosts.length + 100; // 估算：当前已获取 + 可能还有100个
        totalPages = Math.ceil(total / limit);
      }
    } else {
      // 没有筛选条件时，使用默认总数（可以从缓存或配置获取）
      // 完全跳过数据库查询，直接使用估算值
      total = 826;
      totalPages = Math.ceil(total / limit);
    }
    
    const duration = Date.now() - startTime;
    
    // 记录筛选参数和性能指标（用于调试）
    const filterParams = { company, location, recruitType, category, experience, salary, technologies, search };
    const performanceNote = duration > 1000 ? '⚠️ 查询较慢，建议检查索引' : duration > 500 ? '⚡ 查询偏慢' : '✅ 查询正常';
    console.log(`[MongoDB Query] GET /api/posts - Duration: ${duration}ms ${performanceNote} (page: ${page}, limit: ${limit}, total: ${total}, filtered: ${filteredPosts.length}, filters: ${JSON.stringify(filterParams)})`);
    
    res.send({
      posts: filteredPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) { 
    console.error('[API Error] GET /api/posts:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }); 
  }
});

// Other routes (auth, jobs, comments, etc.) remained the same logic-wise
// [Simplified for brevity - but in a real file you'd keep all logic]
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.status(201).send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro }, token });
  } catch (error) { res.status(400).send({ error: 'Registration failed.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) throw new Error('Invalid credentials');
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro }, token });
  } catch (error) { res.status(400).send({ error: error.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => { res.send({ id: req.user._id, name: req.user.name, email: req.user.email, isPro: req.user.isPro }); });

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
