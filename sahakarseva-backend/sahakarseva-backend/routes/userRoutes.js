const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  updateMe,
  getWorkerProfile,
  updateWorkerProfile,
  setAvailability,
  getNearbyWorkers,
} = require('../controllers/userController');

const router = express.Router();

router.put('/me', protect, updateMe);
router.get('/nearby-workers', protect, getNearbyWorkers);

router.get('/worker-profile', protect, authorize('worker'), getWorkerProfile);
router.put('/worker-profile', protect, authorize('worker'), updateWorkerProfile);
router.put('/worker-profile/availability', protect, authorize('worker'), setAvailability);

module.exports = router;
