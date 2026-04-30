// 1. Firebase Configuration (Siguraduhing tama ang details mo dito)
// Note: Initialize lang kung hindi pa na-initialize sa ibang script
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 2. Global Initialization
document.addEventListener('DOMContentLoaded', function() {
    const savedPhone = localStorage.getItem("userPhone");

    // Protection: Ibalik sa login kung walang phone sa local storage
    if (!savedPhone) {
        window.location.href = "index.html";
        return;
    }

    // A. Simulan ang Timer
    startMainTimer();

    // B. Simulan ang Session at Balance Sync
    // Gagamit tayo ng 'user_sessions/' + savedPhone para sa profile data
    const userRef = database.ref('user_sessions/' + savedPhone);

    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // I-update ang UI gamit ang existing data mula sa database
            updateAllDisplays(data);
        } else {
            // Kung bago ang user sa database, gawan ng initial record
            const initialData = {
                mobile: savedPhone,
                balance: 0,
                claimed_luckycat: false,
                status: "active",
                last_login: Date.now()
            };
            userRef.set(initialData);
            updateAllDisplays(initialData);
        }
    });

    // C. Setup Button Listeners
    setupEventListeners();
});

// 3. Centralized Display Update
function updateAllDisplays(data) {
    // A. Phone Number Display (Naka-mask)
    const phoneEl = document.getElementById('userPhoneDisplay');
    if (phoneEl) {
        const p = data.mobile || localStorage.getItem("userPhone");
        // Format: 0917****256
        phoneEl.innerText = p ? p.substring(0, 4) + "****" + p.substring(8, 11) : "Loading...";
    }

    // B. Balance Display (Main Dashboard at Popup)
    const currentBal = (data && data.balance) ? Number(data.balance) : 0;
    const formattedBal = currentBal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl) balanceEl.innerText = formattedBal;

    const popupBalEl = document.getElementById('popupBalanceAmount');
    if (popupBalEl) popupBalEl.innerText = "₱" + formattedBal;

    // C. Lucky Cat Status (Dito mo malalaman kung nakuha na ang reward)
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg && data.claimed_luckycat) {
        statusMsg.innerHTML = '<span class="status-claimed">✅ Reward Claimed! 🐱</span>';
    }
}

// 4. Timer Logic
const dropEndDate = new Date("May 15, 2026 00:00:00").getTime();
function startMainTimer() {
    const display = document.getElementById('mainTimerDisplay');
    if (!display) return;

    setInterval(() => {
        const now = Date.now();
        const diff = dropEndDate - now;
        if (diff > 0) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            display.innerText = `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
            display.innerText = "00D 00:00:00";
            display.style.color = "#ff0000";
        }
    }, 1000);
}

// 5. Facebook Share
window.handleFacebookShare = function() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    window.open(fbUrl, '_blank', 'width=600,height=400');
    if (typeof closePrizePopup === 'function') setTimeout(closePrizePopup, 1000);
};

// 6. Helpers
function setupEventListeners() {
    const sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) sendBtn.onclick = window.sendInviteToStorage;

    const friendInput = document.getElementById('friendPhoneInput');
    if (friendInput) {
        friendInput.onkeypress = (e) => { if (e.key === 'Enter') sendBtn.click(); };
    }
}
