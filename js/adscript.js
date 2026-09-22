/**
 * C.I.A. Command Center - Admin Panel
 * First Time Setup → Auto Login After
 * + System Verification Panel
 */

const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let globalFirewallActive = false;
let currentUserData = [];
let currentFilter = 'none';
let bannedUsersData = [];

// ============================================================
// SYSTEM VERIFICATION VARIABLES
// ============================================================
let verificationListener = null;
let verificationCountdownInterval = null;
let activeVerifications = {};

// ========== CHECK IF MASTER KEY EXISTS ==========
async function checkMasterKeyExists() {
    try {
        const snap = await db.ref('admin/masterKey').once('value');
        return snap.exists();
    } catch (error) {
        console.warn('Error checking master key:', error);
        return false;
    }
}

// ========== SETUP MASTER KEY (First Time) ==========
async function setupMasterKey() {
    const newKey = document.getElementById('setupNewKey').value.trim();
    const confirmKey = document.getElementById('setupConfirmKey').value.trim();
    const errorDiv = document.getElementById('setupError');
    const btn = document.getElementById('setupBtn');
    
    if (!newKey || !confirmKey) {
        errorDiv.innerHTML = "⚠️ Please fill in both fields";
        errorDiv.style.color = '#ff4444';
        return;
    }
    
    if (newKey.length < 4) {
        errorDiv.innerHTML = "⚠️ Key must be at least 4 characters";
        errorDiv.style.color = '#ff4444';
        document.getElementById('setupNewKey').value = '';
        document.getElementById('setupConfirmKey').value = '';
        document.getElementById('setupNewKey').focus();
        return;
    }
    
    if (newKey !== confirmKey) {
        errorDiv.innerHTML = "⚠️ Keys do not match!";
        errorDiv.style.color = '#ff4444';
        document.getElementById('setupNewKey').value = '';
        document.getElementById('setupConfirmKey').value = '';
        document.getElementById('setupNewKey').focus();
        return;
    }
    
    try {
        btn.disabled = true;
        errorDiv.innerHTML = "⏳ Saving to Firebase...";
        errorDiv.style.color = '#39ff14';
        
        await db.ref('admin/masterKey').set(newKey);
        await db.ref('admin/setupInfo').set({
            createdAt: Date.now(),
            createdBy: 'ADMIN',
            version: '1.0'
        });
        
        errorDiv.innerHTML = "✅ Master key created successfully!";
        errorDiv.style.color = '#39ff14';
        
        setTimeout(() => {
            document.getElementById('setupOverlay').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            document.getElementById('dashboard').classList.add('active');
            
            loadStats();
            checkGlobalFirewallStatus();
            checkChangeNumberStatus();
            
            // 🎯 Initialize System Verification Panel
            initSystemVerificationPanel();
            
            console.log('✅ Setup complete! Auto-login successful.');
        }, 1000);
        
    } catch (error) {
        errorDiv.innerHTML = "❌ Error saving: " + error.message;
        errorDiv.style.color = '#ff4444';
        console.error('Setup error:', error);
        btn.disabled = false;
    }
}

// ========== SHOW SETUP OVERLAY ==========
function showSetupOverlay() {
    const overlay = document.getElementById('setupOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('setupNewKey').focus();
        }, 300);
    }
}

// ========== AUTO-LOGIN OR SHOW SETUP ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing C.I.A. Admin Panel...');
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
        dashboard.classList.remove('active');
    }
    
    const hasKey = await checkMasterKeyExists();
    
    if (hasKey) {
        console.log('🔑 Master key found. Auto-login...');
        const setupOverlay = document.getElementById('setupOverlay');
        if (setupOverlay) setupOverlay.style.display = 'none';
        
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('active');
        }
        
        loadStats();
        checkGlobalFirewallStatus();
        checkChangeNumberStatus();
        
        // 🎯 Initialize System Verification Panel
        setTimeout(() => {
            initSystemVerificationPanel();
        }, 1000);
        
        console.log('✅ Admin panel ready (Auto-login)');
    } else {
        console.log('🔐 No master key found. Showing setup...');
        showSetupOverlay();
    }
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const setupOverlay = document.getElementById('setupOverlay');
        if (setupOverlay && setupOverlay.style.display !== 'none') {
            const activeElement = document.activeElement;
            if (activeElement.id === 'setupNewKey') {
                document.getElementById('setupConfirmKey').focus();
                e.preventDefault();
            } else if (activeElement.id === 'setupConfirmKey') {
                setupMasterKey();
                e.preventDefault();
            }
        }
    }
});

// ========== UI FUNCTIONS ==========
function toggleDropdown(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

function showMasterKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'flex';
    setTimeout(() => {
        document.getElementById('popupNewKey').focus();
    }, 300);
}

function closeKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'none';
    document.getElementById('popupNewKey').value = '';
}

// ========== UPDATE MASTER KEY ==========
async function updateMasterKey() {
    const newKey = document.getElementById('popupNewKey').value.trim();
    
    if (!newKey || newKey.length < 4) {
        alert("⚠️ Key must be at least 4 characters");
        return;
    }
    
    if (!confirm(`⚠️ UPDATE MASTER KEY\n\nChange to "${newKey}"?\n\nThis will not affect your current session.`)) {
        return;
    }
    
    try {
        await db.ref('admin/masterKey').set(newKey);
        await db.ref('admin/lastKeyUpdate').set({
            timestamp: Date.now(),
            updatedBy: 'ADMIN'
        });
        
        alert("✅ Master key updated successfully!");
        closeKeyPopup();
        
    } catch (error) {
        alert("❌ Failed to update: " + error.message);
    }
}

function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) { 
        h = ((h << 5) - h) + u.charCodeAt(i); 
        h |= 0; 
    }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
}

// ========== DEPLOY LINKS ==========
function deploy() {
    const v = document.getElementById('links').value.trim();
    if (!v) {
        alert("⚠️ Enter at least one link");
        return;
    }
    
    const links = v.split('\n').filter(u => u.trim());
    let count = 0;
    
    links.forEach(u => {
        if (u.trim()) {
            db.ref('links').push({ 
                url: u.trim(), 
                hash: generateHash(u.trim()), 
                status: 'available', 
                user: 'NONE', 
                createdAt: Date.now() 
            });
            count++;
        }
    });
    
    document.getElementById('links').value = '';
    alert(`✅ ${count} link(s) deployed!`);
}

