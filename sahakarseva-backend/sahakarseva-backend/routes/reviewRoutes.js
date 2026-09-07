const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createReview, getWorkerReviews } = require('../controllers/reviewController');

const router = express.Router();

router.post('/', protect, authorize('customer'), createReview);
router.get('/worker/:workerId', getWorkerReviews);

module.exports = router;
