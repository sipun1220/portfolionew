// Seed demo projects into MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');

const demos = [
  { title: 'MediShare — Emergency Medicine Platform', description: 'Location-aware medicine redistribution: list unused medicines, nearby discovery, per-user limits, emergency mode + push notifications. Node REST + MongoDB.', techs: ['React', 'Node.js', 'MongoDB', 'Geolocation'], category: 'fullstack', githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', featured: true },
  { title: 'Cafe Management System', description: 'Order tracking, menu management and inventory with real-time Firebase sync.', techs: ['JavaScript', 'Firebase', 'HTML', 'CSS'], category: 'fullstack', githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80', featured: true },
  { title: 'Personal Portfolio Website', description: 'Responsive portfolio to showcase projects and skills — this site.', techs: ['HTML', 'CSS', 'JavaScript'], category: 'frontend', githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80' },
];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.log('Set MONGODB_URI in backend/.env first'); process.exit(1); }
  await mongoose.connect(uri);
  await Project.deleteMany({});
  await Project.insertMany(demos);
  console.log(`✓ Seeded ${demos.length} projects`);
  process.exit(0);
})();
