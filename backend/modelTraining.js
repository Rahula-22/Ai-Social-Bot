const feedbackManager = require('./feedbackManager');
require('dotenv').config();

// Use Groq if available, otherwise fallback to OpenAI
let client;
let clientType;

class ModelTrainer {
  constructor() {
    // Check which API key is available
    if (process.env.GROQ_API_KEY) {
      // Use Groq client
      const { Groq } = require('groq-sdk');
      client = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
      clientType = 'groq';
      console.log('Using Groq API for training');
    } else if (process.env.OPENAI_API_KEY) {
      // Use OpenAI client
      const { OpenAI } = require('openai');
      client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      clientType = 'openai';
      console.log('Using OpenAI API for training');
    } else {
      // No API key available - use mock mode
      console.warn('WARNING: No API key found for Groq or OpenAI. Using mock mode.');
      clientType = 'mock';
      client = {
        // Mock implementations of API methods
        chat: {
          completions: {
            create: async () => ({ choices: [{ message: { content: 'Mock response (no API key available)' } }] })
          }
        },
        embeddings: {
          create: async () => ({ data: [{ embedding: Array(1536).fill(0) }] })
        }
      };
    }

    this.trainingInProgress = false;
  }

  async trainOnFeedback() {
    if (this.trainingInProgress) {
      console.log('Training already in progress...');
      return false;
    }

    try {
      this.trainingInProgress = true;
      const feedbackItems = feedbackManager.getUnprocessedFeedback();
      
      if (feedbackItems.length === 0) {
        console.log('No feedback to process');
        this.trainingInProgress = false;
        return false;
      }

      console.log(`Training on ${feedbackItems.length} feedback items using ${clientType} API`);

      // Transform feedback into training examples
      const trainingExamples = this.prepareFeedbackForTraining(feedbackItems);

      // For fine-tuning if enabled
      if (process.env.ENABLE_FINE_TUNING === 'true') {
        await this.fineTuneModel(trainingExamples);
      }

      // Store the processed feedback in a vector database or embedding store
      await this.updateEmbeddingStore(trainingExamples);
      
      // Mark all processed feedback
      const processedIds = feedbackItems.map(item => item.id);
      await feedbackManager.markFeedbackAsProcessed(processedIds);
      
      console.log('Training completed successfully');
      
      this.trainingInProgress = false;
      return true;
    } catch (error) {
      console.error('Error during training:', error);
      this.trainingInProgress = false;
      return false;
    }
  }

  prepareFeedbackForTraining(feedbackItems) {
    // Transform feedback data into format suitable for training
    return feedbackItems.map(item => ({
      prompt: this.formatPrompt(item.originalPrompt, item.context),
      completion: item.correctedResponse,
      metadata: {
        originalResponse: item.originalResponse,
        feedbackId: item.id,
        timestamp: item.timestamp
      }
    }));
  }
  
  formatPrompt(prompt, context) {
    // Format prompt with context for better learning
    return `Context: ${JSON.stringify(context)}\nPrompt: ${prompt}`;
  }

  async fineTuneModel(trainingExamples) {
    console.log('Fine-tuning model with feedback data...');
    
    try {
      if (clientType === 'mock') {
        console.log('Mock mode: Simulating fine-tuning');
        return;
      }
      
      // This is a simplified implementation for both Groq and OpenAI
      console.log(`Fine-tuning simulation with ${trainingExamples.length} examples`);
      
      // In a real implementation, you'd prepare data for the specific API
      // and initiate the fine-tuning process      
    } catch (error) {
      console.error('Error during fine-tuning:', error);
      throw error;
    }
  }
  
  async updateEmbeddingStore(trainingExamples) {
    console.log('Updating embedding store with new examples...');
    
    try {
      // Save examples to a simple file-based store
      const fs = require('fs');
      const path = require('path');
      
      // In a real implementation, we'd generate actual embeddings
      // For this implementation, we just store the raw examples
      for (const example of trainingExamples) {
        example.embedding = "placeholder-embedding";
      }
      
      // Save to a file (in production, use a vector DB)
      const embeddingsPath = path.join(__dirname, '../data/embeddings.json');
      let embeddings = [];
      
      if (fs.existsSync(embeddingsPath)) {
        embeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
      }
      
      embeddings = [...embeddings, ...trainingExamples];
      
      fs.writeFileSync(embeddingsPath, JSON.stringify(embeddings, null, 2));
      console.log(`Updated embedding store with ${trainingExamples.length} examples`);
      
    } catch (error) {
      console.error('Error updating embedding store:', error);
      throw error;
    }
  }
}

module.exports = new ModelTrainer();