const cron = require('node-cron');
const feedbackManager = require('./feedbackManager');
const modelTrainer = require('./modelTraining');

class TrainingScheduler {
  constructor() {
    // Default schedule: Run every day at midnight
    this.schedule = process.env.TRAINING_CRON || '0 0 * * *';
    this.isRunning = false;
    this.cronJob = null;
  }

  start() {
    // Schedule the training job
    this.cronJob = cron.schedule(this.schedule, async () => {
      console.log('Running scheduled model training...');
      await this.runTrainingJob();
    });
    
    // Also check on startup if we have enough feedback to train
    this.checkFeedbackThreshold();
    
    console.log(`Training scheduler started with schedule: ${this.schedule}`);
    this.isRunning = true;
  }
  
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Training scheduler stopped');
      this.isRunning = false;
    }
  }
  
  async runTrainingJob() {
    try {
      const result = await modelTrainer.trainOnFeedback();
      console.log(`Training job completed with result: ${result ? 'success' : 'no action needed'}`);
      return result;
    } catch (error) {
      console.error('Error running training job:', error);
      return false;
    }
  }
  
  async checkFeedbackThreshold() {
    // Check if we have enough feedback to trigger training
    if (feedbackManager.shouldTriggerRetraining()) {
      console.log('Feedback threshold reached, triggering training job...');
      await this.runTrainingJob();
    }
  }
}

module.exports = new TrainingScheduler();