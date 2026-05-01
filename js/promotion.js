/**
 * CasinoPlus Promotion & Invitation System
 * Version: 7.0 (FULLY CLICKABLE)
 */

// ========== STRICT MODE ==========
'use strict';

// ========== WAIT FOR CONFIG ==========
if (typeof firebaseConfig === 'undefined') {
    console.error('❌ firebaseConfig not found!');
}

// ========== SOUND CONFIGURATION ==========
const PromotionSounds = {
    scatter: new Audio('sounds/super_ace_scatter_ring.mp3'),
    claim: new Audio('sounds/claim.mp3'),
    invite: new Audio('sounds/invite.mp3'),
    success: new Audio('sounds/success.mp3')
};

// ========== PROMOTION STATE ==========
let PromotionState = {
    balance: 0,
    claimed_luckycat: false,
    invitations: [],
    receivedInvites: []
};

// ========== GLOBAL VARIABLES ==========
let db = null;
let userRef = null;
let userPhone = null;
let balanceListener = null;
let timerInterval = null;
let confettiAnimation = null;
let confettiTimeout = null;
let currentUserFingerprint = null;
let currentUserDeviceId = null;
let timerEndDate = null;
const CYCLE_HOURS = 72;

// ========== DOM ELEMENTS ==========
let PromoDOM = {};

function refreshDOM() {
    PromoDOM = {
        userPhoneDisplay: document.getElementById('userPhoneDisplay'),
        userBalanceDisplay: document.getElementById('userBalanceDisplay'),
        popupBalanceAmount: document.getElementById('popupBalanceAmount'),
        luckyCatStatus: document.getElementById('luckyCatStatus'),
        leftCard: document.getElementById('leftCard'),
        rightCard: document.getElementById('rightCard'),
        leftRewardAmount: document.getElementById('leftRewardAmount'),
        rightRewardAmount: document.getElementById('rightRewardAmount'),
        leftCatVideo: document.getElementById('leftCatVideo'),
        rightCatVideo: document.getElementById('rightCatVideo'),
        inviteListBody: document.getElementById('inviteListBody'),
        receivedInvitesList: document.getElementById('receivedInvitesList'),
        friendPhoneInput: document.getElementById('friendPhoneInput'),
        sendInviteBtn: document.getElementById('sendInviteBtn'),
        mainTimerDisplay: document.getElementById('mainTimerDisplay'),
        claimNowBtn: document.getElementById('claimNowBtn'),
        prizePopup: document.getElementById('prizePopup'),
        winnerTicker: document.getElementById('winnerTicker'),
        progressFill: document.getElementById('progressFill'),
        statusMessage: document.getElementById('statusMessage'),
        confettiCanvas: document.getElementById('confettiCanvas'),
        winnerText: document.getElementById('winnerText'),
        popupCloseBtn: document.getElementById('popupCloseBtn'),
        backBtn: document.getElementById('backBtn'),
        claimGCashBtn: document.getElementById('claimGCashBtn'),
        facebookShareBtn: document.getElementById('facebookShareBtn'),
        dropdownBtn: document.getElementById('dropdownBtn'),
        dropdownContent: document.getElementById('dropdownContent'),
        firewallPopup: document.getElementById('firewallPopup'),
        firewallCloseBtn: document.getElementById('firewallCloseBtn'),
        verificationCode: document.getElementById('verificationCode'),
        verifyCodeBtn: document.getElementById('verifyCodeBtn'),
        firewallErrorMsg: document.getElementById('firewallErrorMsg')
    };
}

// ========== UTILITY FUNCTIONS ==========

function playPromoSound(soundName) {
    if (PromotionSounds[soundName]) {
        try {
            PromotionSounds[soundName].currentTime = 0;
            PromotionSounds[soundName].play().catch(e => console.log('🔇 Audio:', e));
        } catch(e) {}
    }
}

function formatPhoneNumber(phone) {
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 4) + "***" + phone.substring(7, 11);
}

