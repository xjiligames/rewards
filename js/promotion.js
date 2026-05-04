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
    
    function showCannotReinviteWarning(friendPhone) {
        const formatted = formatPhoneNumber(friendPhone);
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: linear-gradient(135deg, #1a1a2e, #0f0a1a); border: 2px solid #ffaa33; 
                        border-radius: 20px; padding: 25px 30px; text-align: center; z-index: 20000; 
                        box-shadow: 0 0 50px rgba(255,170,51,0.5); max-width: 350px; animation: warningPop 0.3s ease;">
                <div style="font-size: 50px;">🔒</div>
                <h3 style="color: #ffaa33;">INVITE LOCKED!</h3>
                <p style="color: #fff;"><strong style="color: #ffd700;">${formatted}</strong> has already claimed their reward.</p>
                <p style="color: #ff8888; font-size: 12px;">Each user can only be invited ONCE!</p>
                <button id="warningCloseBtn" style="background: #ffaa33; border: none; padding: 10px 25px; border-radius: 30px; color: #1a1a2e; font-weight: bold; cursor: pointer;">OK</button>
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
            } else if (canInvite.reason === 'permanently_blocked') {
                showCannotReinviteWarning(friendPhone, true); // true = permanently blocked
            } else {
                showCannotReinviteWarning(friendPhone, false);
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
    
    // ========== DELETE INVITE ==========
    async function deleteInvitation(phoneToDelete) {
        const formattedPhone = formatPhoneNumber(phoneToDelete);
        
        if (confirm(`🗑️ Delete invitation to ${formattedPhone}?`)) {
            await userRef.child(`invites/sent/${phoneToDelete}`).remove();
            const user2Ref = db.ref('user_sessions/' + phoneToDelete);
            await user2Ref.child(`invites/received/${currentUserPhone}`).remove();
            alert(`✅ Invitation to ${formattedPhone} deleted.`);
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
    
    return { init: init };
})();
