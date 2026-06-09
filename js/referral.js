/**
 * referral.js - NO MORE LOADING
 * Displays code instantly from localStorage, syncs to Firebase in background
 */

(function() {
    'use strict';

    // DOM elements
    let dropdownBtn = document.getElementById('dropdownBtn');
    let dropdownContent = document.getElementById('dropdownContent');
    let referralDisplay = document.getElementById('referralCodeDisplay');

    if (!dropdownBtn || !dropdownContent || !referralDisplay) {
        console.error('Missing dropdown elements');
        return;
    }

    // ========== UTILITIES ==========
    function generateCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        const nums6 = '0123456';
        return letters[Math.floor(Math.random() * 26)] +
               letters[Math.floor(Math.random() * 26)] +
               nums[Math.floor(Math.random() * 10)] +
               letters[Math.floor(Math.random() * 26)] +
               letters[Math.floor(Math.random() * 26)] +
               nums6[Math.floor(Math.random() * 7)];
    }

    function displayGoldenBar(code) {
        referralDisplay.innerHTML = `
            <div id="refGoldBar" style="background: linear-gradient(135deg, #b8860b, #d4af37, #fce883, #d4af37, #b8860b); border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 0 20px rgba(212,175,55,0.5); cursor: pointer;">
                <div style="font-size: 11px; color: #1a1100; letter-spacing: 2px;">⭐ YOUR REFERRAL CODE ⭐</div>
                <div style="font-size: 32px; font-weight: 900; color: #1a1100; letter-spacing: 6px; font-family: 'Orbitron', monospace;">${code}</div>
                <div style="font-size: 10px; color: #1a1100; margin-top: 8px;"><i class="fas fa-copy"></i> Tap to copy</div>
            </div>
        `;
        const bar = document.getElementById('refGoldBar');
        if (bar) bar.onclick = () => navigator.clipboard.writeText(code).then(() => alert('✅ Copied!'));
    }

    // ========== GET CODE INSTANTLY (NO WAITING) ==========
    function getCodeInstantly() {
        // 1. Try localStorage first (instant)
        let code = localStorage.getItem('user_referral_code');
        if (code && code.length === 6) {
            displayGoldenBar(code);
            return code;
        }

        // 2. Generate new code (instant)
        const newCode = generateCode();
        localStorage.setItem('user_referral_code', newCode);
        displayGoldenBar(newCode);
        return newCode;
    }

    // ========== BACKGROUND SYNC TO FIREBASE (optional, non-blocking) ==========
    function syncToFirebaseInBackground(code) {
        // Don't block the UI, just try to sync if possible
        setTimeout(async () => {
            try {
                const userPhone = localStorage.getItem('userPhone');
                if (!userPhone) return;
                if (typeof firebase === 'undefined' || !firebase.database) return;

                // Initialize Firebase only if not already initialized
                if (!firebase.apps.length && typeof firebaseConfig !== 'undefined') {
                    firebase.initializeApp(firebaseConfig);
                }
                const db = firebase.database();
                const userRef = db.ref('user_sessions/' + userPhone);
                const snap = await userRef.child('referral_code').once('value');
                if (!snap.val()) {
                    await userRef.child('referral_code').set(code);
                    await userRef.child('referral_code_generated_at').set(Date.now());
                    console.log('✅ Synced referral code to Firebase');
                }
            } catch(e) {
                console.warn('Background sync failed (non-critical):', e);
            }
        }, 100);
    }

    // ========== DROPDOWN TOGGLE ==========
    function setupDropdown() {
        // Remove existing listener by cloning
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;

        dropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
            const arrow = dropdownBtn.querySelector('.dropdown-arrow');
            if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';

            if (dropdownContent.classList.contains('show')) {
                // Get code instantly (no loading screen)
                const code = getCodeInstantly();
                // Sync to Firebase in background (doesn't affect display)
                syncToFirebaseInBackground(code);
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
                const arrow = dropdownBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = '▼';
            }
        });
    }

    setupDropdown();
    console.log('✅ Referral system ready (instant display, no loading)');
})();
