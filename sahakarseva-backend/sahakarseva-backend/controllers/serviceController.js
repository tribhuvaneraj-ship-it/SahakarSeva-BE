const asyncHandler = require('express-async-handler');
const Service = require('../models/Service');
const sendResponse = require('../utils/sendResponse');

// @desc    List / search services
// @route   GET /api/services?q=&category=
// @access  Public
const getServices = asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (q) filter.$text = { $search: q };

  const services = await Service.find(filter).sort({ name: 1 });
  sendResponse(res, 200, true, 'Services fetched', { services });
});

const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  sendResponse(res, 200, true, 'Service fetched', { service });
});

// @desc    Create service (admin)
// @route   POST /api/services
const createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  sendResponse(res, 201, true, 'Service created', { service });
});

// @desc    Update service (admin)
// @route   PUT /api/services/:id
const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  sendResponse(res, 200, true, 'Service updated', { service });
});

// @desc    Delete (deactivate) service (admin)
// @route   DELETE /api/services/:id
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  sendResponse(res, 200, true, 'Service deactivated', { service });
});

module.exports = { getServices, getServiceById, createService, updateService, deleteService };
