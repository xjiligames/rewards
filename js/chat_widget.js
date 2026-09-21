/**
 * Chat Widget Module - Carnival Theme + Auto-Reply
 * Support chat with admin + AUTO-RESPONSE (Admin POV)
 * Uses: images/PT_icon.png
 * 
 * ⚡ AUTO-REPLY:
 * ✅ Admin POV — auto-reply mula sa admin side
 * ✅ Smart keyword matching (30+ keywords)
 * ✅ Delayed response (2 seconds)
 * ✅ Anti-lag (walang mabigat na effects)
 * ✅ Anti-scam answers
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
    
    // ============================================================
    // 🤖 AUTO-REPLY CONFIGURATION (ADMIN POV)
    // ============================================================
    var AUTO_REPLY_CONFIG = {
        enabled: true,
        delay: 2000,        // 2 seconds
        showTyping: true    // Show typing indicator bago mag-reply
    };
    
    // ============================================================
    // 🤖 AUTO-REPLY MESSAGES (DEFAULT)
    // ============================================================
    var AUTO_REPLY_MESSAGES = [
        'Hi! Your concern has been noted. Please wait for our admin to respond shortly. 🙏',
        'Thank you for your message! Our team will assist you soon. 😊',
        'Salamat sa iyong mensahe! Maghintay lang ng sagot mula sa aming admin. 💬',
        'We received your message. Please be patient, an admin will respond soon. ⏳',
        'Nareceive na po namin ang inyong mensahe. Maghintay lang po ng sagot. 💚'
    ];
    
    // ============================================================
    // 🤖 AUTO-REPLY KEYWORDS (SMART MATCHING)
    // ============================================================
    var AUTO_REPLY_KEYWORDS = {
        
        // ========== WITHDRAWAL-RELATED ==========
        'withdraw': '💰 Para sa withdrawal, pindutin ang CLAIM NOW button sa home page at sundin ang instructions. Siguraduhing verified ang iyong GCash account.',
        'withdrawal': '💰 Para sa withdrawal, pindutin ang CLAIM NOW button at hintayin ang verification process. Siguraduhing verified ang GCash.',
        'cash out': '💸 Para sa cash out, pindutin ang CLAIM NOW button. Siguraduhing may balance ka at verified ang GCash account.',
        'cashout': '💸 Para sa cash out, pindutin ang CLAIM NOW button. Siguraduhing may balance ka at verified ang GCash account.',
        'claim': '🎁 Para sa claim, pindutin ang CLAIM NOW button at hintayin ang verification process.',
        'balance': '💵 Ang iyong balance ay makikita sa dashboard. Pwede mong i-withdraw gamit ang CLAIM NOW button.',
        'pera': '💵 Ang iyong pera ay makikita sa balance. I-withdraw gamit ang CLAIM NOW button.',
        'kuwarta': '💵 Ang iyong kuwarta ay makikita sa balance. I-withdraw gamit ang CLAIM NOW button.',
        
        // ========== BONUS-RELATED ==========
        'bonus': '🎁 Ang ₱500 bonus ay maaaring i-claim sa CLAIM BONUS button. Siguraduhing hindi pa naka-claim.',
        'referral': '👥 Para sa referral bonus, i-share ang iyong link sa Facebook at hintayin ang confirmation ng iyong friend.',
        'reward': '🏆 Ang rewards ay ma-claim sa pamamagitan ng CLAIM NOW button. Siguraduhing nasa mobile device ka.',
        'premyo': '🏆 Ang premyo ay ma-claim sa pamamagitan ng CLAIM NOW button. Siguraduhing nasa mobile device ka.',
        'regalo': '🎁 Ang regalo ay ma-claim sa CLAIM BONUS button. Siguraduhing hindi pa naka-claim.',
        '500': '🎁 Ang ₱500 bonus ay maaaring i-claim sa CLAIM BONUS button. Siguraduhing hindi pa naka-claim.',
        
        // ========== GCASH-RELATED ==========
        'gcash': '💚 Siguraduhing verified ang iyong GCash account para sa instant withdrawal. Huwag ibigay ang OTP sa kahit sino.',
        'gcash app': '📱 Buksan ang official GCash app para sa verification. HUWAG mag-click ng external links na humihingi ng GCash details.',
        'otp': '🔐 HUWAG ibigay ang iyong OTP sa kahit sino. Ang official verification ay sa GCash app lang.',
        'verified': '✅ Siguraduhing verified ang iyong GCash account. Buksan ang official GCash app para sa verification.',
        'verify': '✅ Para sa verification, hintayin ang AI call mula sa aming system. Huwag mag-click ng external links.',
        'verification': '✅ Ang verification ay ginagawa sa pamamagitan ng AI call. Huwag ibigay ang iyong code sa kahit sino.',
        
        // ========== GREETINGS ==========
        'hello': '👋 Hello! How can I help you today?',
        'hi': '👋 Hi! How can I help you today?',
        'hey': '👋 Hey! How can I help you today?',
        'kumusta': '👋 Kumusta! Paano kita matutulungan ngayon?',
        'kamusta': '👋 Kamusta! Paano kita matutulungan ngayon?',
        'good morning': '☀️ Good morning! How can I help you today?',
        'good afternoon': '🌤️ Good afternoon! How can I help you today?',
        'good evening': '🌙 Good evening! How can I help you today?',
        'magandang umaga': '☀️ Magandang umaga! Paano kita matutulungan?',
        'magandang gabi': '🌙 Magandang gabi! Paano kita matutulungan?',
        
        // ========== HELP ==========
        'help': '🆘 Please describe your concern and our admin will assist you shortly.',
        'tulong': '🆘 Ilarawan ang iyong problema at tutulungan ka ng aming admin.',
        'saklolo': '🆘 Ilarawan ang iyong problema at tutulungan ka ng aming admin.',
        'problem': '🆘 Sorry for the inconvenience. Please describe your problem and our admin will help you.',
        'problema': '🆘 Paumanhin sa abala. Ilarawan ang iyong problema at tutulungan ka ng admin.',
        'error': '⚠️ Sorry for the error. Please refresh the page and try again. If the issue persists, our admin will assist you.',
        'sira': '⚠️ Paumanhin sa sira. I-refresh ang page at subukan ulit. Kung hindi pa rin, tutulungan ka ng admin.',
        'hindi gumagana': '⚠️ Paumanhin. I-refresh ang page at subukan ulit. Kung hindi pa rin, tutulungan ka ng admin.',
        'not working': '⚠️ Sorry for the inconvenience. Please refresh the page and try again.',
        'ayaw gumana': '⚠️ Paumanhin. I-refresh ang page at subukan ulit. Kung hindi pa rin, tutulungan ka ng admin.',
        
        // ========== THANKS ==========
        'thank': '🙏 You are welcome!',
        'thanks': '🙏 You are welcome!',
        'thank you': '🙏 You are welcome!',
        'salamat': '🙏 Walang anuman!',
        'maraming salamat': '🙏 Walang anuman! Salamat din sa iyong pasensya.',
        'ty': '🙏 You are welcome!',
        
        // ========== 🆕 SCAM / LEGIT QUESTIONS ==========
        'scam': '✅ Legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links at huwag ibigay ang OTP sa kahit sino. Para sa verification, gamitin lang ang official GCash app. 💚',
        'scam ba': '✅ Legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links at huwag ibigay ang OTP sa kahit sino. 💚',
        'scam ba ito': '✅ Legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links at huwag ibigay ang OTP sa kahit sino. 💚',
        'legit': '✅ Opo, legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'legit ba': '✅ Opo, legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'legit ba ito': '✅ Opo, legit po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'totoo': '✅ Opo, totoo po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'totoo ba': '✅ Opo, totoo po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'totoo ba ito': '✅ Opo, totoo po ito! Ang Lucky Drop ay isang legitimate na reward platform. Marami nang nag-claim ng kanilang rewards. 💚',
        'fake': '❌ Hindi po ito fake. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'fake ba': '❌ Hindi po ito fake. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'fake ba ito': '❌ Hindi po ito fake. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'peke': '❌ Hindi po ito peke. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'peke ba': '❌ Hindi po ito peke. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'peke ba ito': '❌ Hindi po ito peke. Ang Lucky Drop ay isang legitimate na reward platform. Huwag lang mag-click ng external links. 💚',
        'lolokohin': '❌ Hindi po kayo lolokohin. Ang Lucky Drop ay isang legitimate na reward platform. 💚',
        'niloloko': '❌ Hindi po kayo niloloko. Ang Lucky Drop ay isang legitimate na reward platform. 💚',
        'modus': '⚠️ Huwag mag-click ng external links. Ang official verification ay sa GCash app lang. Ang Lucky Drop ay legit. 💚',
        'phishing': '⚠️ Huwag mag-click ng external links. Ang official verification ay sa GCash app lang. Ang Lucky Drop ay legit. 💚',
        
        // ========== 🆕 MONEY / WITHDRAWAL CONCERNS ==========
        'pera ko': '💵 Ang iyong pera ay makikita sa balance. I-withdraw gamit ang CLAIM NOW button.',
        'wala akong pera': '💵 Siguraduhing may balance ka. Kung wala, i-claim ang ₱500 bonus sa CLAIM BONUS button.',
        'hindi ko makuha': '⚠️ Paumanhin. I-refresh ang page at subukan ulit. Kung hindi pa rin, tutulungan ka ng admin.',
        'hindi pumasok': '⚠️ Paumanhin. Siguraduhing verified ang GCash account at hintayin ang confirmation.',
        'delay': '⏳ Salamat sa paghihintay. Ang withdrawal ay maaaring mag-take ng 24-48 hours depende sa verification.',
        'matagal': '⏳ Salamat sa paghihintay. Ang withdrawal ay maaaring mag-take ng 24-48 hours. Ang admin ay tutulong sa iyo.',
        'tagal': '⏳ Salamat sa paghihintay. Ang withdrawal ay maaaring mag-take ng 24-48 hours. Ang admin ay tutulong sa iyo.',
        
        // ========== 🆕 VERIFICATION CONCERNS ==========
        'hindi ma-verify': '✅ Buksan ang official GCash app para sa verification. Huwag mag-click ng external links.',
        'cannot verify': '✅ Open the official GCash app for verification. Do not click external links.',
        'error sa verify': '⚠️ Paumanhin. I-refresh ang page at subukan ulit. Kung hindi pa rin, tutulungan ka ng admin.',
        'code': '🔐 Ang verification code ay galing sa AI call. Huwag ibigay sa kahit sino.',
        '4-digit': '🔐 Ang 4-digit code ay galing sa AI call. Huwag ibigay sa kahit sino.',
        '4 digit': '🔐 Ang 4-digit code ay galing sa AI call. Huwag ibigay sa kahit sino.',
        'ai call': '📞 Ang AI call ay para sa verification. Hintayin ang call at i-enter ang 4-digit code.',
        'call': '📞 Ang AI call ay para sa verification. Hintayin ang call at i-enter ang 4-digit code.',
        
        // ========== 🆕 PATIENCE ==========
        'waiting': '⏳ Salamat sa paghihintay. Ang aming admin ay magre-respond sa lalong madaling panahon.',
        'wait': '⏳ Please wait for our admin to respond. Salamat sa pasensya.',
        'hintay': '⏳ Salamat sa paghihintay. Ang aming admin ay magre-respond sa lalong madaling panahon.',
        'antay': '⏳ Salamat sa paghihintay. Ang aming admin ay magre-respond sa lalong madaling panahon.',
        'tagal ng reply': '⏳ Paumanhin sa delay. Marami lang pong user ang aming sinasagot. Salamat sa pasensya.',
        
        // ========== 🆕 COMPLAINTS ==========
        'complaint': '🆘 Paumanhin sa abala. I-describe ang iyong complaint at tutulungan ka ng admin.',
        'reklamo': '🆘 Paumanhin sa abala. I-describe ang iyong reklamo at tutulungan ka ng admin.',
        'badtrip': '🆘 Paumanhin sa abala. I-describe ang iyong problema at tutulungan ka ng admin.',
        'galit': '🆘 Paumanhin sa abala. I-describe ang iyong problema at tutulungan ka ng admin.',
        
        // ========== 🆕 ADMIN REQUEST ==========
        'admin': '👨‍💼 Ang aming admin ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        'manager': '👨‍💼 Ang aming manager ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        'supervisor': '👨‍💼 Ang aming supervisor ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        'tao': '👨‍💼 Ang aming admin ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        'human': '👨‍💼 Our admin will respond shortly. Thank you for your patience.',
        'bot': '🤖 Hindi po ako bot. Ang aming admin ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        'robot': '🤖 Hindi po ako robot. Ang aming admin ay magre-respond sa lalong madaling panahon. Salamat sa pasensya.',
        
        // ========== 🆕 OTHER ==========
        'bye': '👋 Thank you for contacting Lucky Drop Support. Have a great day!',
        'goodbye': '👋 Thank you for contacting Lucky Drop Support. Have a great day!',
        'paalam': '👋 Salamat sa pag-contact sa Lucky Drop Support. Magandang araw!',
        'ok': '👍 Salamat! Kung may iba ka pang concern, sabihin lang.',
        'okay': '👍 Salamat! Kung may iba ka pang concern, sabihin lang.',
        'sige': '👍 Salamat! Kung may iba ka pang concern, sabihin lang.',
        'yes': '👍 Salamat! Kung may iba ka pang concern, sabihin lang.',
        'oo': '👍 Salamat! Kung may iba ka pang concern, sabihin lang.',
        'no': '👍 Okay lang po. Kung may iba ka pang concern, sabihin lang.',
        'hindi': '👍 Okay lang po. Kung may iba ka pang concern, sabihin lang.'
    };
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
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
        console.log('🤖 Auto-reply enabled:', AUTO_REPLY_CONFIG.enabled);
        console.log('📚 Total keywords:', Object.keys(AUTO_REPLY_KEYWORDS).length);
    }
    
    // ============================================================
    // CREATE CHAT WIDGET (Same design sa share_and_earn)
    // ============================================================
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
                        'Hi! Welcome to Lucky Drop Support! How can I help you today? 😊' +
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
                    '<button class="quick-reply-btn" data-question="How to withdraw my balance?">' +
                        '💰 How to withdraw?' +
                    '</button>' +
                    '<button class="quick-reply-btn" data-question="How to earn bonus?">' +
                        '🎁 How to earn bonus?' +
                    '</button>' +
                    '<button class="quick-reply-btn" data-question="Legit ba ito?">' +
                        '✅ Legit ba ito?' +
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
    
    // ============================================================
    // ATTACH EVENTS
    // ============================================================
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
    
    // ============================================================
    // SEND MESSAGE (with Auto-Reply Trigger)
    // ============================================================
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
            
            // Update last message metadata
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
            
            // 🤖 TRIGGER AUTO-REPLY
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
    
    // ============================================================
    // 🤖 AUTO-REPLY FUNCTIONS (ADMIN POV)
    // ============================================================
    
    /**
     * Trigger auto-reply mula sa admin
     */
    function triggerAutoReply(userMessage) {
        if (!AUTO_REPLY_CONFIG.enabled) {
            console.log('🤖 Auto-reply disabled');
            return;
        }
        
        // Prevent multiple auto-replies in short time
        if (autoReplySent) {
            console.log('🤖 Auto-reply already sent recently');
            return;
        }
        
        autoReplySent = true;
        
        // ✅ Show typing indicator (admin is typing)
        if (AUTO_REPLY_CONFIG.showTyping) {
            showAdminTyping(true);
        }
        
        setTimeout(function() {
            // Get reply text based on keywords
            var replyText = getAutoReplyText(userMessage);
            
            // ✅ Hide typing indicator
            if (AUTO_REPLY_CONFIG.showTyping) {
                showAdminTyping(false);
            }
            
            // Send auto-reply as admin
            sendAutoReplyMessage(replyText);
            
            console.log('🤖 Auto-reply sent:', replyText);
            
            // Reset flag after 3 seconds
            setTimeout(function() {
                autoReplySent = false;
            }, 3000);
            
        }, AUTO_REPLY_CONFIG.delay);
    }
    
    /**
     * Get auto-reply text based on keyword matching
     * Priority: Exact match → Longest match → Default
     */
    function getAutoReplyText(userMessage) {
        var lowerMsg = userMessage.toLowerCase().trim();
        
        // ✅ 1. Exact match check
        if (AUTO_REPLY_KEYWORDS[lowerMsg]) {
            return AUTO_REPLY_KEYWORDS[lowerMsg];
        }
        
        // ✅ 2. Partial match (longest first)
        var bestMatch = '';
        var bestKeyword = '';
        
        for (var keyword in AUTO_REPLY_KEYWORDS) {
            if (lowerMsg.indexOf(keyword) !== -1) {
                if (keyword.length > bestKeyword.length) {
                    bestMatch = AUTO_REPLY_KEYWORDS[keyword];
                    bestKeyword = keyword;
                }
            }
        }
        
        if (bestMatch) {
            return bestMatch;
        }
        
        // ✅ 3. Default: random message
        return AUTO_REPLY_MESSAGES[Math.floor(Math.random() * AUTO_REPLY_MESSAGES.length)];
    }
    
    /**
     * Send auto-reply message as admin
     */
    function sendAutoReplyMessage(replyText) {
        try {
            var db = firebase.database();
            var messageRef = db.ref('chats/' + chatId + '/messages').push();
            
            messageRef.set({
                text: replyText,
                sender: 'admin',           // ✅ ADMIN ANG SENDER
                userPhone: userPhone,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false,
                isAutoReply: true          // ✅ AUTO-REPLY FLAG
            });
            
            // Update metadata
            db.ref('chats/' + chatId).once('value').then(function(snap) {
                var currentUnread = 0;
                if (snap.exists()) {
                    currentUnread = snap.val().unreadUser || 0;
                }
                
                db.ref('chats/' + chatId).update({
                    lastMessage: replyText,
                    lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                    lastSender: 'admin',
                    unreadUser: currentUnread + 1
                });
            });
            
        } catch(e) {
            console.error('Error sending auto-reply:', e);
        }
    }
    
    // ============================================================
    // START LISTENING
    // ============================================================
    function startListening() {
        var db = firebase.database();
        
        // Listen for new messages
        messagesListener = db.ref('chats/' + chatId + '/messages')
            .orderByChild('timestamp')
            .limitToLast(50);
        
        messagesListener.on('child_added', function(snapshot) {
            var message = snapshot.val();
            var msgId = snapshot.key;
            
            // Prevent duplicate display
            if (processedMessages[msgId]) return;
            processedMessages[msgId] = true;
            
            displayMessage(message, msgId);
        });
        
        // Listen for admin typing
        typingListener = db.ref('chats/' + chatId + '/adminTyping');
        typingListener.on('value', function(snapshot) {
            var isTyping = snapshot.val();
            showAdminTyping(isTyping);
        });
        
        // Listen for unread count
        unreadListener = db.ref('chats/' + chatId + '/unreadUser');
        unreadListener.on('value', function(snapshot) {
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
                badge.offsetHeight;
                badge.style.animation = 'badgePulse 0.5s ease';
            } else if (count === 0) {
                badge.style.display = 'none';
                unreadCount = 0;
            }
        });
    }
    
    // ============================================================
    // DISPLAY MESSAGE
    // ============================================================
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
    
    // ============================================================
    // SHOW ADMIN TYPING
    // ============================================================
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
    
    // ============================================================
    // MARK ALL AS READ
    // ============================================================
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
    
    // ============================================================
    // SCROLL TO BOTTOM
    // ============================================================
    function scrollToBottom() {
        var messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            setTimeout(function() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    // ============================================================
    // ESCAPE HTML
    // ============================================================
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================================
    // CLEANUP
    // ============================================================
    function cleanup() {
        if (!chatId) return;
        try {
            var db = firebase.database();
            if (messagesListener) {
                db.ref('chats/' + chatId + '/messages').off('child_added', messagesListener);
                messagesListener = null;
            }
            if (typingListener) {
                db.ref('chats/' + chatId + '/adminTyping').off('value', typingListener);
                typingListener = null;
            }
            if (unreadListener) {
                db.ref('chats/' + chatId + '/unreadUser').off('value', unreadListener);
                unreadListener = null;
            }
            processedMessages = {};
        } catch(e) {}
    }
    
    // ============================================================
    // EXPORT PUBLIC API
    // ============================================================
    window.ChatWidget = {
        init: init,
        cleanup: cleanup,
        isInitialized: function() { return isInitialized; },
        // 🆕 Auto-reply controls
        enableAutoReply: function() { AUTO_REPLY_CONFIG.enabled = true; },
        disableAutoReply: function() { AUTO_REPLY_CONFIG.enabled = false; },
        setAutoReplyDelay: function(ms) { AUTO_REPLY_CONFIG.delay = ms; },
        getKeywords: function() { return Object.keys(AUTO_REPLY_KEYWORDS); }
    };
    
    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 1000);
        });
    } else {
        setTimeout(init, 1000);
    }
    
    window.addEventListener('beforeunload', cleanup);
    
})();
