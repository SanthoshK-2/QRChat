const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.get('/usage/users', protect, adminOnly, adminController.getUsageByUser);
router.get('/usage/calls', protect, adminOnly, adminController.getCallDurations);
router.get('/users/:userId', protect, adminOnly, adminController.getUserDetail);
router.get('/export/usage.csv', protect, adminOnly, adminController.exportUsageCsv);
router.get('/export/calls.csv', protect, adminOnly, adminController.exportCallsCsv);
router.get('/online', protect, adminOnly, adminController.getOnline);

module.exports = router;
