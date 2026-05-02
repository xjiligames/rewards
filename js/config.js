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

// ============================================
// SOUND CONFIGURATION
// ============================================
const SOUND_CONFIG = {
    // Sound file paths
    paths: {
        claim: "sounds/claim.wav",      // When claiming reward from Lucky Cat Card
        invite: "sounds/invite.mp3",    // When sending invite to a friend (11-digit number)
        success: "sounds/success.wav"   // When notification appears (new invite received)
    },
    
    // Volume settings (0.0 to 1.0)
    volume: {
        claim: 0.7,
        invite: 0.5,
        success: 0.6
    },
    
    // Preload sounds for faster playback
    preload: true
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

// ============================================
// SOUND MANAGER - Global sound handler
// ============================================
const SoundManager = {
    // Cache for audio objects
    _sounds: {},
    _isEnabled: true,
    
    // Initialize sounds
    init: function() {
        if (!SOUND_CONFIG.preload) return;
        
        // Preload all sounds
        for (const [key, path] of Object.entries(SOUND_CONFIG.paths)) {
            this._sounds[key] = new Audio(path);
            this._sounds[key].volume = SOUND_CONFIG.volume[key] || 0.5;
            this._sounds[key].preload = 'auto';
            
            // Optional: Load the audio
            this._sounds[key].load();
        }
        
        console.log('🔊 Sound Manager initialized');
    },
    
    // Play a sound by key
    play: function(soundKey) {
        if (!this._isEnabled) return;
        
        const sound = this._sounds[soundKey];
        if (sound) {
            // Clone for overlapping sounds (multiple invites at once)
            const soundClone = sound.cloneNode();
            soundClone.volume = sound.volume;
            soundClone.play().catch(e => {
                console.log('Sound play error:', e);
                // Auto-play may be blocked by browser
                this._isEnabled = false;
            });
        } else {
            console.warn(`Sound "${soundKey}" not found`);
        }
    },
    
    // Play claim sound (when claiming reward)
    playClaim: function() {
        this.play('claim');
    },
    
    // Play invite sound (when sending invite)
    playInvite: function() {
        this.play('invite');
    },
    
    // Play success sound (when notification appears)
    playSuccess: function() {
        this.play('success');
    },
    
    // Enable/disable sounds
    setEnabled: function(enabled) {
        this._isEnabled = enabled;
    },
    
    // Check if sounds are enabled
    isEnabled: function() {
        return this._isEnabled;
    },
    
    // Test all sounds (for debugging)
    testAll: function() {
        this.playClaim();
        setTimeout(() => this.playInvite(), 500);
        setTimeout(() => this.playSuccess(), 1000);
    }
};

// Prevent accidental modification
Object.freeze(firebaseConfig);
Object.freeze(TELEGRAM_CONFIG);
Object.freeze(SOUND_CONFIG);
Object.freeze(GAME_CONFIG);
