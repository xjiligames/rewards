/**
 * referral.js - ULTRA SIMPLE WORKING VERSION
 * Force display referral code from localStorage or generate new
 */

(function() {
    'use strict';
    
    let currentReferralCode = null;
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    
    // ========== GENERATE 6-CHARACTER CODE ==========
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
    
    // ========== RENDER CODE DIRECTLY ==========
    function renderCode(code) {
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
            container.addEventListener('click', () => {
                navigator.clipboard.writeText(code).then(() => alert('✅ Referral code copied!'));
            });
        }
    }
    
    function showLoading() {
        if (!referralDisplayContainer) return;
        referralDisplayContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <i class="fas fa-spinner fa-pulse" style="font-size: 24px; color: #d4af37;"></i>
                <div style="margin-top: 10px; color: #d4af37;">Loading...</div>
            </div>
        `;
    }
    
    // ========== MAIN LOGIC ==========
    async function getAndDisplayCode() {
        console.log('Getting referral code...');
        showLoading();
        
        // 1. Try localStorage first
        let code = localStorage.getItem('user_referral_code');
        if (code && code.length === 6) {
            console.log('Using cached code:', code);
            currentReferralCode = code;
            renderCode(code);
            return;
        }
        
        // 2. Try Firebase if available
        let userPhone = localStorage.getItem('userPhone');
        let db = null;
        let userRef = null;
        
        if (typeof firebaseConfig !== 'undefined' && firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        if (typeof firebase !== 'undefined' && firebase.database) {
            db = firebase.database();
            if (userPhone) {
                userRef = db.ref('user_sessions/' + userPhone);
                try {
                    const snap = await userRef.child('referral_code').once('value');
                    const fbCode = snap.val();
                    if (fbCode && fbCode.length === 6) {
                        console.log('Using Firebase code:', fbCode);
                        code = fbCode;
                        localStorage.setItem('user_referral_code', code);
                        currentReferralCode = code;
                        renderCode(code);
                        return;
                    }
                } catch(e) { console.log('Firebase read error:', e); }
            }
        }
        
        // 3. Generate new code
        console.log('Generating new code...');
        const newCode = generateReferralCode();
        console.log('New code:', newCode);
        
        // Save to localStorage
        localStorage.setItem('user_referral_code', newCode);
        currentReferralCode = newCode;
        
        // Try to save to Firebase if possible
        if (userRef) {
            try {
                await userRef.child('referral_code').set(newCode);
                await userRef.child('referral_code_generated_at').set(Date.now());
                console.log('Saved to Firebase');
            } catch(e) { console.log('Firebase save error:', e); }
        }
        
        // Show the code directly (no animation to avoid complexity)
        renderCode(newCode);
        
        // Optional: trigger confetti
        if (window.ConfettiModule) window.ConfettiModule.start();
        if (window.PromotionCore) window.PromotionCore.playSound('success');
        
        alert('✅ Your referral code is ready!');
    }
    
    // ========== DROPDOWN TOGGLE ==========
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!dropdownContent) return;
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
        
        if (dropdownContent.classList.contains('show')) {
            getAndDisplayCode();
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
    
    // ========== RIGHT CARD POPUP ==========
    let claimPopup = null;
    let claimCloseBtn = null;
    let claimSubmitBtn = null;
    let claimCodeInput = null;
    let rightCard = null;
    let errorMsgDiv = null;
    let isProcessing = false;
    
    function openClaimPopup() {
        if (!claimPopup) { alert('Popup not ready'); return; }
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
        if (isProcessing) { alert('Please wait...'); return; }
        
        isProcessing = true;
        if (claimSubmitBtn) {
            claimSubmitBtn.disabled = true;
            claimSubmitBtn.innerHTML = 'PROCESSING...';
        }
        
        try {
            const userPhone = localStorage.getItem('userPhone');
            if (!userPhone) throw new Error('No user');
            const db = firebase.database();
            const usersRef = db.ref('user_sessions');
            const snapshot = await usersRef.orderByChild('referral_code').equalTo(code).once('value');
            
            if (!snapshot.exists()) {
                alert('❌ Invalid referral code');
                isProcessing = false;
                if (claimSubmitBtn) { claimSubmitBtn.disabled = false; claimSubmitBtn.innerHTML = 'CLAIM BONUS'; }
                return;
            }
            
            let referrerPhone = null;
            snapshot.forEach((child) => { referrerPhone = child.key; });
            if (referrerPhone === userPhone) {
                alert('❌ You cannot use your own referral code!');
                isProcessing = false;
                if (claimSubmitBtn) { claimSubmitBtn.disabled = false; claimSubmitBtn.innerHTML = 'CLAIM BONUS'; }
                return;
            }
            
            const userRef = db.ref('user_sessions/' + userPhone);
            const claimedSnap = await userRef.child('referral_claimed').once('value');
            if (claimedSnap.val() === true) {
                alert('❌ You have already claimed a referral bonus!');
                closeClaimPopup();
                isProcessing = false;
                if (claimSubmitBtn) { claimSubmitBtn.disabled = false; claimSubmitBtn.innerHTML = 'CLAIM BONUS'; }
                return;
            }
            
            // Claim
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
                claimedBy: userPhone,
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
            console.error(e);
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
            claimCodeInput.addEventListener('input', (e) => { this.value = this.value.toUpperCase(); });
        }
        if (claimPopup) claimPopup.addEventListener('click', (e) => { if (e.target === claimPopup) closeClaimPopup(); });
        
        if (rightCard) {
            rightCard.style.cursor = 'pointer';
            rightCard.style.opacity = '1';
            rightCard.style.pointerEvents = 'auto';
            const newCard = rightCard.cloneNode(true);
            rightCard.parentNode.replaceChild(newCard, rightCard);
            rightCard = newCard;
            rightCard.addEventListener('click', () => openClaimPopup());
        }
    }
    
    // ========== INIT ==========
    async function init() {
        console.log('Referral System Starting (simplified)');
        
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        referralDisplayContainer = document.getElementById('referralCodeDisplay');
        
        if (!dropdownBtn || !dropdownContent || !referralDisplayContainer) {
            setTimeout(init, 500);
            return;
        }
        
        // Setup dropdown
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
        await initClaimSystem();
        
        console.log('Referral System Ready');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.ReferralSystem = { getReferralCode: () => localStorage.getItem('user_referral_code') };
})();
