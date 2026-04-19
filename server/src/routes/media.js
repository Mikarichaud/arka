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

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'roulade-marseillaise',
      resource_type: isVideo ? 'video' : 'image',
    },
    (error, result) => {
      if (error) return next(error);
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
