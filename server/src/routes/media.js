const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middlewares/auth');
const cloudinary = require('../services/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
});

router.post('/upload', upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier reçu.' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');

  console.log('Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? '***set***' : 'MISSING',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '***set***' : 'MISSING',
  });

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

router.delete('/:publicId', protect, async (req, res, next) => {
  try {
    await cloudinary.uploader.destroy(req.params.publicId, { resource_type: 'auto' });
    res.json({ message: 'Fichier supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
