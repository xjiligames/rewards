// ========== LUCKY CAT MODULE - Default +150 ==========
window.LuckyCatModule = (function() {
    let leftCard = document.getElementById('leftCard');
    let leftReward = document.getElementById('leftRewardAmount');
    let luckyCatStatus = document.getElementById('luckyCatStatus');
    let isClaimed = false;
    let claimInProgress = false;
    
    function updateUI() {
        if (leftReward) {
            leftReward.innerHTML = isClaimed ? 'CLAIMED' : '+150';  // +150 instead of ₱150
            if (isClaimed) {
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
            } else {
                leftReward.style.fontSize = '18px';
                leftReward.style.letterSpacing = 'normal';
            }
        }
        if (leftCard && isClaimed) {
            leftCard.style.opacity = '0.8';
            leftCard.style.pointerEvents = 'none';
        }
        if (luckyCatStatus) {
            luckyCatStatus.innerText = isClaimed ? 'Claimed' : 'Available';
        }
    }
    
    async function checkStatusFromFirebase() {
        const userPhone = localStorage.getItem("userPhone");
        if (!userPhone) return;
        
        try {
            const snapshot = await firebase.database().ref('user_sessions/' + userPhone).once('value');
            const data = snapshot.val();
            if (data && data.claimed_luckycat === true) {
                isClaimed = true;
                updateUI();
                console.log('✅ LuckyCat already claimed in Firebase');
            } else {
                isClaimed = false;
                updateUI();
            }
        } catch(e) {
            console.error('Firebase check error:', e);
        }
    }
    
    async function claim() {
        if (isClaimed) {
            alert("You have already claimed the Lucky Cat bonus!");
            return;
        }
        if (claimInProgress) return;
        
        claimInProgress = true;
        
        // Double check Firebase
        const userPhone = localStorage.getItem("userPhone");
        const snapshot = await firebase.database().ref('user_sessions/' + userPhone).once('value');
        if (snapshot.val()?.claimed_luckycat === true) {
            isClaimed = true;
            updateUI();
            alert("You have already claimed!");
            claimInProgress = false;
            return;
        }
        
        // Add to balance
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150);
        } else {
            const balanceEl = document.getElementById('userBalanceDisplay');
            let currentBalance = parseFloat(balanceEl?.innerText || 0);
            let newBalance = currentBalance + 150;
            if (balanceEl) balanceEl.innerText = newBalance.toFixed(2);
        }
        
        // Mark as claimed
        isClaimed = true;
        updateUI();
        
        // Save to Firebase
        await firebase.database().ref('user_sessions/' + userPhone).update({
            claimed_luckycat: true,
            luckycat_claimed_at: Date.now()
        });
        
        // Save to localStorage
        localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        
        // Play sound and confetti
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
        } else {
            const sound = new Audio('sounds/claim.mp3');
            sound.play().catch(e => console.log(e));
        }
        if (window.ConfettiModule) window.ConfettiModule.start();
        
        alert("🎉 Congratulations! You received ₱150 bonus!");
        claimInProgress = false;
    }
    
    function init() {
        checkStatusFromFirebase();
        if (leftCard) {
            leftCard.addEventListener('click', claim);
        }
    }
    
    init();
    return { checkStatusFromFirebase, claim, isClaimed: () => isClaimed };
})();