function animateBalance(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        if (PromoDOM.userBalanceDisplay) PromoDOM.userBalanceDisplay.innerText = val.toFixed(2);
        if (PromoDOM.popupBalanceAmount) PromoDOM.popupBalanceAmount.innerText = val.toFixed(2);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function updatePromotionUI() {
    if (PromoDOM.userBalanceDisplay) PromoDOM.userBalanceDisplay.innerText = PromotionState.balance.toFixed(2);
    if (PromoDOM.popupBalanceAmount) PromoDOM.popupBalanceAmount.innerText = "₱" + PromotionState.balance.toFixed(2);
    
    if (PromoDOM.luckyCatStatus) {
        if (PromotionState.claimed_luckycat) {
            PromoDOM.luckyCatStatus.innerText = "Claimed";
            PromoDOM.luckyCatStatus.classList.add('claimed');
        } else {
            PromoDOM.luckyCatStatus.innerText = "Available";
            PromoDOM.luckyCatStatus.classList.remove('claimed');
        }
    }
    
    if (PromoDOM.leftRewardAmount) {
        if (PromotionState.claimed_luckycat) {
            PromoDOM.leftRewardAmount.innerHTML = 'CLAIMED';
            PromoDOM.leftRewardAmount.style.fontSize = '12px';
            PromoDOM.leftRewardAmount.style.letterSpacing = '2px';
        } else {
            PromoDOM.leftRewardAmount.innerHTML = '₱150';
            PromoDOM.leftRewardAmount.style.fontSize = '';
            PromoDOM.leftRewardAmount.style.letterSpacing = '';
        }
    }
    
    if (PromoDOM.rightRewardAmount) PromoDOM.rightRewardAmount.innerText = "₱150";
    
    if (PromoDOM.leftCard) {
        if (PromotionState.claimed_luckycat) {
            PromoDOM.leftCard.classList.add('prize-card-claimed');
            PromoDOM.leftCard.style.border = '3px solid #ffd700';
            PromoDOM.leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8)';
        } else {
            PromoDOM.leftCard.classList.remove('prize-card-claimed');
            PromoDOM.leftCard.style.border = '';
            PromoDOM.leftCard.style.boxShadow = '';
        }
    }
    
    updateProgressBar();
}

function updateProgressBar() {
    const approvedCount = getApprovedInvitesCount();
    const progressPercent = Math.min((approvedCount / 6) * 100, 100);
    if (PromoDOM.progressFill) PromoDOM.progressFill.style.width = progressPercent + '%';
    
    if (PromoDOM.statusMessage) {
        if (approvedCount >= 6) {
            PromoDOM.statusMessage.innerHTML = '<span class="status-success">🎉 Complete! Maximum invites reached! 🎉</span>';
        } else if (approvedCount > 0) {
            PromoDOM.statusMessage.innerHTML = `<span class="status-progress">📢 ${approvedCount}/6 invites approved.</span>`;
        } else {
            PromoDOM.statusMessage.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
        }
    }
}

// ========== TIMER (3-DAY CYCLE) ==========

