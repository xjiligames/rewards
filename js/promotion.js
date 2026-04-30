// ========== PROMOTION.JS - CORRECTED VERSION ==========
// Firebase Configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global Variables
let currentUserPhone = null;
let currentUserData = null;

// ========== MAIN INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("=== PROMOTION.JS LOADED ===");
    
    // STEP 1: Get user phone from localStorage (galing sa index.html)
    currentUserPhone = localStorage.getItem("userPhone");
    
    console.log("Phone from localStorage:", currentUserPhone);
    
    // STEP 2: Validate kung may laman ang localStorage
    if (!currentUserPhone) {
        console.error("ERROR: No userPhone found in localStorage!");
        alert("Session expired. Please login again.");
        window.location.href = "index.html";
        return;
    }
    
    // STEP 3: Display the phone number agad (galing sa localStorage)
    displayPhoneNumber(currentUserPhone);
    
    // STEP 4: I-connect sa Firebase - Check if user exists
    await checkOrCreateUserInFirebase(currentUserPhone);
    
    // STEP 5: Setup invitation features
    setupInvitationFeatures();
    
    // STEP 6: Start main timer
    startMainTimer();
});

// ========== DISPLAY PHONE NUMBER FROM LOCALSTORAGE ==========
function displayPhoneNumber(phone) {
    const phoneEl = document.getElementById('userPhoneDisplay');
    if (phoneEl && phone) {
        // Format phone number: 0912***3456
        if (phone.length >= 11) {
            const formatted = phone.substring(0, 4) + "***" + phone.substring(7, 11);
            phoneEl.innerText = formatted;
            console.log("✅ Phone displayed:", formatted);
        } else {
            phoneEl.innerText = phone;
        }
    } else {
        console.warn("⚠️ userPhoneDisplay element not found");
    }
}

// ========== CHECK OR CREATE USER IN FIREBASE ==========
async function checkOrCreateUserInFirebase(phone) {
    try {
        console.log("🔍 Checking Firebase for user:", phone);
        
        // Reference to user in Firebase
        const userRef = database.ref('user_sessions/' + phone);
        const snapshot = await userRef.once('value');
        const existingData = snapshot.val();
        
        if (existingData) {
            // ✅ USER EXISTS - Display existing data
            console.log("✅ User found in Firebase:", existingData);
            currentUserData = existingData;
            
            // Display balance from Firebase
            const balance = Number(existingData.balance) || 0;
            updateBalanceDisplay(balance);
            
            // Display Lucky Cat status
            updateLuckyCatStatus(existingData.claimed_luckycat || false);
            
            // Store sa localStorage as backup
            localStorage.setItem(`${phone}_balance`, balance);
            localStorage.setItem(`${phone}_claimed_luckycat`, existingData.claimed_luckycat || false);
            
            console.log("💰 Balance displayed:", balance);
            
        } else {
            // ❌ USER DOES NOT EXIST - Create new user in Firebase
            console.log("❌ User not found, creating new user in Firebase...");
            
            const newUserData = {
                mobile: phone,
                balance: 0,
                claimed_luckycat: false,
                status: "active",
                created_at: Date.now(),
                updated_at: Date.now(),
                deviceId: localStorage.getItem("userDeviceId") || "unknown",
                deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || "unknown"
            };
            
            // Create new user in Firebase
            await userRef.set(newUserData);
            console.log("✅ New user created in Firebase:", newUserData);
            
            currentUserData = newUserData;
            
            // Display initial balance (0)
            updateBalanceDisplay(0);
            updateLuckyCatStatus(false);
            
            // Store sa localStorage
            localStorage.setItem(`${phone}_balance`, 0);
            localStorage.setItem(`${phone}_claimed_luckycat`, false);
            
            console.log("💰 Initial balance displayed: 0");
        }
        
        // Setup real-time listener for balance updates
        setupBalanceListener(phone);
        
    } catch (error) {
        console.error("❌ Firebase error:", error);
        
        // Fallback: Try to get from localStorage
        const localBalance = localStorage.getItem(`${phone}_balance`);
        if (localBalance !== null) {
            updateBalanceDisplay(Number(localBalance));
            console.log("⚠️ Using local backup balance:", localBalance);
        } else {
            updateBalanceDisplay(0);
        }
    }
}

