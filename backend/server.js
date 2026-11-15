// Portfolio backend — Express + MongoDB (primary) + SQLite (automatic fallback)
// Uploads: PROJECT IMAGES ONLY → Cloudinary (folder portfolio/images).
// Project files (pdf/zip/etc.) are NOT stored — only the cover image shown in frontend.
// Portfolio documents (resume/result/certificate/LOR) → Cloudinary (portfolio/documents),
// served through signed /api/documents routes — never stored on local disk.
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
// Explicit path so .env loads whether started from backend/ or repo root (hosts run repo root).
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connect, db } = require('./db');
const { listDocuments, getDocument, signedUrl } = require('./documents');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

app.set('trust proxy', 1); // correct client IPs behind Render/Railway proxies

// CORS: same-origin needs no header; allow local dev + explicit FRONTEND_URL(s).
// Set FRONTEND_URL in host env if the frontend is deployed on a different
// domain (comma-separated). Single-service deploys need nothing.
const FRONTEND_URLS = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    if (FRONTEND_URLS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked for ' + origin));
  },
}));
app.use(express.json({ limit: '1mb' }));

// Simple shared-secret guard for all mutating admin routes.
// Public site can READ projects; only the dashboard (with key) can write.
function requireAdmin(req, res, next) {
  if (req.method === 'GET') return next();
  if (req.headers['x-admin-key'] === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized — open Site manager and unlock with your admin key.' });
}
function requireAdminKey(req, res, next) {
  if (req.headers['x-admin-key'] === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized — admin key required.' });
}
app.use('/api/projects', requireAdmin);
app.use('/api/messages', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/') return next(); // public contact form
  if (req.method === 'GET' && req.path === '/') {
    // public read not needed, but allow with key only for inbox privacy
    if (req.headers['x-admin-key'] === ADMIN_KEY) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return requireAdmin(req, res, next);
});

// ---- Cloudinary (project cover images only) ----
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cloudinaryReady = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a project cover

function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const safe = String(filename || 'cover').replace(/\s+/g, '-').replace(/\.[^.]+$/, '').replace(/[^\w\-]/g, '').slice(0, 60) || 'cover';
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'portfolio/images',
        resource_type: 'image', // images only — no video/raw files
        public_id: `${Date.now()}-${safe}`,
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Multer: accept images only, 5MB max. Rejects pdf/zip/video/etc. immediately.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_, file, cb) => {
    if (IMAGE_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files allowed (jpg, png, webp, gif, avif, svg). Project files are not stored.'));
  },
});

async function handleImageUpload(file) {
  if (!file) return {};
  if (!cloudinaryReady) {
    const err = new Error('Image upload needs Cloudinary creds in backend/.env (CLOUDINARY_*). Paste an Image URL instead.');
    err.status = 503;
    throw err;
  }
  const result = await uploadToCloudinary(file.buffer, file.originalname || 'cover');
  return { imageUrl: result.secure_url, imagePublicId: result.public_id };
}

async function destroyImage(publicId) {
  if (!publicId || !cloudinaryReady) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (e) { console.log('Cloudinary delete note:', e.message); }
}

// Serve frontend (so one server can host everything)
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', (_, res) => res.json({ ok: true, db: db.mode, cloudinary: cloudinaryReady, uploads: 'images-only', time: new Date() }));

// ---- Documents (PDFs stored in Cloudinary, served via signed URLs) ----
app.get('/api/documents', (_, res) => {
  if (!cloudinaryReady) return res.status(503).json({ error: 'Cloudinary is not configured.' });
  try { res.json(listDocuments()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/documents/:id/view', (req, res) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).send('Document not found');
  if (!cloudinaryReady) return res.status(503).send('Cloudinary is not configured.');
  res.redirect(302, signedUrl(doc, false));
});

app.get('/api/documents/:id/download', (req, res) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).send('Document not found');
  if (!cloudinaryReady) return res.status(503).send('Cloudinary is not configured.');
  res.redirect(302, signedUrl(doc, true));
});

