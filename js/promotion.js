/**
 * Promotion.js - Complete Referral System
 * Modules: Main Core, Timer, Ticker, Confetti, LuckyCat (Left), Referral System (Right + Invites)
 */

// ========== MAIN CORE MODULE (with Comma Formatting) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Sound cache - para iwas memory leak
    const soundCache = {
        scatter: null,
        claim: null,
        invite: null,
        success: null
    };
    
    // ========== HELPER: FORMAT NUMBER WITH COMMA ==========
    function formatNumberWithComma(number) {
        // Convert to number with 2 decimal places
        const num = Number(number).toFixed(2);
        
        // Split into whole and decimal parts
        const parts = num.split('.');
        const wholePart = parts[0];
        const decimalPart = parts[1];
        
        // Add commas to whole part (thousands separator)
        const wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        
        // Return formatted number
        return wholeWithCommas + '.' + decimalPart;
    }
    
    function initSounds() {
        try {
            soundCache.scatter = new Audio('sounds/super_ace_scatter_ring.mp3');
            soundCache.claim = new Audio('sounds/claim.wav');
            soundCache.invite = new Audio('sounds/invite.mp3');
            soundCache.success = new Audio('sounds/success.wav');
            
            soundCache.scatter.volume = 0.5;
            soundCache.claim.volume = 0.7;
            soundCache.invite.volume = 0.5;
            soundCache.success.volume = 0.6;
        } catch(e) {
            console.log('Sound initialization failed:', e);
        }
    }
    
    function playSound(soundName) {
        if (soundCache[soundName]) {
            soundCache[soundName].currentTime = 0;
            soundCache[soundName].play().catch(e => console.log('Sound error:', e));
        }
    }
    
        function init() {
        console.log('🎁 Promotion System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        // Display formatted phone number
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        initSounds();
        initFirebase();
        loadUserData();
        
        // Initialize all modules
        if (window.TimerModule) window.TimerModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();
        if (window.ReferralSystem) window.ReferralSystem.init();
        if (window.SimpleRightCard) window.SimpleRightCard.init();  // ← BAGO
        if (window.ConfettiModule) window.ConfettiModule.init();
        
        console.log('✅ All systems ready!');
    }
    
    function loadUserData() {
        if (!userRef) return;
        
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentBalance = data.balance || 0;
                if (window.LuckyCatModule) {
                    window.LuckyCatModule.setClaimed(data.claimed_luckycat || false);
                }
            } else {
                currentBalance = 0;
                userRef.set({ 
                    phone: userPhone, 
                    balance: 0, 
                    claimed_luckycat: false, 
                    status: "active", 
                    created_at: Date.now() 
                });
            }
            updateBalanceDisplay();
        }).catch(e => console.error('Load user error:', e));
        
        // Realtime balance listener
        userRef.child('balance').on('value', (snapshot) => {
            const balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
    }
    
    // ========== UPDATED: BALANCE DISPLAY WITH COMMA ==========
    function updateBalanceDisplay() {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
        
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) {
            popupBalance.innerText = "₱" + formatNumberWithComma(currentBalance);
        }
    }
    
    // ========== UPDATED: ANIMATION WITH COMMA ==========
    function animateBalanceSlow(start, end, duration, callback) {
        let startTimestamp = null;
        
        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(easeProgress * (end - start) + start);
            
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) {
                balanceEl.innerText = formatNumberWithComma(val);
            }
            
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) {
                popupBalance.innerText = "₱" + formatNumberWithComma(val);
            }
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        }
        requestAnimationFrame(step);
    }
    
    // ========== UPDATED: ADD TO BALANCE ==========
    function addToBalance(amount, slowAnimation = false) {
        const oldBalance = currentBalance;
        const newBalance = oldBalance + amount;
        
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, () => {
                currentBalance = newBalance;
                if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
                updateBalanceDisplay();
            });
        } else {
            currentBalance = newBalance;
            updateBalanceDisplay();
            if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
        }
        
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            setTimeout(() => { 
                if (balanceEl) balanceEl.style.transform = 'scale(1)'; 
            }, 200);
        }
    }
    
    // Export core functions
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef,
        formatNumberWithComma: formatNumberWithComma
    };
    
    // Start the system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


