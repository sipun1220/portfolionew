const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  techs: { type: [String], default: [] },
  category: { type: String, enum: ['frontend', 'backend', 'fullstack'], default: 'fullstack' },
  githubUrl: { type: String, default: '' },
  liveUrl: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'file', ''], default: '' },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

// Explicit collection name 'project' to match existing Atlas table
// (Mongoose would default to 'projects' plural otherwise)
module.exports = mongoose.model('Project', projectSchema, 'project');
