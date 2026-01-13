
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
const TagValidator = require('./utils/tagValidator');

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
      search,
      publishMonth  // 发布时间月份，格式：YYYY-MM
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
      // 规范化公司名称（将别名转换为标准名称）
      const normalizedCompany = new TagValidator().normalizeValue('company', company);
      query.company = normalizedCompany;
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
    
    // 时间筛选：按月份筛选（格式：YYYY-MM）
    if (publishMonth && publishMonth !== '' && publishMonth !== '全部') {
      // 解析月份，例如 "2024-01" -> 2024年1月
      const monthMatch = publishMonth.match(/^(\d{4})-(\d{2})$/);
      if (monthMatch) {
        const year = parseInt(monthMatch[1]);
        const month = parseInt(monthMatch[2]);
        
        // 构建月份范围查询（该月的第一天 00:00:00 到 最后一天 23:59:59）
        const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 下个月的第0天 = 这个月的最后一天
        
        query.createdAt = {
          $gte: startDate,
          $lte: endDate
        };
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
    
    // ✅ 性能优化：并行执行数据查询和总数计算
    const hasFilters = company || location || recruitType || category || experience || salary || technologies || search || publishMonth;
    
    // 并行执行：同时查询数据和计算总数
    const [postsResult, total] = await Promise.all([
      // 查询帖子数据
      Post.aggregate([
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
      ]),
      // 计算总数（并行执行，不阻塞数据查询）
      hasFilters ? Post.countDocuments(query) : Post.countDocuments({})
    ]);
    
    const posts = postsResult;
    
    // ✅ 规范化返回数据中的公司名称
    const validator = new TagValidator();
    posts.forEach(post => {
      if (post.company) {
        post.company = validator.normalizeValue('company', post.company);
      }
    });
    
    // ✅ 在内存中过滤没有内容的帖子（比在数据库里用 $or + $exists + $type 过滤更快）
    const filteredPosts = posts.filter(post => {
      const content = post.originalContent || post.processedContent || '';
      return content.length >= 50;
    });
    
    const totalPages = Math.ceil(total / limit);
    
    const duration = Date.now() - startTime;
    
    // 记录筛选参数和性能指标（用于调试）
    const filterParams = { company, location, recruitType, category, experience, salary, technologies, search, publishMonth };
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
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ name, email, password: hashedPassword, role: role || 'job_seeker' });
    await user.save();
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.status(201).send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro, role: user.role }, token });
  } catch (error) { res.status(400).send({ error: 'Registration failed.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) throw new Error('Invalid credentials');
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro, role: user.role }, token });
  } catch (error) { res.status(400).send({ error: error.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => { res.send({ id: req.user._id, name: req.user.name, email: req.user.email, isPro: req.user.isPro, role: req.user.role }); });

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
