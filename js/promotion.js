/**
 * CasinoPlus Promotion & Invitation System
 * Version: 5.0 (Complete with 3-Day Cycle Timer)
 */

// ========== STRICT MODE ==========
'use strict';

// ========== WAIT FOR CONFIG ==========
if (typeof firebaseConfig === 'undefined') {
    console.error('❌ firebaseConfig not found! Check if config.js is loaded first.');
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
const CYCLE_HOURS = 72; // 3 days

// ========== DOM ELEMENTS ==========
const PromoDOM = {
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
    
    // Update left card reward amount and styles
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
    
    // Update left card border and shadow
    if (PromoDOM.leftCard) {
        if (PromotionState.claimed_luckycat) {
            PromoDOM.leftCard.classList.add('prize-card-claimed');
            PromoDOM.leftCard.style.border = '3px solid #ffd700';
            PromoDOM.leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), inset 0 0 10px rgba(255,215,0,0.3)';
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
            PromoDOM.statusMessage.innerHTML = `<span class="status-progress">📢 ${approvedCount}/6 invites approved. Invite ${6 - approvedCount} more!</span>`;
        } else {
            PromoDOM.statusMessage.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
        }
    }
}

// ========== 3-DAY CYCLE TIMER WITH ANIMATION ==========
// ========== SIMPLE 3-DAY TIMER ==========
const CYCLE_HOURS = 72; // 3 days
let timerEndDate = null;

function initTimer() {
    let savedEnd = localStorage.getItem('timerEndDate');
    let now = Date.now();
    
    if (savedEnd && parseInt(savedEnd) > now) {
        timerEndDate = parseInt(savedEnd);
    } else {
        timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
        localStorage.setItem('timerEndDate', timerEndDate);
    }
    startTimerLoop();
}

