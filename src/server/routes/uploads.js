'use strict';

const { Router } = require('express');

function createUploadsRouter({
  photoUpload,
  docUpload,
  requireAuth,
  requireCsrf,
  uploadRateLimiter,
}) {
  const router = Router();

  // PHOTO UPLOAD API
  router.post('/api/upload/photo', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
    photoUpload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload error' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });

  // DOCUMENT UPLOAD API
  router.post('/api/upload/document', uploadRateLimiter, requireAuth, requireCsrf, (req, res) => {
    docUpload.single('document')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload error' });
      if (!req.file) return res.status(400).json({ error: 'No document file provided' });
      res.json({
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        mime_type: req.file.mimetype || '',
        file_size: req.file.size || 0,
      });
    });
  });
  return router;
}

module.exports = { createUploadsRouter };
