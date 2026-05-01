/**
 * LUCKY DROP - FULL REMASTERED LOGIC
 * Features: Modular, Session-Aware, Syntax-Safe
 */

// 1. GLOBAL STATE (Ang utak ng app)
const AppState = {
    userPhone: null,
    isClaimed: false,
    timerSeconds: 86400, // Default 24h
    balance: 0.00
};

// 2. SESSION MANAGER (Tagabasa ng Local Storage)
const SessionManager = {
    init() {
        try {
            const savedSession = localStorage.getItem('user_session');
            if (savedSession) {
                AppState.userPhone = savedSession;
                console.log("✅ Session Loaded:", AppState.userPhone);
            } else {
                console.warn("⚠️ No session found.");
                AppState.userPhone = "Guest";
            }
            this.updateDisplay();
        } catch (e) {
            console.error("Session Error:", e);
        }
    },
    updateDisplay() {
        const phoneEl = document.getElementById('userPhoneDisplay');
        if (phoneEl) {
            phoneEl.innerText = AppState.userPhone;
        }
    }
};

// 3. TIMER MANAGER (Independent Countdown)
const TimerManager = {
    init() {
        this.display = document.getElementById('mainTimerDisplay');
        if (!this.display) return;
        this.start();
    },
    start() {
        const update = () => {
            if (AppState.timerSeconds <= 0) return;
            
            AppState.timerSeconds--;
            const d = Math.floor(AppState.timerSeconds / (3600 * 24));
            const h = Math.floor((AppState.timerSeconds % (3600 * 24)) / 3600);
            const m = Math.floor((AppState.timerSeconds % 3600) / 60);
            const s = AppState.timerSeconds % 60;

            this.display.innerText = `${d}D ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        setInterval(update, 1000);
    }
};

// 4. UI MANAGER (Visual Effects & Tickers)
const UIManager = {
    init() {
        this.initDropdown();
        this.initWinnersTicker();
    },
    initDropdown() {
        const btn = document.getElementById('dropdownBtn');
        const content = document.getElementById('dropdownContent');
        if (btn && content) {
            btn.onclick = () => {
                const isOpen = content.classList.contains('active');
                if (isOpen) {
                    content.classList.remove('active');
                    content.style.display = "none";
                } else {
                    content.classList.add('active');
                    content.style.display = "block";
                }
            };
        }
    },
    initWinnersTicker() {
        const text = document.getElementById('winnerText');
        const winners = ["0917***4421", "0905***1182", "0921***9903", "0918***5562"];
        if (!text) return;

        setInterval(() => {
            const randomWinner = winners[Math.floor(Math.random() * winners.length)];
            const randomAmount = (Math.floor(Math.random() * 5) + 1) * 300;
            text.innerHTML = `${randomWinner} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${randomAmount}`;
        }, 5000);
    }
};

// 5. CLAIM MANAGER (Popups & Firebase Trigger)
const ClaimManager = {
    init() {
        const claimBtn = document.getElementById('claimNowBtn');
        const popup = document.getElementById('prizePopup');
        const closeBtns = [document.getElementById('popupCloseBtn'), document.getElementById('backBtn')];

        if (claimBtn && popup) {
            claimBtn.onclick = () => {
                popup.style.display = 'flex';
                document.getElementById('popupBalanceAmount').innerText = "₱150.00";
            };
        }

        closeBtns.forEach(btn => {
            if (btn) btn.onclick = () => popup.style.display = 'none';
        });
    }
};

// 6. FIREBASE MANAGER (Data Handling)
const FirebaseManager = {
    init() {
        if (typeof firebase !== 'undefined') {
            this.db = firebase.database();
            console.log("🔥 Firebase Ready");
        } else {
            console.error("❌ Firebase SDK not found!");
        }
    },
    saveInvite(friendPhone) {
        if (!AppState.userPhone || AppState.userPhone === "Guest") {
            alert("Please login first!");
            return;
        }
        // Logic for Firebase push here
        console.log(`Saving invite from ${AppState.userPhone} to ${friendPhone}`);
    }
};

// 7. THE MASTER INITIALIZER
document.addEventListener('DOMContentLoaded', () => {
    // Sequence is important: Load Session first!
    SessionManager.init();
    
    // Initialize other modules independently
    TimerManager.init();
    UIManager.init();
    ClaimManager.init();
    FirebaseManager.init();

    console.log("🚀 All Systems Online");
});
