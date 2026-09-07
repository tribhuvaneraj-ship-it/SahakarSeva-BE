const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBooking,
  getMyBookings,
  getNearbyOpenBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
} = require('../controllers/bookingController');

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('customer'),
  [
    body('serviceId').notEmpty(),
    body('lng').isFloat(),
    body('lat').isFloat(),
  ],
  validate,
  createBooking
);

router.get('/', protect, getMyBookings);
router.get('/nearby', protect, authorize('worker'), getNearbyOpenBookings);
router.get('/:id', protect, getBookingById);

router.put('/:id/accept', protect, authorize('worker'), acceptBooking);
router.put('/:id/reject', protect, authorize('worker'), rejectBooking);
router.put('/:id/status', protect, updateBookingStatus);

module.exports = router;
