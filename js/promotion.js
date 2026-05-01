/**
 * Promotion.js - Combined Modules with LuckyCat Priority
 * Order: 10(Main Core) | 1(Timer) | 2(Dropdown) | 3(Ticker) | 6(Popup) | 7(Claim Button) | 9(Share/Facebook) | 8(LuckyCat)
 */

// ========== MODULE: MAIN CORE (UNA) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Global modules container
    window.PromotionModules = window.PromotionModules || {};
    
    function init() {
        console.log('🎁 Promotion System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        // Display phone number
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        // Initialize Firebase
        initFirebase();
        loadUserData();
        
        // Initialize all modules in order
        if (window.TimerModule) window.TimerModule.init();
        if (window.DropdownModule) window.DropdownModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.ShareModule) window.ShareModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();  // LUCKY CAT MODULE
        
        console.log('✅ All systems ready!');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') return;
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) { console.error('Firebase error:', e); }
    }
    
    function loadUserData() {
        if (!userRef) return;
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentBalance = data.balance || 0;
                if (window.LuckyCatModule) window.LuckyCatModule.setClaimed(data.claimed_luckycat || false);
            } else {
                currentBalance = 0;
                userRef.set({ phone: userPhone, balance: 0, claimed_luckycat: false, status: "active", created_at: Date.now() });
            }
            updateBalanceDisplay();
        }).catch(e => console.error(e));
        
        userRef.child('balance').on('value', (snapshot) => {
            const balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
    }
    
    function updateBalanceDisplay() {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = currentBalance.toFixed(2);
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) popupBalance.innerText = "₱" + currentBalance.toFixed(2);
    }
    
    function animateBalanceSlow(start, end, duration, callback) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(easeProgress * (end - start) + start);
            
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = val.toFixed(2);
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) popupBalance.innerText = "₱" + val.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        };
        requestAnimationFrame(step);
    }
    
    function addToBalance(amount, slowAnimation = false) {
        const oldBalance = currentBalance;
        const newBalance = oldBalance + amount;
        
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, () => {
                currentBalance = newBalance;
                if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
            });
        } else {
            currentBalance = newBalance;
            updateBalanceDisplay();
            if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
        }
        
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            setTimeout(() => { if (balanceEl) balanceEl.style.transform = 'scale(1)'; }, 200);
        }
    }
    
    function playSound(soundName) {
        const sounds = {
            scatter: new Audio('sounds/super_ace_scatter_ring.mp3'),
            claim: new Audio('sounds/claim.mp3'),
            invite: new Audio('sounds/invite.mp3'),
            success: new Audio('sounds/success.mp3')
        };
        if (sounds[soundName]) {
            sounds[soundName].volume = 0.5;
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.log(e));
        }
    }
    
    // Export core functions for other modules
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef
    };
    
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
    const CYCLE_HOURS = 72;
    let displayElement = null;
    
    function init() {
        displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        try {
            let savedEnd = localStorage.getItem('timerEndDate');
            let now = Date.now();
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }
            start();
        } catch(e) { console.error('Timer error:', e); }
    }
    
    function start() {
        if (timerInterval) clearInterval(timerInterval);
        function update() {
            try {
                let now = Date.now();
                let diff = timerEndDate - now;
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                let days = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                let minutes = Math.floor((diff / (1000 * 60)) % 60);
                let seconds = Math.floor((diff / 1000) % 60);
                if (displayElement) {
                    displayElement.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } catch(e) { console.error('Timer update error:', e); }
        }
        update();
        timerInterval = setInterval(update, 1000);
    }
    
    return { init: init };
})();