function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    
    function updateTimer() {
        let now = Date.now();
        let diff = timerEndDate - now;
        
        if (diff <= 0) {
            timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
            localStorage.setItem('timerEndDate', timerEndDate);
            diff = CYCLE_HOURS * 60 * 60 * 1000;
        }
        
        // Calculate days, hours, minutes, seconds
        let days = Math.floor(diff / (1000 * 60 * 60 * 24));
        let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        let minutes = Math.floor((diff / (1000 * 60)) % 60);
        let seconds = Math.floor((diff / 1000) % 60);
        
        let timerDisplay = PromoDOM.mainTimerDisplay;
        if (timerDisplay) {
            timerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// ========== INVITATION SYSTEM ==========

function loadDeviceInfo() {
    currentUserFingerprint = localStorage.getItem("userDeviceId");
    currentUserDeviceId = localStorage.getItem("userDeviceDisplayId");
    currentUserPhone = localStorage.getItem("userPhone");
    console.log("Device Info:", { fingerprint: currentUserFingerprint, deviceId: currentUserDeviceId, phone: currentUserPhone });
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

function getReceivedInvitationsByPhone(phone) {
    const key = `received_invites_${phone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function saveReceivedInvitationsByPhone(phone, invites) {
    const key = `received_invites_${phone}`;
    localStorage.setItem(key, JSON.stringify(invites));
}

function getSentInvitationsByPhone(phone) {
    const key = `sent_invites_${phone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function saveSentInvitationsByPhone(phone, invites) {
    const key = `sent_invites_${phone}`;
    localStorage.setItem(key, JSON.stringify(invites));
}

function triggerCheaterAlert() {
    alert("⚠️ Oppps Oppps Last Warning Cheater! ⚠️");
    console.warn("CHEAT DETECTED: Same device fingerprint!");
    
    const cheaters = JSON.parse(localStorage.getItem("cheaters_log") || "[]");
    cheaters.push({
        phone: currentUserPhone,
        fingerprint: currentUserFingerprint,
        timestamp: Date.now()
    });
    localStorage.setItem("cheaters_log", JSON.stringify(cheaters));
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
    
    if (currentUserFingerprint) {
        sentInvites.push({
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now(),
            fromFingerprint: currentUserFingerprint,
            fromDeviceId: currentUserDeviceId
        });
        
        saveSentInvitations(sentInvites);
        
        let receivedInvites = getReceivedInvitationsByPhone(friendPhone);
        receivedInvites.push({
            fromPhone: currentUserPhone,
            fromFingerprint: currentUserFingerprint,
            status: 'pending',
            timestamp: Date.now()
        });
        saveReceivedInvitationsByPhone(friendPhone, receivedInvites);
        
        renderSentInvitations();
        playPromoSound('invite');
        alert("Invitation sent successfully!");
        return true;
    }
    return false;
}

function deleteInvitation(phoneToDelete) {
    let sentInvites = getSentInvitations();
    let invite = sentInvites.find(inv => inv.phone === phoneToDelete);
    
    if (invite && invite.status === 'approved') {
        alert("Cannot delete approved invitation!");
        return false;
    }
    
    if (confirm("Delete this invitation? You can invite someone else.")) {
        let newInvites = sentInvites.filter(inv => inv.phone !== phoneToDelete);
        saveSentInvitations(newInvites);
        renderSentInvitations();
        return true;
    }
    return false;
}

function renderSentInvitations() {
    const container = PromoDOM.inviteListBody;
    if (!container) return;
    
    let invites = getSentInvitations();
    let pendingInvites = invites.filter(inv => inv.status === 'pending');
    
    if (pendingInvites.length === 0) {
        container.innerHTML = '<div class="invite-empty">No invitations sent (0/3)</div>';
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
                    <button class="delete-invite" onclick="window.deleteInvitation('${inv.phone}')">✕</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderReceivedInvitations() {
    const container = PromoDOM.receivedInvitesList;
    if (!container) return;
    
    let received = getReceivedInvitations();
    let pendingReceived = received.filter(inv => inv.status === 'pending');
    
    if (pendingReceived.length === 0) {
        container.innerHTML = '<div class="invite-empty">No invitations received</div>';
        return;
    }
    
    let html = '';
    pendingReceived.forEach(inv => {
        const formattedPhone = formatPhoneNumber(inv.fromPhone);
        html += `
            <div class="invite-item">
                <div class="invite-item-phone">${formattedPhone}</div>
                <div class="invite-item-status">
                    <span class="status-badge pending">PENDING</span>
                </div>
                <div class="invite-item-action">
                    <button class="accept-invite" onclick="window.acceptInvitation('${inv.fromPhone}')">✓ ACCEPT</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function applyNeonGoldToRightCard() {
    const rightCard = PromoDOM.rightCard;
    const rightReward = PromoDOM.rightRewardAmount;
    
    if (rightCard) {
        rightCard.classList.add('prize-card-claimed');
        rightCard.style.border = '3px solid #ffd700';
        rightCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8)';
        rightCard.style.animation = 'neonGoldPulse 1.5s infinite';
    }
    
    if (rightReward) {
        rightReward.innerHTML = 'CLAIMED';
        rightReward.style.fontSize = '12px';
        rightReward.style.letterSpacing = '2px';
    }
    
    playPromoSound('success');
    startConfetti();
    
    setTimeout(() => {
        if (rightReward && rightReward.innerHTML === 'CLAIMED') {
            rightReward.innerHTML = '₱150';
            rightReward.style.fontSize = '';
            rightReward.style.letterSpacing = '';
        }
        if (rightCard) {
            rightCard.classList.remove('prize-card-claimed');
            rightCard.style.border = '';
            rightCard.style.boxShadow = '';
            rightCard.style.animation = '';
        }
    }, 3000);
}

function acceptInvitation(fromPhone) {
    let received = getReceivedInvitations();
    let invite = received.find(inv => inv.fromPhone === fromPhone);
    
    if (!invite || invite.status !== 'pending') {
        alert("Invitation not found or already processed!");
        return false;
    }
    
    if (fromPhone === currentUserPhone) {
        triggerCheaterAlert();
        return false;
    }
    
    if (invite.fromFingerprint === currentUserFingerprint) {
        triggerCheaterAlert();
        return false;
    }
    
    invite.status = 'approved';
    saveReceivedInvitations(received);
    
    let senderInvites = getSentInvitationsByPhone(fromPhone);
    let senderInvite = senderInvites.find(inv => inv.phone === currentUserPhone);
    if (senderInvite) {
        senderInvite.status = 'approved';
        saveSentInvitationsByPhone(fromPhone, senderInvites);
    }
    
    addToBalance(150);
    applyNeonGoldToRightCard();
    updateApprovedCount();
    
    alert(`✅ You accepted ${formatPhoneNumber(fromPhone)}'s invitation! +₱150 added to your balance!`);
    
    renderReceivedInvitations();
    return true;
}

function updateApprovedCount() {
    let approvedCount = getApprovedInvitesCount();
    
    const countSpan = document.getElementById('invitesCount');
    if (countSpan) {
        countSpan.innerText = `${approvedCount}/6`;
    }
    
    updateProgressBar();
}

function setupSendInvite() {
    const sendBtn = PromoDOM.sendInviteBtn;
    const friendInput = PromoDOM.friendPhoneInput;
    
    if (sendBtn) {
        sendBtn.onclick = function() {
            const friendPhone = friendInput?.value.trim();
            if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
                alert("Enter valid 11-digit number starting with 09");
                return;
            }
            if (friendPhone === currentUserPhone) {
                alert("Cannot invite yourself!");
                return;
            }
            sendInvitation(friendPhone);
            if (friendInput) friendInput.value = '';
        };
    }
    
    if (friendInput) {
        friendInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendBtn?.click();
        });
    }
}

function setupRightCardInviteHandler() {
    const rightCard = PromoDOM.rightCard;
    if (!rightCard) return;
    
    rightCard.removeEventListener('click', handleRightCardClick);
    rightCard.addEventListener('click', handleRightCardClick);
}

function handleRightCardClick() {
    let received = getReceivedInvitations();
    let pendingInvites = received.filter(inv => inv.status === 'pending');
    
    if (pendingInvites.length === 0) {
        alert("No pending invitations to accept!");
        return;
    }
    
    let message = "Select invitation to accept:\n\n";
    pendingInvites.forEach((inv, index) => {
        message += `${index + 1}. ${formatPhoneNumber(inv.fromPhone)}\n`;
    });
    
    let choice = prompt(message + "\n\nEnter number (1-" + pendingInvites.length + "):");
    if (choice && !isNaN(choice)) {
        let index = parseInt(choice) - 1;
        if (index >= 0 && index < pendingInvites.length) {
            acceptInvitation(pendingInvites[index].fromPhone);
        }
    }
}

function initInvitationSystem() {
    loadDeviceInfo();
    setupSendInvite();
    setupRightCardInviteHandler();
    renderSentInvitations();
    renderReceivedInvitations();
    updateApprovedCount();
    
    setInterval(() => {
        renderSentInvitations();
        renderReceivedInvitations();
        updateApprovedCount();
    }, 3000);
}

// ========== BALANCE MANAGEMENT ==========

function addToBalance(amount) {
    const oldBalance = PromotionState.balance;
    PromotionState.balance = oldBalance + amount;
    animateBalance(oldBalance, PromotionState.balance, 400);
    if (userRef) userRef.update({ balance: PromotionState.balance, lastUpdate: Date.now() }).catch(e => console.error(e));
    updatePromotionUI();
    playPromoSound('success');
}

function claimLuckyCat() {
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

// ========== POPUP FUNCTIONS ==========

function showPrizePopup() {
    if (PromoDOM.prizePopup) {
        playPromoSound('scatter');
        PromoDOM.prizePopup.style.display = 'flex';
        if (PromoDOM.winnerTicker) PromoDOM.winnerTicker.style.display = 'none';
        startConfetti();
    }
}

function closePrizePopup() {
    if (PromoDOM.prizePopup) {
        PromoDOM.prizePopup.style.display = 'none';
        if (PromoDOM.winnerTicker) PromoDOM.winnerTicker.style.display = 'flex';
        stopConfetti();
    }
}

// ========== CONFETTI FUNCTIONS ==========

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

// ========== DROPDOWN FUNCTION ==========
function setupDropdown() {
    if (!PromoDOM.dropdownBtn || !PromoDOM.dropdownContent) return;
    
    PromoDOM.dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        PromoDOM.dropdownContent.classList.toggle('show');
        const arrow = PromoDOM.dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) arrow.innerHTML = PromoDOM.dropdownContent.classList.contains('show') ? '▲' : '▼';
    });
    
    document.addEventListener('click', function(e) {
        if (!PromoDOM.dropdownBtn.contains(e.target) && !PromoDOM.dropdownContent.contains(e.target)) {
            PromoDOM.dropdownContent.classList.remove('show');
            const arrow = PromoDOM.dropdownBtn.querySelector('.dropdown-arrow');
            if (arrow) arrow.innerHTML = '▼';
        }
    });
}

// ========== FIREBASE CONNECTION ==========

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

// ========== FACEBOOK & GCASH ==========
function handleFacebookShare() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
}

function handleClaimThruGCash() {
    alert("GCash claim feature coming soon!");
}

// ========== FIREWALL VERIFICATION ==========
function showFirewallPopup() {
    if (PromoDOM.firewallPopup) PromoDOM.firewallPopup.style.display = 'flex';
}

function hideFirewallPopup() {
    if (PromoDOM.firewallPopup) PromoDOM.firewallPopup.style.display = 'none';
    if (PromoDOM.firewallErrorMsg) PromoDOM.firewallErrorMsg.style.display = 'none';
}

function verifyFirewallCode() {
    const code = PromoDOM.verificationCode?.value.trim();
    if (!code || code.length !== 4) {
        if (PromoDOM.firewallErrorMsg) {
            PromoDOM.firewallErrorMsg.innerText = "Please enter valid 4-digit code";
            PromoDOM.firewallErrorMsg.style.display = 'block';
        }
        return;
    }
    hideFirewallPopup();
    alert("Verification successful!");
}

// ========== MOBILE CHECK ==========
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function checkMobileDevice() {
    if (!isMobileDevice()) {
        document.body.innerHTML = '<div style="background:#0a0a1a; color:#ffd700; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;"><div><h2>Mobile Only</h2><p>Please use your smartphone.</p></div></div>';
        return false;
    }
    return true;
}

// ========== ATTACH EVENT LISTENERS ==========
function attachEventListeners() {
    if (PromoDOM.leftCard) {
        PromoDOM.leftCard.removeEventListener('click', claimLuckyCat);
        PromoDOM.leftCard.addEventListener('click', claimLuckyCat);
    }
    
    if (PromoDOM.claimNowBtn) {
        PromoDOM.claimNowBtn.removeEventListener('click', showPrizePopup);
        PromoDOM.claimNowBtn.addEventListener('click', showPrizePopup);
    }
    
    if (PromoDOM.popupCloseBtn) {
        PromoDOM.popupCloseBtn.removeEventListener('click', closePrizePopup);
        PromoDOM.popupCloseBtn.addEventListener('click', closePrizePopup);
    }
    
    if (PromoDOM.backBtn) {
        PromoDOM.backBtn.removeEventListener('click', closePrizePopup);
        PromoDOM.backBtn.addEventListener('click', closePrizePopup);
    }
    
    if (PromoDOM.claimGCashBtn) {
        PromoDOM.claimGCashBtn.removeEventListener('click', handleClaimThruGCash);
        PromoDOM.claimGCashBtn.addEventListener('click', handleClaimThruGCash);
    }
    
    if (PromoDOM.facebookShareBtn) {
        PromoDOM.facebookShareBtn.removeEventListener('click', handleFacebookShare);
        PromoDOM.facebookShareBtn.addEventListener('click', handleFacebookShare);
    }
    
    if (PromoDOM.firewallCloseBtn) {
        PromoDOM.firewallCloseBtn.removeEventListener('click', hideFirewallPopup);
        PromoDOM.firewallCloseBtn.addEventListener('click', hideFirewallPopup);
    }
    
    if (PromoDOM.verifyCodeBtn) {
        PromoDOM.verifyCodeBtn.removeEventListener('click', verifyFirewallCode);
        PromoDOM.verifyCodeBtn.addEventListener('click', verifyFirewallCode);
    }
    
    // Left card video sound on first click only
    if (PromoDOM.leftCard && PromoDOM.leftCatVideo) {
        const videoClickHandler = function() {
            if (PromoDOM.leftCatVideo && PromoDOM.leftCatVideo.muted) {
                PromoDOM.leftCatVideo.muted = false;
                PromoDOM.leftCatVideo.volume = 0.35;
                PromoDOM.leftCatVideo.play().catch(error => console.log("Playback failed:", error));
            }
        };
        PromoDOM.leftCard.removeEventListener('click', videoClickHandler);
        PromoDOM.leftCard.addEventListener('click', videoClickHandler, { once: true });
    }
}

// ========== FIREBASE INITIALIZATION ==========

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

// ========== MAIN INITIALIZATION ==========

function initPromotion() {
    console.log('🎁 Promotion System Initializing...');
    
    if (!checkMobileDevice()) return;
    if (!initFirebase()) return;
    
    userPhone = localStorage.getItem("userPhone");
    
    if (!userPhone) {
        console.log('🔑 No userPhone, redirecting to index.html');
        window.location.href = "index.html";
        return;
    }
    
    if (userPhone.length !== 11 || !userPhone.startsWith('09')) {
        console.log('🔑 Invalid phone format, redirecting');
        localStorage.removeItem("userPhone");
        window.location.href = "index.html";
        return;
    }
    
    console.log('👤 User:', formatPhoneNumber(userPhone));
    
    if (PromoDOM.userPhoneDisplay) {
        PromoDOM.userPhoneDisplay.innerText = formatPhoneNumber(userPhone);
    }
    
    userRef = db.ref('user_sessions/' + userPhone);
    
    loadUserData();
    setupBalanceListener();
    attachEventListeners();
    setupDropdown();
    initTimer(); // 3-day cycle timer
    startWinnerTicker();
    initInvitationSystem();
    
    console.log('✅ Promotion system ready!');
}

// ========== EXPORT GLOBAL FUNCTIONS ==========
window.closePrizePopup = closePrizePopup;
window.showPrizePopup = showPrizePopup;
window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;
window.handleFacebookShare = handleFacebookShare;
window.handleClaimThruGCash = handleClaimThruGCash;
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.deleteInvitation = deleteInvitation;
window.acceptInvitation = acceptInvitation;
window.getCurrentBalance = () => PromotionState.balance;
window.updateUserBalance = (newBalance) => {
    PromotionState.balance = newBalance;
    updatePromotionUI();
    if (userRef) userRef.update({ balance: newBalance }).catch(e => console.error(e));
};

// ========== START THE PROMOTION SYSTEM ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromotion);
} else {
    initPromotion();
}