function reuseLink(k) { 
    if (confirm("♻️ Recycle this link?")) 
        db.ref('links/' + k).update({ status: 'available', user: 'NONE' }); 
}

// ========== FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("🔥 ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ 
                active: true, 
                activatedBy: "ADMIN", 
                timestamp: Date.now() 
            });
            globalFirewallActive = true;
            if (btn) {
                btn.className = 'firewall-on';
                btn.innerHTML = '🔥 FIREWALL ON 🔥';
                btn.classList.add('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = '🔥 FIREWALL ACTIVE - Verification required';
                statusMsg.style.color = '#ff4444';
            }
            updateBackgroundTheme();
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("🔓 DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({ 
                active: false, 
                deactivatedBy: "ADMIN", 
                timestamp: Date.now() 
            });
            globalFirewallActive = false;
            if (btn) {
                btn.className = 'firewall-off';
                btn.innerHTML = '🔥 FIREWALL OFF';
                btn.classList.remove('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = '🔓 FIREWALL DEACTIVATED - Normal claiming';
                statusMsg.style.color = '#39ff14';
            }
            updateBackgroundTheme();
            alert("🔓 FIREWALL DEACTIVATED");
        }
    }
}

async function checkGlobalFirewallStatus() {
    try {
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        globalFirewallActive = (data && data.active === true);
        updateBackgroundTheme();
        
        const btn = document.getElementById('firewallToggleBtn');
        const statusMsg = document.getElementById('firewallStatusMsg');
        
        if (globalFirewallActive) {
            if (btn) { 
                btn.className = 'firewall-on'; 
                btn.innerHTML = '🔥 FIREWALL ON 🔥'; 
                btn.classList.add('fire-animation'); 
            }
            if (statusMsg) { 
                statusMsg.innerHTML = '🔥 FIREWALL ACTIVE - Verification required'; 
                statusMsg.style.color = '#ff4444'; 
            }
        } else {
            if (btn) { 
                btn.className = 'firewall-off'; 
                btn.innerHTML = '🔥 FIREWALL OFF'; 
                btn.classList.remove('fire-animation'); 
            }
            if (statusMsg) { 
                statusMsg.innerHTML = '🔓 FIREWALL DEACTIVATED - Normal claiming'; 
                statusMsg.style.color = '#39ff14'; 
            }
        }
    } catch (error) {
        console.warn('Could not check firewall status:', error);
    }
}

function updateBackgroundTheme() {
    const body = document.body;
    if (globalFirewallActive) {
        body.classList.add('firewall-active');
    } else {
        body.classList.remove('firewall-active');
    }
}

// ========== CHANGE NUMBER FUNCTIONS ==========
let changeNumberActive = false;

async function toggleChangeNumber() {
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (checkbox && checkbox.checked) {
        await db.ref('admin/changeNumberRequired').set({ 
            active: true, 
            activatedBy: "ADMIN", 
            timestamp: Date.now() 
        });
        changeNumberActive = true;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = '🔥 FIREWALL ACTIVE - Verification required + Change mobile number';
        }
    } else {
        await db.ref('admin/changeNumberRequired').set({ 
            active: false, 
            deactivatedBy: "ADMIN", 
            timestamp: Date.now() 
        });
        changeNumberActive = false;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = '🔥 FIREWALL ACTIVE - Verification required';
        }
    }
}

async function checkChangeNumberStatus() {
    try {
        const snap = await db.ref('admin/changeNumberRequired').once('value');
        const data = snap.val();
        changeNumberActive = (data && data.active === true);
        const checkbox = document.getElementById('changeNumberCheckbox');
        if (checkbox) checkbox.checked = changeNumberActive;
    } catch (error) {
        console.warn('Could not check change number status:', error);
    }
}

// ========== BAN FUNCTIONS ==========
function banGhost() {
    const t = document.getElementById('banTarget').value.trim();
    if (!t) {
        alert("⚠️ Please enter a phone number to ban.");
        return;
    }
    
    if (!/^09\d{9}$/.test(t)) {
        alert("⚠️ Invalid phone number. Format: 09XXXXXXXXX");
        return;
    }
    
    if (confirm(`⚠️ TERMINATE USER ⚠️\n\nBan ${t}?\n\nThis user will no longer be able to claim rewards.`)) {
        db.ref('banned_ghosts/' + t).set({ 
            timestamp: Date.now(), 
            bannedBy: "ADMIN",
            reason: "Manual ban by admin"
        });
        alert(`✅ ${t} has been banned successfully!`);
        document.getElementById('banTarget').value = '';
    }
}

function liftBan(phone) { 
    if (confirm(`🔓 UNBAN USER 🔓\n\nUnban ${phone}?`)) {
        db.ref('banned_ghosts/' + phone).remove();
        alert(`✅ ${phone} has been unbanned successfully!`);
    }
}

// ========== REALTIME DELETE USER FUNCTION ==========
async function deleteSingleUser(phone) {
    if (confirm(`⚠️ DELETE USER ⚠️\n\nAre you sure you want to delete user ${phone}?\n\nThis action CANNOT be undone!`)) {
        try {
            await db.ref('user_sessions/' + phone).remove();
            console.log(`✅ User ${phone} deleted successfully`);
            alert(`✅ User ${phone} deleted successfully!`);
        } catch (error) {
            console.error("Delete error:", error);
            alert("❌ Error deleting user. Please try again.");
        }
    }
}

function purgeGhost(p) { 
    if (confirm(`Delete data for ${p}?`)) 
        db.ref('user_sessions/' + p).remove(); 
}

async function loadStats() {
    try {
        const u = await db.ref('user_sessions').once('value');
        const activeBadge = document.getElementById('activeUsersBadge');
        if (activeBadge) activeBadge.innerHTML = (u.numChildren() || 0) + " ACTIVE";
        
        const b = await db.ref('banned_ghosts').once('value');
        const bannedBadge = document.getElementById('bannedBadge');
        if (bannedBadge) bannedBadge.innerHTML = (b.numChildren() || 0) + " BANNED ▼";
    } catch (error) {
        console.warn('Could not load stats:', error);
    }
}

