const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  id: { type: String, required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  period: { type: String, required: true },
  project: { type: String, required: true },
  contribution: { type: String, required: true },
  skills: { type: [String], default: [] },
  documents: { type: [String], default: [] },
}, { _id: false });

module.exports = mongoose.model('SiteContent', new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  internships: { type: [internshipSchema], default: [] },
}, { timestamps: true }));
