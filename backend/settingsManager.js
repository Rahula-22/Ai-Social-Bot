const fs = require('fs');
const path = require('path');

class SettingsManager {
  constructor() {
    this.settingsPath = path.join(__dirname, '../data/settings.json');
    this.ensureStorageExists();
  }

  ensureStorageExists() {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.settingsPath)) {
      fs.writeFileSync(this.settingsPath, JSON.stringify({
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
        },
        crm: {
          crmType: 'none',
          apiKey: '',
          syncCustomers: true,
          syncInteractions: true
        }
      }));
    }
  }

  getSettings() {
    try {
      return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
    } catch (error) {
      console.error('Error reading settings:', error);
      return null;
    }
  }

  saveSettings(settings) {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  updateCRMSettings(crmSettings) {
    try {
      const settings = this.getSettings();
      settings.crm = crmSettings;
      return this.saveSettings(settings);
    } catch (error) {
      console.error('Error updating CRM settings:', error);
      return false;
    }
  }
}

module.exports = new SettingsManager();