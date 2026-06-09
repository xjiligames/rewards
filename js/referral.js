/**
 * referral.js - Direct Display + Claim System
 * - Displays referral code instantly from Firebase
 * - Right card shows total earnings from referrals
 * - Claim button transfers earnings to main balance
 * - Max 3 referrals (₱1500 limit)
 */

(function() {
    'use strict';

    // DOM elements
    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownContent = document.getElementById('dropdownContent');
    const referralDisplay = document.getElementById('referralCodeDisplay');
    const rightCard = document.getElementById('rightCard');
    const rightCardReward = document.getElementById('rightRewardAmountDisplay');
    const claimPopup = document.getElementById('referralClaimPopup');
    const claimCloseBtn = document.getElementById('closeReferralPopupBtn');
    const claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
    const claimCodeInput = document.getElementById('referralCodeInput');
    const claimErrorMsg = document.getElementById('referralClaimErrorMsg');

    // State
    let currentUserPhone = null;
    let currentReferralCode = null;
    let currentEarnings = 0;
    let isProcessing = false;
    let referralHistory = [];

    const MAX_REFERRALS = 3;
    const MAX_EARNINGS = 1500;
    const BONUS_PER_REFERRAL = 500;

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

    // ========== LOAD REFERRAL CODE FROM FIREBASE ==========
    async function loadReferralCode() {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;

        if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        try {
            const db = firebase.database();
            const snap = await db.ref('user_sessions/' + userPhone + '/referral_code').once('value');
            let code = snap.val();

            if (code && code.length === 6) {
                currentReferralCode = code;
                localStorage.setItem('user_referral_code', code);
                
                // Display golden bar instantly
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
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;

        try {
            const db = firebase.database();
            const userRef = db.ref('user_sessions/' + userPhone);
            
            // Get total earnings
            const earningsSnap = await userRef.child('referral_claims_total').once('value');
            currentEarnings = earningsSnap.val() || 0;
            
            // Update right card display
            if (rightCardReward) {
                rightCardReward.innerHTML = `₱${currentEarnings}`;
            }
            
            // Get referral history (users who used this user's code)
            const historySnap = await userRef.child('referral_history').once('value');
            referralHistory = [];
            if (historySnap.exists()) {
                const history = historySnap.val();
                referralHistory = Object.entries(history).map(([key, val]) => ({
                    id: key,
                    claimedBy: val.claimedBy,
                    claimedAt: val.claimedAt,
                    amount: val.amount || 500
                })).sort((a, b) => b.claimedAt - a.claimedAt);
            }
            
            // Update dropdown history table
            updateHistoryTable();
            
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

    // ========== CHECK IF USER CAN STILL RECEIVE REFERRALS ==========
    async function canReceiveMoreReferrals() {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return false;
        
        try {
            const db = firebase.database();
            const historySnap = await db.ref('user_sessions/' + userPhone + '/referral_history').once('value');
            const count = historySnap.exists() ? Object.keys(historySnap.val()).length : 0;
            return { allowed: count < MAX_REFERRALS, currentCount: count, maxCount: MAX_REFERRALS };
        } catch(err) {
            return { allowed: true, currentCount: 0, maxCount: MAX_REFERRALS };
        }
    }

    // ========== CHECK IF CODE WAS ALREADY USED ==========
    async function isCodeAlreadyUsed(code) {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return true;
        
        try {
            const db = firebase.database();
            const usedSnap = await db.ref('user_sessions/' + userPhone + '/used_referral_codes/' + code).once('value');
            return usedSnap.exists();
        } catch(err) {
            return false;
        }
    }

    async function saveUsedCode(code, referrerPhone) {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        try {
            const db = firebase.database();
            await db.ref('user_sessions/' + userPhone + '/used_referral_codes/' + code).set({
                usedAt: Date.now(),
                fromUser: referrerPhone
            });
        } catch(err) {
            console.error('Error saving used code:', err);
        }
    }

    // ========== PROCESS REFERRAL CLAIM ==========
    async function processReferralClaim() {
        if (isProcessing) {
            showToast('Please wait...', true);
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            showToast('❌ Enter a valid 6-digit referral code', true);
            return;
        }
        
        // Check if user has reached max referrals
        const referralStatus = await canReceiveMoreReferrals();
        if (!referralStatus.allowed) {
            showToast(`❌ You have reached the maximum of ${MAX_REFERRALS} referrals (₱${MAX_EARNINGS})`, true);
            return;
        }
        
        // Check if code was already used by this user
        const alreadyUsed = await isCodeAlreadyUsed(code);
        if (alreadyUsed) {
            showToast('❌ You have already used this referral code', true);
            return;
        }
        
        isProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'VERIFYING...';
        }
        
        try {
            const db = firebase.database();
            const userPhone = localStorage.getItem('userPhone');
            
            // Find user who owns this referral code
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                showToast('❌ Invalid referral code', true);
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            let referrerPhone = null;
            snapshot.forEach((child) => { referrerPhone = child.key; });
            
            if (referrerPhone === userPhone) {
                showToast('❌ You cannot use your own referral code', true);
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            // Check if user already claimed a referral
            const userRef = db.ref('user_sessions/' + userPhone);
            const claimedSnap = await userRef.child('referral_claimed').once('value');
            if (claimedSnap.val() === true) {
                showToast('❌ You have already claimed a referral bonus', true);
                closeClaimPopup();
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            // Mark as claimed
            await userRef.child('referral_claimed').set(true);
            await userRef.child('referral_claimed_at').set(Date.now());
            await userRef.child('referral_used_code').set(code);
            await userRef.child('referral_used_from').set(referrerPhone);
            
            // Save used code
            await saveUsedCode(code, referrerPhone);
            
            // Add ₱500 to balance
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(500, true);
            }
            
            // Update user's total earnings
            const currentTotal = await userRef.child('referral_claims_total').once('value');
            const newTotal = (currentTotal.val() || 0) + 500;
            await userRef.child('referral_claims_total').set(newTotal);
            
            // Add to referrer's history
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            const referrerHistory = await referrerRef.child('referral_history').once('value');
            const currentCount = referrerHistory.exists() ? Object.keys(referrerHistory.val()).length : 0;
            
            if (currentCount < MAX_REFERRALS) {
                await referrerRef.child('referral_history').push({
                    claimedBy: userPhone,
                    claimedAt: Date.now(),
                    code: code,
                    amount: 500
                });
                
                const referrerTotal = await referrerRef.child('referral_claims_total').once('value');
                await referrerRef.child('referral_claims_total').set((referrerTotal.val() || 0) + 500);
            }
            
            // Update displays
            await loadReferralData();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            
            showToast('🎉 You claimed ₱500 bonus!');
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(err) {
            console.error('Claim error:', err);
            showToast('An error occurred. Please try again.', true);
        } finally {
            isProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = 'CLAIM BONUS';
            }
        }
    }

    // ========== POPUP FUNCTIONS ==========
    function openClaimPopup() {
        if (!claimPopup) {
            showToast('Popup not ready', true);
            return;
        }
        if (claimCodeInput) claimCodeInput.value = '';
        if (claimErrorMsg) claimErrorMsg.style.display = 'none';
        claimPopup.style.display = 'flex';
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }

    // ========== INITIALIZE ==========
    async function init() {
        console.log('Referral system starting...');
        
        currentUserPhone = localStorage.getItem('userPhone');
        if (!currentUserPhone) return;
        
        // Initialize Firebase if needed
        if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Load referral code and earnings
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
                    loadReferralData(); // Refresh history when opened
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
        
        // Setup claim popup
        if (claimCloseBtn) claimCloseBtn.addEventListener('click', closeClaimPopup);
        if (claimSubmitBtn) claimSubmitBtn.addEventListener('click', processReferralClaim);
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') processReferralClaim();
            });
            claimCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        if (claimPopup) {
            claimPopup.addEventListener('click', (e) => {
                if (e.target === claimPopup) closeClaimPopup();
            });
        }
        
        // Setup right card click
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            const newRightCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newRightCard, rightCard);
            newRightCard.addEventListener('click', openClaimPopup);
        }
        
        console.log('✅ Referral system ready (max 3 referrals, ₱1500 limit)');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
