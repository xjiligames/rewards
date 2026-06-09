/**
 * referral.js - One-Time Animation on First Visit
 * First time: animated per-character generation
 * Next visits: instant display from localStorage/Firebase
 */

(function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    let isFirstTime = false;
    let isAnimating = false;
    
    // DOM Elements
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    
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
    
    // ========== PER-CHARACTER ANIMATION (WITH DELAYS) ==========
    async function animateCodeGeneration(container, finalCode) {
        if (!container) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        const charSets = [letters, letters, numbers09, letters, letters, numbers06];
        
        container.innerHTML = '';
        const slots = [];
        
        // Create 6 slots
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('span');
            slot.className = 'referral-code-slot';
            slot.style.cssText = `display: inline-block; min-width: 55px; text-align: center; font-family: 'Orbitron', monospace; font-size: 32px; font-weight: 900; color: #fce883; text-shadow: 0 0 10px rgba(212,175,55,0.5); transition: all 0.1s ease;`;
            slot.textContent = '?';
            container.appendChild(slot);
            slots.push(slot);
        }
        
        // Animate each character sequentially
        for (let i = 0; i < 6; i++) {
            const charSet = charSets[i];
            const finalChar = finalCode[i];
            const slot = slots[i];
            
            // Random rolling effect (12 changes per character)
            for (let r = 0; r < 12; r++) {
                await new Promise(resolve => setTimeout(resolve, 40));
                const randomChar = charSet.charAt(Math.floor(Math.random() * charSet.length));
                slot.textContent = randomChar;
                slot.style.transform = 'scale(1.2)';
                slot.style.opacity = '0.7';
                setTimeout(() => { 
                    slot.style.transform = 'scale(1)';
                    slot.style.opacity = '1';
                }, 40);
            }
            
            // Settle to final character
            slot.textContent = finalChar;
            slot.style.color = '#ffffff';
            slot.style.animation = 'slotReveal 0.3s ease-out';
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Celebration flash
        container.style.animation = 'pulseGold 0.5s ease';
        setTimeout(() => { if (container) container.style.animation = ''; }, 500);
    }
    
    // ========== SAVE TO FIREBASE ==========
    async function saveReferralCodeToDB(code) {
        if (!userRef) return false;
        try {
            await userRef.child('referral_code').set(code);
            await userRef.child('referral_code_generated_at').set(Date.now());
            console.log('✅ Code saved to Firebase:', code);
            return true;
        } catch(e) { 
            console.error('Save error:', e);
            return false; 
        }
    }
    
    // ========== LOAD FROM FIREBASE ==========
    async function loadReferralCodeFromDB() {
        if (!userRef) return null;
        try {
            const snap = await userRef.child('referral_code').once('value');
            return snap.val();
        } catch(e) { 
            console.error('Load error:', e);
            return null; 
        }
    }
    
    // ========== CHECK LOCAL STORAGE FLAG ==========
    function hasReferralCodeInLocal() {
        const stored = localStorage.getItem('user_referral_code');
        const flag = localStorage.getItem('referral_code_generated');
        return stored && flag === 'true';
    }
    
    function saveToLocalStorage(code) {
        localStorage.setItem('user_referral_code', code);
        localStorage.setItem('referral_code_generated', 'true');
        console.log('💾 Saved to localStorage');
    }
    
    // ========== RENDER CODE DISPLAY (INSTANT, NO ANIMATION) ==========
    function renderCodeDisplayInstant(code) {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `
            <div class="golden-bar-display" style="background: linear-gradient(135deg, #b8860b, #d4af37, #fce883, #d4af37, #b8860b); border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 0 20px rgba(212,175,55,0.5); cursor: pointer;">
                <div style="font-size: 11px; color: #1a1100; letter-spacing: 2px; margin-bottom: 8px;">⭐ YOUR REFERRAL CODE ⭐</div>
                <div style="font-size: 32px; font-weight: 900; color: #1a1100; letter-spacing: 6px; font-family: 'Orbitron', monospace;">${code}</div>
                <div style="font-size: 10px; color: #1a1100; margin-top: 8px;"><i class="fas fa-copy"></i> Click to copy</div>
            </div>
        `;
        
        const container = referralDisplayContainer.firstChild;
        if (container) {
            container.addEventListener('click', function() {
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ Referral code copied!');
                });
            });
        }
    }
    
    // ========== SHOW LOADING STATE ==========
    function showLoadingState() {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #d4af37;"></i>
                <div style="margin-top: 10px; color: #d4af37; font-size: 12px;">Loading your code...</div>
            </div>
        `;
    }
    
    // ========== MAIN FUNCTION: GET OR GENERATE CODE ==========
    async function getOrGenerateCode() {
        console.log('🔍 Getting referral code...');
        
        if (!userRef) {
            console.log('⏳ Waiting for userRef...');
            setTimeout(getOrGenerateCode, 500);
            return;
        }
        
        showLoadingState();
        
        try {
            // FIRST: Check localStorage (para instant display)
            const localCode = localStorage.getItem('user_referral_code');
            const hasGenerated = localStorage.getItem('referral_code_generated');
            
            if (localCode && hasGenerated === 'true') {
                console.log('📱 Code found in localStorage (cached):', localCode);
                currentReferralCode = localCode;
                renderCodeDisplayInstant(localCode);
                
                // Double-check Firebase (sync lang)
                const fbCode = await loadReferralCodeFromDB();
                if (!fbCode) {
                    await saveReferralCodeToDB(localCode);
                }
                return;
            }
            
            // SECOND: Check Firebase
            const existingCode = await loadReferralCodeFromDB();
            if (existingCode) {
                console.log('☁️ Code found in Firebase:', existingCode);
                currentReferralCode = existingCode;
                saveToLocalStorage(existingCode);
                renderCodeDisplayInstant(existingCode);
                return;
            }
            
            // THIRD: FIRST TIME USER - Generate new code with animation
            console.log('✨ FIRST TIME USER! Generating new code with animation...');
            isFirstTime = true;
            isAnimating = true;
            
            const newCode = generateReferralCode();
            console.log('🎲 New code generated:', newCode);
            
            // Create animation container
            const animationContainer = document.createElement('div');
            animationContainer.style.cssText = `display: flex; justify-content: center; gap: 10px; padding: 25px 20px; background: rgba(0,0,0,0.4); border-radius: 16px;`;
            referralDisplayContainer.innerHTML = '';
            referralDisplayContainer.appendChild(animationContainer);
            
            // Play animation
            await animateCodeGeneration(animationContainer, newCode);
            
            // Save to Firebase and localStorage
            const saved = await saveReferralCodeToDB(newCode);
            
            if (saved) {
                currentReferralCode = newCode;
                saveToLocalStorage(newCode);
                
                // Trigger celebration effects
                if (window.ConfettiModule) window.ConfettiModule.start();
                if (window.PromotionCore) window.PromotionCore.playSound('success');
                
                renderCodeDisplayInstant(newCode);
                alert('🎉 Your referral code has been generated!');
                console.log('✅ Code saved permanently');
            } else {
                renderCodeDisplayInstant(newCode);
                alert('⚠️ Code generated but not saved to cloud');
            }
            
            isAnimating = false;
            
        } catch(e) {
            console.error('❌ Error:', e);
            renderCodeDisplayInstant('ERROR');
            alert('Error generating code. Please refresh.');
            isAnimating = false;
        }
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
        
        // When dropdown opens, get or generate code
        if (dropdownContent.classList.contains('show')) {
            getOrGenerateCode();
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
    
    // ========== RIGHT CARD CLAIM POPUP ==========
    let claimPopup = null;
    let claimCloseBtn = null;
    let claimSubmitBtn = null;
    let claimCodeInput = null;
    let rightCard = null;
    let errorMsgDiv = null;
    let isProcessing = false;
    
    function openClaimPopup() {
        if (!claimPopup) {
            alert('Claim popup not available yet.');
            return;
        }
        if (claimCodeInput) claimCodeInput.value = '';
        if (errorMsgDiv) errorMsgDiv.style.display = 'none';
        claimPopup.style.display = 'flex';
    }
    
    function closeClaimPopup() {
        if (claimPopup) claimPopup.style.display = 'none';
    }
    
    async function processReferralClaim() {
        const code = claimCodeInput ? claimCodeInput.value.trim().toUpperCase() : '';
        if (!code || code.length !== 6) {
            alert('❌ Please enter a valid 6-digit referral code');
            return;
        }
        
        if (isProcessing) {
            alert('Please wait...');
            return;
        }
        
        isProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'PROCESSING...';
        }
        
        try {
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                alert('❌ Invalid referral code');
                isProcessing = false;
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
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            const claimedSnap = await userRef.child('referral_claimed').once('value');
            if (claimedSnap.val() === true) {
                alert('❌ You have already claimed a referral bonus!');
                closeClaimPopup();
                isProcessing = false;
                if (claimSubmitBtn) {
                    claimSubmitBtn.disabled = false;
                    claimSubmitBtn.innerHTML = 'CLAIM BONUS';
                }
                return;
            }
            
            // Process claim (₱500)
            await userRef.child('referral_claimed').set(true);
            await userRef.child('referral_claimed_at').set(Date.now());
            await userRef.child('referral_used_code').set(code);
            await userRef.child('referral_used_from').set(referrerPhone);
            
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(500, true);
            }
            
            const currentTotal = await userRef.child('referral_claims_total').once('value');
            const newTotal = (currentTotal.val() || 0) + 500;
            await userRef.child('referral_claims_total').set(newTotal);
            
            const referrerRef = db.ref('user_sessions/' + referrerPhone);
            await referrerRef.child('referral_history').push({
                claimedBy: currentUserPhone,
                claimedAt: Date.now(),
                code: code,
                amount: 500
            });
            
            const referrerTotal = await referrerRef.child('referral_claims_total').once('value');
            const newReferrerTotal = (referrerTotal.val() || 0) + 500;
            await referrerRef.child('referral_claims_total').set(newReferrerTotal);
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            
            alert('🎉 You claimed ₱500 bonus!');
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(e) {
            console.error('Error:', e);
            alert('An error occurred. Please try again.');
        } finally {
            isProcessing = false;
            if (claimSubmitBtn) {
                claimSubmitBtn.disabled = false;
                claimSubmitBtn.innerHTML = 'CLAIM BONUS';
            }
        }
    }
    
    async function initClaimSystem() {
        claimPopup = document.getElementById('referralClaimPopup');
        claimCloseBtn = document.getElementById('closeReferralPopupBtn');
        claimSubmitBtn = document.getElementById('submitReferralCodeBtn');
        claimCodeInput = document.getElementById('referralCodeInput');
        rightCard = document.getElementById('rightCard');
        errorMsgDiv = document.getElementById('referralClaimErrorMsg');
        
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
                openClaimPopup();
            });
        }
    }
    
    // ========== FIREBASE INIT ==========
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
    
    // ========== MAIN INIT ==========
    async function init() {
        console.log('🚀 Referral System Starting...');
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        referralDisplayContainer = document.getElementById('referralCodeDisplay');
        
        if (!dropdownBtn || !dropdownContent || !referralDisplayContainer) {
            console.log('Elements not ready, retrying...');
            setTimeout(init, 1000);
            return;
        }
        
        await initFirebase();
        
        if (!currentUserPhone) {
            console.log('No user phone found');
            return;
        }
        
        // Setup dropdown
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
        await initClaimSystem();
        
        console.log('✅ Referral System Ready!');
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.ReferralSystem = {
        init: init,
        getReferralCode: () => currentReferralCode
    };
})();
