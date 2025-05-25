// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const analyzeSentiment = require('./sentiment');
const generateReply = require('./openai');
const app = express();
const PORT = process.env.PORT || 3001;
const feedbackManager = require('./feedbackManager');
const modelTrainer = require('./modelTraining');
const trainingScheduler = require('./trainingScheduler');
const settingsManager = require('./settingsManager');

// Enable CORS for the frontend
app.use(cors());
app.use(express.json());
trainingScheduler.start();

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Track response analytics
const analytics = {
  totalTweets: 0,
  positiveTweets: 0,
  negativeTweets: 0,
  neutralTweets: 0,
  responseTime: 0,
  escalatedTweets: 0,
  answeredQuestions: 0
};

// In-memory FAQ store (would be database in production)
const faqStore = new Map();

// Load tweets
const tweetsPath = path.join(__dirname, 'tweets.json');
const tweets = JSON.parse(fs.readFileSync(tweetsPath, 'utf8'));

app.get('/api/analyze', async (req, res) => {
  try {
    console.log('Starting tweet analysis...');
    const startTime = Date.now();
    const tweetsPath = path.join(__dirname, 'tweets.json');
    const tweets = JSON.parse(fs.readFileSync(tweetsPath, 'utf8'));
    const results = [];

    // Reset analytics
    analytics.totalTweets = tweets.length;
    analytics.positiveTweets = 0;
    analytics.negativeTweets = 0;
    analytics.neutralTweets = 0;
    analytics.escalatedTweets = 0;

    for (let t of tweets) {
      console.log(`Processing tweet from ${t.username}`);
      const score = analyzeSentiment(t.tweet);
      console.log(`Sentiment score: ${score}`);
      
      try {
        // Check if similar question exists in FAQ store
        const isQuestion = t.tweet.includes('?');
        let reply = null;
        
        if (isQuestion) {
          // Simple matching - in production use embedding similarity
          for (const [question, answer] of faqStore.entries()) {
            if (t.tweet.toLowerCase().includes(question.toLowerCase())) {
              reply = answer;
              analytics.answeredQuestions++;
              break;
            }
          }
        }
        
        // If no FAQ match, generate a new reply
        if (!reply) {
          reply = await generateReply({ ...t, sentiment: score }, t.username);
        }
        
        console.log(`Generated reply: ${reply.substring(0, 50)}...`);
        
        // Update analytics
        if (score > 0) analytics.positiveTweets++;
        else if (score < 0) analytics.negativeTweets++;
        else analytics.neutralTweets++;
        
        // Check if this was escalated
        if (reply.includes('team is reviewing this')) {
          analytics.escalatedTweets++;
        }
        
        results.push({ ...t, sentiment: score, reply });
      } catch (replyError) {
        console.error(`Error generating reply for ${t.username}:`, replyError);
        results.push({ ...t, sentiment: score, reply: "Sorry, we couldn't generate a response at this time." });
      }
    }

    // Calculate response time
    analytics.responseTime = (Date.now() - startTime) / 1000;
    console.log(`Analysis complete. Processed ${results.length} tweets in ${analytics.responseTime}s`);
    
    res.json(results);
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ error: 'Failed to analyze tweets' });
  }
});

// New endpoint for analytics
app.get('/api/analytics', (req, res) => {
  res.json(analytics);
});

// Add endpoint to get responses by conversation
app.get('/api/conversations/:username', (req, res) => {
  const username = req.params.username;
  res.json({ 
    username,
    conversations: []
  });
});

// Add configuration endpoint
app.post('/api/config', (req, res) => {
  const { brandVoice, responseLength, triggers, learning } = req.body;
  console.log('Received new configuration:', req.body);
  res.json({ success: true });
});

// Track social interactions
app.post('/api/interaction', (req, res) => {
  const { tweetId, actionType, value, replyText } = req.body;
  
  console.log(`Received ${actionType} interaction for tweet ${tweetId}:`, 
    actionType === 'reply' ? replyText : value);
  // For demo purposes, just log and return success
  res.json({ 
    success: true, 
    message: `${actionType} recorded for tweet ${tweetId}`
  });
});

