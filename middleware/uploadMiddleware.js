const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = String(file.fieldname).replace(/[^\w-]+/g, ''); // company_logo -> company_logo
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

// which fields are allowed
const IMAGE_FIELDS = new Set(['company_logo', 'profile_image', 'logo']); // accept both names
const PDF_FIELDS   = new Set(['cv']);

const fileFilter = (req, file, cb) => {
  if (IMAGE_FIELDS.has(file.fieldname)) {
    return /^image\/(png|jpe?g|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Invalid image type'), false);
  }
  if (PDF_FIELDS.has(file.fieldname)) {
    return file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Invalid CV type'), false);
  }
  cb(new Error(`Unexpected field: ${file.fieldname}`), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});