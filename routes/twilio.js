const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../db/pool');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const CONVERSATION_STEPS = {
  START: 'start',
  COLLECT_NAME: 'collect_name',
  COLLECT_PARTY_SIZE: 'collect_party_size',
  CONFIRMED: 'confirmed'
};

const parsePartySize = (input) => {
  const num = parseInt(input.trim(), 10);
  return num > 0 && num <= 20 ? num : null;
};

const sendSMS = async (to, message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error.message);
    throw error;
  }
};

const getRestaurantByPhone = async (restaurantPhone) => {
  const result = await db.query(
    'SELECT id, offline_status, offline_message FROM restaurants WHERE phone = $1',
    [restaurantPhone]
  );
  return result.rows[0] || null;
};

const getOrCreateConversation = async (incomingPhone, restaurantPhone) => {
  const result = await db.query(
    'SELECT * FROM conversations WHERE phone = $1 AND restaurant_id = (SELECT id FROM restaurants WHERE phone = $2)',
    [incomingPhone, restaurantPhone]
  );
  return result.rows[0] || null;
};

const updateConversationStep = async (incomingPhone, restaurantId, step, data = {}) => {
  const existingConversation = await db.query(
    'SELECT id FROM conversations WHERE phone = $1 AND restaurant_id = $2',
    [incomingPhone, restaurantId]
  );

  if (existingConversation.rows.length > 0) {
    await db.query(
      'UPDATE conversations SET step = $1, data = $2, updated_at = NOW() WHERE phone = $3 AND restaurant_id = $4',
      [step, JSON.stringify(data), incomingPhone, restaurantId]
    );
  } else {
    await db.query(
      'INSERT INTO conversations (phone, restaurant_id, step, data) VALUES ($1, $2, $3, $4)',
      [incomingPhone, restaurantId, step, JSON.stringify(data)]
    );
  }
};

const addCustomerToQueue = async (restaurantId, name, partySize, phone) => {
  const result = await db.query(
    'INSERT INTO customers (restaurant_id, name, party_size, phone, joined_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
    [restaurantId, name, partySize, phone]
  );
  return result.rows[0];
};

const buildTwilioResponse = (message) => {
  const VoiceResponse = twilio.twiml.MessagingResponse;
  const twiml = new VoiceResponse();
  twiml.message(message);
  return twiml.toString();
};

router.post('/sms', async (req, res) => {
  const incomingMessage = req.body.Body?.trim() || '';
  const incomingPhone = req.body.From;
  const restaurantPhone = req.body.To;

  try {
    const restaurant = await getRestaurantByPhone(restaurantPhone);

    if (!restaurant) {
      console.warn(`No restaurant found for phone ${restaurantPhone}`);
      res.type('text/xml').send(buildTwilioResponse('Sorry, we could not process your request.'));
      return;
    }

    if (restaurant.offline_status) {
      const offlineMessage = restaurant.offline_message || 'We are currently closed. Please try again later.';
      res.type('text/xml').send(buildTwilioResponse(offlineMessage));
      return;
    }

    const conversation = await getOrCreateConversation(incomingPhone, restaurantPhone);

    let currentStep = conversation?.step || CONVERSATION_STEPS.START;
    let conversationData = conversation?.data ? JSON.parse(conversation.data) : {};
    let responseMessage = '';

    if (currentStep === CONVERSATION_STEPS.START) {
      responseMessage = 'Welcome! What is your name?';
      await updateConversationStep(incomingPhone, restaurant.id, CONVERSATION_STEPS.COLLECT_NAME, {});
    } else if (currentStep === CONVERSATION_STEPS.COLLECT_NAME) {
      if (!incomingMessage) {
        responseMessage = 'Please provide your name.';
      } else {
        conversationData.name = incomingMessage;
        responseMessage = 'How many people in your party?';
        await updateConversationStep(incomingPhone, restaurant.id, CONVERSATION_STEPS.COLLECT_PARTY_SIZE, conversationData);
      }
    } else if (currentStep === CONVERSATION_STEPS.COLLECT_PARTY_SIZE) {
      const partySize = parsePartySize(incomingMessage);
      if (!partySize) {
        responseMessage = 'Please enter a valid party size (1-20).';
      } else {
        conversationData.partySize = partySize;
        await addCustomerToQueue(restaurant.id, conversationData.name, partySize, incomingPhone);
        responseMessage = `Thanks ${conversationData.name}! Your party of ${partySize} has been added to the waitlist. We'll text you when your table is ready.`;
        await updateConversationStep(incomingPhone, restaurant.id, CONVERSATION_STEPS.CONFIRMED, conversationData);
      }
    } else if (currentStep === CONVERSATION_STEPS.CONFIRMED) {
      responseMessage = 'You are already on the waitlist. We\'ll text you when your table is ready.';
    }

    res.type('text/xml').send(buildTwilioResponse(responseMessage));
  } catch (error) {
    console.error('Error processing SMS:', error);
    res.type('text/xml').send(buildTwilioResponse('An error occurred. Please try again later.'));
  }
});

router.post('/notify-customer', async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required' });
  }

  try {
    const customerResult = await db.query(
      'SELECT id, name, phone, restaurant_id FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];
    const message = `Your table is ready, ${customer.name}! Please head to the restaurant.`;

    await sendSMS(customer.phone, message);

    await db.query(
      'UPDATE customers SET notified_at = NOW() WHERE id = $1',
      [customerId]
    );

    return res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error notifying customer:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;