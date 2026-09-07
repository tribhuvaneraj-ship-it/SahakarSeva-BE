const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const WorkerProfile = require('../models/WorkerProfile');
const sendResponse = require('../utils/sendResponse');

// @desc    Leave a review for a completed booking
// @route   POST /api/reviews
// @access  Private (customer)
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only review your own bookings');
  }
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Only completed bookings can be reviewed');
  }
  if (booking.review) {
    res.status(400);
    throw new Error('This booking has already been reviewed');
  }

  const review = await Review.create({
    booking: bookingId,
    customer: req.user._id,
    worker: booking.worker,
    rating,
    comment,
  });

  booking.review = review._id;
  await booking.save();

  // Recalculate worker aggregate rating
  const stats = await Review.aggregate([
    { $match: { worker: booking.worker } },
    { $group: { _id: '$worker', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await WorkerProfile.findOneAndUpdate(
      { user: booking.worker },
      { rating: Number(stats[0].avgRating.toFixed(2)), totalReviews: stats[0].count }
    );
  }

  sendResponse(res, 201, true, 'Review submitted', { review });
});

// @desc    Get reviews for a worker
// @route   GET /api/reviews/worker/:workerId
// @access  Public
const getWorkerReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ worker: req.params.workerId })
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 });
  sendResponse(res, 200, true, 'Worker reviews fetched', { reviews });
});

module.exports = { createReview, getWorkerReviews };
