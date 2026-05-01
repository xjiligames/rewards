/**
 * LUCKY DROP - PROMOTION MASTER SCRIPT
 * Architecture: Modular / Independent Components
 */

// 1. STATE MANAGEMENT (Dito lang nakatabi ang data)
const AppState = {
    userBalance: 0,
    isClaimed: false,
    timerDuration: 86400, // 24 hours in seconds
    isMobileVerified: false
};

// 2. TIMER MODULE (Independent)
const TimerManager = {
    init() {
        this.display = document.getElementById('mainTimerDisplay');
        if (!this.display) return;
        this.start();
    },
    start() {
        let seconds = AppState.timerDuration;
        const tick = () => {
            if (seconds <= 0) return;
            seconds--;
            
            const d = Math.floor(seconds / (3600 * 24));
            const h = Math.floor((seconds % (3600 * 24)) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;

            this.display.innerText = `${d}D ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        setInterval(tick, 1000);
    }
};

// 3. UI & ANIMATION MODULE (Dropdowns, Popups, Tickers)
const UIManager = {
    init() {
        this.setupDropdown();
        this.setupWinnersTicker();
        this.setupPopups();
    },
    setupDropdown() {
        const btn = document.getElementById('dropdownBtn');
        const content = document.getElementById('dropdownContent');
        if (btn && content) {
            btn.addEventListener('click', () => {
                const isActive = content.style.display === 'block';
                content.style.display = isActive ? 'none' : 'block';
                btn.querySelector('.dropdown-arrow').style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        }
    },
    setupWinnersTicker() {
        const tickerText = document.getElementById('winnerText');
        const winners = ["0917***4256", "0921***8842", "0905***1129", "0918***5530"];
        let i = 0;
        setInterval(() => {
            if (!tickerText) return;
            const amount = (Math.floor(Math.random() * 10) + 1) * 200;
            tickerText.innerHTML = `${winners[i]} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount.toLocaleString()}`;
            i = (i + 1) % winners.length;
        }, 4000);
    },
    setupPopups() {
        const closeBtn = document.getElementById('popupCloseBtn');
        const backBtn = document.getElementById('backBtn');
        const popup = document.getElementById('prizePopup');

        [closeBtn, backBtn].forEach(el => {
            if (el) el.addEventListener('click', () => popup.style.display = 'none');
        });
    }
};

// 4. CLAIM & REWARDS MODULE
const ClaimManager = {
    init() {
        const claimBtn = document.getElementById('claimNowBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => this.handleClaim());
        }
    },
    handleClaim() {
        // Ipakita muna ang popup
        const popup = document.getElementById('prizePopup');
        const balanceDisplay = document.getElementById('popupBalanceAmount');
        
        if (popup) {
            popup.style.display = 'flex';
            balanceDisplay.innerText = "₱150.00";
            this.triggerConfetti();
        }
    },
    triggerConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        console.log("Confetti system activated!");
        // Dito mo ilalagay ang confetti library logic mo
    }
};

// 5. FIREBASE MODULE (Backend logic)
const FirebaseManager = {
    init() {
        try {
            // Check if firebase is loaded
            if (typeof firebase !== 'undefined') {
                this.db = firebase.database();
                console.log("Firebase Module Linked.");
            }
        } catch (e) {
            console.error("Firebase Init Error:", e);
        }
    },
    async sendInvite(phoneNumber) {
        // Logic for sending invite to DB
        console.log("Sending invite to:", phoneNumber);
    }
};

// 6. INITIALIZE ALL (Ang saksakan ng lahat)
document.addEventListener('DOMContentLoaded', () => {
    // Tatakbo sila nang sabay-sabay pero hindi sila magkakabit
    TimerManager.init();
    UIManager.init();
    ClaimManager.init();
    FirebaseManager.init();

    console.log("App Remastered: All modules loaded independently.");
});
