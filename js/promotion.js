// ========== PROMOTION.JS ==========

// Initialization gamit ang config mo
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const userPhone = localStorage.getItem("userPhone");

// Function para sa Realtime Balance Sync
function syncBalance() {
    if (!userPhone) return;

    const balanceRef = database.ref('user_sessions/' + userPhone + '/balance');
    
    // Pakikinggan ang anumang change sa database (Realtime)
    balanceRef.on('value', (snapshot) => {
        const currentBalance = snapshot.val() || 0;
        const formatted = parseFloat(currentBalance).toFixed(2);
        
        // Update ang lahat ng display sa UI
        if (document.getElementById('userBalanceDisplay')) {
            document.getElementById('userBalanceDisplay').innerText = formatted;
        }
        if (document.getElementById('popupBalanceAmount')) {
            document.getElementById('popupBalanceAmount').innerText = '₱' + formatted;
        }
    });
}

// Function para sa +150 Increment
function claimCatReward() {
    if (!userPhone) {
        alert("Please login first!");
        return;
    }

    const userRef = database.ref('user_sessions/' + userPhone);

    // Transaction para iwas sa error kung sabay-sabay ang click
    userRef.transaction((currentData) => {
        if (currentData === null) {
            // Kung wala pang record, gawan ng bago
            return {
                balance: 150,
                last_claim: firebase.database.ServerValue.TIMESTAMP,
                phone: userPhone
            };
        } else {
            // Kung meron na, dagdagan ng 150
            currentData.balance = (currentData.balance || 0) + 150;
            currentData.last_claim = firebase.database.ServerValue.TIMESTAMP;
            return currentData;
        }
    }, (error, committed) => {
        if (committed) {
            console.log("Success: +150 added to " + userPhone);
            showPrizePopup(); // Lalabas ang popup mo
        } else if (error) {
            console.error("Transaction failed:", error);
        }
    });
}

// Simulan ang sync pagka-load ng page
document.addEventListener('DOMContentLoaded', syncBalance);


function getUserStorageKeys() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return null;
    return {
        phone: phone,
        balanceKey: "userBalance_" + phone,
        leftRewardKey: "leftReward_" + phone,
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

function displayBalance() {
    var balance = getBalance();
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) {
        balanceSpan.innerHTML = balance.toFixed(2);
    }
}

function displayBalance() {
    var balance = getBalance();
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) {
        // Siguraduhin na may fallback kung sakaling hindi pa loaded ang numeric value
        balanceSpan.innerHTML = parseFloat(balance || 0).toFixed(2);
    }
}

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

// --- 2. INITIALIZATION: Kapag nag-load ang page (Refresh Proof) ---
function checkRewardStatus() {
    const leftCard = document.getElementById('leftLuckyCat');
    const userPhone = localStorage.getItem("userPhone");
    
    if (!leftCard || !userPhone) return;

    // I-fetch ang status mula sa Firebase
    db.ref(`user_sessions/${userPhone}/leftRewardClaimed`).once('value', (snapshot) => {
        if (snapshot.val() === true) {
            // I-lock na agad ang card pagkapasok pa lang ng page
            leftCard.setAttribute('data-claimed', 'true');
            leftCard.style.pointerEvents = 'none';
            leftCard.style.filter = 'grayscale(100%)';
            leftCard.style.opacity = '0.5';
        }
    });
}

// Tawagin ang checkRewardStatus pagka-load ng DOM
document.addEventListener('DOMContentLoaded', () => {
    checkRewardStatus();
    startMainTimer(); // Isama na rin natin yung countdown fix mo rito
});


function initLeftLuckyCard() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    updateLeftCardFromStorage();
    leftCard.onclick = null; 

    leftCard.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (getLeftRewardClaimed()) {
            alert("You already claimed your ₱150!");
            return;
        }

        var userRef = getUserRef();
        if (userRef) {
            // TRANSACTION START
            userRef.transaction(function(userData) {
                if (userData) {
                    var currentBal = userData.balance || 0;
                    if (currentBal + 150 > 1200) return; // Limit check

                    userData.balance = currentBal + 150;
                    userData.leftRewardClaimed = true;
                    userData.lastUpdate = firebase.database.ServerValue.TIMESTAMP;
                }
                return userData;
            }, function(error, committed, snapshot) {
                if (committed) {
                    // Dito na lang lahat ng UI updates
                    saveLeftRewardClaimed(true);
                    leftCard.classList.remove('prize-card-glow');
                    leftCard.classList.add('prize-card-claimed');
                    
                    var rect = leftCard.getBoundingClientRect();
                    showFloatingPlus(rect.left + rect.width/2, rect.top + rect.height/2, 150);
                    startConfetti();
                    
                    if (typeof showPrizePopup === 'function') showPrizePopup();
                }
            });
        }
    });
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
    // 1. AUTHENTICATION CHECK
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) { 
        window.location.href = "index.html"; 
        return; 
    }
    
    // 2. DISPLAY PHONE NUMBER
    var display = document.getElementById('userPhoneDisplay');
    if (display) { 
        display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11); 
    }

    // --- DAGDAGAN MO ITONG SECTION NA ITO ---
    syncBalance(); // Simulan ang realtime listener
    await loadUserDataFromFirebase(); // Kunin ang claimed status (leftRewardClaimed)
    initLeftLuckyCard(); // I-bind ang click event sa pusa
    renderInvitationsFromStorage(); // Ipakita ang listahan ng invites
    // ----------------------------------------

    // 3. INVITE BUTTON LOGIC
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) { 
        sendBtn.onclick = window.sendInviteToStorage; 
    }
    
    // 4. ENTER KEY LISTENER
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
