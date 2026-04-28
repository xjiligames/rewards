// Idagdag ito sa device tracker para ma-track din ang number

async function verifyNumberAndDevice() {
    const storedPhone = localStorage.getItem("userPhone");
    const currentFingerprint = getCurrentDeviceFingerprint();
    
    // 1. Check kung banned ang number
    const bannedSnap = await db.ref('banned_ghosts/' + storedPhone).once('value');
    if (bannedSnap.exists()) {
        alert("❌ Ang number na ito ay BANNED ng admin.");
        window.location.href = "index.html";
        return false;
    }
    
    // 2. Check kung may ibang number na gumamit ng device na ito
    const devicePhoneMap = await db.ref('device_phone_map/' + currentFingerprint).once('value');
    if (devicePhoneMap.exists()) {
        const registeredPhone = devicePhoneMap.val().phone;
        if (registeredPhone !== storedPhone) {
            alert("⚠️ Ang device na ito ay naka-link sa ibang number! Hindi pwede.");
            return false;
        }
    }
    
    // 3. Check kung ang number ay may ibang device na ginamit dati
    const userSession = await db.ref('user_sessions/' + storedPhone).once('value');
    if (userSession.exists()) {
        const originalDevice = userSession.val().deviceFingerprint;
        if (originalDevice && originalDevice !== currentFingerprint) {
            alert("⚠️ Gumamit ka ng ibang device! Gamitin ang original device mo.");
            return false;
        }
    }
    
    return true;
}

// SIMPLIFIED TEST VERSION - Check if button works
document.addEventListener('DOMContentLoaded', function() {
    const shareBtn = document.getElementById('shareButton');
    const friendInput = document.getElementById('friendPhoneInput');
    
    console.log("Share button found:", shareBtn);
    
    if (shareBtn) {
        shareBtn.onclick = function() {
            const phone = friendInput.value.trim();
            if (!phone || phone.length !== 11 || !phone.startsWith('09')) {
                alert("Please enter valid 11-digit number starting with 09");
                return;
            }
            alert("Share button works! Phone: " + phone);
        };
        shareBtn.disabled = false;
        shareBtn.style.opacity = '1';
        shareBtn.style.pointerEvents = 'auto';
    }
    
    // Test countdown
    function updateTimer() {
        const target = new Date(2026, 4, 1, 0, 0, 0);
        const now = new Date();
        const diff = target - now;
        const timerDisplay = document.getElementById('mainTimerDisplay');
        if (timerDisplay && diff > 0) {
            const days = Math.floor(diff / (1000*60*60*24));
            const hours = Math.floor((diff % (86400000)) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            timerDisplay.innerHTML = `${days}D ${hours.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        } else if (timerDisplay) {
            timerDisplay.innerHTML = "00:00:00";
        }
    }
    updateTimer();
    setInterval(updateTimer, 1000);
    
    // Test ticker
    const winnerSpan = document.getElementById('winnerText');
    if (winnerSpan) {
        winnerSpan.innerHTML = ' 0917***1234 withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱150';
    }
});


// Add this to your promotion.js file
// Connect the CLAIM THRU GCASH button to popup.js firewall logic

document.addEventListener('DOMContentLoaded', function() {
    // Get the claim button from prize popup
    const claimGCashBtn = document.getElementById('claimGCashBtn');
    
    if (claimGCashBtn) {
        // Override existing click handler to use firewall logic
        claimGCashBtn.onclick = function() {
            // Call the showClaimPopup function from popup.js with amount ₱150
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(150);
            } else {
                console.error("showClaimPopup not loaded. Make sure popup.js is loaded first.");
                alert("System loading. Please try again.");
            }
        };
    }
});
