/**
 * LUCKY DROP - CONSOLIDATED MASTER SCRIPT (V1.0)
 * Lahat ng modules ay independent. 
 * Siguraduhin na ang Firebase SDK ay naka-load sa HTML bago ito.
 */

// 1. GLOBAL STATE - Ang "Utak" na nagtatago ng data habang naka-open ang page.
const AppState = {
    userPhone: null,
    balance: 0.00,
    timerSeconds: 86400,
};

// 2. SESSION MANAGER - Kumukuha ng number mula sa index (Local Storage)
const SessionManager = {
    init() {
        try {
            // Kinukuha ang 'user_session' na sinave mo mula sa index.html
            const savedSession = localStorage.getItem('user_session');
            
            if (savedSession && savedSession.trim() !== "") {
                AppState.userPhone = savedSession;
                console.log("✅ Session Active:", AppState.userPhone);
            } else {
                console.warn("⚠️ No Session Found. User is Guest.");
                AppState.userPhone = "Guest";
                // window.location.href = 'index.html'; // Opsyonal: Ibalik sa login kung kailangan
            }
            this.updateDisplay();
        } catch (e) {
            console.error("Session Error:", e);
        }
    },
    updateDisplay() {
        const phoneEl = document.getElementById('userPhoneDisplay');
        if (phoneEl) {
            // Masking: Gagawing 0917***1234 ang itsura
            const p = AppState.userPhone;
            phoneEl.innerText = (p === "Guest") ? "Guest User" : 
                (p.length > 7 ? `${p.substring(0, 4)}***${p.slice(-4)}` : p);
        }
    }
};

// 3. FIREBASE MANAGER - Lahat ng koneksyon sa Database
const FirebaseManager = {
    db: null,
    userRef: null,

    init() {
        if (typeof firebase !== 'undefined') {
            this.db = firebase.database();
            
            if (AppState.userPhone && AppState.userPhone !== "Guest") {
                // Nakatutok ang database sa phone number ng user
                this.userRef = this.db.ref('users/' + AppState.userPhone);
                this.syncData();
            }
        } else {
            console.error("❌ Firebase SDK not detected!");
        }
    },

    syncData() {
        // LIVE BALANCE: Kapag binago mo sa Firebase, magbabago sa screen kusa.
        this.userRef.child('balance').on('value', (snap) => {
            AppState.balance = snap.val() || 0;
            const balEl = document.getElementById('userBalanceDisplay');
            if (balEl) balEl.innerText = AppState.balance.toLocaleString();
        });
    },

    async pushInvite(targetPhone) {
        if (AppState.userPhone === "Guest") return alert("Please login first!");
        
        const inviteData = {
            friend: targetPhone,
            status: "pending",
            timestamp: Date.now()
        };

        return this.userRef.child('invites').push(inviteData);
    }
};

// 4. TIMER MANAGER - Para sa countdown logic
const TimerManager = {
    init() {
        this.display = document.getElementById('mainTimerDisplay');
        if (this.display) this.start();
    },
    start() {
        setInterval(() => {
            if (AppState.timerSeconds <= 0) return;
            AppState.timerSeconds--;
            
            const h = Math.floor(AppState.timerSeconds / 3600);
            const m = Math.floor((AppState.timerSeconds % 3600) / 60);
            const s = AppState.timerSeconds % 60;

            this.display.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }, 1000);
    }
};

// 5. UI MANAGER - Dropdowns, Popups, at Click events
const UIManager = {
    init() {
        this.bindEvents();
        this.startTicker();
    },
    bindEvents() {
        // Dropdown Logic
        const dropBtn = document.getElementById('dropdownBtn');
        const dropContent = document.getElementById('dropdownContent');
        if (dropBtn && dropContent) {
            dropBtn.onclick = () => {
                const isHidden = dropContent.style.display === 'none' || dropContent.style.display === '';
                dropContent.style.display = isHidden ? 'block' : 'none';
                dropBtn.querySelector('.dropdown-arrow').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            };
        }

        // Claim Button
        const claimBtn = document.getElementById('claimNowBtn');
        const popup = document.getElementById('prizePopup');
        if (claimBtn && popup) {
            claimBtn.onclick = () => popup.style.display = 'flex';
        }

        // Close Popups
        document.querySelectorAll('.close-btn, #backBtn').forEach(btn => {
            btn.onclick = () => {
                if (popup) popup.style.display = 'none';
            };
        });
    },
    startTicker() {
        const ticker = document.getElementById('winnerText');
        const list = ["0917***5521", "0905***1128", "0922***9901"];
        if (!ticker) return;
        
        setInterval(() => {
            const user = list[Math.floor(Math.random() * list.length)];
            const win = (Math.floor(Math.random() * 5) + 1) * 200;
            ticker.innerHTML = `${user} withdrawn <img src="images/gc_icon.png" style="width:15px"> ₱${win}`;
        }, 4000);
    }
};

// 6. INITIALIZER - Ang saksakan ng lahat
document.addEventListener('DOMContentLoaded', () => {
    // 1. Basahin muna ang Session (Number)
    SessionManager.init();
    
    // 2. I-konek sa Firebase gamit ang number na nakuha
    FirebaseManager.init();
    
    // 3. Patakbuhin ang UI at Timer
    TimerManager.init();
    UIManager.init();

    console.log("🚀 System fully remastered and independent.");
});
