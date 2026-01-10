const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  authorIsPro: Boolean,
  content: String,
  createdAt: { type: Date, default: Date.now },
  replies: [] // Keeping it flexible for now, or define recursive if strict
});
// Self-reference for replies if needed specifically
commentSchema.add({ replies: [commentSchema] });

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalContent: String,
  processedContent: String,
  company: String,
  role: String,
  difficulty: { type: Number, min: 1, max: 5 },
  tags: [String],  // 保留向后兼容
  // 结构化标签维度
  tagDimensions: {
    technologies: [String],  // 技术栈数组，如 ["React", "TypeScript"]
    recruitType: String,     // 招聘类型：校招、社招、暑期实习、日常实习、其他
    location: String,         // 地点，如 "北京"、"上海"
    category: String,        // 部门类别：研发、算法、产品等
    subRole: String,         // 子角色：前端、后端、机器学习等
    custom: [String]         // 自定义标签数组
  },
  comments: [commentSchema],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorIsPro: Boolean,
  
  // Voting
  usefulVotes: { type: Number, default: 0 },
  uselessVotes: { type: Number, default: 0 },
  upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who voted useful
  downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who voted useless

  shareCount: { type: Number, default: 0 },
  
  // Favorites
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  createdAt: { type: Date, default: Date.now }
});

// 添加索引以加速排序查询
postSchema.index({ createdAt: -1 }); // 降序索引，用于 sort({ createdAt: -1 })

// 为 tagDimensions 字段添加索引以加速筛选
postSchema.index({ company: 1 });  // 公司索引
postSchema.index({ 'tagDimensions.location': 1 });
postSchema.index({ 'tagDimensions.recruitType': 1 });
postSchema.index({ 'tagDimensions.category': 1 });
postSchema.index({ 'tagDimensions.subRole': 1 });
postSchema.index({ 'tagDimensions.technologies': 1 });  // 数组字段索引

module.exports = mongoose.model('Post', postSchema);