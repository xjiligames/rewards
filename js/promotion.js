/**
 * CasinoPlus Promotion & Invitation System
 * Version: 2.0 (Aligned with main game script)
 */

// ========== STRICT MODE ==========
'use strict';

// ========== WAIT FOR CONFIG ==========
// Make sure firebaseConfig is loaded from config.js
if (typeof firebaseConfig === 'undefined') {
    console.error('❌ firebaseConfig not found! Check if config.js is loaded first.');
}

// ========== SOUND CONFIGURATION ==========
const PromotionSounds = {
    claim: new Audio('sounds/claim.mp3'),
    invite: new Audio('sounds/invite.mp3'),
    success: new Audio('sounds/success.mp3')
};

// ========== PROMOTION STATE ==========
let PromotionState = {
    balance: 0,
    claimed_luckycat: false,
    invitations: [],
    leftRewardClaimed: false
};

// ========== GLOBAL VARIABLES ==========
let db = null;
let userRef = null;
let userPhone = null;
let balanceListener = null;

// ========== DOM ELEMENTS ==========
const PromoDOM = {
    userPhoneDisplay: document.getElementById('userPhoneDisplay'),
    userBalanceDisplay: document.getElementById('userBalanceDisplay'),
    popupBalanceAmount: document.getElementById('popupBalanceAmount'),
    luckyCatStatus: document.getElementById('luckyCatStatus'),
    inviteListBody: document.getElementById('inviteListBody'),
    friendPhoneInput: document.getElementById('friendPhoneInput'),
    sendInviteBtn: document.getElementById('sendInviteBtn'),
    mainTimerDisplay: document.getElementById('mainTimerDisplay'),
    claimNowBtn: document.getElementById('claimNowBtn'),
    prizePopup: document.getElementById('prizePopup'),
    leftCard: document.getElementById('leftCard'),
    rightCard: document.getElementById('rightCard'),
    leftRewardAmount: document.getElementById('leftRewardAmount'),
    rightRewardAmount: document.getElementById('rightRewardAmount'),
    progressFill: document.getElementById('progressFill'),
    statusMessage: document.getElementById('statusMessage'),
    confettiCanvas: document.getElementById('confettiCanvas')
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Play promotion sound effect with error handling
 */
function playPromoSound(soundName) {
    if (PromotionSounds[soundName]) {
        try {
            PromotionSounds[soundName].currentTime = 0;
            PromotionSounds[soundName].play().catch(e => console.log('🔇 Audio play failed:', e));
        } catch(e) {
            console.log('🔇 Sound error:', e);
        }
    }
}

/**
 * Format phone number for display (masked)
 */
function formatPhoneNumber(phone) {
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 4) + "***" + phone.substring(7, 11);
}

/**
 * Animate number change (counter effect)
 */
