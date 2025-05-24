// Load environment variables from .env with explicit path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Groq client
const Groq = require('groq-sdk').default || require('groq-sdk');
console.log('Groq client constructor:', typeof Groq);

// Get API key and handle it properly
const apiKey = process.env.GROQ_API_KEY;
console.log('GROQ_API_KEY available:', apiKey ? 'Yes' : 'No');

// Initialize Groq client with error handling
let groq;
try {
  if (!apiKey) {
    console.error('GROQ_API_KEY is missing in the .env file');
    // Check if .env file exists
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.error('.env file not found at:', envPath);
    } else {
      const envContent = fs.readFileSync(envPath, 'utf8');
      if (!envContent.includes('GROQ_API_KEY=')) {
        console.error('GROQ_API_KEY entry not found in .env file');
      } else {
        console.error('GROQ_API_KEY entry exists but may be empty');
      }
    }
    
    // Create a mock client as fallback
    groq = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: 'This is a fallback response due to missing API key' } }]
          })
        }
      }
    };
  } else {
    // Initialize with the actual API key
    groq = new Groq({ apiKey });
    console.log('Groq client initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Groq client:', error.message);
  // Create a mock client for fallback
  groq = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'API error fallback response' } }]
        })
      }
    }
  };
}

// Store conversation histories in memory
// In production, use a database like MongoDB or Redis
const conversations = new Map();

// Enhanced brand voice profiles with more human-like characteristics
const brandProfiles = {
  default: "You are a friendly and professional social media manager named Jamie. Your tone is helpful but conversational - you use contractions like 'we'll' instead of 'we will', vary your sentence length, and occasionally start sentences with connectors like 'Actually,' or 'Plus,'. You're knowledgeable but approachable, and you respond like a real person would - concise but complete, with a touch of warmth.",
  
  technical: "You are a technical support specialist named Taylor who really knows the product. You explain technical concepts clearly but conversationally, avoiding jargon when possible. You show empathy when users have problems ('That definitely sounds frustrating!'). You use analogies to explain complex ideas and vary your sentence structure to sound natural. Your responses are helpful and precise but never sound like they came from a manual.",
  
  casual: "You are Sam, a friendly and casual social media rep who loves connecting with customers. Your style is upbeat and conversational with the occasional emoji 😊. You use casual phrases, contractions, and sometimes short, punchy sentences. Feel free to show enthusiasm ('Love this question!') or personality ('I'm a huge fan of that feature too!'). Your messages should feel like texts from a friend - warm, genuine and never corporate.",
  
  support: "You are Alex, a customer support specialist who genuinely cares about solving problems. You first acknowledge the customer's feelings ('I completely understand how frustrating this must be'), then provide clear solutions. Your tone is empathetic but efficient, like a helpful colleague rather than a corporate representative. Use natural language with occasional phrases like 'Let me look into this for you' or 'I'd recommend trying...' that a real support person would use."
};

// Define escalation keywords and thresholds (can be moved to config)
const escalationKeywords = [
  'refund', 'cancel', 'broken', 'not working', 
  'issue', 'problem', 'disappointed', 'angry',
  'lawsuit', 'legal', 'urgent', 'immediately',
  'help me', 'frustrated', 'terrible'
];

/** 
 * Determine if a tweet should be escalated to human support.
 * @param {string} tweet - The tweet text
 * @param {number} sentiment - Sentiment score (-1 to 1)
 * @param {string} username - The user's Twitter handle
 * @returns {boolean} - Whether to escalate
 */
function shouldEscalate(tweet, sentiment, username) {
  const text = tweet.toLowerCase();
  
  // Check for very negative sentiment
  if (sentiment < -0.7) return true;
  
  // Check for escalation keywords
  if (escalationKeywords.some(keyword => text.includes(keyword))) {
    // Only escalate if sentiment is also negative
    if (sentiment < -0.3) return true;
  }
  
  // Check for repeat contact (would use past interactions in real implementation)
  const userInteractionCount = conversations.has(username) ? 
    conversations.get(username).length : 0;
  
  if (userInteractionCount >= 3 && sentiment < 0) return true;
  
  // Complex questions - look for length and question marks
  if (tweet.length > 200 && tweet.includes('?')) return true;
  
  return false;
}

/** Pick a brand profile based on sentiment & keywords. */
function pickVoice({ tweet, sentiment }) {
  const text = tweet.toLowerCase();
  // Enhanced keyword detection for better voice selection
  if (sentiment < -0.3 || /help|broken|service|problem|issue|doesn't work|isn't working|failed/.test(text)) {
    return brandProfiles.support;
  }
  if (/integration|feature|implement|how to|how do|setup|connect|api|code/.test(text)) {
    return brandProfiles.technical;
  }
  if (sentiment > 0.3 || /love|thanks|great|cool|awesome|excited|happy/.test(text)) {
    return brandProfiles.casual;
  }
  return brandProfiles.default;
}

