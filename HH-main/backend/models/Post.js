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
    recruitType: String,     // 招聘类型：intern, newgrad, experienced
    location: String,         // 地点，如 "北京"、"San Francisco Bay Area"
    category: String,        // 部门类别：SWE, Data, PM, Design, Infra, Other
    experience: String,      // 经验要求：0, 0-2, 2-5, 5-10, 10+
    salary: String,          // 薪资范围：0-100k, 100k-150k, 150k-200k, 200k-300k, 300k+
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
postSchema.index({ 'tagDimensions.experience': 1 });
postSchema.index({ 'tagDimensions.salary': 1 });
postSchema.index({ 'tagDimensions.technologies': 1 });  // 数组字段索引

// 复合索引：常见查询组合
postSchema.index({ company: 1, createdAt: -1 }); // 公司 + 时间排序
postSchema.index({ 'tagDimensions.location': 1, createdAt: -1 }); // 地点 + 时间排序
postSchema.index({ 'tagDimensions.category': 1, createdAt: -1 }); // 类别 + 时间排序

// 文本索引：用于全文搜索（可选，如果搜索频繁）
// postSchema.index({ title: 'text', company: 'text', role: 'text' });

module.exports = mongoose.model('Post', postSchema);