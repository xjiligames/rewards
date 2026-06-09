/**
 * referral.js - ULTRA SIMPLE WORKING VERSION
 * No animation, just display referral code from Firebase
 */

(function() {
    'use strict';
    
    // DOM Elements
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    let rightCard = null;
    let claimPopup = null;
    let claimCloseBtn = null;
    let claimSubmitBtn = null;
    let claimCodeInput = null;
    
    // State
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    
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
    
    // ========== RENDER GOLDEN BAR WITH CODE ==========
    function renderGoldenBar(code) {
        if (!referralDisplayContainer) return;
        
        referralDisplayContainer.innerHTML = `
            <div id="referralGoldenBar" style="background: linear-gradient(135deg, #b8860b, #d4af37, #fce883, #d4af37, #b8860b); border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 0 20px rgba(212,175,55,0.5); cursor: pointer; transition: transform 0.1s ease;">
                <div style="font-size: 11px; color: #1a1100; letter-spacing: 2px; margin-bottom: 8px;">⭐ YOUR REFERRAL CODE ⭐</div>
                <div style="font-size: 32px; font-weight: 900; color: #1a1100; letter-spacing: 6px; font-family: 'Orbitron', monospace;">${code}</div>
                <div style="font-size: 10px; color: #1a1100; margin-top: 8px;"><i class="fas fa-copy"></i> Tap to copy</div>
            </div>
        `;
        
        const bar = document.getElementById('referralGoldenBar');
        if (bar) {
            bar.addEventListener('click', function() {
                navigator.clipboard.writeText(code).then(() => {
                    alert('✅ Referral code copied!');
                }).catch(() => {
                    alert('❌ Failed to copy');
                });
            });
        }
    }
    
    function showLoading() {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #d4af37;">
                <i class="fas fa-spinner fa-pulse"></i> Loading...
            </div>
        `;
    }
    
    // ========== GET OR GENERATE CODE ==========
    async function loadAndDisplayCode() {
        if (!referralDisplayContainer) return;
        
        showLoading();
        
        // Wait for userRef to be ready (max 3 seconds)
        let attempts = 0;
        while (!userRef && attempts < 20) {
            await new Promise(r => setTimeout(r, 150));
            attempts++;
        }
        
        if (!userRef) {
            console.error('UserRef not available');
            renderGoldenBar('ERROR');
            return;
        }
        
        try {
            // Check Firebase first
            let code = await loadReferralCodeFromDB();
            
            if (code && code.length === 6) {
                currentReferralCode = code;
                localStorage.setItem('user_referral_code', code);
                renderGoldenBar(code);
                console.log('✅ Code loaded from Firebase:', code);
                return;
            }
            
            // Check localStorage as fallback
            const localCode = localStorage.getItem('user_referral_code');
            if (localCode && localCode.length === 6) {
                currentReferralCode = localCode;
                await saveReferralCodeToDB(localCode); // sync to Firebase
                renderGoldenBar(localCode);
                console.log('✅ Code loaded from localStorage:', localCode);
                return;
            }
            
            // Generate new code
            const newCode = generateReferralCode();
            console.log('🆕 Generating new code:', newCode);
            
            const saved = await saveReferralCodeToDB(newCode);
            if (saved) {
                currentReferralCode = newCode;
                localStorage.setItem('user_referral_code', newCode);
                renderGoldenBar(newCode);
                
                // Optional: trigger confetti
                if (window.ConfettiModule) window.ConfettiModule.start();
                if (window.PromotionCore) window.PromotionCore.playSound('success');
                
                console.log('✅ New code generated and saved');
            } else {
                renderGoldenBar(newCode);
                console.warn('⚠️ Code generated but not saved to Firebase');
            }
        } catch(e) {
            console.error('Error in loadAndDisplayCode:', e);
            renderGoldenBar('ERROR');
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
        
        if (dropdownContent.classList.contains('show')) {
            loadAndDisplayCode();
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
    let isProcessing = false;
    let claimSubmitBtn = null;
    let errorMsgDiv = null;
    
    function openClaimPopup() {
        if (!claimPopup) {
            alert('Claim popup not ready');
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
            await referrerRef.child('referral_claims_total').set((referrerTotal.val() || 0) + 500);
            
            if (window.ConfettiModule) window.ConfettiModule.start();
            alert('🎉 You claimed ₱500 bonus!');
            closeClaimPopup();
            if (claimCodeInput) claimCodeInput.value = '';
            
        } catch(e) {
            console.error('Claim error:', e);
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
        
        if (claimCloseBtn) claimCloseBtn.addEventListener('click', closeClaimPopup);
        if (claimSubmitBtn) claimSubmitBtn.addEventListener('click', processReferralClaim);
        if (claimCodeInput) {
            claimCodeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') processReferralClaim(); });
            claimCodeInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
        }
        if (claimPopup) claimPopup.addEventListener('click', (e) => { if (e.target === claimPopup) closeClaimPopup(); });
        
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            rightCard.style.opacity = '1';
            rightCard.style.pointerEvents = 'auto';
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            rightCard = newCard;
            rightCard.addEventListener('click', openClaimPopup);
        }
    }
    
    // ========== INITIALIZE FIREBASE ==========
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
                    console.log('Firebase connected for user:', currentUserPhone);
                } else {
                    console.warn('No userPhone in localStorage');
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
        console.log('Referral System Starting (Ultra Simple)');
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        referralDisplayContainer = document.getElementById('referralCodeDisplay');
        
        if (!dropdownBtn || !dropdownContent || !referralDisplayContainer) {
            console.log('Elements missing, retrying...');
            setTimeout(init, 500);
            return;
        }
        
        await initFirebase();
        
        // Setup dropdown
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
        await initClaimSystem();
        
        console.log('✅ Referral System Ready');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.ReferralSystem = {
        getReferralCode: () => currentReferralCode || localStorage.getItem('user_referral_code')
    };
})();
