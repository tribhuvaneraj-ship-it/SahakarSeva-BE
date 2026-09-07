const express = require('express');
const { protect } = require('../middleware/auth');
const { getMessages, sendMessageRest } = require('../controllers/chatController');

const router = express.Router();

router.get('/:bookingId', protect, getMessages);
router.post('/:bookingId', protect, sendMessageRest);

module.exports = router;
