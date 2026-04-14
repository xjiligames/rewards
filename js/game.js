/**
 * CasinoPlus Game - Main Game Logic
 * Version: 2.1 (Clean separation)
 */

// ========== STRICT MODE ==========
'use strict';

// ========== WAIT FOR CONFIG ==========
// Make sure firebaseConfig is loaded from config.js
if (typeof firebaseConfig === 'undefined') {
    console.error('❌ firebaseConfig not found! Check if config.js is loaded first.');
}

// ========== SOUND CONFIGURATION ==========
const SoundEffects = {
    tap: new Audio('sounds/tap.mp3'),
    multiplier: new Audio('sounds/multiplier.mp3'),
    lvl3: new Audio('sounds/lvl3.mp3'),
    paldo: new Audio('sounds/paldo.mp3'),
    jackpot: new Audio('sounds/jackpot.mp3')
};

// ========== GAME STATE ==========
let GameState = {
    balance: 0,
    clicks: 0,
    canTap: false
};

// ========== GLOBAL VARIABLES ==========
let db = null;
let userRef = null;
let userPhone = null;

// ========== DOM ELEMENTS ==========
const DOM = {
    balanceText: document.getElementById('balanceText'),
    statusLabel: document.getElementById('statusLabel'),
    claimBtn: document.getElementById('claimBtn'),
    processingOverlay: document.getElementById('processingOverlay'),
    winnerEntry: document.getElementById('winnerEntry'),
    cardWrappers: document.querySelectorAll('.card-wrapper'),
    mobileOnly: document.getElementById('mobileOnly')
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Play sound effect with error handling
 */
function playSound(soundName) {
    if (SoundEffects[soundName]) {
        try {
            SoundEffects[soundName].currentTime = 0;
            SoundEffects[soundName].play().catch(e => console.log('🔇 Audio play failed:', e));
        } catch(e) {
            console.log('🔇 Sound error:', e);
        }
    }
}

/**
 * Animate number change (counter effect)
 */
function animateValue(start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        DOM.balanceText.innerText = "₱" + val.toLocaleString() + ".00";
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

/**
 * Save game data to Firebase
 */
function saveData() {
    const disabledIndices = [];
    DOM.cardWrappers.forEach((el, index) => {
        if (el.classList.contains('card-disabled')) disabledIndices.push(index);
    });
    
    if (userRef) {
        userRef.set({
            phone: userPhone,
            balance: GameState.balance,
            clicks: GameState.clicks,
            disabledCards: disabledIndices,
            lastUpdate: new Date().getTime()
        }).catch(e => console.error('💾 Save error:', e));
    }
}

/**
 * Update UI with current balance
 */
function updateUI() {
    DOM.balanceText.innerText = "₱" + GameState.balance.toLocaleString() + ".00";
}

// ========== GAME MECHANICS ==========

/**
 * Get multiplier based on random chance
 */
function getMultiplier() {
    const rand = Math.random() * 100;
    const multipliers = GAME_CONFIG.multipliers;
    
    for (let i = 0; i < multipliers.length; i++) {
        if (rand <= multipliers[i].chance) {
            return multipliers[i];
        }
    }
    return multipliers[multipliers.length - 1];
}

/**
 * Show popup animation on card
 */
function showPopup(element, label, shouldConfetti) {
    const pop = document.createElement('div');
    pop.className = 'mult-pop';
    pop.innerText = label;
    element.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
    
    if (shouldConfetti && typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

/**
 * Get animation class based on card ID
 */
function getAnimationClass(cardId) {
    const animations = ['', 'move-goddess', 'move-monkey', 'move-firegod', 'move-bear', 'move-girl', 'move-boxer'];
    return animations[cardId] || '';
}

/**
 * Handle card tap/click
 */
function handleTap(element, cardId) {
    if (!GameState.canTap || GameState.clicks >= GAME_CONFIG.maxClicks || element.classList.contains('card-disabled')) return;
    
    GameState.clicks++;
    
    // Animate card
    const img = element.querySelector('.card-img');
    const animClass = getAnimationClass(cardId);
    if (animClass) img.classList.add(animClass);
    element.classList.add('card-disabled');
    
    // Get and apply multiplier
    const multiplier = getMultiplier();
    playSound(multiplier.sound);
    showPopup(element, multiplier.label, multiplier.confetti);
    
    // Update balance
    const oldBal = GameState.balance;
    const addAmount = GAME_CONFIG.baseReward * multiplier.mult;
    GameState.balance = Math.round((GameState.balance + addAmount) / 10) * 10;
    animateValue(oldBal, GameState.balance, 400);
    saveData();
    
    // Remove animation class after delay
    setTimeout(() => {
        if (animClass) img.classList.remove(animClass);
    }, 600);
    
    // Check if game complete
    if (GameState.clicks >= GAME_CONFIG.maxClicks) {
        GameState.canTap = false;
        setTimeout(showFinalWithdraw, 1000);
    }
}

// ========== WITHDRAWAL SYSTEM ==========

/**
 * Show withdrawal button after completing all clicks
 */
function showFinalWithdraw() {
    DOM.statusLabel.style.display = 'none';
    DOM.claimBtn.style.display = 'block';
    DOM.claimBtn.innerText = `💸 Withdraw ₱${GameState.balance.toLocaleString()}`;
}

/**
 * Process withdrawal claim
 */
function doClaim() {
    DOM.processingOverlay.style.display = 'flex';
    
    // Send notification to Telegram (using config from config.js)
    if (typeof TELEGRAM_CONFIG !== 'undefined') {
        const message = `💰 NEW CLAIM!\n📱 ${userPhone}\n💵 ₱${GameState.balance}`;
        const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage?chat_id=${TELEGRAM_CONFIG.chatId}&text=${encodeURIComponent(message)}`;
        
        fetch(url).catch(e => console.log('📨 Telegram error:', e));
    }
    
    // Get and redirect to reward link
    if (db) {
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snap) => {
            if (snap.exists()) {
                const key = Object.keys(snap.val())[0];
                const url = snap.val()[key].url;
                db.ref('links/' + key).update({ status: 'claimed', user: userPhone });
                setTimeout(() => window.location.href = url, 2000);
            } else {
                alert("❌ Out of rewards! Try again later.");
                DOM.processingOverlay.style.display = 'none';
            }
        });
    } else {
        alert("❌ Database error. Please try again.");
        DOM.processingOverlay.style.display = 'none';
    }
}

// ========== INITIALIZATION ==========

/**
 * Start a new user with random initial balance
 */
function startNewUser() {
    let startAmt = Math.round((Math.floor(Math.random() * 500) + 300) / 10) * 10;
    animateValue(0, startAmt, 2000);
    setTimeout(() => { 
        GameState.balance = startAmt;
        GameState.canTap = true;
        saveData(); 
        DOM.statusLabel.innerText = "🎁 Initial Reward Granted!"; 
    }, 2000);
}

/**
 * Load existing user data from Firebase
 */
function loadUserData() {
    if (!userRef) return;
    
    userRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            GameState.balance = data.balance || 0;
            GameState.clicks = data.clicks || 0;
            updateUI();
            
            // Restore disabled cards
            if (data.disabledCards && data.disabledCards.length) {
                data.disabledCards.forEach(idx => {
                    if (DOM.cardWrappers[idx]) DOM.cardWrappers[idx].classList.add('card-disabled');
                });
            }
            
            // Check if roulette jackpot was already hit
            if (data.rouletteJackpotLocked === true) {
                window.rouletteJackpotLocked = true;
                console.log('🎰 Roulette jackpot lock loaded from Firebase');
            }
            
            // Check game status
            if (GameState.clicks >= GAME_CONFIG.maxClicks) {
                showFinalWithdraw();
            } else {
                GameState.canTap = true;
                DOM.statusLabel.innerText = "✨ Welcome back! ✨";
            }
        } else {
            startNewUser();
        }
    }).catch(e => {
        console.error('📂 Load error:', e);
        startNewUser();
    });
}

/**
 * Start live winner ticker
 */
function startTickers() {
    setInterval(() => {
        const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966"];
        const rPre = prefixes[Math.floor(Math.random() * prefixes.length)];
        const rSuf = Math.floor(1000 + Math.random() * 9000);
        const amounts = [350, 500, 750, 1000, 1200];
        const amt = amounts[Math.floor(Math.random() * amounts.length)];
        
        if (DOM.winnerEntry) {
            DOM.winnerEntry.innerHTML = `🎲 User ${rPre}***${rSuf} just claimed <img src="images/gc_icon.png" class="gc-mini-icon"> ₱${amt}`;
        }
    }, 3500);
}

/**
 * Attach event listeners to all cards
 */
function attachEventListeners() {
    DOM.cardWrappers.forEach((wrapper, index) => {
        wrapper.addEventListener('click', () => handleTap(wrapper, index + 1));
    });
    
    if (DOM.claimBtn) {
        DOM.claimBtn.addEventListener('click', doClaim);
    }
}

// ========== ROULETTE JACKPOT COMMUNICATION ==========
let rouletteJackpotLocked = false;

// Function to send jackpot status to roulette iframe
window.syncRouletteJackpotStatus = function(isLocked) {
    rouletteJackpotLocked = isLocked;
    const iframe = document.getElementById('rouletteIframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'JACKPOT_STATUS',
            jackpotLocked: isLocked
        }, '*');
        console.log('📡 Jackpot status sent to roulette:', isLocked);
    }
};

// Function to send balance to roulette
window.syncBalanceToRoulette = function() {
    const iframe = document.getElementById('rouletteIframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'BALANCE_SYNC',
            balance: window.getCurrentBalance()
        }, '*');
    }
};

// Listen for messages from roulette iframe
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'ROULETTE_JACKPOT_LOCKED') {
        rouletteJackpotLocked = true;
        console.log('🎰 Roulette jackpot locked received from iframe');
        
        if (userRef) {
            userRef.update({
                rouletteJackpotLocked: true,
                rouletteJackpotDate: Date.now()
            }).catch(e => console.log('Save error:', e));
        }
    }
    
    if (event.data && event.data.type === 'REQUEST_JACKPOT_STATUS') {
        window.syncRouletteJackpotStatus(rouletteJackpotLocked);
    }
    
    if (event.data && event.data.type === 'REQUEST_BALANCE') {
        window.syncBalanceToRoulette();
    }
});

// Load roulette jackpot status from Firebase
window.loadRouletteJackpotStatus = function() {
    if (userRef) {
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.rouletteJackpotLocked === true) {
                rouletteJackpotLocked = true;
                window.syncRouletteJackpotStatus(true);
            }
        });
    }
};

// ========== MAIN INITIALIZATION ==========

/**
 * Main initialization function
 */
function init() {
    console.log('🎮 CasinoPlus Game Initializing...');
    
    // Device check - mobile only
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        if (DOM.mobileOnly) {
            DOM.mobileOnly.style.display = 'flex';
            console.log('📱 Desktop detected - showing mobile only message');
        }
        return;
    }
    
    // Check Firebase config
    if (typeof firebaseConfig === 'undefined') {
        console.error('❌ firebaseConfig not found!');
        if (DOM.statusLabel) DOM.statusLabel.innerText = "⚠️ Config Error";
        return;
    }
    
    // Initialize Firebase
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('🔥 Firebase initialized successfully');
        }
        db = firebase.database();
    } catch(e) {
        console.error('🔥 Firebase init error:', e);
        if (DOM.statusLabel) DOM.statusLabel.innerText = "⚠️ DB Error";
        return;
    }
    
    // Get user from localStorage
    userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        console.log('🔑 No userPhone found, redirecting to index.html');
        window.location.href = "index.html";
        return;
    }
    
    console.log('👤 User:', userPhone);
    
    // Setup Firebase reference
    userRef = db.ref('user_sessions/' + userPhone);
    
    // Load data and start game
    loadUserData();
    startTickers();
    attachEventListeners();
    
    // Load roulette jackpot status
    setTimeout(() => {
        window.loadRouletteJackpotStatus();
    }, 1000);
    
    console.log('✅ Game ready!');
}

// ========== START THE GAME ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
