const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, requirePremium } = require('../middlewares/auth');
const cloudinary = require('../services/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
});

router.post('/upload', protect, requirePremium, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier reçu.' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'roulade-marseillaise',
      resource_type: isVideo ? 'video' : 'image',
    },
    (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', JSON.stringify(error));
        return res.status(500).json({ message: error.message || JSON.stringify(error) });
      }
      res.json({ url: result.secure_url, publicId: result.public_id });
    }
  );

  stream.end(req.file.buffer);
});

module.exports = router;