// ========== MODULE 1: TIMER ==========
window.TimerModule = (function() {
    'use strict';
    
    let timerInterval = null;
    let timerEndDate = null;
    let displayElement = null;
    const CYCLE_HOURS = 72;
    
    function init() {
        displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        
        try {
            const savedEnd = localStorage.getItem('timerEndDate');
            const now = Date.now();
            
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }
            start();
        } catch(e) { 
            console.error('Timer error:', e); 
        }
    }
    
    function start() {
        if (timerInterval) clearInterval(timerInterval);
        
        function update() {
            try {
                const now = Date.now();
                let diff = timerEndDate - now;
                
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                
                if (displayElement) {
                    displayElement.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } catch(e) { 
                console.error('Timer update error:', e); 
            }
        }
        
        update();
        timerInterval = setInterval(update, 1000);
    }
    
    return { init: init };
})();

// ========== MODULE 2: TICKER ==========
window.TickerModule = (function() {
    'use strict';
    
    let winnerSpan = null;
    let interval = null;
    
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    
    const amountRarity = [
        { amount: 150, weight: 20 },
        { amount: 300, weight: 18 },
        { amount: 450, weight: 15 },
        { amount: 600, weight: 12 },
        { amount: 750, weight: 10 },
        { amount: 900, weight: 8 },
        { amount: 1050, weight: 6 },   
        { amount: 1200, weight: 4 }, 
        { amount: 1350, weight: 3 }, 
        { amount: 1500, weight: 2 }    
    ];
    
    function generateRandomAmount() {
        let totalWeight = 0;
        for (let i = 0; i < amountRarity.length; i++) {
            totalWeight += amountRarity[i].weight;
        }
        
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        
        for (let i = 0; i < amountRarity.length; i++) {
            cumulative += amountRarity[i].weight;
            if (random <= cumulative) {
                return amountRarity[i].amount;
            }
        }
        return 150;
    }
    
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = generateRandomAmount();
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    
    function update() {
        if (winnerSpan) winnerSpan.innerHTML = generateWinner();
    }
    
    function init() {
        winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        
        update();
        if (interval) clearInterval(interval);
        interval = setInterval(update, 15000);
    }
    
    return { init: init };
})();

// ========== MODULE 3: CONFETTI ==========
window.ConfettiModule = (function() {
    'use strict';
    
    let canvas = null;
    let animation = null;
    let timeout = null;
    
    function init() {
        canvas = document.getElementById('confettiCanvas');
    }
    
    function start() {
        if (!canvas) return;
        stop();
        
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const ctx = canvas.getContext('2d');
        const particles = [];
        
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 6 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                speed: Math.random() * 3 + 2
            });
        }
        
        function draw() {
            if (!canvas || canvas.style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
                p.y += p.speed;
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
            });
            animation = requestAnimationFrame(draw);
        }
        
        draw();
        
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(stop, 3000);
    }
    
    function stop() {
        if (animation) cancelAnimationFrame(animation);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
        if (timeout) clearTimeout(timeout);
    }
    
    init();
    return { start: start, stop: stop };
})();

// ========== MODULE 4: LEFT LUCKY CAT ==========
window.LuckyCatModule = (function() {
    'use strict';
    
    let leftCard = null;
    let leftReward = null;
    let leftLabel = null;
    let isClaimed = false;
    let claimInProgress = false;
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        leftLabel = document.querySelector('#leftCard .prize-label');
        
        if (leftReward) {
            leftReward.innerHTML = '+₱150';
            leftReward.style.fontSize = '18px';
            leftReward.style.color = '#ffd700';
            leftReward.style.fontWeight = 'bold';
        }
        
        if (leftLabel && !isClaimed) {
            leftLabel.innerHTML = 'YOU GET';
        }
        
        if (leftCard) {
            const newCard = leftCard.cloneNode(true);
            leftCard.parentNode.replaceChild(newCard, leftCard);
            leftCard = newCard;
            leftCard.addEventListener('click', handleClaim);
            
            leftReward = document.getElementById('leftRewardAmount');
            leftLabel = document.querySelector('#leftCard .prize-label');
            
            const leftVideo = document.getElementById('leftCatVideo');
            if (leftVideo) {
                leftCard.addEventListener('click', function() {
                    if (leftVideo && leftVideo.muted) {
                        leftVideo.muted = false;
                        leftVideo.volume = 0.35;
                        leftVideo.play().catch(e => console.log(e));
                    }
                }, { once: true });
            }
        }
        
        checkClaimStatus();
        console.log('✅ LuckyCat Module ready');
    }
    
    async function checkClaimStatus() {
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (!userRef) {
            setTimeout(checkClaimStatus, 500);
            return;
        }
        
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            
            if (data && data.claimed_luckycat === true) {
                isClaimed = true;
                updateUI();
            }
        } catch(error) {
            console.error('Error checking claim status:', error);
        }
    }
    
    function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isClaimed) {
            alert("You have already claimed the Lucky Cat bonus!");
            return;
        }
        
        if (claimInProgress) {
            alert("Please wait, processing your claim...");
            return;
        }
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.claimed_luckycat === true) {
                    isClaimed = true;
                    updateUI();
                    alert("You have already claimed the Lucky Cat bonus!");
                    return;
                }
                processClaim();
            }).catch(() => processClaim());
        } else {
            processClaim();
        }
    }
    
    function processClaim() {
        claimInProgress = true;
        
        if (leftCard) {
            leftCard.style.pointerEvents = 'none';
            leftCard.style.opacity = '0.8';
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
            window.PromotionCore.addToBalance(150, true);
        }
        
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        isClaimed = true;
        updateUI();
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.update({ 
                claimed_luckycat: true,
                luckycat_claimed_at: Date.now()
            }).catch(e => console.error('Firebase save error:', e));
        }
        
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        if (leftLabel) {
            leftLabel.innerHTML = isClaimed ? 'ALREADY' : 'YOU GET';
            leftLabel.style.color = isClaimed ? '#ffd700' : '#ffd966';
            leftLabel.style.fontSize = isClaimed ? '10px' : '11px';
        }
        
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.animation = 'none';
            } else {
                leftReward.innerHTML = '+₱150';
                leftReward.style.fontSize = '18px';
                leftReward.style.animation = 'pulse-attract 1.5s infinite';
            }
        }
        
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
            }
        }
    }
    
    function setClaimed(claimed) {
        isClaimed = claimed;
        updateUI();
    }
    
    function getClaimed() {
        return isClaimed;
    }
    
    return { 
        init: init, 
        setClaimed: setClaimed, 
        getClaimed: getClaimed
    };
})();

