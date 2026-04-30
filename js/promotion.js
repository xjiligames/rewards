// ========== PROMOTION.JS ==========

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

// Local Auth...
document.addEventListener('DOMContentLoaded', async function() {
    const savedPhone = localStorage.getItem("userPhone");

    if (!savedPhone) {
        window.location.href = "index.html";
        return;
    }

    const userRef = database.ref('user_sessions/' + savedPhone);

    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // I-update ang UI gamit ang existing data
            updateAllDisplays(data);
        } else {
            // Kung bago ang user o walang data, i-initialize
            const initialData = {
                mobile: savedPhone,
                balance: 0,
                claimed_luckycat: false, // Default status
                status: "active"
            };
            userRef.set(initialData);
            updateAllDisplays(initialData);
        }
    });
});

function updateAllDisplays(data) {
    // A. Phone Display (Fallback sa Local Storage)
    const phoneEl = document.getElementById('userPhoneDisplay');
    if (phoneEl) {
        const p = data.mobile || localStorage.getItem("userPhone");
        phoneEl.innerText = p ? p.substring(0, 4) + "****" + p.substring(8, 11) : "Loading...";
    }

    // B. Balance Display (Mini Dashboard)
    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl) {
        const currentBalance = Number(data.balance || 0);
        balanceEl.innerText = currentBalance.toFixed(2);
    }

    // C. Lucky Cat Status Display
    const luckyCatStatusEl = document.getElementById('luckyCatStatus'); // Siguraduhing may ID na ganito sa HTML
    if (luckyCatStatusEl) {
        if (data.claimed_luckycat === true) {
            luckyCatStatusEl.innerText = "Claimed";
            luckyCatStatusEl.classList.add('claimed'); // Para sa CSS styling
        } else {
            luckyCatStatusEl.innerText = "Available";
            luckyCatStatusEl.classList.remove('claimed');
        }
    }
} 
#########
function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    return localStorage.getItem(keys.leftRewardKey) === 'true';
}

// --- 1. ACTION: Kapag kini-click ang card ---
function handleLeftCardClick() {
    const leftCard = document.getElementById('leftLuckyCat');
    
    // PLAY SOUND FIRST (Para hindi ma-block ng logic)
    const catSound = document.getElementById('luckyCatSound'); 
    if (catSound) {
        catSound.currentTime = 0;
        catSound.play().catch(e => console.log("Sound play error:", e));
    }

    // Check kung claimed na sa UI state
    if (leftCard.getAttribute('data-claimed') === 'true') {
        console.log("Already claimed!");
        return; 
    }

    // LOCK IMMEDIATELY
    leftCard.setAttribute('data-claimed', 'true');
    leftCard.style.pointerEvents = 'none';
    leftCard.style.opacity = '0.5';

    // TRIGGER REWARD (Dito mo tatawagin yung popup at balance logic)
    showClaimPopupShare(150); 
}

// Tawagin ang checkRewardStatus pagka-load ng DOM
document.addEventListener('DOMContentLoaded', () => {
    checkRewardStatus();
    startMainTimer(); // Isama na rin natin yung countdown fix mo rito
});

function showFloatingPlus(x, y, amount) {
    var floatingDiv = document.createElement('div');
    floatingDiv.className = 'floating-plus';
    floatingDiv.innerHTML = '+₱' + amount;
    floatingDiv.style.position = 'fixed';
    floatingDiv.style.left = x + 'px';
    floatingDiv.style.top = y + 'px';
    floatingDiv.style.color = '#ffd700';
    floatingDiv.style.fontSize = '36px';
    floatingDiv.style.fontWeight = 'bold';
    floatingDiv.style.fontFamily = 'Orbitron, monospace';
    floatingDiv.style.textShadow = '0 0 15px #ffaa33';
    floatingDiv.style.pointerEvents = 'none';
    floatingDiv.style.zIndex = '10001';
    floatingDiv.style.animation = 'floatUp 1s ease-out forwards';
    document.body.appendChild(floatingDiv);
    setTimeout(function() { floatingDiv.remove(); }, 1000);
}

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
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, size: Math.random() * 6 + 2, color: "hsl(" + (Math.random() * 360) + ", 100%, 60%)", speed: Math.random() * 3 + 2 });
    }
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var j = 0; j < particles.length; j++) {
            var p = particles[j];
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
        }
        confettiAnimation = requestAnimationFrame(draw);
    }
    draw();
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(stopConfetti, 3000);
}

function stopConfetti() {
    if (confettiAnimation) { cancelAnimationFrame(confettiAnimation); confettiAnimation = null; }
    var canvas = document.getElementById('confettiCanvas');
    if (canvas) { var ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
}

window.startConfetti = startConfetti;
window.stopConfetti = stopConfetti;

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
    if (invitations.length === 0) { listBody.innerHTML = '<div class="invite-empty">No invitations sent</div>'; return; }
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
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) { alert("Enter valid 11-digit number"); return; }
    if (friendPhone === userPhone) { alert("Cannot invite yourself"); return; }
    if (getInvitesCount() >= 6) { alert("Maximum 6 invites only"); return; }
    if (addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        renderInvitationsFromStorage();
        displayInvitesCount();
        alert("Invitation sent!");
    } else { alert("Already invited this person"); }
};

window.deleteInviteFromStorage = function(friendPhone) {
    var invitations = getInvitations();
    var invite = null;
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone === friendPhone) { invite = invitations[i]; break; }
    }
    if (invite && invite.status === 'approved') { alert("Cannot delete approved invitation"); return; }
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

document.addEventListener('DOMContentLoaded', async function() {

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
});

//Facebook Share
window.handleFacebookShare = function() {
    console.log("Facebook Share Initialized...");
    
    const shareUrl = "https://xjiligames.github.io/rewards/index.html"; //
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    
    // Redirect logic
    const fbWindow = window.open(fbUrl, '_blank', 'width=600,height=400');
    
    // Optional: Auto-close popup after share to focus on the mission
    if (typeof closePrizePopup === 'function') {
        setTimeout(closePrizePopup, 1000);
    }
};
