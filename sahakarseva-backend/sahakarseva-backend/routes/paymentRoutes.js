const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createOrder, verifyPayment, recordCashPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', protect, authorize('customer'), createOrder);
router.post('/verify', protect, authorize('customer'), verifyPayment);
router.post('/cash', protect, authorize('worker'), recordCashPayment);

module.exports = router;
