/**
 * Seed script.
 *   npm run seed          -> populate sample data
 *   npm run seed:destroy  -> wipe all collections
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const WorkerProfile = require('../models/WorkerProfile');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Location = require('../models/Location');

const services = [
  { name: 'Pipe Leak Repair', category: 'plumbing', basePrice: 250, priceUnit: 'job', description: 'Fix leaking pipes and joints' },
  { name: 'Bathroom Fitting', category: 'plumbing', basePrice: 400, priceUnit: 'job', description: 'Install taps, showers, fittings' },
  { name: 'Wiring & Switchboard', category: 'electrical', basePrice: 300, priceUnit: 'job', description: 'Wiring repair and switchboard installation' },
  { name: 'Fan / Light Installation', category: 'electrical', basePrice: 150, priceUnit: 'job', description: 'Install ceiling fans and lights' },
  { name: 'Home Deep Cleaning', category: 'cleaning', basePrice: 120, priceUnit: 'hour', description: 'Full home deep cleaning service' },
  { name: 'Sofa & Carpet Cleaning', category: 'cleaning', basePrice: 90, priceUnit: 'hour', description: 'Upholstery and carpet shampoo cleaning' },
  { name: 'Furniture Assembly', category: 'carpentry', basePrice: 200, priceUnit: 'job', description: 'Assemble and repair furniture' },
  { name: 'Wall Painting', category: 'painting', basePrice: 18, priceUnit: 'hour', description: 'Interior/exterior wall painting' },
  { name: 'AC Repair & Service', category: 'appliance_repair', basePrice: 350, priceUnit: 'job', description: 'AC gas refill, servicing & repair' },
  { name: 'Washing Machine Repair', category: 'appliance_repair', basePrice: 300, priceUnit: 'job', description: 'Diagnose and repair washing machines' },
  { name: 'Garden Maintenance', category: 'gardening', basePrice: 100, priceUnit: 'hour', description: 'Lawn mowing, trimming, upkeep' },
  { name: 'Local Home Shifting', category: 'moving', basePrice: 800, priceUnit: 'job', description: 'Packers & movers for local shifting' },
];

// Sample coordinates around Kalyan/Mumbai, Maharashtra for realistic geo-queries
const baseLng = 73.1305;
const baseLat = 19.2437;
const jitter = () => (Math.random() - 0.5) * 0.05;

const run = async () => {
  await connectDB();
  const destroy = process.argv.includes('-d');

  if (destroy) {
    await Promise.all([
      User.deleteMany(), WorkerProfile.deleteMany(), Service.deleteMany(), Booking.deleteMany(),
      Review.deleteMany(), Payment.deleteMany(), Message.deleteMany(), Notification.deleteMany(), Location.deleteMany(),
    ]);
    console.log('All collections cleared.');
    return process.exit(0);
  }

  await Promise.all([
    User.deleteMany(), WorkerProfile.deleteMany(), Service.deleteMany(), Booking.deleteMany(),
    Review.deleteMany(), Payment.deleteMany(), Message.deleteMany(), Notification.deleteMany(), Location.deleteMany(),
  ]);

  const createdServices = await Service.insertMany(services);
  console.log(`Seeded ${createdServices.length} services`);

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@sahakarseva.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true,
    phone: '9000000000',
  });

  const customerDetails = [
    ['Rahul Sharma', 'customer@sahakarseva.com', '9111111111'],
    ['Neha Joshi', 'neha@sahakarseva.com', '9111111112'],
    ['Amit Mehta', 'amit@sahakarseva.com', '9111111113'],
    ['Sneha Patil', 'sneha@sahakarseva.com', '9111111114'],
    ['Arjun Desai', 'arjun@sahakarseva.com', '9111111115'],
  ];

  const customers = await Promise.all(
    customerDetails.map(([name, email, phone], index) =>
      User.create({
        name,
        email,
        password: 'password123',
        role: 'customer',
        isVerified: true,
        phone,
        location: {
          coordinates: [baseLng + jitter(), baseLat + jitter()],
          address: index === 0 ? 'Kalyan, Maharashtra' : 'Thane, Maharashtra',
        },
      })
    )
  );
  const customer = customers[0];
  console.log(`Seeded ${customers.length} customers`);

  const workerNames = ['Suresh Patil', 'Anita Deshmukh', 'Vikram Jadhav', 'Priya Kulkarni', 'Ramesh Yadav'];
  const workers = [];
  for (const name of workerNames) {
    const email = `${name.split(' ')[0].toLowerCase()}@sahakarseva.com`;
    const user = await User.create({
      name,
      email,
      password: 'password123',
      role: 'worker',
      isVerified: true,
      phone: '9' + Math.floor(100000000 + Math.random() * 899999999),
      location: { coordinates: [baseLng + jitter(), baseLat + jitter()], address: 'Kalyan/Thane area' },
    });

    const assignedServices = createdServices
      .sort(() => 0.5 - Math.random())
      .slice(0, 2 + Math.floor(Math.random() * 2))
      .map((s) => s._id);

    const profile = await WorkerProfile.create({
      user: user._id,
      services: assignedServices,
      skills: ['punctual', 'verified', 'experienced'],
      bio: `Experienced professional offering reliable service in and around Kalyan.`,
      experienceYears: 2 + Math.floor(Math.random() * 8),
      hourlyRate: 100 + Math.floor(Math.random() * 200),
      isAvailable: true,
      isSharingLocation: true,
      isOnline: true,
      currentLocation: { type: 'Point', coordinates: [baseLng + jitter(), baseLat + jitter()], updatedAt: new Date() },
      rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
      totalReviews: Math.floor(Math.random() * 40),
      totalJobsCompleted: Math.floor(Math.random() * 60),
    });

    workers.push({ user, profile });
  }
  console.log(`Seeded ${workers.length} workers with profiles`);

  const sampleBooking = await Booking.create({
    customer: customer._id,
    worker: workers[0].user._id,
    service: createdServices[0]._id,
    status: 'completed',
    description: 'Kitchen sink pipe is leaking, needs urgent repair.',
    pickupLocation: { coordinates: [baseLng, baseLat], address: 'Kalyan, Maharashtra' },
    price: { estimated: 250, final: 250 },
    timeline: [
      { status: 'pending', note: 'Booking created' },
      { status: 'accepted', note: 'Worker accepted' },
      { status: 'completed', note: 'Job finished' },
    ],
  });

  await Review.create({
    booking: sampleBooking._id,
    customer: customer._id,
    worker: workers[0].user._id,
    rating: 5,
    comment: 'Quick and professional service. Fixed the leak in 20 minutes!',
  });

  await Payment.create({
    booking: sampleBooking._id,
    customer: customer._id,
    worker: workers[0].user._id,
    amount: 250,
    method: 'cash',
    status: 'paid',
  });

  console.log('----------------------------------------');
  console.log('Seed complete. Sample credentials:');
  console.log('  Admin    -> admin@sahakarseva.com / admin123');
  console.log('  Customers -> customer/neha/amit/sneha/arjun@sahakarseva.com / password123');
  console.log('  Workers   -> suresh/anita/vikram/priya/ramesh@sahakarseva.com / password123');
  console.log('----------------------------------------');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
