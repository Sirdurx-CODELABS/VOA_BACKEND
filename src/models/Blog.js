const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    image: { type: String },
    category: { type: String, default: 'General' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    readTime: { type: String, default: '5 min read' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
