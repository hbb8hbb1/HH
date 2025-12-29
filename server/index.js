const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GoogleGenAI, Type, Schema } = require("@google/genai");
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');
const Job = require('./models/Job');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = 'gemini-3-flash-preview';

// Middleware
app.use(cors());
// Increase payload limit for large HTML imports sent by crawler
app.use(express.json({ limit: '50mb' }));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offermagnet';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// --- Auth Middleware ---
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
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// --- Helper: AI Processing Logic (Server Side) ---
const processWithGemini = async (rawText) => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      processedContent: { type: Type.STRING },
      company: { type: Type.STRING },
      role: { type: Type.STRING },
      difficulty: { type: Type.INTEGER },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["title", "processedContent", "company", "role", "difficulty", "tags"],
  };

  const prompt = `
    你是一位专业的互联网求职面经主编。
    你的任务是将用户提供的原始内容（包含HTML标签的网页源码）进行“清洗”和“润色”。
    
    **HTML处理规则**：
    1. 忽略 'jammer' 类的标签（反爬虫噪音）。
    2. 忽略广告、导航、CSS。
    3. 优先从 class="thread_subject" 提取标题，class="article_body" 提取正文。
    
    **输出要求**：
    1. 语言：简体中文。
    2. 格式：Markdown (使用 ## 分级标题)。
    3. 匿名化：移除个人隐私信息。
    4. 元数据：提取公司、职位、难度(1-5)、标签。

    原始输入内容:
    """
    ${rawText.substring(0, 30000)} 
    """
  `;
  // Limit input length to avoid token limits if HTML is massive

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    return JSON.parse(response.text);
  } catch (e) {
    console.error("AI Error:", e);
    // Fallback if AI fails, save as draft
    return {
      title: "导入的面经 (待处理)",
      processedContent: "AI 处理失败，请稍后手动编辑。\n\n" + rawText.substring(0, 500) + "...",
      company: "Unknown",
      role: "Unknown",
      difficulty: 3,
      tags: ["自动采集", "待处理"]
    };
  }
};

// --- Routes ---

// 1. Auth & User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.status(201).send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro }, token });
  } catch (error) {
    res.status(400).send({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);
    res.send({ user: { id: user._id, name: user.name, email: user.email, isPro: user.isPro }, token });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.send({ id: req.user._id, name: req.user.name, email: req.user.email, isPro: req.user.isPro });
});

app.post('/api/users/upgrade', auth, async (req, res) => {
  try {
    req.user.isPro = true;
    await req.user.save();
    res.send({ isPro: true });
  } catch (error) {
    res.status(500).send(error);
  }
});

// 2. Posts (Interviews)
app.post('/api/posts', auth, async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      authorId: req.user._id,
      authorName: req.user.name,
      authorIsPro: req.user.isPro
    });
    await post.save();
    res.status(201).send(post);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    res.send(posts);
  } catch (error) {
    res.status(500).send(error);
  }
});

// --- NEW ROUTE: Batch Import from Python Crawler ---
// This endpoint receives raw HTML, processes it with AI, and saves to DB
app.post('/api/batch-import', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) return res.status(400).send({error: 'HTML content required'});

    console.log("Received batch import request, processing with AI...");

    // 1. Process with AI
    const aiData = await processWithGemini(html);

    // 2. Assign to a system user (create one if not exists or use the first one)
    // For demo purposes, we'll try to find an 'admin' or just the first user
    let adminUser = await User.findOne({ email: 'admin@offermagnet.com' });
    if (!adminUser) {
        // Fallback: use first available user or create a placeholder
        adminUser = await User.findOne();
        if (!adminUser) {
             // Create a dummy admin if DB is empty
             const hashedPassword = await bcrypt.hash('admin123', 8);
             adminUser = new User({ name: 'System Admin', email: 'admin@offermagnet.com', password: hashedPassword, isPro: true });
             await adminUser.save();
        }
    }
    
    // 3. Save to DB
    const post = new Post({
      ...aiData,
      originalContent: html,
      authorId: adminUser._id, 
      authorName: adminUser.name,
      authorIsPro: true,
      tags: [...aiData.tags, '自动采集']
    });

    await post.save();
    console.log(`✅ Imported: ${aiData.title}`);
    res.status(201).send(post);

  } catch (error) {
    console.error("Batch import error", error);
    res.status(500).send({ error: error.message });
  }
});


// Add Comment
app.post('/api/posts/:id/comments', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send();

    const newComment = {
      authorId: req.user._id,
      authorName: req.user.name,
      authorIsPro: req.user.isPro,
      content: req.body.content,
      createdAt: new Date(),
      replies: []
    };

    if (req.body.parentId) {
      // Recursive finder
      const addReply = (comments) => {
        for (let comment of comments) {
          if (comment._id.toString() === req.body.parentId) {
            comment.replies.push(newComment);
            return true;
          }
          if (comment.replies && comment.replies.length > 0) {
            if (addReply(comment.replies)) return true;
          }
        }
        return false;
      };
      
      const found = addReply(post.comments);
      if (!found) return res.status(404).send({ error: 'Parent comment not found' });
      
      // CRITICAL: Mongoose doesn't always detect deep changes in mixed arrays
      post.markModified('comments'); 
    } else {
      post.comments.push(newComment);
    }

    await post.save();
    res.send(post);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
});

// Vote
app.post('/api/posts/:id/vote', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'useful' or 'useless'
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    // Remove existing votes
    post.upvoters = post.upvoters.filter(id => !id.equals(userId));
    post.downvoters = post.downvoters.filter(id => !id.equals(userId));

    if (type === 'useful') {
      post.upvoters.push(userId);
    } else if (type === 'useless') {
      post.downvoters.push(userId);
    }
    // If sent same type again, it acts as toggle off (already removed above)

    post.usefulVotes = post.upvoters.length;
    post.uselessVotes = post.downvoters.length;

    await post.save();
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Toggle Favorite (Post)
app.post('/api/posts/:id/favorite', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;
    
    const index = post.favoritedBy.indexOf(userId);
    if (index === -1) {
      post.favoritedBy.push(userId);
    } else {
      post.favoritedBy.splice(index, 1);
    }
    await post.save();
    res.send(post);
  } catch (error) {
    res.status(400).send(error);
  }
});

// 3. Jobs
app.post('/api/jobs', auth, async (req, res) => {
  try {
    const job = new Job({
      ...req.body,
      authorId: req.user._id,
      authorName: req.user.name,
      authorIsPro: req.user.isPro
    });
    await job.save();
    res.status(201).send(job);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(50);
    res.send(jobs);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/jobs/:id/favorite', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    const userId = req.user._id;
    const index = job.favoritedBy.indexOf(userId);
    if (index === -1) {
      job.favoritedBy.push(userId);
    } else {
      job.favoritedBy.splice(index, 1);
    }
    await job.save();
    res.send(job);
  } catch (error) {
    res.status(400).send(error);
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});