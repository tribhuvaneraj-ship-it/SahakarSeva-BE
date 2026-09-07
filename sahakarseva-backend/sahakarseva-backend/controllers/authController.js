const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const generateToken = require('../utils/generateToken');
const sendResponse = require('../utils/sendResponse');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register with email/password
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: ['worker', 'customer'].includes(role) ? role : 'customer',
    authProvider: 'local',
  });

  if (user.role === 'worker') {
    await WorkerProfile.create({ user: user._id });
  }

  sendResponse(res, 201, true, 'Registered successfully', {
    user: user.toSafeObject(),
    token: generateToken(user._id, user.role),
  });
});

// @desc    Login with email/password
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  sendResponse(res, 200, true, 'Logged in successfully', {
    user: user.toSafeObject(),
    token: generateToken(user._id, user.role),
  });
});

// @desc    Login/Register via Google ID token (frontend uses Google Identity Services to get idToken)
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, role } = req.body;
  if (!idToken) {
    res.status(400);
    throw new Error('idToken is required');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar: picture,
      authProvider: 'google',
      isVerified: true,
      role: ['worker', 'customer'].includes(role) ? role : 'customer',
    });
    if (user.role === 'worker') {
      await WorkerProfile.create({ user: user._id });
    }
  } else if (!user.googleId) {
    // Link existing local account to Google
    user.googleId = googleId;
    user.avatar = user.avatar || picture;
    user.isVerified = true;
    await user.save();
  }

  sendResponse(res, 200, true, 'Google authentication successful', {
    user: user.toSafeObject(),
    token: generateToken(user._id, user.role),
  });
});

// @desc    Get logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, true, 'Current user fetched', { user: req.user.toSafeObject() });
});

module.exports = { register, login, googleAuth, getMe };
