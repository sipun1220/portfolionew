// Sipun Das Portfolio — frontend logic v2
// Same-origin by default so the deployed site talks to its own backend.
// Local dev (localhost / file://) still points at the dev server.
// Override anytime: localStorage.setItem('api_base','https://your-api.onrender.com')
const isLocalDev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:';
const API_BASE = localStorage.getItem('api_base') || (isLocalDev ? 'http://localhost:5000' : location.origin);

// ---------- Scroll progress + nav state ----------
const scrollProgress = document.getElementById('scrollProgress');
const siteNav = document.getElementById('siteNav');
const typingLabels = document.querySelectorAll('.typing-label');
typingLabels.forEach((label, index) => {
  const text = label.dataset.typing || '';
  let position = 0;
  const write = () => {
    label.firstChild.textContent = text.slice(0, position);
    if (position < text.length) {
      position += 1;
      setTimeout(write, 55 + (index * 12));
    }
  };
  setTimeout(write, 500 + (index * 700));
});
addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
  document.documentElement.style.setProperty('--page-parallax-y', `${Math.min(h.scrollTop * -0.035, 28)}px`);
  document.documentElement.style.setProperty('--hero-parallax-y', `${Math.max(-h.scrollTop * 0.12, -72)}px`);
  if (scrollProgress) scrollProgress.style.width = (pct * 100).toFixed(2) + '%';
  siteNav?.classList.toggle('scrolled', h.scrollTop > 24);
  toTop?.classList.toggle('show', h.scrollTop > 600);
}, { passive: true });

// ---------- Mobile nav ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle?.setAttribute('aria-expanded', 'false');
}));
document.addEventListener('click', e => {
  if (!navLinks?.classList.contains('open')) return;
  if (navLinks.contains(e.target) || navToggle?.contains(e.target)) return;
  navLinks.classList.remove('open');
  navToggle?.setAttribute('aria-expanded', 'false');
});
addEventListener('resize', () => {
  if (innerWidth > 920 && navLinks?.classList.contains('open')) {
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks?.classList.contains('open')) {
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});

// ---------- Typing effect ----------
const roles = ['Full-Stack Developer', '2nd-Year CS Student', 'React · Node · MongoDB', 'Java · Python', 'Civic-Tech Builder'];
const typingEl = document.getElementById('typing');
let ri = 0, ci = 0, deleting = false;
function tick() {
  if (!typingEl) return;
  const word = roles[ri];
  typingEl.textContent = word.slice(0, ci);
  if (!deleting && ci < word.length) { ci++; setTimeout(tick, 65); }
  else if (!deleting && ci === word.length) { deleting = true; setTimeout(tick, 1500); }
  else if (deleting && ci > 0) { ci--; setTimeout(tick, 32); }
  else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(tick, 320); }
}
tick();

// ---------- Counters ----------
const counters = document.querySelectorAll('[data-count]');
const cObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, target = +el.dataset.count;
  const t0 = performance.now(), dur = 1200;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  cObs.unobserve(el);
}), { threshold: .6 });
counters.forEach(c => cObs.observe(c));

// ---------- Reveal on scroll + skill bars ----------
const rObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('visible');
  e.target.querySelectorAll('.skill-progress').forEach(bar => {
    bar.style.width = bar.style.width || getComputedStyle(bar).width;
  });
  rObs.unobserve(e.target);
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => rObs.observe(el));

// Animate skill bars when visible
const sObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const bar = e.target;
  const w = bar.style.width;
  bar.style.width = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = w; }));
  sObs.unobserve(bar);
}), { threshold: .5 });
document.querySelectorAll('.skill-progress').forEach(b => sObs.observe(b));

// ---------- Active nav ----------
const sections = [...document.querySelectorAll('section[id]')];
const navA = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const aObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) navA.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => aObs.observe(s));

// ---------- FAQ accordion ----------
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.nextElementSibling;
    const wrap = btn.parentElement;
    const open = btn.classList.toggle('faq-item-open');
    btn.querySelector('span').textContent = open ? '−' : '+';
    if (item?.classList.contains('faq-a')) item.style.maxHeight = open ? item.scrollHeight + 'px' : '0';
  });
});

// ---------- Reviews slider ----------
const track = document.getElementById('reviewTrack');
document.getElementById('revPrev')?.addEventListener('click', () => track?.scrollBy({ left: -400, behavior: 'smooth' }));
document.getElementById('revNext')?.addEventListener('click', () => track?.scrollBy({ left: 400, behavior: 'smooth' }));

