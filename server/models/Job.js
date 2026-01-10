const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  role: String,
  location: String,
  salaryRange: String,
  type: { 
    type: String, 
    enum: ['social', 'campus', 'intern'],
    default: 'social'
  },
  description: String,
  tags: [String],
  applyLink: String,
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  authorIsPro: Boolean,
  // Simple favorites counter for now, or user-specific logic can be expanded later
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);