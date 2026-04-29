// ========== PROMOTION.JS - UPDATED WITH DROPDOWN ==========

// Global Variables
var leftRewardClaimed = false;
var rightRewardAmount = 0;
var rightRewardClaimed = 0;
var remainingInvites = 6;
var acceptedInvitesCount = 0;
var invitationsList = [];

// ========== LOAD INVITATIONS FROM FIREBASE ==========
async function loadInvitations() {
    var phone = localStorage.getItem("userPhone");
    if (!phone) return;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        var invitesRef = db.ref('invitations/' + phone);
        var snapshot = await invitesRef.once('value');
        
        invitationsList = [];
        if (snapshot.exists()) {
            var data = snapshot.val();
            for (var friendPhone in data) {
                invitationsList.push({
                    phone: friendPhone,
                    status: data[friendPhone].status,
                    timestamp: data[friendPhone].timestamp,
                    acceptedAt: data[friendPhone].acceptedAt || null
                });
            }
        }
        renderInvitationsList();
    }
}

// ========== RENDER INVITATIONS DROPDOWN ==========
function renderInvitationsList() {
    var listBody = document.getElementById('inviteListBody');
    if (!listBody) return;
    
    if (invitationsList.length === 0) {
        listBody.innerHTML = '<div class="invite-empty">No invitations sent yet</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < invitationsList.length; i++) {
        var inv = invitationsList[i];
        var formattedPhone = inv.phone.substring(0, 4) + '****' + inv.phone.substring(8, 11);
        var statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        var statusText = inv.status === 'approved' ? '✅ APPROVED' : '⏳ PENDING';
        var deleteDisabled = inv.status === 'approved' ? 'disabled' : '';
        var deleteStyle = inv.status === 'approved' ? 'opacity:0.5; cursor:not-allowed;' : '';
        
        html += '<div class="invite-item" data-phone="' + inv.phone + '">';
        html += '<span class="invite-phone">' + formattedPhone + '</span>';
        html += '<span class="invite-status ' + statusClass + '">' + statusText + '</span>';
        html += '<button class="invite-delete" onclick="deleteInvitation(\'' + inv.phone + '\')" ' + deleteDisabled + ' style="' + deleteStyle + '">✕</button>';
        html += '</div>';
    }
    listBody.innerHTML = html;
}

// ========== DELETE INVITATION (PENDING ONLY) ==========
window.deleteInvitation = async function(friendPhone) {
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) return;
    
    var invite = invitationsList.find(function(i) { return i.phone === friendPhone; });
    if (invite && invite.status === 'approved') {
        alert("Cannot delete approved invitation. User already claimed reward.");
        return;
    }
    
    if (confirm("Delete invitation to " + friendPhone + "?")) {
        if (typeof firebase !== 'undefined' && firebase.database) {
            var db = firebase.database();
            await db.ref('invitations/' + userPhone + '/' + friendPhone).remove();
            
            // Update remaining invites
            var participantRef = db.ref('participants/' + userPhone);
            var snapshot = await participantRef.once('value');
            if (snapshot.exists()) {
                var newRemaining = (snapshot.val().remainingInvites || 0) + 1;
                await participantRef.update({ remainingInvites: newRemaining });
                remainingInvites = newRemaining;
            }
            
            await loadInvitations();
            
            var statusMsg = document.getElementById('statusMessage');
            if (statusMsg) {
                statusMsg.innerHTML = '✅ Invitation deleted. You have ' + remainingInvites + ' invites left.';
            }
        }
    }
};

// ========== SEND INVITATION ==========
async function sendInvitation() {
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
    
    if (remainingInvites <= 0) {
        alert("You have reached the maximum of 6 invites!");
        return;
    }
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        var inviteRef = db.ref('invitations/' + userPhone + '/' + friendPhone);
        var existingInvite = await inviteRef.once('value');
        
        if (existingInvite.exists()) {
            alert("You already invited this person!");
            return;
        }
        
        await inviteRef.set({
            invitedBy: userPhone,
            invitedPhone: friendPhone,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        var participantRef = db.ref('participants/' + userPhone);
        var participantSnap = await participantRef.once('value');
        var newRemaining = (participantSnap.val().remainingInvites || 6) - 1;
        await participantRef.update({
            totalInvites: (participantSnap.val().totalInvites || 0) + 1,
            remainingInvites: newRemaining,
            lastActive: Date.now()
        });
        
        remainingInvites = newRemaining;
        document.getElementById('friendPhoneInput').value = '';
        await loadInvitations();
        
        var statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.innerHTML = '✅ Invitation sent! Remaining invites: ' + remainingInvites;
        }
    }
}

// ========== ACCEPT INVITATION (when friend clicks lucky cat) ==========
async function acceptInvitation(inviterPhone) {
    var currentUserPhone = localStorage.getItem("userPhone");
    if (!currentUserPhone) return false;
    
    if (typeof firebase !== 'undefined' && firebase.database) {
        var db = firebase.database();
        
        var inviteRef = db.ref('invitations/' + inviterPhone + '/' + currentUserPhone);
        var inviteSnap = await inviteRef.once('value');
        
        if (!inviteSnap.exists()) return false;
        if (inviteSnap.val().status === 'approved') return false;
        
        await inviteRef.update({
            status: 'approved',
            acceptedAt: Date.now()
        });
        
        var inviterRef = db.ref('participants/' + inviterPhone);
        var inviterSnap = await inviterRef.once('value');
        
        if (inviterSnap.exists()) {
            var newAccepted = (inviterSnap.val().acceptedInvites || 0) + 1;
            var newRightTotal = newAccepted * 150;
            
            await inviterRef.update({
                acceptedInvites: newAccepted,
                rightRewardTotal: newRightTotal,
                lastActive: Date.now()
            });
            
            if (inviterPhone === localStorage.getItem("userPhone")) {
                acceptedInvitesCount = newAccepted;
                rightRewardAmount = newRightTotal;
                updateRightCardVisual();
                updateRightRewardDisplay();
                
                var statusMsg = document.getElementById('statusMessage');
                if (statusMsg) {
                    statusMsg.innerHTML = '🎉 A friend accepted your invite! +₱150 available!';
                }
            }
        }
        return true;
    }
    return false;
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Promotion.js loading...");
    
    var userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }
    
    // Send Invitation Button
    var sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        sendBtn.onclick = sendInvitation;
    }
    
    // Claim Now Button (replaces old share button)
    var claimNowBtn = document.getElementById('claimNowBtn');
    if (claimNowBtn) {
        claimNowBtn.onclick = function() {
            showPrizePopup();
        };
    }
    
    // Load invitations
    await loadInvitations();
    
    console.log("Promotion.js ready");
});