// ---------- Toast ----------
const toast = document.getElementById('toast');
let toastT;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('show'), 3400);
}

// ---------- Projects ----------
const grid = document.getElementById('projectsGrid');
const backendNote = document.getElementById('backendNote');
const footStatus = document.getElementById('footStatus');
const apiDot = document.getElementById('apiDot');
const apiText = document.getElementById('apiText');
const searchInput = document.getElementById('projectSearch');
const filterBtns = document.getElementById('filterBtns');
const sortSelect = document.getElementById('projectSort');
let allProjects = [];
let activeFilter = 'all';

const DEMO_PROJECTS = [
  { _id: 'd1', title: 'MediShare — Emergency Medicine Platform', description: 'Location-aware platform to list unused medicines and request them in emergencies. Per-user limits, emergency mode + push notifications, Node REST + MongoDB.', techs: ['React', 'Node.js', 'MongoDB', 'Geolocation'], category: 'fullstack', featured: true, githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80' },
  { _id: 'd2', title: 'Cafe Management System', description: 'Full-stack cafe system for order tracking, menu management and inventory with real-time Firebase sync.', techs: ['JavaScript', 'Firebase', 'HTML', 'CSS'], category: 'fullstack', featured: true, githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80' },
  { _id: 'd3', title: 'Personal Portfolio Website', description: 'Responsive portfolio to showcase projects and skills. This site — fast, accessible, constantly evolving.', techs: ['HTML', 'CSS', 'JavaScript'], category: 'frontend', featured: false, githubUrl: 'https://github.com/sipun1220', liveUrl: 'https://github.com/sipun1220', imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80' },
];

function resolveImg(p) {
  if (!p.imageUrl) return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80';
  if (p.imageUrl.startsWith('http') || p.imageUrl.startsWith('data:')) return p.imageUrl;
  if (p.imageUrl.startsWith('/uploads')) return API_BASE + p.imageUrl;
  return p.imageUrl;
}
function mediaThumb(p) {
  const src = resolveImg(p);
  const u = (p.imageUrl || '').toLowerCase();
  const isVid = p.mediaType === 'video' || u.includes('/video/upload') || /\.(mp4|webm|mov|m4v)(\?|$)/.test(u);
  if (isVid) return `<video src="${src}" muted loop playsinline preload="metadata"></video>`;
  return `<img src="${src}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80'">`;
}
function skeletonHTML(n = 6) {
  return Array.from({ length: n }, () => '<div class="skel"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line short"></div></div>').join('');
}
function setOnline(on, label) {
  apiDot?.classList.toggle('on', on);
  if (apiText) apiText.textContent = on ? 'live' : 'offline';
  if (footStatus) footStatus.textContent = 'Backend: ' + (label || (on ? 'connected' : 'demo mode'));
}
async function loadProjects() {
  if (grid) grid.innerHTML = skeletonHTML();
  let dbMode = '';
  try {
    const h = await fetch(`${API_BASE}/api/health`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (h?.db) dbMode = h.db === 'mongodb' ? 'MongoDB' : 'SQLite';
  } catch { /* offline */ }
  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error('api');
    allProjects = await res.json();
    if (!allProjects.length) throw new Error('empty');
    setOnline(true, `connected · ${dbMode || 'backend'} · ${allProjects.length} projects`);
    if (backendNote) backendNote.textContent = `● Live — ${allProjects.length} project(s) from ${dbMode || 'backend'} · managed in Site manager`;
  } catch {
    allProjects = DEMO_PROJECTS;
    setOnline(false, 'demo mode — run backend for live data');
    if (backendNote) backendNote.textContent = '○ Showing curated demo work — run the backend (README) to manage live projects';
  }
  renderProjects();
}
function getFiltered() {
  const q = (searchInput?.value || '').toLowerCase().trim();
  let list = allProjects.filter(p => {
    if (activeFilter === 'featured' && !p.featured) return false;
    if (activeFilter !== 'all' && activeFilter !== 'featured' && p.category !== activeFilter) return false;
    if (q && !(p.title + ' ' + p.description + ' ' + (p.techs || []).join(' ')).toLowerCase().includes(q)) return false;
    return true;
  });
  if (sortSelect?.value === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  else list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}
function renderProjects() {
  if (!grid) return;
  const list = getFiltered();
  if (!list.length) { grid.innerHTML = '<p class="loading">No projects match. Try another search — or add one in <a href="admin.html" style="text-decoration:underline">Site manager</a>.</p>'; return; }
  if (grid.classList.contains('home-project-grid')) {
    grid.innerHTML = list.map((p, index) => {
      const link = p.githubUrl || p.liveUrl || 'work.html';
      const external = /^https?:\/\//.test(link);
      return `<a class="home-project-card" href="${escapeHtml(link)}"${external ? ' target="_blank" rel="noopener"' : ''}>
        <div class="home-project-art home-project-art-${escapeHtml(p.category || 'project')}"><span>${String(index + 1).padStart(2, '0')}</span><i class="devicon-github-original"></i></div>
        <div><small>${escapeHtml(p.category || 'Project')}${p.featured ? ' · Featured' : ''}</small><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description || '')}</p><span class="text-link">${external ? 'Open on GitHub' : 'Read the case study'} <b>↗</b></span></div>
      </a>`;
    }).join('');
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="project-card">
      <div class="project-img">${mediaThumb(p)}<span class="project-badge">${escapeHtml(p.category || 'project')}</span>${p.featured ? '<span class="featured-badge">★ Featured</span>' : ''}</div>
      <div class="project-body">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml((p.description || '').slice(0, 115))}${(p.description || '').length > 115 ? '…' : ''}</p>
        <div class="tech-tags" aria-label="Technology stack">${(p.techs || []).slice(0, 4).map(t => techTag(t)).join('')}</div>
        <div class="project-links">
          <button class="link-btn" data-open="${escapeHtml(String(p._id))}">Case study</button>
          <a class="link-btn primary" href="${escapeHtml(p.liveUrl || '#')}" target="_blank" rel="noopener">Live ↗</a>
        </div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.project-card').forEach((c, i) => setTimeout(() => c.classList.add('enter'), 55 * i));
  grid.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.open)));
}
const TECH_ICONS = {
  react: 'devicon-react-original colored',
  'node.js': 'devicon-nodejs-plain colored',
  node: 'devicon-nodejs-plain colored',
  express: 'devicon-express-original',
  mongodb: 'devicon-mongodb-plain colored',
  javascript: 'devicon-javascript-plain colored',
  typescript: 'devicon-typescript-plain colored',
  css: 'devicon-css3-plain colored',
  html: 'devicon-html5-plain colored',
  'chart.js': 'devicon-chartjs-plain colored',
  python: 'devicon-python-plain colored',
  java: 'devicon-java-plain colored',
  stripe: 'devicon-stripe-plain colored',
  'socket.io': 'devicon-socketio-original',
  api: 'devicon-fastapi-plain colored'
};
function techTag(tech) {
  const label = String(tech || '').trim();
  const icon = TECH_ICONS[label.toLowerCase()] || 'devicon-codepen-original';
  return `<span class="tech-tag"><i class="${icon}" aria-hidden="true"></i><span>${escapeHtml(label)}</span></span>`;
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

filterBtns?.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  filterBtns.querySelectorAll('button').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); activeFilter = b.dataset.filter; renderProjects();
});

