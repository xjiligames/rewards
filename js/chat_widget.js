/**
 * Chat Widget Module - Lucky Drop Candy Theme
 * Fixed CSS conflicts & Premium 3D Look
 */

(function() {
    'use strict';
    
    var userPhone = '';
    var chatId = '';
    var messagesListener = null;
    var typingListener = null;
    var unreadListener = null;
    var unreadCount = 0;
    var isInitialized = false;
    var processedMessages = {};
    var autoReplySent = false;
    
    // Auto-Reply Config
    var AUTO_REPLY_CONFIG = { enabled: true, delay: 2000, showTyping: true };
    
    var AUTO_REPLY_MESSAGES = [
        'Hi! Your concern has been noted. Please wait for our admin to respond shortly. 🙏',
        'Thank you for your message! Our team will assist you soon. 😊',
        'Salamat sa iyong mensahe! Maghintay lang ng sagot mula sa aming admin. 💬'
    ];
    
    var AUTO_REPLY_KEYWORDS = {
        'withdraw': '💰 Para sa withdrawal, pindutin ang CLAIM NOW button sa home page at sundin ang instructions.',
        'cash out': '💸 Para sa cash out, pindutin ang CLAIM NOW button. Siguraduhing may balance ka.',
        'claim': '🎁 Para sa claim, pindutin ang CLAIM NOW button at hintayin ang verification process.',
        'balance': '💵 Ang iyong balance ay makikita sa dashboard. Pwede mong i-withdraw gamit ang CLAIM NOW.',
        'bonus': '🎁 Ang ₱500 bonus ay maaaring i-claim sa CLAIM BONUS button.',
        'gcash': '💚 Siguraduhing verified ang iyong GCash account. Huwag ibigay ang OTP sa kahit sino.',
        'otp': '🔐 HUWAG ibigay ang iyong OTP sa kahit sino. Ang official verification ay sa GCash app lang.',
        'scam': '✅ Legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links.',
        'legit': '✅ Opo, legit po ito! Marami nang nag-claim ng kanilang rewards.',
        'fake': '❌ Hindi po ito fake. Huwag lang mag-click ng external links.',
        'help': '🆘 Please describe your concern and our admin will assist you shortly.',
        'admin': '👨‍💼 Ang aming admin ay magre-respond sa lalong madaling panahon.',
        'hello': '👋 Hello! How can I help you today?',
        'hi': '👋 Hi! How can I help you today?',
        'salamat': '🙏 Walang anuman!'
    };
    
    function init() {
        if (isInitialized) return;
        
        userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        chatId = userPhone.replace(/[^0-9]/g, '');
        if (!chatId) return;
        
        if (document.getElementById('luckyChatWidget')) return;
        
        createChatWidget();
        attachEvents();
        startListening();
        isInitialized = true;
        
        console.log('✅ Lucky Chat Widget initialized for:', chatId);
    }
    
    function createChatWidget() {
        var widget = document.createElement('div');
        widget.className = 'lucky-chat-widget';
        widget.id = 'luckyChatWidget';
        
        // SVG Paper Plane
        var sendIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        
        widget.innerHTML = 
            '<button class="lucky-chat-toggle" id="luckyChatToggleBtn">' +
                '<img src="images/PT_icon.png" alt="Chat">' +
                '<span class="lucky-chat-badge" id="luckyChatBadge">0</span>' +
            '</button>' +
            
            '<div class="lucky-chat-window" id="luckyChatWindow">' +
                '<div class="lucky-chat-header">' +
                    '<div class="lucky-chat-header-info">' +
                        '<div class="lucky-chat-header-avatar">' +
                            '<img src="images/PT_icon.png" alt="Support">' +
                        '</div>' +
                        '<div>' +
                            '<div class="lucky-chat-header-title">LUCKY DROP SUPPORT</div>' +
                            '<div class="lucky-chat-header-status">Online</div>' +
                        '</div>' +
                    '</div>' +
                    '<button class="lucky-chat-close" id="luckyChatCloseBtn">✕</button>' +
                '</div>' +
                
                '<div class="lucky-chat-messages" id="luckyChatMessages">' +
                    '<div class="lucky-bubble-admin">' +
                        'Hi! Welcome to Lucky Drop Support! How can I help you today? 😊' +
                        '<div class="lucky-chat-time">Just now</div>' +
                    '</div>' +
                    '<div class="lucky-typing-indicator" id="luckyTypingIndicator">' +
                        '<div class="lucky-typing-dots">' +
                            '<span></span><span></span><span></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div class="lucky-chat-quick-replies" id="luckyQuickReplies">' +
                    '<button class="lucky-quick-reply-btn" data-q="How to withdraw?">💰 Withdraw</button>' +
                    '<button class="lucky-quick-reply-btn" data-q="How to claim bonus?">🎁 Bonus</button>' +
                    '<button class="lucky-quick-reply-btn" data-q="Legit ba ito?">✅ Legit?</button>' +
                '</div>' +
                
                '<div class="lucky-chat-input-area">' +
                    '<input type="text" class="lucky-chat-input" id="luckyChatInput" placeholder="Type your message..." maxlength="500">' +
                    '<button class="lucky-chat-send" id="luckyChatSendBtn">' + sendIcon + '</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(widget);
    }
    
    function attachEvents() {
        var toggleBtn = document.getElementById('luckyChatToggleBtn');
        var closeBtn = document.getElementById('luckyChatCloseBtn');
        var sendBtn = document.getElementById('luckyChatSendBtn');
        var chatInput = document.getElementById('luckyChatInput');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                var win = document.getElementById('luckyChatWindow');
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
                var win = document.getElementById('luckyChatWindow');
                if (win) win.classList.remove('show');
            });
        }
        
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        var quickReplies = document.querySelectorAll('.lucky-quick-reply-btn');
        for (var i = 0; i < quickReplies.length; i++) {
            quickReplies[i].addEventListener('click', function() {
                var q = this.getAttribute('data-q');
                var input = document.getElementById('luckyChatInput');
                if (input) {
                    input.value = q;
                    sendMessage();
                }
            });
        }
    }
    
    function sendMessage() {
        var chatInput = document.getElementById('luckyChatInput');
        var sendBtn = document.getElementById('luckyChatSendBtn');
        
        if (!chatInput || !sendBtn) return;
        var message = chatInput.value.trim();
        if (!message) return;
        
        sendBtn.disabled = true;
        chatInput.disabled = true;
        
        try {
            var db = firebase.database();
            var messageRef = db.ref('chats/' + chatId + '/messages').push();
            
            messageRef.set({
                text: message, sender: 'user', userPhone: userPhone,
                timestamp: firebase.database.ServerValue.TIMESTAMP, read: false
            });
            
            db.ref('chats/' + chatId).once('value').then(function(snap) {
                var currentUnread = snap.exists() ? (snap.val().unreadAdmin || 0) : 0;
                db.ref('chats/' + chatId).update({
                    lastMessage: message, lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                    lastSender: 'user', unreadAdmin: currentUnread + 1
                });
            });
            
            chatInput.value = '';
            triggerAutoReply(message);
            
        } catch(e) {
            console.error('Error sending message:', e);
            alert('Failed to send message. Please try again.');
        } finally {
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }
    
    function triggerAutoReply(userMessage) {
        if (!AUTO_REPLY_CONFIG.enabled || autoReplySent) return;
        autoReplySent = true;
        
        if (AUTO_REPLY_CONFIG.showTyping) showAdminTyping(true);
        
        setTimeout(function() {
            var replyText = getAutoReplyText(userMessage);
            if (AUTO_REPLY_CONFIG.showTyping) showAdminTyping(false);
            
            try {
                var db = firebase.database();
                var messageRef = db.ref('chats/' + chatId + '/messages').push();
                messageRef.set({
                    text: replyText, sender: 'admin', userPhone: userPhone,
                    timestamp: firebase.database.ServerValue.TIMESTAMP, read: false, isAutoReply: true
                });
                
                db.ref('chats/' + chatId).once('value').then(function(snap) {
                    var currentUnread = snap.exists() ? (snap.val().unreadUser || 0) : 0;
                    db.ref('chats/' + chatId).update({
                        lastMessage: replyText, lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                        lastSender: 'admin', unreadUser: currentUnread + 1
                    });
                });
            } catch(e) {}
            
            setTimeout(function() { autoReplySent = false; }, 3000);
        }, AUTO_REPLY_CONFIG.delay);
    }
    
    function getAutoReplyText(userMessage) {
        var lowerMsg = userMessage.toLowerCase().trim();
        if (AUTO_REPLY_KEYWORDS[lowerMsg]) return AUTO_REPLY_KEYWORDS[lowerMsg];
        
        var bestMatch = '', bestKeyword = '';
        for (var keyword in AUTO_REPLY_KEYWORDS) {
            if (lowerMsg.indexOf(keyword) !== -1 && keyword.length > bestKeyword.length) {
                bestMatch = AUTO_REPLY_KEYWORDS[keyword];
                bestKeyword = keyword;
            }
        }
        return bestMatch || AUTO_REPLY_MESSAGES[Math.floor(Math.random() * AUTO_REPLY_MESSAGES.length)];
    }
    
    function startListening() {
        var db = firebase.database();
        
        messagesListener = db.ref('chats/' + chatId + '/messages').orderByChild('timestamp').limitToLast(50);
        messagesListener.on('child_added', function(snapshot) {
            var message = snapshot.val();
            if (processedMessages[snapshot.key]) return;
            processedMessages[snapshot.key] = true;
            displayMessage(message, snapshot.key);
        });
        
        typingListener = db.ref('chats/' + chatId + '/adminTyping');
        typingListener.on('value', function(snapshot) {
            showAdminTyping(snapshot.val());
        });
        
        unreadListener = db.ref('chats/' + chatId + '/unreadUser');
        unreadListener.on('value', function(snapshot) {
            var count = snapshot.val() || 0;
            var chatWindow = document.getElementById('luckyChatWindow');
            var badge = document.getElementById('luckyChatBadge');
            
            if (!badge) return;
            if (chatWindow && !chatWindow.classList.contains('show') && count > 0) {
                unreadCount = count;
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else if (count === 0) {
                badge.style.display = 'none';
                unreadCount = 0;
            }
        });
    }
    
    function displayMessage(message, messageId) {
        var messagesContainer = document.getElementById('luckyChatMessages');
        var typingIndicator = document.getElementById('luckyTypingIndicator');
        if (!messagesContainer) return;
        if (document.getElementById('msg-' + messageId)) return;
        
        var messageEl = document.createElement('div');
        messageEl.className = 'lucky-bubble-' + message.sender;
        messageEl.id = 'msg-' + messageId;
        
        var time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
        messageEl.innerHTML = escapeHtml(message.text) + '<div class="lucky-chat-time">' + time + '</div>';
        
        if (typingIndicator) messagesContainer.insertBefore(messageEl, typingIndicator);
        else messagesContainer.appendChild(messageEl);
        
        var quickReplies = document.getElementById('luckyQuickReplies');
        if (quickReplies && message.sender === 'user') quickReplies.style.display = 'none';
        
        scrollToBottom();
    }
    
    function showAdminTyping(isTyping) {
        var typingIndicator = document.getElementById('luckyTypingIndicator');
        if (!typingIndicator) return;
        if (isTyping) typingIndicator.classList.add('show');
        else typingIndicator.classList.remove('show');
        scrollToBottom();
    }
    
    function markAllAsRead() {
        unreadCount = 0;
        var badge = document.getElementById('luckyChatBadge');
        if (badge) badge.style.display = 'none';
        
        try {
            var db = firebase.database();
            db.ref('chats/' + chatId + '/unreadUser').set(0);
            db.ref('chats/' + chatId + '/messages').once('value').then(function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                    var msg = childSnapshot.val();
                    if (msg.sender === 'admin' && !msg.read) {
                        db.ref('chats/' + chatId + '/messages/' + childSnapshot.key).update({ read: true });
                    }
                });
            });
        } catch(e) {}
    }
    
    function scrollToBottom() {
        var messagesContainer = document.getElementById('luckyChatMessages');
        if (messagesContainer) {
            setTimeout(function() { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 100);
        }
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function cleanup() {
        if (!chatId) return;
        try {
            var db = firebase.database();
            if (messagesListener) db.ref('chats/' + chatId + '/messages').off('child_added', messagesListener);
            if (typingListener) db.ref('chats/' + chatId + '/adminTyping').off('value', typingListener);
            if (unreadListener) db.ref('chats/' + chatId + '/unreadUser').off('value', unreadListener);
            processedMessages = {};
        } catch(e) {}
    }
    
    window.ChatWidget = {
        init: init,
        cleanup: cleanup,
        isInitialized: function() { return isInitialized; },
        enableAutoReply: function() { AUTO_REPLY_CONFIG.enabled = true; },
        disableAutoReply: function() { AUTO_REPLY_CONFIG.enabled = false; },
        setAutoReplyDelay: function(ms) { AUTO_REPLY_CONFIG.delay = ms; },
        getKeywords: function() { return Object.keys(AUTO_REPLY_KEYWORDS); }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
    } else {
        setTimeout(init, 1000);
    }
    
    window.addEventListener('beforeunload', cleanup);
})();
