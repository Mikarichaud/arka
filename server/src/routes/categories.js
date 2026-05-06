const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Liste publique des catégories — utilisée par Editor / PackLibrary / PackSelection
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json({ categories });
  } catch (err) { next(err); }
});

module.exports = router;
