require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const User = require('./models/User');
const Flight = require('./models/Flight');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/support', require('./routes/support'));
app.use('/api/admin', require('./routes/admin'));

// Seed
app.post('/api/seed', async (req, res) => {
  try {
    // Admin
    let admin = await User.findOne({ email: 'admin@luxeflights.com' });
    if (!admin) admin = await User.create({ name: 'Luxe Admin', email: 'admin@luxeflights.com', password: 'Admin@123', role: 'admin' });

    // Demo user
    let demo = await User.findOne({ email: 'demo@luxeflights.com' });
    if (!demo) demo = await User.create({ name: 'Sarah Connor', email: 'demo@luxeflights.com', password: 'Demo@123', phone: '+91 9876543210' });

    // Flights
    const existing = await Flight.countDocuments();
    if (existing === 0) {
      const today = new Date();
      const d = (days) => { const dt = new Date(today); dt.setDate(dt.getDate() + days); return dt; };

      await Flight.insertMany([
        { flightNumber: 'LX101', airline: 'Luxe Air', from: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, to: { city: 'Delhi', airport: 'Indira Gandhi International', code: 'DEL' }, departureTime: '06:00', arrivalTime: '08:15', duration: '2h 15m', date: d(2), class: 'Economy', price: 3500, totalSeats: 180, availableSeats: 120, stops: 0, amenities: ['WiFi', 'Meal', 'Entertainment'], baggage: '20kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX102', airline: 'Luxe Air', from: { city: 'Delhi', airport: 'Indira Gandhi International', code: 'DEL' }, to: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, departureTime: '14:00', arrivalTime: '16:20', duration: '2h 20m', date: d(2), class: 'Economy', price: 3200, totalSeats: 180, availableSeats: 95, stops: 0, amenities: ['WiFi', 'Snacks'], baggage: '20kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX201', airline: 'Luxe Business', from: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, to: { city: 'Bangalore', airport: 'Kempegowda International', code: 'BLR' }, departureTime: '09:30', arrivalTime: '11:15', duration: '1h 45m', date: d(3), class: 'Business', price: 8500, totalSeats: 60, availableSeats: 22, stops: 0, amenities: ['WiFi', 'Premium Meal', 'Lounge Access', 'Priority Boarding'], baggage: '32kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX301', airline: 'Luxe Air', from: { city: 'Bangalore', airport: 'Kempegowda International', code: 'BLR' }, to: { city: 'Chennai', airport: 'Chennai International', code: 'MAA' }, departureTime: '12:00', arrivalTime: '13:10', duration: '1h 10m', date: d(4), class: 'Economy', price: 2100, totalSeats: 150, availableSeats: 88, stops: 0, amenities: ['Snacks', 'WiFi'], baggage: '15kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX401', airline: 'Luxe International', from: { city: 'Delhi', airport: 'Indira Gandhi International', code: 'DEL' }, to: { city: 'Dubai', airport: 'Dubai International', code: 'DXB' }, departureTime: '23:45', arrivalTime: '01:30', duration: '3h 45m', date: d(5), class: 'Economy', price: 15000, totalSeats: 220, availableSeats: 145, stops: 0, amenities: ['WiFi', 'Meal', 'Entertainment', 'USB Charging'], baggage: '25kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX402', airline: 'Luxe International', from: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, to: { city: 'London', airport: 'Heathrow Airport', code: 'LHR' }, departureTime: '02:15', arrivalTime: '07:30', duration: '9h 15m', date: d(7), class: 'Business', price: 85000, totalSeats: 48, availableSeats: 18, stops: 0, amenities: ['Flat Bed', 'Premium Dining', 'Spa Kit', 'WiFi', 'Lounge'], baggage: '40kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX501', airline: 'Luxe Air', from: { city: 'Kolkata', airport: 'Netaji Subhash Chandra Bose', code: 'CCU' }, to: { city: 'Delhi', airport: 'Indira Gandhi International', code: 'DEL' }, departureTime: '07:00', arrivalTime: '09:30', duration: '2h 30m', date: d(3), class: 'Economy', price: 4200, totalSeats: 160, availableSeats: 110, stops: 0, amenities: ['WiFi', 'Snacks'], baggage: '20kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX601', airline: 'Luxe First', from: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, to: { city: 'Singapore', airport: 'Changi Airport', code: 'SIN' }, departureTime: '22:00', arrivalTime: '06:30', duration: '5h 30m', date: d(10), class: 'First Class', price: 120000, totalSeats: 12, availableSeats: 6, stops: 0, amenities: ['Private Suite', 'Michelin Dining', 'Spa', 'Chauffeur', 'WiFi'], baggage: '50kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX701', airline: 'Luxe Air', from: { city: 'Hyderabad', airport: 'Rajiv Gandhi International', code: 'HYD' }, to: { city: 'Mumbai', airport: 'Chhatrapati Shivaji', code: 'BOM' }, departureTime: '15:30', arrivalTime: '17:05', duration: '1h 35m', date: d(2), class: 'Economy', price: 2800, totalSeats: 180, availableSeats: 130, stops: 0, amenities: ['WiFi', 'Snacks'], baggage: '20kg', refundable: true, isActive: true, createdBy: admin._id },
        { flightNumber: 'LX801', airline: 'Luxe Air', from: { city: 'Delhi', airport: 'Indira Gandhi International', code: 'DEL' }, to: { city: 'Goa', airport: 'Dabolim Airport', code: 'GOI' }, departureTime: '10:15', arrivalTime: '12:30', duration: '2h 15m', date: d(6), class: 'Economy', price: 5500, totalSeats: 180, availableSeats: 75, stops: 0, amenities: ['WiFi', 'Meal', 'Entertainment'], baggage: '20kg', refundable: true, isActive: true, createdBy: admin._id },
      ]);
    }

    res.json({
      success: true,
      message: '✅ Demo data seeded!',
      credentials: {
        admin: { email: 'admin@luxeflights.com', password: 'Admin@123' },
        user: { email: 'demo@luxeflights.com', password: 'Demo@123' }
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// HTML pages
const pages = ['login', 'register', 'dashboard', 'flights', 'booking', 'my-bookings', 'refunds', 'support', 'profile', 'admin', 'track'];
pages.forEach(p => {
  app.get(`/${p}`, (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', `${p}.html`)));
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Luxe Flights running on http://localhost:${PORT}`);
  console.log(`🌱 Seed data: POST http://localhost:${PORT}/api/seed`);
});