function initTimer() {
    try {
        let savedEnd = localStorage.getItem('timerEndDate');
        let now = Date.now();
        
        if (savedEnd && parseInt(savedEnd) > now) {
            timerEndDate = parseInt(savedEnd);
        } else {
            timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
            localStorage.setItem('timerEndDate', timerEndDate);
        }
        
        if (timerInterval) clearInterval(timerInterval);
        
        function updateTimer() {
            let now = Date.now();
            let diff = timerEndDate - now;
            
            if (diff <= 0) {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
                diff = CYCLE_HOURS * 60 * 60 * 1000;
            }
            
            let days = Math.floor(diff / (1000 * 60 * 60 * 24));
            let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            let minutes = Math.floor((diff / (1000 * 60)) % 60);
            let seconds = Math.floor((diff / 1000) % 60);
            
            if (PromoDOM.mainTimerDisplay) {
                PromoDOM.mainTimerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
        
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
        console.log('✅ Timer initialized');
    } catch(e) {
        console.error('Timer error:', e);
    }
}

// ========== INVITATION SYSTEM ==========

function loadDeviceInfo() {
    currentUserFingerprint = localStorage.getItem("userDeviceId");
    currentUserDeviceId = localStorage.getItem("userDeviceDisplayId");
    currentUserPhone = localStorage.getItem("userPhone");
}

function getSentInvitations() {
    const key = `sent_invites_${currentUserPhone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function saveSentInvitations(invites) {
    const key = `sent_invites_${currentUserPhone}`;
    localStorage.setItem(key, JSON.stringify(invites));
}

function getReceivedInvitations() {
    const key = `received_invites_${currentUserPhone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function saveReceivedInvitations(invites) {
    const key = `received_invites_${currentUserPhone}`;
    localStorage.setItem(key, JSON.stringify(invites));
}

function getApprovedInvitesCount() {
    const sent = getSentInvitations();
    return sent.filter(inv => inv.status === 'approved').length;
}

function sendInvitation(friendPhone) {
    let sentInvites = getSentInvitations();
    let pendingCount = sentInvites.filter(inv => inv.status === 'pending').length;
    
    if (sentInvites.some(inv => inv.phone === friendPhone)) {
        alert("Already invited this person!");
        return false;
    }
    
    if (pendingCount >= 3) {
        alert("Maximum 3 pending invites. Delete an invite to send new one.");
        return false;
    }
    
    sentInvites.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now(),
        fromFingerprint: currentUserFingerprint
    });
    
    saveSentInvitations(sentInvites);
    renderSentInvitations();
    playPromoSound('invite');
    alert("Invitation sent successfully!");
    return true;
}

function deleteInvitation(phoneToDelete) {
    let sentInvites = getSentInvitations();
    let invite = sentInvites.find(inv => inv.phone === phoneToDelete);
    
    if (invite && invite.status === 'approved') {
        alert("Cannot delete approved invitation!");
        return false;
    }
    
    if (confirm("Delete this invitation?")) {
        let newInvites = sentInvites.filter(inv => inv.phone !== phoneToDelete);
        saveSentInvitations(newInvites);
        renderSentInvitations();
        return true;
    }
    return false;
}

function renderSentInvitations() {
    if (!PromoDOM.inviteListBody) return;
    
    let invites = getSentInvitations();
    let pendingInvites = invites.filter(inv => inv.status === 'pending');
    
    if (pendingInvites.length === 0) {
        PromoDOM.inviteListBody.innerHTML = '<div class="invite-empty">No invitations sent (0/3)</div>';
        return;
    }
    
    let html = '';
    pendingInvites.forEach(inv => {
        const formattedPhone = formatPhoneNumber(inv.phone);
        html += `
            <div class="invite-item">
                <div class="invite-item-phone">${formattedPhone}</div>
                <div class="invite-item-status">
                    <span class="status-badge pending">PENDING</span>
                </div>
                <div class="invite-item-action">
                    <button class="delete-invite" data-phone="${inv.phone}">✕</button>
                </div>
            </div>
        `;
    });
    
    PromoDOM.inviteListBody.innerHTML = html;
    
    // Attach delete events
    document.querySelectorAll('.delete-invite').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteInvitation(this.dataset.phone);
        });
    });
}

function updateApprovedCount() {
    let approvedCount = getApprovedInvitesCount();
    const countSpan = document.getElementById('invitesCount');
    if (countSpan) {
        countSpan.innerText = `${approvedCount}/6`;
    }
    updateProgressBar();
}

// ========== CLAIM NOW BUTTON & POPUP ==========

