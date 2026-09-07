const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const sendResponse = require('../utils/sendResponse');

// Do not construct the SDK during application startup: Razorpay rejects empty
// credentials, which otherwise prevents unrelated API routes from starting.
const getRazorpayClient = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error('Online payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    error.statusCode = 503;
    throw error;
  }

  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

// @desc    Create a Razorpay order for a booking
// @route   POST /api/payments/create-order
// @access  Private (customer)
const createOrder = asyncHandler(async (req, res) => {
  const razorpay = getRazorpayClient();
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized for this booking');
  }

  const amount = Math.round((booking.price.final || booking.price.estimated || 0) * 100); // paise
  if (amount <= 0) {
    res.status(400);
    throw new Error('Invalid booking amount');
  }

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `booking_${booking._id}`,
  });

  const payment = await Payment.create({
    booking: booking._id,
    customer: booking.customer,
    worker: booking.worker,
    amount: amount / 100,
    razorpayOrderId: order.id,
    status: 'created',
  });

  booking.payment = payment._id;
  await booking.save();

  sendResponse(res, 201, true, 'Order created', {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    paymentId: payment._id,
  });
});

// @desc    Verify Razorpay payment signature after checkout completes on frontend
// @route   POST /api/payments/verify
// @access  Private (customer)
const verifyPayment = asyncHandler(async (req, res) => {
  getRazorpayClient();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  if (generatedSignature !== razorpay_signature) {
    payment.status = 'failed';
    await payment.save();
    res.status(400);
    throw new Error('Payment signature verification failed');
  }

  payment.status = 'paid';
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  await payment.save();

  sendResponse(res, 200, true, 'Payment verified successfully', { payment });
});

// @desc    Record a cash payment (worker/admin marks as paid in cash)
// @route   POST /api/payments/cash
// @access  Private (worker)
const recordCashPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const payment = await Payment.create({
    booking: booking._id,
    customer: booking.customer,
    worker: booking.worker,
    amount,
    method: 'cash',
    status: 'paid',
  });

  booking.payment = payment._id;
  await booking.save();

  sendResponse(res, 201, true, 'Cash payment recorded', { payment });
});

module.exports = { createOrder, verifyPayment, recordCashPayment };