// ========== REAL-TIME BALANCE LISTENER ==========
function setupBalanceListener(phone) {
    const balanceRef = database.ref('user_sessions/' + phone + '/balance');
    
    balanceRef.on('value', (snapshot) => {
        const newBalance = snapshot.val();
        if (newBalance !== null && newBalance !== undefined) {
            const balanceNum = Number(newBalance);
            updateBalanceDisplay(balanceNum);
            localStorage.setItem(`${phone}_balance`, balanceNum);
            console.log("🔄 Balance updated in real-time:", balanceNum);
        }
    }, (error) => {
        console.error("Balance listener error:", error);
    });
}

// ========== UPDATE BALANCE DISPLAY ==========
function updateBalanceDisplay(balance) {
    // Update main balance display
    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl) {
        balanceEl.innerText = balance.toFixed(2);
        console.log("💎 Balance display updated: ₱" + balance.toFixed(2));
    }
    
    // Update popup balance display
    const popupBalanceEl = document.getElementById('popupBalanceAmount');
    if (popupBalanceEl) {
        popupBalanceEl.innerText = "₱" + balance.toFixed(2);
    }
}

// ========== UPDATE LUCKY CAT STATUS ==========
function updateLuckyCatStatus(isClaimed) {
    const statusEl = document.getElementById('luckyCatStatus');
    if (statusEl) {
        if (isClaimed) {
            statusEl.innerText = "Claimed";
            statusEl.classList.add('claimed');
        } else {
            statusEl.innerText = "Available";
            statusEl.classList.remove('claimed');
        }
        console.log("🐱 Lucky Cat status:", isClaimed ? "Claimed" : "Available");
    }
}

// ========== UPDATE BALANCE IN FIREBASE ==========
async function updateUserBalance(phone, newBalance) {
    try {
        const userRef = database.ref('user_sessions/' + phone);
        await userRef.update({
            balance: newBalance,
            updated_at: Date.now()
        });
        console.log("✅ Balance updated in Firebase:", newBalance);
        return true;
    } catch (error) {
        console.error("❌ Error updating balance:", error);
        return false;
    }
}

// ========== GET CURRENT BALANCE ==========
async function getCurrentBalance(phone) {
    try {
        const balanceRef = database.ref('user_sessions/' + phone + '/balance');
        const snapshot = await balanceRef.once('value');
        const balance = snapshot.val() || 0;
        console.log("💰 Current balance from Firebase:", balance);
        return balance;
    } catch (error) {
        console.error("Error getting balance:", error);
        return 0;
    }
}