// ========== DEVICE FINGERPRINT MAPPING ==========
async function getDeviceDisplayId(fp) {
    if (!fp || fp === '---') return '---';
    try {
        const m = await db.ref('device_id_map/' + fp).once('value');
        if (m.exists()) return m.val().displayId;
        
        const c = await db.ref('admin/deviceCounter').once('value');
        let n = (c.val() || 0) + 1;
        await db.ref('admin/deviceCounter').set(n);
        const id = `Dev${n}`;
        await db.ref('device_id_map/' + fp).set({ 
            displayId: id, 
            createdAt: Date.now(), 
            fingerprint: fp 
        });
        return id;
    } catch (error) {
        console.warn('Device mapping error:', error);
        return '---';
    }
}

// ========== REALTIME USER SESSIONS LISTENER ==========
db.ref('user_sessions').on('value', async (snapshot) => {
    const sessions = snapshot.val() || {};
    const usersArray = [];
    
    for (const [phone, data] of Object.entries(sessions)) {
        const lastRaw = data.lastUpdate || 0;
        let lastFormatted = '---';
        if (lastRaw) {
            const date = new Date(lastRaw);
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            lastFormatted = `${hours}:${minutes} ${ampm}`;
        }
        
        const fp = data.deviceFingerprint || '---';
        let dev = '---';
        if (fp !== '---') dev = await getDeviceDisplayId(fp);
        
        usersArray.push({
            phone: phone,
            balance: (data.balance || 0).toLocaleString(),
            devDisplay: dev,
            lastSeen: lastFormatted,
            lastSeenRaw: lastRaw
        });
    }
    
    currentUserData = usersArray;
    sortByLastSeen();
    
    if (deleteModeState === 1) {
        renderUserTableWithCheckboxes();
    } else {
        renderUserTable();
    }
    
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = Object.keys(sessions).length + " ACTIVE";
});

// ========== REALTIME BANNED GHOSTS LISTENER ==========
db.ref('banned_ghosts').on('value', (snapshot) => {
    const count = snapshot.numChildren() || 0;
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) {
        bannedBadge.innerHTML = count + " BANNED ▼";
    }
});

// ========== REALTIME LINKS LISTENER ==========
db.ref('links').on('value', (snapshot) => {
    const t = document.getElementById('linkData');
    if (!t) return;
    t.innerHTML = '';
    const links = snapshot.val() || {};
    
    Object.entries(links).forEach(([key, data]) => {
        const cls = data.status === 'available' ? 'status-avail' : 'status-used';
        const hash = data.hash || generateHash(data.url || '');
        t.innerHTML += `
            <tr>
                <td>#${key.substr(-4)}</td>
                <td title="${data.url || ''}">${hash}</td>
                <td><span class="status ${cls}">${data.status}</span></td>
                <td class="ghost-id">${data.user === 'NONE' ? '---' : data.user}</td>
                <td>
                    <button class="icon-btn" onclick="reuseLink('${key}')" style="color:#ffd700;">♻️</button>
                    <button class="icon-btn" onclick="db.ref('links/${key}').remove()" style="color:#ff3131;">🗑️</button>
                </td>
            </tr>
        `;
    });
});

// ========== SORT FUNCTIONS ==========
function sortByDeviceAscending() {
    currentUserData.sort((a, b) => {
        const numA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const numB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return numA - numB;
    });
    renderUserTable();
}

function sortByDeviceDescending() {
    currentUserData.sort((a, b) => {
        const numA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const numB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return numB - numA;
    });
    renderUserTable();
}

function sortByLastSeen() {
    currentUserData.sort((a, b) => b.lastSeenRaw - a.lastSeenRaw);
    renderUserTable();
}

// ========== RENDER USER TABLE ==========
function renderUserTable() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    if (!currentUserData || currentUserData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:40px;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    currentUserData.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td class="ghost-id">${user.phone || '---'}</td>
                <td style="color:#39ff14">₱${user.balance || 0}</td>
                <td style="color:#00f2ff;font-weight:bold;">${user.devDisplay || '---'}</td>
                <td style="font-size:9px;">${user.lastSeen || '---'}</td>
                <td class="action-col">
                    <button class="icon-btn delete-user-btn" data-phone="${user.phone}" style="color:#ff4444; cursor:pointer;" title="Delete User">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const phone = btn.getAttribute('data-phone');
            if (phone) deleteSingleUser(phone);
        });
    });
}

// ========== ACTION BUTTONS FUNCTIONS ==========
let actionButtonsVisible = false;

function toggleActionButtons() {
    const row = document.getElementById('actionButtonsRow');
    const badge = document.getElementById('activeUsersBadge');
    
    actionButtonsVisible = !actionButtonsVisible;
    
    if (actionButtonsVisible && row) {
        row.style.display = 'grid';
        if (badge) badge.innerHTML = badge.innerHTML.replace('▼', '▲');
    } else if (row) {
        row.style.display = 'none';
        if (badge) badge.innerHTML = badge.innerHTML.replace('▲', '▼');
    }
}

let devSortState = 0;

function toggleDevSort() {
    const btn = document.getElementById('devSortBtn');
    
    devSortState = (devSortState + 1) % 3;
    
    if (devSortState === 0) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
            btn.classList.remove('active', 'faded');
        }
        sortByLastSeen();
    } else if (devSortState === 1) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (ASC)');
            btn.classList.add('faded');
            btn.classList.remove('active');
        }
        sortByDeviceAscending();
    } else if (devSortState === 2) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (DESC)');
            btn.classList.add('active');
            btn.classList.remove('faded');
        }
        sortByDeviceDescending();
    }
}

let timeSortActive = true;

function toggleTimeSort() {
    const btn = document.getElementById('timeSortBtn');
    const devBtn = document.getElementById('devSortBtn');
    
    timeSortActive = true;
    devSortState = 0;
    
    if (devBtn) {
        devBtn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
        devBtn.classList.remove('active', 'faded');
    }
    
    if (btn) {
        btn.setAttribute('data-tooltip', 'Sort by Time (Active)');
        btn.classList.add('active');
    }
    
    sortByLastSeen();
}

