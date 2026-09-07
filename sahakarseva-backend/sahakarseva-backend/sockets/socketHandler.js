const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Location = require('../models/Location');

/**
 * Socket.IO auth middleware — client connects with:
 *   io(URL, { auth: { token: '<JWT>' } })
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
};

const initSocket = (io) => {
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role}) [${socket.id}]`);

    // Personal room — used for direct notifications/booking events to this user
    socket.join(`user:${userId}`);

    if (socket.user.role === 'worker') {
      await WorkerProfile.findOneAndUpdate({ user: userId }, { isOnline: true });
    }

    // ---- Join a booking room (both customer & worker do this on the tracking screen) ----
    socket.on('booking:join', async ({ bookingId }) => {
      if (!bookingId) return;
      const booking = await Booking.findById(bookingId);
      if (!booking) return;
      const isParty =
        String(booking.customer) === userId || (booking.worker && String(booking.worker) === userId);
      if (!isParty) return;
      socket.join(`booking:${bookingId}`);
    });

    socket.on('booking:leave', ({ bookingId }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    // ---- Worker toggles "Go Online" / starts sharing location ----
    socket.on('worker:start_sharing', async () => {
      if (socket.user.role !== 'worker') return;
      await WorkerProfile.findOneAndUpdate(
        { user: userId },
        { isSharingLocation: true, isOnline: true }
      );
      socket.emit('worker:sharing_status', { isSharingLocation: true });
    });

    socket.on('worker:stop_sharing', async () => {
      if (socket.user.role !== 'worker') return;
      await WorkerProfile.findOneAndUpdate({ user: userId }, { isSharingLocation: false });
      socket.emit('worker:sharing_status', { isSharingLocation: false });
    });

    // ---- Worker sends a live GPS ping: { lng, lat, heading, speed, bookingId? } ----
    socket.on('worker:location_update', async (payload) => {
      if (socket.user.role !== 'worker') return;
      const { lng, lat, heading = 0, speed = 0, bookingId } = payload || {};
      if (lng === undefined || lat === undefined) return;

      const coordinates = [Number(lng), Number(lat)];

      await WorkerProfile.findOneAndUpdate(
        { user: userId },
        {
          currentLocation: { type: 'Point', coordinates, heading, speed, updatedAt: new Date() },
        }
      );

      const broadcastPayload = {
        workerId: userId,
        coordinates,
        heading,
        speed,
        at: new Date(),
      };

      if (bookingId) {
        // Persist trail for this active job & notify only the customer in that booking room
        Location.create({ booking: bookingId, worker: userId, coordinates, heading, speed }).catch(() => {});
        await Booking.findByIdAndUpdate(bookingId, {
          'liveTracking.lastLocation': { coordinates, updatedAt: new Date() },
        });
        io.to(`booking:${bookingId}`).emit('tracking:worker_location', { bookingId, ...broadcastPayload });
      } else {
        // General "browse map" broadcast (e.g. customers viewing nearby workers before booking)
        io.to('nearby-watchers').emit('tracking:nearby_worker_location', broadcastPayload);
      }
    });

    // Customers who want live updates of ALL nearby available workers on a browse/search map
    socket.on('customer:watch_nearby', () => {
      if (socket.user.role === 'customer') socket.join('nearby-watchers');
    });
    socket.on('customer:unwatch_nearby', () => {
      socket.leave('nearby-watchers');
    });

    // ---- Chat ----
    socket.on('chat:send', async ({ bookingId, receiverId, text }) => {
      if (!bookingId || !receiverId || !text?.trim()) return;
      const message = await Message.create({
        booking: bookingId,
        sender: userId,
        receiver: receiverId,
        text: text.trim(),
      });
      const populated = await message.populate('sender', 'name avatar');

      io.to(`booking:${bookingId}`).emit('chat:message', populated);
      io.to(`user:${receiverId}`).emit('chat:message', populated);
    });

    socket.on('chat:typing', ({ bookingId, receiverId, isTyping }) => {
      io.to(`user:${receiverId}`).emit('chat:typing', { bookingId, from: userId, isTyping });
    });

    // ---- Disconnect ----
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.user.name} [${socket.id}]`);
      if (socket.user.role === 'worker') {
        // Give a brief grace period in case of quick reconnects (page refresh) before marking offline
        setTimeout(async () => {
          const sockets = await io.in(`user:${userId}`).fetchSockets();
          if (sockets.length === 0) {
            await WorkerProfile.findOneAndUpdate(
              { user: userId },
              { isOnline: false, isSharingLocation: false }
            );
            io.to('nearby-watchers').emit('tracking:worker_offline', { workerId: userId });
          }
        }, 5000);
      }
    });
  });
};

module.exports = initSocket;
