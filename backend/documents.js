// Portfolio documents stored in Cloudinary (portfolio/documents, resource_type raw).
// Cloudinary's free plan blocks direct PDF CDN links, so we hand out signed
// api.cloudinary.com download URLs instead. Files are never stored on local disk.
const cloudinary = require('cloudinary').v2;

const DOCUMENTS = [
  {
    id: 'bluestock-certificate',
    title: 'Bluestock Fintech Internship Certificate',
    description: 'Data Analyst Intern certificate from Bluestock Fintech.',
    publicId: 'portfolio/documents/bluestock-certificate.jpeg',
    filename: 'Bluestock-Fintech-Internship-Certificate.jpeg',
    format: 'jpg',
    resourceType: 'image',
  },
  {
    id: 'dbert-certificate',
    title: 'DBERT Internship Certificate',
    description: 'Full Stack Development internship completion certificate.',
    publicId: 'portfolio/documents/dbert-certificate.pdf',
    filename: 'DBERT-Internship-Certificate.pdf',
  },
  {
    id: 'dbert-lor',
    title: 'DBERT Letter of Recommendation',
    description: 'DBERT recommendation and performance appraisal.',
    publicId: 'portfolio/documents/dbert-letter-of-recommendation.pdf',
    filename: 'DBERT-Letter-of-Recommendation.pdf',
  },
  {
    id: 'resume',
    title: 'Resume',
    description: 'Current resume — education, projects and full-stack skills.',
    publicId: 'portfolio/documents/sipun-das-resume.pdf',
    filename: 'Sipun-Das-Resume.pdf',
  },
  {
    id: 'certificate',
    title: 'Internship Certificate',
    description: 'Internship completion certificate — role, duration and mentor.',
    publicId: 'portfolio/documents/certificate.pdf',
    filename: 'Internship-Certificate.pdf',
  },
  {
    id: 'lor',
    title: 'Letter of Recommendation',
    description: 'Recommendation letter written for me by my internship mentor.',
    publicId: 'portfolio/documents/letter-of-recommendation.pdf',
    filename: 'Letter-of-Recommendation.pdf',
  },
  {
    id: 'result',
    title: 'Internship Test',
    description: 'The internship test I submitted during selection.',
    publicId: 'portfolio/documents/academic-result.pdf',
    filename: 'Internship-Test.pdf',
  },
];

function signedUrl(doc, attachment) {
  return cloudinary.utils.private_download_url(doc.publicId, doc.format || 'pdf', {
    resource_type: doc.resourceType || 'raw',
    type: 'upload',
    attachment: Boolean(attachment),
  });
}

function listDocuments() {
  return DOCUMENTS.map(doc => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    filename: doc.filename,
    viewUrl: signedUrl(doc, false),
    downloadUrl: signedUrl(doc, true),
  }));
}

function getDocument(id) {
  return DOCUMENTS.find(d => d.id === id) || null;
}

module.exports = { DOCUMENTS, listDocuments, getDocument, signedUrl };
