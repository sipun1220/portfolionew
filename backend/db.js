// Dual-database layer: MongoDB (primary) + SQLite (automatic fallback).
// Which DB is easy for a portfolio website?
// → SQLite. Zero config, single file (portfolio.db), no Atlas IP whitelist,
//    no passwords, no network. Data persists across restarts (unlike memory).
//    MongoDB Atlas is still used when MONGODB_URI works; if it fails/timeouts,
//    we seamlessly switch to local SQLite so the site never goes down.
const mongoose = require('mongoose');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const Project = require('./models/Project');
const Message = require('./models/Message');
const SiteContent = require('./models/SiteContent');

let mode = 'sqlite'; // 'mongodb' | 'sqlite'
let sqlite = null;

const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'portfolio.db');

function initSqlite() {
  sqlite = new DatabaseSync(DB_FILE);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      _id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      techs TEXT DEFAULT '[]',
      category TEXT DEFAULT 'fullstack',
      githubUrl TEXT DEFAULT '',
      liveUrl TEXT DEFAULT '',
      imageUrl TEXT DEFAULT '',
      imagePublicId TEXT DEFAULT '',
      mediaType TEXT DEFAULT 'image',
      featured INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT DEFAULT '',
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      internships TEXT NOT NULL DEFAULT '[]',
      updatedAt TEXT DEFAULT (datetime('now'))
    );
  `);
}

function rowToProject(r) {
  if (!r) return null;
  let techs = [];
  try { techs = JSON.parse(r.techs || '[]'); } catch { techs = String(r.techs || '').split(',').map(s => s.trim()).filter(Boolean); }
  return { ...r, techs, featured: !!r.featured };
}
function rowToMessage(r) {
  if (!r) return null;
  return { ...r, read: !!r.read };
}
function defaultInternships() {
  return [
    {
      id: 'bluestock-fintech',
      company: 'Bluestock Fintech',
      role: 'Data Analyst Intern',
      period: 'September — October 2026',
      project: 'Real-world fintech analytics work',
      contribution: 'Worked under project guidance to analyse business data, turn findings into useful insights and support data-informed decisions in a real fintech environment.',
      skills: ['Data analysis', 'Business insights', 'Fintech'],
      documents: ['bluestock-certificate'],
    },
    {
      id: 'dbert',
      company: 'DBERT',
      role: 'Full Stack Development Intern',
      period: 'June - August 2026 (2 months)',
      project: 'Alkame - Quantitative Market Intelligence & Conformal Prediction Platform',
      contribution: 'Contributed to the core engineering project through end-to-end milestone implementations, architectural debugging and collaborative delivery. Work passed code review, automated testing and plagiarism validation, earning 87/100 (Grade A+).',
      skills: ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'REST APIs', 'PostgreSQL', 'Docker'],
      documents: ['dbert-certificate', 'dbert-lor'],
    },
  ];
}
const uid = (p) => p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
const now = () => new Date().toISOString();

function seedSqliteIfEmpty() {
  const c = sqlite.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
  if (c > 0) return;
  const demos = [
    ['d1', 'MediShare — Emergency Medicine Platform', 'Location-aware medicine redistribution with per-user limits, emergency mode and push notifications. Node REST + MongoDB.', JSON.stringify(['React', 'Node.js', 'MongoDB', 'Geolocation']), 'fullstack', 'https://github.com/sipun1220', 'https://github.com/sipun1220', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80', '', 'image', 1, now()],
    ['d2', 'Cafe Management System', 'Order tracking, menu management and inventory with real-time Firebase sync.', JSON.stringify(['JavaScript', 'Firebase', 'HTML', 'CSS']), 'fullstack', 'https://github.com/sipun1220', 'https://github.com/sipun1220', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80', '', 'image', 1, now()],
    ['d3', 'Personal Portfolio Website', 'Responsive portfolio to showcase projects and skills.', JSON.stringify(['HTML', 'CSS', 'JavaScript']), 'frontend', 'https://github.com/sipun1220', 'https://github.com/sipun1220', 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80', '', 'image', 0, now()],
  ];
  const ins = sqlite.prepare(`INSERT INTO projects (_id,title,description,techs,category,githubUrl,liveUrl,imageUrl,imagePublicId,mediaType,featured,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const d of demos) ins.run(...d);
}

async function connect() {
  // REQUIRE_MONGODB=true → crash loudly instead of silently falling back to SQLite.
  const strict = String(process.env.REQUIRE_MONGODB || '').toLowerCase() === 'true';
  const fail = (msg) => { if (strict) throw new Error(msg); };
  initSqlite();
  seedSqliteIfEmpty();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    fail('REQUIRE_MONGODB=true but MONGODB_URI is missing in backend/.env');
    mode = 'sqlite';
    console.log('ℹ No MONGODB_URI in .env — using SQLite file:', DB_FILE);
    return mode;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    mode = 'mongodb';
    console.log('✓ MongoDB connected → db:', mongoose.connection.name, strict ? '| SQLite fallback DISABLED' : '| SQLite ready as fallback');
  } catch (e) {
    fail('MongoDB unreachable and REQUIRE_MONGODB=true — refusing SQLite fallback: ' + e.message);
    mode = 'sqlite';
    console.log('⚠ MongoDB failed, using SQLite fallback:', e.message);
    console.log('  Fix Atlas: Network Access → Allow 0.0.0.0/0. Your data is safe in portfolio.db meanwhile.');
  }
  return mode;
}

