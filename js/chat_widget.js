/**
 * Chat Widget Module - Casino Theme
 * Private chat between user and admin
 */

(function() {
    'use strict';
    
    let userPhone = '';
    let chatId = '';
    let messagesListener = null;
    let typingListener = null;
    let isAdminTyping = false;
    let unreadCount = 0;
    
    // ========== INITIALIZATION ==========
    function init() {
        userPhone = localStorage.getItem('userPhone');
        if (!userPhone) {
            console.log('Chat: No user logged in');
            return;
        }
        
        chatId = userPhone.replace(/[^0-9]/g, '');
        
        createChatWidget();
        attachEvents();
        startListening();
        
        console.log('Chat widget initialized for:', chatId);
    }
    
    // ========== CREATE CHAT WIDGET ==========
    function createChatWidget() {
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.id = 'chatWidget';
        widget.innerHTML = `
            <!-- Chat Toggle Button -->
            <button class="chat-toggle-btn" id="chatToggleBtn">
                <i class="fa-solid fa-comments"></i>
                <span class="chat-badge" id="chatBadge" style="display: none;">0</span>
            </button>
            
            <!-- Chat Window -->
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <div class="chat-header-avatar">👑</div>
                        <div>
                            <div class="chat-header-title">LUCKY DROP SUPPORT</div>
                            <div class="chat-header-status">Online</div>
                        </div>
                    </div>
                    <button class="chat-close-btn" id="chatCloseBtn">✕</button>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <!-- Welcome Message -->
                    <div class="chat-bubble admin">
                        Welcome to Lucky Drop Support! How can I help you today?
                        <div class="chat-time">Just now</div>
                    </div>
                    
                    <!-- Typing Indicator -->
                    <div class="typing-indicator" id="typingIndicator">
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Replies -->
                <div class="chat-quick-replies" id="chatQuickReplies">
                    <button class="quick-reply-btn" data-question="How I can withdraw my balance?">
                        💰 How to withdraw?
                    </button>
                    <button class="quick-reply-btn" data-question="How to Earn Referral Bonus?">
                        🎁 How to earn bonus?
                    </button>
                </div>
                
                <!-- Input Area -->
                <div class="chat-input-area">
                    <input 
                        type="text" 
                        class="chat-input" 
                        id="chatInput" 
                        placeholder="Type your message..."
                        maxlength="500"
                    >
                    <button class="chat-send-btn" id="chatSendBtn">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(widget);
    }
    
    // ========== ATTACH EVENTS ==========
    function attachEvents() {
        const toggleBtn = document.getElementById('chatToggleBtn');
        const closeBtn = document.getElementById('chatCloseBtn');
        const sendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput');
        const chatWindow = document.getElementById('chatWindow');
        
        // Toggle chat window
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const window = document.getElementById('chatWindow');
                if (window) {
                    const isVisible = window.classList.contains('show');
                    if (isVisible) {
                        window.classList.remove('show');
                    } else {
                        window.classList.add('show');
                        scrollToBottom();
                        markAllAsRead();
                    }
                }
            });
        }
        
        // Close chat window
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (chatWindow) chatWindow.classList.remove('show');
            });
        }
        
        // Send message
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }
        
        // Send on Enter
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Quick replies
        document.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const question = this.getAttribute('data-question');
                if (chatInput) {
                    chatInput.value = question;
                    sendMessage();
                }
            });
        });
    }
    
    // ========== SEND MESSAGE ==========
    async function sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('chatSendBtn');
        
        if (!chatInput || !sendBtn) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Disable send button
        sendBtn.disabled = true;
        chatInput.disabled = true;
        
        try {
            const db = firebase.database();
            const messageRef = db.ref(`chats/${chatId}/messages`).push();
            
            await messageRef.set({
                text: message,
                sender: 'user',
                userPhone: userPhone,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            });
            
            // Update last message
            await db.ref(`chats/${chatId}`).update({
                lastMessage: message,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                lastSender: 'user',
                unreadAdmin: (await getUnreadAdminCount()) + 1
            });
            
            chatInput.value = '';
            console.log('Message sent:', message);
            
        } catch(e) {
            console.error('Error sending message:', e);
            alert('Failed to send message. Please try again.');
        } finally {
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }
    
    // ========== GET UNREAD ADMIN COUNT ==========
    async function getUnreadAdminCount() {
        try {
            const db = firebase.database();
            const snap = await db.ref(`chats/${chatId}`).once('value');
            if (snap.exists()) {
                return snap.val().unreadAdmin || 0;
            }
        } catch(e) {
            console.error('Error getting unread count:', e);
        }
        return 0;
    }
    
    // ========== START LISTENING ==========
    function startListening() {
        const db = firebase.database();
        
        // Listen for new messages
        messagesListener = db.ref(`chats/${chatId}/messages`)
            .orderByChild('timestamp')
            .limitToLast(50);
        
        messagesListener.on('child_added', function(snapshot) {
            const message = snapshot.val();
            displayMessage(message, snapshot.key);
            
            // Update unread count for user
            if (message.sender === 'admin') {
                updateUnreadCount();
            }
        });
        
        // Listen for admin typing
        typingListener = db.ref(`chats/${chatId}/adminTyping`);
        typingListener.on('value', function(snapshot) {
            const isTyping = snapshot.val();
            showAdminTyping(isTyping);
        });
        
        // Listen for message read status
        db.ref(`chats/${chatId}/messages`).on('child_changed', function(snapshot) {
            const message = snapshot.val();
            if (message.sender === 'user' && message.read) {
                // Update UI to show read status if needed
            }
        });
    }
    
    // ========== DISPLAY MESSAGE ==========
    function displayMessage(message, messageId) {
        const messagesContainer = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');
        
        if (!messagesContainer) return;
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `chat-bubble ${message.sender}`;
        messageEl.id = `msg-${messageId}`;
        
        const time = message.timestamp 
            ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now';
        
        messageEl.innerHTML = `
            ${escapeHtml(message.text)}
            <div class="chat-time">${time}</div>
        `;
        
        // Insert before typing indicator
        if (typingIndicator) {
            messagesContainer.insertBefore(messageEl, typingIndicator);
        } else {
            messagesContainer.appendChild(messageEl);
        }
        
        // Remove quick replies after first user message
        const quickReplies = document.getElementById('chatQuickReplies');
        if (quickReplies && message.sender === 'user') {
            quickReplies.style.display = 'none';
        }
        
        scrollToBottom();
    }
    
    // ========== SHOW ADMIN TYPING ==========
    function showAdminTyping(isTyping) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (isTyping) {
            typingIndicator.classList.add('show');
            isAdminTyping = true;
        } else {
            typingIndicator.classList.remove('show');
            isAdminTyping = false;
        }
        
        scrollToBottom();
    }
    
    // ========== UPDATE UNREAD COUNT ==========
    function updateUnreadCount() {
        const chatWindow = document.getElementById('chatWindow');
        const badge = document.getElementById('chatBadge');
        
        if (!badge) return;
        
        // Only show badge if chat is closed
        if (chatWindow && !chatWindow.classList.contains('show')) {
            unreadCount++;
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        }
    }
    
    // ========== MARK ALL AS READ ==========
    function markAllAsRead() {
        unreadCount = 0;
        const badge = document.getElementById('chatBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    }
    
    // ========== SCROLL TO BOTTOM ==========
    function scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    // ========== ESCAPE HTML ==========
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========== CLEANUP ==========
    function cleanup() {
        const db = firebase.database();
        if (messagesListener) {
            db.ref(`chats/${chatId}/messages`).off('child_added', messagesListener);
        }
        if (typingListener) {
            db.ref(`chats/${chatId}/adminTyping`).off('value', typingListener);
        }
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
})();

// chat_widget.js - Add this notification function
function updateUnreadCount() {
    const db = firebase.database();
    const chatWindow = document.getElementById('chatWindow');
    const badge = document.getElementById('chatBadge');
    
    if (!badge) return;
    
    // Get unread count from Firebase
    db.ref('chats/' + chatId + '/unreadUser').on('value', function(snapshot) {
        const count = snapshot.val() || 0;
        
        // Only show badge if chat is closed
        if (chatWindow && !chatWindow.classList.contains('show') && count > 0) {
            unreadCount = count;
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
            
            // Pulse animation for new messages
            badge.style.animation = 'none';
            badge.offsetHeight; // Trigger reflow
            badge.style.animation = 'badgePulse 0.5s ease';
        }
    });
}

// Add mark as read when opening chat
function markAllAsRead() {
    unreadCount = 0;
    const badge = document.getElementById('chatBadge');
    if (badge) {
        badge.style.display = 'none';
    }
    
    // Mark all admin messages as read in Firebase
    const db = firebase.database();
    db.ref('chats/' + chatId + '/unreadUser').set(0);
    db.ref('chats/' + chatId + '/messages').once('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const msg = childSnapshot.val();
            if (msg.sender === 'admin' && !msg.read) {
                db.ref('chats/' + chatId + '/messages/' + childSnapshot.key).update({ read: true });
            }
        });
    });
}
