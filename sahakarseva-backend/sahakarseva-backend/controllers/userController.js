const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const sendResponse = require('../utils/sendResponse');
const { getDistanceKm } = require('../utils/geoUtils');

// @desc    Update own profile (name, phone, avatar, base location)
// @route   PUT /api/users/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar, lng, lat, address } = req.body;

  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatar) user.avatar = avatar;
  if (lng !== undefined && lat !== undefined) {
    user.location.coordinates = [Number(lng), Number(lat)];
    user.location.address = address || user.location.address;
    user.location.updatedAt = new Date();
  }
  await user.save();

  sendResponse(res, 200, true, 'Profile updated', { user: user.toSafeObject() });
});

// @desc    Get / create worker profile (skills, hourly rate, services, bio)
// @route   GET /api/users/worker-profile
// @route   PUT /api/users/worker-profile
// @access  Private (worker)
const getWorkerProfile = asyncHandler(async (req, res) => {
  let profile = await WorkerProfile.findOne({ user: req.user._id }).populate('services');
  if (!profile) profile = await WorkerProfile.create({ user: req.user._id });
  sendResponse(res, 200, true, 'Worker profile fetched', { profile });
});

const updateWorkerProfile = asyncHandler(async (req, res) => {
  const { skills, bio, experienceYears, hourlyRate, services } = req.body;
  let profile = await WorkerProfile.findOne({ user: req.user._id });
  if (!profile) profile = new WorkerProfile({ user: req.user._id });

  if (skills) profile.skills = skills;
  if (bio !== undefined) profile.bio = bio;
  if (experienceYears !== undefined) profile.experienceYears = experienceYears;
  if (hourlyRate !== undefined) profile.hourlyRate = hourlyRate;
  if (services) profile.services = services;

  await profile.save();
  sendResponse(res, 200, true, 'Worker profile updated', { profile });
});

// @desc    Toggle worker "go online" / location sharing state (REST fallback; Socket.IO also updates this)
// @route   PUT /api/users/worker-profile/availability
// @access  Private (worker)
const setAvailability = asyncHandler(async (req, res) => {
  const { isAvailable, isSharingLocation } = req.body;
  const profile = await WorkerProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      ...(isAvailable !== undefined && { isAvailable }),
      ...(isSharingLocation !== undefined && { isSharingLocation }),
    },
    { new: true, upsert: true }
  );
  sendResponse(res, 200, true, 'Availability updated', { profile });
});

// @desc    Find nearby available workers for a given service & coordinates
// @route   GET /api/users/nearby-workers?serviceId=&lng=&lat=&radiusKm=
// @access  Private
const getNearbyWorkers = asyncHandler(async (req, res) => {
  const { serviceId, lng, lat, radiusKm = 10 } = req.query;
  if (lng === undefined || lat === undefined) {
    res.status(400);
    throw new Error('lng and lat query params are required');
  }

  const query = {
    isAvailable: true,
    isSharingLocation: true,
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000,
      },
    },
  };
  if (serviceId) query.services = serviceId;

  const profiles = await WorkerProfile.find(query)
    .populate('user', 'name avatar phone')
    .populate('services', 'name category basePrice priceUnit')
    .limit(50);

  const results = profiles.map((p) => ({
    workerProfileId: p._id,
    worker: p.user,
    services: p.services,
    rating: p.rating,
    hourlyRate: p.hourlyRate,
    distanceKm: Number(
      getDistanceKm([Number(lng), Number(lat)], p.currentLocation.coordinates).toFixed(2)
    ),
    currentLocation: p.currentLocation,
  }));

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  sendResponse(res, 200, true, 'Nearby workers fetched', { workers: results });
});

module.exports = {
  updateMe,
  getWorkerProfile,
  updateWorkerProfile,
  setAvailability,
  getNearbyWorkers,
};
