# SMS Waitlist POC

A lightweight SMS-based waitlist management system for independent restaurants and cafes. Customers text to join the queue, and owners manage notifications through a simple web dashboard.

## Features

- **SMS Waitlist Enrollment**: Customers text your restaurant number to join the queue
- **Simple Dashboard**: View your queue in real-time with customer names, party sizes, and arrival times
- **Table Ready Notifications**: Click a button to notify customers when their table is ready
- **Auto-Responder**: Automatic SMS responses when your restaurant is offline or closed
- **Twilio Integration**: Low-cost SMS backbone with minimal setup

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React
- **SMS**: Twilio API
- **Hosting**: Heroku or Railway

## Prerequisites

- Node.js (v16+)
- PostgreSQL (local or cloud instance)
- Twilio account with an SMS-enabled phone number
- Git

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd sms-waitlist-poc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/sms_waitlist
JWT_SECRET=your-secret-key-change-this
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
RESTAURANT_PHONE_NUMBER=+1234567890
BASE_URL=http://localhost:3000
```

### 4. Set up the database

```bash
createdb sms_waitlist
psql sms_waitlist < db/schema.sql
```

Or if using a remote database, run the schema.sql file against your PostgreSQL instance:

```bash
psql $DATABASE_URL < db/schema.sql
```

### 5. Start the development server

```bash
npm start
```

The server will run on `http://localhost:3000`.

## Usage

### For Restaurant Owners

1. **Sign up**: Visit `http://localhost:3000` and create an account with your restaurant email
2. **Configure hours**: Set your restaurant's operating hours and offline message
3. **Share your SMS number**: Provide customers with your Twilio SMS number
4. **Manage queue**: 
   - View customers in real-time on the dashboard
   - Click "Table Ready" when a table is available
   - Toggle "Go Offline" to enable auto-responder

### For Customers

1. **Join the queue**: Text your name to the restaurant's SMS number
2. **Provide party size**: Reply with the number of people in your party
3. **Wait for notification**: Receive an SMS when your table is ready

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new restaurant account
- `POST /api/auth/login` - Log in to your account
- `POST /api/auth/logout` - Log out

### Dashboard

- `GET /api/dashboard/queue` - Get current waitlist (requires auth)
- `POST /api/dashboard/table-ready` - Notify a customer their table is ready (requires auth)
- `PUT /api/dashboard/settings` - Update restaurant hours and settings (requires auth)
- `GET /api/dashboard/settings` - Get current restaurant settings (requires auth)

### Twilio Webhooks

- `POST /api/twilio/sms` - Receive and process incoming SMS messages
- `POST /api/twilio/status` - Receive SMS delivery status updates

## Project Structure

```
.
├── README.md                 # This file
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── server.js                 # Express server entry point
├── db/
│   └── schema.sql            # PostgreSQL database schema
├── routes/
│   ├── twilio.js             # Twilio webhook handlers
│   └── dashboard.js          # Dashboard API endpoints
├── middleware/
│   └── auth.js               # Authentication middleware
├── public/
│   └── index.html            # HTML entry point
└── src/
    └── App.jsx               # React app component
```

## Deployment

### Deploy to Heroku

1. Install the Heroku CLI
2. Log in: `heroku login`
3. Create an app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set TWILIO_ACCOUNT_SID=your-sid
   heroku config:set TWILIO_AUTH_TOKEN=your-token
   heroku config:set TWILIO_PHONE_NUMBER=your-number
   heroku config:set JWT_SECRET=your-secret
   heroku config:set DATABASE_URL=your-postgres-url
   ```
5. Deploy: `git push heroku main`
6. Run migrations: `heroku run "psql $DATABASE_URL < db/schema.sql"`

### Configure Twilio Webhook

1. Go to your Twilio console
2. Select your SMS-enabled phone number
3. Set the "A Message Comes In" webhook to: `https://your-app-url.herokuapp.com/api/twilio/sms`
4. Set the webhook method to POST

## SMS Conversation Flow

### Joining the queue

```
Customer: Hi
Restaurant Bot: Hi! What's your name?

Customer: John
Restaurant Bot: Thanks John! How many people in your party?

Customer: 2
Restaurant Bot: Perfect! You're now #3 on the waitlist for 2 people. We'll text you when your table is ready. Estimated wait: 20-30 minutes.
```

### Table ready notification

```
Restaurant Bot: Hi John! Your table is ready. Please head to the restaurant.
```

### When offline

```
Customer: Hi
Restaurant Bot: Thanks for contacting us! We're currently closed. We'll be open tomorrow at 10am. Text us then!
```

## Development

### Run tests

```bash
npm test
```

### Run linter

```bash
npm run lint
```

### Build frontend

```bash
npm run build
```

## Troubleshooting

### Twilio webhook not receiving messages

- Verify your Twilio phone number has SMS capability
- Check the webhook URL is correctly configured in Twilio console
- Check server logs for errors: `heroku logs --tail`

### Database connection error

- Verify `DATABASE_URL` is correct in `.env`
- Ensure PostgreSQL is running (for local development)
- Check credentials and database name

### Customers not receiving SMS

- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Check Twilio account has sufficient balance
- Review Twilio logs for failed deliveries

### Restaurant can't log in

- Verify email and password are correct
- Check database has users table created from schema.sql
- Clear browser cache and try again

## Features Not Included in MVP

- Mobile app
- Advanced analytics and reporting
- Multiple users per restaurant
- Queue reordering
- Photo or dietary preference collection
- Integration with POS systems
- SMS confirmation before table notification
- Multi-location support

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review server logs: `npm start` or `heroku logs --tail`
3. Check Twilio console for SMS delivery status
4. Review database schema in `db/schema.sql`

## License

Proprietary - POC Only

## Feedback

This is a proof-of-concept. We're looking for feedback from restaurant owners on:

- Dashboard usability and workflow
- SMS conversation clarity and flow
- Feature prioritization for future versions
- Pricing and deployment preferences

Please share your experience and suggestions.