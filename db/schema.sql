CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  restaurant_name VARCHAR(255) NOT NULL,
  offline_status BOOLEAN DEFAULT FALSE,
  offline_message TEXT,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  party_size INTEGER NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  step VARCHAR(50) NOT NULL,
  current_name VARCHAR(255),
  current_party_size INTEGER,
  last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sms_logs (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  message_body TEXT NOT NULL,
  message_sid VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_joined_at ON customers(joined_at);
CREATE INDEX idx_conversations_restaurant_phone ON conversations(restaurant_id, phone_number);
CREATE INDEX idx_sms_logs_restaurant_id ON sms_logs(restaurant_id);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);