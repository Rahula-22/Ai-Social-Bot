const fs = require('fs');
const path = require('path');

class FeedbackManager {
  constructor(options = {}) {
    this.feedbackStorePath = options.storagePath || path.join(__dirname, '../data/feedback.json');
    this.feedbackThreshold = options.threshold || parseInt(process.env.FEEDBACK_THRESHOLD || '10');
    this.ensureStorageExists();
  }

  ensureStorageExists() {
    const dir = path.dirname(this.feedbackStorePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.feedbackStorePath)) {
      fs.writeFileSync(this.feedbackStorePath, JSON.stringify({
        feedbackItems: [],
        lastTrainingDate: null,
        version: 1
      }));
    }
  }

  async storeFeedback(feedbackItem) {
    // Structure: { originalPrompt, originalResponse, correctedResponse, context, timestamp }
    const store = this.loadFeedbackStore();
    
    store.feedbackItems.push({
      ...feedbackItem,
      timestamp: new Date().toISOString(),
      applied: false
    });
    
    await this.saveFeedbackStore(store);
    return store.feedbackItems.length;
  }

  loadFeedbackStore() {
    const content = fs.readFileSync(this.feedbackStorePath, 'utf8');
    return JSON.parse(content);
  }

  async saveFeedbackStore(store) {
    await fs.promises.writeFile(
      this.feedbackStorePath, 
      JSON.stringify(store, null, 2)
    );
  }

  getUnprocessedFeedback() {
    const store = this.loadFeedbackStore();
    return store.feedbackItems.filter(item => !item.applied);
  }

  async markFeedbackAsProcessed(processedIds) {
    const store = this.loadFeedbackStore();
    
    store.feedbackItems = store.feedbackItems.map(item => {
      if (processedIds.includes(item.id)) {
        return { ...item, applied: true };
      }
      return item;
    });
    
    store.lastTrainingDate = new Date().toISOString();
    await this.saveFeedbackStore(store);
  }

  shouldTriggerRetraining() {
    const unprocessed = this.getUnprocessedFeedback();
    return unprocessed.length >= this.feedbackThreshold;
  }
}

module.exports = new FeedbackManager();