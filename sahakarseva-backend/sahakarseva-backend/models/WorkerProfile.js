const mongoose = require('mongoose');

const workerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    skills: [{ type: String, trim: true }],
    bio: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    documents: {
      idProofUrl: { type: String, default: '' },
      addressProofUrl: { type: String, default: '' },
      verified: { type: Boolean, default: false },
    },

    isOnline: { type: Boolean, default: false },       // socket connection state
    isSharingLocation: { type: Boolean, default: false }, // worker toggled "go online / share location"
    isAvailable: { type: Boolean, default: true },      // free to accept new jobs

    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      heading: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },

    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

workerProfileSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('WorkerProfile', workerProfileSchema);
