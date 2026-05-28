const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword, changePassword, changeEmail } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.post('/change-email', protect, changeEmail);

module.exports = router;