// ========== INVITATION FUNCTIONS ==========
function getInvitations() {
    const key = `invitations_${currentUserPhone}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function saveInvitations(invitations) {
    const key = `invitations_${currentUserPhone}`;
    localStorage.setItem(key, JSON.stringify(invitations));
}

function getInvitesCount() {
    return getInvitations().filter(inv => inv.status === 'pending').length;
}

function addInvitation(friendPhone) {
    const invitations = getInvitations();
    
    if (invitations.some(inv => inv.phone === friendPhone)) {
        return false;
    }
    
    if (getInvitesCount() >= 6) {
        return false;
    }
    
    invitations.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now()
    });
    
    saveInvitations(invitations);
    return true;
}

function deleteInvitation(friendPhone) {
    const invitations = getInvitations();
    const invite = invitations.find(inv => inv.phone === friendPhone);
    
    if (invite && invite.status === 'approved') {
        return false;
    }
    
    const newInvites = invitations.filter(inv => inv.phone !== friendPhone);
    saveInvitations(newInvites);
    return true;
}

function renderInvitations() {
    const container = document.getElementById('inviteListBody');
    if (!container) return;
    
    const invitations = getInvitations();
    
    if (invitations.length === 0) {
        container.innerHTML = '<div class="invite-empty">No invitations sent</div>';
        return;
    }
    
    let html = '';
    invitations.forEach(inv => {
        const formattedPhone = inv.phone.substring(0, 4) + '***' + inv.phone.substring(7, 11);
        const statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        const statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        const disabled = inv.status === 'approved' ? 'disabled' : '';
        
        html += `
            <div class="invite-item">
                <div class="invite-item-phone">${formattedPhone}</div>
                <div class="invite-item-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="invite-item-action">
                    <button class="delete-invite" onclick="handleDeleteInvite('${inv.phone}')" ${disabled}>✕</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateInviteCount() {
    const countSpan = document.getElementById('invitesCount');
    if (countSpan) {
        const pendingCount = getInvitesCount();
        countSpan.innerText = `${pendingCount}/6`;
    }
}

// Global functions
window.handleSendInvite = function() {
    const friendPhone = document.getElementById('friendPhoneInput').value.trim();
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Enter valid 11-digit number starting with 09");
        return;
    }
    
    if (friendPhone === currentUserPhone) {
        alert("Cannot invite yourself");
        return;
    }
    
    if (addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        renderInvitations();
        updateInviteCount();
        alert("Invitation sent successfully!");
    } else {
        alert("Cannot send invitation. Either already invited or reached maximum limit (6).");
    }
};

window.handleDeleteInvite = function(friendPhone) {
    if (confirm("Delete this invitation?")) {
        if (deleteInvitation(friendPhone)) {
            renderInvitations();
            updateInviteCount();
        } else {
            alert("Cannot delete approved invitation");
        }
    }
};

function setupInvitationFeatures() {
    const sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        sendBtn.onclick = window.handleSendInvite;
    }
    
    const friendInput = document.getElementById('friendPhoneInput');
    if (friendInput) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleSendInvite();
            }
        });
    }
    
    renderInvitations();
    updateInviteCount();
}

// ========== MAIN TIMER ==========
const dropEndDate = new Date("May 15, 2026 00:00:00").getTime();
let timerInterval = null;

function startMainTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    const display = document.getElementById('mainTimerDisplay');
    if (!display) return;
    
    function updateTimer() {
        const now = Date.now();
        const diff = dropEndDate - now;
        
        if (diff > 0) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            display.innerText = `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            display.style.color = "#fff";
        } else {
            display.innerText = "00D 00:00:00";
            display.style.color = "#ff0000";
            if (timerInterval) clearInterval(timerInterval);
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// ========== CONFETTI FUNCTIONS ==========
let confettiAnimation = null;
let confettiTimeout = null;

window.startConfetti = function() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
    window.stopConfetti();
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 10));
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            speed: Math.random() * 3 + 2
        });
    }
    
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) {
                p.y = -p.size;
                p.x = Math.random() * canvas.width;
            }
        });
        
        confettiAnimation = requestAnimationFrame(draw);
    }
    
    draw();
    
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(() => window.stopConfetti(), 3000);
};

window.stopConfetti = function() {
    if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
        confettiAnimation = null;
    }
    
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
    
    if (confettiTimeout) {
        clearTimeout(confettiTimeout);
        confettiTimeout = null;
    }
};

// ========== FACEBOOK SHARE ==========
window.handleFacebookShare = function() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    window.open(fbUrl, '_blank', 'width=600,height=400');
};

// ========== GCASH CLAIM HANDLER ==========
window.handleClaimThruGCash = function() {
    alert("GCash claim feature coming soon!");
};

// Export functions
window.updateUserBalance = updateUserBalance;
window.getCurrentBalance = getCurrentBalance;

// Clean up
window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    if (confettiAnimation) cancelAnimationFrame(confettiAnimation);
});

console.log("✅ Promotion.js loaded and ready");
