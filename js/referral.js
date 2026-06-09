/**
 * referral.js - Complete Referral System with Right Card Popup
 * - Direct display of referral code from Firebase
 * - Right card shows total earnings from referrals
 * - Popup for entering other user's referral code
 * - Max 3 referrals (₱1500 limit)
 * - Claim button transfers earnings to main balance
 * - Working close button and outside click to close
 */

(function() {
    'use strict';

    // DOM elements
    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownContent = document.getElementById('dropdownContent');
    const referralDisplay = document.getElementById('referralCodeDisplay');
    const rightCard = document.getElementById('rightCard');
    const rightCardReward = document.getElementById('rightRewardAmountDisplay');
    
    // Popup elements
    const claimPopup = document.getElementById('referralClaimPopup');
    const claimCloseBtn = document.getElementById('closeReferralPopupBtn');
    const claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
    const claimCodeInput = document.getElementById('referralCodeInput');
    const claimErrorMsg = document.getElementById('referralClaimErrorMsg');
    const popupClaimBtn = document.getElementById('claimToBalanceBtn');
    const popupThresholdDisplay = document.getElementById('popupThresholdAmount');
    const popupEarningsList = document.getElementById('popupEarningsList');

    // State
    let currentUserPhone = null;
    let currentReferralCode = null;
    let currentEarnings = 0;
    let isProcessing = false;
    let referralHistory = [];
    let userRef = null;
    let db = null;

    const MAX_REFERRALS = 3;
    const MAX_EARNINGS = 1500;
    const BONUS_PER_REFERRAL = 500;

    // ========== INITIALIZE FIREBASE ==========
    function initFirebase() {
        if (typeof firebaseConfig !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            currentUserPhone = localStorage.getItem('userPhone');
            if (currentUserPhone) {
                userRef = db.ref('user_sessions/' + currentUserPhone);
            }
            return true;
        }
        return false;
    }

    // ========== FORMAT PHONE NUMBER ==========
    function formatPhone(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }

    // ========== SHOW TOAST ==========
    function showToast(msg, isError = false) {
        const toast = document.createElement('div');
        toast.innerHTML = msg;
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: ${isError ? '#ff4444' : '#22C55E'};
            color: white; padding: 10px 20px; border-radius: 50px; font-size: 12px;
            font-weight: bold; z-index: 10002; animation: fadeOutUp 2s ease-out forwards;
            white-space: nowrap; font-family: 'Orbitron', monospace;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function showError(msg) {
        if (claimErrorMsg) {
            claimErrorMsg.style.display = 'block';
            claimErrorMsg.innerHTML = msg;
            setTimeout(() => {
                if (claimErrorMsg) claimErrorMsg.style.display = 'none';
            }, 3000);
        } else {
            showToast(msg, true);
        }
    }

    // ========== UPDATE RIGHT CARD DISPLAY ==========
    function updateRightCardDisplay() {
        if (rightCardReward) {
            rightCardReward.innerHTML = `₱${currentEarnings}`;
        }
        
        if (popupThresholdDisplay) {
            popupThresholdDisplay.innerHTML = `₱${currentEarnings} / ₱${MAX_EARNINGS}`;
            const progressFill = document.querySelector('#popupThresholdProgress .progress-fill-inner');
            if (progressFill) {
                const percent = (currentEarnings / MAX_EARNINGS) * 100;
                progressFill.style.width = percent + '%';
            }
        }
        
        if (popupClaimBtn) {
            if (currentEarnings <= 0) {
                popupClaimBtn.disabled = true;
                popupClaimBtn.style.opacity = '0.5';
            } else {
                popupClaimBtn.disabled = false;
                popupClaimBtn.style.opacity = '1';
            }
        }
    }

    // ========== LOAD REFERRAL CODE FROM FIREBASE ==========
    async function loadReferralCode() {
        if (!userRef) return;
        
        try {
            const snap = await userRef.child('referral_code').once('value');
            let code = snap.val();

            if (code && code.length === 6) {
                currentReferralCode = code;
                localStorage.setItem('user_referral_code', code);
                
                if (referralDisplay) {
                    referralDisplay.innerHTML = `
                        <div id="refGoldBar" style="background: linear-gradient(135deg, #b8860b, #d4af37, #fce883, #d4af37, #b8860b); border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 0 20px rgba(212,175,55,0.5); cursor: pointer;">
                            <div style="font-size: 11px; color: #1a1100; letter-spacing: 2px;">⭐ YOUR REFERRAL CODE ⭐</div>
                            <div style="font-size: 32px; font-weight: 900; color: #1a1100; letter-spacing: 6px; font-family: 'Orbitron', monospace;">${code}</div>
                            <div style="font-size: 10px; color: #1a1100; margin-top: 8px;"><i class="fas fa-copy"></i> Tap to copy</div>
                        </div>
                    `;
                    const bar = document.getElementById('refGoldBar');
                    if (bar) bar.onclick = () => navigator.clipboard.writeText(code).then(() => showToast('✅ Copied!'));
                }
            } else {
                if (referralDisplay) referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">No code found</div>';
            }
        } catch(err) {
            console.error('Error loading referral code:', err);
        }
    }

    // ========== LOAD REFERRAL EARNINGS AND HISTORY ==========
    async function loadReferralData() {
        if (!userRef) return;
        
        try {
            const earningsSnap = await userRef.child('referral_claims_total').once('value');
            currentEarnings = earningsSnap.val() || 0;
            updateRightCardDisplay();
            
            const historySnap = await userRef.child('referral_history').once('value');
            referralHistory = [];
            if (historySnap.exists()) {
                const history = historySnap.val();
                referralHistory = Object.entries(history).map(([key, val]) => ({
                    id: key,
                    claimedBy: val.claimedBy,
                    claimedAt: val.claimedAt,
                    amount: val.amount || BONUS_PER_REFERRAL
                })).sort((a, b) => b.claimedAt - a.claimedAt);
            }
            
            updateHistoryTable();
            updatePopupEarningsList();
            
        } catch(err) {
            console.error('Error loading referral data:', err);
        }
    }

    // ========== UPDATE HISTORY TABLE IN DROPDOWN ==========
    function updateHistoryTable() {
        const tableBody = document.getElementById('earningsTableBody');
        const totalBonusSpan = document.getElementById('totalReferralBonus');
        
        if (totalBonusSpan) {
            totalBonusSpan.innerHTML = `₱${currentEarnings}`;
        }
        
        if (!tableBody) return;
        
        if (referralHistory.length === 0) {
            tableBody.innerHTML = '<div class="earnings-empty"><i class="fas fa-history"></i> No referral history yet</div>';
            return;
        }
        
        let html = '';
        for (const entry of referralHistory.slice(0, MAX_REFERRALS)) {
            const formattedPhone = formatPhone(entry.claimedBy);
            const date = new Date(entry.claimedAt);
            const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            html += `
                <div class="earnings-row">
                    <span class="user-phone">${formattedPhone}</span>
                    <span class="earnings-time">${formattedDate}</span>
                    <span class="earnings-amount">+₱${entry.amount}</span>
                </div>
            `;
        }
        tableBody.innerHTML = html;
    }

    // ========== UPDATE POPUP EARNINGS LIST ==========
    function updatePopupEarningsList() {
        if (!popupEarningsList) return;
        
        if (referralHistory.length === 0) {
            popupEarningsList.innerHTML = '<div class="earnings-empty-list">No referral codes entered yet</div>';
            return;
        }
        
        let html = '';
        for (const entry of referralHistory) {
            const formattedPhone = formatPhone(entry.claimedBy);
            const date = new Date(entry.claimedAt);
            const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            html += `
                <div class="earnings-list-item">
                    <div class="earnings-list-code">REFERRAL</div>
                    <div class="earnings-list-from">from: ${formattedPhone}</div>
                    <div class="earnings-list-amount">+₱${entry.amount}</div>
                    <div class="earnings-list-date">${formattedDate}</div>
                </div>
            `;
        }
        popupEarningsList.innerHTML = html;
    }

    // ========== CHECK IF USER CAN STILL RECEIVE REFERRALS ==========
    async function canReceiveMoreReferrals() {
        if (currentEarnings >= MAX_EARNINGS) {
            return { allowed: false, reason: `You have reached the maximum earnings of ₱${MAX_EARNINGS}!` };
        }
        
        const currentCount = referralHistory.length;
        if (currentCount >= MAX_REFERRALS) {
            return { allowed: false, reason: `You have reached the maximum of ${MAX_REFERRALS} referrals!` };
        }
        
        return { allowed: true };
    }

    // ========== CHECK IF CODE WAS ALREADY USED ==========
    async function isCodeAlreadyUsed(code) {
        if (!userRef) return true;
        
        try {
            const usedSnap = await userRef.child('used_referral_codes/' + code).once('value');
            return usedSnap.exists();
        } catch(err) {
            return false;
        }
    }

    async function saveUsedCode(code, referrerPhone) {
        if (!userRef) return;
        
        try {
            await userRef.child('used_referral_codes/' + code).set({
                usedAt: Date.now(),
                fromUser: referrerPhone
            });
        } catch(err) {
            console.error('Error saving used code:', err);
        }
    }

    // ========== CLAIM EARNINGS TO MAIN BALANCE ==========
    async function claimToMainBalance() {
        if (isProcessing) {
            showToast('Please wait...', true);
            return;
        }
        
        if (currentEarnings <= 0) {
            showToast('No earnings to claim!', true);
            return;
        }
        
        isProcessing = true;
        if (popupClaimBtn) {
            popupClaimBtn.disabled = true;
            popupClaimBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> CLAIMING...';
        }
        
        try {
            const claimAmount = currentEarnings;
            
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(claimAmount, true);
            }
            
            await userRef.child('referral_claims_total').set(0);
            currentEarnings = 0;
            
            const historySnap = await userRef.child('referral_history').once('value');
            if (historySnap.exists()) {
                const history = historySnap.val();
                for (const [key, value] of Object.entries(history)) {
                    await userRef.child('referral_history/' + key + '/transferred').set(true);
                    await userRef.child('referral_history/' + key + '/transferred_at').set(Date.now());
                }
            }
            
            updateRightCardDisplay();
            updateHistoryTable();
            updatePopupEarningsList();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showToast(`🎉 ₱${claimAmount} claimed to your balance!`);
            closeClaimPopup();
            
        } catch(err) {
            console.error('Claim error:', err);
            showToast('An error occurred. Please try again.', true);
        } finally {
            isProcessing = false;
            if (popupClaimBtn) {
                popupClaimBtn.disabled = false;
                popupClaimBtn.innerHTML = '<i class="fas fa-wallet"></i> CLAIM TO BALANCE';
            }
        }
    }

    // ========== PROCESS REFERRAL CODE SUBMISSION ==========
    async function processReferralClaim() {
        if (isProcessing) {
            showError('Please wait...');
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            showError('❌ Please enter a valid 6-digit referral code');
            return;
        }
        
        const referralStatus = await canReceiveMoreReferrals();
        if (!referralStatus.allowed) {
            showError(`❌ ${referralStatus.reason}`);
            return;
        }
        
        const alreadyUsed = await isCodeAlreadyUsed(code);
        if (alreadyUsed) {
            showError('❌ You have already used this referral code');
            return;
        }
        
        isProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'VERIFYING...';
        }
        
        try {
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                showError('❌ Invalid referral code. Please check and try again.');
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'SUBMIT CODE';
                }
                return;
            }
            
            let referrerPhone = null;
            snapshot.forEach((child) => { referrerPhone = child.key; });
            
            if (referrerPhone === currentUserPhone) {
                showError('❌ You cannot use your own referral code!');
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'SUBMIT CODE';
                }
                return;
            }
            
            await saveUsedCode(code, referrerPhone);
            
            const newEarnings = currentEarnings + BONUS_PER_REFERRAL;
            await userRef.child('referral_claims_total').set(newEarnings);
            currentEarnings = newEarnings;
            
            await userRef.child('referral_history').push({
                claimedBy: referrerPhone,
                claimedAt: Date.now(),
                code: code,
                amount: BONUS_PER_REFERRAL
            });
            
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            const referrerHistory = await referrerRef.child('referral_history').once('value');
            const currentReferrerCount = referrerHistory.exists() ? Object.keys(referrerHistory.val()).length : 0;
            
            if (currentReferrerCount < MAX_REFERRALS) {
                await referrerRef.child('referral_history').push({
                    claimedBy: currentUserPhone,
                    claimedAt: Date.now(),
                    code: code,
                    amount: BONUS_PER_REFERRAL
                });
                
                const referrerTotal = await referrerRef.child('referral_claims_total').once('value');
                await referrerRef.child('referral_claims_total').set((referrerTotal.val() || 0) + BONUS_PER_REFERRAL);
            }
            
            await loadReferralData();
            updateRightCardDisplay();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showToast(`🎉 +₱${BONUS_PER_REFERRAL} added to your threshold!`);
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(err) {
            console.error('Claim error:', err);
            showError('An error occurred. Please try again.');
        } finally {
            isProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = 'SUBMIT CODE';
            }
        }
    }

    // ========== POPUP FUNCTIONS ==========
    function openClaimPopup() {
        console.log('🔓 Opening claim popup');
        if (!claimPopup) {
            showToast('Popup not ready', true);
            return;
        }
        if (claimCodeInput) claimCodeInput.value = '';
        if (claimErrorMsg) claimErrorMsg.style.display = 'none';
        claimPopup.style.display = 'flex';
        loadReferralData();
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }

    // ========== INITIALIZE ==========
    async function init() {
        console.log('🎯 Referral system starting...');
        
        if (!initFirebase()) {
            console.error('Firebase initialization failed');
            return;
        }
        
        if (!currentUserPhone) {
            console.log('No user phone found');
            return;
        }
        
        await loadReferralCode();
        await loadReferralData();
        
        // Setup dropdown
        if (dropdownBtn && dropdownContent) {
            const newBtn = dropdownBtn.cloneNode(true);
            dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
                const arrow = newBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
                
                if (dropdownContent.classList.contains('show')) {
                    loadReferralData();
                }
            });
            
            document.addEventListener('click', (e) => {
                if (!newBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                    dropdownContent.classList.remove('show');
                    const arrow = newBtn.querySelector('.dropdown-arrow');
                    if (arrow) arrow.innerHTML = '▼';
                }
            });
        }
        
        // Setup claim popup with working close button
        if (claimPopup) {
            // Close button
            if (claimCloseBtn) {
                const newCloseBtn = claimCloseBtn.cloneNode(true);
                claimCloseBtn.parentNode.replaceChild(newCloseBtn, claimCloseBtn);
                newCloseBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    claimPopup.style.display = 'none';
                    console.log('❌ Popup closed');
                });
                console.log('✅ Close button attached');
            }
            
            // Click outside to close
            claimPopup.addEventListener('click', (e) => {
                if (e.target === claimPopup) {
                    claimPopup.style.display = 'none';
                    console.log('❌ Popup closed via outside click');
                }
            });
        }
        
        // Setup submit button
        if (claimSubmitBtn) {
            const newSubmitBtn = claimSubmitBtn.cloneNode(true);
            claimSubmitBtn.parentNode.replaceChild(newSubmitBtn, claimSubmitBtn);
            newSubmitBtn.addEventListener('click', processReferralClaim);
        }
        
        // Setup claim to balance button
        if (popupClaimBtn) {
            const newPopupClaimBtn = popupClaimBtn.cloneNode(true);
            popupClaimBtn.parentNode.replaceChild(newPopupClaimBtn, popupClaimBtn);
            newPopupClaimBtn.addEventListener('click', claimToMainBalance);
        }
        
        // Setup code input
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') processReferralClaim();
            });
            claimCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        // Setup right card click
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            rightCard.style.pointerEvents = 'auto';
            rightCard.style.opacity = '1';
            
            const newRightCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newRightCard, rightCard);
            
            newRightCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Right card clicked - opening popup');
                openClaimPopup();
            });
            
            console.log('✅ Right card is now clickable');
        } else {
            console.error('❌ Right card element not found!');
        }
        
        console.log('✅ Referral system ready!');
        console.log(`📊 Max referrals: ${MAX_REFERRALS}, Max earnings: ₱${MAX_EARNINGS}`);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
