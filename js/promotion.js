// ========== PROMOTION.JS - SHARE AND EARN ==========
// Complete version with localStorage data retrieval

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
        lastUpdateKey: "lastUpdate_" + phone
    };
}

// ========== SAVE BALANCE ==========
function saveBalance(amount) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    localStorage.setItem(keys.balanceKey, amount);
    localStorage.setItem(keys.lastUpdateKey, Date.now());
    console.log("Balance saved:", amount);
}

// ========== GET BALANCE ==========
function getBalance() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    
    var balance = localStorage.getItem(keys.balanceKey);
    return balance ? parseInt(balance) : 0;
}

// ========== SAVE LEFT REWARD STATUS ==========
function saveLeftRewardClaimed(claimed) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    localStorage.setItem(keys.leftRewardKey, claimed ? 'true' : 'false');
    console.log("Left reward status saved:", claimed);
}

// ========== GET LEFT REWARD STATUS ==========
function getLeftRewardClaimed() {
    var keys = getUserStorageKeys();
    if (!keys) return false;
    
    var status = localStorage.getItem(keys.leftRewardKey);
    return status === 'true';
}

// ========== SAVE INVITATIONS LIST ==========
function saveInvitations(invitations) {
    var keys = getUserStorageKeys();
    if (!keys) return;
    
    localStorage.setItem(keys.invitesKey, JSON.stringify(invitations));
    localStorage.setItem(keys.invitesCountKey, invitations.length);
    console.log("Invitations saved:", invitations.length);
}

// ========== GET INVITATIONS LIST ==========
function getInvitations() {
    var keys = getUserStorageKeys();
    if (!keys) return [];
    
    var invites = localStorage.getItem(keys.invitesKey);
    return invites ? JSON.parse(invites) : [];
}

// ========== GET INVITES COUNT ==========
function getInvitesCount() {
    var keys = getUserStorageKeys();
    if (!keys) return 0;
    
    var count = localStorage.getItem(keys.invitesCountKey);
    return count ? parseInt(count) : 0;
}

// ========== ADD INVITATION ==========
function addInvitation(friendPhone) {
    var invitations = getInvitations();
    
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone === friendPhone) {
            return false;
        }
    }
    
    invitations.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now()
    });
    
    saveInvitations(invitations);
    return true;
}

// ========== DELETE INVITATION ==========
function deleteInvitationByPhone(friendPhone) {
    var invitations = getInvitations();
    var newInvites = [];
    
    for (var i = 0; i < invitations.length; i++) {
        if (invitations[i].phone !== friendPhone) {
            newInvites.push(invitations[i]);
        }
    }
    
    saveInvitations(newInvites);
}

// ========== ADD BALANCE ==========
function addBalance(amount) {
    var currentBalance = getBalance();
    var newBalance = currentBalance + amount;
    saveBalance(newBalance);
    return newBalance;
}

// ========== DISPLAY BALANCE ==========
function displayBalance() {
    var balance = getBalance();
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) {
        balanceSpan.innerHTML = '₱' + balance;
    }
    return balance;
}

// ========== DISPLAY INVITES COUNT ==========
function displayInvitesCount() {
    var count = getInvitesCount();
    var invitesSpan = document.getElementById('invitesCountDisplay');
    if (invitesSpan) {
        invitesSpan.innerHTML = count + ' / 6';
    }
    return count;
}

// ========== UPDATE LEFT CARD VISUAL ==========
function updateLeftCardFromStorage() {
    var leftCard = document.getElementById('leftCard');
    var leftClaimed = getLeftRewardClaimed();
    
    if (!leftCard) return;
    
    if (leftClaimed) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
        leftCard.style.cursor = 'default';
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.classList.remove('prize-card-claimed');
        leftCard.style.cursor = 'pointer';
    }
}

// ========== RENDER INVITATIONS LIST ==========
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

// ========== DELETE INVITE ==========
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
        alert("Cannot delete approved invitation!");
        return;
    }
    
    if (confirm("Delete invitation?")) {
        deleteInvitationByPhone(friendPhone);
        renderInvitationsFromStorage();
        displayInvitesCount();
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = 'Invitation deleted';
        }
    }
};