// ========== DELETE MODE FUNCTIONS ==========
let deleteModeState = 0;
let selectedUsers = [];

function toggleDeleteMode() {
    const btn = document.getElementById('deleteModeBtn');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    
    deleteModeState = (deleteModeState + 1) % 3;
    
    if (deleteModeState === 0) {
        btn.setAttribute('data-tooltip', 'Delete Mode (OFF)');
        btn.classList.remove('active', 'faded');
        if (selectAllTh) selectAllTh.style.display = 'none';
        if (bulkBar) bulkBar.style.display = 'none';
        selectedUsers = [];
        renderUserTable();
    } else if (deleteModeState === 1) {
        btn.setAttribute('data-tooltip', 'Delete Mode (SELECT)');
        btn.classList.add('faded');
        btn.classList.remove('active');
        if (selectAllTh) selectAllTh.style.display = 'table-cell';
        if (bulkBar) bulkBar.style.display = 'none';
        selectedUsers = [];
        renderUserTableWithCheckboxes();
    } else if (deleteModeState === 2) {
        btn.setAttribute('data-tooltip', 'Delete Mode (DELETE)');
        btn.classList.add('active');
        btn.classList.remove('faded');
        
        if (selectedUsers.length === 0) {
            alert("⚠️ No users selected. Please select users first.");
            deleteModeState = 1;
            btn.classList.remove('active');
            btn.classList.add('faded');
            return;
        }
        
        if (confirm(`⚠️ DESTRUCTIVE ACTION ⚠️\n\nDelete ${selectedUsers.length} selected user(s)?`)) {
            deleteSelectedUsers();
        } else {
            deleteModeState = 1;
            btn.classList.remove('active');
            btn.classList.add('faded');
        }
    }
}

