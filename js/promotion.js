// ========== PROMOTION.JS - FIXED VERSION ==========

// config.js
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

// Global variable para sa user phone
let currentUserPhone = null;

// Main initialization - ONLY ONE DOMContentLoaded
document.addEventListener('DOMContentLoaded', async function() {
    const savedPhone = localStorage.getItem("userPhone");

    if (!savedPhone) {
        window.location.href = "index.html";
        return;
    }

    currentUserPhone = savedPhone;
    
    // Setup real-time listener para sa user data
    setupUserDataListener(savedPhone);
    
    // I-setup din ang invitation features
    setupInvitationFeatures();
    
    // Start main timer
    startMainTimer();
});

// Single function to setup real-time listener
function setupUserDataListener(phone) {
    const userRef = database.ref('user_sessions/' + phone);
    
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Update UI with existing data
            updateAllDisplays(data);
        } else {
            // Initialize new user
            const initialData = {
                mobile: phone,
                balance: 0,
                claimed_luckycat: false,
                status: "active"
            };
            userRef.set(initialData);
            updateAllDisplays(initialData);
        }
    }, (error) => {
        console.error("Error fetching user data:", error);
    });
}

function updateAllDisplays(data) {
    // A. Phone Display
    const phoneEl = document.getElementById('userPhoneDisplay');
    if (phoneEl) {
        const phoneNumber = data.mobile || localStorage.getItem("userPhone");
        if (phoneNumber && phoneNumber.length >= 11) {
            phoneEl.innerText = phoneNumber.substring(0, 4) + "****" + phoneNumber.substring(8, 11);
        } else {
            phoneEl.innerText = phoneNumber || "Loading...";
        }
    }

    // B. Balance Display - Main display
    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl && data.balance !== undefined) {
        const currentBalance = Number(data.balance || 0);
        balanceEl.innerText = currentBalance.toFixed(2);
    }

    // C. Popup Balance Display
    const popupBalanceEl = document.getElementById('popupBalanceAmount');
    if (popupBalanceEl && data.balance !== undefined) {
        const currentBalance = Number(data.balance || 0);
        popupBalanceEl.innerText = "₱" + currentBalance.toFixed(2);
    }

    // D. Lucky Cat Status Display
    const luckyCatStatusEl = document.getElementById('luckyCatStatus');
    if (luckyCatStatusEl) {
        if (data.claimed_luckycat === true) {
            luckyCatStatusEl.innerText = "Claimed";
            luckyCatStatusEl.classList.add('claimed');
        } else {
            luckyCatStatusEl.innerText = "Available";
            luckyCatStatusEl.classList.remove('claimed');
        }
    }
}

// Function to update balance (to be called from other parts of your app)
function updateUserBalance(phone, newBalance) {
    const userRef = database.ref('user_sessions/' + phone);
    userRef.update({
        balance: newBalance
    }).then(() => {
        console.log("Balance updated successfully");
    }).catch((error) => {
        console.error("Error updating balance:", error);
    });
}

// Function to get current balance
function getCurrentBalance(phone) {
    return database.ref('user_sessions/' + phone + '/balance').once('value')
        .then((snapshot) => {
            return snapshot.val() || 0;
        });
}

// ========== INVITATION FUNCTIONS ==========

function getUserStorageKeys() {
    const userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return null;
    return {
        leftRewardKey: `leftReward_${userPhone}`,
        invitationsKey: `invitations_${userPhone}`
    };
}

function getInvitations() {
    const keys = getUserStorageKeys();
    if (!keys) return [];
    const stored = localStorage.getItem(keys.invitationsKey);
    return stored ? JSON.parse(stored) : [];
}

function saveInvitations(invitations) {
    const keys = getUserStorageKeys();
    if (keys) {
        localStorage.setItem(keys.invitationsKey, JSON.stringify(invitations));
    }
}

function getInvitesCount() {
    return getInvitations().length;
}

function displayInvitesCount() {
    const countSpan = document.getElementById('invitesCount');
    if (countSpan) {
        const pendingCount = getInvitations().filter(inv => inv.status === 'pending').length;
        countSpan.innerText = `${pendingCount}/6`;
    }
}

function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    return localStorage.getItem(keys.leftRewardKey) === 'true';
}

function addInvitation(friendPhone) {
    var invitations = getInvitations();
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone === friendPhone) return false;
    }
    invitations.push({ phone: friendPhone, status: 'pending', timestamp: Date.now() });
    saveInvitations(invitations);
    return true;
}

