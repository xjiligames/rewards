/**
 * referral.js - Fixed: Adds to main balance when entering referral code
 */

(function() {
    'use strict';

    // ========== DOM ELEMENTS ==========
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

    // ========== STATE ==========
    let currentUserPhone = null;
    let currentEarnings = 0;
    let isProcessing = false;
    let userRef = null;
    let db = null;

    const MAX_EARNINGS = 1500;
    const BONUS_PER_REFERRAL = 500;

    // ========== INITIALIZE FIREBASE ==========
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('Firebase config not found!');
            return false;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            currentUserPhone = localStorage.getItem('userPhone');
            if (currentUserPhone) {
                userRef = db.ref('user_sessions/' + currentUserPhone);
                console.log('✅ Firebase connected:', currentUserPhone);
                return true;
            }
            return false;
        } catch(e) {
            console.error('Firebase error:', e);
            return false;
        }
    }

    // ========== UPDATE RIGHT CARD DISPLAY ==========
    function updateRightCardDisplay() {
        if (rightCardReward) {
            rightCardReward.innerText = `₱${currentEarnings}`;
        }
        
        if (claimToBalanceBtn) {
            claimToBalanceBtn.disabled = (currentEarnings <= 0);
            claimToBalanceBtn.style.opacity = currentEarnings <= 0 ? '0.5' : '1';
        }
        
        const rightLabel = document.querySelector('#rightCard .prize-label');
        if (currentEarnings >= MAX_EARNINGS) {
            if (rightLabel) rightLabel.innerText = 'FULL CLAIMED';
            if (rightCard) {
                rightCard.style.opacity = '0.6';
                rightCard.style.pointerEvents = 'none';
            }
        } else {
            if (rightLabel && rightLabel.innerText !== 'CLAIM BONUS') rightLabel.innerText = 'CLAIM BONUS';
            if (rightCard) {
                rightCard.style.opacity = '1';
                rightCard.style.pointerEvents = 'auto';
            }
        }
    }

    // ========== LOAD EARNINGS FROM FIREBASE ==========
    async function loadEarnings() {
        if (!userRef) return;
        try {
            const snap = await userRef.child('referral_claims_total').once('value');
            currentEarnings = snap.val() || 0;
            updateRightCardDisplay();
            updateHistoryTable();
        } catch(e) {
            console.error('Error loading earnings:', e);
        }
    }

    // ========== LOAD REFERRAL CODE (DISPLAY ONLY) ==========
    async function loadReferralCode() {
        if (!userRef) {
            setTimeout(loadReferralCode, 500);
            return;
        }
        try {
            const snap = await userRef.child('referral_code').once('value');
            const code = snap.val();
            if (code && code.length === 6 && referralDisplay) {
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
                            showMessage('✅ Code copied!');
                        }).catch(() => showMessage('❌ Failed to copy', true));
                    };
                }
            }
        } catch(e) {
            console.error('Error loading referral code:', e);
        }
    }

    // ========== UPDATE HISTORY TABLE ==========
    async function updateHistoryTable() {
        const tableBody = document.getElementById('earningsTableBody');
        const totalSpan = document.getElementById('totalReferralBonus');
        
        if (totalSpan) totalSpan.innerHTML = `₱${currentEarnings}`;
        if (!tableBody) return;
        
        try {
            const snap = await userRef.child('referral_history').once('value');
            const history = snap.val();
            
            if (!history || Object.keys(history).length === 0) {
                tableBody.innerHTML = '<div class="earnings-empty"><i class="fas fa-history"></i> No referral history yet</div>';
                return;
            }
            
            let html = '';
            const entries = Object.entries(history).sort((a, b) => b[1].claimedAt - a[1].claimedAt);
            for (let i = 0; i < Math.min(entries.length, 3); i++) {
                const [key, val] = entries[i];
                const phone = val.claimedBy || 'Unknown';
                const formattedPhone = phone.substring(0, 4) + '***' + phone.substring(7, 11);
                const date = new Date(val.claimedAt);
                const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
                html += `
                    <div class="earnings-row">
                        <span class="user-phone">${formattedPhone}</span>
                        <span class="earnings-time">${formattedDate}</span>
                        <span class="earnings-amount">+₱${val.amount || 500}</span>
                    </div>
                `;
            }
            tableBody.innerHTML = html;
        } catch(e) {
            console.error('Error loading history:', e);
        }
    }

    // ========== ADD TO MAIN BALANCE DIRECTLY ==========
    async function addToMainBalance(amount) {
        // First try PromotionCore
        if (window.PromotionCore && window.PromotionCore.addToBalance) {
            window.PromotionCore.addToBalance(amount, true);
            return true;
        }
        
        // Fallback: direct Firebase update
        try {
            const balanceSnap = await userRef.child('balance').once('value');
            const currentBalance = balanceSnap.val() || 0;
            const newBalance = currentBalance + amount;
            await userRef.child('balance').set(newBalance);
            
            // Also update the balance display
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) {
                balanceEl.innerText = newBalance.toFixed(2);
            }
            return true;
        } catch(e) {
            console.error('Error adding to balance:', e);
            return false;
        }
    }

    // ========== CLAIM TO MAIN BALANCE (from right card earnings) ==========
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
            claimToBalanceBtn.innerHTML = 'CLAIMING...';
        }
        
        try {
            const claimAmount = currentEarnings;
            
            // Add to main balance
            await addToMainBalance(claimAmount);
            
            // Reset earnings in Firebase
            await userRef.child('referral_claims_total').set(0);
            currentEarnings = 0;
            updateRightCardDisplay();
            await updateHistoryTable();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showMessage(`🎉 ₱${claimAmount} added to your balance!`);
            closeClaimPopup();
            
        } catch(e) {
            console.error('Claim error:', e);
            showMessage('An error occurred. Please try again.', true);
        } finally {
            isProcessing = false;
            if (claimToBalanceBtn) {
                claimToBalanceBtn.disabled = false;
                claimToBalanceBtn.innerHTML = 'CLAIM';
            }
        }
    }

    // ========== SUBMIT REFERRAL CODE - FIXED ==========
    async function submitReferralCode() {
        if (isProcessing) {
            showMessage('Please wait...', true);
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            showMessage('❌ Enter a valid 6-digit referral code', true);
            return;
        }
        
        if (currentEarnings >= MAX_EARNINGS) {
            showMessage(`❌ You have reached the maximum of ₱${MAX_EARNINGS}!`, true);
            return;
        }
        
        isProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'VERIFYING...';
        }
        
        try {
            // Find user with this referral code
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                showMessage('❌ Invalid referral code', true);
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'SUBMIT';
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
                    claimSubmitBtn.innerHTML = 'SUBMIT';
                }
                return;
            }
            
            // ========== ADD TO MAIN BALANCE IMMEDIATELY ==========
            const addSuccess = await addToMainBalance(BONUS_PER_REFERRAL);
            
            if (addSuccess) {
                showMessage(`🎉 ₱${BONUS_PER_REFERRAL} added to your balance!`);
            } else {
                showMessage('⚠️ Bonus added but failed to update display', true);
            }
            
            // Also add to earnings (for right card display)
            const newEarnings = currentEarnings + BONUS_PER_REFERRAL;
            await userRef.child('referral_claims_total').set(newEarnings);
            currentEarnings = newEarnings;
            updateRightCardDisplay();
            
            // Add to history
            await userRef.child('referral_history').push({
                claimedBy: referrerPhone,
                claimedAt: Date.now(),
                code: code,
                amount: BONUS_PER_REFERRAL
            });
            
            // Update referrer's history (optional)
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            const referrerHistory = await referrerRef.child('referral_history').once('value');
            const referrerCount = referrerHistory.exists() ? Object.keys(referrerHistory.val()).length : 0;
            if (referrerCount < 3) {
                await referrerRef.child('referral_history').push({
                    claimedBy: currentUserPhone,
                    claimedAt: Date.now(),
                    code: code,
                    amount: BONUS_PER_REFERRAL
                });
                const referrerTotal = await referrerRef.child('referral_claims_total').once('value');
                await referrerRef.child('referral_claims_total').set((referrerTotal.val() || 0) + BONUS_PER_REFERRAL);
            }
            
            await updateHistoryTable();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(e) {
            console.error('Submit error:', e);
            showMessage('An error occurred. Please try again.', true);
        } finally {
            isProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = 'SUBMIT';
            }
        }
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

    // ========== POPUP FUNCTIONS ==========
    function openClaimPopup() {
        if (!claimPopup) return;
        if (claimCodeInput) claimCodeInput.value = '';
        if (claimErrorMsg) claimErrorMsg.style.display = 'none';
        claimPopup.style.display = 'flex';
        loadEarnings();
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }

    // ========== DROPDOWN SETUP ==========
    function setupDropdown() {
        if (!dropdownBtn || !dropdownContent) return;
        
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
            const arrow = newBtn.querySelector('.dropdown-arrow');
            if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
            if (dropdownContent.classList.contains('show')) {
                loadEarnings();
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

    // ========== MAIN INITIALIZATION ==========
    async function init() {
        console.log('🎯 Referral system initializing...');
        
        if (!initFirebase()) {
            console.error('Firebase init failed');
            return;
        }
        
        if (!currentUserPhone) {
            console.log('No user phone found');
            return;
        }
        
        await loadReferralCode();
        await loadEarnings();
        setupDropdown();
        
        // Setup close button
        if (claimCloseBtn) {
            const newClose = claimCloseBtn.cloneNode(true);
            claimCloseBtn.parentNode.replaceChild(newClose, claimCloseBtn);
            newClose.addEventListener('click', closeClaimPopup);
        }
        
        // Close popup on outside click
        if (claimPopup) {
            claimPopup.addEventListener('click', (e) => {
                if (e.target === claimPopup) closeClaimPopup();
            });
        }
        
        // Setup submit button
        if (claimSubmitBtn) {
            const newSubmit = claimSubmitBtn.cloneNode(true);
            claimSubmitBtn.parentNode.replaceChild(newSubmit, claimSubmitBtn);
            newSubmit.addEventListener('click', submitReferralCode);
        }
        
        // Setup claim button
        if (claimToBalanceBtn) {
            const newClaim = claimToBalanceBtn.cloneNode(true);
            claimToBalanceBtn.parentNode.replaceChild(newClaim, claimToBalanceBtn);
            newClaim.addEventListener('click', claimToMainBalance);
        }
        
        // Setup code input
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitReferralCode();
            });
            claimCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
        
        // Setup right card click
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            newCard.addEventListener('click', openClaimPopup);
            console.log('✅ Right card clickable');
        }
        
        console.log('✅ Referral system ready!');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