// ========== MODULE 5: REFERRAL SYSTEM (REALTIME + ANTI-CHEAT + SOUNDS) ==========
window.ReferralSystem = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentDeviceId = null;
    
    // DOM Elements
    let dropdownBtn = null;
    let dropdownContent = null;
    let sendBtn = null;
    let friendInput = null;
    let sentListContainer = null;
    let receivedListContainer = null;
    let rightCard = null;
    let rightReward = null;
    
    // State
    let referralReward = 0;
    let isProcessing = false;
    
    const MAX_DISPLAY = 3;
    const MAX_EARNINGS = 1500;
    const THRESHOLD_WARNING = 1000;
    
    // ========== SOUND FUNCTIONS ==========
    function playInviteSound() {
        if (window.PromotionCore) {
            window.PromotionCore.playSound('invite');
        }
    }
    
    function playClaimSound() {
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
        }
    }
    
    function playSuccessSound() {
        if (window.PromotionCore) {
            window.PromotionCore.playSound('success');
        }
    }
    
    // ========== HELPER ==========
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 1px solid #ffd700;
            color: #ffd700; padding: 10px 20px; border-radius: 50px; font-size: 12px;
            font-weight: bold; z-index: 10002; animation: fadeOutUp 2s ease-out forwards;
            white-space: nowrap;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast) toast.remove(); }, 2000);
    }
    
    // ========== RIGHT CARD ANIMATION ==========
    function animateRightCard() {
        if (!rightCard) return;
        rightCard.classList.add('right-card-pulse');
        setTimeout(() => {
            if (rightCard) rightCard.classList.remove('right-card-pulse');
        }, 500);
    }
    
    function updateRightCardDisplay() {
        if (!rightReward) return;
        
        if (referralReward > 0) {
            rightReward.innerHTML = `+₱${referralReward}`;
            rightReward.style.fontSize = '20px';
            rightReward.style.color = '#ffd700';
            if (rightCard) {
                rightCard.style.border = '2px solid #ffd700';
                rightCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.6)';
            }
        } else {
            rightReward.innerHTML = '+₱150';
            rightReward.style.fontSize = '18px';
            rightReward.style.color = '#ffd700';
            if (rightCard) {
                rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
                rightCard.style.boxShadow = 'none';
            }
        }
    }
    
     // ========== ANTI-CHEAT & ANTI-GLITCH: CHECK IF USER CAN BE INVITED ==========
    async function canBeInvited(friendPhone) {
        // Check 1: Cannot invite yourself
        if (friendPhone === currentUserPhone) {
            return { allowed: false, reason: "self" };
        }
        
        // Check 2: Check if user is PERMANENTLY BLOCKED (completed_referrals)
        const completedRef = await userRef.child(`invites/completed_referrals/${friendPhone}`).once('value');
        if (completedRef.exists()) {
            return { allowed: false, reason: "permanently_blocked" };
        }
        
        // Check 3: Check if user already has a completed referral (CLAIMED status in sent invites)
        const user2Ref = db.ref('user_sessions/' + friendPhone);
        const user2Data = await user2Ref.once('value');
        const user2 = user2Data.val();
        
        if (user2) {
            // Check if user2 has already been referred successfully (CLAIMED status)
            const sentInvitesSnap = await user2Ref.child('invites/sent').once('value');
            const sentInvites = sentInvitesSnap.val() || {};
            
            for (let [toPhone, invite] of Object.entries(sentInvites)) {
                if (invite.status === 'claimed') {
                    return { allowed: false, reason: "already_referred" };
                }
            }
            
            // Check if user2 has any completed received invites
            const receivedInvitesSnap = await user2Ref.child('invites/received').once('value');
            const receivedInvites = receivedInvitesSnap.val() || {};
            
            for (let [fromPhone, invite] of Object.entries(receivedInvites)) {
                if (invite.status === 'completed') {
                    return { allowed: false, reason: "already_claimed" };
                }
            }
        }
        
        return { allowed: true, reason: null };
    }
    
    // ========== ANTI-CHEAT: CHECK DEVICE FINGERPRINT ==========
    async function isSameDevice(friendPhone) {
        if (!currentDeviceId) return false;
        
        const friendDeviceRef = db.ref('device_phone_map').orderByChild('phone').equalTo(friendPhone);
        const friendSnap = await friendDeviceRef.once('value');
        
        if (friendSnap.exists()) {
            let friendDeviceId = null;
            friendSnap.forEach((child) => { friendDeviceId = child.key; });
            if (friendDeviceId === currentDeviceId) {
                return true;
            }
        }
        return false;
    }
    
    // ========== ANTI-CHEAT: CHECK TOTAL EARNINGS LIMIT ==========
    async function checkEarningsLimit() {
        const earningsSnap = await userRef.child('referral_earnings').once('value');
        const currentEarnings = earningsSnap.val() || 0;
        
        if (currentEarnings >= MAX_EARNINGS) {
            return { reached: true, message: `You have reached the maximum earnings of ₱${MAX_EARNINGS}!` };
        }
        return { reached: false, message: null };
    }
    
    // ========== ANTI-CHEAT: CHECK THRESHOLD WARNING ==========
    async function checkThresholdWarning() {
        const earningsSnap = await userRef.child('referral_earnings').once('value');
        const currentEarnings = earningsSnap.val() || 0;
        
        if (currentEarnings >= THRESHOLD_WARNING && currentEarnings < MAX_EARNINGS) {
            return { triggered: true, message: `⚠️ You have reached ₱${currentEarnings}/${MAX_EARNINGS}. Complete Task #3 to continue claiming!` };
        }
        return { triggered: false, message: null };
    }
    
    // ========== ANTI-CHEAT WARNING DISPLAY ==========
    function showCheatingWarning(message) {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a0a0a, #2a1010); border: 2px solid #ff4444; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,68,68,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🚨</div>
                <h3 style="color: #ff4444;">CHEATING DETECTED!</h3>
                <p style="color: #fff;">${message}</p>
                <p style="color: #ff8888; font-size: 12px; margin-top: 10px;">This is your <strong>LAST WARNING!</strong></p>
                <button id="warningCloseBtn" style="background: #ff4444; border: none; padding: 10px 25px; border-radius: 30px; color: white; font-weight: bold; margin-top: 15px; cursor: pointer;">I UNDERSTAND</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
       function showCannotReinviteWarning(friendPhone, isPermanentlyBlocked = false) {
        const formatted = formatPhoneNumber(friendPhone);
        const message = isPermanentlyBlocked 
            ? `<p style="color: #fff;"><strong style="color: #ffd700;">${formatted}</strong> has been permanently blocked.</p>
               <p style="color: #ff8888; font-size: 12px;">You deleted this referral after it was claimed.<br>❌ You can NEVER invite this person again.</p>`
            : `<p style="color: #fff;"><strong style="color: #ffd700;">${formatted}</strong> has already claimed their reward.</p>
               <p style="color: #ff8888; font-size: 12px;">Each user can only be invited ONCE!</p>`;
        
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #ffaa33; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,170,51,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🔒</div>
                <h3 style="color: #ffaa33;">INVITE LOCKED!</h3>
                ${message}
                <button id="warningCloseBtn" style="background: #ffaa33; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; margin-top: 15px; cursor: pointer;">OK</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    function showMaxInviteWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #00aaff; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(0,170,255,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">📊</div>
                <h3 style="color: #00aaff;">LIMIT REACHED!</h3>
                <p style="color: #fff;">Maximum <strong style="color: #ffd700;">${MAX_DISPLAY}</strong> active invites only.</p>
                <p style="color: #ff8888; font-size: 12px;">Delete a pending invite first!</p>
                <button id="warningCloseBtn" style="background: #00aaff; border: none; padding: 10px 25px; border-radius: 30px; color: white; font-weight: bold; cursor: pointer;">OK</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 4000);
    }
    
    function showThresholdWarningMessage(message) {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #ffaa33; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,170,51,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">⚠️</div>
                <h3 style="color: #ffaa33;">THRESHOLD REACHED!</h3>
                <p style="color: #fff;">${message}</p>
                <p style="color: #ffaa33; font-size: 12px;">Complete Task #3 (Share on Facebook) to continue!</p>
                <button id="warningCloseBtn" style="background: #ffaa33; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; cursor: pointer;">OK</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    function showMaxEarningsMessage(message) {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #00ff88; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(0,255,136,0.3); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🏆</div>
                <h3 style="color: #00ff88;">MAX EARNINGS REACHED!</h3>
                <p style="color: #fff;">${message}</p>
                <p style="color: #ffaa33;">🎉 Thank you for being part of Lucky Drop!</p>
                <button id="warningCloseBtn" style="background: #00ff88; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; cursor: pointer;">AWESOME!</button>
            </div>
        `;
        document.body.appendChild(warningDiv);
        document.getElementById('warningCloseBtn').onclick = () => warningDiv.remove();
        setTimeout(() => { if (warningDiv) warningDiv.remove(); }, 5000);
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        currentDeviceId = localStorage.getItem("userDeviceId");
        
        if (!currentUserPhone) {
            console.log('No user phone found');
            return;
        }
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
            db = firebase.database();
        }
        
        // Get DOM elements
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        sentListContainer = document.getElementById('inviteListBody');
        receivedListContainer = document.getElementById('receivedInvitesList');
        rightCard = document.getElementById('rightCard');
        rightReward = document.getElementById('rightRewardAmount');
        
        // Setup dropdown
        if (dropdownBtn && dropdownContent) {
            const newBtn = dropdownBtn.cloneNode(true);
            dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
            dropdownBtn = newBtn;
            dropdownBtn.addEventListener('click', toggleDropdown);
            document.addEventListener('click', handleOutsideClick);
        }
        
        // Setup send button
        if (sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            sendBtn = newBtn;
            sendBtn.addEventListener('click', handleSendInvite);
        }
        
        // Setup enter key
        if (friendInput) {
            friendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendInvite();
            });
        }
        
        // Setup right card click
        if (rightCard) {
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            rightCard = newCard;
            rightCard.addEventListener('click', handleClaimReward);
        }
        
        // Setup realtime Firebase listeners
        setupRealtimeListeners();
        
        console.log('✅ Referral System ready');
    }
    
    // ========== REALTIME FIREBASE LISTENERS ==========
    function setupRealtimeListeners() {
        if (!userRef) return;
        
        // Listener for sent invites (My Invitations)
        userRef.child('invites/sent').on('value', (snapshot) => {
            renderSentInvites(snapshot);
        });
        
        // Listener for received invites (Received Invitation)
        userRef.child('invites/received').on('value', (snapshot) => {
            renderReceivedInvites(snapshot);
        });
        
        // REALTIME LISTENER FOR REFERRAL REWARD (RIGHT CARD)
        userRef.child('referralReward').on('value', (snapshot) => {
            const newReward = snapshot.val() || 0;
            const hadReward = referralReward > 0;
            const hasNewReward = newReward > 0;
            
            // Play success sound when new reward arrives
            if (!hadReward && hasNewReward) {
                playSuccessSound();
                animateRightCard();
            }
            
            referralReward = newReward;
            updateRightCardDisplay();
        });
        
        // Listener for status changes in sent invites
        userRef.child('invites/sent').on('child_changed', (snapshot) => {
            renderSentInvites(null);
        });
        
        // Listener for status changes in received invites
        userRef.child('invites/received').on('child_changed', (snapshot) => {
            renderReceivedInvites(null);
        });
    }
    
    // ========== SEND INVITE (with Anti-Cheat) ==========
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("📱 Please enter a valid 11-digit mobile number starting with 09");
            return;
        }
        
        // ANTI-CHEAT: Check if user can be invited
        const canInvite = await canBeInvited(friendPhone);
        if (!canInvite.allowed) {
            if (canInvite.reason === 'self') {
                showCheatingWarning("YOU CANNOT INVITE YOURSELF!");
            } else {
                showCannotReinviteWarning(friendPhone);
            }
            if (friendInput) friendInput.value = '';
            return;
        }
        
        // ANTI-CHEAT: Check same device
        const sameDevice = await isSameDevice(friendPhone);
        if (sameDevice) {
            showCheatingWarning("SAME DEVICE DETECTED! You cannot invite yourself using a different number.");
            if (friendInput) friendInput.value = '';
            return;
        }
        
        // Check current invites count
        const snap = await userRef.child('invites/sent').once('value');
        const sentInvites = snap.val() || {};
        const currentCount = Object.keys(sentInvites).length;
        
        if (currentCount >= MAX_DISPLAY) {
            showMaxInviteWarning();
            return;
        }
        
        if (sentInvites[friendPhone]) {
            alert("⚠️ You already invited this person!");
            return;
        }
        
        // Save to User1's sent invites
        await userRef.child(`invites/sent/${friendPhone}`).set({
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now()
        });
        
        // Save to User2's received invites
        const user2Ref = db.ref('user_sessions/' + friendPhone);
        
        await user2Ref.child(`invites/received/${currentUserPhone}`).set({
            from: currentUserPhone,
            status: 'waiting',
            timestamp: Date.now()
        });
        
        // Create referralReward field for User2 if not exists
        const currentUser2Reward = await user2Ref.child('referralReward').once('value');
        if (currentUser2Reward.val() === null) {
            await user2Ref.child('referralReward').set(0);
        }
        
        // Give referral reward to User2
        const newUser2Reward = (currentUser2Reward.val() || 0) + 150;
        await user2Ref.child('referralReward').set(newUser2Reward);
        
        playInviteSound();
        
        if (friendInput) friendInput.value = '';
        alert("🎉 Invitation sent successfully!");
    }
    
        // ========== DELETE INVITE (with permanent block for claimed referrals) ==========
    async function deleteInvitation(phoneToDelete) {
        const formattedPhone = formatPhoneNumber(phoneToDelete);
        
        // Get the invite data first
        const inviteSnap = await userRef.child(`invites/sent/${phoneToDelete}`).once('value');
        const inviteData = inviteSnap.val();
        
        if (!inviteData) {
            alert("❌ This invitation no longer exists.");
            return;
        }
        
        // ========== ANTI-GLITCH: Check if already CLAIMED ==========
        if (inviteData.status === 'claimed') {
            if (confirm(`⚠️ Remove ${formattedPhone} from your list?\n\nNOTE: This user has already claimed their reward.\n❌ You CANNOT invite this person again.\n✅ This will free up a slot for a NEW user.`)) {
                // Remove from active display
                await userRef.child(`invites/sent/${phoneToDelete}`).remove();
                
                // PERMANENTLY BLOCK - Save to completed referrals (para hindi na ma-invite ulit)
                await userRef.child(`invites/completed_referrals/${phoneToDelete}`).set({
                    phone: phoneToDelete,
                    completedAt: inviteData.timestamp,
                    permanentlyBlocked: true
                });
                
                alert(`✅ ${formattedPhone} removed from your list.\n\n⚠️ You CANNOT invite this person again.\n✨ You now have a FREE SLOT for a NEW user!`);
            }
            return;
        }
        
        // ========== For PENDING invites - normal delete ==========
        if (confirm(`🗑️ Delete pending invitation to ${formattedPhone}?\n\nThis will free up a slot for a new invite.`)) {
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            
            // Also delete from User2's received invites
            const user2Ref = db.ref('user_sessions/' + phoneToDelete);
            await user2Ref.child(`invites/received/${currentUserPhone}`).remove();
            
            alert(`✅ Pending invitation to ${formattedPhone} deleted.\n\n✨ You now have a FREE SLOT to invite someone new!`);
        }
    }
    
    // ========== CLAIM REWARD (with Anti-Cheat) ==========
    async function handleClaimReward(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isProcessing) {
            showToast("⏳ Please wait...");
            return;
        }
        
        if (referralReward <= 0) {
            showToast("📭 No reward to claim!");
            return;
        }
        
        // ANTI-CHEAT: Check earnings limit
        const limitCheck = await checkEarningsLimit();
        if (limitCheck.reached) {
            showMaxEarningsMessage(limitCheck.message);
            return;
        }
        
        // ANTI-CHEAT: Check threshold warning
        const thresholdCheck = await checkThresholdWarning();
        if (thresholdCheck.triggered) {
            showThresholdWarningMessage(thresholdCheck.message);
            return;
        }
        
        isProcessing = true;
        
        const claimAmount = referralReward;
        
        // Find which referral this reward came from
        const receivedSnap = await userRef.child('invites/received').once('value');
        const received = receivedSnap.val() || {};
        let claimedFrom = null;
        
        for (let [fromPhone, invite] of Object.entries(received)) {
            if (invite.status === 'waiting') {
                claimedFrom = fromPhone;
                break;
            }
        }
        
        // Update current user's referralReward to 0
        await userRef.child('referralReward').set(0);
        
        // Add to balance
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(claimAmount, true);
        }
        
        // Update earnings
        const currentEarnings = await userRef.child('referral_earnings').once('value');
        const newEarnings = (currentEarnings.val() || 0) + claimAmount;
        await userRef.child('referral_earnings').set(newEarnings);
        
        // If this reward came from a received invite
        if (claimedFrom) {
            // Mark received invite as completed
            await userRef.child(`invites/received/${claimedFrom}/status`).set('completed');
            
            // Update sender's sent invite status to 'claimed'
            const senderRef = db.ref('user_sessions/' + claimedFrom);
            await senderRef.child(`invites/sent/${currentUserPhone}/status`).set('claimed');
            
            // Give referral reward to sender
            const currentSenderReward = await senderRef.child('referralReward').once('value');
            if (currentSenderReward.val() === null) {
                await senderRef.child('referralReward').set(0);
            }
            
            const newSenderReward = (currentSenderReward.val() || 0) + 150;
            await senderRef.child('referralReward').set(newSenderReward);
        }
        
        playClaimSound();
        showToast(`🎉 ₱${claimAmount} added to your balance!`);
        
        isProcessing = false;
    }
    
    // ========== RENDER SENT INVITES ==========
    function renderSentInvites(snapshot) {
        if (!sentListContainer) return;
        
        if (!snapshot) {
            userRef.child('invites/sent').once('value', (s) => renderSentInvites(s));
            return;
        }
        
        const sent = snapshot.val() || {};
        const sentArray = Object.entries(sent);
        
        if (sentArray.length === 0) {
            sentListContainer.innerHTML = `<div class="invite-empty">📭 No invitations sent</div>`;
            return;
        }
        
        let html = '';
        let count = 0;
        
        for (let [phone, data] of sentArray) {
            if (count >= MAX_DISPLAY) break;
            
            const formattedPhone = formatPhoneNumber(phone);
            const statusText = data.status === 'claimed' ? '✓ CLAIMED' : '○ PENDING';
            const statusClass = data.status === 'claimed' ? 'approved' : 'pending';
            
            html += `
                <div class="invite-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="invite-item-action">
                        <button class="delete-invite" data-phone="${phone}">✕</button>
                    </div>
                </div>
            `;
            count++;
        }
        
        sentListContainer.innerHTML = html;
        
        document.querySelectorAll('.delete-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteInvitation(btn.dataset.phone);
            });
        });
    }
    
    // ========== RENDER RECEIVED INVITES ==========
    function renderReceivedInvites(snapshot) {
        if (!receivedListContainer) return;
        
        if (!snapshot) {
            userRef.child('invites/received').once('value', (s) => renderReceivedInvites(s));
            return;
        }
        
        const received = snapshot.val() || {};
        const receivedArray = Object.entries(received);
        
        if (receivedArray.length === 0) {
            receivedListContainer.innerHTML = '<div class="invite-empty">📭 No invitations received</div>';
            return;
        }
        
        receivedArray.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        let html = '';
        
        for (let [fromPhone, invite] of receivedArray) {
            const formattedPhone = formatPhoneNumber(fromPhone);
            const statusText = invite.status === 'completed' ? '✓ COMPLETED' : '○ WAITING';
            const statusClass = invite.status === 'completed' ? 'approved' : 'pending';
            const rewardDisplay = invite.status === 'completed' ? '+₱150' : '0';
            const rewardColor = invite.status === 'completed' ? '#ffd700' : '#666';
            
            html += `
                <div class="invite-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="invite-item-reward" style="color: ${rewardColor}">
                        ${rewardDisplay}
                    </div>
                </div>
            `;
        }
        
        receivedListContainer.innerHTML = html;
    }
    
    // ========== DROPDOWN FUNCTIONS ==========
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
    }
    
    function handleOutsideClick(e) {
        if (dropdownBtn && dropdownContent) {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
                const arrow = dropdownBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = '▼';
            }
        }
    }
    
// ========== SIMPLE RIGHT LUCKY CARD MODULE ==========
window.SimpleRightCard = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let rewardAmountElement = null;
    let rightCardElement = null;
    let currentReward = 0;
    let isChecking = false;
    
    // Initialize
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) {
            console.log('No user phone found for Right Card');
            return;
        }
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
        }
        
        rewardAmountElement = document.getElementById('rightRewardAmountDisplay');
        rightCardElement = document.getElementById('rightCard');
        
        if (!rewardAmountElement) {
            console.log('Right reward element not found - using fallback ID');
            // Fallback to old ID
            rewardAmountElement = document.getElementById('rightRewardAmount');
        }
        
        if (!rewardAmountElement) {
            console.error('Cannot find right reward element!');
            return;
        }
        
        // Set default display
        rewardAmountElement.innerHTML = '+₱150';
        
        // Attach click event
        if (rightCardElement) {
            const newCard = rightCardElement.cloneNode(true);
            rightCardElement.parentNode.replaceChild(newCard, rightCardElement);
            rightCardElement = newCard;
            rightCardElement.addEventListener('click', handleClaim);
        }
        
        // Start listening to Firebase
        startListening();
        
        console.log('✅ Simple Right Card Module ready');
    }
    
    // Listen to Firebase for referralReward changes
    function startListening() {
        if (!userRef) {
            setTimeout(startListening, 1000);
            return;
        }
        
        // Listen to referralReward field
        userRef.child('referralReward').on('value', (snapshot) => {
            const newValue = snapshot.val() || 0;
            console.log('🔥 Right Card reward changed:', currentReward, '→', newValue);
            
            if (newValue > currentReward) {
                // Reward increased - show animation
                animateRewardIncrease();
            }
            
            currentReward = newValue;
            updateDisplay();
            
            // Highlight card if has reward
            if (currentReward > 0 && rightCardElement) {
                rightCardElement.classList.add('card-highlight');
            } else if (rightCardElement) {
                rightCardElement.classList.remove('card-highlight');
            }
        });
    }
    
    // Update the display
        function updateDisplay() {
        if (!rewardAmountElement) return;
        
        if (currentReward > 0) {
            rewardAmountElement.innerHTML = `+₱${currentReward}`;
            rewardAmountElement.style.fontSize = '22px';
            rewardAmountElement.style.color = '#ffd700';
        } else {
            rewardAmountElement.innerHTML = `₱0`;
            rewardAmountElement.style.fontSize = '18px';
            rewardAmountElement.style.color = '#ffd700';
        }
    }
    
    // Animation when reward increases
    function animateRewardIncrease() {
        if (!rewardAmountElement) return;
        
        rewardAmountElement.classList.add('reward-increase');
        setTimeout(() => {
            if (rewardAmountElement) {
                rewardAmountElement.classList.remove('reward-increase');
            }
        }, 500);
        
        // Also pulse the card
        if (rightCardElement) {
            rightCardElement.classList.add('card-highlight');
        }
        
        // Play success sound if available
        if (window.PromotionCore) {
            window.PromotionCore.playSound('success');
        }
    }
    
    // Handle claim click
    async function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isChecking) {
            showMessage("⏳ Please wait...");
            return;
        }
        
        if (currentReward <= 0) {
            showMessage("📭 No reward to claim!");
            return;
        }
        
        isChecking = true;
        
        const claimAmount = currentReward;
        
        try {
            // Reset reward to 0
            await userRef.child('referralReward').set(0);
            
            // Add to balance
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(claimAmount, true);
            }
            
            // Update earnings
            const earningsSnap = await userRef.child('referral_earnings').once('value');
            const newEarnings = (earningsSnap.val() || 0) + claimAmount;
            await userRef.child('referral_earnings').set(newEarnings);
            
            // Find and update the referral that gave this reward
            const receivedSnap = await userRef.child('invites/received').once('value');
            const received = receivedSnap.val() || {};
            
            for (let [fromPhone, invite] of Object.entries(received)) {
                if (invite.status === 'waiting') {
                    await userRef.child(`invites/received/${fromPhone}/status`).set('completed');
                    
                    // Give reward to sender
                    const senderRef = db.ref('user_sessions/' + fromPhone);
                    const senderReward = await senderRef.child('referralReward').once('value');
                    await senderRef.child('referralReward').set((senderReward.val() || 0) + 150);
                    await senderRef.child(`invites/sent/${currentUserPhone}/status`).set('claimed');
                    break;
                }
            }
            
            // Play claim sound
            if (window.PromotionCore) {
                window.PromotionCore.playSound('claim');
            }
            
            showMessage(`🎉 ₱${claimAmount} added to your balance!`);
            
        } catch (error) {
            console.error('Claim error:', error);
            showMessage("❌ Error claiming reward. Please try again.");
        }
        
        isChecking = false;
    }
    
    function showMessage(msg) {
        const toast = document.createElement('div');
        toast.innerHTML = msg;
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: #1a1a2e; border: 1px solid #ffd700; color: #ffd700;
            padding: 10px 20px; border-radius: 50px; font-size: 12px;
            font-weight: bold; z-index: 10002; animation: fadeOutUp 2s ease-out forwards;
            white-space: nowrap;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast) toast.remove(); }, 2000);
    }
    
    return { init: init };
})();
