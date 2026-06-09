/**
 * referral.js - Complete Referral System
 * - Displays referral code from Firebase
 * - Right card click opens popup
 * - Enter referral code to earn ₱500
 * - Max 3 referrals (₱1500 limit)
 * - Claim button transfers earnings to main balance
 * - Working close button
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
    const claimToBalanceBtn = document.getElementById('claimToBalanceBtn');
    const popupThresholdDisplay = document.getElementById('popupThresholdAmount');

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

    // ========== SHOW MESSAGE ==========
    function showMessage(msg, isError = false) {
        if (claimErrorMsg) {
            claimErrorMsg.style.display = 'block';
            claimErrorMsg.innerHTML = msg;
            claimErrorMsg.style.background = isError ? 'rgba(255,68,68,0.15)' : 'rgba(34,197,94,0.15)';
            claimErrorMsg.style.border = isError ? '1px solid rgba(255,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)';
            claimErrorMsg.style.color = isError ? '#ff8888' : '#22C55E';
            setTimeout(() => {
                if (claimErrorMsg) claimErrorMsg.style.display = 'none';
            }, 3000);
        } else {
            alert(msg);
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
        
        if (claimToBalanceBtn) {
            claimToBalanceBtn.disabled = (currentEarnings <= 0);
            claimToBalanceBtn.style.opacity = currentEarnings <= 0 ? '0.5' : '1';
        }
        
        // Check if max reached - disable right card
        if (currentEarnings >= MAX_EARNINGS) {
            if (rightCard) {
                rightCard.style.opacity = '0.6';
                rightCard.style.pointerEvents = 'none';
            }
        } else {
            if (rightCard) {
                rightCard.style.opacity = '1';
                rightCard.style.pointerEvents = 'auto';
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
                    if (bar) {
                        bar.onclick = () => {
                            navigator.clipboard.writeText(code).then(() => {
                                showMessage('✅ Referral code copied!');
                            });
                        };
                    }
                }
            } else {
                if (referralDisplay) {
                    referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">No code found</div>';
                }
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
            const formattedPhone = entry.claimedBy ? entry.claimedBy.substring(0, 4) + '***' + entry.claimedBy.substring(7, 11) : 'Unknown';
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
            showMessage('Please wait...', true);
            return;
        }
        
        if (currentEarnings <= 0) {
            showMessage('No earnings to claim!', true);
            return;
        }
        
        isProcessing = true;
        if (claimToBalanceBtn) {
            claimToBalanceBtn.disabled = true;
            claimToBalanceBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> CLAIMING...';
        }
        
        try {
            const claimAmount = currentEarnings;
            
            // Add to main balance
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(claimAmount, true);
            }
            
            // Reset earnings
            await userRef.child('referral_claims_total').set(0);
            currentEarnings = 0;
            
            // Update displays
            updateRightCardDisplay();
            updateHistoryTable();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showMessage(`🎉 ₱${claimAmount} claimed to your balance!`);
            closeClaimPopup();
            
        } catch(err) {
            console.error('Claim error:', err);
            showMessage('An error occurred. Please try again.', true);
        } finally {
            isProcessing = false;
            if (claimToBalanceBtn) {
                claimToBalanceBtn.disabled = false;
                claimToBalanceBtn.innerHTML = '<i class="fas fa-wallet"></i> CLAIM TO BALANCE';
            }
        }
    }

    // ========== PROCESS REFERRAL CODE SUBMISSION ==========
    async function processReferralClaim() {
        if (isProcessing) {
            showMessage('Please wait...', true);
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            showMessage('❌ Please enter a valid 6-digit referral code', true);
            return;
        }
        
        const referralStatus = await canReceiveMoreReferrals();
        if (!referralStatus.allowed) {
            showMessage(`❌ ${referralStatus.reason}`, true);
            return;
        }
        
        const alreadyUsed = await isCodeAlreadyUsed(code);
        if (alreadyUsed) {
            showMessage('❌ You have already used this referral code', true);
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
                showMessage('❌ Invalid referral code. Please check and try again.', true);
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
                showMessage('❌ You cannot use your own referral code!', true);
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
            
            await loadReferralData();
            updateRightCardDisplay();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showMessage(`🎉 +₱${BONUS_PER_REFERRAL} added to your threshold!`);
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(err) {
            console.error('Claim error:', err);
            showMessage('An error occurred. Please try again.', true);
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
            alert('Popup not ready');
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
        
        // Setup popup close button
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
        
        // Close popup when clicking outside
        if (claimPopup) {
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
        if (claimToBalanceBtn) {
            const newClaimBtn = claimToBalanceBtn.cloneNode(true);
            claimToBalanceBtn.parentNode.replaceChild(newClaimBtn, claimToBalanceBtn);
            newClaimBtn.addEventListener('click', claimToMainBalance);
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
