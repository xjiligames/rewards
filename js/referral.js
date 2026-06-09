/**
 * referral.js - Direct Firebase Read (Working Version)
 * Reads referral code directly from Firebase user_sessions
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

    // ========== LOAD REFERRAL CODE DIRECTLY FROM FIREBASE ==========
    async function loadReferralCode() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!userPhone) {
            console.error('No user phone found');
            referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">No user logged in</div>';
            return;
        }

        // Show loading
        referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-pulse"></i> Loading...</div>';

        // Initialize Firebase if needed
        if (typeof firebaseConfig !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
        } else {
            console.error('Firebase config not found');
            referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">Config error</div>';
            return;
        }

        try {
            const db = firebase.database();
            const snapshot = await db.ref('user_sessions/' + userPhone + '/referral_code').once('value');
            let code = snapshot.val();

            console.log('📱 Referral code from Firebase:', code);

            if (code && code.length === 6) {
                // Save to localStorage for instant next time
                localStorage.setItem('user_referral_code', code);
                
                // Display golden bar
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
            } else {
                console.error('No valid referral code found in Firebase');
                referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">No referral code found</div>';
            }
        } catch(err) {
            console.error('Firebase read error:', err);
            referralDisplay.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6666;">Error loading code</div>';
        }
    }

    // ========== DROPDOWN SETUP ==========
    function setupDropdown() {
        // Clone to remove existing listeners
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        const finalBtn = newBtn;

        finalBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
            const arrow = finalBtn.querySelector('.dropdown-arrow');
            if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';

            if (dropdownContent.classList.contains('show')) {
                await loadReferralCode();
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
    console.log('✅ Referral script ready (direct Firebase read)');
})();
