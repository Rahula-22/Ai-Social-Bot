import React, { useState } from 'react';
import './TweetCard.css';

function TweetCard({ id, username, tweet, sentiment, reply, timestamp }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRetweeted, setIsRetweeted] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [retweetCount, setRetweetCount] = useState(0);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState([]);
  
  // Format the timestamp
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const submitFeedback = () => {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tweetId: id || username,
        responseQuality: 'needs-improvement',
        suggestionText: feedbackText 
      })
    });
    setFeedbackSubmitted(true);
    setShowFeedback(false);
  };
  
  const handleLike = () => {
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);
    setLikeCount(prevCount => newLikeState ? prevCount + 1 : Math.max(0, prevCount - 1));
   
    fetch('/api/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweetId: id || username,
        actionType: 'like',
        value: newLikeState
      })
    }).catch(err => console.error('Failed to record like:', err));
  };
  
  const handleRetweet = () => {
    // Toggle retweet state
    const newRetweetState = !isRetweeted;
    setIsRetweeted(newRetweetState);
    setRetweetCount(prevCount => newRetweetState ? prevCount + 1 : Math.max(0, prevCount - 1));
    
    // Send retweet action to backend
    fetch('/api/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweetId: id || username,
        actionType: 'retweet',
        value: newRetweetState
      })
    }).catch(err => console.error('Failed to record retweet:', err));
  };
  
  const handleReply = () => {
    setShowReplyBox(!showReplyBox);
    if (showReplyBox) {
      setReplyText('');
    }
  };
  
  const submitReply = () => {
    if (!replyText.trim()) return;
    
    // Add the reply to the local state
    const newReply = {
      username: 'You',
      text: replyText,
      timestamp: new Date().toISOString()
    };
    
    setReplies([...replies, newReply]);
    
    // Send reply to backend
    fetch('/api/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweetId: id || username,
        actionType: 'reply',
        replyText: replyText
      })
    }).catch(err => console.error('Failed to send reply:', err));
    
    // Reset the reply box
    setReplyText('');
    setShowReplyBox(false);
  };

  return (
    <div className="tweet-card">
      <div className="tweet-header">
        <div className="tweet-user">
          <div className="user-avatar">
            {username.charAt(1).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="username">{username}</div>
            {timestamp && <div className="timestamp">{formatDate(timestamp)}</div>}
          </div>
        </div>
        <div className={`sentiment-badge ${sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral'}`}>
          {sentiment > 0 ? '😊 Positive' : sentiment < 0 ? '😠 Negative' : '😐 Neutral'}
        </div>
      </div>
      
      <div className="tweet-body">
        <p className="tweet-text">{tweet}</p>
      </div>
      
      <div className="tweet-reply">
        <div className="reply-header">
          <div className="bot-avatar">AI</div>
          <div className="bot-name">AI Social Bot</div>
        </div>
        <p className="reply-text">{reply}</p>
      </div>
      
      {/* Show user replies if any */}
      {replies.length > 0 && (
        <div className="user-replies">
          {replies.map((r, idx) => (
            <div key={idx} className="user-reply">
              <div className="reply-header">
                <div className="user-avatar small">
                  {r.username.charAt(0)}
                </div>
                <div className="user-info">
                  <div className="username">{r.username}</div>
                  <div className="timestamp">{formatDate(r.timestamp)}</div>
                </div>
              </div>
              <p className="reply-text">{r.text}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Reply input box */}
      {showReplyBox && (
        <div className="reply-input-container">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="reply-input"
            rows={2}
          />
          <div className="reply-actions">
            <button 
              className="reply-submit-btn" 
              onClick={submitReply}
              disabled={!replyText.trim()}
            >
              Reply
            </button>
            <button 
              className="reply-cancel-btn"
              onClick={() => setShowReplyBox(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="tweet-actions">
        <button 
          className={`action-btn ${showReplyBox ? 'active' : ''}`}
          onClick={handleReply}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={showReplyBox ? "#1DA1F2" : "#657786"}>
            <path d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"></path>
          </svg>
          <span>Reply</span>
          {replies.length > 0 && <span className="action-count">{replies.length}</span>}
        </button>
        <button 
          className={`action-btn ${isRetweeted ? 'active' : ''}`}
          onClick={handleRetweet}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isRetweeted ? "#17BF63" : "#657786"}>
            <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.336-.75-.75-.75z"></path>
          </svg>
          <span>Retweet</span>
          {retweetCount > 0 && <span className="action-count">{retweetCount}</span>}
        </button>
        <button 
          className={`action-btn ${isLiked ? 'active' : ''}`}
          onClick={handleLike}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "#E0245E" : "#657786"}>
            <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"></path>
          </svg>
          <span>Like</span>
          {likeCount > 0 && <span className="action-count">{likeCount}</span>}
        </button>
        
        {/* Feedback area */}
        {!feedbackSubmitted ? (
          <button 
            className="action-btn improve-btn"
            onClick={() => setShowFeedback(!showFeedback)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#657786">
              <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z"></path>
            </svg>
            <span>Improve Reply</span>
          </button>
        ) : (
          <span className="feedback-thanks">Thanks for your feedback!</span>
        )}
      </div>
      
      {/* Feedback form */}
      {showFeedback && (
        <div className="feedback-form">
          <h4>How could this response be improved?</h4>
          <textarea 
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Suggest a better response..."
            rows={4}
          />
          <div className="feedback-buttons">
            <button 
              className="feedback-submit"
              onClick={submitFeedback}
              disabled={!feedbackText.trim()}
            >
              Submit
            </button>
            <button 
              className="feedback-cancel"
              onClick={() => setShowFeedback(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TweetCard;