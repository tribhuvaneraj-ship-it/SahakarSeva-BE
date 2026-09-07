const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['plumbing', 'electrical', 'cleaning', 'carpentry', 'painting', 'appliance_repair', 'gardening', 'moving', 'other'],
    },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    basePrice: { type: Number, required: true },
    priceUnit: { type: String, enum: ['hour', 'job'], default: 'hour' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ name: 'text', category: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
