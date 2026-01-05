import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';

export default function ChatWindow({ pickupId, onClose, pickup, onStatusChange }) {
  const { profile, getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  const isRestaurant = profile?.role === 'restaurant';
  const isVolunteer = profile?.role === 'volunteer';

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    pollInterval.current = setInterval(fetchMessages, 5000);
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [pickupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const token = await getToken();
      const data = await api.get(`/messages/conversation/${pickupId}`, token);
      setMessages(data.messages || []);
      
      // Update pickup status if changed
      if (data.pickup && onStatusChange) {
        onStatusChange(data.pickup);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (!messages.length) {
        setError('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      const result = await api.post('/messages/send', {
        pickupId,
        content: newMessage.trim()
      }, token);
      
      setMessages(prev => [...prev, result.message]);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const getStatusBadge = () => {
    const status = pickup?.status;
    const badges = {
      pending: { bg: 'bg-leaf-100', text: 'text-leaf-700', border: 'border-leaf-200', label: 'Awaiting Confirmation' },
      confirmed: { bg: 'bg-rescue-100', text: 'text-rescue-700', border: 'border-rescue-200', label: 'Confirmed' },
      completed: { bg: 'bg-forest-100', text: 'text-forest-700', border: 'border-forest-200', label: 'Completed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Declined' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} border ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rescue-500 to-rescue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Pickup Conversation</h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-forest-50/50">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="text-center py-8 text-forest-500">
              <p>{error}</p>
              <button onClick={fetchMessages} className="text-rescue-600 underline mt-2">
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-forest-500">
              <span className="text-4xl block mb-2">💬</span>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isOwn = msg.senderId === profile?.profileId;
                const isSystem = msg.type === 'system';
                const showDate = index === 0 || 
                  formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt);

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center text-xs text-forest-400 my-4">
                        {formatDate(msg.createdAt)}
                      </div>
                    )}
                    
                    {isSystem ? (
                      <div className="flex justify-center">
                        <div className="bg-forest-100 text-forest-600 text-sm px-4 py-2 rounded-full max-w-[80%] text-center">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                          {!isOwn && (
                            <div className="text-xs text-forest-500 mb-1 px-1">
                              {msg.senderName}
                            </div>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-rescue-500 text-white rounded-br-md'
                                : 'bg-white border border-forest-200 text-forest-800 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <div className={`text-xs text-forest-400 mt-1 ${isOwn ? 'text-right' : ''} px-1`}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input - always show for active pickups */}
        {pickup?.status !== 'completed' && pickup?.status !== 'rejected' && pickup?.status !== 'cancelled' && (
          <form onSubmit={sendMessage} className="p-4 border-t border-forest-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full border border-forest-200 focus:border-rescue-500 focus:ring-2 focus:ring-rescue-200 outline-none text-forest-800"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-rescue-500 text-white px-4 py-2 rounded-full font-medium hover:bg-rescue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Completed/Rejected/Cancelled notice */}
        {(pickup?.status === 'completed' || pickup?.status === 'rejected' || pickup?.status === 'cancelled') && (
          <div className={`p-4 text-center text-sm ${
            pickup?.status === 'completed' 
              ? 'bg-forest-50 text-forest-600' 
              : 'bg-red-50 text-red-600'
          }`}>
            {pickup?.status === 'completed' 
              ? '🎉 This pickup has been completed! Chat history is read-only.'
              : pickup?.status === 'cancelled'
              ? '🚫 This pickup was cancelled. Chat history is read-only.'
              : '❌ This pickup was declined. Chat history is read-only.'
            }
          </div>
        )}

        {/* Close Chat Button - visible for both restaurant and volunteer */}
        <div className="p-3 border-t border-forest-100 bg-forest-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg border border-forest-300 text-forest-600 font-medium hover:bg-forest-100 transition-colors"
          >
            ← Close Chat
          </button>
        </div>
      </div>
    </div>
  );
}