// Also support new nx-filter-btn buttons (home v4 redesign)
document.addEventListener('nx-filter', e => {
  activeFilter = e.detail; renderProjects();
});
searchInput?.addEventListener('input', renderProjects);
sortSelect?.addEventListener('change', renderProjects);

// ---------- Modal ----------
const modal = document.getElementById('projectModal');
window.openModal = (id) => {
  const p = allProjects.find(x => String(x._id) === String(id));
  if (!p || !modal) return;
  const src = resolveImg(p);
  const u = (p.imageUrl || '').toLowerCase();
  const isVid = p.mediaType === 'video' || u.includes('/video/upload') || /\.(mp4|webm|mov|m4v)(\?|$)/.test(u);
  document.getElementById('modalMedia').innerHTML = isVid
    ? `<video src="${src}" controls playsinline style="width:100%;height:100%;object-fit:cover"></video>`
    : `<img src="${src}" alt="${escapeHtml(p.title)}" style="width:100%;height:100%;object-fit:cover">`;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalDesc').textContent = p.description;
  document.getElementById('modalTechs').innerHTML = (p.techs || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
  document.getElementById('modalGithub').href = p.githubUrl || '#';
  document.getElementById('modalLive').href = p.liveUrl || '#';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};
function closeModal() {
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
document.getElementById('modalClose')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ---------- Contact ----------
const form = document.getElementById('contactForm');
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('contactBtn');
  const hint = document.getElementById('contactHint');
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const budget = document.getElementById('budget')?.value || '';
  const message = document.getElementById('message').value.trim();
  hint.className = 'form-hint';
  if (name.length < 2) { hint.textContent = 'Please add your name.'; hint.classList.add('err'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { hint.textContent = 'That email doesn’t look right.'; hint.classList.add('err'); return; }
  if (message.length < 10) { hint.textContent = 'Add a little more detail (10+ characters).'; hint.classList.add('err'); return; }
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject: budget ? `${subject} [${budget}]` : subject, message }),
    });
    if (!res.ok) throw new Error('send failed');
    hint.textContent = '✓ Thanks! Your message is saved — I’ll reply within 24 hours.';
    hint.classList.add('ok');
    showToast('Message sent successfully!');
    form.reset();
  } catch {
    hint.textContent = '⚠ Backend is offline — your message wasn’t saved. Email me directly instead.';
    hint.classList.add('err');
    showToast('Backend offline — email me directly.');
  }
  btn.disabled = false;
  btn.innerHTML = original;
});

