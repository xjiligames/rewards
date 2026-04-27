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
        winnerSpan.innerHTML = '🎲 0917***1234 withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱150';
    }
});
