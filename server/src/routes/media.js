const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const cloudinary = require('../services/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'roulade-marseillaise',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
    resource_type: 'auto',
  },
});

const upload = multer({ storage });

router.post('/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier reçu.' });
  }
  res.json({ url: req.file.path, publicId: req.file.filename });
});

router.delete('/:publicId', protect, async (req, res, next) => {
  try {
    await cloudinary.uploader.destroy(req.params.publicId, { resource_type: 'auto' });
    res.json({ message: 'Fichier supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