// ========== MODULE 2: TICKER (REMASTERED - Weighted) ==========
window.TickerModule = (function() {
    'use strict';
    
    let winnerSpan = null;
    let interval = null;
    
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    
    // WEIGHTED AMOUNTS - Mas rare ang 600+
    const amountRarity = [
        { amount: 100, weight: 20 },   // 20% chance
        { amount: 150, weight: 18 },   // 18% chance
        { amount: 200, weight: 15 },   // 15% chance
        { amount: 250, weight: 12 },   // 12% chance
        { amount: 300, weight: 10 },   // 10% chance
        { amount: 350, weight: 8 },    // 8% chance
        { amount: 400, weight: 6 },    // 6% chance
        { amount: 450, weight: 4 },    // 4% chance
        { amount: 500, weight: 3 },    // 3% chance
        { amount: 600, weight: 2 },    // 2% chance (rare)
        { amount: 750, weight: 1 },    // 1% chance (very rare)
        { amount: 900, weight: 0.5 },  // 0.5% chance (ultra rare)
        { amount: 1000, weight: 0.3 }, // 0.3% chance (legendary)
        { amount: 1500, weight: 0.2 }  // 0.2% chance (mythic)
    ];
    
    function generateRandomAmount() {
        // Calculate total weight
        let totalWeight = 0;
        for (let i = 0; i < amountRarity.length; i++) {
            totalWeight += amountRarity[i].weight;
        }
        
        // Random selection based on weight
        let random = Math.random() * totalWeight;
        let cumulative = 0;
        
        for (let i = 0; i < amountRarity.length; i++) {
            cumulative += amountRarity[i].weight;
            if (random <= cumulative) {
                return amountRarity[i].amount;
            }
        }
        
        return 150; // default fallback
    }
    
    function init() {
        winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        
        update();
        if (interval) clearInterval(interval);
        interval = setInterval(update, 15000);
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
    
    return { init: init };
})();


// ========== MODULE 5 CONFETTI MODULE (For Popup) ==========
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
                if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
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

// ========== MODULE 6: LUCKY CAT (FIXED - MAY LOAD CHECK) ==========
window.LuckyCatModule = (function() {
    'use strict';
    
    let leftCard = null;
    let leftReward = null;
    let leftLabel = null;  // <- BAGO: para sa "YOU GET" / "ALREADY"
    let luckyCatStatus = null;
    let isClaimed = false;
    let claimInProgress = false;
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        leftLabel = document.querySelector('#leftCard .prize-label');  // <- BAGO
        luckyCatStatus = document.getElementById('luckyCatStatus');
        
        // AGAD I-DISPLAY ANG DEFAULT (para hindi blank)
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
            
            // Re-get elements after clone
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
        
        // ✅ Tumawag agad sa Firebase para malaman kung claimed na
        checkClaimStatusFromFirebase();
        
        console.log('✅ LuckyCat Module ready - checking claim status...');
    }
    
    // ✅ Nagche-check sa Firebase pag-load ng page
    async function checkClaimStatusFromFirebase() {
        console.log('🔍 Checking LuckyCat claim status from Firebase...');
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        
        if (!userRef) {
            console.log('⏳ Waiting for Firebase reference...');
            setTimeout(checkClaimStatusFromFirebase, 500);
            return;
        }
        
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            
            if (data) {
                const claimed = data.claimed_luckycat === true;
                console.log('📊 Firebase data:', { claimed: claimed, balance: data.balance });
                
                if (claimed) {
                    isClaimed = true;
                    console.log('✅ LuckyCat is already CLAIMED from Firebase');
                } else {
                    isClaimed = false;
                    console.log('✅ LuckyCat is AVAILABLE');
                }
                updateUI();
            } else {
                console.log('New user - LuckyCat is AVAILABLE');
                isClaimed = false;
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
            alert("You' have already claimed the Lucky Cat bonus!");
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
        }
        
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150, true);
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
        
        const userPhone = window.PromotionCore ? window.PromotionCore.getUserPhone() : null;
        if (userPhone) {
            localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        }
        
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        // ✅ UPDATE LABEL: "YOU GET" → "ALREADY" kapag claimed
        if (leftLabel) {
            if (isClaimed) {
                leftLabel.innerHTML = 'ALREADY';
                leftLabel.style.color = '#ffd700';
                leftLabel.style.fontSize = '10px';
            } else {
                leftLabel.innerHTML = 'YOU GET';
                leftLabel.style.color = '#ffd966';
                leftLabel.style.fontSize = '11px';
            }
        }
        
        // ✅ UPDATE REWARD DISPLAY: "+₱150" → "CLAIMED" kapag claimed
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'none';
            } else {
                leftReward.innerHTML = '+₱150';
                leftReward.style.fontSize = '18px';
                leftReward.style.letterSpacing = 'normal';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'pulse-attract 1.5s infinite';
            }
        }
        
        // ✅ UPDATE CARD STYLE
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.border = '3px solid #ffd700';
                leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), inset 0 0 10px rgba(255,215,0,0.3)';
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
                leftCard.style.animation = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.border = '';
                leftCard.style.boxShadow = '';
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
                leftCard.style.animation = 'card-attract 1.5s ease-in-out infinite';
            }
        }
        
        // ✅ UPDATE STATUS TEXT
        if (luckyCatStatus) {
            if (isClaimed) {
                luckyCatStatus.innerText = "Claimed";
                luckyCatStatus.classList.add('claimed');
            } else {
                luckyCatStatus.innerText = "Available";
                luckyCatStatus.classList.remove('claimed');
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
        getClaimed: getClaimed,
        checkClaimStatusFromFirebase: checkClaimStatusFromFirebase
    };
})();

