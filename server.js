const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const pool = require('./db/db');
const twilioRoutes = require('./routes/twilio');
const dashboardRoutes = require('./routes/dashboard');
const authMiddleware = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Twilio webhook routes (no auth required)
app.post('/twilio/sms', twilioRoutes.handleIncomingSms);
app.post('/twilio/status', twilioRoutes.handleSmsStatus);

// Dashboard routes (auth required)
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Authentication routes (no auth required)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, restaurantName, restaurantPhone } = req.body;

    if (!email || !password || !restaurantName || !restaurantPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO restaurants (email, password_hash, restaurant_name, phone, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, restaurant_name',
      [email, hashedPassword, restaurantName, restaurantPhone]
    );

    const restaurant = result.rows[0];
    const token = require('jsonwebtoken').sign(
      { restaurantId: restaurant.id },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Restaurant registered successfully',
      token,
      restaurant
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, restaurant_name FROM restaurants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const restaurant = result.rows[0];
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, restaurant.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = require('jsonwebtoken').sign(
      { restaurantId: restaurant.id },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      restaurant: {
        id: restaurant.id,
        email: restaurant.email,
        restaurant_name: restaurant.restaurant_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const testQuery = await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    app.listen(PORT, () => {
      console.log(`SMS Waitlist POC server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;