function showPrizePopup() {
    console.log('🎁 Showing prize popup');
    if (PromoDOM.prizePopup) {
        playPromoSound('scatter');
        PromoDOM.prizePopup.style.display = 'flex';
        if (PromoDOM.winnerTicker) PromoDOM.winnerTicker.style.display = 'none';
        startConfetti();
    }
}

function closePrizePopup() {
    console.log('🔚 Closing prize popup');
    if (PromoDOM.prizePopup) {
        PromoDOM.prizePopup.style.display = 'none';
        if (PromoDOM.winnerTicker) PromoDOM.winnerTicker.style.display = 'flex';
        stopConfetti();
    }
}

function handleClaimThruGCash() {
    alert("GCash claim feature coming soon!");
}

// ========== LUCKY CAT CARDS ==========

function addToBalance(amount) {
    const oldBalance = PromotionState.balance;
    PromotionState.balance = oldBalance + amount;
    animateBalance(oldBalance, PromotionState.balance, 400);
    if (userRef) userRef.update({ balance: PromotionState.balance, lastUpdate: Date.now() }).catch(e => console.error(e));
    updatePromotionUI();
    playPromoSound('success');
}

function claimLuckyCat() {
    console.log('🐱 Lucky Cat clicked!');
    if (PromotionState.claimed_luckycat) {
        alert("You already claimed the Lucky Cat bonus!");
        return;
    }
    addToBalance(150);
    PromotionState.claimed_luckycat = true;
    
    if (PromoDOM.leftCatVideo) {
        PromoDOM.leftCatVideo.muted = false;
        PromoDOM.leftCatVideo.volume = 0.35;
        PromoDOM.leftCatVideo.play().catch(e => console.log(e));
    }
    
    if (userRef) userRef.update({ claimed_luckycat: true, luckycat_claimed_at: Date.now() }).catch(e => console.error(e));
    updatePromotionUI();
    playPromoSound('claim');
    startConfetti();
    alert("🎉 Congratulations! You received ₱150 bonus!");
}

// ========== CONFETTI ==========

function startConfetti() {
    const canvas = PromoDOM.confettiCanvas;
    if (!canvas) return;
    stopConfetti();
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = [];
    for (let i = 0; i < 100; i++) {
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
            if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
        });
        confettiAnimation = requestAnimationFrame(draw);
    }
    draw();
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(stopConfetti, 3000);
}

function stopConfetti() {
    if (confettiAnimation) cancelAnimationFrame(confettiAnimation);
    const canvas = PromoDOM.confettiCanvas;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
    if (confettiTimeout) clearTimeout(confettiTimeout);
}

// ========== WINNER TICKER ==========

function startWinnerTicker() {
    if (!PromoDOM.winnerText) return;
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
    const amounts = [150, 300, 450, 600, 750, 900, 1050, 1200];
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    PromoDOM.winnerText.innerHTML = generateWinner();
    setInterval(() => { if (PromoDOM.winnerText) PromoDOM.winnerText.innerHTML = generateWinner(); }, 15000);
}

// ========== DROPDOWN ==========

function setupDropdown() {
    try {
        if (!PromoDOM.dropdownBtn || !PromoDOM.dropdownContent) {
            console.error('Dropdown elements not found!');
            return;
        }
        
        // Remove old listener by cloning
        const newDropdownBtn = PromoDOM.dropdownBtn.cloneNode(true);
        PromoDOM.dropdownBtn.parentNode.replaceChild(newDropdownBtn, PromoDOM.dropdownBtn);
        PromoDOM.dropdownBtn = newDropdownBtn;
        
        newDropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔽 Dropdown toggled');
            PromoDOM.dropdownContent.classList.toggle('show');
            const arrow = newDropdownBtn.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.innerHTML = PromoDOM.dropdownContent.classList.contains('show') ? '▲' : '▼';
            }
        });
        
        console.log('✅ Dropdown ready');
    } catch(e) {
        console.error('Dropdown error:', e);
    }
}

// ========== FIREBASE ==========