// ---------- Documents (Cloudinary) ----------
const DOC_LABELS = {
  resume: 'Resume',
  certificate: 'Internship Certificate',
  lor: 'Letter of Recommendation',
  result: 'Internship Test',
  'bluestock-certificate': 'Bluestock Fintech Internship Certificate',
  'dbert-certificate': 'DBERT Internship Certificate',
  'dbert-lor': 'DBERT Letter of Recommendation',
};
const docEndpoint = (id, kind) => `${API_BASE}/api/documents/${encodeURIComponent(id)}/${kind}`;

document.querySelectorAll('[data-doc-view]').forEach(a => {
  a.href = docEndpoint(a.dataset.docView, 'view');
});
document.querySelectorAll('[data-doc-download]').forEach(a => {
  a.href = docEndpoint(a.dataset.docDownload, 'download');
});

const docModal = document.getElementById('docModal');
const docFrame = document.getElementById('docModalFrame');
function closeDocModal() {
  docModal?.classList.remove('open');
  docModal?.setAttribute('aria-hidden', 'true');
  if (docFrame) docFrame.src = 'about:blank';
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-doc-open]').forEach(btn => btn.addEventListener('click', () => {
  const id = btn.dataset.docOpen;
  if (!docModal || !docFrame) {
    window.open(docEndpoint(id, 'view'), '_blank', 'noopener');
    return;
  }
  document.getElementById('docModalTitle').textContent = DOC_LABELS[id] || 'Document';
  docFrame.src = docEndpoint(id, 'view');
  document.getElementById('docModalOpen').href = docEndpoint(id, 'view');
  document.getElementById('docModalDownload').href = docEndpoint(id, 'download');
  docModal.classList.add('open');
  docModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}));
document.getElementById('docModalClose')?.addEventListener('click', closeDocModal);
docModal?.addEventListener('click', e => { if (e.target === docModal) closeDocModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDocModal(); });

// ---------- Editable internship experience ----------
const internshipTimeline = document.getElementById('internshipTimeline');
const internshipFallback = internshipTimeline?.innerHTML || '';
const escapeInternshipText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function renderInternships(items) {
  if (!internshipTimeline || !Array.isArray(items) || !items.length) return;
  internshipTimeline.innerHTML = items.map(item => `
    <article>
      <span>${escapeInternshipText(item.period)}</span>
      <h3>${escapeInternshipText(item.role)} · ${escapeInternshipText(item.company)}</h3>
      <p><b>${escapeInternshipText(item.project)}</b><br>${escapeInternshipText(item.contribution)}</p>
      ${(item.skills || []).length ? `<small class="timeline-skills">${item.skills.map(escapeInternshipText).join(' · ')}</small>` : ''}
      ${Array.isArray(item.documents) && item.documents.length ? `<div class="timeline-docs">${item.documents.map(id => `<a href="${API_BASE}/api/documents/${encodeURIComponent(String(id))}/view" target="_blank" rel="noopener">${escapeInternshipText(DOC_LABELS[String(id)] || 'Supporting document')} ↗</a>`).join('')}</div>` : ''}
    </article>`).join('');
}
if (internshipTimeline) {
  fetch(`${API_BASE}/api/content/internships`).then(r => r.ok ? r.json() : Promise.reject(new Error('internships unavailable')))
    .then(renderInternships).catch(() => { internshipTimeline.innerHTML = internshipFallback; });
}

// ---------- Back to top ----------
const toTop = document.getElementById('toTop');
toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

loadProjects();
