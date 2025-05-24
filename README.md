# AI Social Bot

An intelligent bot designed to interact on social media platforms using AI capabilities.

![AI Social Bot Logo](assets/logo.png)

## 📋 Overview

AI Social Bot is a fully implemented automated solution that leverages artificial intelligence to manage social media interactions. It posts content, responds to messages, analyzes engagement metrics, and maintains an active social media presence.

## ✨ Features

- **Automated Posting**: Schedule and publish content across multiple platforms
- **Smart Replies**: AI-powered responses to comments and messages
- **Sentiment Analysis**: Understand the tone and context of interactions
- **Engagement Tracking**: Monitor likes, shares, comments, and other metrics
- **Content Suggestion**: Generate ideas for future posts
- **Multi-platform Support**: Works with Twitter, Facebook, Instagram, and LinkedIn
- **Learning & Adaptation**: System improves over time based on feedback and corrections

## 🚀 Getting Started

### Prerequisites

- Node.js (v14.0 or higher)
- NPM or Yarn
- API keys for supported social media platforms
- OpenAI API key for AI capabilities

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Rahula-22/Ai-Social-Bot.git
cd ai-social-bot
```

2. Install dependencies:
```bash
npm install
```
   
3. Create a `.env` file in backend directory and add your API keys and configuration settings to the `.env` file:
```bash
ENABLE_FINE_TUNING=false
TRAINING_CRON=0 0 * * *
FEEDBACK_THRESHOLD=10
GROQ_API_KEY=your_groq_api_key_here
ADMIN_API_KEY=your_secure_admin_api_key_here
```
4.How to Get Your Groq API Key?
1.Go to [Groq Cloud Console](https://console.groq.com/)
2.Log in or sign up for an account
3.Click Create API Key
4.Copy your new API key and paste it into your .env file as shown above

5 .env and .gitignore should never be committed.

## 💻 Usage

### Running the Bot

Use commands to run the bot:

```bash
# Start the bot in standard mode
npm start

# For development mode with auto-reload
npm run dev

# Run with specific configuration
npm start -- --config=custom-config.json

# Run in debug mode for additional logging
npm run debug
```

### Configuration

Edit the `config.json` file to customize:

- Posting schedule
- Response templates
- Platform preferences
- Content guidelines

### Dashboard

Access the web dashboard at `http://localhost:3000` after starting the bot to:

- Monitor bot activity
- Manage scheduled posts
- View analytics
- Adjust settings

## 🚀 Release Notes

**Version 1.0.0 (May 2025)**
- Initial stable release
- Full support for Twitter, Facebook, Instagram, and LinkedIn
- Complete AI response system with sentiment analysis
- Analytics dashboard with reporting features

## 🔧 Troubleshooting

If you encounter issues, try these solutions:

- **Bot not posting**: Check your API keys and platform permissions
- **Connection issues**: Ensure your internet connection is stable
- **Rate limiting**: Adjust posting frequency to comply with platform limits
- **Startup errors**: Check the logs at `logs/error.log` for detailed information
- **AI response quality**: Try adjusting the response parameters in `config.json`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```bash
# Fork the repository then:
git checkout -b feature/amazing-feature
git commit -m 'Add some amazing feature'
git push origin feature/amazing-feature
# Then open a Pull Request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
