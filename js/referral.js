/**
 * referral.js - Complete Referral System
 * Features:
 * 1. Generate 6-character referral code with animation
 * 2. Display code in gold bar (click to copy)
 * 3. Claim other user's referral code via right card popup
 * 4. Anti-cheat: device fingerprint, can't use own code, one claim per user
 */

(function() {
    'use strict';
    
    // ========== DOM ELEMENTS ==========
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    
    // ========== STATE ==========
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    let isGenerating = false;
    let retryCount = 0;
    const MAX_RETRY = 5;
    
    // ========== CLAIM SYSTEM VARIABLES ==========
    let claimPopup = null;
    let claimCloseBtn = null;
    let claimSubmitBtn = null;
    let claimCodeInput = null;
    let rightCard = null;
    let rightCardReward = null;
    let currentDeviceId = null;
    let isClaimProcessing = false;
    
    // ========== GENERATE 6-CHARACTER REFERRAL CODE ==========
    function generateReferralCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        const char1 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char2 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char3 = numbers09.charAt(Math.floor(Math.random() * numbers09.length));
        const char4 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char5 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char6 = numbers06.charAt(Math.floor(Math.random() * numbers06.length));
        
        return char1 + char2 + char3 + char4 + char5 + char6;
    }
    
    // ========== PER-CHARACTER ANIMATION EFFECT ==========
    async function animateCodeGeneration(container, finalCode) {
        if (!container) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        const charSets = [
            letters, letters, numbers09, letters, letters, numbers06
        ];
        
        container.innerHTML = '';
        const slots = [];
        
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('span');
            slot.className = 'referral-code-slot';
            slot.style.cssText = `
                display: inline-block;
                min-width: 55px;
                text-align: center;
                font-family: 'Orbitron', monospace;
                font-size: 32px;
                font-weight: 900;
                background: linear-gradient(135deg, #fce883, #d4af37);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                transition: all 0.1s ease;
            `;
            slot.textContent = '?';
            container.appendChild(slot);
            slots.push(slot);
        }
        
        for (let i = 0; i < 6; i++) {
            const charSet = charSets[i];
            const finalChar = finalCode[i];
            const slot = slots[i];
            
            for (let r = 0; r < 15; r++) {
                await new Promise(resolve => setTimeout(resolve, 45));
                const randomChar = charSet.charAt(Math.floor(Math.random() * charSet.length));
                slot.textContent = randomChar;
                slot.style.transform = 'scale(1.15)';
                slot.style.opacity = '0.7';
                
                setTimeout(() => {
                    slot.style.transform = 'scale(1)';
                    slot.style.opacity = '1';
                }, 45);
            }
            
            slot.textContent = finalChar;
            slot.style.animation = 'slotReveal 0.3s ease-out';
            slot.style.color = '#ffffff';
            slot.style.background = 'none';
            slot.style.webkitBackgroundClip = 'unset';
            slot.style.backgroundClip = 'unset';
            
            try {
                const audio = new Audio('sounds/super_ace_scatter_ring.mp3');
                audio.volume = 0.2;
                audio.play().catch(e => console.log('Sound error:', e));
            } catch(e) {}
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        container.style.animation = 'pulseGold 0.5s ease';
        setTimeout(() => {
            if (container) container.style.animation = '';
        }, 500);
    }
    
    // ========== FIREBASE OPERATIONS ==========
    async function saveReferralCodeToDB(code) {
        if (!userRef || !currentUserPhone) return false;
        try {
            await userRef.child('referral_code').set(code);
            await userRef.child('referral_code_generated_at').set(Date.now());
            console.log('✅ Referral code saved to Firebase:', code);
            return true;
        } catch(e) {
            console.error('Error saving referral code:', e);
            return false;
        }
    }
    
    async function loadReferralCodeFromDB() {
        if (!userRef) return null;
        try {
            const snap = await userRef.child('referral_code').once('value');
            const code = snap.val();
            if (code) {
                console.log('✅ Loaded existing referral code from Firebase:', code);
                return code;
            }
            return null;
        } catch(e) {
            console.error('Error loading referral code:', e);
            return null;
        }
    }
    
    function getReferralCodeFromLocalStorage() {
        const stored = localStorage.getItem('user_referral_code');
        if (stored) {
            console.log('✅ Found referral code in localStorage:', stored);
            return stored;
        }
        return null;
    }
    
    function saveReferralCodeToLocalStorage(code) {
        localStorage.setItem('user_referral_code', code);
        console.log('💾 Saved referral code to localStorage:', code);
    }
    
    // ========== RENDER FUNCTIONS ==========
    function renderGenerateButton() {
        if (!referralDisplayContainer) return;
        
        referralDisplayContainer.innerHTML = `
            <button class="referral-golden-generate-btn" id="referralGenerateBtn">
                <div class="generate-btn-inner">
                    <div class="generate-shine"></div>
                    <i class="fas fa-gem"></i>
                    <span class="generate-text">🪙 GENERATE REFERRAL CODE 🪙</span>
                    <i class="fas fa-arrow-right"></i>
                </div>
            </button>
        `;
        
        const generateBtn = document.getElementById('referralGenerateBtn');
        if (generateBtn) {
            const newBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newBtn, generateBtn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Generate button clicked!');
                handleGenerateCode();
            });
            
            console.log('✅ Generate button attached');
        }
    }
    
    function renderCodeDisplay(code) {
        if (!referralDisplayContainer) return;
        
        referralDisplayContainer.innerHTML = `
            <button class="referral-gold-bar-btn" id="referralGoldBarBtn">
                <div class="gold-bar-inner">
                    <div class="gold-bar-shine-effect"></div>
                    <div class="gold-bar-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <div class="gold-bar-code-label">YOUR REFERRAL CODE</div>
                    <div class="gold-bar-code-value" id="referralCodeValue">${code}</div>
                    <div class="gold-bar-click-hint">
                        <i class="fas fa-copy"></i> TAP TO COPY
                    </div>
                </div>
            </button>
        `;
        
        const goldBarBtn = document.getElementById('referralGoldBarBtn');
        if (goldBarBtn) {
            const newBtn = goldBarBtn.cloneNode(true);
            goldBarBtn.parentNode.replaceChild(newBtn, goldBarBtn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const codeValue = document.getElementById('referralCodeValue');
                if (codeValue) {
                    const code = codeValue.textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        const hint = newBtn.querySelector('.gold-bar-click-hint');
                        if (hint) {
                            const originalText = hint.innerHTML;
                            hint.innerHTML = '<i class="fas fa-check"></i> COPIED!';
                            setTimeout(() => {
                                hint.innerHTML = originalText;
                            }, 1500);
                        }
                        showToast('✅ Referral code copied!');
                        
                        newBtn.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            newBtn.style.transform = 'scale(1)';
                        }, 150);
                    }).catch(() => {
                        showToast('❌ Failed to copy');
                    });
                }
            });
        }
    }
    
    function showToast(message) {
        const existingToast = document.querySelector('.referral-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'referral-toast';
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 1px solid #d4af37;
            color: #fce883;
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10002;
            animation: toastFadeOut 2s ease-out forwards;
            white-space: nowrap;
            font-family: 'Orbitron', monospace;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast) toast.remove(); }, 2000);
    }
    
    // ========== GENERATION HANDLER ==========
    async function handleGenerateCode() {
        if (isGenerating) {
            showToast('⏳ Already generating...');
            return;
        }
        
        const existingCode = await loadReferralCodeFromDB();
        if (existingCode) {
            currentReferralCode = existingCode;
            saveReferralCodeToLocalStorage(existingCode);
            renderCodeDisplay(existingCode);
            showToast('✅ You already have a referral code!');
            return;
        }
        
        isGenerating = true;
        
        const generateBtn = document.getElementById('referralGenerateBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.6';
            generateBtn.style.cursor = 'not-allowed';
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> GENERATING...';
        }
        
        const newCode = generateReferralCode();
        console.log('🎲 Generated new code:', newCode);
        
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 25px 20px;
            background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4));
            border-radius: 16px;
            margin: 10px 0;
        `;
        referralDisplayContainer.innerHTML = '';
        referralDisplayContainer.appendChild(animationContainer);
        
        await animateCodeGeneration(animationContainer, newCode);
        
        const saved = await saveReferralCodeToDB(newCode);
        
        if (saved) {
            currentReferralCode = newCode;
            saveReferralCodeToLocalStorage(newCode);
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            renderCodeDisplay(newCode);
            showToast('🎉 Referral code generated successfully!');
        } else {
            renderGenerateButton();
            showToast('❌ Failed to save code. Please try again.');
        }
        
        isGenerating = false;
    }
    
    async function loadExistingCode() {
        const localCode = getReferralCodeFromLocalStorage();
        if (localCode) {
            currentReferralCode = localCode;
            renderCodeDisplay(localCode);
            return true;
        }
        
        const dbCode = await loadReferralCodeFromDB();
        if (dbCode) {
            currentReferralCode = dbCode;
            saveReferralCodeToLocalStorage(dbCode);
            renderCodeDisplay(dbCode);
            return true;
        }
        
        return false;
    }
    
    // ========== DROPDOWN FUNCTIONS ==========
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!dropdownContent) return;
        
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) {
            arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
        }
        
        if (dropdownContent.classList.contains('show')) {
            setTimeout(() => {
                if (!currentReferralCode) {
                    renderGenerateButton();
                } else {
                    renderCodeDisplay(currentReferralCode);
                }
            }, 50);
        }
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
    
    // ========== REFERRAL CLAIM SYSTEM ==========
    
    async function loadReferralEarnings() {
        if (!userRef) return;
        try {
            const snap = await userRef.child('referral_claims_total').once('value');
            const total = snap.val() || 0;
            if (rightCardReward) {
                rightCardReward.innerHTML = `₱${total}`;
            }
        } catch(e) {
            console.error('Error loading referral earnings:', e);
        }
    }
    
    async function updateReferralEarningsDisplay() {
        if (!userRef) return;
        try {
            const snap = await userRef.child('referral_claims_total').once('value');
            const total = snap.val() || 0;
            if (rightCardReward) {
                rightCardReward.innerHTML = `₱${total}`;
            }
        } catch(e) {
            console.error('Error updating earnings display:', e);
        }
    }
    
    async function hasUserClaimedReferral() {
        if (!userRef) return true;
        try {
            const snap = await userRef.child('referral_claimed').once('value');
            return snap.val() === true;
        } catch(e) {
            console.error('Error checking claim status:', e);
            return true;
        }
    }
    
    function showErrorAlert(message) {
        alert(message);
    }
    
    async function validateReferralCode(code) {
        const usersRef = db.ref('user_sessions');
        const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
        
        if (!snapshot.exists()) {
            showErrorAlert('❌ Invalid referral code. Please check and try again.');
            return { valid: false };
        }
        
        let referrerPhone = null;
        snapshot.forEach((child) => {
            referrerPhone = child.key;
        });
        
        if (referrerPhone === currentUserPhone) {
            showErrorAlert('❌ You cannot use your own referral code!');
            return { valid: false };
        }
        
        const hasClaimed = await hasUserClaimedReferral();
        if (hasClaimed) {
            showErrorAlert('❌ You have already claimed a referral bonus! Only one claim per user.');
            return { valid: false };
        }
        
        const referrerDeviceSnap = await db.ref('user_sessions/' + referrerPhone + '/deviceFingerprint').once('value');
        const referrerDeviceId = referrerDeviceSnap.val();
        currentDeviceId = localStorage.getItem('userDeviceId');
        
        if (referrerDeviceId === currentDeviceId) {
            showErrorAlert('❌ You cannot use a referral code from the same device! This violates our referral system.');
            return { valid: false };
        }
        
        return { valid: true, referrerPhone: referrerPhone, referrerCode: code };
    }
    
    async function addToReferrerHistory(referrerPhone, userPhone, code) {
        try {
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            const historyEntry = {
                claimedBy: userPhone,
                claimedAt: Date.now(),
                code: code,
                amount: 150
            };
            await referrerRef.child('referral_history').push(historyEntry);
            
            const currentCount = await referrerRef.child('referral_count').once('value');
            const newCount = (currentCount.val() || 0) + 1;
            await referrerRef.child('referral_count').set(newCount);
            
            const currentEarnings = await referrerRef.child('referral_claims_total').once('value');
            const newEarnings = (currentEarnings.val() || 0) + 150;
            await referrerRef.child('referral_claims_total').set(newEarnings);
            
            console.log('✅ Added to referrer history:', referrerPhone);
        } catch(e) {
            console.error('Error adding to referrer history:', e);
        }
    }
    
    async function processReferralClaim() {
        if (isClaimProcessing) {
            alert('⏳ Please wait, processing your request...');
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        
        if (!code || code.length !== 6) {
            alert('❌ Please enter a valid 6-digit referral code');
            return;
        }
        
        const hasClaimed = await hasUserClaimedReferral();
        if (hasClaimed) {
            alert('❌ You have already claimed a referral bonus! Each user can only claim once.');
            closeClaimPopup();
            return;
        }
        
        isClaimProcessing = true;
        
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = '<span>PROCESSING...</span> <i class="fas fa-spinner fa-pulse"></i>';
        }
        
        try {
            const validation = await validateReferralCode(code);
            
            if (!validation.valid) {
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = '<span>CLAIM BONUS</span> <i class="fas fa-arrow-right"></i>';
                }
                isClaimProcessing = false;
                return;
            }
            
            const { referrerPhone } = validation;
            
            await userRef.child('referral_claimed').set(true);
            await userRef.child('referral_claimed_at').set(Date.now());
            await userRef.child('referral_used_code').set(code);
            await userRef.child('referral_used_from').set(referrerPhone);
            
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(150, true);
            }
            
            const currentTotal = await userRef.child('referral_claims_total').once('value');
            const newTotal = (currentTotal.val() || 0) + 150;
            await userRef.child('referral_claims_total').set(newTotal);
            
            await addToReferrerHistory(referrerPhone, currentUserPhone, code);
            await updateReferralEarningsDisplay();
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            alert('🎉 Congratulations! You claimed ₱150 bonus from referral code: ' + code);
            
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(e) {
            console.error('Error processing claim:', e);
            alert('❌ An error occurred. Please try again.');
        } finally {
            isClaimProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = '<span>CLAIM BONUS</span> <i class="fas fa-arrow-right"></i>';
            }
        }
    }
    
    function openClaimPopup() {
        if (!claimPopup) return;
        if (claimCodeInput) claimCodeInput.value = '';
        claimPopup.style.display = 'flex';
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }
    
    async function initClaimSystem() {
        console.log('🎯 Initializing Referral Claim System...');
        
        claimPopup = document.getElementById('referralClaimPopup');
        claimCloseBtn = document.getElementById('closeReferralPopupBtn');
        claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
        claimCodeInput = document.getElementById('referralCodeInput');
        rightCard = document.getElementById('rightCard');
        rightCardReward = document.getElementById('rightRewardAmountDisplay');
        
        if (!claimPopup) {
            console.log('Referral claim popup not found in DOM');
            return;
        }
        
        if (claimCloseBtn) {
            const newCloseBtn = claimCloseBtn.cloneNode(true);
            claimCloseBtn.parentNode.replaceChild(newCloseBtn, claimCloseBtn);
            claimCloseBtn = newCloseBtn;
            claimCloseBtn.addEventListener('click', closeClaimPopup);
        }
        
        if (claimSubmitBtn) {
            const newSubmitBtn = claimSubmitBtn.cloneNode(true);
            claimSubmitBtn.parentNode.replaceChild(newSubmitBtn, claimSubmitBtn);
            claimSubmitBtn = newSubmitBtn;
            claimSubmitBtn.addEventListener('click', processReferralClaim);
        }
        
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') processReferralClaim();
            });
            claimCodeInput.addEventListener('input', function(e) {
                this.value = this.value.toUpperCase();
            });
        }
        
        claimPopup.addEventListener('click', function(e) {
            if (e.target === claimPopup) closeClaimPopup();
        });
        
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            rightCard.style.opacity = '1';
            rightCard.style.pointerEvents = 'auto';
            
            const newRightCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newRightCard, rightCard);
            
            newRightCard.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Right card clicked - opening referral claim popup');
                openClaimPopup();
            });
            
            console.log('✅ Right card is now clickable for referral claims');
        }
        
        await loadReferralEarnings();
        await loadReferralHistory();
        console.log('✅ Referral Claim System ready');
    }

        // ========== LOAD REFERRAL HISTORY FOR CURRENT USER ==========
    async function loadReferralHistory() {
        if (!userRef) return;
        
        const tableBody = document.getElementById('earningsTableBody');
        const totalBonusSpan = document.getElementById('totalReferralBonus');
        
        if (!tableBody) return;
        
        try {
            const historySnap = await userRef.child('referral_history').once('value');
            const history = historySnap.val();
            const totalSnap = await userRef.child('referral_claims_total').once('value');
            const total = totalSnap.val() || 0;
            
            // Update total bonus display
            if (totalBonusSpan) {
                totalBonusSpan.innerHTML = `₱${total}`;
            }
            
            // Clear table body
            tableBody.innerHTML = '';
            
            if (!history || Object.keys(history).length === 0) {
                tableBody.innerHTML = '<div class="earnings-empty"><i class="fas fa-history"></i> No referral history yet</div>';
                return;
            }
            
            // Convert to array and sort by date (newest first)
            const historyArray = Object.entries(history).map(([key, value]) => ({
                id: key,
                ...value
            })).sort((a, b) => b.claimedAt - a.claimedAt);
            
            // Display each history entry
            for (const entry of historyArray) {
                const claimedBy = entry.claimedBy || 'Unknown';
                const formattedPhone = claimedBy.substring(0, 4) + '***' + claimedBy.substring(7, 11);
                const date = new Date(entry.claimedAt);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const amount = entry.amount || 150;
                
                const row = document.createElement('div');
                row.className = 'earnings-row';
                row.innerHTML = `
                    <span class="user-phone">${formattedPhone}</span>
                    <span class="earnings-time">${formattedDate}</span>
                    <span class="earnings-amount">+₱${amount}</span>
                `;
                tableBody.appendChild(row);
            }
            
        } catch(e) {
            console.error('Error loading referral history:', e);
            if (tableBody) {
                tableBody.innerHTML = '<div class="earnings-empty"><i class="fas fa-exclamation-triangle"></i> Error loading history</div>';
            }
        }
    }
    
    // ========== FIREBASE INITIALIZATION ==========
    async function initFirebase() {
        return new Promise((resolve) => {
            if (typeof firebaseConfig === 'undefined') {
                console.error('Firebase config not found!');
                resolve(false);
                return;
            }
            try {
                if (!firebase.apps || !firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                db = firebase.database();
                currentUserPhone = localStorage.getItem('userPhone');
                if (currentUserPhone) {
                    userRef = db.ref('user_sessions/' + currentUserPhone);
                }
                resolve(true);
            } catch(e) {
                console.error('Firebase error:', e);
                resolve(false);
            }
        });
    }
    
    // ========== MAIN INITIALIZATION ==========
    async function init() {
        console.log('🎯 Referral System Initializing...');
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        referralDisplayContainer = document.getElementById('referralCodeDisplay');
        
        if (!dropdownBtn || !dropdownContent || !referralDisplayContainer) {
            console.error('Required DOM elements not found!');
            if (retryCount < MAX_RETRY) {
                retryCount++;
                console.log(`Retrying (${retryCount}/${MAX_RETRY})...`);
                setTimeout(init, 1000);
            }
            return;
        }
        
        await initFirebase();
        
        if (!currentUserPhone) {
            console.error('No user phone found');
            return;
        }
        
        currentDeviceId = localStorage.getItem('userDeviceId');
        
        const hasCode = await loadExistingCode();
        if (!hasCode) {
            console.log('No referral code found. Ready to generate.');
        } else {
            console.log('Referral code already exists:', currentReferralCode);
        }
        
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
        await initClaimSystem();
        
        console.log('✅ Referral System ready!');
    }
    
    // Start the system
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export for external use
    window.ReferralSystem = {
        init: init,
        getReferralCode: () => currentReferralCode,
        generateNewCode: handleGenerateCode
    };
    
})();
