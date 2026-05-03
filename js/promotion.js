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
        if (window.ConfettiModule) window.ConfettiModule.init();
        
        console.log('✅ All systems ready!');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('Firebase config not found!');
            return;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) { 
            console.error('Firebase error:', e); 
        }
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

 // ========== MODULE 5: REFERRAL SYSTEM (REALTIME) ==========
window.ReferralSystem = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    
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
    
    // ========== HELPER ==========
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
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
    
    // ========== INITIALIZATION ==========
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        
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
        
        // ========== REALTIME LISTENER FOR REFERRAL REWARD (RIGHT CARD) ==========
        userRef.child('referralReward').on('value', (snapshot) => {
            const newReward = snapshot.val() || 0;
            const hadReward = referralReward > 0;
            const hasNewReward = newReward > 0;
            
            console.log(`💰 Referral Reward changed: ${referralReward} → ${newReward}`);
            
            // Only animate if it's a new reward (increased from 0 to positive)
            if (!hadReward && hasNewReward) {
                animateRightCard();
            }
            
            referralReward = newReward;
            updateRightCardDisplay();
        });
        
        // Listener for status changes in sent invites (para realtime update kay User1)
        userRef.child('invites/sent').on('child_changed', (snapshot) => {
            const changedInvite = snapshot.val();
            if (changedInvite) {
                console.log(`🔄 Sent invite status changed to: ${changedInvite.status}`);
                renderSentInvites(null); // Trigger re-render
            }
        });
        
        // Listener for status changes in received invites (para realtime update kay User2)
        userRef.child('invites/received').on('child_changed', (snapshot) => {
            const changedInvite = snapshot.val();
            if (changedInvite) {
                console.log(`🔄 Received invite status changed to: ${changedInvite.status}`);
                renderReceivedInvites(null);
            }
        });
    }
    
    // ========== SEND INVITE (User1) ==========
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("📱 Please enter a valid 11-digit mobile number starting with 09");
            return;
        }
        
        if (friendPhone === currentUserPhone) {
            alert("⚠️ You cannot invite yourself!");
            return;
        }
        
        // Check current invites count
        const snap = await userRef.child('invites/sent').once('value');
        const sentInvites = snap.val() || {};
        const currentCount = Object.keys(sentInvites).length;
        
        if (currentCount >= MAX_DISPLAY) {
            alert(`⚠️ Maximum ${MAX_DISPLAY} invites only. Delete one first.`);
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
        
        // Save to User2's received invites AND give referral reward
        const user2Ref = db.ref('user_sessions/' + friendPhone);
        
        await user2Ref.child(`invites/received/${currentUserPhone}`).set({
            from: currentUserPhone,
            status: 'waiting',
            timestamp: Date.now()
        });
        
        // Give referral reward to User2 (this will trigger their Right Card animation)
        await user2Ref.child('referralReward').transaction(current => {
            return (current || 0) + 150;
        });
        
        if (friendInput) friendInput.value = '';
        alert("🎉 Invitation sent successfully!");
    }
    
    // ========== DELETE INVITE (User1 - always clickable) ==========
    async function deleteInvitation(phoneToDelete) {
        const formattedPhone = formatPhoneNumber(phoneToDelete);
        
        if (confirm(`🗑️ Delete invitation to ${formattedPhone}?`)) {
            // Delete from User1's sent invites
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            
            // Also delete from User2's received invites
            const user2Ref = db.ref('user_sessions/' + phoneToDelete);
            await user2Ref.child(`invites/received/${currentUserPhone}`).remove();
            
            alert(`✅ Invitation to ${formattedPhone} deleted.`);
        }
    }
    
    // ========== CLAIM REWARD (User2 clicks Right Card) ==========
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
        
        // Update User2's data
        await userRef.child('referralReward').set(0);
        
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(claimAmount, true);
        }
        
        // If there's a pending referral, mark it as completed
        if (claimedFrom) {
            await userRef.child(`invites/received/${claimedFrom}/status`).set('completed');
            
            // Update User1's sent invite status to 'claimed'
            const user1Ref = db.ref('user_sessions/' + claimedFrom);
            await user1Ref.child(`invites/sent/${currentUserPhone}/status`).set('claimed');
            
            // Give referral reward to User1 (so they can claim too)
            await user1Ref.child('referralReward').transaction(current => {
                return (current || 0) + 150;
            });
            
            console.log(`✅ User ${claimedFrom} received referral reward`);
        }
        
        showToast(`🎉 ₱${claimAmount} added to your balance!`);
        
        isProcessing = false;
    }
    
    // ========== RENDER SENT INVITES (My Invitations) ==========
    function renderSentInvites(snapshot) {
        if (!sentListContainer) return;
        
        // If snapshot is null, get data manually
        if (!snapshot) {
            userRef.child('invites/sent').once('value', (s) => {
                renderSentInvites(s);
            });
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
        
        // Attach delete events
        document.querySelectorAll('.delete-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteInvitation(btn.dataset.phone);
            });
        });
    }
    
    // ========== RENDER RECEIVED INVITES (Received Invitation) ==========
    function renderReceivedInvites(snapshot) {
        if (!receivedListContainer) return;
        
        // If snapshot is null, get data manually
        if (!snapshot) {
            userRef.child('invites/received').once('value', (s) => {
                renderReceivedInvites(s);
            });
            return;
        }
        
        const received = snapshot.val() || {};
        const receivedArray = Object.entries(received);
        
        if (receivedArray.length === 0) {
            receivedListContainer.innerHTML = '<div class="invite-empty">📭 No invitations received</div>';
            return;
        }
        
        // Sort newest to oldest
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
    
    // ========== TOAST MESSAGE ==========
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
    
    return { init: init };
})();