// ========== SEND INVITATION ==========
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
    
    var invitesCount = getInvitesCount();
    if (invitesCount >= 6) {
        alert("Maximum 6 invites only!");
        return;
    }
    
    if (addInvitation(friendPhone)) {
        document.getElementById('friendPhoneInput').value = '';
        renderInvitationsFromStorage();
        displayInvitesCount();
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = 'Invitation sent to ' + friendPhone.substring(0, 4) + '****' + friendPhone.substring(8, 11);
        }
        
        alert("Invitation sent!");
    } else {
        alert("You already invited this person!");
    }
};

// ========== LEFT LUCKY CAT ==========
function initLeftLuckyCard() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    updateLeftCardFromStorage();
    
    if (!getLeftRewardClaimed()) {
        var newCard = leftCard.cloneNode(true);
        leftCard.parentNode.replaceChild(newCard, leftCard);
        leftCard = newCard;
        
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (getLeftRewardClaimed()) {
                alert("You already claimed your ₱150!");
                return;
            }
            
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
                statusMsg.innerHTML = '+₱150 claimed! Your balance: ₱' + getBalance();
            }
        });
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
    
    setTimeout(function() {
        floatingDiv.remove();
    }, 1000);
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
    confettiTimeout = setTimeout(function() {
        stopConfetti();
    }, 3000);
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

// ========== CLAIM NOW BUTTON ==========
function initClaimNowButton() {
    var claimNowBtn = document.getElementById('claimNowBtn');
    
    if (claimNowBtn) {
        var newBtn = claimNowBtn.cloneNode(true);
        claimNowBtn.parentNode.replaceChild(newBtn, claimNowBtn);
        
        newBtn.onclick = function() {
            if (!getLeftRewardClaimed()) {
                alert("Click the GOLDEN CARD first to claim your ₱150!");
                return;
            }
            
            var popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) {
                popupBalance.innerHTML = '₱' + getBalance();
            }
            
            showPrizePopup();
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
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'none';
    }
    stopConfetti();
}

// ========== DROPDOWN TOGGLE ==========
function initDropdownToggle() {
    var dropdownBtn = document.getElementById('dropdownBtn');
    var dropdownContent = document.getElementById('dropdownContent');
    
    if (dropdownBtn && dropdownContent) {
        var newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        
        dropdownBtn.onclick = function(e) {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        };
        
        document.addEventListener('click', function(e) {
            if (dropdownBtn && dropdownContent) {
                if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                    dropdownContent.classList.remove('show');
                }
            }
        });
    }
}

// ========== INITIALIZATION (DITO ILALAGAY ANG DISPLAY FUNCTIONS) ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loading...");
    
    var userPhone = localStorage.getItem("userPhone");
    
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }
    
    // Display user phone
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        if (userPhone.length === 11) {
            display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11);
        } else {
            display.innerText = userPhone;
        }
    }
    
    // ========== DISPLAY BALANCE, INVITES, LEFT REWARD STATUS ==========
    displayBalance();           // Ipakita ang balance
    displayInvitesCount();     // Ipakita ang invites count
    updateLeftCardFromStorage(); // I-update ang left card visual
    renderInvitationsFromStorage(); // Ipakita ang invitations list
    
    // Initialize components
    initLeftLuckyCard();
    initClaimNowButton();
    initDropdownToggle();
    
    // Send invitation button
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        var newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        newSendBtn.onclick = window.sendInviteToStorage;
    }
    
    // Enter key support
    var friendInput = document.getElementById('friendPhoneInput');
    var sendButton = document.getElementById('sendInviteBtn');
    if (friendInput && sendButton) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendButton.click();
            }
        });
    }
    
    // Video autoplay
    var video = document.querySelector('.lucky-cat-video video');
    if (video) {
        video.play().catch(function(e) {
            console.log("Autoplay blocked:", e);
        });
    }
    
    // Facebook share
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = function() {
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank');
        };
    }
    
    console.log("Promotion.js ready");
    console.log("Current balance:", getBalance());
    console.log("Left reward claimed:", getLeftRewardClaimed());
    console.log("Invites count:", getInvitesCount());
});