// ========== MODULE 6: DROPDOWN ==========
window.DropdownModule = (function() {
    'use strict';
    let dropdownBtn = null;
    let dropdownContent = null;
    
    function init() {
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        if (!dropdownBtn || !dropdownContent) return;
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggle);
        document.addEventListener('click', handleOutsideClick);
    }
    
    function toggle(e) {
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

// ========== MODULE 7: INVITE LOGIC ==========
window.InviteModule = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let sendBtn = null;
    let friendInput = null;
    let listContainer = null;
    
    // Threshold limits
    const MAX_EARNINGS = 900;  // Maximum 900
    let currentEarnings = 0;    // Current earnings from claimed invites
    
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) return;
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
        }
        
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        listContainer = document.getElementById('inviteListBody');
        
        if (sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            sendBtn = newBtn;
            sendBtn.addEventListener('click', handleSendInvite);
        }
        
        if (friendInput) {
            friendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendInvite();
            });
        }
        
        // Load data from Firebase
        loadInviteData();
        
        console.log('✅ Invite Module ready');
    }
    
    async function loadInviteData() {
        if (!userRef) return;
        
        try {
            const snapshot = await userRef.child('invites').once('value');
            const data = snapshot.val() || {};
            
            // Load earnings
            currentEarnings = data.earnings || 0;
            
            renderInvitations();
            updateEarningsDisplay();
        } catch(e) {
            console.error('Load invite error:', e);
        }
        
        // Real-time listener
        userRef.child('invites').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            currentEarnings = data.earnings || 0;
            renderInvitations();
            updateEarningsDisplay();
        });
    }
    
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        // Validation
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("Enter valid 11-digit number starting with 09");
            return;
        }
        
        if (friendPhone === currentUserPhone) {
            alert("Cannot invite yourself!");
            return;
        }
        
        // Check earnings limit
        if (currentEarnings >= MAX_EARNINGS) {
            alert(`⚠️ You have reached the maximum earnings of ₱${MAX_EARNINGS}! Cannot send more invites.`);
            return;
        }
        
        // Get current invites
        const snapshot = await userRef.child('invites/sent').once('value');
        const sentInvites = snapshot.val() || {};
        const pendingCount = Object.values(sentInvites).filter(inv => inv.status === 'pending').length;
        const approvedCount = Object.values(sentInvites).filter(inv => inv.status === 'approved').length;
        
        // Max 3 visible invites (pending + approved)
        if ((pendingCount + approvedCount) >= 3) {
            alert("Maximum 3 invites. Delete an invite to send new one.");
            return;
        }
        
        if (sentInvites[friendPhone]) {
            alert("Already invited this person!");
            return;
        }
        
        // Save invite
        const updates = {};
        updates[`invites/sent/${friendPhone}`] = {
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now(),
            reward: 150
        };
        
        // Add to friend's received invites
        const friendRef = window.PromotionCore ? 
            firebase.database().ref('user_sessions/' + friendPhone) : null;
        
        if (friendRef) {
            updates[`invites/received/${currentUserPhone}`] = {
                from: currentUserPhone,
                status: 'pending',
                timestamp: Date.now(),
                reward: 150
            };
            await friendRef.update(updates);
        }
        
        await userRef.update(updates);
        
        if (friendInput) friendInput.value = '';
        
        // Play sound
        if (window.PromotionCore) window.PromotionCore.playSound('invite');
        
        alert("Invitation sent successfully!");
        renderInvitations();
    }
    
    async function deleteInvitation(phoneToDelete) {
        const snapshot = await userRef.child(`invites/sent/${phoneToDelete}`).once('value');
        const invite = snapshot.val();
        
        if (invite && invite.status === 'approved') {
            alert("Cannot delete approved invitation! It already contributed to your earnings.");
            return;
        }
        
        if (confirm("Delete this invitation?")) {
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            
            // Remove from friend's received
            const friendRef = window.PromotionCore ? 
                firebase.database().ref('user_sessions/' + phoneToDelete) : null;
            if (friendRef) {
                await friendRef.child(`invites/received/${currentUserPhone}`).remove();
            }
            
            renderInvitations();
            alert("Invitation deleted!");
        }
    }
    
    function renderInvitations() {
        if (!listContainer) return;
        
        userRef.child('invites/sent').once('value', (snapshot) => {
            const sent = snapshot.val() || {};
            const sentArray = Object.entries(sent);
            
            if (sentArray.length === 0) {
                listContainer.innerHTML = '<div class="invite-empty">No invitations sent (0/3)</div>';
                return;
            }
            
            let html = '';
            let count = 0;
            
            for (let [phone, data] of sentArray) {
                if (count >= 3) break;
                
                const formattedPhone = formatPhoneNumber(phone);
                const statusClass = data.status === 'approved' ? 'approved' : 'pending';
                const statusText = data.status === 'approved' ? 'CLAIMED' : 'PENDING';
                
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
            
            listContainer.innerHTML = html;
            
            // Attach delete events
            document.querySelectorAll('.delete-invite').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteInvitation(btn.dataset.phone);
                });
            });
        });
    }
    
    function updateEarningsDisplay() {
        const earningsEl = document.getElementById('earningsDisplay');
        if (earningsEl) {
            earningsEl.innerText = `${currentEarnings}/${MAX_EARNINGS}`;
        }
        
        // Update progress bar if exists
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percent = (currentEarnings / MAX_EARNINGS) * 100;
            progressFill.style.width = percent + '%';
        }
    }
    
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '****' + phone.substring(8, 11);
    }
    
    // Called when someone accepts invite
    async function addEarnings(amount) {
        const newEarnings = currentEarnings + amount;
        
        if (newEarnings > MAX_EARNINGS) {
            // Cannot exceed max
            return false;
        }
        
        currentEarnings = newEarnings;
        await userRef.child('invites/earnings').set(currentEarnings);
        updateEarningsDisplay();
        return true;
    }
    
    function getCurrentEarnings() {
        return currentEarnings;
    }
    
    function isEarningsFull() {
        return currentEarnings >= MAX_EARNINGS;
    }
    
    return { 
        init: init, 
        addEarnings: addEarnings,
        getCurrentEarnings: getCurrentEarnings,
        isEarningsFull: isEarningsFull
    };
})();

