const express = require('express');
const router = express.Router();
const { getIceServers } = require('../controllers/iceController');

router.get('/', getIceServers);

module.exports = router;

