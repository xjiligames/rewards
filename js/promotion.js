// ========== PROMOTION.JS - SHARE AND EARN ==========

// ========== GLOBAL VARIABLES ==========
var leftRewardClaimed = false;
var rightRewardAmount = 0;
var rightRewardClaimed = 0;
var remainingInvites = 6;
var acceptedInvitesCount = 0;

// ========== INITIALIZE PARTICIPANT ==========
async function initParticipant() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var participantRef = db.ref('participants/' + phone);
        var snapshot = await participantRef.once('value');
        
        if (!snapshot.exists()) {
            await participantRef.set({
                phone: phone,
                firstVisit: Date.now(),
                lastActive: Date.now(),
                totalInvites: 0,
                acceptedInvites: 0,
                remainingInvites: 6,
                leftRewardClaimed: false,
                rightRewardClaimed: 0,
                rightRewardTotal: 0
            });
            remainingInvites = 6;
            acceptedInvitesCount = 0;
            rightRewardAmount = 0;
        } else {
            var data = snapshot.val();
            remainingInvites = data.remainingInvites || 6;
            acceptedInvitesCount = data.acceptedInvites || 0;
            leftRewardClaimed = data.leftRewardClaimed || false;
            rightRewardClaimed = data.rightRewardClaimed || 0;
            rightRewardAmount = acceptedInvitesCount * 150;
            
            updateLeftCardVisual();
            updateRightCardVisual();
            updateRightRewardDisplay();
        }
    }
}

// ========== UPDATE RIGHT REWARD DISPLAY ==========
function updateRightRewardDisplay() {
    var rightAmountSpan = document.getElementById('rightRewardAmount');
    if (rightAmountSpan) {
        var available = rightRewardAmount - (rightRewardClaimed * 150);
        rightAmountSpan.innerHTML = '₱' + available;
    }
}

// ========== CREATE INVITATION ==========
async function createInvitation(friendPhone) {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        var participantSnap = await db.ref('participants/' + userPhone).once('value');
        var remaining = participantSnap.exists() ? participantSnap.val().remainingInvites : 6;
        
        if (remaining <= 0) {
            alert("You have reached the maximum of 6 invites!");
            return false;
        }
        
        var inviteRef = db.ref('invitations/' + userPhone + '/' + friendPhone);
        var existingInvite = await inviteRef.once('value');
        
        if (existingInvite.exists()) {
            alert("You already invited this person!");
            return false;
        }
        
        await inviteRef.set({
            invitedBy: userPhone,
            invitedPhone: friendPhone,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        var newRemaining = remaining - 1;
        await db.ref('participants/' + userPhone).update({
            totalInvites: (participantSnap.val().totalInvites || 0) + 1,
            remainingInvites: newRemaining,
            lastActive: Date.now()
        });
        
        remainingInvites = newRemaining;
        return true;
    }
    return false;
}

// ========== ACCEPT INVITATION ==========
async function acceptInvitation(inviterPhone) {
    var currentUserPhone = localStorage.getItem("userPhone");
    if (!currentUserPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        var inviteRef = db.ref('invitations/' + inviterPhone + '/' + currentUserPhone);
        await inviteRef.update({
            status: 'accepted',
            acceptedAt: Date.now()
        });
        
        var inviterRef = db.ref('participants/' + inviterPhone);
        var inviterSnap = await inviterRef.once('value');
        
        if (inviterSnap.exists()) {
            var newAccepted = (inviterSnap.val().acceptedInvites || 0) + 1;
            var newRightTotal = newAccepted * 150;
            
            await inviterRef.update({
                acceptedInvites: newAccepted,
                rightRewardTotal: newRightTotal,
                lastActive: Date.now()
            });
            
            if (inviterPhone === localStorage.getItem("userPhone")) {
                acceptedInvitesCount = newAccepted;
                rightRewardAmount = newRightTotal;
                updateRightCardVisual();
                updateRightRewardDisplay();
                
                var statusMsg = document.getElementById('statusMessage');
                if (statusMsg) {
                    statusMsg.innerHTML = '🎉 A friend accepted your invite! +₱150 available on FRIEND GETS card!';
                }
            }
        }
        return true;
    }
    return false;
}

// ========== LEFT LUCKY CAT ==========
function initLeftLuckyCat() {
    var leftCard = document.getElementById('leftCard');
    if (!leftCard) return;
    
    if (leftRewardClaimed) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
    } else {
        leftCard.classList.add('prize-card-glow');
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (leftRewardClaimed) {
                alert("You already claimed your ₱150!");
                return;
            }
            
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            
            leftRewardClaimed = true;
            
            var phone = localStorage.getItem("userPhone");
            if (typeof firebase !== 'undefined' && firebase.database) {
                var db = firebase.database();
                db.ref('participants/' + phone).update({
                    leftRewardClaimed: true,
                    leftRewardAmount: 150,
                    leftRewardClaimedAt: Date.now()
                });
            }
            
            this.classList.remove('prize-card-glow');
            this.classList.add('prize-card-claimed');
            
            showFloatingPlus(x, y, 150);
            startConfetti();
            
            var progressFill = document.getElementById('progressFill');
            if (progressFill) progressFill.style.width = '33%';
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '🎉 +₱150 claimed! Invite friends to get more!';
            }
            
            updateIndicator(1);
        });
    }
}

