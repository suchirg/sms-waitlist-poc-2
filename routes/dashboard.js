const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');

// Get queue for a restaurant
router.get('/queue', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const queue = await db.query(
      `SELECT id, name, party_size, phone, joined_at, notified_at
       FROM customers
       WHERE restaurant_id = $1 AND notified_at IS NULL
       ORDER BY joined_at ASC`,
      [restaurantId]
    );

    const notifiedCustomers = await db.query(
      `SELECT id, name, party_size, phone, joined_at, notified_at
       FROM customers
       WHERE restaurant_id = $1 AND notified_at IS NOT NULL
       ORDER BY notified_at DESC
       LIMIT 20`,
      [restaurantId]
    );

    res.json({
      queue: queue.rows,
      recent: notifiedCustomers.rows,
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Get restaurant settings
router.get('/settings', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const restaurant = await db.query(
      `SELECT id, phone, hours, offline_status, offline_message, timezone
       FROM restaurants
       WHERE id = $1`,
      [restaurantId]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(restaurant.rows[0]);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update restaurant settings
router.post('/settings', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { hours, offline_message, timezone } = req.body;

    if (!hours || !timezone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `UPDATE restaurants
       SET hours = $1, offline_message = $2, timezone = $3
       WHERE id = $4
       RETURNING id, phone, hours, offline_status, offline_message, timezone`,
      [hours, offline_message || '', timezone, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Toggle offline status
router.post('/toggle-offline', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const restaurant = await db.query(
      `SELECT offline_status FROM restaurants WHERE id = $1`,
      [restaurantId]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const newOfflineStatus = !restaurant.rows[0].offline_status;

    const result = await db.query(
      `UPDATE restaurants
       SET offline_status = $1
       WHERE id = $2
       RETURNING id, phone, hours, offline_status, offline_message, timezone`,
      [newOfflineStatus, restaurantId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling offline status:', error);
    res.status(500).json({ error: 'Failed to toggle offline status' });
  }
});

// Notify customer (table ready)
router.post('/notify-customer/:customerId', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { customerId } = req.params;

    const customer = await db.query(
      `SELECT c.id, c.name, c.phone, c.notified_at, r.phone as restaurant_phone
       FROM customers c
       JOIN restaurants r ON c.restaurant_id = r.id
       WHERE c.id = $1 AND c.restaurant_id = $2`,
      [customerId, restaurantId]
    );

    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerRecord = customer.rows[0];

    if (customerRecord.notified_at !== null) {
      return res.status(400).json({ error: 'Customer already notified' });
    }

    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await twilio.messages.create({
      body: `Hi ${customerRecord.name}! Your table is ready. Please head to the restaurant.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: customerRecord.phone,
    });

    const result = await db.query(
      `UPDATE customers
       SET notified_at = NOW()
       WHERE id = $1
       RETURNING id, name, party_size, phone, joined_at, notified_at`,
      [customerId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error notifying customer:', error);
    res.status(500).json({ error: 'Failed to notify customer' });
  }
});

// Remove customer from queue
router.delete('/customer/:customerId', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { customerId } = req.params;

    const result = await db.query(
      `DELETE FROM customers
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [customerId, restaurantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer removed from queue' });
  } catch (error) {
    console.error('Error removing customer:', error);
    res.status(500).json({ error: 'Failed to remove customer' });
  }
});

// Get restaurant info for display
router.get('/restaurant-info', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const restaurant = await db.query(
      `SELECT id, name, phone, hours, offline_status, timezone
       FROM restaurants
       WHERE id = $1`,
      [restaurantId]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json(restaurant.rows[0]);
  } catch (error) {
    console.error('Error fetching restaurant info:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant info' });
  }
});

// Clear all notified customers (archive)
router.post('/clear-notified', auth, async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const result = await db.query(
      `DELETE FROM customers
       WHERE restaurant_id = $1 AND notified_at IS NOT NULL`,
      [restaurantId]
    );

    res.json({
      success: true,
      message: `Cleared ${result.rowCount} notified customers`,
    });
  } catch (error) {
    console.error('Error clearing notified customers:', error);
    res.status(500).json({ error: 'Failed to clear notified customers' });
  }
});

module.exports = router;