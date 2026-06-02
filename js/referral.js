/**
 * referral.js - Simplified Referral System
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
    let isClaimProcessing = false;
    
    // ========== GENERATE 6-CHARACTER REFERRAL CODE ==========
    function generateReferralCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        return letters.charAt(Math.floor(Math.random() * letters.length)) +
               letters.charAt(Math.floor(Math.random() * letters.length)) +
               numbers09.charAt(Math.floor(Math.random() * numbers09.length)) +
               letters.charAt(Math.random() * letters.length) +
               letters.charAt(Math.random() * letters.length) +
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
    
    // ========== REFERRAL CLAIM POPUP FUNCTIONS ==========
    function openClaimPopup() {
        console.log('🎯 openClaimPopup called');
        if (!claimPopup) {
            console.error('Claim popup element not found!');
            return;
        }
        if (claimCodeInput) claimCodeInput.value = '';
        claimPopup.style.display = 'flex';
        console.log('Claim popup opened');
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }
    
    // ========== LOAD REFERRAL EARNINGS ==========
    async function loadReferralEarnings() {
        if (!userRef) return;
        try {
            const snap = await userRef.child('referral_claims_total').once('value');
            const total = snap.val() || 0;
            if (rightCardReward) rightCardReward.innerHTML = `₱${total}`;
        } catch(e) { console.error(e); }
    }
    
    // ========== PROCESS CLAIM ==========
    async function processReferralClaim() {
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            alert('❌ Please enter a valid 6-digit referral code');
            return;
        }
        
        isClaimProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'PROCESSING...';
        }
        
        try {
            // Check if code exists
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                alert('❌ Invalid referral code');
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            let referrerPhone = null;
            snapshot.forEach((child) => { referrerPhone = child.key; });
            
            if (referrerPhone === currentUserPhone) {
                alert('❌ You cannot use your own referral code!');
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            // Check if already claimed
            const claimedSnap = await userRef.child('referral_claimed').once('value');
            if (claimedSnap.val() === true) {
                alert('❌ You have already claimed a referral bonus!');
                closeClaimPopup();
                isClaimProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            // Process claim
            await userRef.child('referral_claimed').set(true);
            await userRef.child('referral_claimed_at').set(Date.now());
            await userRef.child('referral_used_code').set(code);
            await userRef.child('referral_used_from').set(referrerPhone);
            
            // Add to balance
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(150, true);
            }
            
            // Update total
            const currentTotal = await userRef.child('referral_claims_total').once('value');
            const newTotal = (currentTotal.val() || 0) + 150;
            await userRef.child('referral_claims_total').set(newTotal);
            
            // Add to referrer history
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            await referrerRef.child('referral_history').push({
                claimedBy: currentUserPhone,
                claimedAt: Date.now(),
                code: code,
                amount: 150
            });
            
            await loadReferralEarnings();
            if (window.ConfettiModule) window.ConfettiModule.start();
            
            alert('🎉 Congratulations! You claimed ₱150 bonus!');
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(e) {
            console.error('Error:', e);
            alert('An error occurred. Please try again.');
        } finally {
            isClaimProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = 'CLAIM BONUS';
            }
        }
    }
    
    // ========== INITIALIZE CLAIM SYSTEM ==========
    async function initClaimSystem() {
        console.log('🎯 Initializing Referral Claim System...');
        
        claimPopup = document.getElementById('referralClaimPopup');
        claimCloseBtn = document.getElementById('closeReferralPopupBtn');
        claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
        claimCodeInput = document.getElementById('referralCodeInput');
        rightCard = document.getElementById('rightCard');
        rightCardReward = document.getElementById('rightRewardAmountDisplay');
        
        console.log('Claim popup found:', !!claimPopup);
        console.log('Right card found:', !!rightCard);
        
        if (claimCloseBtn) {
            claimCloseBtn.addEventListener('click', closeClaimPopup);
        }
        
        if (claimSubmitBtn) {
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
        
        if (claimPopup) {
            claimPopup.addEventListener('click', function(e) {
                if (e.target === claimPopup) closeClaimPopup();
            });
        }
        
        // ========== RIGHT CARD CLICK EVENT ==========
        if (rightCard) {
            // Make sure it's clickable
            rightCard.style.cursor = 'pointer';
            rightCard.style.opacity = '1';
            rightCard.style.pointerEvents = 'auto';
            
            // Remove any existing listeners by cloning
            const newRightCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newRightCard, rightCard);
            rightCard = newRightCard;
            
            // Add click event
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
        
        await loadReferralEarnings();
        console.log('✅ Referral Claim System ready');
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