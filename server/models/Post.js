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
  tags: [String],
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

module.exports = mongoose.model('Post', postSchema);