function animateBalance(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        
        if (PromoDOM.userBalanceDisplay) {
            PromoDOM.userBalanceDisplay.innerText = val.toFixed(2);
        }
        if (PromoDOM.popupBalanceAmount) {
            PromoDOM.popupBalanceAmount.innerText = "₱" + val.toFixed(2);
        }
        
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

/**
 * Update UI with current promotion state
 */
function updatePromotionUI() {
    // Update balance displays
    if (PromoDOM.userBalanceDisplay) {
        PromoDOM.userBalanceDisplay.innerText = PromotionState.balance.toFixed(2);
    }
    if (PromoDOM.popupBalanceAmount) {
        PromoDOM.popupBalanceAmount.innerText = "₱" + PromotionState.balance.toFixed(2);
    }
    
    // Update Lucky Cat status
    if (PromoDOM.luckyCatStatus) {
        if (PromotionState.claimed_luckycat) {
            PromoDOM.luckyCatStatus.innerText = "Claimed";
            PromoDOM.luckyCatStatus.classList.add('claimed');
        } else {
            PromoDOM.luckyCatStatus.innerText = "Available";
            PromoDOM.luckyCatStatus.classList.remove('claimed');
        }
    }
    
    // Update progress bar based on invites
    updateProgressBar();
}

/**
 * Update progress bar based on invitations count
 */
function updateProgressBar() {
    const pendingCount = getPendingInvitesCount();
    const progressPercent = (pendingCount / 6) * 100;
    
    if (PromoDOM.progressFill) {
        PromoDOM.progressFill.style.width = progressPercent + '%';
    }
    
    // Update status message
    if (PromoDOM.statusMessage) {
        if (pendingCount >= 6) {
            PromoDOM.statusMessage.innerHTML = '<span class="status-success">🎉 Complete! You\'ve reached the maximum invites! 🎉</span>';
        } else if (pendingCount > 0) {
            PromoDOM.statusMessage.innerHTML = `<span class="status-progress">📢 You have ${pendingCount}/6 pending invites. Invite ${6 - pendingCount} more to get bonus!</span>`;
        } else {
            PromoDOM.statusMessage.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
        }
    }
}

// ========== INVITATION FUNCTIONS ==========

/**
 * Get invitations from localStorage
 */
function getInvitations() {
    const key = `invitations_${userPhone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save invitations to localStorage
 */
function saveInvitations(invitations) {
    const key = `invitations_${userPhone}`;
    localStorage.setItem(key, JSON.stringify(invitations));
    PromotionState.invitations = invitations;
}

/**
 * Get count of pending invitations
 */
function getPendingInvitesCount() {
    return getInvitations().filter(inv => inv.status === 'pending').length;
}

/**
 * Add new invitation
 */
function addInvitation(friendPhone) {
    const invitations = getInvitations();
    
    // Check if already invited
    if (invitations.some(inv => inv.phone === friendPhone)) {
        return false;
    }
    
    // Check max invites (6)
    if (getPendingInvitesCount() >= 6) {
        return false;
    }
    
    invitations.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now()
    });
    
    saveInvitations(invitations);
    playPromoSound('invite');
    return true;
}

/**
 * Delete invitation
 */
function deleteInvitation(friendPhone) {
    const invitations = getInvitations();
    const invite = invitations.find(inv => inv.phone === friendPhone);
    
    if (invite && invite.status === 'approved') {
        return false;
    }
    
    const newInvites = invitations.filter(inv => inv.phone !== friendPhone);
    saveInvitations(newInvites);
    return true;
}

/**
 * Render invitations list
 */
function renderInvitations() {
    if (!PromoDOM.inviteListBody) return;
    
    const invitations = getInvitations();
    
    if (invitations.length === 0) {
        PromoDOM.inviteListBody.innerHTML = '<div class="invite-empty">No invitations sent</div>';
        return;
    }
    
    let html = '';
    invitations.forEach(inv => {
        const formattedPhone = formatPhoneNumber(inv.phone);
        const statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        const statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        const disabled = inv.status === 'approved' ? 'disabled' : '';
        
        html += `
            <div class="invite-item">
                <div class="invite-item-phone">${formattedPhone}</div>
                <div class="invite-item-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="invite-item-action">
                    <button class="delete-invite" onclick="window.handleDeleteInvite('${inv.phone}')" ${disabled}>✕</button>
                </div>
            </div>
        `;
    });
    
    PromoDOM.inviteListBody.innerHTML = html;
    updateProgressBar();
}

// ========== BALANCE MANAGEMENT ==========

/**
 * Save balance to Firebase
 */
function saveBalanceToFirebase() {
    if (userRef) {
        userRef.update({
            balance: PromotionState.balance,
            lastUpdate: Date.now()
        }).catch(e => console.error('💾 Balance save error:', e));
    }
}

/**
 * Update balance (add amount)
 */
function addToBalance(amount) {
    const oldBalance = PromotionState.balance;
    const newBalance = oldBalance + amount;
    PromotionState.balance = newBalance;
    
    animateBalance(oldBalance, newBalance, 400);
    saveBalanceToFirebase();
    updatePromotionUI();
    playPromoSound('success');
    
    return true;
}

/**
 * Claim Lucky Cat reward
 */
function claimLuckyCat() {
    if (PromotionState.claimed_luckycat) {
        alert("You have already claimed the Lucky Cat bonus!");
        return false;
    }
    
    // Add bonus (₱150)
    addToBalance(150);
    
    // Mark as claimed
    PromotionState.claimed_luckycat = true;
    
    // Save to Firebase
    if (userRef) {
        userRef.update({
            claimed_luckycat: true,
            luckycat_claimed_at: Date.now()
        }).catch(e => console.error('💾 LuckyCat save error:', e));
    }
    
    updatePromotionUI();
    playPromoSound('claim');
    startConfetti();
    
    alert("🎉 Congratulations! You received ₱150 bonus!");
    return true;
}

// ========== FIREBASE CONNECTION ==========

/**
 * Load user data from Firebase
 */
function loadUserData() {
    if (!userRef) return;
    
    userRef.once('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // User exists - load data
            PromotionState.balance = data.balance || 0;
            PromotionState.claimed_luckycat = data.claimed_luckycat || false;
            
            console.log('✅ User data loaded:', {
                balance: PromotionState.balance,
                claimed_luckycat: PromotionState.claimed_luckycat
            });
        } else {
            // New user - create initial data
            PromotionState.balance = 0;
            PromotionState.claimed_luckycat = false;
            
            userRef.set({
                phone: userPhone,
                balance: 0,
                claimed_luckycat: false,
                status: "active",
                created_at: Date.now(),
                deviceId: localStorage.getItem("userDeviceId") || "unknown"
            }).catch(e => console.error('💾 User create error:', e));
            
            console.log('🆕 New user created in Firebase');
        }
        
        updatePromotionUI();
        
    }).catch(e => {
        console.error('📂 Load error:', e);
        // Fallback to localStorage
        const savedBalance = localStorage.getItem(`${userPhone}_balance`);
        if (savedBalance) {
            PromotionState.balance = Number(savedBalance);
            updatePromotionUI();
        }
    });
}

/**
 * Setup real-time balance listener
 */
function setupBalanceListener() {
    if (!userRef) return;
    
    // Remove existing listener if any
    if (balanceListener) {
        userRef.child('balance').off('value', balanceListener);
    }
    
    balanceListener = userRef.child('balance').on('value', (snapshot) => {
        const balance = snapshot.val();
        if (balance !== null && balance !== undefined) {
            const newBalance = Number(balance);
            if (newBalance !== PromotionState.balance) {
                PromotionState.balance = newBalance;
                updatePromotionUI();
                localStorage.setItem(`${userPhone}_balance`, newBalance);
                console.log('🔄 Balance synced:', newBalance);
            }
        }
    });
}

// ========== INVITATION EVENT HANDLERS ==========

/**
 * Handle send invite button click
 */
window.handleSendInvite = function() {
    const friendPhone = PromoDOM.friendPhoneInput?.value.trim();
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Enter valid 11-digit number starting with 09");
        return;
    }
    
    if (friendPhone === userPhone) {
        alert("Cannot invite yourself");
        return;
    }
    
    if (addInvitation(friendPhone)) {
        if (PromoDOM.friendPhoneInput) PromoDOM.friendPhoneInput.value = '';
        renderInvitations();
        alert("Invitation sent successfully!");
    } else {
        alert("Cannot send invitation. Either already invited or reached maximum limit (6).");
    }
};

/**
 * Handle delete invite button click
 */
window.handleDeleteInvite = function(friendPhone) {
    if (confirm("Delete this invitation?")) {
        if (deleteInvitation(friendPhone)) {
            renderInvitations();
        } else {
            alert("Cannot delete approved invitation");
        }
    }
};

// ========== POPUP FUNCTIONS ==========

/**
 * Show prize popup
 */
function showPrizePopup() {
    if (PromoDOM.prizePopup) {
        PromoDOM.prizePopup.style.setProperty('display', 'flex', 'important');
        startConfetti();
        playPromoSound('claim');
    }
}

/**
 * Close prize popup
 */
function closePrizePopup() {
    if (PromoDOM.prizePopup) {
        PromoDOM.prizePopup.style.display = 'none';
        stopConfetti();
    }
}

// ========== CONFETTI FUNCTIONS ==========
let confettiAnimation = null;
let confettiTimeout = null;

function startConfetti() {
    const canvas = PromoDOM.confettiCanvas;
    if (!canvas) return;
    
    stopConfetti();
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 10));
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            speed: Math.random() * 3 + 2
        });
    }
    
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) {
                p.y = -p.size;
                p.x = Math.random() * canvas.width;
            }
        });
        
        confettiAnimation = requestAnimationFrame(draw);
    }
    
    draw();
    
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(stopConfetti, 3000);
}

function stopConfetti() {
    if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
        confettiAnimation = null;
    }
    
    const canvas = PromoDOM.confettiCanvas;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
    
    if (confettiTimeout) {
        clearTimeout(confettiTimeout);
        confettiTimeout = null;
    }
}

// ========== MAIN TIMER ==========
const DROP_END_DATE = new Date("May 15, 2026 00:00:00").getTime();
let timerInterval = null;

function startMainTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (!PromoDOM.mainTimerDisplay) return;
    
    function updateTimer() {
        const now = Date.now();
        const diff = DROP_END_DATE - now;
        
        if (diff > 0) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            PromoDOM.mainTimerDisplay.innerText = `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
            PromoDOM.mainTimerDisplay.innerText = "00D 00:00:00";
            if (timerInterval) clearInterval(timerInterval);
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// ========== FACEBOOK SHARE ==========
window.handleFacebookShare = function() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    window.open(fbUrl, '_blank', 'width=600,height=400');
};

window.handleClaimThruGCash = function() {
    alert("GCash claim feature coming soon!");
};

// ========== ATTACH EVENT LISTENERS ==========
function attachPromotionEventListeners() {
    // Send invite button
    if (PromoDOM.sendInviteBtn) {
        PromoDOM.sendInviteBtn.addEventListener('click', window.handleSendInvite);
    }
    
    // Enter key on invite input
    if (PromoDOM.friendPhoneInput) {
        PromoDOM.friendPhoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleSendInvite();
            }
        });
    }
    
    // Lucky Cat claim (left card)
    if (PromoDOM.leftCard) {
        PromoDOM.leftCard.addEventListener('click', () => {
            claimLuckyCat();
        });
    }
    
    // Claim Now button
    if (PromoDOM.claimNowBtn) {
        PromoDOM.claimNowBtn.addEventListener('click', showPrizePopup);
    }
}

