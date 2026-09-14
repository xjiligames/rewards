/**
 * Chat Widget Module - Carnival Theme + Custom Icon
 */

(function() {
    'use strict';
    
    var userPhone = '';
    var chatId = '';
    var messagesListener = null;
    var typingListener = null;
    var unreadCount = 0;
    var isInitialized = false;
    
    // ========== INITIALIZATION ==========
    function init() {
        if (isInitialized) return;
        
        userPhone = localStorage.getItem('userPhone');
        if (!userPhone) {
            console.log('Chat: No user logged in');
            return;
        }
        
        chatId = userPhone.replace(/[^0-9]/g, '');
        
        if (!chatId) {
            console.log('Chat: Invalid phone');
            return;
        }
        
        // Check if widget already exists
        if (document.getElementById('chatWidget')) {
            console.log('Chat: Widget already exists');
            return;
        }
        
        createChatWidget();
        attachEvents();
        startListening();
        isInitialized = true;
        
        console.log('✅ Chat widget initialized for:', chatId);
    }
    
    // ========== CREATE CHAT WIDGET ==========
    function createChatWidget() {
        var widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.id = 'chatWidget';
        widget.innerHTML = 
            '<button class="chat-toggle-btn" id="chatToggleBtn">' +
                '<img src="images/PT_icon.png" class="chat-toggle-img" alt="Chat">' +
                '<span class="chat-badge" id="chatBadge" style="display: none;">0</span>' +
            '</button>' +
            
            '<div class="chat-window" id="chatWindow">' +
                '<div class="chat-header">' +
                    '<div class="chat-header-info">' +
                        '<div class="chat-header-avatar">' +
                            '<img src="images/PT_icon.png" alt="Support">' +
                        '</div>' +
                        '<div>' +
                            '<div class="chat-header-title">LUCKY DROP SUPPORT</div>' +
                            '<div class="chat-header-status">Online</div>' +
                        '</div>' +
                    '</div>' +
                    '<button class="chat-close-btn" id="chatCloseBtn">✕</button>' +
                '</div>' +
                
                '<div class="chat-messages" id="chatMessages">' +
                    '<div class="chat-bubble admin">' +
                        'Welcome to Lucky Drop Support! How can I help you today?' +
                        '<div class="chat-time">Just now</div>' +
                    '</div>' +
                    
                    '<div class="typing-indicator" id="typingIndicator">' +
                        '<div class="typing-dots">' +
                            '<span></span>' +
                            '<span></span>' +
                            '<span></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div class="chat-quick-replies" id="chatQuickReplies">' +
                    '<button class="quick-reply-btn" data-question="How I can withdraw my balance?">' +
                        '💰 How to withdraw?' +
                    '</button>' +
                    '<button class="quick-reply-btn" data-question="How to Earn Referral Bonus?">' +
                        '🎁 How to earn bonus?' +
                    '</button>' +
                '</div>' +
                
                '<div class="chat-input-area">' +
                    '<input type="text" class="chat-input" id="chatInput" placeholder="Type your message..." maxlength="500">' +
                    '<button class="chat-send-btn" id="chatSendBtn">' +
                        '<i class="fa-solid fa-paper-plane"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(widget);
    }
    
    // ========== ATTACH EVENTS ==========
    function attachEvents() {
        var toggleBtn = document.getElementById('chatToggleBtn');
        var closeBtn = document.getElementById('chatCloseBtn');
        var sendBtn = document.getElementById('chatSendBtn');
        var chatInput = document.getElementById('chatInput');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                var win = document.getElementById('chatWindow');
                if (!win) return;
                
                if (win.classList.contains('show')) {
                    win.classList.remove('show');
                } else {
                    win.classList.add('show');
                    scrollToBottom();
                    markAllAsRead();
                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                var win = document.getElementById('chatWindow');
                if (win) win.classList.remove('show');
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Quick replies
        var quickReplies = document.querySelectorAll('.quick-reply-btn');
        for (var i = 0; i < quickReplies.length; i++) {
            quickReplies[i].addEventListener('click', function() {
                var question = this.getAttribute('data-question');
                var input = document.getElementById('chatInput');
                if (input) {
                    input.value = question;
                    sendMessage();
                }
            });
        }
    }
    
    // ========== SEND MESSAGE ==========
    function sendMessage() {
        var chatInput = document.getElementById('chatInput');
        var sendBtn = document.getElementById('chatSendBtn');
        
        if (!chatInput || !sendBtn) return;
        
        var message = chatInput.value.trim();
        if (!message) return;
        
        sendBtn.disabled = true;
        chatInput.disabled = true;
        
        try {
            var db = firebase.database();
            var messageRef = db.ref('chats/' + chatId + '/messages').push();
            
            messageRef.set({
                text: message,
                sender: 'user',
                userPhone: userPhone,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            });
            
            // Update last message
            db.ref('chats/' + chatId).once('value').then(function(snap) {
                var currentUnread = 0;
                if (snap.exists()) {
                    currentUnread = snap.val().unreadAdmin || 0;
                }
                
                db.ref('chats/' + chatId).update({
                    lastMessage: message,
                    lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                    lastSender: 'user',
                    unreadAdmin: currentUnread + 1
                });
            });
            
            chatInput.value = '';
            console.log('✅ Message sent:', message);
            
        } catch(e) {
            console.error('Error sending message:', e);
            alert('Failed to send message. Please try again.');
        } finally {
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }
    
    // ========== START LISTENING ==========
    function startListening() {
        var db = firebase.database();
        
        // Listen for new messages
        messagesListener = db.ref('chats/' + chatId + '/messages')
            .orderByChild('timestamp')
            .limitToLast(50);
        
        messagesListener.on('child_added', function(snapshot) {
            var message = snapshot.val();
            displayMessage(message, snapshot.key);
        });
        
        // Listen for admin typing
        typingListener = db.ref('chats/' + chatId + '/adminTyping');
        typingListener.on('value', function(snapshot) {
            var isTyping = snapshot.val();
            showAdminTyping(isTyping);
        });
        
        // Listen for unread count
        db.ref('chats/' + chatId + '/unreadUser').on('value', function(snapshot) {
            var count = snapshot.val() || 0;
            var chatWindow = document.getElementById('chatWindow');
            var badge = document.getElementById('chatBadge');
            
            if (!badge) return;
            
            if (chatWindow && !chatWindow.classList.contains('show') && count > 0) {
                unreadCount = count;
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
                
                // Pulse animation
                badge.style.animation = 'none';
                badge.offsetHeight; // Trigger reflow
                badge.style.animation = 'badgePulse 0.5s ease';
            }
        });
    }
    
    // ========== DISPLAY MESSAGE ==========
    function displayMessage(message, messageId) {
        var messagesContainer = document.getElementById('chatMessages');
        var typingIndicator = document.getElementById('typingIndicator');
        
        if (!messagesContainer) return;
        
        // Check if message already displayed
        if (document.getElementById('msg-' + messageId)) return;
        
        var messageEl = document.createElement('div');
        messageEl.className = 'chat-bubble ' + message.sender;
        messageEl.id = 'msg-' + messageId;
        
        var time = message.timestamp 
            ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now';
        
        messageEl.innerHTML = escapeHtml(message.text) + '<div class="chat-time">' + time + '</div>';
        
        // Insert before typing indicator
        if (typingIndicator) {
            messagesContainer.insertBefore(messageEl, typingIndicator);
        } else {
            messagesContainer.appendChild(messageEl);
        }
        
        // Hide quick replies after first user message
        var quickReplies = document.getElementById('chatQuickReplies');
        if (quickReplies && message.sender === 'user') {
            quickReplies.style.display = 'none';
        }
        
        scrollToBottom();
    }
    
    // ========== SHOW ADMIN TYPING ==========
    function showAdminTyping(isTyping) {
        var typingIndicator = document.getElementById('typingIndicator');
        if (!typingIndicator) return;
        
        if (isTyping) {
            typingIndicator.classList.add('show');
        } else {
            typingIndicator.classList.remove('show');
        }
        
        scrollToBottom();
    }
    
    // ========== MARK ALL AS READ ==========
    function markAllAsRead() {
        unreadCount = 0;
        var badge = document.getElementById('chatBadge');
        if (badge) {
            badge.style.display = 'none';
        }
        
        try {
            var db = firebase.database();
            db.ref('chats/' + chatId + '/unreadUser').set(0);
            
            // Mark admin messages as read
            db.ref('chats/' + chatId + '/messages').once('value').then(function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                    var msg = childSnapshot.val();
                    if (msg.sender === 'admin' && !msg.read) {
                        db.ref('chats/' + chatId + '/messages/' + childSnapshot.key).update({ read: true });
                    }
                });
            });
        } catch(e) {
            console.error('Error marking as read:', e);
        }
    }
    
    // ========== SCROLL TO BOTTOM ==========
    function scrollToBottom() {
        var messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            setTimeout(function() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    // ========== ESCAPE HTML ==========
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========== CLEANUP ==========
    function cleanup() {
        if (!chatId) return;
        try {
            var db = firebase.database();
            if (messagesListener) {
                db.ref('chats/' + chatId + '/messages').off();
            }
            if (typingListener) {
                db.ref('chats/' + chatId + '/adminTyping').off();
            }
        } catch(e) {}
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 1000);
        });
    } else {
        setTimeout(init, 1000);
    }
    
    window.addEventListener('beforeunload', cleanup);
    
})();
