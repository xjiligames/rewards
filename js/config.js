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

function startMainTimer() {
    const targetDate = new Date("May 15, 2026 23:59:59").getTime();
    const timerDisplay = document.getElementById("mainTimerDisplay");

    if (!timerDisplay) return;

    setInterval(function() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        timerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}
