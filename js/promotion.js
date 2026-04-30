// ========== PROMOTION.JS - WITH REDIRECT LOGIC ==========

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

// Global variable
let currentUserPhone = null;

// ========== MAIN FUNCTION ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Promotion.js started...");
    
    // STEP 1: Kunin ang phone number mula sa localStorage
    currentUserPhone = localStorage.getItem("userPhone");
    
    console.log("📱 Phone from localStorage:", currentUserPhone);
    
    // STEP 2: CHECK KUNG WALANG MOBILE NUMBER - REDIRECT TO INDEX
    if (!currentUserPhone || currentUserPhone === "" || currentUserPhone === "null" || currentUserPhone === "undefined") {
        console.warn("⚠️ No mobile number found in localStorage!");
        
        // Show alert message
        alert("No session found. Please login first!");
        
        // Redirect to index.html
        window.location.href = "index.html";
        return; // Stop execution
    }
    
    // STEP 3: VALIDATE PHONE NUMBER FORMAT (11 digits, starts with 09)
    if (currentUserPhone.length !== 11 || !currentUserPhone.startsWith('09')) {
        console.warn("⚠️ Invalid phone number format:", currentUserPhone);
        alert("Invalid phone number format. Please login again.");
        localStorage.removeItem("userPhone"); // Clear invalid data
        window.location.href = "index.html";
        return;
    }
    
    // STEP 4: I-display agad ang phone number (masked)
    displayPhoneNumber(currentUserPhone);
    
    // STEP 5: Kunin ang data mula sa Firebase
    await fetchUserFromFirebase(currentUserPhone);
    
    // STEP 6: Setup ibang features
    setupInvitationFeatures();
    startMainTimer();
});

// ========== DISPLAY PHONE NUMBER ==========
function displayPhoneNumber(phone) {
    const phoneElement = document.getElementById('userPhoneDisplay');
    if (phoneElement && phone) {
        if (phone.length >= 11) {
            const masked = phone.substring(0, 4) + "***" + phone.substring(7, 11);
            phoneElement.innerText = masked;
            console.log("✅ Phone displayed:", masked);
        } else {
            phoneElement.innerText = phone;
        }
    } else {
        console.warn("⚠️ Phone element not found!");
    }
}

// ========== FETCH USER FROM FIREBASE ==========
async function fetchUserFromFirebase(phone) {
    try {
        console.log("🔍 Checking Firebase for:", phone);
        
        // Reference sa user_sessions database
        const userRef = database.ref('user_sessions/' + phone);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        
        if (userData) {
            // MAY DATA - display existing balance
            console.log("✅ User found in Firebase:", userData);
            const balance = Number(userData.balance) || 0;
            updateBalanceDisplay(balance);
            updateLuckyCatStatus(userData.claimed_luckycat || false);
            
            // I-save sa localStorage as backup
            localStorage.setItem(`${phone}_balance`, balance);
            
        } else {
            // WALANG DATA - create new user
            console.log("⚠️ User not found, creating new user...");
            
            const newUser = {
                mobile: phone,
                balance: 0,
                claimed_luckycat: false,
                status: "active",
                created_at: Date.now(),
                deviceId: localStorage.getItem("userDeviceId") || "unknown",
                deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || "unknown"
            };
            
            await userRef.set(newUser);
            console.log("✅ New user created:", newUser);
            
            updateBalanceDisplay(0);
            updateLuckyCatStatus(false);
        }
        
        // Setup real-time listener for balance updates
        setupBalanceListener(phone);
        
    } catch (error) {
        console.error("❌ Firebase error:", error);
        
        // Check if error is permission denied
        if (error.code === 'PERMISSION_DENIED') {
            console.error("Database permission denied! Check Firebase rules.");
            alert("Database connection error. Please try again later.");
        }
        
        // Fallback: try to get from localStorage
        const savedBalance = localStorage.getItem(`${phone}_balance`);
        if (savedBalance) {
            updateBalanceDisplay(Number(savedBalance));
        }
    }
}

// ========== UPDATE BALANCE DISPLAY ==========
function updateBalanceDisplay(balance) {
    const balanceElement = document.getElementById('userBalanceDisplay');
    if (balanceElement) {
        balanceElement.innerText = balance.toFixed(2);
        console.log("💰 Balance updated: ₱" + balance.toFixed(2));
    }
    
    const popupBalance = document.getElementById('popupBalanceAmount');
    if (popupBalance) {
        popupBalance.innerText = "₱" + balance.toFixed(2);
    }
}

// ========== UPDATE LUCKY CAT STATUS ==========
function updateLuckyCatStatus(claimed) {
    const statusElement = document.getElementById('luckyCatStatus');
    if (statusElement) {
        if (claimed) {
            statusElement.innerText = "Claimed";
            statusElement.classList.add('claimed');
        } else {
            statusElement.innerText = "Available";
            statusElement.classList.remove('claimed');
        }
        console.log("🐱 Lucky Cat:", claimed ? "Claimed" : "Available");
    }
}

// ========== REAL-TIME BALANCE LISTENER ==========
function setupBalanceListener(phone) {
    const balanceRef = database.ref('user_sessions/' + phone + '/balance');
    
    balanceRef.on('value', (snapshot) => {
        const balance = snapshot.val();
        if (balance !== null && balance !== undefined) {
            updateBalanceDisplay(Number(balance));
            localStorage.setItem(`${phone}_balance`, balance);
        }
    }, (error) => {
        console.error("Balance listener error:", error);
    });
}

// ========== UPDATE BALANCE FUNCTION ==========
window.updateUserBalance = async function(phone, newBalance) {
    try {
        await database.ref('user_sessions/' + phone).update({
            balance: newBalance,
            updated_at: Date.now()
        });
        console.log("✅ Balance updated:", newBalance);
        return true;
    } catch (error) {
        console.error("❌ Error updating balance:", error);
        return false;
    }
};

// ========== GET CURRENT BALANCE ==========
window.getCurrentBalance = async function(phone) {
    try {
        const snapshot = await database.ref('user_sessions/' + phone + '/balance').once('value');
        return snapshot.val() || 0;
    } catch (error) {
        console.error("Error getting balance:", error);
        return 0;
    }
};

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
                    <button class="delete-invite" onclick="window.handleDeleteInvite('${inv.phone}')" ${disabled}>✕</button>
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

// Global invitation handlers
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
        } else {
            display.innerText = "00D 00:00:00";
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

window.handleClaimThruGCash = function() {
    alert("GCash claim feature coming soon!");
};

// ========== SESSION CHECK FUNCTION (can be called anytime) ==========
window.checkUserSession = function() {
    const phone = localStorage.getItem("userPhone");
    if (!phone || phone === "" || phone === "null") {
        window.location.href = "index.html";
        return false;
    }
    return true;
};

// ========== LOGOUT FUNCTION ==========
window.logoutUser = function() {
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userDeviceId");
    localStorage.removeItem("userDeviceDisplayId");
    window.location.href = "index.html";
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    if (confettiAnimation) cancelAnimationFrame(confettiAnimation);
});

console.log("✅ Promotion.js ready with redirect logic!");