// Endpoint to handle user feedback on responses
app.post('/api/feedback', async (req, res) => {
  try {
    const { originalPrompt, originalResponse, correctedResponse, context } = req.body;
    
    // Validate the feedback
    if (!originalPrompt || !originalResponse || !correctedResponse) {
      return res.status(400).json({ error: 'Missing required feedback data' });
    }
    
    // Store the feedback
    const itemCount = await feedbackManager.storeFeedback({
      id: Date.now().toString(),
      originalPrompt,
      originalResponse,
      correctedResponse,
      context: context || {}
    });
    
    if (feedbackManager.shouldTriggerRetraining()) {
      // Trigger async training without blocking response
      modelTrainer.trainOnFeedback().catch(err => 
        console.error('Error during feedback-triggered training:', err)
      );
    }
    
    // Extract Q&A pairs from good suggestions to build FAQ database
    if (correctedResponse && correctedResponse.length > 10) {
      try {
        if (originalPrompt && originalPrompt.includes('?')) {
          faqStore.set(originalPrompt, correctedResponse);
          console.log(`Added new FAQ: Q="${originalPrompt}" A="${correctedResponse.substring(0, 50)}..."`);
        }
      } catch (err) {
        console.error('Error processing feedback for FAQ:', err);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Feedback recorded successfully',
      itemCount
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

app.post('/api/admin/train', async (req, res) => {
  try {
    // Verify admin credentials
    if (req.headers.authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Trigger training in background
    const trainingPromise = modelTrainer.trainOnFeedback();
    
    // Send immediate response
    res.json({ 
      success: true, 
      message: 'Training job started' 
    });
    
    // Handle the training result
    try {
      await trainingPromise;
    } catch (err) {
      console.error('Background training failed:', err);
    }
  } catch (error) {
    console.error('Error triggering training:', error);
    res.status(500).json({ error: 'Failed to trigger training' });
  }
});

// Get app settings
app.get('/api/settings', (req, res) => {
  const settings = settingsManager.getSettings();
  if (settings) {
    res.json(settings);
  } else {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Save app settings
app.post('/api/settings', (req, res) => {
  const success = settingsManager.saveSettings(req.body);
  if (success) {
    res.json({ success: true, message: 'Settings saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// CRM integration endpoint
app.post('/api/crm/sync', (req, res) => {
  const crmSettings = req.body;
  console.log(`Syncing with ${crmSettings.crmType} CRM...`);
  
  // Validate the API key (simple demonstration)
  if (crmSettings.crmType !== 'none' && (!crmSettings.apiKey || crmSettings.apiKey.trim() === '')) {
    return res.status(400).json({ error: 'API key is required' });
  }
  
  // Save CRM settings
  const success = settingsManager.updateCRMSettings(crmSettings);
  
  // Simulate CRM integration
  if (success) {
    console.log('CRM settings saved successfully');
    
    // Simulate API latency
    setTimeout(() => {
      res.json({ 
        success: true, 
        message: `Successfully connected to ${crmSettings.crmType}`,
        integrationId: `crm-${Date.now()}`
      });
    }, 1000);
  } else {
    res.status(500).json({ error: 'Failed to save CRM settings' });
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received, shutting down training scheduler');
  trainingScheduler.stop();
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received, shutting down training scheduler');
  trainingScheduler.stop();
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// Chat endpoint for direct user interactions
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received chat request:', req.body);
    const { message } = req.body;
    
    if (!message) {
      console.log('Missing message in request body');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Use a special user ID for chat interactions
    const chatUserId = req.headers['x-session-id'] || 'web-chat-user';
    console.log(`Processing chat for session: ${chatUserId}`);
    
    const sentiment = 0; 
    
    // Generate reply using the same function used for tweets
    const reply = await generateReply({
      tweet: message, 
      sentiment,
      username: chatUserId
    }, `chat:${chatUserId}`);
    
    if (!reply || reply === 'Error in replying.') {
      throw new Error('Failed to generate a response');
    }
    
    console.log('Generated reply:', reply);
    res.json({ reply });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message
    });
  }
});