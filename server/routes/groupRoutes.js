const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, groupController.createGroup);
router.get('/', protect, groupController.getUserGroups);
router.put('/:groupId', protect, groupController.updateGroup);
router.post('/:groupId/members', protect, groupController.addMembers);

module.exports = router;
