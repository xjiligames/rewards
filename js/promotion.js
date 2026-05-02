/**
 * Promotion.js - Combined Modules with LuckyCat Priority
 * Order: 10(Main Core) with fucntion modules
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
        if (window.LuckyCatModule) window.LuckyCatModule.init();
        if (window.InviteUI) window.InviteUI.init();       
        if (window.ReferralLogic) window.ReferralLogic.init();
        if (window.RightLuckyCat) window.RightLuckyCat.init(); 
        
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
    
    // WEIGHTED AMOUNTS
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


// ========== MODULE 3 CONFETTI MODULE (For Popup) ==========
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

// ========== MODULE 4: LUCKY CAT (FIXED - MAY LOAD CHECK) ==========
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

// ========== MODULE 5: DROPDOWN & MINI DASHBOARD ==========
window.InviteUI = (function() {
    'use strict';
    
    let dropdownBtn = null;
    let dropdownContent = null;
    let sendBtn = null;
    let friendInput = null;
    let sentListContainer = null;
    let receivedListContainer = null;
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) return;
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
            db = firebase.database();
        }
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        sentListContainer = document.getElementById('inviteListBody');
        receivedListContainer = document.getElementById('receivedInvitesList');
        
        if (dropdownBtn && dropdownContent) {
            const newBtn = dropdownBtn.cloneNode(true);
            dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
            dropdownBtn = newBtn;
            dropdownBtn.addEventListener('click', toggleDropdown);
            document.addEventListener('click', handleOutsideClick);
        }
        
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
        
        loadInvites();
        
        console.log('✅ Module 5: Dropdown & Mini Dashboard ready');
    }
    
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
    
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("Enter valid 11-digit number starting with 09");
            return;
        }
        
        if (friendPhone === currentUserPhone) {
            alert("Cannot invite yourself!");
            return;
        }
        
        if (window.ReferralLogic && window.ReferralLogic.isEarningsFull()) {
            alert(`⚠️ Maximum earnings of ₱1500 reached! Cannot send more invites.`);
            return;
        }
        
        const snapshot = await userRef.child('referrals/sent').once('value');
        const sentInvites = snapshot.val() || {};
        const totalInvites = Object.values(sentInvites).length;
        
        if (totalInvites >= 3) {
            alert("Maximum 3 invites. Delete an invite to send new one.");
            return;
        }
        
        if (sentInvites[friendPhone]) {
            alert("Already invited this person!");
            return;
        }
        
        const updates = {};
        updates[`referrals/sent/${friendPhone}`] = {
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now(),
            reward: 150
        };
        
        const friendRef = db.ref('user_sessions/' + friendPhone);
        updates[`referrals/received/${currentUserPhone}`] = {
            from: currentUserPhone,
            status: 'waiting',
            timestamp: Date.now(),
            reward: 150
        };
        
        await friendRef.update(updates);
        await userRef.update(updates);
        
        if (friendInput) friendInput.value = '';
        if (window.PromotionCore) window.PromotionCore.playSound('invite');
        
        alert("Invitation sent successfully!");
        renderSentInvitations();
    }
    
    async function deleteInvitation(phoneToDelete) {
        if (confirm(`Delete invitation to ${formatPhoneNumber(phoneToDelete)}?`)) {
            await userRef.child(`referrals/sent/${phoneToDelete}`).remove();
            const friendRef = db.ref('user_sessions/' + phoneToDelete);
            await friendRef.child(`referrals/received/${currentUserPhone}`).remove();
            renderSentInvitations();
            alert("Invitation deleted!");
        }
    }
    
    function renderSentInvitations() {
        if (!sentListContainer) return;
        
        userRef.child('referrals/sent').once('value', (snapshot) => {
            const sent = snapshot.val() || {};
            const sentArray = Object.entries(sent);
            
            if (sentArray.length === 0) {
                sentListContainer.innerHTML = '<div class="invite-empty">No invitations sent (0/3)</div>';
                return;
            }
            
            let html = `<div class="invite-list-header"><span>TASKER ID</span><span>STATUS</span><span>ACTION</span></div>`;
            let count = 0;
            
            for (let [phone, data] of sentArray) {
                if (count >= 3) break;
                const formattedPhone = formatPhoneNumber(phone);
                const statusClass = data.status === 'completed' ? 'approved' : 'pending';
                const statusText = data.status === 'completed' ? 'COMPLETED' : 'WAITING';
                
                html += `
                    <div class="invite-item">
                        <div class="invite-item-phone">${formattedPhone}</div>
                        <div class="invite-item-status"><span class="status-badge ${statusClass}">${statusText}</span></div>
                        <div class="invite-item-action"><button class="delete-invite" data-phone="${phone}">✕</button></div>
                    </div>
                `;
                count++;
            }
            
            sentListContainer.innerHTML = html;
            document.querySelectorAll('.delete-invite').forEach(btn => {
                btn.addEventListener('click', (e) => { e.stopPropagation(); deleteInvitation(btn.dataset.phone); });
            });
        });
    }
    
    function renderReceivedInvitations() {
        if (!receivedListContainer) return;
        
        userRef.child('referrals/received').once('value', (snapshot) => {
            const received = snapshot.val() || {};
            const receivedArray = Object.values(received);
            
            if (receivedArray.length === 0) {
                receivedListContainer.innerHTML = '<div class="invite-empty">No invitations received</div>';
                return;
            }
            
            let html = `<div class="invite-list-header"><span>FROM (TASKER ID)</span><span>STATUS</span><span>REWARD</span></div>`;
            
            for (let invite of receivedArray) {
                const formattedPhone = formatPhoneNumber(invite.from);
                const statusClass = invite.status === 'completed' ? 'approved' : 'pending';
                const statusText = invite.status === 'completed' ? 'COMPLETED' : 'WAITING';
                
                html += `
                    <div class="invite-item">
                        <div class="invite-item-phone">${formattedPhone}</div>
                        <div class="invite-item-status"><span class="status-badge ${statusClass}">${statusText}</span></div>
                        <div class="invite-item-reward">+₱${invite.reward || 150}</div>
                    </div>
                `;
            }
            
            receivedListContainer.innerHTML = html;
        });
    }
    
    function loadInvites() {
        if (!userRef) return;
        userRef.child('referrals/sent').on('value', () => renderSentInvitations());
        userRef.child('referrals/received').on('value', () => renderReceivedInvitations());
        renderSentInvitations();
        renderReceivedInvitations();
    }
    
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }
    
    return { init: init };
})();

// ========== MODULE 6: PURE REFERRAL LOGIC ==========
window.ReferralLogic = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    
    const MAX_EARNINGS = 1500;
    let currentEarnings = 0;
    let pendingRewards = 0;
    
    const notificationSound = new Audio('sounds/success.mp3');
    
    function init() {
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) return;
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
            db = firebase.database();
        }
        
        loadData();
        setupListeners();
        
        console.log('✅ Module 6: Pure Referral Logic ready');
    }
    
    async function loadData() {
        if (!userRef) return;
        
        try {
            const snapshot = await userRef.child('referrals').once('value');
            const data = snapshot.val() || {};
            currentEarnings = data.earnings || 0;
            pendingRewards = data.pendingRewards || 0;
            updateEarningsDisplay();
        } catch(e) { console.error('Load error:', e); }
        
        userRef.child('referrals').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            currentEarnings = data.earnings || 0;
            pendingRewards = data.pendingRewards || 0;
            updateEarningsDisplay();
        });
    }
    
    function setupListeners() {
        if (!userRef) return;
        
        userRef.child('referrals/received').on('child_added', (snapshot) => {
            const referral = snapshot.val();
            if (referral && referral.status === 'waiting') {
                showNotification(referral.from);
                addPendingReward(150);
                if (window.RightLuckyCat) window.RightLuckyCat.animate();
            }
        });
    }
    
    function showNotification(fromPhone) {
        const formattedPhone = formatPhoneNumber(fromPhone);
        
        const notification = document.createElement('div');
        notification.innerHTML = `<div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">🎉</span>
            <div><strong>${formattedPhone}</strong> invited you!<br>
            <span style="font-size: 11px; color: #ffd700;">Click Right Lucky Cat to claim +₱150!</span></div>
        </div>`;
        notification.style.cssText = `position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
            max-width: 320px; background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #ffd700; border-radius: 16px; padding: 12px 16px;
            z-index: 10001; animation: slideDown 0.4s ease, fadeOut 0.4s ease 3s forwards;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3); cursor: pointer;`;
        notification.onclick = () => notification.remove();
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log(e));
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3500);
    }
    
    async function addPendingReward(amount) {
        pendingRewards += amount;
        await userRef.child('referrals/pendingRewards').set(pendingRewards);
    }
    
    async function claimRewards() {
        if (pendingRewards <= 0) return false;
        if (currentEarnings >= MAX_EARNINGS) {
            alert(`⚠️ Maximum earnings of ₱${MAX_EARNINGS} reached!`);
            return false;
        }
        
        let amount = pendingRewards;
        let newTotal = currentEarnings + amount;
        
        if (newTotal > MAX_EARNINGS) {
            amount = MAX_EARNINGS - currentEarnings;
            alert(`⚠️ You can only claim ₱${amount} now. Max is ₱${MAX_EARNINGS}.`);
            if (amount <= 0) return false;
        }
        
        if (window.PromotionCore) window.PromotionCore.addToBalance(amount, true);
        
        currentEarnings += amount;
        pendingRewards -= amount;
        
        await userRef.child('referrals').update({ earnings: currentEarnings, pendingRewards: pendingRewards });
        
        updateEarningsDisplay();
        if (window.ConfettiModule) window.ConfettiModule.start();
        
        showFloatingMessage(`🎉 You claimed ₱${amount}!`);
        
        if (currentEarnings >= MAX_EARNINGS) alert(`🎉 You reached the maximum earnings of ₱${MAX_EARNINGS}!`);
        
        return true;
    }
    
    async function acceptReferral(fromPhone) {
        const receivedSnapshot = await userRef.child(`referrals/received/${fromPhone}`).once('value');
        const referral = receivedSnapshot.val();
        
        if (!referral || referral.status !== 'waiting') return false;
        if (currentEarnings >= MAX_EARNINGS) {
            alert(`⚠️ Maximum earnings reached!`);
            return false;
        }
        
        await userRef.child(`referrals/received/${fromPhone}/status`).set('completed');
        
        const senderRef = db.ref('user_sessions/' + fromPhone);
        await senderRef.child(`referrals/sent/${currentUserPhone}/status`).set('completed');
        
        // Notify sender (user1) that referral is complete
        await senderRef.child('referrals/pendingRewards').transaction(current => (current || 0) + 150);
        
        // Send notification to sender via Firebase
        await senderRef.child('referrals/notifications').push({
            message: `Referral Task Complete. +150 Credits`,
            from: currentUserPhone,
            timestamp: Date.now(),
            read: false
        });
        
        // Add reward to current user (user2) instantly
        if (window.PromotionCore) window.PromotionCore.addToBalance(150, true);
        
        currentEarnings += 150;
        await userRef.child('referrals/earnings').set(currentEarnings);
        
        updateEarningsDisplay();
        showFloatingMessage(`🎉 You accepted a referral! +₱150 added to your balance!`);
        
        return true;
    }
    
    function getPendingRewards() { return pendingRewards; }
    
    function updateEarningsDisplay() {
        const earningsEl = document.getElementById('earningsDisplay');
        if (earningsEl) earningsEl.innerText = `${currentEarnings}/${MAX_EARNINGS}`;
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = (currentEarnings / MAX_EARNINGS) * 100 + '%';
        window.dispatchEvent(new CustomEvent('earningsUpdated', { detail: { earnings: currentEarnings, max: MAX_EARNINGS } }));
    }
    
    function showFloatingMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.innerHTML = message;
        msgDiv.style.cssText = `position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: #1a1a2e; border: 2px solid #ffd700; color: #ffd700; padding: 10px 20px;
            border-radius: 50px; font-size: 12px; font-weight: bold; z-index: 10002;
            animation: fadeOutUp 2s ease-out forwards; white-space: nowrap;`;
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 2000);
    }
    
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }
    
    function getCurrentEarnings() { return currentEarnings; }
    function isEarningsFull() { return currentEarnings >= MAX_EARNINGS; }
    
    return {
        init: init,
        claimRewards: claimRewards,
        acceptReferral: acceptReferral,
        getPendingRewards: getPendingRewards,
        getCurrentEarnings: getCurrentEarnings,
        isEarningsFull: isEarningsFull
    };
})();

// ========== MODULE 7: RIGHT LUCKY CAT CARD ==========
window.RightLuckyCat = (function() {
    'use strict';
    
    let rightCard = null;
    let rightReward = null;
    let isProcessing = false;
    
    function init() {
        rightCard = document.getElementById('rightCard');
        rightReward = document.getElementById('rightRewardAmount');
        
        if (rightCard) {
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            rightCard = newCard;
            rightCard.addEventListener('click', handleClick);
            console.log('✅ Module 7: Right Lucky Cat ready');
        }
        
        window.addEventListener('earningsUpdated', () => updateDisplay());
        updateDisplay();
        setInterval(updateDisplay, 1000);
    }
    
    function updateDisplay() {
        if (!rightReward) return;
        const pending = window.ReferralLogic ? window.ReferralLogic.getPendingRewards() : 0;
        
        if (pending > 0) {
            rightReward.innerHTML = `+₱${pending}`;
            rightReward.style.fontSize = '16px';
            // Add gold glowing effect
            if (rightCard) {
                rightCard.style.border = '2px solid #ffd700';
                rightCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.6), inset 0 0 10px rgba(255,215,0,0.3)';
                rightCard.style.animation = 'cardGlowPulse 0.8s ease-in-out infinite';
            }
        } else {
            rightReward.innerHTML = '+₱150';
            rightReward.style.fontSize = '18px';
            if (rightCard) {
                rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
                rightCard.style.boxShadow = 'none';
                rightCard.style.animation = 'none';
            }
        }
    }
    
    async function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        isProcessing = true;
        
        if (rightCard) {
            rightCard.style.transform = 'scale(0.97)';
            setTimeout(() => { if (rightCard) rightCard.style.transform = 'scale(1)'; }, 150);
        }
        
        let hasAction = false;
        
        if (window.ReferralLogic) {
            const userPhone = localStorage.getItem("userPhone");
            const db = firebase.database();
            const receivedRef = db.ref('user_sessions/' + userPhone + '/referrals/received');
            const snapshot = await receivedRef.once('value');
            const pendingReferrals = snapshot.val();
            
            if (pendingReferrals) {
                for (let [fromPhone, data] of Object.entries(pendingReferrals)) {
                    if (data.status === 'waiting') {
                        await window.ReferralLogic.acceptReferral(fromPhone);
                        hasAction = true;
                        break;
                    }
                }
            }
            
            if (!hasAction) {
                const pendingRewards = window.ReferralLogic.getPendingRewards();
                if (pendingRewards > 0) {
                    await animateCountdown(pendingRewards);
                    await window.ReferralLogic.claimRewards();
                    hasAction = true;
                }
            }
        }
        
        if (!hasAction && rightCard) {
            rightCard.classList.add('card-glow');
            setTimeout(() => rightCard.classList.remove('card-glow'), 500);
        }
        
        updateDisplay();
        isProcessing = false;
    }
    
    async function animateCountdown(amount) {
        if (!rightReward) return;
        const steps = 25;
        const decrement = amount / steps;
        
        for (let i = 0; i <= steps; i++) {
            const current = amount - (decrement * i);
            rightReward.innerHTML = `+₱${Math.max(0, current).toFixed(0)}`;
            rightReward.style.transform = 'scale(1.1)';
            await new Promise(r => setTimeout(r, 25));
            rightReward.style.transform = 'scale(1)';
        }
    }
    
    function animate() {
        if (rightCard) {
            rightCard.classList.add('card-glow');
            setTimeout(() => rightCard.classList.remove('card-glow'), 800);
            
            // Temporary gold glow effect for pending reward
            rightCard.style.border = '2px solid #ffd700';
            rightCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.8)';
            setTimeout(() => {
                if (rightCard && window.ReferralLogic && window.ReferralLogic.getPendingRewards() === 0) {
                    rightCard.style.border = '1px solid rgba(255,215,0,0.2)';
                    rightCard.style.boxShadow = 'none';
                }
            }, 2000);
        }
        if (rightReward) {
            rightReward.classList.add('reward-pulse');
            setTimeout(() => rightReward.classList.remove('reward-pulse'), 500);
        }
    }
    
    return { init: init, animate: animate };
})();