function renderUserTableWithCheckboxes() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    if (!currentUserData || currentUserData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:40px;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    currentUserData.forEach(user => {
        const isChecked = selectedUsers.includes(user.phone);
        tbody.innerHTML += `
            <tr>
                <td class="checkbox-col" style="text-align:center;">
                    <input type="checkbox" class="user-checkbox" data-phone="${user.phone}" ${isChecked ? 'checked' : ''}>
                </td>
                <td class="ghost-id">${user.phone || '---'}</td>
                <td style="color:#39ff14">₱${user.balance || 0}</td>
                <td style="color:#00f2ff;font-weight:bold;">${user.devDisplay || '---'}</td>
                <td style="font-size:9px;">${user.lastSeen || '---'}</td>
                <td class="action-col">
                    <button class="icon-btn delete-user-btn" data-phone="${user.phone}" style="color:#ff4444;">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const phone = btn.getAttribute('data-phone');
            if (phone) deleteSingleUser(phone);
        });
    });
    
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const phone = cb.getAttribute('data-phone');
            toggleUserSelect(phone, cb.checked);
        });
    });
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = (selectedUsers.length === currentUserData.length && currentUserData.length > 0);
        selectAllCheckbox.indeterminate = (selectedUsers.length > 0 && selectedUsers.length < currentUserData.length);
    }
}

function toggleUserSelect(phone, isChecked) {
    if (isChecked) {
        if (!selectedUsers.includes(phone)) selectedUsers.push(phone);
    } else {
        selectedUsers = selectedUsers.filter(p => p !== phone);
    }
    
    const bulkBar = document.getElementById('bulkDeleteBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (selectedUsers.length > 0 && bulkBar) {
        bulkBar.style.display = 'flex';
        if (selectedCountSpan) selectedCountSpan.innerHTML = selectedUsers.length;
    } else if (bulkBar) {
        bulkBar.style.display = 'none';
    }
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const isChecked = checkbox.checked;
    
    if (isChecked) {
        selectedUsers = currentUserData.map(u => u.phone);
    } else {
        selectedUsers = [];
    }
    
    renderUserTableWithCheckboxes();
    
    const bulkBar = document.getElementById('bulkDeleteBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (selectedUsers.length > 0 && bulkBar) {
        bulkBar.style.display = 'flex';
        if (selectedCountSpan) selectedCountSpan.innerHTML = selectedUsers.length;
    } else if (bulkBar) {
        bulkBar.style.display = 'none';
    }
}

function confirmBulkDelete() {
    if (selectedUsers.length === 0) return;
    if (confirm(`⚠️ Delete ${selectedUsers.length} selected user(s)?`)) {
        deleteSelectedUsers();
    }
}

async function deleteSelectedUsers() {
    let successCount = 0;
    let failCount = 0;
    
    for (const phone of selectedUsers) {
        try {
            await db.ref('user_sessions/' + phone).remove();
            successCount++;
        } catch (error) {
            console.error('Delete failed for', phone, error);
            failCount++;
        }
    }
    
    alert(`✅ ${successCount} user(s) deleted successfully!${failCount > 0 ? `\n⚠️ ${failCount} failed.` : ''}`);
    
    selectedUsers = [];
    deleteModeState = 0;
    
    const btn = document.getElementById('deleteModeBtn');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    
    if (btn) btn.classList.remove('active', 'faded');
    if (selectAllTh) selectAllTh.style.display = 'none';
    if (bulkBar) bulkBar.style.display = 'none';
}

function cancelBulkDelete() {
    selectedUsers = [];
    deleteModeState = 0;
    
    const btn = document.getElementById('deleteModeBtn');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (btn) btn.classList.remove('active', 'faded');
    if (selectAllTh) selectAllTh.style.display = 'none';
    if (bulkBar) bulkBar.style.display = 'none';
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    
    renderUserTable();
}

// ========== BANNED USERS POPUP FUNCTIONS ==========
async function showBannedPopup() {
    const popup = document.getElementById('bannedPopup');
    const badge = document.getElementById('bannedBadge');
    
    if (!popup) return;
    
    badge.style.background = 'linear-gradient(135deg, #ff4444, #aa0000)';
    badge.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.8)';
    badge.style.border = '1px solid #ff8888';
    
    popup.style.display = 'flex';
    await loadBannedUsers();
    
    popup.onclick = function(e) {
        if (e.target === popup) closeBannedPopup();
    };
}

function closeBannedPopup() {
    const popup = document.getElementById('bannedPopup');
    const badge = document.getElementById('bannedBadge');
    
    if (!popup) return;
    
    badge.style.background = '';
    badge.style.boxShadow = '';
    badge.style.border = '';
    
    popup.style.display = 'none';
    
    const searchInput = document.getElementById('bannedSearchInput');
    const searchResult = document.getElementById('bannedSearchResult');
    const clearBtn = document.querySelector('.search-clear-btn');
    
    if (searchInput) searchInput.value = '';
    if (searchResult) searchResult.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
}

async function loadBannedUsers() {
    try {
        const snapshot = await db.ref('banned_ghosts').once('value');
        const banned = snapshot.val() || {};
        const bannedArray = [];
        
        for (const [phone, data] of Object.entries(banned)) {
            const deviceMapSnapshot = await db.ref('device_phone_map').orderByChild('phone').equalTo(phone).once('value');
            let deviceId = 'Unknown';
            let fingerprint = '';
            
            if (deviceMapSnapshot.exists()) {
                deviceMapSnapshot.forEach((child) => {
                    deviceId = child.val().displayId || 'Unknown';
                    fingerprint = child.key;
                });
            }
            
            bannedArray.push({
                phone: phone,
                deviceId: deviceId,
                fingerprint: fingerprint,
                timestamp: data.timestamp || 0
            });
        }
        
        bannedArray.sort((a, b) => {
            const numA = parseInt(a.deviceId.replace('Dev', '')) || 0;
            const numB = parseInt(b.deviceId.replace('Dev', '')) || 0;
            return numB - numA;
        });
        
        bannedUsersData = bannedArray;
        renderBannedList(bannedArray.slice(0, 10));
        
        const countDisplay = document.getElementById('bannedCountDisplay');
        if (countDisplay) countDisplay.innerHTML = bannedArray.length;
    } catch (error) {
        console.warn('Could not load banned users:', error);
    }
}

function renderBannedList(bannedList) {
    const container = document.getElementById('bannedUsersList');
    if (!container) return;
    
    if (!bannedList || bannedList.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No banned users found</div>';
        return;
    }
    
    let html = '';
    for (const user of bannedList) {
        html += `
            <div class="banned-user-item">
                <div class="banned-device-id" onclick="showBranchDetails('${user.fingerprint}', '${user.deviceId}')">${user.deviceId}</div>
                <div class="banned-phone-number" onclick="showBranchDetails('${user.fingerprint}', '${user.deviceId}')">${user.phone}</div>
                <div><button class="unban-btn" onclick="unbanUser('${user.phone}')">✕</button></div>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function searchBannedUsers() {
    const searchTerm = document.getElementById('bannedSearchInput').value.trim().toLowerCase();
    const searchResultDiv = document.getElementById('bannedSearchResult');
    const bannedListContainer = document.getElementById('bannedUsersList');
    const searchClearBtn = document.querySelector('.search-clear-btn');
    
    if (!searchResultDiv || !bannedListContainer) return;
    
    if (searchTerm === '') {
        searchResultDiv.style.display = 'none';
        bannedListContainer.style.display = 'block';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        renderBannedList(bannedUsersData.slice(0, 10));
        return;
    }
    
    if (searchClearBtn) searchClearBtn.style.display = 'flex';
    
    const found = bannedUsersData.filter(user => 
        user.phone.includes(searchTerm) || 
        user.deviceId.toLowerCase().includes(searchTerm)
    );
    
    if (found.length === 0) {
        searchResultDiv.style.display = 'block';
        searchResultDiv.innerHTML = `
            <div style="text-align: center; color: #ff8888; padding: 20px;">
                ❌ No banned user found for "${searchTerm}"
            </div>
        `;
        bannedListContainer.style.display = 'none';
        return;
    }
    
    if (found.length === 1) {
        searchResultDiv.style.display = 'block';
        bannedListContainer.style.display = 'none';
        
        const user = found[0];
        searchResultDiv.innerHTML = `
            <div class="banned-user-item" style="background: rgba(255,68,68,0.1); border-radius: 10px;">
                <div class="banned-device-id" onclick="showBranchDetails('${user.fingerprint}', '${user.deviceId}')">${user.deviceId}</div>
                <div class="banned-phone-number" onclick="showBranchDetails('${user.fingerprint}', '${user.deviceId}')">${user.phone}</div>
                <div><button class="unban-btn" onclick="unbanUser('${user.phone}')">✕</button></div>
            </div>
        `;
    } else {
        searchResultDiv.style.display = 'none';
        bannedListContainer.style.display = 'block';
        renderBannedList(found);
    }
}

function clearBannedSearch() {
    const searchInput = document.getElementById('bannedSearchInput');
    const searchResult = document.getElementById('bannedSearchResult');
    const bannedListContainer = document.getElementById('bannedUsersList');
    const clearBtn = document.querySelector('.search-clear-btn');
    
    if (searchInput) searchInput.value = '';
    if (searchResult) searchResult.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    if (bannedListContainer) bannedListContainer.style.display = 'block';
    
    renderBannedList(bannedUsersData.slice(0, 10));
}

async function unbanUser(phone) {
    if (confirm(`⚠️ UNBAN USER ⚠️\n\nUnban ${phone}?`)) {
        try {
            await db.ref('banned_ghosts/' + phone).remove();
            alert(`✅ ${phone} unbanned!`);
            await loadBannedUsers();
        } catch (error) {
            alert('❌ Error unbanning user: ' + error.message);
        }
    }
}

async function showBranchDetails(fingerprint, deviceId) {
    if (!fingerprint || fingerprint === '') {
        alert("No fingerprint data available.");
        return;
    }
    
    const popup = document.getElementById('branchPopup');
    const branchDetails = document.getElementById('branchDetails');
    
    if (!popup || !branchDetails) return;
    
    try {
        const devicePhoneMapRef = db.ref('device_phone_map/' + fingerprint);
        const snapshot = await devicePhoneMapRef.once('value');
        const deviceData = snapshot.val();
        
        branchDetails.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="color: #00f2ff;">Device ID:</strong> ${deviceId}
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #00f2ff;">Device Fingerprint:</strong>
                <div class="device-fingerprint">${fingerprint}</div>
            </div>
            <div>
                <strong style="color: #00f2ff;">Primary Number:</strong> ${deviceData?.phone || 'Unknown'}
            </div>
        `;
        
        popup.style.display = 'flex';
        
        popup.onclick = function(e) {
            if (e.target === popup) closeBranchPopup();
        };
    } catch (error) {
        alert('Error loading device details: ' + error.message);
    }
}

function closeBranchPopup() {
    const popup = document.getElementById('branchPopup');
    if (popup) popup.style.display = 'none';
}

// ============================================================
// 🎯 SYSTEM VERIFICATION PANEL
// Read data from user_sessions/{phone}/system_verification
// ============================================================

function initSystemVerificationPanel() {
    if (!db) {
        console.warn('⚠️ Firebase not initialized');
        return;
    }

    // Real-time listener
    if (verificationListener) {
        db.ref('user_sessions').off('value', verificationListener);
    }

    verificationListener = db.ref('user_sessions').on('value', function(snapshot) {
        var sessions = snapshot.val() || {};
        var verifications = [];

        Object.keys(sessions).forEach(function(phone) {
            var userData = sessions[phone];
            var verification = userData.system_verification;

            if (verification && (verification.status === 'active' || verification.status === 'expired')) {
                verifications.push({
                    phone: phone,
                    code: verification.code || '----',
                    timer: verification.timer || 0,
                    status: verification.status || 'active',
                    deviceId: verification.deviceId || 'Unknown',
                    createdAt: verification.createdAt || 0,
                    lastUpdate: verification.lastUpdate || 0
                });
            }
        });

        // Sort by latest
        verifications.sort(function(a, b) {
            return (b.lastUpdate || 0) - (a.lastUpdate || 0);
        });

        activeVerifications = {};
        verifications.forEach(function(v) {
            activeVerifications[v.phone] = v;
        });

        renderSystemVerificationList(verifications);

        // Update count
        var activeCount = verifications.filter(function(v) {
            return v.status === 'active';
        }).length;
        var countEl = document.getElementById('verificationCount');
        if (countEl) countEl.textContent = activeCount;

        console.log('📊 System verifications:', verifications.length, '(Active:', activeCount + ')');
    });

    // Start countdown updater
    if (verificationCountdownInterval) {
        clearInterval(verificationCountdownInterval);
    }
    verificationCountdownInterval = setInterval(updateVerificationTimers, 1000);

    console.log('✅ System Verification Panel initialized');
}

function renderSystemVerificationList(verifications) {
    var listEl = document.getElementById('verificationList');
    if (!listEl) return;

    if (!verifications || verifications.length === 0) {
        listEl.innerHTML = 
            '<div class="verification-empty">' +
                '<i class="fas fa-inbox"></i>' +
                '<p>No active verifications</p>' +
            '</div>';
        return;
    }

    var html = '';

    verifications.forEach(function(v) {
        var isActive = v.status === 'active';
        var statusClass = isActive ? 'status-active' : 'status-expired';
        var badgeClass = isActive ? 'active' : 'expired';

        var timerClass = 'timer-value';
        if (v.timer <= 9 && isActive) timerClass += ' urgent';

        var createdTime = v.createdAt ? formatVerificationTime(v.createdAt) : '---';

        html += 
            '<div class="verification-item ' + statusClass + '" data-phone="' + v.phone + '">' +
                '<div class="verification-header-row">' +
                    '<div class="verification-phone">' +
                        '<i class="fas fa-mobile-screen-button"></i>' +
                        '<span>' + v.phone + '</span>' +
                    '</div>' +
                    '<div class="verification-status-badge ' + badgeClass + '">' +
                        '<span class="status-dot"></span>' +
                        '<span>' + (isActive ? 'ACTIVE' : 'EXPIRED') + '</span>' +
                    '</div>' +
                '</div>' +

                '<div class="verification-data-grid">' +
                    '<div class="verification-data-box">' +
                        '<div class="verification-data-label">⏱ TIMER</div>' +
                        '<div class="verification-data-value ' + timerClass + '" data-phone="' + v.phone + '">' +
                            v.timer + 's' +
                        '</div>' +
                    '</div>' +
                    '<div class="verification-data-box">' +
                        '<div class="verification-data-label">🔑 4-DIGIT CODE</div>' +
                        '<div class="verification-data-value code-value">' +
                            v.code +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="verification-footer">' +
                    '<div class="verification-device">' +
                        '<i class="fas fa-desktop"></i>' +
                        '<span>' + v.deviceId + '</span>' +
                    '</div>' +
                    '<div class="verification-time">' +
                        '<i class="fas fa-clock"></i>' +
                        '<span>' + createdTime + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
    });

    listEl.innerHTML = html;
}

function updateVerificationTimers() {
    var timerElements = document.querySelectorAll('.verification-data-value.timer-value');

    timerElements.forEach(function(el) {
        var phone = el.getAttribute('data-phone');
        var verification = activeVerifications[phone];

        if (!verification || verification.status !== 'active') return;

        // Decrement timer locally
        if (verification.timer > 0) {
            verification.timer--;

            el.textContent = verification.timer + 's';

            if (verification.timer <= 9) {
                el.classList.add('urgent');
            } else {
                el.classList.remove('urgent');
            }
        }
    });
}

function formatVerificationTime(timestamp) {
    if (!timestamp) return '---';

    var date = new Date(timestamp);
    var now = Date.now();
    var diff = now - timestamp;

    var minutes = Math.floor(diff / 60000);
    var seconds = Math.floor((diff % 60000) / 1000);

    if (minutes < 1) {
        return seconds + 's ago';
    }

    if (minutes < 60) {
        return minutes + 'm ago';
    }

    var hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return hours + 'h ago';
    }

    var h = date.getHours();
    var m = date.getMinutes().toString().padStart(2, '0');
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    return h + ':' + m + ' ' + ampm;
}

// ============================================================
// 🎯 ADMIN CHAT PANEL (Admin POV) — Cyan Theme
// ============================================================
(function() {
    'use strict';
    
    let activeChatId = null;
    let messagesListener = null;
    let usersListener = null;
    let currentMessages = {};
    
    function init() {
        if (!document.querySelector('.admin-chat-widget')) {
            createAdminPanel();
        }
        loadUserList();
        listenForNewUsers();
        console.log('✅ Admin chat initialized');
    }
    
    function createAdminPanel() {
        if (document.querySelector('.admin-chat-widget')) return;
        
        const panel = document.createElement('div');
        panel.className = 'admin-chat-widget';
        panel.innerHTML = `
            <button class="admin-chat-toggle" id="adminChatToggle">
                <i class="fas fa-comments"></i>
                <span class="chat-badge" id="adminBadge" style="display:none">0</span>
            </button>
            
            <div class="admin-chat-panel" id="adminChatPanel">
                <div class="admin-chat-header">
                    <div class="admin-chat-header-left">
                        <span class="admin-chat-header-icon">💬</span>
                        <div>
                            <div class="admin-chat-header-title">SUPPORT CHAT</div>
                            <div class="admin-chat-header-subtitle">Active</div>
                        </div>
                    </div>
                    <button class="admin-chat-close-btn" id="adminChatClose">✕</button>
                </div>
                
                <div class="admin-user-list" id="adminUserList">
                    <div class="admin-empty-state">
                        <span class="empty-icon">📭</span>
                        <div class="empty-text">No conversations yet</div>
                    </div>
                </div>
                
                <div class="admin-chat-conversation" id="adminConversation" style="display:none;">
                    <div class="admin-convo-header">
                        <button class="admin-back-btn" id="adminBackBtn">←</button>
                        <span class="admin-convo-title" id="adminChatTitle">Chat</span>
                    </div>
                    <div class="admin-chat-messages" id="adminMessages"></div>
                    <div class="typing-indicator" id="adminTypingIndicator">
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="admin-chat-input-area">
                        <input type="text" class="admin-chat-input" id="adminChatInput" placeholder="Type reply...">
                        <button class="admin-send-btn" id="adminSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        attachAdminEvents();
    }
    
    function attachAdminEvents() {
        document.getElementById('adminChatToggle').addEventListener('click', function() {
            const panel = document.getElementById('adminChatPanel');
            panel.classList.toggle('show');
            if (panel.classList.contains('show')) {
                loadUserList();
            }
        });
        
        document.getElementById('adminChatClose').addEventListener('click', function() {
            document.getElementById('adminChatPanel').classList.remove('show');
        });
        
        document.getElementById('adminBackBtn').addEventListener('click', function() {
            closeConversation();
        });
        
        document.getElementById('adminSendBtn').addEventListener('click', sendAdminMessage);
        
        document.getElementById('adminChatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendAdminMessage();
            }
        });
    }
    
    function loadUserList() {
        const db = firebase.database();
        
        if (usersListener) {
            db.ref('chats').off('value', usersListener);
        }
        
        usersListener = db.ref('chats').on('value', function(snapshot) {
            const userList = document.getElementById('adminUserList');
            const conversationView = document.getElementById('adminConversation');
            
            if (conversationView && conversationView.style.display !== 'none') return;
            if (!userList) return;
            
            userList.style.display = 'block';
            userList.innerHTML = '';
            
            if (!snapshot.exists()) {
                userList.innerHTML = `
                    <div class="admin-empty-state">
                        <span class="empty-icon">📭</span>
                        <div class="empty-text">No conversations yet</div>
                    </div>`;
                return;
            }
            
            const chats = snapshot.val();
            const chatIds = Object.keys(chats);
            
            chatIds.sort((a, b) => {
                const timeA = chats[a].lastMessageTime || 0;
                const timeB = chats[b].lastMessageTime || 0;
                return timeB - timeA;
            });
            
            let totalUnread = 0;
            
            chatIds.forEach(chatId => {
                const chat = chats[chatId];
                const unreadCount = chat.unreadAdmin || 0;
                totalUnread += unreadCount;
                
                const lastTime = chat.lastMessageTime 
                    ? formatTime(chat.lastMessageTime) 
                    : '';
                
                const userItem = document.createElement('div');
                userItem.className = 'admin-user-item';
                if (activeChatId === chatId) {
                    userItem.classList.add('active');
                }
                
                userItem.innerHTML = `
                    <div class="admin-user-avatar">📱</div>
                    <div class="admin-user-info">
                        <div class="admin-user-name">${chatId}</div>
                        <div class="admin-user-last-msg">${chat.lastMessage ? truncateText(chat.lastMessage, 25) : 'No messages'}</div>
                    </div>
                    <div class="admin-user-time">${lastTime}</div>
                    ${unreadCount > 0 ? `<div class="unread-dot" style="margin-left:4px;">${unreadCount}</div>` : ''}
                `;
                
                userItem.addEventListener('click', function() {
                    openConversation(chatId);
                });
                
                userList.appendChild(userItem);
            });
            
            updateBadge(totalUnread);
        });
    }
    
    function listenForNewUsers() {
        const db = firebase.database();
        db.ref('chats').on('child_added', function(snapshot) {
            console.log('🆕 New chat from:', snapshot.key);
            const panel = document.getElementById('adminChatPanel');
            if (panel && panel.classList.contains('show')) {
                loadUserList();
            }
        });
    }
    
    function openConversation(chatId) {
        console.log('📂 Opening conversation with:', chatId);
        
        activeChatId = chatId;
        
        document.getElementById('adminUserList').style.display = 'none';
        document.getElementById('adminConversation').style.display = 'flex';
        document.getElementById('adminChatTitle').textContent = '📱 ' + chatId;
        
        document.getElementById('adminMessages').innerHTML = '';
        currentMessages = {};
        
        loadMessages(chatId);
        markAsRead(chatId);
    }
    
    function closeConversation() {
        console.log('📁 Closing conversation');
        
        if (messagesListener && activeChatId) {
            const db = firebase.database();
            db.ref('chats/' + activeChatId + '/messages').off('child_added', messagesListener);
            messagesListener = null;
        }
        
        activeChatId = null;
        currentMessages = {};
        
        document.getElementById('adminConversation').style.display = 'none';
        document.getElementById('adminUserList').style.display = 'block';
        document.getElementById('adminMessages').innerHTML = '';
        
        loadUserList();
    }
    
    function loadMessages(chatId) {
        const db = firebase.database();
        const messagesContainer = document.getElementById('adminMessages');
        
        messagesContainer.innerHTML = '';
        
        if (messagesListener) {
            db.ref('chats/' + chatId + '/messages').off('child_added', messagesListener);
        }
        
        messagesListener = db.ref('chats/' + chatId + '/messages')
            .orderByChild('timestamp')
            .on('child_added', function(snapshot) {
                const msg = snapshot.val();
                const msgId = snapshot.key;
                
                if (currentMessages[msgId]) return;
                currentMessages[msgId] = true;
                
                displayMessage(msg, msgId);
            });
        
        db.ref('chats/' + chatId + '/messages').on('child_changed', function(snapshot) {
            const msg = snapshot.val();
            const msgId = snapshot.key;
            updateMessageDisplay(msgId, msg);
        });
    }
    
    function displayMessage(msg, msgId) {
        const messagesContainer = document.getElementById('adminMessages');
        const typingIndicator = document.getElementById('adminTypingIndicator');
        
        if (!messagesContainer) return;
        
        const msgEl = document.createElement('div');
        msgEl.className = 'msg-bubble ' + (msg.sender === 'admin' ? 'user-msg' : 'admin-msg');
        msgEl.id = 'msg-' + msgId;
        
        const time = msg.timestamp 
            ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
            : 'Just now';
        
        const senderLabel = msg.sender === 'admin' ? 'You' : 'User';
        
        msgEl.innerHTML = `
            ${escapeHtml(msg.text)}
            <div class="msg-time">${senderLabel} • ${time}</div>
        `;
        
        if (typingIndicator && typingIndicator.parentNode === messagesContainer) {
            messagesContainer.insertBefore(msgEl, typingIndicator);
        } else {
            messagesContainer.appendChild(msgEl);
        }
        
        scrollToBottom();
    }
    
    function updateMessageDisplay(msgId, msg) {
        const msgEl = document.getElementById('msg-' + msgId);
        if (!msgEl) return;
        
        const time = msg.timestamp 
            ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
            : '';
        
        const senderLabel = msg.sender === 'admin' ? 'You' : 'User';
        
        if (msg.read) {
            msgEl.querySelector('.msg-time').textContent = `${senderLabel} • ${time} ✓✓`;
        }
    }
    
    function sendAdminMessage() {
        if (!activeChatId) {
            console.log('❌ No active chat');
            return;
        }
        
        const input = document.getElementById('adminChatInput');
        const sendBtn = document.getElementById('adminSendBtn');
        const message = input.value.trim();
        
        if (!message) return;
        
        sendBtn.disabled = true;
        
        try {
            const db = firebase.database();
            
            db.ref('chats/' + activeChatId + '/messages').push({
                text: message,
                sender: 'admin',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            });
            
            db.ref('chats/' + activeChatId).update({
                lastMessage: message,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                lastSender: 'admin',
                unreadUser: firebase.database.ServerValue.increment(1)
            });
            
            input.value = '';
            
        } catch(e) {
            console.error('❌ Error sending message:', e);
        } finally {
            sendBtn.disabled = false;
            input.focus();
        }
    }
    
    function markAsRead(chatId) {
        const db = firebase.database();
        db.ref('chats/' + chatId).update({ 
            unreadAdmin: 0 
        }).then(function() {
            console.log('✅ Marked as read:', chatId);
        }).catch(function(e) {
            console.error('❌ Error marking as read:', e);
        });
    }
    
    function scrollToBottom() {
        const messagesContainer = document.getElementById('adminMessages');
        if (messagesContainer) {
            setTimeout(function() {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    function updateBadge(count) {
        const badge = document.getElementById('adminBadge');
        if (!badge) return;
        
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    function formatTime(timestamp) {
        if (!timestamp) return '';
        
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'now';
        if (minutes < 60) return minutes + 'm';
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h';
        
        const days = Math.floor(hours / 24);
        if (days < 7) return days + 'd';
        
        return new Date(timestamp).toLocaleDateString([], {month:'short', day:'numeric'});
    }
    
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize chat after dashboard is ready
    setTimeout(init, 2000);
    
})();

// ============================================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================================
window.setupMasterKey = setupMasterKey;
window.showMasterKeyPopup = showMasterKeyPopup;
window.closeKeyPopup = closeKeyPopup;
window.updateMasterKey = updateMasterKey;
window.toggleDropdown = toggleDropdown;
window.deploy = deploy;
window.reuseLink = reuseLink;
window.toggleFirewall = toggleFirewall;
window.toggleChangeNumber = toggleChangeNumber;
window.banGhost = banGhost;
window.liftBan = liftBan;
window.deleteSingleUser = deleteSingleUser;
window.purgeGhost = purgeGhost;
window.toggleActionButtons = toggleActionButtons;
window.toggleDevSort = toggleDevSort;
window.toggleTimeSort = toggleTimeSort;
window.toggleDeleteMode = toggleDeleteMode;
window.toggleSelectAll = toggleSelectAll;
window.confirmBulkDelete = confirmBulkDelete;
window.cancelBulkDelete = cancelBulkDelete;
window.showBannedPopup = showBannedPopup;
window.closeBannedPopup = closeBannedPopup;
window.searchBannedUsers = searchBannedUsers;
window.clearBannedSearch = clearBannedSearch;
window.unbanUser = unbanUser;
window.showBranchDetails = showBranchDetails;
window.closeBranchPopup = closeBranchPopup;
window.initSystemVerificationPanel = initSystemVerificationPanel;

console.log('✅ C.I.A. Admin Panel v3.1 - Auto-login with System Verification');
console.log('ℹ️ First time? Create your access key.');
console.log('ℹ️ Already setup? Auto-login.');
