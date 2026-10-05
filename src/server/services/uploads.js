'use strict';

const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { ensureWritableDirectory } = require('../storage');

function createUploadService({ db, config, logger = console }) {
  ensureWritableDirectory(config.uploadsPath, 'UPLOADS_PATH');
  // Photo upload storage: derive safe image extensions from the accepted MIME type
  const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadsPath),
    filename: (req, file, cb) => {
      const ext =
        { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' }[
          file.mimetype
        ] || '';
      cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const photoUpload = multer({
    storage: photoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
      };
      const extension = path.extname(file.originalname || '').toLowerCase();
      if (allowedExtensions[file.mimetype]?.includes(extension)) cb(null, true);
      else cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
    },
  });

  // Document upload storage: common downloadable files, up to 25 MB
  const docStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadsPath),
    filename: (req, file, cb) => {
      const rawExt = path.extname(file.originalname).toLowerCase();
      const ext = /^\.[a-z0-9]+$/.test(rawExt) ? rawExt : '';
      cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const DOC_ALLOWED_EXTS = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.rtf',
    '.csv',
    '.tsv',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.mp4',
    '.mov',
    '.avi',
    '.webm',
    '.mp3',
    '.wav',
    '.m4a',
    '.zip',
  ]);
  const DOC_ALLOWED_MIMES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
    'text/tab-separated-values',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ]);
  const docUpload = multer({
    storage: docStorage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const mime = String(file.mimetype || '').toLowerCase();
      const allowedByMime = DOC_ALLOWED_MIMES.has(mime) || mime === 'application/octet-stream';
      const allowedByExt = DOC_ALLOWED_EXTS.has(ext);
      if (allowedByMime && allowedByExt) cb(null, true);
      else
        cb(
          new Error(
            'Allowed files include documents, spreadsheets, presentations, images, audio, video, and ZIP files up to 25 MB',
          ),
        );
    },
  });
  // These fields are returned by public APIs. A file becomes public only when an
  // editor references it in public content or publishes a download-library item.
  const publicSources = [
    ['people', ['photo_url'], 'active=1'],
    ['white_papers', ['file_url', 'blocks', 'compiled_html'], 'published=1'],
    ['publications', ['pdf_url', 'doi_url', 'citation_url', 'ris_url']],
    ['research', ['image_url', 'content', 'links', 'description']],
    ['news', ['image_url', 'content', 'photos']],
    ['sponsors', ['logo_url']],
    ['gallery', ['image_url']],
    ['hero_slides', ['image_url']],
    ['facilities', ['photo_url', 'image_url', 'doc_url', 'content', 'long_description']],
    ['apps', ['url', 'embed_html', 'thumbnail', 'description'], 'published=1'],
    ['documents', ['file_url'], "entity_type='download' AND published=1"],
  ];

  function isReferenced(fileUrl, sources = publicSources) {
    for (const [table, columns, condition] of sources) {
      const rows = db
        .prepare(
          `SELECT ${columns.join(',')} FROM ${table}${condition ? ` WHERE ${condition}` : ''}`,
        )
        .all();
      for (const row of rows) {
        for (const value of Object.values(row)) {
          const references = String(value || '').match(/\/uploads\/[^\s"'<>()[\]{}]+/g) || [];
          for (const reference of references) {
            try {
              if (decodeURIComponent(new URL(reference, config.baseUrl).pathname) === fileUrl)
                return true;
            } catch (_) {
              /* Ignore malformed editor-entered URLs. */
            }
          }
        }
      }
    }
    return false;
  }

  function uploadFilename(fileUrl) {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) return null;
    const filename = fileUrl.slice('/uploads/'.length);
    if (
      !filename ||
      filename === '.' ||
      filename === '..' ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('\0')
    )
      return null;
    return filename;
  }

  function authorizeUpload(req, res, next) {
    let fileUrl;
    try {
      fileUrl = '/uploads' + decodeURIComponent(req.path);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    if (!uploadFilename(fileUrl)) return res.status(404).json({ error: 'Not found' });
    if (isReferenced(fileUrl)) return next();
    // Never cache private responses in a shared browser/proxy cache.
    res.setHeader('Cache-Control', 'private, no-store');
    res.vary('Cookie');
    if (req.session?.userId) return next();
    return res.status(401).json({ error: 'Authentication required to access this file' });
  }

  function removeUploadedAsset(fileUrl) {
    const filename = uploadFilename(fileUrl);
    if (!filename) return;
    const privateSources = [
      ['documents', ['file_url']],
      ['inventory', ['sds_url']],
    ];
    if (
      isReferenced(fileUrl, [
        ...publicSources.map(([table, columns]) => [table, columns]),
        ...privateSources,
      ])
    )
      return;
    try {
      fs.unlinkSync(path.join(config.uploadsPath, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') logger.warn('[uploads] cleanup failed:', error.message);
    }
  }

  return { photoUpload, docUpload, authorizeUpload, removeUploadedAsset };
}

module.exports = { createUploadService };
