// ========== PROMOTION.JS ==========

async function loadAndDisplayBalance() {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return;
    
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (!balanceSpan) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        try {
            var snap = await db.ref('user_sessions/' + userPhone).once('value');
            
            if (snap.exists() && snap.val().balance !== undefined) {
                var balance = snap.val().balance;
                balanceSpan.innerHTML = '₱' + balance.toFixed(2);
                console.log("Balance loaded:", balance);
            } else {
                balanceSpan.innerHTML = '₱0.00';
            }
        } catch(e) {
            console.log("Error:", e);
            balanceSpan.innerHTML = '₱0.00';
        }
    } else {
        balanceSpan.innerHTML = '₱0.00';
    }
}


function getUserStorageKeys() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return null;
    return {
        phone: phone,
        balanceKey: "userBalance_" + phone,
        leftRewardKey: "leftReward_" + phone,
        invitesKey: "invitations_" + phone,
        invitesCountKey: "invitesCount_" + phone,
        rightRewardKey: "rightReward_" + phone
    };
}

function getUserRef() {
    var phone = localStorage.getItem("userPhone");
    if (!phone || typeof firebase === 'undefined') return null;
    var db = firebase.database();
    return db.ref('user_sessions/' + phone);
}

async function loadUserDataFromFirebase() {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        try {
            var snap = await db.ref('user_sessions/' + userPhone).once('value');
            if (snap.exists()) {
                var data = snap.val();
                if (data.balance !== undefined) {
                    var keys = getUserStorageKeys();
                    if (keys) localStorage.setItem(keys.balanceKey, data.balance);
                    displayBalance();
                }
                if (data.leftRewardClaimed === true) {
                    var keys = getUserStorageKeys();
                    if (keys) localStorage.setItem(keys.leftRewardKey, 'true');
                    updateLeftCardFromStorage();
                }
            }
        } catch(e) {
            console.log("Error loading user data:", e);
        }
    }
}

async function saveBalanceToFirebase(amount) {
    var userRef = getUserRef();
    if (!userRef) return;
    try {
        await userRef.update({ balance: amount, lastUpdate: Date.now() });
    } catch(e) {}
}

function saveBalance(amount) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.balanceKey, amount);
    saveBalanceToFirebase(amount);
}

function getBalance() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    var balance = localStorage.getItem(keys.balanceKey);
    return balance ? parseFloat(balance) : 0;
}

function addBalance(amount) {
    var currentBalance = getBalance();
    var newBalance = currentBalance + amount;
    if (newBalance > 1200) {
        alert("Maximum balance of ₱1200 reached!");
        return currentBalance;
    }
    saveBalance(newBalance);
    return newBalance;
}

function displayBalance() {
    var balance = getBalance();
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) {
        balanceSpan.innerHTML = balance.toFixed(2);
    }
}

function saveLeftRewardClaimed(claimed) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.leftRewardKey, claimed ? 'true' : 'false');
    if (typeof firebase !== 'undefined' && firebase.database) {
        var userRef = getUserRef();
        if (userRef) userRef.update({ leftRewardClaimed: claimed });
    }
}

function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    return localStorage.getItem(keys.leftRewardKey) === 'true';
}

function updateLeftCardFromStorage() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    if (getLeftRewardClaimed()) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.classList.remove('prize-card-claimed');
    }
}

function initLeftLuckyCard() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    updateLeftCardFromStorage();
    
    if (!getLeftRewardClaimed()) {
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            if (getLeftRewardClaimed()) {
                alert("You already claimed your ₱150!");
                return;
            }
            
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            var newBalance = addBalance(150);
            saveLeftRewardClaimed(true);
            
            this.classList.remove('prize-card-glow');
            this.classList.add('prize-card-claimed');
            showFloatingPlus(x, y, 150);
            startConfetti();
            displayBalance();
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '<span class="status-locked">🐱 +₱150 CLAIMED! Your balance: ₱' + newBalance + ' ✨</span>';
                setTimeout(function() {
                    statusMsg.innerHTML = '<span class="status-locked">🐱 Click the Maneki-neko to claim ₱150! ✨</span>';
                }, 4000);
            }
        });
    }
}

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

function getInvitations() {
    var keys = getUserStorageKeys();
    if (!keys) return [];
    var invites = localStorage.getItem(keys.invitesKey);
    return invites ? JSON.parse(invites) : [];
}

function saveInvitations(invitations) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.invitesKey, JSON.stringify(invitations));
    localStorage.setItem(keys.invitesCountKey, invitations.length);
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

function getInvitesCount() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    var count = localStorage.getItem(keys.invitesCountKey);
    return count ? parseInt(count) : 0;
}

function displayInvitesCount() {
    var count = getInvitesCount();
    var invitesSpan = document.getElementById('invitesCountDisplay');
    if (invitesSpan) invitesSpan.innerHTML = count + ' / 6';
    return count;
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
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) { 
        alert("Please login first."); 
        window.location.href = "index.html"; 
        return; 
    }
    
    var display = document.getElementById('userPhoneDisplay');
    if (display) { 
        display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11); 
    }
    
    // I-LOAD ANG BALANCE MUNA
    await loadAndDisplayBalance();
    
    // IBA PANG FUNCTIONS
   
    renderInvitationsFromStorage();
    initLeftLuckyCard();

    
    
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) { 
        sendBtn.onclick = window.sendInviteToStorage; 
    }
    
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
    return false;
};