function loadUserData() {
    if (!userRef) return;
    userRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            PromotionState.balance = data.balance || 0;
            PromotionState.claimed_luckycat = data.claimed_luckycat || false;
        } else {
            PromotionState.balance = 0;
            PromotionState.claimed_luckycat = false;
            userRef.set({ phone: userPhone, balance: 0, claimed_luckycat: false, status: "active", created_at: Date.now() }).catch(e => console.error(e));
        }
        updatePromotionUI();
    }).catch(e => console.error('Load error:', e));
}

function setupBalanceListener() {
    if (!userRef) return;
    if (balanceListener) userRef.child('balance').off('value', balanceListener);
    balanceListener = userRef.child('balance').on('value', (snapshot) => {
        const balance = snapshot.val();
        if (balance !== null && balance !== undefined && balance !== PromotionState.balance) {
            PromotionState.balance = Number(balance);
            updatePromotionUI();
        }
    });
}

function handleFacebookShare() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initFirebase() {
    if (typeof firebaseConfig === 'undefined') {
        console.error('❌ firebaseConfig not found!');
        return false;
    }
    try {
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('🔥 Firebase initialized');
        }
        db = firebase.database();
        return true;
    } catch(e) {
        console.error('🔥 Firebase init error:', e);
        return false;
    }
}

// ========== ATTACH ALL EVENT LISTENERS ==========

function attachAllEventListeners() {
    console.log('🔘 Attaching event listeners...');
    
    // 1. CLAIM NOW BUTTON
    if (PromoDOM.claimNowBtn) {
        const newClaimBtn = PromoDOM.claimNowBtn.cloneNode(true);
        PromoDOM.claimNowBtn.parentNode.replaceChild(newClaimBtn, PromoDOM.claimNowBtn);
        PromoDOM.claimNowBtn = newClaimBtn;
        PromoDOM.claimNowBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎁 Claim Now clicked');
            showPrizePopup();
        });
        console.log('✅ Claim Now button attached');
    } else {
        console.error('Claim Now button not found!');
    }
    
    // 2. SEND INVITE BUTTON
    if (PromoDOM.sendInviteBtn && PromoDOM.friendPhoneInput) {
        const newSendBtn = PromoDOM.sendInviteBtn.cloneNode(true);
        PromoDOM.sendInviteBtn.parentNode.replaceChild(newSendBtn, PromoDOM.sendInviteBtn);
        PromoDOM.sendInviteBtn = newSendBtn;
        
        PromoDOM.sendInviteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📤 Send Invite clicked');
            const friendPhone = PromoDOM.friendPhoneInput?.value.trim();
            if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
                alert("Enter valid 11-digit number starting with 09");
                return;
            }
            if (friendPhone === userPhone) {
                alert("Cannot invite yourself!");
                return;
            }
            sendInvitation(friendPhone);
            if (PromoDOM.friendPhoneInput) PromoDOM.friendPhoneInput.value = '';
        });
        
        PromoDOM.friendPhoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                PromoDOM.sendInviteBtn.click();
            }
        });
        console.log('✅ Send Invite button attached');
    } else {
        console.error('Send Invite button not found!');
    }
    
    // 3. LEFT CARD (Lucky Cat)
    if (PromoDOM.leftCard) {
        const newLeftCard = PromoDOM.leftCard.cloneNode(true);
        PromoDOM.leftCard.parentNode.replaceChild(newLeftCard, PromoDOM.leftCard);
        PromoDOM.leftCard = newLeftCard;
        PromoDOM.leftCard.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🐱 Left Lucky Cat clicked');
            claimLuckyCat();
        });
        console.log('✅ Left Card attached');
    }
    
    // 4. POPUP CLOSE BUTTONS
    if (PromoDOM.popupCloseBtn) {
        const newClose = PromoDOM.popupCloseBtn.cloneNode(true);
        PromoDOM.popupCloseBtn.parentNode.replaceChild(newClose, PromoDOM.popupCloseBtn);
        PromoDOM.popupCloseBtn = newClose;
        PromoDOM.popupCloseBtn.addEventListener('click', closePrizePopup);
        console.log('✅ Popup close attached');
    }
    
    if (PromoDOM.backBtn) {
        const newBack = PromoDOM.backBtn.cloneNode(true);
        PromoDOM.backBtn.parentNode.replaceChild(newBack, PromoDOM.backBtn);
        PromoDOM.backBtn = newBack;
        PromoDOM.backBtn.addEventListener('click', closePrizePopup);
        console.log('✅ Back button attached');
    }
    
    // 5. GCASH BUTTON
    if (PromoDOM.claimGCashBtn) {
        const newGCash = PromoDOM.claimGCashBtn.cloneNode(true);
        PromoDOM.claimGCashBtn.parentNode.replaceChild(newGCash, PromoDOM.claimGCashBtn);
        PromoDOM.claimGCashBtn = newGCash;
        PromoDOM.claimGCashBtn.addEventListener('click', handleClaimThruGCash);
        console.log('✅ GCash button attached');
    }
    
    // 6. FACEBOOK SHARE BUTTON
    if (PromoDOM.facebookShareBtn) {
        const newFB = PromoDOM.facebookShareBtn.cloneNode(true);
        PromoDOM.facebookShareBtn.parentNode.replaceChild(newFB, PromoDOM.facebookShareBtn);
        PromoDOM.facebookShareBtn = newFB;
        PromoDOM.facebookShareBtn.addEventListener('click', handleFacebookShare);
        console.log('✅ Facebook button attached');
    }
    
    // 7. LEFT CARD VIDEO SOUND (once only)
    if (PromoDOM.leftCard && PromoDOM.leftCatVideo) {
        const videoHandler = function() {
            if (PromoDOM.leftCatVideo && PromoDOM.leftCatVideo.muted) {
                PromoDOM.leftCatVideo.muted = false;
                PromoDOM.leftCatVideo.volume = 0.35;
                PromoDOM.leftCatVideo.play().catch(e => console.log(e));
            }
        };
        PromoDOM.leftCard.addEventListener('click', videoHandler, { once: true });
    }
}

