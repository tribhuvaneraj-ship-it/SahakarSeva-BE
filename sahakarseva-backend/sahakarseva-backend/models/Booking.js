const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

    status: {
      type: String,
      enum: [
        'pending',      // just created, searching for / awaiting a worker
        'requested',    // sent to a specific worker, awaiting accept/reject
        'accepted',     // worker accepted
        'rejected',     // worker rejected
        'on_the_way',   // worker en route (location sharing on)
        'arrived',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },

    description: { type: String, default: '' },
    scheduledAt: { type: Date, default: Date.now },

    pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      address: { type: String, default: '' },
    },

    price: {
      estimated: { type: Number, default: 0 },
      final: { type: Number, default: 0 },
    },

    // Denormalized snapshot of worker's route while job is active (latest point kept here,
    // full trail is also emitted live via Socket.IO / Location collection)
    liveTracking: {
      lastLocation: {
        coordinates: { type: [Number], default: [0, 0] },
        updatedAt: { type: Date, default: null },
      },
    },

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelReason: { type: String, default: '' },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },

    timeline: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

bookingSchema.index({ pickupLocation: '2dsphere' });

module.exports = mongoose.model('Booking', bookingSchema);