function renderInvitationsFromStorage() {
    var invitations = getInvitations();
    var listBody = document.getElementById('inviteListBody');
    if (!listBody) return;
    if (invitations.length === 0) { 
        listBody.innerHTML = '<div class="invite-empty">No invitations sent</div>'; 
        return; 
    }
    var html = '';
    for (var i = 0; i < invitations.length; i++) {
        var inv = invitations[i];
        var formattedPhone = inv.phone.substring(0, 4) + '***' + inv.phone.substring(7, 11);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        var disabled = inv.status === 'approved' ? 'disabled' : '';
        html += '<div class="invite-item"><div class="invite-item-phone">' + formattedPhone + '</div><div class="invite-item-status"><span class="status-badge ' + statusClass + '">' + statusText + '</span></div><div class="invite-item-action"><button class="delete-invite" onclick="deleteInviteFromStorage(\'' + inv.phone + '\')" ' + disabled + '>✕</button></div></div>';
    }
    listBody.innerHTML = html;
}

window.sendInviteToStorage = function() {
    var friendPhone = document.getElementById('friendPhoneInput').value.trim();
    var userPhone = localStorage.getItem("userPhone");
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) { 
        alert("Enter valid 11-digit number"); 
        return; 
    }
    if (friendPhone === userPhone) { 
        alert("Cannot invite yourself"); 
        return; 
    }
    if (getInvitesCount() >= 6) { 
        alert("Maximum 6 invites only"); 
        return; 
    }
    if (addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        renderInvitationsFromStorage();
        displayInvitesCount();
        alert("Invitation sent!");
    } else { 
        alert("Already invited this person"); 
    }
};

window.deleteInviteFromStorage = function(friendPhone) {
    var invitations = getInvitations();
    var invite = null;
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone === friendPhone) { 
            invite = invitations[i]; 
            break; 
        }
    }
    if (invite && invite.status === 'approved') { 
        alert("Cannot delete approved invitation"); 
        return; 
    }
    if (confirm("Delete invitation?")) {
        var newInvites = [];
        for (var i = 0; i < invitations.length; i++) {
            if (invitations[i].phone !== friendPhone) newInvites.push(invitations[i]);
        }
        saveInvitations(newInvites);
        renderInvitationsFromStorage();
        displayInvitesCount();
    }
};

function setupInvitationFeatures() {
    // INVITE BUTTON LOGIC
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) { 
        sendBtn.onclick = window.sendInviteToStorage; 
    }
    
    // ENTER KEY LISTENER
    var friendInput = document.getElementById('friendPhoneInput');
    if (friendInput) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                var btn = document.getElementById('sendInviteBtn'); 
                if (btn) btn.click(); 
            }
        });
    }
    
    // Render invitations on load
    renderInvitationsFromStorage();
    displayInvitesCount();
}

// ========== MAIN TIMER ==========

// Target date: May 15, 2026
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

            const days = String(d).padStart(2, '0');
            const hours = String(h).padStart(2, '0');
            const mins = String(m).padStart(2, '0');
            const secs = String(s).padStart(2, '0');

            display.innerText = `${days}D ${hours}:${mins}:${secs}`;
            display.style.color = "#fff"; // Reset color
        } else {
            display.innerText = "00D 00:00:00";
            display.style.color = "#ff0000";
        }
    }, 1000);
}

// ========== CONFETTI FUNCTIONS ==========

var confettiAnimation = null;
var confettiTimeout = null;

function startConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    stopConfetti();
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext('2d');
    var particles = [];
    for (var i = 0; i < 100; i++) {
        particles.push({ 
            x: Math.random() * canvas.width, 
            y: Math.random() * canvas.height - canvas.height, 
            size: Math.random() * 6 + 2, 
            color: "hsl(" + (Math.random() * 360) + ", 100%, 60%)", 
            speed: Math.random() * 3 + 2 
        });
    }
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var j = 0; j < particles.length; j++) {
            var p = particles[j];
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) { 
                p.y = -p.size; 
                p.x = Math.random() * canvas.width; 
            }
        }
        confettiAnimation = requestAnimationFrame(draw);
    }
    draw();
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(stopConfetti, 3000);
}

function stopConfetti() {
    if (confettiAnimation) { 
        cancelAnimationFrame(confettiAnimation); 
        confettiAnimation = null; 
    }
    var canvas = document.getElementById('confettiCanvas');
    if (canvas) { 
        var ctx = canvas.getContext('2d'); 
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        canvas.style.display = 'none'; 
    }
}

window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;

// ========== FACEBOOK SHARE ==========

window.handleFacebookShare = function() {
    console.log("Facebook Share Initialized...");
    
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    
    window.open(fbUrl, '_blank', 'width=600,height=400');
    
    if (typeof closePrizePopup === 'function') {
        setTimeout(closePrizePopup, 1000);
    }
};

// Export functions for global use
window.updateUserBalance = updateUserBalance;
window.getCurrentBalance = getCurrentBalance;
