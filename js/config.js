// ============================================
// FIREBASE CONFIGURATION
// CasinoPlus - CasinoRewards Database
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a",
    measurementId: "G-F95KC3R7QH"
};

// Telegram Bot Configuration (for payouts)
const TELEGRAM_CONFIG = {
    botToken: "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg",
    chatId: "7298607329"
};

// Game Configuration
const GAME_CONFIG = {
    baseReward: 25,
    maxClicks: 6,
    multipliers: [
        { chance: 10, mult: 10, label: "JACKPOT! 🎰", sound: 'jackpot', confetti: true },
        { chance: 25, mult: 4, label: "x4 SUPER! 🔥", sound: 'paldo', confetti: false },
        { chance: 45, mult: 3, label: "x3 MEGA! ✨", sound: 'lvl3', confetti: false },
        { chance: 70, mult: 2, label: "x2 DOUBLE! 💎", sound: 'multiplier', confetti: false },
        { chance: 100, mult: 1, label: "x1 NICE!", sound: 'tap', confetti: false }
    ]
};

// Prevent accidental modification
Object.freeze(firebaseConfig);
Object.freeze(TELEGRAM_CONFIG);
Object.freeze(GAME_CONFIG);


// ========== MOBILE ONLY SECURITY - CASINO THEME ==========
(function() {
    'use strict';
    
    function isGenuineMobileDevice() {
        // Check user agent
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
        
        // Check screen size
        const isSmallScreen = window.innerWidth <= 768;
        
        // Check touch support
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Check device pixel ratio
        const isHighDPI = window.devicePixelRatio > 1;
        
        // Check orientation
        const hasOrientation = typeof window.orientation !== 'undefined';
        
        // For desktop browsers na nagpapanggap na mobile
        const isDesktopUA = /Windows|Mac|Linux|Ubuntu|Chrome OS/i.test(ua) && !/Mobile|Android/i.test(ua);
        
        // Check if it's desktop Chrome DevTools mobile emulation
        const isDevToolsMobile = navigator.platform === 'MacIntel' && hasTouch && !isMobileUA;
        
        // TRUE only if it's a genuine mobile device
        const isGenuineMobile = (isMobileUA || (isSmallScreen && hasTouch)) && !isDesktopUA && !isDevToolsMobile;
        
        console.log('🔒 Device Check:', {
            isMobileUA: isMobileUA,
            isSmallScreen: isSmallScreen,
            hasTouch: hasTouch,
            isDesktopUA: isDesktopUA,
            isDevToolsMobile: isDevToolsMobile,
            isGenuineMobile: isGenuineMobile
        });
        
        return isGenuineMobile;
    }
    
    function showMobileRestrictedScreen() {
        // Create overlay if not exists
        if (document.getElementById('mobileRestrictedOverlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'mobileRestrictedOverlay';
        overlay.className = 'mobile-restricted-overlay';
        overlay.innerHTML = `
            <div class="mobile-restricted-card">
                <div class="mobile-restricted-icon">
                    🎰 🎲 🎰
                </div>
                <div class="mobile-restricted-title">
                    LUCKY DROP!
                </div>
                <div class="mobile-restricted-subtitle">
                    MOBILE EXCLUSIVE
                </div>
                <div class="mobile-restricted-message">
                    ⚠️ <strong>ACCESS RESTRICTED</strong> ⚠️<br><br>
                    This casino rewards platform is<br>
                    <strong>EXCLUSIVELY for Mobile Devices Only!</strong><br><br>
                    🎁 <strong>Switch to your Mobile Phone</strong> 🎁<br>
                    to unlock your rewards and claim bonuses!
                </div>
                <div class="mobile-restricted-reward">
                    <span>₱1,500</span>
                    <small>Welcome Bonus Waiting!</small>
                </div>
                <button class="mobile-restricted-button" onclick="location.reload()">
                    🔄 REFRESH & CHECK
                </button>
                <div class="mobile-restricted-footer">
                    🎰 CasinoPlus Rewards • Mobile Verified Only 🎰
                </div>
            </div>
        `;
        
        // Add CSS if not already added
        if (!document.getElementById('mobileRestrictedStyles')) {
            const styles = document.createElement('style');
            styles.id = 'mobileRestrictedStyles';
            styles.textContent = `
                .mobile-restricted-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    font-family: 'Orbitron', monospace;
                    animation: casinoGlow 2s ease-in-out infinite;
                }
                .mobile-restricted-card {
                    background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
                    border: 2px solid #ffd700;
                    border-radius: 40px;
                    padding: 40px 30px;
                    text-align: center;
                    max-width: 380px;
                    width: 90%;
                    box-shadow: 0 0 50px rgba(255,215,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
                    animation: cardPulse 2s ease-in-out infinite;
                }
                .mobile-restricted-icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    animation: iconRotate 3s linear infinite;
                }
                .mobile-restricted-title {
                    font-size: 28px;
                    font-weight: 900;
                    background: linear-gradient(135deg, #ffd700, #ffaa33, #ffd700);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    letter-spacing: 3px;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                }
                .mobile-restricted-subtitle {
                    font-size: 14px;
                    color: #ffaa33;
                    letter-spacing: 2px;
                    margin-bottom: 25px;
                    border-top: 1px dashed rgba(255,215,0,0.3);
                    border-bottom: 1px dashed rgba(255,215,0,0.3);
                    padding: 10px 0;
                    display: inline-block;
                }
                .mobile-restricted-message {
                    font-size: 13px;
                    color: #ffffff;
                    line-height: 1.6;
                    margin: 20px 0;
                    background: rgba(0,0,0,0.5);
                    padding: 15px;
                    border-radius: 20px;
                }
                .mobile-restricted-message strong {
                    color: #ffd700;
                    font-size: 16px;
                }
                .mobile-restricted-reward {
                    background: linear-gradient(135deg, #ffd70020, #ffaa3310);
                    border: 1px solid #ffd700;
                    border-radius: 30px;
                    padding: 12px;
                    margin: 15px 0;
                }
                .mobile-restricted-reward span {
                    font-size: 24px;
                    font-weight: bold;
                    color: #ffd700;
                    display: block;
                }
                .mobile-restricted-reward small {
                    font-size: 10px;
                    color: #ffaa33;
                }
                .mobile-restricted-button {
                    background: linear-gradient(135deg, #ffd700, #ffaa33);
                    border: none;
                    border-radius: 50px;
                    padding: 12px 25px;
                    font-family: 'Orbitron', monospace;
                    font-weight: bold;
                    font-size: 14px;
                    color: #1a1a2e;
                    cursor: pointer;
                    margin-top: 20px;
                    transition: all 0.3s ease;
                    box-shadow: 0 0 15px rgba(255,215,0,0.5);
                }
                .mobile-restricted-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 25px rgba(255,215,0,0.8);
                }
                .mobile-restricted-footer {
                    margin-top: 25px;
                    font-size: 10px;
                    color: #666;
                    letter-spacing: 1px;
                }
                @keyframes casinoGlow {
                    0% { background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%); }
                    50% { background: linear-gradient(135deg, #0f0f2a 0%, #2a1040 50%, #0f0f2a 100%); }
                    100% { background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%); }
                }
                @keyframes cardPulse {
                    0% { box-shadow: 0 0 30px rgba(255,215,0,0.2); border-color: #ffd700; }
                    50% { box-shadow: 0 0 60px rgba(255,215,0,0.5); border-color: #ffed4a; }
                    100% { box-shadow: 0 0 30px rgba(255,215,0,0.2); border-color: #ffd700; }
                }
                @keyframes iconRotate {
                    0% { transform: rotate(0deg); filter: drop-shadow(0 0 5px #ffd700); }
                    50% { transform: rotate(10deg); filter: drop-shadow(0 0 20px #ffd700); }
                    100% { transform: rotate(0deg); filter: drop-shadow(0 0 5px #ffd700); }
                }
                .dice-icon {
                    display: inline-block;
                    animation: diceRoll 0.5s ease-out;
                }
                @keyframes diceRoll {
                    0% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.2); }
                    100% { transform: rotate(360deg) scale(1); }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(overlay);
        
        // Hide main content
        const mainContent = document.querySelector('.share-container');
        const ticker = document.querySelector('.live-winners-ticker');
        if (mainContent) mainContent.style.opacity = '0.3';
        if (ticker) ticker.style.opacity = '0.3';
        
        // Add dice rolling effect on button click
        const button = overlay.querySelector('.mobile-restricted-button');
        if (button) {
            button.addEventListener('click', function(e) {
                const icon = overlay.querySelector('.mobile-restricted-icon');
                if (icon) {
                    icon.classList.add('dice-icon');
                    setTimeout(() => {
                        icon.classList.remove('dice-icon');
                    }, 500);
                }
            });
        }
    }
    
    // Execute security check immediately
    if (!isGenuineMobileDevice()) {
        showMobileRestrictedScreen();
        console.log('🔒 Mobile restriction activated - Desktop/Emulator detected');
    } else {
        console.log('✅ Genuine mobile device detected - Access granted');
    }
    
    // Optional: Re-check on resize (for orientation change)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (!isGenuineMobileDevice()) {
                if (!document.getElementById('mobileRestrictedOverlay')) {
                    showMobileRestrictedScreen();
                }
            }
        }, 500);
    });
})();

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a",
    measurementId: "G-F95KC3R7QH"
};

// ========== SOUND EFFECTS CONFIGURATION ==========
window.SoundEffects = {
    // Sound objects
    claim: null,
    success: null,
    invite: null,
    
    // Initialize sounds
    init: function() {
        this.claim = new Audio('sounds/claim.wav');
        this.success = new Audio('sounds/success.wav');
        this.invite = new Audio('sounds/invite.mp3');
        
        // Set volume (0.0 to 1.0)
        this.claim.volume = 0.6;
        this.success.volume = 0.5;
        this.invite.volume = 0.5;
        
        // Preload sounds
        this.claim.load();
        this.success.load();
        this.invite.load();
        
        console.log('🔊 Sound effects initialized');
    },
    
    // Play claim sound (when clicking Lucky Cat Right)
    playClaim: function() {
        if (this.claim) {
            this.claim.currentTime = 0;
            this.claim.play().catch(e => console.log('🔇 Sound error:', e));
        }
    },
    
    // Play success sound (when balance increments / earnings increase)
    playSuccess: function() {
        if (this.success) {
            this.success.currentTime = 0;
            this.success.play().catch(e => console.log('🔇 Sound error:', e));
        }
    },
    
    // Play invite sound (when sending invite)
    playInvite: function() {
        if (this.invite) {
            this.invite.currentTime = 0;
            this.invite.play().catch(e => console.log('🔇 Sound error:', e));
        }
    },
    
    // Stop all sounds
    stopAll: function() {
        if (this.claim) this.claim.pause();
        if (this.success) this.success.pause();
        if (this.invite) this.invite.pause();
    }
};

// Auto-initialize sounds when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.SoundEffects.init();
});
