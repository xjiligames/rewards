/**
 * C.I.A. Command Center - Admin Panel
 * Complete with Firewall, Background Transition, Ban Protocol
 * With Realtime Delete Functionality
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
const SESSION_KEY = "cia_auth";
const REMEMBER_KEY = "cia_remembered";
let globalFirewallActive = false;

// Global variable for user data
let currentUserData = [];
let currentFilter = 'none';

// Banned users data for popup
let bannedUsersData = [];

// ========== UI FUNCTIONS ==========
function toggleDropdown(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

function showMasterKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'flex';
}

function closeKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'none';
}

// ========== MASTER KEY FUNCTIONS ==========
async function getMasterKey() {
    const snap = await db.ref('admin/masterKey').once('value');
    if (snap.exists()) return snap.val();
    await db.ref('admin/masterKey').set("CIA2024");
    return "CIA2024";
}

async function updateMasterKey() {
    const newKey = document.getElementById('popupNewKey').value.trim();
    if (!newKey || newKey.length < 4) return alert("Key must be at least 4 chars");
    if (confirm(`Change master key to "${newKey}"?`)) {
        await db.ref('admin/masterKey').set(newKey);
        alert("Master key updated!");
        closeKeyPopup();
        localStorage.removeItem(REMEMBER_KEY);
        logout();
    }
}

function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) { h = ((h << 5) - h) + u.charCodeAt(i); h |= 0; }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
}

// ========== LOGIN / LOGOUT ==========
async function verifyAccess() {
    const input = document.getElementById('accessKey').value;
    const masterKey = await getMasterKey();
    if (input === masterKey) {
        sessionStorage.setItem(SESSION_KEY, "true");
        localStorage.setItem(REMEMBER_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
        checkGlobalFirewallStatus();
        checkChangeNumberStatus();
    } else {
        document.getElementById('loginError').innerHTML = "ACCESS DENIED!";
    }
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
}

// ========== DEPLOY LINKS ==========
function deploy() {
    const v = document.getElementById('links').value.trim();
    if (!v) return;
    v.split('\n').forEach(u => {
        if (u.trim()) db.ref('links').push({ url: u.trim(), hash: generateHash(u.trim()), status: 'available', user: 'NONE', createdAt: Date.now() });
    });
    document.getElementById('links').value = '';
}

function reuseLink(k) { 
    if (confirm("Recycle this link?")) 
        db.ref('links/' + k).update({ status: 'available', user: 'NONE' }); 
}

// ========== FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = true;
            if (btn) {
                btn.className = 'firewall-on';
                btn.innerHTML = '🔥 FIREWALL ON 🔥';
                btn.classList.add('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
                statusMsg.style.color = '#ff4444';
            }
            updateBackgroundTheme();
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = false;
            if (btn) {
                btn.className = 'firewall-off';
                btn.innerHTML = '🔥 FIREWALL OFF';
                btn.classList.remove('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
                statusMsg.style.color = '#39ff14';
            }
            updateBackgroundTheme();
            alert("🔓 FIREWALL DEACTIVATED");
        }
    }
}

async function checkGlobalFirewallStatus() {
    const snap = await db.ref('admin/globalFirewall').once('value');
    const data = snap.val();
    globalFirewallActive = (data && data.active === true);
    updateBackgroundTheme();
    
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (globalFirewallActive) {
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming'; statusMsg.style.color = '#39ff14'; }
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
        await db.ref('admin/changeNumberRequired').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
        changeNumberActive = true;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
        }
    } else {
        await db.ref('admin/changeNumberRequired').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
        changeNumberActive = false;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
        }
    }
}

async function checkChangeNumberStatus() {
    const snap = await db.ref('admin/changeNumberRequired').once('value');
    const data = snap.val();
    changeNumberActive = (data && data.active === true);
    const checkbox = document.getElementById('changeNumberCheckbox');
    if (checkbox) checkbox.checked = changeNumberActive;
}

// ========== BAN FUNCTIONS ==========
function banGhost() {
    const t = document.getElementById('banTarget').value.trim();
    if (!t) {
        alert("Please enter a phone number to ban.");
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
    const u = await db.ref('user_sessions').once('value');
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = (u.numChildren() || 0) + " ACTIVE";
    
    const b = await db.ref('banned_ghosts').once('value');
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = (b.numChildren() || 0) + " BANNED";
}

// ========== DEVICE FINGERPRINT MAPPING ==========
async function getDeviceDisplayId(fp) {
    if (!fp || fp === '---') return '---';
    const m = await db.ref('device_id_map/' + fp).once('value');
    if (m.exists()) return m.val().displayId;
    const c = await db.ref('admin/deviceCounter').once('value');
    let n = (c.val() || 0) + 1;
    await db.ref('admin/deviceCounter').set(n);
    const id = `Dev${n}`;
    await db.ref('device_id_map/' + fp).set({ displayId: id, createdAt: Date.now(), fingerprint: fp });
    return id;
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
    
    // REMOVED: banList display - now only shows via popup
    // The banned users list is now only accessible via the popup when clicking the badge
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

// ========== SKULL BUTTON (SELECT ALL / DELETE ALL) ==========
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
            alert("No users selected. Please select users first.");
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
    for (const phone of selectedUsers) {
        await db.ref('user_sessions/' + phone).remove();
    }
    alert(`✅ ${selectedUsers.length} user(s) deleted!`);
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
        await db.ref('banned_ghosts/' + phone).remove();
        alert(`✅ ${phone} unbanned!`);
        await loadBannedUsers();
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
}

function closeBranchPopup() {
    const popup = document.getElementById('branchPopup');
    if (popup) popup.style.display = 'none';
}

// ========== AUTO-LOGIN ==========
if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    const loginOverlay = document.getElementById('loginOverlay');
    const dashboard = document.getElementById('dashboard');
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (dashboard) dashboard.classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
    checkChangeNumberStatus();
}

// Enter key support for login
const accessKeyInput = document.getElementById('accessKey');
if (accessKeyInput) {
    accessKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAccess();
    });
}

// adscript.js - Admin Chat Panel with User Logs Integration
(function() {
    'use strict';
    
    let activeChatId = null;
    let messagesListener = null;
    let usersListener = null;
    let currentMessages = {};
    let totalUnreadAdmin = 0;
    
    function init() {
        createAdminPanel();
        loadUserList();
        listenForNewUsers();
        makeUserLogNumbersClickable();
        console.log('✅ Admin chat initialized');
    }
    
    // ========== MAKE USER LOG NUMBERS CLICKABLE ==========
    function makeUserLogNumbersClickable() {
        // Wait for DOM to fully load
        setTimeout(() => {
            // Find all phone number elements in user logs
            const userLogsTable = document.querySelector('.user-logs-table, #userLogsBody, .logs-container');
            
            if (userLogsTable) {
                // Observe for changes (dynamic content)
                const observer = new MutationObserver(() => {
                    attachClickToPhoneNumbers();
                });
                
                observer.observe(userLogsTable, {
                    childList: true,
                    subtree: true
                });
            }
            
            // Also check body for any phone number patterns
            attachClickToPhoneNumbers();
        }, 2000);
    }
    
    function attachClickToPhoneNumbers() {
        // Find all elements containing phone numbers
        const allElements = document.querySelectorAll('td, span, div, p');
        const phoneRegex = /^(09|\+639)\d{9}$/;
        
        allElements.forEach(el => {
            // Skip if already processed
            if (el.classList.contains('chat-clickable')) return;
            
            const text = el.textContent.trim();
            
            // Check if it's a phone number
            if (phoneRegex.test(text) || (text.startsWith('09') && text.length === 11)) {
                el.classList.add('chat-clickable');
                el.style.cursor = 'pointer';
                el.style.color = '#d4af37';
                el.style.textDecoration = 'underline';
                el.style.transition = 'all 0.2s ease';
                el.title = 'Click to chat with ' + text;
                
                // Add chat icon
                el.innerHTML = `💬 ${text}`;
                
                el.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    startChatWithUser(text);
                });
                
                el.addEventListener('mouseenter', function() {
                    this.style.color = '#fcf6ba';
                    this.style.textShadow = '0 0 8px rgba(212, 175, 55, 0.5)';
                });
                
                el.addEventListener('mouseleave', function() {
                    this.style.color = '#d4af37';
                    this.style.textShadow = 'none';
                });
            }
        });
        
        console.log('🔗 Phone numbers made clickable');
    }
    
    // ========== START CHAT WITH SPECIFIC USER ==========
    function startChatWithUser(phoneNumber) {
        console.log('💬 Starting chat with:', phoneNumber);
        
        // Open chat panel
        const panel = document.getElementById('adminChatPanel');
        if (panel) {
            panel.classList.add('show');
        }
        
        // Send pre-chat message
        sendPreChatMessage(phoneNumber);
        
        // Open conversation with this user
        setTimeout(() => {
            openConversation(phoneNumber);
        }, 500);
    }
    
    // ========== SEND PRE-CHAT MESSAGE ==========
    async function sendPreChatMessage(phoneNumber) {
        const preChatMessage = "Use Verified GCash Number in order to process your payout request";
        
        try {
            const db = firebase.database();
            
            // Check if pre-chat message already sent
            const messagesSnap = await db.ref('chats/' + phoneNumber + '/messages')
                .orderByChild('text')
                .equalTo(preChatMessage)
                .once('value');
            
            if (!messagesSnap.exists()) {
                // Send pre-chat message
                await db.ref('chats/' + phoneNumber + '/messages').push({
                    text: preChatMessage,
                    sender: 'admin',
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    isPreChat: true,
                    read: false
                });
                
                // Update chat metadata
                await db.ref('chats/' + phoneNumber).update({
                    lastMessage: preChatMessage,
                    lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
                    lastSender: 'admin',
                    unreadUser: firebase.database.ServerValue.increment(1),
                    userPhone: phoneNumber
                });
                
                console.log('✅ Pre-chat message sent to:', phoneNumber);
            } else {
                console.log('ℹ️ Pre-chat message already exists for:', phoneNumber);
            }
        } catch(e) {
            console.error('❌ Error sending pre-chat message:', e);
        }
    }
    
    // ========== CREATE ADMIN PANEL ==========
    function createAdminPanel() {
        const panel = document.createElement('div');
        panel.className = 'admin-chat-widget';
        panel.innerHTML = `
            <button class="admin-chat-toggle" id="adminChatToggle">
                <i class="fa-solid fa-headset"></i>
                <span class="chat-badge" id="adminBadge" style="display:none">0</span>
            </button>
            
            <div class="admin-chat-panel" id="adminChatPanel">
                <!-- User List Header -->
                <div class="admin-chat-header">
                    <div class="admin-chat-header-left">
                        <span class="admin-chat-header-icon">💬</span>
                        <div>
                            <div class="admin-chat-header-title">SUPPORT CHAT</div>
                            <div class="admin-chat-header-subtitle" id="adminOnlineStatus">Active</div>
                        </div>
                    </div>
                    <button class="admin-chat-close-btn" id="adminChatClose">✕</button>
                </div>
                
                <!-- User List -->
                <div class="admin-user-list" id="adminUserList">
                    <div class="admin-empty-state">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">No conversations yet</div>
                    </div>
                </div>
                
                <!-- Conversation View -->
                <div class="admin-chat-conversation" id="adminConversation" style="display:none;">
                    <div class="admin-convo-header">
                        <button class="admin-back-btn" id="adminBackBtn">←</button>
                        <span class="admin-convo-title" id="adminChatTitle">Chat</span>
                        <span class="admin-user-status" id="adminUserStatus"></span>
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
                            <i class="fa-solid fa-paper-plane"></i>
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
                // Clear badge when opening
                updateBadge(0);
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
    
    // ========== LOAD USER LIST ==========
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
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">No conversations yet</div>
                    </div>`;
                updateBadge(0);
                return;
            }
            
            const chats = snapshot.val();
            const chatIds = Object.keys(chats);
            
            chatIds.sort((a, b) => {
                const timeA = chats[a].lastMessageTime || 0;
                const timeB = chats[b].lastMessageTime || 0;
                return timeB - timeA;
            });
            
            totalUnreadAdmin = 0;
            
            chatIds.forEach(chatId => {
                const chat = chats[chatId];
                const unreadCount = chat.unreadAdmin || 0;
                totalUnreadAdmin += unreadCount;
                
                const lastTime = chat.lastMessageTime ? formatTime(chat.lastMessageTime) : '';
                
                const userItem = document.createElement('div');
                userItem.className = 'admin-user-item';
                if (activeChatId === chatId) {
                    userItem.classList.add('active');
                }
                if (unreadCount > 0) {
                    userItem.classList.add('has-unread');
                }
                
                userItem.innerHTML = `
                    <div class="admin-user-avatar">📱</div>
                    <div class="admin-user-info">
                        <div class="admin-user-name">${chatId}</div>
                        <div class="admin-user-last-msg">${chat.lastMessage ? truncateText(chat.lastMessage, 25) : 'No messages'}</div>
                    </div>
                    <div class="admin-user-time">${lastTime}</div>
                    ${unreadCount > 0 ? `<div class="unread-count-badge">${unreadCount}</div>` : ''}
                `;
                
                userItem.addEventListener('click', function() {
                    openConversation(chatId);
                });
                
                userList.appendChild(userItem);
            });
            
            updateBadge(totalUnreadAdmin);
        });
    }
    
    function listenForNewUsers() {
        const db = firebase.database();
        db.ref('chats').on('child_added', function(snapshot) {
            console.log('🆕 New chat from:', snapshot.key);
            
            // Play notification sound
            playNotificationSound();
            
            // Show toast notification
            showToastNotification('New message from ' + snapshot.key);
            
            const panel = document.getElementById('adminChatPanel');
            if (panel && panel.classList.contains('show')) {
                loadUserList();
            }
        });
    }
    
    // ========== OPEN CONVERSATION ==========
    function openConversation(chatId) {
        console.log('📂 Opening conversation with:', chatId);
        
        activeChatId = chatId;
        
        document.getElementById('adminUserList').style.display = 'none';
        document.getElementById('adminConversation').style.display = 'flex';
        document.getElementById('adminChatTitle').textContent = '📱 ' + chatId;
        
        // Check user online status
        checkUserOnlineStatus(chatId);
        
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
    
    // ========== LOAD MESSAGES ==========
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
    }
    
    function displayMessage(msg, msgId) {
        const messagesContainer = document.getElementById('adminMessages');
        const typingIndicator = document.getElementById('adminTypingIndicator');
        
        if (!messagesContainer) return;
        
        const msgEl = document.createElement('div');
        msgEl.className = 'msg-bubble ' + (msg.sender === 'admin' ? 'user-msg' : 'admin-msg');
        msgEl.id = 'msg-' + msgId;
        
        if (msg.isPreChat) {
            msgEl.classList.add('pre-chat-msg');
        }
        
        const time = msg.timestamp 
            ? new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
            : 'Just now';
        
        const senderLabel = msg.sender === 'admin' ? 'You' : 'User';
        
        msgEl.innerHTML = `
            ${msg.isPreChat ? '<div class="pre-chat-label">📌 Auto Message</div>' : ''}
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
    
    // ========== SEND ADMIN MESSAGE ==========
    function sendAdminMessage() {
        if (!activeChatId) return;
        
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
    
    // ========== MARK AS READ ==========
    function markAsRead(chatId) {
        const db = firebase.database();
        db.ref('chats/' + chatId).update({ unreadAdmin: 0 });
        
        // Also mark all user messages as read
        db.ref('chats/' + chatId + '/messages').once('value', function(snapshot) {
            snapshot.forEach(function(childSnapshot) {
                const msg = childSnapshot.val();
                if (msg.sender === 'user' && !msg.read) {
                    db.ref('chats/' + chatId + '/messages/' + childSnapshot.key).update({ read: true });
                }
            });
        });
    }
    
    // ========== CHECK USER ONLINE STATUS ==========
    function checkUserOnlineStatus(chatId) {
        const db = firebase.database();
        db.ref('user_sessions/' + chatId).on('value', function(snapshot) {
            const statusEl = document.getElementById('adminUserStatus');
            if (statusEl) {
                if (snapshot.exists()) {
                    statusEl.textContent = '🟢 Online';
                    statusEl.style.color = '#22C55E';
                } else {
                    statusEl.textContent = '⚫ Offline';
                    statusEl.style.color = '#666';
                }
            }
        });
    }
    
    // ========== NOTIFICATION SOUND ==========
    function playNotificationSound() {
        try {
            const audio = new Audio('sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Sound error:', e));
        } catch(e) {
            console.log('Sound not available');
        }
    }
    
    // ========== TOAST NOTIFICATION ==========
    function showToastNotification(message) {
        // Remove existing toast
        const existingToast = document.getElementById('chatToast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'chatToast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(145deg, #161616, #0a0a0a);
            border: 2px solid #d4af37;
            border-radius: 12px;
            padding: 12px 20px;
            color: #fce883;
            font-family: 'Orbitron', monospace;
            font-size: 11px;
            z-index: 99999;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        toast.innerHTML = `
            <span style="font-size: 20px;">💬</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    // ========== HELPER FUNCTIONS ==========
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'now';
        if (minutes < 60) return minutes + 'm';
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h';
        
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
    
    function scrollToBottom() {
        const messagesContainer = document.getElementById('adminMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }
    
    // ========== ADD ANIMATIONS ==========
    function addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .chat-clickable {
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            .chat-clickable:hover {
                color: #fcf6ba !important;
                text-shadow: 0 0 8px rgba(212, 175, 55, 0.5) !important;
            }
            .pre-chat-msg {
                border-left: 3px solid #ff9800 !important;
            }
            .pre-chat-label {
                font-size: 8px;
                color: #ff9800;
                margin-bottom: 4px;
                font-weight: bold;
            }
            .unread-count-badge {
                background: #ff3333;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                flex-shrink: 0;
            }
            .has-unread {
                border-left: 3px solid #ff3333 !important;
            }
            .admin-user-status {
                font-size: 9px;
                margin-left: auto;
            }
        `;
        
        if (!document.querySelector('#admin-chat-animations')) {
            style.id = 'admin-chat-animations';
            document.head.appendChild(style);
        }
    }
    
    // ========== START ==========
    addAnimations();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
