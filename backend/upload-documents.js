// Upload portfolio PDFs to Cloudinary (folder: portfolio/documents)
// Usage: node upload-documents.js
// PDFs are served straight from Cloudinary — nothing kept on local disk.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ROOT = path.join(__dirname, '..');
const DOCS = [
  { file: 'bluestock-certificate.jpeg', publicId: 'bluestock-certificate.jpeg', filenameOverride: 'Bluestock-Fintech-Internship-Certificate.jpeg', resourceType: 'image' },
  { file: 'dbert-certificate.pdf', publicId: 'dbert-certificate.pdf', filenameOverride: 'DBERT-Internship-Certificate.pdf' },
  { file: 'dbert-letter-of-recommendation.pdf', publicId: 'dbert-letter-of-recommendation.pdf', filenameOverride: 'DBERT-Letter-of-Recommendation.pdf' },
  { file: 'Sipun-Das-Resume.pdf', publicId: 'sipun-das-resume.pdf', filenameOverride: 'Sipun-Das-Resume.pdf' },
  { file: 'result.pdf', publicId: 'academic-result.pdf', filenameOverride: 'Internship-Test.pdf' },
  { file: 'certificate.pdf', publicId: 'certificate.pdf', filenameOverride: 'Internship-Certificate.pdf' },
  { file: 'lor.pdf', publicId: 'letter-of-recommendation.pdf', filenameOverride: 'Letter-of-Recommendation.pdf' },
];

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { status: res.status, type: res.headers.get('content-type'), disp: res.headers.get('content-disposition') };
  } catch (e) {
    return { status: 'ERR', type: e.message };
  }
}

(async () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error('Missing CLOUDINARY_* in backend/.env');
    process.exit(1);
  }

  const results = [];
  for (const doc of DOCS) {
    const filePath = path.join(ROOT, doc.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`skip (not found): ${doc.file}`);
      continue;
    }
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'portfolio/documents',
      resource_type: doc.resourceType || 'raw',
      public_id: doc.publicId,
      filename_override: doc.filenameOverride,
      overwrite: true,
      use_filename: false,
      unique_filename: false,
    });
    // Signed API URLs work even when the free plan blocks direct PDF CDN links.
    const extension = doc.resourceType === 'image' ? 'jpg' : 'pdf';
    const view = cloudinary.utils.private_download_url(result.public_id, extension, { resource_type: doc.resourceType || 'raw', type: 'upload' });
    const download = cloudinary.utils.private_download_url(result.public_id, extension, { resource_type: doc.resourceType || 'raw', type: 'upload', attachment: true });
    results.push({ file: doc.file, publicId: result.public_id, view, download });
    console.log(`\n${doc.file}\n  public id: ${result.public_id}\n  view:      ${view}\n  download:  ${download}`);
    console.log('  view HEAD:    ', await head(view));
    console.log('  download HEAD:', await head(download));
  }

  console.log(`\n${results.length} document(s) ready. Site routes: /api/documents/<id>/view and /api/documents/<id>/download`);
})().catch((e) => {
  console.error('Upload failed:', e.message);
  process.exit(1);
});
