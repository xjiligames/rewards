/**
 * referral.js - ULTRA RELIABLE
 * - Walang "Loading..."
 * - Code agad mula localStorage
 * - Unique code per user
 * - Sync sa Firebase sa background (kung available)
 */

(function() {
    'use strict';

    // DOM elements
    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownContent = document.getElementById('dropdownContent');
    const referralDisplay = document.getElementById('referralCodeDisplay');

    if (!dropdownBtn || !dropdownContent || !referralDisplay) {
        console.error('Missing dropdown elements');
        return;
    }

    // ========== GENERATE UNIQUE 6-CHAR CODE ==========
    function generateUniqueCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        // Format: Letter, Letter, Number, Letter, Letter, Number (0-6)
        return letters[Math.floor(Math.random() * 26)] +
               letters[Math.floor(Math.random() * 26)] +
               numbers09[Math.floor(Math.random() * 10)] +
               letters[Math.floor(Math.random() * 26)] +
               letters[Math.floor(Math.random() * 26)] +
               numbers06[Math.floor(Math.random() * 7)];
    }

    // ========== DISPLAY GOLDEN BAR (INSTANT) ==========
    function displayGoldenBar(code) {
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
                navigator.clipboard.writeText(code).then(() => alert('✅ Referral code copied!'));
            };
        }
    }

    // ========== GET OR CREATE CODE (NO ASYNC BLOCKING) ==========
    function getOrCreateCode() {
        // 1. Kunin mula sa localStorage (instant)
        let code = localStorage.getItem('user_referral_code');
        if (code && code.length === 6) {
            displayGoldenBar(code);
            return code;
        }

        // 2. Wala pa → generate ng bago (instant)
        const newCode = generateUniqueCode();
        localStorage.setItem('user_referral_code', newCode);
        displayGoldenBar(newCode);
        return newCode;
    }

    // ========== SYNC TO FIREBASE (background, non-blocking) ==========
    function syncToFirebaseInBackground(code) {
        // Hindi na kailangan hintayin — gawin sa background
        setTimeout(async () => {
            try {
                const userPhone = localStorage.getItem('userPhone');
                if (!userPhone) return;

                // Kung hindi pa initialized ang Firebase at may config, i-initialize
                if (typeof firebase !== 'undefined' && firebase.database && !firebase.apps.length) {
                    if (typeof firebaseConfig !== 'undefined') {
                        firebase.initializeApp(firebaseConfig);
                    } else {
                        console.warn('Firebase config not available, skipping sync');
                        return;
                    }
                }

                if (typeof firebase === 'undefined' || !firebase.database) return;

                const db = firebase.database();
                const userRef = db.ref('user_sessions/' + userPhone);
                const snap = await userRef.child('referral_code').once('value');
                if (!snap.val()) {
                    await userRef.child('referral_code').set(code);
                    await userRef.child('referral_code_generated_at').set(Date.now());
                    console.log('✅ Referral code synced to Firebase');
                }
            } catch (e) {
                console.warn('Firebase sync failed (non-critical):', e.message);
            }
        }, 500); // i-delay ng 0.5 sec para hindi makaapekto sa UI
    }

    // ========== DROPDOWN EVENT ==========
    function setupDropdown() {
        // Palitan ang button para maalis ang old listeners
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        const finalBtn = newBtn;

        finalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
            const arrow = finalBtn.querySelector('.dropdown-arrow');
            if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';

            if (dropdownContent.classList.contains('show')) {
                // KUMAIN NG CODE AGAD (walang loading)
                const code = getOrCreateCode();
                // I-sync sa Firebase sa background (optional)
                syncToFirebaseInBackground(code);
            }
        });

        document.addEventListener('click', (e) => {
            if (!finalBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
                const arrow = finalBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = '▼';
            }
        });
    }

    setupDropdown();
    console.log('✅ Referral system ready (instant display, no loading)');
})();
