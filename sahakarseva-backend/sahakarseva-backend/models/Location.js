const mongoose = require('mongoose');

// Optional trail/history log of worker GPS pings for a booking (used for route replay / analytics)
const locationSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

locationSchema.index({ booking: 1, at: -1 });

module.exports = mongoose.model('Location', locationSchema);
