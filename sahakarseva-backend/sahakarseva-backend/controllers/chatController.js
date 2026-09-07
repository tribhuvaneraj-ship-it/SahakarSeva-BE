const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const sendResponse = require('../utils/sendResponse');

// @desc    Get chat history for a booking
// @route   GET /api/chat/:bookingId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  const isParty =
    String(booking.customer) === String(req.user._id) ||
    (booking.worker && String(booking.worker) === String(req.user._id));
  if (!isParty) {
    res.status(403);
    throw new Error('Not authorized to view this chat');
  }

  const messages = await Message.find({ booking: req.params.bookingId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: 1 });

  await Message.updateMany(
    { booking: req.params.bookingId, receiver: req.user._id, read: false },
    { read: true }
  );

  sendResponse(res, 200, true, 'Messages fetched', { messages });
});

// REST fallback for sending a message (primary path is Socket.IO 'chat:send' event)
// @route   POST /api/chat/:bookingId
const sendMessageRest = asyncHandler(async (req, res) => {
  const { text, receiverId } = req.body;
  const message = await Message.create({
    booking: req.params.bookingId,
    sender: req.user._id,
    receiver: receiverId,
    text,
  });
  const populated = await message.populate('sender', 'name avatar');

  const io = req.app.get('io');
  if (io) {
    io.to(`booking:${req.params.bookingId}`).emit('chat:message', populated);
    io.to(`user:${receiverId}`).emit('chat:message', populated);
  }

  sendResponse(res, 201, true, 'Message sent', { message: populated });
});

module.exports = { getMessages, sendMessageRest };
