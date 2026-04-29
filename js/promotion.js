// ========== PROMOTION.JS - SHARE AND EARN ==========
// Using localStorage for data storage

// ========== GLOBAL VARIABLES ==========
var leftRewardClaimed = false;
var userBalance = 0;
var invitationsList = [];

// ========== LOAD DATA FROM LOCALSTORAGE ==========
function loadUserData() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    // Load left reward status
    var leftKey = "leftReward_" + phone;
    leftRewardClaimed = localStorage.getItem(leftKey) === 'true';
    
    // Load user balance
    var balanceKey = "userBalance_" + phone;
    userBalance = parseInt(localStorage.getItem(balanceKey)) || 0;
    
    // Load invitations
    var invitesKey = "invitations_" + phone;
    var storedInvites = localStorage.getItem(invitesKey);
    
    if (storedInvites) {
        invitationsList = JSON.parse(storedInvites);
    } else {
        invitationsList = [];
    }
    
    console.log("Data loaded - Left claimed:", leftRewardClaimed);
    console.log("Data loaded - Balance:", userBalance);
    console.log("Data loaded - Invitations:", invitationsList.length);
}

// ========== SAVE DATA TO LOCALSTORAGE ==========
function saveUserData() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    var balanceKey = "userBalance_" + phone;
    localStorage.setItem(balanceKey, userBalance.toString());
    
    var invitesKey = "invitations_" + phone;
    localStorage.setItem(invitesKey, JSON.stringify(invitationsList));
}

// ========== UPDATE BALANCE DISPLAY ==========
function updateBalanceDisplay() {
    var balanceSpan = document.getElementById('userBalanceDisplay');
    if (balanceSpan) {
        balanceSpan.innerHTML = '₱' + userBalance;
    }
}

// ========== UPDATE LEFT CARD VISUAL ==========
function updateLeftCardVisual() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    if (leftRewardClaimed) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
        leftCard.style.cursor = 'default';
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.classList.remove('prize-card-claimed');
        leftCard.style.cursor = 'pointer';
    }
}

// ========== RENDER INVITATIONS LIST (MINI DASHBOARD) ==========
function renderInvitationsList() {
    var listBody = document.getElementById('inviteListBody');
    if (!listBody) return;
    
    if (invitationsList.length === 0) {
        listBody.innerHTML = '<div class="invite-empty">No invitations sent</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < invitationsList.length; i++) {
        var inv = invitationsList[i];
        var formattedPhone = inv.phone.substring(0, 4) + '****' + inv.phone.substring(8, 11);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
        var disabled = inv.status === 'approved' ? 'disabled' : '';
        
        html += '<div class="invite-item">';
        html += '<div class="invite-item-phone">' + formattedPhone + '</div>';
        html += '<div class="invite-item-status"><span class="status-badge ' + statusClass + '">' + statusText + '</span></div>';
        html += '<div class="invite-item-action">';
        html += '<button class="delete-invite" onclick="deleteInvitation(\'' + inv.phone + '\')" ' + disabled + '>✕</button>';
        html += '</div>';
        html += '</div>';
    }
    listBody.innerHTML = html;
}

// ========== SEND INVITATION ==========
window.sendInvitation = function() {
    var friendPhone = document.getElementById('friendPhoneInput').value.trim();
    var userPhone = localStorage.getItem("userPhone");
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Please enter valid 11-digit number starting with 09");
        return;
    }
    
    if (friendPhone === userPhone) {
        alert("You cannot invite yourself!");
        return;
    }
    
    // Check if already invited
    var alreadyInvited = false;
    for (var i = 0; i < invitationsList.length; i++) {
        if (invitationsList[i].phone === friendPhone) {
            alreadyInvited = true;
            break;
        }
    }
    
    if (alreadyInvited) {
        alert("You already invited this person!");
        return;
    }
    
    // Add new invitation
    invitationsList.push({
        phone: friendPhone,
        status: 'pending',
        timestamp: Date.now()
    });
    
    saveUserData();
    renderInvitationsList();
    
    document.getElementById('friendPhoneInput').value = '';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = 'Invitation sent to ' + friendPhone.substring(0, 4) + '****' + friendPhone.substring(8, 11);
    }
    
    alert("Invitation sent to " + friendPhone);
};

