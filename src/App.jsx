import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [queue, setQueue] = useState([]);
  const [restaurantSettings, setRestaurantSettings] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [notifyingCustomerId, setNotifyingCustomerId] = useState(null);
  const [queueRefreshInterval, setQueueRefreshInterval] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchQueue();
      fetchRestaurantSettings();
      const interval = setInterval(() => {
        fetchQueue();
      }, 5000);
      setQueueRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Email and password are required');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setLoginEmail('');
        setLoginPassword('');
      } else {
        const errorData = await response.json();
        setLoginError(errorData.message || 'Login failed');
      }
    } catch (error) {
      setLoginError('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setQueue([]);
      setRestaurantSettings(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/dashboard/queue', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setQueue(data.customers || []);
      } else if (response.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchRestaurantSettings = async () => {
    try {
      const response = await fetch('/api/dashboard/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRestaurantSettings(data.restaurant);
        setIsOffline(data.restaurant.offline_status || false);
        setOfflineMessage(data.restaurant.offline_message || '');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleTableReady = async (customerId, customerName) => {
    setNotifyingCustomerId(customerId);
    try {
      const response = await fetch('/api/dashboard/notify-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_id: customerId,
        }),
      });

      if (response.ok) {
        setQueue(
          queue.map((customer) =>
            customer.id === customerId
              ? { ...customer, notified_at: new Date().toISOString() }
              : customer
          )
        );
      } else {
        alert('Failed to notify customer');
      }
    } catch (error) {
      console.error('Failed to notify customer:', error);
      alert('An error occurred while notifying the customer');
    } finally {
      setNotifyingCustomerId(null);
    }
  };

  const handleToggleOffline = async () => {
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          offline_status: !isOffline,
          offline_message: offlineMessage,
        }),
      });

      if (response.ok) {
        setIsOffline(!isOffline);
        setSettingsSuccess(
          `Restaurant is now ${!isOffline ? 'offline' : 'online'}`
        );
        setTimeout(() => setSettingsSuccess(''), 3000);
      } else {
        setSettingsError('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettingsError('An error occurred while updating settings');
    }
  };

  const handleOfflineMessageChange = (e) => {
    setOfflineMessage(e.target.value);
  };

  const handleSaveOfflineMessage = async () => {
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          offline_status: isOffline,
          offline_message: offlineMessage,
        }),
      });

      if (response.ok) {
        setSettingsSuccess('Offline message saved');
        setTimeout(() => setSettingsSuccess(''), 3000);
      } else {
        setSettingsError('Failed to save offline message');
      }
    } catch (error) {
      console.error('Failed to save offline message:', error);
      setSettingsError('An error occurred while saving the message');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-box">
            <h1>SMS Waitlist Manager</h1>
            <p className="login-subtitle">For Independent Restaurants & Cafes</p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>

              {loginError && <div className="error-message">{loginError}</div>}

              <button type="submit" className="btn btn-primary btn-full">
                Sign In
              </button>
            </form>

            <div className="login-footer">
              <p>Demo credentials available in .env</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>SMS Waitlist Manager</h1>
            <p className="user-info">
              {currentUser?.email}
              {restaurantSettings && (
                <span className="restaurant-name">
                  • {restaurantSettings.phone}
                </span>
              )}
            </p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          <section className="dashboard-section queue-section">
            <div className="section-header">
              <h2>Current Queue</h2>
              <span className="queue-count">{queue.length} customers</span>
            </div>

            {queue.length === 0 ? (
              <div className="empty-state">
                <p>No customers in queue</p>
                <small>Customers will appear here when they text to join</small>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`queue-item ${
                      customer.notified_at ? 'notified' : ''
                    }`}
                  >
                    <div className="queue-item-header">
                      <div className="queue-position">#{index + 1}</div>
                      <div className="queue-customer-info">
                        <div className="customer-name">{customer.name}</div>
                        <div className="customer-details">
                          Party of {customer.party_size} •{' '}
                          {formatTime(customer.joined_at)}
                        </div>
                      </div>
                    </div>

                    {customer.notified_at ? (
                      <div className="customer-status notified-status">
                        ✓ Notified at {formatTime(customer.notified_at)}
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleTableReady(customer.id, customer.name)
                        }
                        disabled={notifyingCustomerId === customer.id}
                        className="btn btn-success btn-small"
                      >
                        {notifyingCustomerId === customer.id
                          ? 'Notifying...'
                          : 'Table Ready'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section settings-section">
            <div className="section-header">
              <h2>Settings</h2>
            </div>

            <div className="settings-card">
              <h3>Restaurant Status</h3>

              <div className="status-toggle">
                <div className="toggle-info">
                  <p className="toggle-label">
                    Currently:{' '}
                    <strong className={isOffline ? 'status-offline' : ''}>
                      {isOffline ? 'OFFLINE' : 'ONLINE'}
                    </strong>
                  </p>
                  <p className="toggle-description">
                    {isOffline
                      ? 'Customers will receive your offline message'
                      : 'Customers can join the waitlist normally'}
                  </p>
                </div>
                <button
                  onClick={handleToggleOffline}
                  className={`btn ${isOffline ? 'btn-secondary' : 'btn-warning'}`}
                >
                  {isOffline ? 'Go Online' : 'Go Offline'}
                </button>
              </div>
            </div>

            <div className="settings-card">
              <h3>Offline Message</h3>
              <p className="setting-description">
                This message is sent to customers when your restaurant is
                offline
              </p>

              <textarea
                value={offlineMessage}
                onChange={handleOfflineMessageChange}
                placeholder="We're closed. Open tomorrow at 10am."
                className="message-textarea"
                rows="4"
              />

              <button
                onClick={handleSaveOfflineMessage}
                className="btn btn-primary"
              >
                Save Message
              </button>
            </div>

            {settingsError && (
              <div className="error-message">{settingsError}</div>
            )}
            {settingsSuccess && (
              <div className="success-message">{settingsSuccess}</div>
            )}

            <div className="settings-info">
              <h3>How It Works</h3>
              <ol className="info-list">
                <li>
                  Share your Twilio phone number with customers (find it in
                  your Twilio console)
                </li>
                <li>
                  Customers text to join the waitlist with their name and party
                  size
                </li>
                <li>Click "Table Ready" when a table opens up</li>
                <li>Customer receives an SMS notification</li>
                <li>
                  Toggle offline mode to stop new signups and send your custom
                  message
                </li>
              </ol>
            </div>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>SMS Waitlist POC • Simple waitlist management for independent owners</p>
      </footer>
    </div>
  );
}

export default App;