const db = {
  get mode() { return mode; },
  get isMongo() { return mode === 'mongodb'; },

  async listProjects() {
    if (mode === 'mongodb') return Project.find().sort({ createdAt: -1 }).lean();
    return sqlite.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all().map(rowToProject);
  },
  async createProject(doc) {
    if (mode === 'mongodb') return Project.create(doc);
    const p = { _id: uid('p'), createdAt: now(), updatedAt: now(), ...doc };
    sqlite.prepare(`INSERT INTO projects (_id,title,description,techs,category,githubUrl,liveUrl,imageUrl,imagePublicId,mediaType,featured,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(p._id, p.title, p.description, JSON.stringify(p.techs || []), p.category || 'fullstack', p.githubUrl || '', p.liveUrl || '', p.imageUrl || '', p.imagePublicId || '', 'image', p.featured ? 1 : 0, p.createdAt, p.updatedAt);
    return rowToProject(sqlite.prepare('SELECT * FROM projects WHERE _id=?').get(p._id));
  },
  async updateProject(id, data) {
    if (mode === 'mongodb') {
      const old = await Project.findById(id);
      if (!old) return null;
      return Project.findByIdAndUpdate(id, data, { new: true }).lean();
    }
    const cur = sqlite.prepare('SELECT * FROM projects WHERE _id=?').get(String(id));
    if (!cur) return null;
    const base = rowToProject(cur);
    const next = { ...base, ...data };
    if (Array.isArray(data.techs)) next.techs = data.techs;
    else if (typeof data.techs === 'string') next.techs = data.techs.split(',').map(s => s.trim()).filter(Boolean);
    sqlite.prepare(`UPDATE projects SET title=?,description=?,techs=?,category=?,githubUrl=?,liveUrl=?,imageUrl=?,imagePublicId=?,mediaType=?,featured=?,updatedAt=? WHERE _id=?`)
      .run(next.title, next.description, JSON.stringify(next.techs || []), next.category, next.githubUrl || '', next.liveUrl || '', next.imageUrl || '', next.imagePublicId || '', 'image', next.featured ? 1 : 0, now(), String(id));
    return rowToProject(sqlite.prepare('SELECT * FROM projects WHERE _id=?').get(String(id)));
  },
  async deleteProject(id) {
    if (mode === 'mongodb') return Project.findByIdAndDelete(id).lean();
    const cur = sqlite.prepare('SELECT * FROM projects WHERE _id=?').get(String(id));
    if (cur) sqlite.prepare('DELETE FROM projects WHERE _id=?').run(String(id));
    return cur ? rowToProject(cur) : null;
  },

  async listMessages() {
    if (mode === 'mongodb') return Message.find().sort({ createdAt: -1 }).lean();
    return sqlite.prepare('SELECT * FROM messages ORDER BY createdAt DESC').all().map(rowToMessage);
  },
  async getInternships() {
    if (mode === 'mongodb') {
      const content = await SiteContent.findOne({ key: 'portfolio' }).lean();
      return content?.internships?.length ? content.internships : defaultInternships();
    }
    const row = sqlite.prepare('SELECT internships FROM site_content WHERE key=?').get('portfolio');
    if (!row) {
      const internships = defaultInternships();
      sqlite.prepare('INSERT INTO site_content (key, internships, updatedAt) VALUES (?,?,?)').run('portfolio', JSON.stringify(internships), now());
      return internships;
    }
    try { return JSON.parse(row.internships); } catch { return defaultInternships(); }
  },
  async updateInternships(internships) {
    if (mode === 'mongodb') {
      return SiteContent.findOneAndUpdate(
        { key: 'portfolio' },
        { key: 'portfolio', internships },
        { new: true, upsert: true, runValidators: true },
      ).lean();
    }
    sqlite.prepare(`INSERT INTO site_content (key, internships, updatedAt) VALUES (?,?,?)
      ON CONFLICT(key) DO UPDATE SET internships=excluded.internships, updatedAt=excluded.updatedAt`)
      .run('portfolio', JSON.stringify(internships), now());
    return { key: 'portfolio', internships };
  },
  async createMessage({ name, email, subject, message }) {
    if (mode === 'mongodb') return Message.create({ name, email, subject, message });
    const m = { _id: uid('m'), name, email, subject: subject || '', message, createdAt: now() };
    sqlite.prepare('INSERT INTO messages (_id,name,email,subject,message,createdAt) VALUES (?,?,?,?,?,?)')
      .run(m._id, m.name, m.email, m.subject, m.message, m.createdAt);
    return m;
  },
  async deleteMessage(id) {
    if (mode === 'mongodb') { await Message.findByIdAndDelete(id); return true; }
    sqlite.prepare('DELETE FROM messages WHERE _id=?').run(String(id));
    return true;
  },
  async setMessageRead(id, read) {
    if (mode === 'mongodb') return Message.findByIdAndUpdate(id, { read: !!read }, { new: true }).lean();
    sqlite.prepare('UPDATE messages SET read=? WHERE _id=?').run(read ? 1 : 0, String(id));
    const r = sqlite.prepare('SELECT * FROM messages WHERE _id=?').get(String(id));
    return rowToMessage(r);
  },
  async stats() {
    if (mode === 'mongodb') {
      const [projects, featured, messages, unread] = await Promise.all([
        Project.countDocuments(), Project.countDocuments({ featured: true }),
        Message.countDocuments(), Message.countDocuments({ read: false }),
      ]);
      return { projects, featured, messages, unread, mode };
    }
    const g = (sql) => sqlite.prepare(sql).get().n;
    return {
      projects: g('SELECT COUNT(*) AS n FROM projects'),
      featured: g('SELECT COUNT(*) AS n FROM projects WHERE featured=1'),
      messages: g('SELECT COUNT(*) AS n FROM messages'),
      unread: g('SELECT COUNT(*) AS n FROM messages WHERE read=0'),
      mode,
    };
  },
};

module.exports = { connect, db };
