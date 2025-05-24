import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

function ChatBox() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!input.trim()) return;
  
  // Add user message to chat
  const userMessage = { role: 'user', content: input };
  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);
  
  const userInput = input;
  setInput('');
  
  try {
    console.log('Sending message to backend:', userInput);
    
    // Send message to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-Id': 'web-chat-user-' + Date.now()  // Add a unique session ID
      },
      body: JSON.stringify({ message: userInput })
    });
    
    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Received response:', data);
    
    if (!data.reply) {
      console.error('Missing reply in API response:', data);
      throw new Error('Invalid response format');
    }
    
    // Add AI response to chat
    setMessages(prev => [...prev, { role: 'system', content: data.reply }]);
  } catch (error) {
    console.error('Error sending message:', error);
    setMessages(prev => [...prev, { 
      role: 'system', 
      content: 'Sorry, I encountered an error processing your request: ' + error.message
    }]);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.role === 'user' ? 'user-message' : 'system-message'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? 'You' : 'AI'}
            </div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message system-message">
            <div className="message-avatar">AI</div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatBox;