const Sentiment = require('sentiment');
const sentiment = new Sentiment();
module.exports = text => sentiment.analyze(text).comparative;
