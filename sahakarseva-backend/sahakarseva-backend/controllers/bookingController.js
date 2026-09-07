const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const WorkerProfile = require('../models/WorkerProfile');
const Notification = require('../models/Notification');
const sendResponse = require('../utils/sendResponse');
const { getDistanceKm } = require('../utils/geoUtils');

const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get('io');
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

const notify = async (req, userId, title, message, type, relatedBooking) => {
  const notif = await Notification.create({ user: userId, title, message, type, relatedBooking });
  emitToUser(req, userId, 'notification:new', notif);
  return notif;
};

// @desc    Create a booking. If workerId given -> direct request; else -> pending, open for nearby workers
// @route   POST /api/bookings
// @access  Private (customer)
const createBooking = asyncHandler(async (req, res) => {
  const { serviceId, workerId, description, lng, lat, address, scheduledAt } = req.body;

  const booking = await Booking.create({
    customer: req.user._id,
    worker: workerId || null,
    service: serviceId,
    description,
    scheduledAt: scheduledAt || Date.now(),
    pickupLocation: { coordinates: [Number(lng), Number(lat)], address },
    status: workerId ? 'requested' : 'pending',
    timeline: [{ status: workerId ? 'requested' : 'pending', note: 'Booking created' }],
  });

  const populated = await booking.populate([
    { path: 'service' },
    { path: 'customer', select: 'name phone avatar' },
    { path: 'worker', select: 'name phone avatar' },
  ]);

  if (workerId) {
    emitToUser(req, workerId, 'booking:new_request', populated);
    await notify(req, workerId, 'New job request', `${req.user.name} requested a service`, 'booking', booking._id);
  }

  sendResponse(res, 201, true, 'Booking created', { booking: populated });
});

// @desc    Get bookings for logged in user (customer sees own, worker sees assigned, admin sees all)
// @route   GET /api/bookings?status=
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  else if (req.user.role === 'worker') filter.worker = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const bookings = await Booking.find(filter)
    .populate('service')
    .populate('customer', 'name phone avatar')
    .populate('worker', 'name phone avatar')
    .sort({ createdAt: -1 });

  sendResponse(res, 200, true, 'Bookings fetched', { bookings });
});

// @desc    Get open ('pending') bookings near a worker, for a broadcast-style job feed
// @route   GET /api/bookings/nearby?lng=&lat=&radiusKm=
// @access  Private (worker)
const getNearbyOpenBookings = asyncHandler(async (req, res) => {
  const { lng, lat, radiusKm = 10 } = req.query;
  const bookings = await Booking.find({
    status: 'pending',
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000,
      },
    },
  })
    .populate('service')
    .populate('customer', 'name phone avatar')
    .limit(30);

  const withDistance = bookings.map((b) => ({
    ...b.toObject(),
    distanceKm: Number(getDistanceKm([Number(lng), Number(lat)], b.pickupLocation.coordinates).toFixed(2)),
  }));

  sendResponse(res, 200, true, 'Nearby open bookings fetched', { bookings: withDistance });
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('service')
    .populate('customer', 'name phone avatar')
    .populate('worker', 'name phone avatar')
    .populate('review');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isParty =
    String(booking.customer._id) === String(req.user._id) ||
    (booking.worker && String(booking.worker._id) === String(req.user._id)) ||
    req.user.role === 'admin';
  if (!isParty) {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }

  sendResponse(res, 200, true, 'Booking fetched', { booking });
});

const pushTimeline = (booking, status, note = '') => {
  booking.status = status;
  booking.timeline.push({ status, note });
};

// @desc    Worker accepts a booking request
// @route   PUT /api/bookings/:id/accept
// @access  Private (worker)
const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'pending' && booking.status !== 'requested') {
    res.status(400);
    throw new Error(`Booking cannot be accepted from status '${booking.status}'`);
  }

  booking.worker = req.user._id;
  pushTimeline(booking, 'accepted', 'Worker accepted the job');
  await booking.save();

  await WorkerProfile.findOneAndUpdate({ user: req.user._id }, { isAvailable: false });

  const populated = await booking.populate([
    { path: 'service' },
    { path: 'customer', select: 'name phone avatar' },
    { path: 'worker', select: 'name phone avatar' },
  ]);

  emitToUser(req, booking.customer, 'booking:updated', populated);
  emitToUser(req, booking.customer, 'booking:accepted', populated);
  await notify(req, booking.customer, 'Booking accepted', `${req.user.name} accepted your job request`, 'booking', booking._id);

  const io = req.app.get('io');
  if (io) io.to(`booking:${booking._id}`).emit('booking:updated', populated);

  sendResponse(res, 200, true, 'Booking accepted', { booking: populated });
});

// @desc    Worker rejects a booking request
// @route   PUT /api/bookings/:id/reject
// @access  Private (worker)
const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!['pending', 'requested'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Booking cannot be rejected from status '${booking.status}'`);
  }

  // If it was a direct request to this worker, reopen it as pending so others can pick it up
  const wasDirect = booking.status === 'requested';
  pushTimeline(booking, 'pending', `Rejected by worker ${req.user.name}`);
  if (!wasDirect) booking.status = 'pending';
  booking.worker = null;
  await booking.save();

  emitToUser(req, booking.customer, 'booking:rejected', { bookingId: booking._id, by: req.user._id });
  await notify(req, booking.customer, 'Request declined', `A worker declined your request. We are finding another one.`, 'booking', booking._id);

  sendResponse(res, 200, true, 'Booking rejected', { booking });
});

// @desc    Update booking status (on_the_way, arrived, in_progress, completed, cancelled)
// @route   PUT /api/bookings/:id/status
// @access  Private (worker/customer for cancel)
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const allowed = ['on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isParty =
    String(booking.customer) === String(req.user._id) ||
    (booking.worker && String(booking.worker) === String(req.user._id));
  if (!isParty && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (status === 'cancelled') {
    booking.cancelledBy = req.user._id;
    booking.cancelReason = reason || '';
  }
  if (status === 'completed') {
    booking.price.final = booking.price.final || booking.price.estimated;
    if (booking.worker) {
      await WorkerProfile.findOneAndUpdate(
        { user: booking.worker },
        { $inc: { totalJobsCompleted: 1 }, isAvailable: true }
      );
    }
  }
  if (status === 'cancelled' && booking.worker) {
    await WorkerProfile.findOneAndUpdate({ user: booking.worker }, { isAvailable: true });
  }

  pushTimeline(booking, status, reason || '');
  await booking.save();

  const populated = await booking.populate([
    { path: 'service' },
    { path: 'customer', select: 'name phone avatar' },
    { path: 'worker', select: 'name phone avatar' },
  ]);

  const io = req.app.get('io');
  if (io) io.to(`booking:${booking._id}`).emit('booking:updated', populated);

  const otherParty =
    String(booking.customer._id) === String(req.user._id) ? booking.worker?._id : booking.customer._id;
  if (otherParty) {
    emitToUser(req, otherParty, 'booking:updated', populated);
    await notify(req, otherParty, 'Booking update', `Booking status changed to ${status}`, 'booking', booking._id);
  }

  sendResponse(res, 200, true, 'Booking status updated', { booking: populated });
});

module.exports = {
  createBooking,
  getMyBookings,
  getNearbyOpenBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
};
