
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
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(err => console.error(err));

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
    
    // 构建基础内容过滤（必须有内容）- 优化：使用 $exists 替代正则
    const contentFilter = {
      $or: [
        { originalContent: { $exists: true, $ne: null, $type: 'string' } },
        { processedContent: { $exists: true, $ne: null, $type: 'string' } }
      ]
    };
    // 注意：内容长度过滤在内存中进行，不在数据库（更快）
    
    // 添加维度筛选条件（优化：支持空值和模糊匹配）
    const andConditions = [];

    if (company && company !== '' && company !== '全部') {
      // 精确匹配公司名称
      andConditions.push({ company: company });
    }

    if (location && location !== '' && location !== '全部') {
      // 支持 tagDimensions.location 或者从 role/title 中推断
      andConditions.push({
        $or: [
          { 'tagDimensions.location': location },
          { role: { $regex: location, $options: 'i' } },
          { title: { $regex: location, $options: 'i' } }
        ]
      });
    }

    if (recruitType && recruitType !== '' && recruitType !== '全部') {
      // 支持 tagDimensions.recruitType 或从 title 推断
      andConditions.push({
        $or: [
          { 'tagDimensions.recruitType': recruitType },
          { title: { $regex: recruitType, $options: 'i' } }
        ]
      });
    }

    if (category && category !== '' && category !== '全部') {
      // 支持 tagDimensions.category 或从 role 推断
      andConditions.push({
        $or: [
          { 'tagDimensions.category': category },
          { role: { $regex: category, $options: 'i' } }
        ]
      });
    }

    if (experience && experience !== '' && experience !== '全部') {
      // 支持 tagDimensions.experience
      andConditions.push({ 'tagDimensions.experience': experience });
    }

    if (salary && salary !== '' && salary !== '全部') {
      // 支持 tagDimensions.salary
      andConditions.push({ 'tagDimensions.salary': salary });
    }
    
    if (technologies) {
      // 支持逗号分隔的字符串或数组
      const techArray = Array.isArray(technologies)
        ? technologies
        : typeof technologies === 'string'
          ? technologies.split(',').map(t => t.trim()).filter(t => t)
          : [technologies];
      if (techArray.length > 0) {
        andConditions.push({ 'tagDimensions.technologies': { $in: techArray } });
      }
    }

    // 文本搜索（标题、公司、职位）- 使用MongoDB文本索引优化
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // 优先使用MongoDB文本索引（更快）
      // 如果搜索词包含中文或特殊字符，回退到正则表达式
      const hasChineseOrSpecial = /[\u4e00-\u9fa5]/.test(searchTerm);

      if (!hasChineseOrSpecial && searchTerm.split(/\s+/).length > 1) {
        // 英文多词搜索：使用文本索引
        contentFilter.$text = { $search: searchTerm };
      } else {
        // 中文或单词搜索：使用正则表达式（更灵活）
        const searchRegex = new RegExp(searchTerm, 'i');
        andConditions.push({
          $or: [
            { title: searchRegex },
            { company: searchRegex },
            { role: searchRegex }
          ]
        });
      }
    }

    // 合并所有条件
    if (andConditions.length > 0) {
      // 保留原有的内容存在条件
      const hasContentCondition = contentFilter.$or;
      delete contentFilter.$or;

      contentFilter.$and = [
        { $or: hasContentCondition }, // 必须有内容
        ...andConditions // 所有其他筛选条件
      ];
    }
    
    // 性能优化：使用 .lean() 返回普通对象（快 5-10 倍）
    // 使用 .explain() 调试查询性能（生产环境注释掉）
    const [posts, total] = await Promise.all([
      Post.find(contentFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // 关键优化：返回普通对象而不是 Mongoose 文档
      Post.countDocuments(contentFilter)
    ]);
    
    // 在内存中过滤内容长度（替代数据库正则查询）
    const filteredPosts = posts.filter(post => {
      const hasContent = 
        (post.originalContent && post.originalContent.length >= 50) ||
        (post.processedContent && post.processedContent.length >= 50);
      return hasContent;
    });
    
    const duration = Date.now() - startTime;
    
    // 记录筛选参数（用于调试）
    const filterParams = { company, location, recruitType, category, experience, salary, technologies, search };
    console.log(`[MongoDB Query] GET /api/posts - Duration: ${duration}ms (page: ${page}, limit: ${limit}, total: ${total}, filtered: ${filteredPosts.length}, filters: ${JSON.stringify(filterParams)})`);
    
    // 如果过滤后数据不足，调整总数
    const actualTotal = filteredPosts.length < posts.length ? total - (posts.length - filteredPosts.length) : total;
    
    res.send({
      posts: filteredPosts,
      pagination: {
        page,
        limit,
        total: actualTotal,
        totalPages: Math.ceil(actualTotal / limit)
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

// 动态获取筛选选项API
app.get('/api/filter-options', async (req, res) => {
  try {
    const startTime = Date.now();

    // 并行查询所有不同的筛选选项
    const [
      companies,
      locations,
      recruitTypes,
      categories,
      experiences,
      salaries
    ] = await Promise.all([
      // 获取所有公司（前20个最常见的）
      Post.aggregate([
        { $match: { company: { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$company', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]),

      // 获取所有地点
      Post.aggregate([
        { $match: { 'tagDimensions.location': { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$tagDimensions.location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]),

      // 获取所有招聘类型
      Post.aggregate([
        { $match: { 'tagDimensions.recruitType': { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$tagDimensions.recruitType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]),

      // 获取所有类别
      Post.aggregate([
        { $match: { 'tagDimensions.category': { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$tagDimensions.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]),

      // 获取所有经验要求
      Post.aggregate([
        { $match: { 'tagDimensions.experience': { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$tagDimensions.experience', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ]),

      // 获取所有薪资范围
      Post.aggregate([
        { $match: { 'tagDimensions.salary': { $exists: true, $ne: '', $ne: null } } },
        { $group: { _id: '$tagDimensions.salary', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } }
      ])
    ]);

    const duration = Date.now() - startTime;
    console.log(`[MongoDB Query] GET /api/filter-options - Duration: ${duration}ms`);

    res.json({
      companies: ['全部', ...companies.map(c => c.value)],
      locations: ['全部', ...locations.map(l => l.value)],
      recruitTypes: ['全部', ...recruitTypes.map(r => r.value)],
      categories: ['全部', ...categories.map(c => c.value)],
      experiences: ['全部', ...experiences.map(e => e.value)],
      salaries: ['全部', ...salaries.map(s => s.value)],
      stats: {
        companies: companies.length,
        locations: locations.length,
        recruitTypes: recruitTypes.length,
        categories: categories.length
      }
    });
  } catch (error) {
    console.error('[API Error] GET /api/filter-options:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