// ========== MODULE 8: INVITE LOGIC ==========
window.InviteModule = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let sendBtn = null;
    let friendInput = null;
    let listContainer = null;
    
    // Threshold limits
    const MAX_EARNINGS = 900;  // Maximum 900
    let currentEarnings = 0;    // Current earnings from claimed invites
    
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) return;
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
        }
        
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        listContainer = document.getElementById('inviteListBody');
        
        if (sendBtn) {
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            sendBtn = newBtn;
            sendBtn.addEventListener('click', handleSendInvite);
        }
        
        if (friendInput) {
            friendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendInvite();
            });
        }
        
        // Load data from Firebase
        loadInviteData();
        
        console.log('✅ Invite Module ready');
    }
    
    async function loadInviteData() {
        if (!userRef) return;
        
        try {
            const snapshot = await userRef.child('invites').once('value');
            const data = snapshot.val() || {};
            
            // Load earnings
            currentEarnings = data.earnings || 0;
            
            renderInvitations();
            updateEarningsDisplay();
        } catch(e) {
            console.error('Load invite error:', e);
        }
        
        // Real-time listener
        userRef.child('invites').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            currentEarnings = data.earnings || 0;
            renderInvitations();
            updateEarningsDisplay();
        });
    }
    
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        // Validation
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("Enter valid 11-digit number starting with 09");
            return;
        }
        
        if (friendPhone === currentUserPhone) {
            alert("Cannot invite yourself!");
            return;
        }
        
        // Check earnings limit
        if (currentEarnings >= MAX_EARNINGS) {
            alert(`⚠️ You have reached the maximum earnings of ₱${MAX_EARNINGS}! Cannot send more invites.`);
            return;
        }
        
        // Get current invites
        const snapshot = await userRef.child('invites/sent').once('value');
        const sentInvites = snapshot.val() || {};
        const pendingCount = Object.values(sentInvites).filter(inv => inv.status === 'pending').length;
        const approvedCount = Object.values(sentInvites).filter(inv => inv.status === 'approved').length;
        
        // Max 3 visible invites (pending + approved)
        if ((pendingCount + approvedCount) >= 3) {
            alert("Maximum 3 invites. Delete an invite to send new one.");
            return;
        }
        
        if (sentInvites[friendPhone]) {
            alert("Already invited this person!");
            return;
        }
        
        // Save invite
        const updates = {};
        updates[`invites/sent/${friendPhone}`] = {
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now(),
            reward: 150
        };
        
        // Add to friend's received invites
        const friendRef = window.PromotionCore ? 
            firebase.database().ref('user_sessions/' + friendPhone) : null;
        
        if (friendRef) {
            updates[`invites/received/${currentUserPhone}`] = {
                from: currentUserPhone,
                status: 'pending',
                timestamp: Date.now(),
                reward: 150
            };
            await friendRef.update(updates);
        }
        
        await userRef.update(updates);
        
        if (friendInput) friendInput.value = '';
        
        // Play sound
        if (window.PromotionCore) window.PromotionCore.playSound('invite');
        
        alert("Invitation sent successfully!");
        renderInvitations();
    }
    
    async function deleteInvitation(phoneToDelete) {
        const snapshot = await userRef.child(`invites/sent/${phoneToDelete}`).once('value');
        const invite = snapshot.val();
        
        if (invite && invite.status === 'approved') {
            alert("Cannot delete approved invitation! It already contributed to your earnings.");
            return;
        }
        
        if (confirm("Delete this invitation?")) {
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            
            // Remove from friend's received
            const friendRef = window.PromotionCore ? 
                firebase.database().ref('user_sessions/' + phoneToDelete) : null;
            if (friendRef) {
                await friendRef.child(`invites/received/${currentUserPhone}`).remove();
            }
            
            renderInvitations();
            alert("Invitation deleted!");
        }
    }
    
    function renderInvitations() {
        if (!listContainer) return;
        
        userRef.child('invites/sent').once('value', (snapshot) => {
            const sent = snapshot.val() || {};
            const sentArray = Object.entries(sent);
            
            if (sentArray.length === 0) {
                listContainer.innerHTML = '<div class="invite-empty">No invitations sent (0/3)</div>';
                return;
            }
            
            let html = '';
            let count = 0;
            
            for (let [phone, data] of sentArray) {
                if (count >= 3) break;
                
                const formattedPhone = formatPhoneNumber(phone);
                const statusClass = data.status === 'approved' ? 'approved' : 'pending';
                const statusText = data.status === 'approved' ? 'CLAIMED' : 'PENDING';
                
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
            
            listContainer.innerHTML = html;
            
            // Attach delete events
            document.querySelectorAll('.delete-invite').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteInvitation(btn.dataset.phone);
                });
            });
        });
    }
    
    function updateEarningsDisplay() {
        const earningsEl = document.getElementById('earningsDisplay');
        if (earningsEl) {
            earningsEl.innerText = `${currentEarnings}/${MAX_EARNINGS}`;
        }
        
        // Update progress bar if exists
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percent = (currentEarnings / MAX_EARNINGS) * 100;
            progressFill.style.width = percent + '%';
        }
    }
    
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '****' + phone.substring(8, 11);
    }
    
    // Called when someone accepts invite
    async function addEarnings(amount) {
        const newEarnings = currentEarnings + amount;
        
        if (newEarnings > MAX_EARNINGS) {
            // Cannot exceed max
            return false;
        }
        
        currentEarnings = newEarnings;
        await userRef.child('invites/earnings').set(currentEarnings);
        updateEarningsDisplay();
        return true;
    }
    
    function getCurrentEarnings() {
        return currentEarnings;
    }
    
    function isEarningsFull() {
        return currentEarnings >= MAX_EARNINGS;
    }
    
    return { 
        init: init, 
        addEarnings: addEarnings,
        getCurrentEarnings: getCurrentEarnings,
        isEarningsFull: isEarningsFull
    };
})();
