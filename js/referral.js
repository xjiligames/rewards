/**
 * referral.js - Independent Referral Code System
 * Auto-generates 6-character code with per-character animation
 * Saves to Firebase and localStorage
 */

(function() {
    'use strict';
    
    // DOM Elements
    let dropdownBtn = null;
    let dropdownContent = null;
    let referralDisplayContainer = null;
    
    // State
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    let isGenerating = false;
    let retryCount = 0;
    const MAX_RETRY = 5;
    
    // ========== GENERATE 6-CHARACTER REFERRAL CODE ==========
    // Format: 2 letters (A-Z), 1 number (0-9), 2 letters (A-Z), 1 number (0-6)
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
        
        // Character sets for each position
        const charSets = [
            letters,      // pos 1: A-Z
            letters,      // pos 2: A-Z
            numbers09,    // pos 3: 0-9
            letters,      // pos 4: A-Z
            letters,      // pos 5: A-Z
            numbers06     // pos 6: 0-6
        ];
        
        // Clear container and create slot elements
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
                text-shadow: none;
                letter-spacing: 2px;
                transition: all 0.1s ease;
            `;
            slot.textContent = '?';
            container.appendChild(slot);
            slots.push(slot);
        }
        
        // Animate each character sequentially
        for (let i = 0; i < 6; i++) {
            const charSet = charSets[i];
            const finalChar = finalCode[i];
            const slot = slots[i];
            
            // Random rolling effect (15 changes per character)
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
            
            // Settle to final character
            slot.textContent = finalChar;
            slot.style.animation = 'slotReveal 0.3s ease-out';
            slot.style.color = '#ffffff';
            slot.style.background = 'none';
            slot.style.webkitBackgroundClip = 'unset';
            slot.style.backgroundClip = 'unset';
            
            // Play subtle sound if available
            try {
                const audio = new Audio('sounds/super_ace_scatter_ring.mp3');
                audio.volume = 0.2;
                audio.play().catch(e => console.log('Sound error:', e));
            } catch(e) {}
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Final celebration flash
        container.style.animation = 'pulseGold 0.5s ease';
        setTimeout(() => {
            if (container) container.style.animation = '';
        }, 500);
    }
    
    // ========== SAVE REFERRAL CODE TO FIREBASE ==========
    async function saveReferralCodeToDB(code) {
        if (!userRef || !currentUserPhone) {
            console.error('Cannot save: userRef or userPhone missing');
            return false;
        }
        
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
    
    // ========== LOAD REFERRAL CODE FROM FIREBASE ==========
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
    
    // ========== CHECK LOCAL STORAGE FIRST ==========
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
    
    // ========== RENDER GOLDEN GENERATE BUTTON ==========
    function renderGenerateButton() {
        if (!referralDisplayContainer) return;
        
        referralDisplayContainer.innerHTML = `
            <button class="referral-golden-btn" id="referralGenerateBtn">
                <i class="fas fa-gem"></i>
                🪙 GENERATE REFERRAL CODE 🪙
                <i class="fas fa-arrow-right"></i>
            </button>
        `;
        
        const generateBtn = document.getElementById('referralGenerateBtn');
        if (generateBtn) {
            // Remove any existing listeners by cloning
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
    
    // ========== RENDER DISPLAY WITH GOLD BAR BUTTON (CLICK TO COPY) ==========
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
        // Remove any existing listeners by cloning
        const newBtn = goldBarBtn.cloneNode(true);
        goldBarBtn.parentNode.replaceChild(newBtn, goldBarBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const codeValue = document.getElementById('referralCodeValue');
            if (codeValue) {
                const code = codeValue.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    // Show copied feedback
                    const hint = newBtn.querySelector('.gold-bar-click-hint');
                    if (hint) {
                        const originalText = hint.innerHTML;
                        hint.innerHTML = '<i class="fas fa-check"></i> COPIED!';
                        setTimeout(() => {
                            hint.innerHTML = originalText;
                        }, 1500);
                    }
                    showToast('✅ Referral code copied!');
                    
                    // Add click animation
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
    
    // ========== SHOW TOAST NOTIFICATION ==========
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
    
    // ========== MAIN GENERATION HANDLER ==========
    async function handleGenerateCode() {
        if (isGenerating) {
            showToast('⏳ Already generating...');
            return;
        }
        
        // Double check if code already exists (from Firebase)
        const existingCode = await loadReferralCodeFromDB();
        if (existingCode) {
            currentReferralCode = existingCode;
            saveReferralCodeToLocalStorage(existingCode);
            renderCodeDisplay(existingCode);
            showToast('✅ You already have a referral code!');
            return;
        }
        
        isGenerating = true;
        
        // Update button to show generating state
        const generateBtn = document.getElementById('referralGenerateBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.6';
            generateBtn.style.cursor = 'not-allowed';
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> GENERATING...';
        }
        
        // Generate new code
        const newCode = generateReferralCode();
        console.log('🎲 Generated new code:', newCode);
        
        // Create animation container
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
        
        // Animate the generation
        await animateCodeGeneration(animationContainer, newCode);
        
        // Save to Firebase
        const saved = await saveReferralCodeToDB(newCode);
        
        if (saved) {
            currentReferralCode = newCode;
            saveReferralCodeToLocalStorage(newCode);
            
            // Trigger confetti effect
            if (window.ConfettiModule) {
                window.ConfettiModule.start();
            }
            
            // Play success sound
            if (window.PromotionCore) {
                window.PromotionCore.playSound('success');
            }
            
            renderCodeDisplay(newCode);
            showToast('🎉 Referral code generated successfully!');
            console.log('✅ Referral code permanently saved');
        } else {
            renderGenerateButton();
            showToast('❌ Failed to save code. Please try again.');
        }
        
        isGenerating = false;
    }
    
    // ========== LOAD EXISTING CODE ==========
    async function loadExistingCode() {
        // First check localStorage
        const localCode = getReferralCodeFromLocalStorage();
        if (localCode) {
            currentReferralCode = localCode;
            renderCodeDisplay(localCode);
            console.log('📱 Using code from localStorage');
            return true;
        }
        
        // Then check Firebase
        const dbCode = await loadReferralCodeFromDB();
        if (dbCode) {
            currentReferralCode = dbCode;
            saveReferralCodeToLocalStorage(dbCode);
            renderCodeDisplay(dbCode);
            console.log('☁️ Using code from Firebase');
            return true;
        }
        
        return false;
    }
    
    // ========== DROPDOWN TOGGLE ==========
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!dropdownContent) return;
        
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) {
            arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
        }
        
        // When dropdown opens, check if we need to show generate button or existing code
        if (dropdownContent.classList.contains('show')) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (!currentReferralCode) {
                    // No code yet, show generate button
                    renderGenerateButton();
                } else {
                    // Has code, show display
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
        
        // Get DOM elements
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
        
        // Initialize Firebase
        await initFirebase();
        
        if (!currentUserPhone) {
            console.error('No user phone found');
            return;
        }
        
        // Load existing code
        const hasCode = await loadExistingCode();
        
        if (!hasCode) {
            // No code yet, show generate button when dropdown opens
            console.log('No referral code found. Ready to generate.');
        } else {
            console.log('Referral code already exists:', currentReferralCode);
        }
        
        // Setup dropdown event listeners
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', handleOutsideClick);
        
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