// ========== MAIN INITIALIZATION ==========

/**
 * Main initialization function for promotion system
 */
function initPromotion() {
    console.log('🎁 CasinoPlus Promotion System Initializing...');
    
    // Check Firebase config
    if (typeof firebaseConfig === 'undefined') {
        console.error('❌ firebaseConfig not found!');
        return;
    }
    
    // Initialize Firebase if needed
    try {
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('🔥 Firebase initialized successfully');
        }
        db = firebase.database();
    } catch(e) {
        console.error('🔥 Firebase init error:', e);
        return;
    }
    
    // Get user from localStorage
    userPhone = localStorage.getItem("userPhone");
    
    // Redirect if no user phone
    if (!userPhone) {
        console.log('🔑 No userPhone found, redirecting to index.html');
        window.location.href = "index.html";
        return;
    }
    
    // Validate phone format
    if (userPhone.length !== 11 || !userPhone.startsWith('09')) {
        console.log('🔑 Invalid phone format, clearing and redirecting');
        localStorage.removeItem("userPhone");
        window.location.href = "index.html";
        return;
    }
    
    console.log('👤 User:', formatPhoneNumber(userPhone));
    
    // Display phone number
    if (PromoDOM.userPhoneDisplay) {
        PromoDOM.userPhoneDisplay.innerText = formatPhoneNumber(userPhone);
    }
    
    // Setup Firebase reference
    userRef = db.ref('user_sessions/' + userPhone);
    
    // Load data and initialize
    loadUserData();
    setupBalanceListener();
    renderInvitations();
    attachPromotionEventListeners();
    startMainTimer();
    
    // Load saved invite count
    updateProgressBar();
    
    console.log('✅ Promotion system ready!');
}

// ========== EXPORT GLOBAL FUNCTIONS ==========
window.closePrizePopup = closePrizePopup;
window.showPrizePopup = showPrizePopup;
window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;
window.getCurrentBalance = () => PromotionState.balance;
window.updateUserBalance = (newBalance) => {
    PromotionState.balance = newBalance;
    updatePromotionUI();
    saveBalanceToFirebase();
};

// ========== START THE PROMOTION SYSTEM ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromotion);
} else {
    initPromotion();
}