// ========== RIGHT LUCKY CAT ==========
function initRightLuckyCat() {
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    
    var available = rightRewardAmount - (rightRewardClaimed * 150);
    
    function updateCardDisplay() {
        var avail = rightRewardAmount - (rightRewardClaimed * 150);
        
        if (avail <= 0 && rightRewardAmount > 0) {
            rightCard.classList.add('prize-card-claimed');
            rightCard.classList.remove('prize-card-pulse', 'prize-card-glow');
        } else if (rightRewardAmount > 0) {
            rightCard.classList.add('prize-card-pulse');
            rightCard.classList.remove('prize-card-claimed', 'prize-card-glow');
        } else {
            rightCard.classList.add('prize-card-glow');
            rightCard.classList.remove('prize-card-pulse', 'prize-card-claimed');
        }
    }
    
    rightCard.addEventListener('click', function(e) {
        e.stopPropagation();
        
        var availableNow = rightRewardAmount - (rightRewardClaimed * 150);
        
        if (rightRewardAmount === 0) {
            alert("No rewards yet! Invite friends to earn ₱150 each.");
            return;
        }
        
        if (availableNow <= 0) {
            alert("You already claimed all your rewards from invites!");
            return;
        }
        
        var rect = this.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        
        rightRewardClaimed++;
        
        var phone = localStorage.getItem("userPhone");
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            db.ref('participants/' + phone).update({
                rightRewardClaimed: rightRewardClaimed,
                lastClaimAt: Date.now()
            });
        }
        
        showFloatingPlus(x, y, 150);
        startConfetti();
        updateCardDisplay();
        updateRightRewardDisplay();
        
        var progressFill = document.getElementById('progressFill');
        if (progressFill) {
            var totalSteps = (rightRewardAmount / 150) + (leftRewardClaimed ? 1 : 0);
            var completedSteps = rightRewardClaimed + (leftRewardClaimed ? 1 : 0);
            var percent = (completedSteps / totalSteps) * 100;
            progressFill.style.width = Math.min(percent, 100) + '%';
        }
        
        var newAvailable = rightRewardAmount - (rightRewardClaimed * 150);
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '🎉 +₱150 claimed! ' + (newAvailable > 0 ? newAvailable + ' more available!' : 'All rewards claimed!');
        }
    });
    
    updateCardDisplay();
}

// ========== UPDATE VISUALS ==========
function updateLeftCardVisual() {
    var leftCard = document.getElementById('leftCard');
    if (leftCard && leftRewardClaimed) {
        leftCard.classList.add('prize-card-claimed');
        leftCard.classList.remove('prize-card-glow');
    }
}

function updateRightCardVisual() {
    var rightCard = document.getElementById('rightCard');
    if (!rightCard) return;
    
    var available = rightRewardAmount - (rightRewardClaimed * 150);
    
    if (available <= 0 && rightRewardAmount > 0) {
        rightCard.classList.add('prize-card-claimed');
        rightCard.classList.remove('prize-card-pulse', 'prize-card-glow');
    } else if (rightRewardAmount > 0) {
        rightCard.classList.add('prize-card-pulse');
        rightCard.classList.remove('prize-card-claimed', 'prize-card-glow');
    } else {
        rightCard.classList.add('prize-card-glow');
        rightCard.classList.remove('prize-card-pulse', 'prize-card-claimed');
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

// ========== SHARE BUTTON (WITH POPUP) ==========
async function handleShare() {
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
    
    var success = await createInvitation(friendPhone);
    
    if (success) {
        document.getElementById('friendPhoneInput').value = '';
        
        var progressFill = document.getElementById('progressFill');
        if (progressFill && !leftRewardClaimed) {
            progressFill.style.width = '33%';
        } else if (progressFill && leftRewardClaimed) {
            progressFill.style.width = '66%';
        }
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '✅ Invitation sent! Remaining invites: ' + remainingInvites;
        }
        
        // SHOW POPUP HERE
        showPrizePopup();
    }
}

function initShareButton() {
    var shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        var newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
    }
}

// ========== FACEBOOK SHARE ==========
function handleFacebookShare() {
    var shareUrl = "https://xjiligames.github.io/rewards/index.html";
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '✅ Shared on Facebook!';
    }
}

function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = handleFacebookShare;
    }
}

// ========== CLAIM BUTTON ==========
function handleClaimGCash() {
    if (!leftRewardClaimed) {
        alert("⚠️ Click the GOLDEN CARD first to get your ₱150!");
        return;
    }
    
    alert("💰 ₱150 claimed! Thank you for playing Lucky Drop!");
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '✅ ₱150 claimed successfully!';
    }
}

function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = handleClaimGCash;
    }
}

// ========== ENTER KEY SUPPORT ==========
function initEnterKeySupport() {
    var friendInput = document.getElementById('friendPhoneInput');
    var shareBtn = document.getElementById('shareButton');
    
    if (friendInput && shareBtn) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                shareBtn.click();
            }
        });
    }
}

// ========== VIDEO AUTOPLAY ==========
function initVideoAutoplay() {
    var video = document.querySelector('.lucky-cat-video video');
    if (video) {
        video.play().catch(function(e) {
            console.log("Autoplay blocked:", e);
        });
    }
}

// ========== CHECK EXISTING INVITES ==========
async function checkExistingInvites() {
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
                    console.log("Auto-accepted invitation from: " + inviter);
                }
            }
        }
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Promotion.js loading...");
    
    var userPhone = localStorage.getItem("userPhone");
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        display.innerText = userPhone || 'Not logged in';
    }
    
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }
    
    await initParticipant();
    await checkExistingInvites();
    
    initLeftLuckyCat();
    initRightLuckyCat();
    initShareButton();
    initFacebookShare();
    initClaimButton();
    initEnterKeySupport();
    initVideoAutoplay();
    
    updateRightRewardDisplay();
    
    console.log("Promotion.js ready");
});