// ========== DELETE INVITATION ==========
window.deleteInvitation = function(friendPhone) {
    var invite = null;
    for (var i = 0; i < invitationsList.length; i++) {
        if (invitationsList[i].phone === friendPhone) {
            invite = invitationsList[i];
            break;
        }
    }
    
    if (invite && invite.status === 'approved') {
        alert("Cannot delete approved invitation. User already claimed reward.");
        return;
    }
    
    if (confirm("Delete invitation to " + friendPhone + "?")) {
        var newList = [];
        for (var i = 0; i < invitationsList.length; i++) {
            if (invitationsList[i].phone !== friendPhone) {
                newList.push(invitationsList[i]);
            }
        }
        invitationsList = newList;
        saveUserData();
        renderInvitationsList();
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = 'Invitation deleted.';
        }
    }
};

// ========== LEFT LUCKY CAT (YOU GET - ₱150) ==========
function initLeftLuckyCat() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    updateLeftCardVisual();
    
    if (!leftRewardClaimed) {
        // Remove existing listeners
        var newCard = leftCard.cloneNode(true);
        leftCard.parentNode.replaceChild(newCard, leftCard);
        leftCard = newCard;
        
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (leftRewardClaimed) {
                alert("You already claimed your ₱150!");
                return;
            }
            
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            
            // Add ₱150 to balance
            userBalance += 150;
            leftRewardClaimed = true;
            
            // Save to localStorage
            var phone = localStorage.getItem("userPhone");
            localStorage.setItem("leftReward_" + phone, 'true');
            localStorage.setItem("userBalance_" + phone, userBalance.toString());
            
            // Update UI
            this.classList.remove('prize-card-glow');
            this.classList.add('prize-card-claimed');
            this.style.cursor = 'default';
            
            showFloatingPlus(x, y, 150);
            startConfetti();
            
            updateBalanceDisplay();
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '+₱150 claimed! Your balance: ₱' + userBalance;
            }
            
            updateIndicator(1);
        });
    }
}

// ========== INDICATOR SYSTEM ==========
function updateIndicator(step) {
    var indicator1 = document.getElementById('indicator1');
    
    if (indicator1) {
        indicator1.classList.remove('indicator-yellow-red', 'indicator-hold');
        
        if (step === 0) {
            indicator1.classList.add('indicator-yellow-red');
        } else if (step === 1) {
            indicator1.classList.add('indicator-hold');
            indicator1.style.background = '#ffd700';
            indicator1.style.boxShadow = '0 0 15px #ffd700';
        }
    }
}

// ========== FLOATING +150 ANIMATION ==========
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

// ========== CLAIM NOW BUTTON ==========
function initClaimNowButton() {
    var claimNowBtn = document.getElementById('claimNowBtn');
    
    if (claimNowBtn) {
        var newBtn = claimNowBtn.cloneNode(true);
        claimNowBtn.parentNode.replaceChild(newBtn, claimNowBtn);
        
        newBtn.onclick = function() {
            console.log("CLAIM NOW clicked");
            
            if (!leftRewardClaimed) {
                alert("Click the GOLDEN CARD first to claim your ₱150!");
                return;
            }
            
            // Show popup with balance
            var popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) {
                popupBalance.innerHTML = '₱' + userBalance;
            }
            
            showPrizePopup();
        };
        
        console.log("CLAIM NOW button ready");
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
    
    // Display user phone
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        if (userPhone.length === 11) {
            display.innerText = userPhone.substring(0, 4) + '****' + userPhone.substring(8, 11);
        } else {
            display.innerText = userPhone;
        }
    }
    
    // Load data from localStorage
    loadUserData();
    updateBalanceDisplay();
    renderInvitationsList();
    
    // Initialize components
    initLeftLuckyCat();
    initClaimNowButton();
    
    // Send invitation button
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        var newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        newSendBtn.onclick = window.sendInvitation;
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
    
    // Dropdown toggle
    var dropdownBtn = document.getElementById('dropdownBtn');
    var dropdownContent = document.getElementById('dropdownContent');
    if (dropdownBtn && dropdownContent) {
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
    console.log("User balance:", userBalance);
    console.log("Left reward claimed:", leftRewardClaimed);
});
