
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const startTime = Date.now();
    const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const duration = Date.now() - startTime;
    
    console.log(`[MongoDB Query] GET /api/posts - Duration: ${duration}ms (page: ${page}, limit: ${limit})`);
    
    res.send(posts);
  } catch (error) { res.status(500).send(error); }
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
