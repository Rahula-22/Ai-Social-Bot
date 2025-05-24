import React, { useEffect, useState } from 'react';
import TweetCard from './TweetCard';
import ChatBox from './ChatBox';
import './App.css';

function App() {
  const [tweets, setTweets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState({
    brandVoice: 'default',
    responseLength: 100,
    escalationThreshold: 7,
    triggers: {
      mentions: true,
      comments: true,
      directMessages: false,
      hashtags: false
    },
    learning: {
      successfulReplies: true,
      pastInteractions: true
    }
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const [crmSettings, setCrmSettings] = useState({
    crmType: 'none',
    apiKey: '',
    syncCustomers: true,
    syncInteractions: true
  });

  useEffect(() => {
    // Fetch tweets and analysis
    fetch('/api/analyze')
      .then(res => res.json())
      .then(data => {
        setTweets(data);
        setLoading(false);
        
        // After getting tweets, fetch analytics
        return fetch('/api/analytics');
      })
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
      
    // Load settings - moved inside useEffect
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings({
          brandVoice: data.brandVoice || 'default',
          responseLength: data.responseLength || 100,
          escalationThreshold: data.escalationThreshold || 7,
          triggers: data.triggers || {
            mentions: true,
            comments: true,
            directMessages: false,
            hashtags: false
          },
          learning: data.learning || {
            successfulReplies: true,
            pastInteractions: true
          }
        });
        
        if (data.crm) {
          setCrmSettings({
            crmType: data.crm.crmType || 'none',
            apiKey: data.crm.apiKey || '',
            syncCustomers: data.crm.syncCustomers !== undefined ? data.crm.syncCustomers : true,
            syncInteractions: data.crm.syncInteractions !== undefined ? data.crm.syncInteractions : true
          });
        }
      })
      .catch(err => {
        console.error('Error loading settings:', err);
      });
  }, []);

  const handleSettingChange = (section, setting, value) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [setting]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [setting]: value
      }));
    }
  };

  const handleCRMChange = (setting, value) => {
    setCrmSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const saveSettings = () => {
    setSaveStatus('saving');
    
    // Send settings to the backend
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        crm: crmSettings
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    })
    .catch(err => {
      console.error('Error saving settings:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    });
  };

  const saveCRMSettings = () => {
    setSaveStatus('saving');
    
    // Send to the backend
    fetch('/api/crm/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmSettings)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    })
    .catch(err => {
      console.error('Error saving CRM settings:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    });
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#1DA1F2">
            <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path>
          </svg>
          <h1>AI Social Bot</h1>
        </div>
        <nav className="main-nav">
          <ul>
            <li><button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button></li>
            <li><button className={activeTab === 'tweets' ? 'active' : ''} onClick={() => setActiveTab('tweets')}>Tweets</button></li>
            <li><button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>Chat</button></li>
            <li><button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button></li>
          </ul>
        </nav>
      </header>
      
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-container">
            <h2>Dashboard Analytics</h2>
            {analytics ? (
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>Tweet Summary</h3>
                  <div className="analytics-stat">
                    <span className="stat-number">{analytics.totalTweets}</span>
                    <span className="stat-label">Total Tweets</span>
                  </div>
                  <div className="analytics-stat">
                    <span className="stat-number">{analytics.responseTime.toFixed(2)}s</span>
                    <span className="stat-label">Avg Response Time</span>
                  </div>
                </div>
                
                <div className="analytics-card sentiment-breakdown">
                  <h3>Sentiment Breakdown</h3>
                  <div className="sentiment-bars">
                    <div className="sentiment-item">
                      <div className="sentiment-label">😊 Positive</div>
                      <div className="sentiment-bar-container">
                        <div 
                          className="sentiment-bar positive" 
                          style={{width: `${(analytics.positiveTweets/analytics.totalTweets)*100}%`}}
                        ></div>
                        <span className="sentiment-count">{analytics.positiveTweets}</span>
                      </div>
                    </div>
                    <div className="sentiment-item">
                      <div className="sentiment-label">😐 Neutral</div>
                      <div className="sentiment-bar-container">
                        <div 
                          className="sentiment-bar neutral" 
                          style={{width: `${(analytics.neutralTweets/analytics.totalTweets)*100}%`}}
                        ></div>
                        <span className="sentiment-count">{analytics.neutralTweets}</span>
                      </div>
                    </div>
                    <div className="sentiment-item">
                      <div className="sentiment-label">😠 Negative</div>
                      <div className="sentiment-bar-container">
                        <div 
                          className="sentiment-bar negative" 
                          style={{width: `${(analytics.negativeTweets/analytics.totalTweets)*100}%`}}
                        ></div>
                        <span className="sentiment-count">{analytics.negativeTweets}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="analytics-card recent-activity">
                  <h3>Recent Activity</h3>
                  {tweets.slice(0, 3).map((t, i) => (
                    <div key={i} className="activity-item">
                      <span className="username">{t.username}</span>
                      <span className="activity-text">{t.tweet.substring(0, 40)}...</span>
                      <span className={`sentiment-indicator ${t.sentiment > 0 ? 'positive' : t.sentiment < 0 ? 'negative' : 'neutral'}`}></span>
                    </div>
                  ))}
                  <button className="view-all-btn" onClick={() => setActiveTab('tweets')}>View All</button>
                </div>
              </div>
            ) : (
              <div className="loading">Loading analytics data...</div>
            )}
          </div>
        )}
        
        {activeTab === 'tweets' && (
          <div className="tweets-container">
            <h2>Tweet Analysis</h2>
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading tweets and generating AI responses...</p>
              </div>
            ) : (
              <div className="tweets-grid">
                {tweets.map((t, i) => <TweetCard key={i} id={i} {...t} />)}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'chat' && (
          <div className="chat-container-wrapper">
            <h2>AI Chat</h2>
            <p className="chat-description">
              Ask questions directly to our AI assistant and get immediate responses. 
              The assistant can answer questions about your products, services, and more.
            </p>
            <ChatBox />
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-container">
            <h2>Bot Settings</h2>
            
            <div className="settings-card">
              <h3>AI Response Configuration</h3>
              <form className="settings-form">
                <div className="form-group">
                  <label htmlFor="brandVoice">Brand Voice</label>
                  <select 
                    id="brandVoice" 
                    value={settings.brandVoice}
                    onChange={(e) => handleSettingChange(null, 'brandVoice', e.target.value)}
                  >
                    <option value="default">Default</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="technical">Technical & Professional</option>
                    <option value="support">Customer Support</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="responseLength">Response Length</label>
                  <input 
                    type="range" 
                    id="responseLength" 
                    min="50" 
                    max="200" 
                    value={settings.responseLength}
                    onChange={(e) => handleSettingChange(null, 'responseLength', parseInt(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>Short ({settings.responseLength < 80 ? 'Current' : ''})</span>
                    <span>Medium ({settings.responseLength >= 80 && settings.responseLength <= 150 ? 'Current' : ''})</span>
                    <span>Long ({settings.responseLength > 150 ? 'Current' : ''})</span>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="escalationThreshold">Escalation Sensitivity</label>
                  <input 
                    type="range" 
                    id="escalationThreshold" 
                    min="0" 
                    max="10" 
                    value={settings.escalationThreshold}
                    onChange={(e) => handleSettingChange(null, 'escalationThreshold', parseInt(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>Low (Auto-reply most)</span>
                    <span>High (Escalate more)</span>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Response Triggers</label>
                  <div className="checkbox-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.triggers.mentions}
                        onChange={(e) => handleSettingChange('triggers', 'mentions', e.target.checked)}
                      /> Mentions
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.triggers.comments}
                        onChange={(e) => handleSettingChange('triggers', 'comments', e.target.checked)}
                      /> Comments
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.triggers.directMessages}
                        onChange={(e) => handleSettingChange('triggers', 'directMessages', e.target.checked)}
                      /> Direct Messages
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.triggers.hashtags}
                        onChange={(e) => handleSettingChange('triggers', 'hashtags', e.target.checked)}
                      /> Hashtag Usage
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Learning Settings</label>
                  <div className="checkbox-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.learning.successfulReplies}
                        onChange={(e) => handleSettingChange('learning', 'successfulReplies', e.target.checked)}
                      /> Learn from successful replies
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.learning.pastInteractions}
                        onChange={(e) => handleSettingChange('learning', 'pastInteractions', e.target.checked)}
                      /> Use past interactions for FAQs
                    </label>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  className="save-btn"
                  onClick={saveSettings}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Settings'}
                </button>
              </form>
            </div>
            
            <div className="settings-card">
              <h3>CRM Integration</h3>
              <form className="settings-form">
                <div className="form-group">
                  <label htmlFor="crmType">CRM Platform</label>
                  <select 
                    id="crmType"
                    value={crmSettings.crmType}
                    onChange={(e) => handleCRMChange('crmType', e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="salesforce">Salesforce</option>
                    <option value="hubspot">HubSpot</option>
                    <option value="zendesk">Zendesk</option>
                    <option value="custom">Custom API</option>
                  </select>
                </div>
                
                {crmSettings.crmType !== 'none' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="apiKey">API Key</label>
                      <input 
                        type="password" 
                        id="apiKey"
                        value={crmSettings.apiKey}
                        onChange={(e) => handleCRMChange('apiKey', e.target.value)}
                        placeholder="Enter your CRM API key"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Sync Options</label>
                      <div className="checkbox-group">
                        <label>
                          <input 
                            type="checkbox"
                            checked={crmSettings.syncCustomers}
                            onChange={(e) => handleCRMChange('syncCustomers', e.target.checked)}
                          /> 
                          Sync customers from social profiles
                        </label>
                        <label>
                          <input 
                            type="checkbox"
                            checked={crmSettings.syncInteractions}
                            onChange={(e) => handleCRMChange('syncInteractions', e.target.checked)}
                          /> 
                          Log interactions in CRM
                        </label>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      className="save-btn"
                      onClick={saveCRMSettings}
                      disabled={!crmSettings.apiKey || saveStatus === 'saving'}
                    >
                      {saveStatus === 'saving' ? 'Connecting...' : saveStatus === 'saved' ? 'Connected!' : saveStatus === 'error' ? 'Error!' : `Connect to ${crmSettings.crmType}`}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </main>
      
      <footer className="footer">
        <p>AI Social Bot © {new Date().getFullYear()} - Intelligent Twitter Engagement</p>
      </footer>
    </div>
  );
}

export default App;