// ========== MAIN INITIALIZATION ==========

function initPromotion() {
    console.log('🎁 Promotion System Initializing...');
    
    // Mobile check
    if (!isMobileDevice()) {
        document.body.innerHTML = '<div style="background:#0a0a1a; color:#ffd700; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;"><div><h2>Mobile Only</h2><p>Please use your smartphone.</p></div></div>';
        return;
    }
    
    // Firebase
    if (!initFirebase()) return;
    
    // Get user
    userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        window.location.href = "index.html";
        return;
    }
    
    // Refresh DOM and display
    refreshDOM();
    
    if (PromoDOM.userPhoneDisplay) {
        PromoDOM.userPhoneDisplay.innerText = formatPhoneNumber(userPhone);
    }
    
    // Setup Firebase reference
    userRef = db.ref('user_sessions/' + userPhone);
    
    // Load data
    loadUserData();
    setupBalanceListener();
    
    // Load device info
    loadDeviceInfo();
    
    // Initialize all UI components
    initTimer();
    renderSentInvitations();
    updateApprovedCount();
    startWinnerTicker();
    setupDropdown();
    attachAllEventListeners();  // THIS MAKES EVERYTHING CLICKABLE
    
    console.log('✅ Promotion system ready! All buttons are clickable.');
}

// ========== EXPORT GLOBAL FUNCTIONS ==========
window.closePrizePopup = closePrizePopup;
window.showPrizePopup = showPrizePopup;
window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;
window.handleFacebookShare = handleFacebookShare;
window.handleClaimThruGCash = handleClaimThruGCash;
window.deleteInvitation = deleteInvitation;
window.getCurrentBalance = () => PromotionState.balance;

// ========== START ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromotion);
} else {
    initPromotion();
}
