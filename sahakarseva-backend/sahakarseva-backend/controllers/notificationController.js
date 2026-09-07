const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const sendResponse = require('../utils/sendResponse');

const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  sendResponse(res, 200, true, 'Notifications fetched', { notifications });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  sendResponse(res, 200, true, 'Notification marked read', { notification });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  sendResponse(res, 200, true, 'All notifications marked read');
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
