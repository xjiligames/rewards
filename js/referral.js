/**
 * referral.js - Complete Referral System with Threshold
 * Features: Generate code, enter referral codes, threshold system (₱200/code, max ₱1000), claim to balance
 */

(function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    let isGenerating = false;
    let retryCount = 0;
    const MAX_RETRY = 5;
    
    // Threshold System Variables
    let currentThreshold = 0;
    const MAX_THRESHOLD = 1000;
    const BONUS_PER_CODE = 200;
    let isClaimProcessing = false;
    
    // DOM Elements
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    
    // Claim System
    let claimPopup = null;
    let claimCloseBtn = null;
    let claimSubmitBtn = null;
    let claimCodeInput = null;
    let rightCard = null;
    let rightCardReward = null;
    let popupThresholdDisplay = null;
    let popupEarningsList = null;
    let popupClaimBtn = null;
    let errorMsgDiv = null;
    
    // ========== GENERATE 6-CHARACTER REFERRAL CODE ==========
    function generateReferralCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        return letters.charAt(Math.floor(Math.random() * letters.length)) +
               letters.charAt(Math.floor(Math.random() * letters.length)) +
               numbers09.charAt(Math.floor(Math.random() * numbers09.length)) +
               letters.charAt(Math.floor(Math.random() * letters.length)) +
               letters.charAt(Math.floor(Math.random() * letters.length)) +
               numbers06.charAt(Math.floor(Math.random() * numbers06.length));
    }
    
    // ========== PER-CHARACTER ANIMATION ==========
    async function animateCodeGeneration(container, finalCode) {
        if (!container) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        const charSets = [letters, letters, numbers09, letters, letters, numbers06];
        
        container.innerHTML = '';
        const slots = [];
        
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('span');
            slot.className = 'referral-code-slot';
            slot.style.cssText = `display: inline-block; min-width: 55px; text-align: center; font-family: 'Orbitron', monospace; font-size: 32px; font-weight: 900; color: #fce883; transition: all 0.1s ease;`;
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
                setTimeout(() => { slot.style.transform = 'scale(1)'; }, 45);
            }
            
            slot.textContent = finalChar;
            slot.style.color = '#ffffff';
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // ========== FIREBASE OPERATIONS ==========
    async function saveReferralCodeToDB(code) {
        if (!userRef) return false;
        try {
            await userRef.child('referral_code').set(code);
            await userRef.child('referral_code_generated_at').set(Date.now());
            return true;
        } catch(e) { return false; }
    }
    
    async function loadReferralCodeFromDB() {
        if (!userRef) return null;
        try {
            const snap = await userRef.child('referral_code').once('value');
            return snap.val();
        } catch(e) { return null; }
    }
    
    // ========== THRESHOLD FUNCTIONS ==========
    async function loadThreshold() {
        if (!userRef) return 0;
        try {
            const snap = await userRef.child('claim_threshold').once('value');
            currentThreshold = snap.val() || 0;
            updateRightCardDisplay();
            updatePopupDisplay();
            return currentThreshold;
        } catch(e) {
            console.error('Error loading threshold:', e);
            return 0;
        }
    }
    
    function updateRightCardDisplay() {
        if (rightCardReward) {
            rightCardReward.innerHTML = `₱${currentThreshold}`;
        }
        
        // Lock right card if threshold is full
        if (rightCard) {
            if (currentThreshold >= MAX_THRESHOLD) {
                rightCard.style.opacity = '0.6';
                rightCard.style.pointerEvents = 'none';
                rightCard.style.cursor = 'default';
            } else {
                rightCard.style.opacity = '1';
                rightCard.style.pointerEvents = 'auto';
                rightCard.style.cursor = 'pointer';
            }
        }
    }
    
    function updatePopupDisplay() {
        if (popupThresholdDisplay) {
            popupThresholdDisplay.innerHTML = `₱${currentThreshold} / ₱${MAX_THRESHOLD}`;
            
            const progressFill = document.querySelector('#popupThresholdProgress .progress-fill-inner');
            if (progressFill) {
                const percent = (currentThreshold / MAX_THRESHOLD) * 100;
                progressFill.style.width = percent + '%';
            }
        }
        
        if (popupClaimBtn) {
            if (currentThreshold <= 0) {
                popupClaimBtn.disabled = true;
                popupClaimBtn.style.opacity = '0.5';
            } else {
                popupClaimBtn.disabled = false;
                popupClaimBtn.style.opacity = '1';
            }
        }
    }
    
    // ========== USED CODES TRACKING ==========
    async function loadUsedCodes() {
        if (!userRef) return [];
        try {
            const snap = await userRef.child('used_referral_codes').once('value');
            const usedCodes = snap.val();
            return usedCodes ? Object.keys(usedCodes) : [];
        } catch(e) {
            console.error('Error loading used codes:', e);
            return [];
        }
    }
    
    async function saveUsedCode(code, referrerPhone) {
        if (!userRef) return false;
        try {
            await userRef.child('used_referral_codes/' + code).set({
                usedAt: Date.now(),
                fromUser: referrerPhone,
                amount: BONUS_PER_CODE
            });
            return true;
        } catch(e) {
            console.error('Error saving used code:', e);
            return false;
        }
    }
    
    // ========== ADD TO REFERRER HISTORY ==========
    async function addToReferrerHistory(referrerPhone, userPhone, code) {
        try {
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            await referrerRef.child('referral_history').push({
                claimedBy: userPhone,
                claimedAt: Date.now(),
                code: code,
                amount: BONUS_PER_CODE
            });
            
            const currentEarnings = await referrerRef.child('referral_claims_total').once('value');
            const newEarnings = (currentEarnings.val() || 0) + BONUS_PER_CODE;
            await referrerRef.child('referral_claims_total').set(newEarnings);
            
            console.log('✅ Added to referrer history:', referrerPhone);
        } catch(e) {
            console.error('Error adding to referrer history:', e);
        }
    }
    
    // ========== EARNINGS LIST FOR POPUP ==========
    async function addToEarningsList(code, amount, referrerPhone) {
        if (!userRef) return;
        try {
            await userRef.child('claim_earnings_list').push({
                code: code,
                amount: amount,
                fromUser: referrerPhone,
                claimedAt: Date.now(),
                transferred: false
            });
            await loadEarningsList();
        } catch(e) {
            console.error('Error adding to earnings list:', e);
        }
    }
    
    async function loadEarningsList() {
        if (!userRef) return;
        
        const earningsListContainer = document.getElementById('popupEarningsList');
        if (!earningsListContainer) return;
        
        try {
            const snap = await userRef.child('claim_earnings_list').once('value');
            const earnings = snap.val();
            
            if (!earnings || Object.keys(earnings).length === 0) {
                earningsListContainer.innerHTML = '<div class="earnings-empty-list">No referral codes entered yet</div>';
                return;
            }
            
            const earningsArray = Object.entries(earnings).map(([key, value]) => ({
                id: key,
                code: value.code,
                amount: value.amount,
                fromUser: value.fromUser,
                claimedAt: value.claimedAt,
                transferred: value.transferred || false
            })).sort((a, b) => b.claimedAt - a.claimedAt);
            
            let html = '';
            for (const entry of earningsArray) {
                const formattedPhone = entry.fromUser.length >= 11 
                    ? entry.fromUser.substring(0, 4) + '***' + entry.fromUser.substring(7, 11)
                    : entry.fromUser;
                const date = new Date(entry.claimedAt);
                const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
                
                html += `
                    <div class="earnings-list-item">
                        <div class="earnings-list-code">${entry.code}</div>
                        <div class="earnings-list-from">from: ${formattedPhone}</div>
                        <div class="earnings-list-amount">+₱${entry.amount}</div>
                        <div class="earnings-list-date">${formattedDate}</div>
                    </div>
                `;
            }
            earningsListContainer.innerHTML = html;
            
        } catch(e) {
            console.error('Error loading earnings list:', e);
            earningsListContainer.innerHTML = '<div class="earnings-empty-list">Error loading history</div>';
        }
    }
    
    // ========== RENDER FUNCTIONS ==========
    function renderGenerateButton() {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `<button class="referral-golden-generate-btn" id="referralGenerateBtn" style="width:100%; padding:20px; background:linear-gradient(135deg,#b8860b,#d4af37,#fce883); border:none; border-radius:16px; font-family:'Orbitron',monospace; font-size:16px; font-weight:900; color:#1a1100; cursor:pointer;">🪙 GENERATE REFERRAL CODE 🪙</button>`;
        
        const generateBtn = document.getElementById('referralGenerateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleGenerateCode();
            });
        }
    }
    
    function renderCodeDisplay(code) {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `<button class="referral-gold-bar-btn" id="referralGoldBarBtn" style="width:100%; padding:20px; background:linear-gradient(135deg,#b8860b,#d4af37,#fce883); border:none; border-radius:16px; font-family:'Orbitron',monospace; cursor:pointer;"><div style="font-size:12px; color:#1a1100;">YOUR REFERRAL CODE</div><div style="font-size:28px; font-weight:900; color:#1a1100; letter-spacing:4px;">${code}</div><div style="font-size:10px; color:#1a1100;"><i class="fas fa-copy"></i> TAP TO COPY</div></button>`;
        
        const goldBarBtn = document.getElementById('referralGoldBarBtn');
        if (goldBarBtn) {
            goldBarBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(code).then(() => alert('✅ Referral code copied!'));
            });
        }
    }
    
    function showToast(msg) { alert(msg); }
    
    // ========== GENERATION HANDLER ==========
    async function handleGenerateCode() {
        if (isGenerating) { showToast('Already generating...'); return; }
        
        const existingCode = await loadReferralCodeFromDB();
        if (existingCode) {
            currentReferralCode = existingCode;
            renderCodeDisplay(existingCode);
            showToast('You already have a referral code!');
            return;
        }
        
        isGenerating = true;
        const newCode = generateReferralCode();
        
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `display: flex; justify-content: center; gap: 10px; padding: 25px; background: rgba(0,0,0,0.5); border-radius: 16px;`;
        referralDisplayContainer.innerHTML = '';
        referralDisplayContainer.appendChild(animationContainer);
        await animateCodeGeneration(animationContainer, newCode);
        
        const saved = await saveReferralCodeToDB(newCode);
        if (saved) {
            currentReferralCode = newCode;
            if (window.ConfettiModule) window.ConfettiModule.start();
            renderCodeDisplay(newCode);
            showToast('Referral code generated successfully!');
        } else {
            renderGenerateButton();
            showToast('Failed to save code. Try again.');
        }
        isGenerating = false;
    }
    
    async function loadExistingCode() {
        const dbCode = await loadReferralCodeFromDB();
        if (dbCode) {
            currentReferralCode = dbCode;
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
        if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
        
        if (dropdownContent.classList.contains('show')) {
            setTimeout(() => {
                if (!currentReferralCode) renderGenerateButton();
                else renderCodeDisplay(currentReferralCode);
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
    
    // ========== POPUP FUNCTIONS ==========
    function showError(message) {
        if (errorMsgDiv) {
            errorMsgDiv.style.display = 'block';
            errorMsgDiv.style.background = 'rgba(255, 68, 68, 0.15)';
            errorMsgDiv.style.border = '1px solid rgba(255, 68, 68, 0.3)';
            errorMsgDiv.style.color = '#ff8888';
            errorMsgDiv.innerHTML = message;
            setTimeout(() => {
                if (errorMsgDiv) errorMsgDiv.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
    
    function showSuccess(message) {
        if (errorMsgDiv) {
            errorMsgDiv.style.display = 'block';
            errorMsgDiv.style.background = 'rgba(34, 197, 94, 0.15)';
            errorMsgDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            errorMsgDiv.style.color = '#22C55E';
            errorMsgDiv.innerHTML = message;
            setTimeout(() => {
                if (errorMsgDiv) errorMsgDiv.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
    
    function openClaimPopup() {
        console.log('🎯 openClaimPopup called');
        if (!claimPopup) {
            console.error('Claim popup element not found!');
            return;
        }
        if (claimCodeInput) claimCodeInput.value = '';
        if (errorMsgDiv) errorMsgDiv.style.display = 'none';
        claimPopup.style.display = 'flex';
        loadEarningsList();
        updatePopupDisplay();
        console.log('Claim popup opened');
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }
    
    // ========== PROCESS REFERRAL CODE SUBMISSION ==========
    async function processReferralClaim() {
        if (isClaimProcessing) {
            showError('Please wait...');
            return;
        }
        
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        
        if (!code || code.length !== 6) {
            showError('❌ Please enter a valid 6-digit referral code');
            return;
        }
        
        // Check if threshold is full
        if (currentThreshold >= MAX_THRESHOLD) {
            showError('❌ You have reached the maximum threshold of ₱' + MAX_THRESHOLD + '!');
            return;
        }
        
        isClaimProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = '<span>VERIFYING...</span> <i class="fas fa-spinner fa-pulse"></i>';
        }
        
        try {
            // Check if code exists
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                showError('❌ Invalid referral code');
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = '<span>SUBMIT CODE</span> <i class="fas fa-arrow-right"></i>';
                }
                return;
            }
            
            let referrerPhone = null;
            snapshot.forEach((child) => { referrerPhone = child.key; });
            
            if (referrerPhone === currentUserPhone) {
                showError('❌ You cannot use your own referral code!');
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = '<span>SUBMIT CODE</span> <i class="fas fa-arrow-right"></i>';
                }
                return;
            }
            
            // Check if code was already used
            const usedCodes = await loadUsedCodes();
            if (usedCodes.includes(code)) {
                showError('❌ You have already used this referral code!');
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = '<span>SUBMIT CODE</span> <i class="fas fa-arrow-right"></i>';
                }
                return;
            }
            
            // Save used code
            await saveUsedCode(code, referrerPhone);
            
            // Add to referrer's history
            await addToReferrerHistory(referrerPhone, currentUserPhone, code);
            
            // Add to earnings list
            await addToEarningsList(code, BONUS_PER_CODE, referrerPhone);
            
            // Update threshold
            const newThreshold = currentThreshold + BONUS_PER_CODE;
            await userRef.child('claim_threshold').set(newThreshold);
            currentThreshold = newThreshold;
            
            // Update displays
            updateRightCardDisplay();
            updatePopupDisplay();
            await loadEarningsList();
            
            // Clear input
            if (claimCodeInput) claimCodeInput.value = '';
            
            showSuccess('🎉 +₱' + BONUS_PER_CODE + ' added to your threshold!');
            
        } catch(e) {
            console.error('Error:', e);
            showError('An error occurred. Please try again.');
        } finally {
            isClaimProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = '<span>SUBMIT CODE</span> <i class="fas fa-arrow-right"></i>';
            }
        }
    }
    
    // ========== CLAIM THRESHOLD TO MAIN BALANCE ==========
    async function processClaimToBalance() {
        if (isClaimProcessing) {
            showError('Please wait...');
            return;
        }
        
        if (currentThreshold <= 0) {
            showError('❌ No funds to claim! Enter referral codes first.');
            return;
        }
        
        isClaimProcessing = true;
        if (popupClaimBtn) {
            popupClaimBtn.disabled = true;
            popupClaimBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> CLAIMING...';
        }
        
        try {
            const claimAmount = currentThreshold;
            
            // Add to main balance
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(claimAmount, true);
            }
            
            // Reset threshold to 0
            await userRef.child('claim_threshold').set(0);
            currentThreshold = 0;
            
            // Mark all earnings as transferred
            const earningsSnap = await userRef.child('claim_earnings_list').once('value');
            const earnings = earningsSnap.val();
            if (earnings) {
                for (const [key, value] of Object.entries(earnings)) {
                    await userRef.child('claim_earnings_list/' + key + '/transferred').set(true);
                    await userRef.child('claim_earnings_list/' + key + '/transferred_at').set(Date.now());
                }
            }
            
            // Update displays
            updateRightCardDisplay();
            updatePopupDisplay();
            await loadEarningsList();
            
            // Trigger effects
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            
            showSuccess('🎉 ₱' + claimAmount + ' claimed to your balance!');
            
        } catch(e) {
            console.error('Error claiming to balance:', e);
            showError('An error occurred. Please try again.');
        } finally {
            isClaimProcessing = false;
            if (popupClaimBtn) {
                popupClaimBtn.disabled = false;
                popupClaimBtn.innerHTML = '<i class="fas fa-wallet"></i> CLAIM TO BALANCE';
            }
        }
    }
    
    // ========== INITIALIZE CLAIM SYSTEM ==========
    async function initClaimSystem() {
        console.log('🎯 Initializing Claim Bonus System...');
        
        claimPopup = document.getElementById('referralClaimPopup');
        claimCloseBtn = document.getElementById('closeReferralPopupBtn');
        claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
        claimCodeInput = document.getElementById('referralCodeInput');
        rightCard = document.getElementById('rightCard');
        rightCardReward = document.getElementById('rightRewardAmountDisplay');
        popupThresholdDisplay = document.getElementById('popupThresholdAmount');
        popupClaimBtn = document.getElementById('claimToBalanceBtn');
        errorMsgDiv = document.getElementById('referralClaimErrorMsg');
        
        console.log('Claim popup found:', !!claimPopup);
        console.log('Right card found:', !!rightCard);
        
        if (!claimPopup) {
            console.log('Claim popup not found - check HTML');
            return;
        }
        
        if (claimCloseBtn) {
            claimCloseBtn.addEventListener('click', closeClaimPopup);
        }
        
        if (claimSubmitBtn) {
            claimSubmitBtn.addEventListener('click', processReferralClaim);
        }
        
        if (popupClaimBtn) {
            popupClaimBtn.addEventListener('click', processClaimToBalance);
        }
        
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') processReferralClaim();
            });
            claimCodeInput.addEventListener('input', function(e) {
                this.value = this.value.toUpperCase();
            });
        }
        
        if (claimPopup) {
            claimPopup.addEventListener('click', function(e) {
                if (e.target === claimPopup) closeClaimPopup();
            });
        }
        
        // ========== RIGHT CARD CLICK EVENT ==========
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            rightCard.style.opacity = '1';
            rightCard.style.pointerEvents = 'auto';
            
            const newRightCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newRightCard, rightCard);
            rightCard = newRightCard;
            
            rightCard.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ Right card CLICKED - opening popup');
                openClaimPopup();
            });
            
            console.log('✅ Right card click event ATTACHED');
        } else {
            console.error('❌ Right card NOT FOUND in DOM');
        }
        
        await loadThreshold();
        await loadEarningsList();
        console.log('✅ Claim Bonus System ready, Threshold:', currentThreshold);
    }
    
    // ========== FIREBASE INIT ==========
    async function initFirebase() {
        return new Promise((resolve) => {
            if (typeof firebaseConfig === 'undefined') {
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
    
    // ========== MAIN INIT ==========
    async function init() {
        console.log('🎯 Referral System Initializing...');
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        referralDisplayContainer = document.getElementById('referralCodeDisplay');
        
        if (!dropdownBtn || !dropdownContent || !referralDisplayContainer) {
            if (retryCount < MAX_RETRY) {
                retryCount++;
                setTimeout(init, 1000);
            }
            return;
        }
        
        await initFirebase();
        if (!currentUserPhone) return;
        
        await loadExistingCode();
        
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
        await initClaimSystem();
        
        console.log('✅ Referral System ready!');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.ReferralSystem = {
        init: init,
        getReferralCode: () => currentReferralCode,
        generateNewCode: handleGenerateCode
    };
    
})();