app.get('/api/stats', requireAdminKey, async (_, res) => {
  try { res.json(await db.stats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/content/internships', async (_, res) => {
  try { res.json(await db.getInternships()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/content/internships', requireAdminKey, async (req, res) => {
  try {
    if (!Array.isArray(req.body.internships)) return res.status(400).json({ error: 'Internships must be an array.' });
    const internships = req.body.internships.map((item, index) => {
      const required = ['id', 'company', 'role', 'period', 'project', 'contribution'];
      if (required.some(key => !String(item?.[key] || '').trim())) throw new Error(`Internship ${index + 1} is missing required content.`);
      return {
        id: String(item.id).trim(), company: String(item.company).trim(), role: String(item.role).trim(),
        period: String(item.period).trim(), project: String(item.project).trim(), contribution: String(item.contribution).trim(),
        skills: Array.isArray(item.skills) ? item.skills.map(String).map(s => s.trim()).filter(Boolean) : [],
        documents: Array.isArray(item.documents) ? item.documents.map(String).map(s => s.trim()).filter(Boolean) : [],
      };
    });
    res.json(await db.updateInternships(internships));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---- Projects ----
app.get('/api/projects', async (_, res) => {
  try {
    res.json(await db.listProjects());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', (req, res, next) => upload.single('image')(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
}), async (req, res) => {
  try {
    const { title, description, category, githubUrl, liveUrl, featured, imageUrl } = req.body;
    const techs = req.body.techs ? (Array.isArray(req.body.techs) ? req.body.techs : String(req.body.techs).split(',').map(s => s.trim()).filter(Boolean)) : [];
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
    const up = await handleImageUpload(req.file);
    const doc = {
      title: String(title).trim(), description: String(description).trim(), techs,
      category: category || 'fullstack', githubUrl: githubUrl || '', liveUrl: liveUrl || '',
      imageUrl: up.imageUrl || (imageUrl || ''), imagePublicId: up.imagePublicId || '',
      mediaType: 'image', featured: featured === 'true' || featured === true,
    };
    res.status(201).json(await db.createProject(doc));
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.put('/api/projects/:id', (req, res, next) => upload.single('image')(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
}), async (req, res) => {
  try {
    const data = { ...req.body, mediaType: 'image' };
    if (typeof data.techs === 'string') data.techs = data.techs.split(',').map(s => s.trim()).filter(Boolean);
    if (req.file) {
      const oldList = await db.listProjects();
      const old = oldList.find(p => String(p._id) === String(req.params.id));
      const up = await handleImageUpload(req.file);
      data.imageUrl = up.imageUrl;
      data.imagePublicId = up.imagePublicId || '';
      if (old?.imagePublicId && old.imagePublicId !== data.imagePublicId) await destroyImage(old.imagePublicId);
    }
    const p = await db.updateProject(req.params.id, data);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const p = await db.deleteProject(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    await destroyImage(p.imagePublicId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- Messages (contact inbox) ----
app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, message required' });
    res.status(201).json(await db.createMessage({ name, email, subject, message }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages', async (_, res) => {
  try {
    res.json(await db.listMessages());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await db.deleteMessage(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/messages/:id', async (req, res) => {
  try {
    const m = await db.setMessageRead(req.params.id, req.body.read !== false);
    if (!m) return res.status(404).json({ error: 'Not found' });
    res.json(m);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/projects/:id/featured', async (req, res) => {
  try {
    const list = await db.listProjects();
    const cur = list.find(p => String(p._id) === String(req.params.id));
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const p = await db.updateProject(req.params.id, { featured: !cur.featured });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function start() {
  let mode;
  try {
    mode = await connect();
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}\n   API: http://localhost:${PORT}/api/health   DB: ${mode}`));
  console.log(cloudinaryReady
    ? '✓ Cloudinary image uploads enabled (portfolio/images, images-only, 5MB max)'
    : '⚠ Cloudinary creds missing — image uploads disabled. Add CLOUDINARY_* to .env or paste Image URLs.');
  if (mode === 'sqlite') console.log('ℹ Using SQLite (portfolio.db) — easiest for a portfolio: zero-config file DB, persists across restarts.');
}
start();