function formatUsername(username) {
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Check if a response appears incomplete and fix it
 * @param {string} response - The AI-generated response
 * @returns {string} - Fixed response
 */
function fixIncompleteResponses(response) {
  // Common patterns of incomplete responses
  const incompletePatterns = [
    { pattern: /\bDM us\b.*$/, replacement: "DM us for more information." },
    { pattern: /\bwe are continually adding more\.?\s*(?:Would you|If you)?.*$/, replacement: "we are continually adding more. Let us know if you need help with a specific integration." },
    { pattern: /\bwe['']re always looking for feedb.*$/, replacement: "we're always looking for feedback to improve our service." },
    { pattern: /\bfeel free to reach out.*$/, replacement: "feel free to reach out if you need anything else." },
    { pattern: /\contact us for.*$/, replacement: "contact us for more information." },
    { pattern: /\band more\.?\s*(?:Would you|If you)?.*$/, replacement: "and more." },
    { pattern: /\bplease let us.*$/, replacement: "please let us know if you have any other questions." },
    { pattern: /\bI can help.*$/, replacement: "I can help you with that." },
    { pattern: /\bmore info.*$/, replacement: "more information is available on our website." },
    { pattern: /\bcustom pricing.*$/, replacement: "custom pricing tailored to your needs." },
    { pattern: /\binformation about.*$/, replacement: "information is available." }
  ];

  // Check if response ends with a list that looks incomplete
  if (/\d+\.\s+[^.!?]*$/.test(response) || /\s*-\s+[^.!?]*$/.test(response)) {
    // Trim the incomplete list item
    response = response.replace(/\d+\.\s+[^.!?]*$/, "").replace(/\s*-\s+[^.!?]*$/, "");
    response = response.trim();
    
    // Add a closing statement if needed
    if (!response.endsWith('.') && !response.endsWith('!') && !response.endsWith('?')) {
      response += ".";
    }
    
    // Add completion phrase for lists
    response += " Contact us for the complete list.";
    return response;
  }

  // Check for other incomplete patterns
  for (const {pattern, replacement} of incompletePatterns) {
    if (pattern.test(response)) {
      response = response.replace(pattern, replacement);
      return response;
    }
  }
  
  // Check if response is a sentence fragment (no period/question mark/exclamation)
  const lastChar = response.charAt(response.length - 1);
  if (!['.', '!', '?'].includes(lastChar)) {
    // Make best effort to complete the sentence
    if (response.length < 240) {
      response += ".";
    } else {
      // For longer responses, try to find a clause ending to trim at
      const lastComma = response.lastIndexOf(', ');
      if (lastComma > response.length - 50 && lastComma > 0) {
        response = response.substring(0, lastComma + 1) + " and more.";
      } else {
        response += ".";
      }
    }
  }
  
  return response;
}

/**
 * Generate a brand-voice reply using the Groq API.
 * @param {{ tweet: string, sentiment: number, username: string }} summary
 * @param {string} conversationId - The conversation identifier
 * @returns {Promise<string>}
 */
async function generateReply(summary, conversationId = null) {
  const { tweet, sentiment, username } = summary;
  const formattedUser = formatUsername(username);
  const plainUser = username.startsWith('@') ? username.substring(1) : username;
  const actualConversationId = conversationId || username;
  const conversationHistory = conversations.get(actualConversationId) || [];
  const sentimentLabel = sentiment > 0 ? 'Positive' : sentiment < 0 ? 'Negative' : 'Neutral';
  const voicePrompt = pickVoice(summary);

  try {
    console.log(`Generating reply for ${formattedUser}…`);
    
    // Check for escalation
    if (shouldEscalate(tweet, sentiment, username)) {
      console.log(`Escalating tweet from ${formattedUser} due to sensitivity`);
      
      // Store this interaction in the conversation history
      const interaction = {
        role: 'user',
        content: `Tweet from ${formattedUser}: "${tweet}"\nSentiment: ${sentimentLabel}`,
        timestamp: new Date().toISOString(),
        escalated: true
      };
      
      // Update conversation history
      conversations.set(actualConversationId, [
        ...(conversations.get(actualConversationId) || []),
        interaction
      ]);
      
      // More human-like escalation responses with variety
      const escalationResponses = [
        `Hi ${plainUser}, thanks for reaching out! I've passed this to our team who will look into it right away.`,
        `Hey ${plainUser}, I appreciate you bringing this to our attention. Our team is reviewing this now and will get back to you shortly.`,
        `${plainUser}, thanks for your message. We're looking into this for you and someone will follow up soon.`,
        `I've shared this with our specialist team, ${plainUser}. They'll be in touch with you very soon.`
      ];
      
      return escalationResponses[Math.floor(Math.random() * escalationResponses.length)];
    }

    // Build messages array including context from previous messages
    let messages = [
      { 
        role: 'system', 
        content: `${voicePrompt}\n\nIMPORTANT GUIDELINES:
        1. Sound like a real human - use contractions and varied sentence structure
        2. Keep your responses SHORT AND COMPLETE - no longer than 250 characters
        3. NEVER end mid-sentence or with an incomplete thought
        4. When discussing features or integrations, be specific and concise
        5. If you can't fit everything in one message, provide a complete thought then invite them to DM for more
        6. Focus on giving ONE complete answer rather than trying to cover everything partially
        7. NEVER produce lists that would get cut off - choose 2-3 examples instead
        8. Respond in a complete, self-contained way that can stand alone`
      }
    ];
    
    // Add conversation history for context if available
    if (conversationHistory.length > 0) {
      // Limit to last 5 messages to avoid token limits
      const recentHistory = conversationHistory.slice(-5);
      messages = [
        ...messages,
        ...recentHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];
    }
    
    // Add current message with enhanced instructions for natural responses
    messages.push({ 
      role: 'user', 
      content: `Tweet from ${formattedUser}: "${tweet}"\nSentiment: ${sentimentLabel}\n\nRespond directly and naturally. Keep it under 250 characters and ensure it's a COMPLETE thought - never end mid-sentence. Don't use their @ handle in your reply.` 
    });

    // Call Groq API with increased max_tokens to ensure complete sentences
    const completion = await groq.chat.completions.create({
      model:       'llama3-8b-8192',
      messages,
      temperature: 0.7,
      max_tokens:  150, // Increased from 120 to ensure complete responses
      top_p:        1.0,
    });

    let response = completion.choices[0].message.content.trim();
    
    // Clean up response for a more human tone
    response = response.replace(/@@+(\w+)/g, '@$1'); 
    response = response.replace(/@\s+@(\w+)/g, '@$1'); // Fix spaced double @
    response = response.replace(/@\s+(\w+)/g, '@$1'); 
    response = response.replace(/^["']|["']$/g, '').trim();
    
    // Remove AI-like phrases and username mentions
    response = response.replace(/as an AI|as a language model|AI assistant|I'm an AI/gi, '');
    response = response.replace(/I'd be happy to help|I'm here to assist|please let me know if/gi, '');
    response = response.replace(new RegExp(`^@?${plainUser}[,:]?\\s*`, 'i'), ''); // Remove username from start
    response = response.replace(/^@\w+[,:]?\s*/i, ''); // Remove any username from start

    // Check if response appears to be cut off and attempt to fix it
    response = fixIncompleteResponses(response);

    // Ensure response isn't too long (275 character limit)
    if (response.length > 275) {
      // Find all sentence breaks in the response
      const sentenceBreaks = [];
      const sentenceRegex = /[.!?](\s|$)/g;
      let match;
      
      while ((match = sentenceRegex.exec(response)) !== null) {
        sentenceBreaks.push(match.index + 1); // +1 to include the punctuation
      }
      
      // Find the last complete sentence that fits within 275 characters
      let truncationPoint = -1;
      for (let i = 0; i < sentenceBreaks.length; i++) {
        if (sentenceBreaks[i] <= 275) {
          truncationPoint = sentenceBreaks[i];
        } else {
          break;
        }
      }
      
      // If we found a good sentence break, use it
      if (truncationPoint > 0) {
        response = response.substring(0, truncationPoint);
      } else {
        // No complete sentence found under 275 chars
        const textToSearch = response.substring(0, 275);
        
        // Look for natural break points in descending priority
        const breakPoints = [
          textToSearch.lastIndexOf('. '),
          textToSearch.lastIndexOf('! '),
          textToSearch.lastIndexOf('? '),
          textToSearch.lastIndexOf(', '),
          textToSearch.lastIndexOf('; '),
          textToSearch.lastIndexOf(': '),
          textToSearch.lastIndexOf(' - '),
          textToSearch.lastIndexOf(' ')
        ];
        
        // Find highest priority break point that exists
        let breakPoint = -1;
        for (const point of breakPoints) {
          if (point > 0) {
            breakPoint = point + 1; // Include the punctuation/space
            break;
          }
        }
        
        if (breakPoint > 0) {
          response = response.substring(0, breakPoint);
          // Check if we need to add a period at the end
          if (!['.', '!', '?'].includes(response.charAt(response.length - 1))) {
            response += ".";
          }
        } else {
          // Worst case: hard truncate and add a period
          response = response.substring(0, 272).trim() + ".";
        }
      }
      
      // Check if the truncated response now appears incomplete
      response = fixIncompleteResponses(response);
    }

    console.log(`Reply ready (length ${response.length}):`, response);
    
    // Store this interaction in conversation history
    const newUserMessage = {
      role: 'user',
      content: `Tweet from ${formattedUser}: "${tweet}"\nSentiment: ${sentimentLabel}`,
      timestamp: new Date().toISOString()
    };
    
    const newBotMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    };
    
    // Update conversation history
    conversations.set(actualConversationId, [
      ...(conversations.get(actualConversationId) || []),
      newUserMessage,
      newBotMessage
    ]);
    
    return response;

  } catch (err) {
    console.error('Groq API error:', err);
    return `Error in replying.`;
  }
}

module.exports = generateReply;