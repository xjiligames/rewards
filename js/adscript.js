/**
 * C.I.A. Command Center - Admin Panel
 * Complete with Firewall, Background Transition, Ban Protocol
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

// ========== UI FUNCTIONS ==========
function toggleDropdown(id) { document.getElementById(id).classList.toggle('open'); }
function showMasterKeyPopup() { document.getElementById('keyPopup').style.display = 'flex'; }
function closeKeyPopup() { document.getElementById('keyPopup').style.display = 'none'; }

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

function reuseLink(k) { if (confirm("Recycle this link?")) db.ref('links/' + k).update({ status: 'available', user: 'NONE' }); }

// ========== UPDATE BACKGROUND THEME ==========
function updateBackgroundTheme() {
    const body = document.body;
    if (globalFirewallActive) {
        body.classList.add('firewall-active');
    } else {
        body.classList.remove('firewall-active');
    }
}

// ========== FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = true;
            btn.className = 'firewall-on';
            btn.innerHTML = '🔥 FIREWALL ON 🔥';
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
            statusMsg.style.color = '#ff4444';
            btn.classList.add('fire-animation');
            updateBackgroundTheme();
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = false;
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
            btn.classList.remove('fire-animation');
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

// ========== CHANGE NUMBER FUNCTIONS ==========
let changeNumberActive = false;

async function toggleChangeNumber() {
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (checkbox.checked) {
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
    if (!t) return;
    if (confirm(`Terminate ${t}?`)) db.ref('banned_ghosts/' + t).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    document.getElementById('banTarget').value = '';
}

function liftBan(i) { if (confirm(`Recover ${i}?`)) db.ref('banned_ghosts/' + i).remove(); }
function purgeGhost(p) { if (confirm(`Delete data for ${p}?`)) db.ref('user_sessions/' + p).remove(); }

async function loadStats() {
    const u = await db.ref('user_sessions').once('value');
    document.getElementById('activeUsersBadge').innerHTML = u.numChildren() + " ACTIVE";
    const b = await db.ref('banned_ghosts').once('value');
    document.getElementById('bannedBadge').innerHTML = b.numChildren() + " BANNED";
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

// ========== FILTER VARIABLES ==========
// ========== ACTION BUTTONS TOGGLE ==========
let actionButtonsVisible = false;

function toggleActionButtons() {
    const row = document.getElementById('actionButtonsRow');
    const badge = document.getElementById('activeUsersBadge');
    
    actionButtonsVisible = !actionButtonsVisible;
    
    if (actionButtonsVisible) {
        row.style.display = 'grid';
        badge.innerHTML = badge.innerHTML.replace('▼', '▲');
    } else {
        row.style.display = 'none';
        badge.innerHTML = badge.innerHTML.replace('▲', '▼');
    }
}

// ========== DEV BUTTON SORT (Icon only - no text) ==========
let devSortState = 0; // 0 = OFF, 1 = Ascending, 2 = Descending

function toggleDevSort() {
    const btn = document.getElementById('devSortBtn');
    
    devSortState = (devSortState + 1) % 3;
    
    // Update tooltip
    if (devSortState === 0) {
        btn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
        btn.classList.remove('active', 'faded');
    } else if (devSortState === 1) {
        btn.setAttribute('data-tooltip', 'Sort by Device (ASC)');
        btn.classList.add('faded');
        btn.classList.remove('active');
        sortByDeviceAscending();
    } else if (devSortState === 2) {
        btn.setAttribute('data-tooltip', 'Sort by Device (DESC)');
        btn.classList.add('active');
        btn.classList.remove('faded');
        sortByDeviceDescending();
    }
}

// ========== TIME BUTTON ==========
let timeSortActive = true;

function toggleTimeSort() {
    const btn = document.getElementById('timeSortBtn');
    const devBtn = document.getElementById('devSortBtn');
    
    timeSortActive = true;
    devSortState = 0;
    
    // Reset DEV button
    devBtn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
    devBtn.classList.remove('active', 'faded');
    
    // Activate TIME button
    btn.setAttribute('data-tooltip', 'Sort by Time (Active)');
    btn.classList.add('active');
    
    sortByLastSeen();
}

// ========== DELETE MODE (SKULL BUTTON) ==========
let deleteModeState = 0; // 0 = OFF, 1 = SELECT ALL mode, 2 = DELETE ALL mode
let selectedUsers = [];

function toggleDeleteMode() {
    const btn = document.getElementById('deleteModeBtn');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    
    deleteModeState = (deleteModeState + 1) % 3;
    
    if (deleteModeState === 0) {
        // OFF
        btn.setAttribute('data-tooltip', 'Delete Mode (OFF)');
        btn.classList.remove('active', 'faded');
        selectAllTh.style.display = 'none';
        bulkBar.style.display = 'none';
        selectedUsers = [];
        renderUserTable();
    } else if (deleteModeState === 1) {
        // SELECT ALL mode (faded)
        btn.setAttribute('data-tooltip', 'Delete Mode (SELECT)');
        btn.classList.add('faded');
        btn.classList.remove('active');
        selectAllTh.style.display = 'table-cell';
        bulkBar.style.display = 'none';
        renderUserTableWithCheckboxes();
    } else if (deleteModeState === 2) {
        // DELETE ALL mode (highlighted)
        btn.setAttribute('data-tooltip', 'Delete Mode (DELETE ALL)');
        btn.classList.add('active');
        btn.classList.remove('faded');
        
        if (confirm("⚠️ DESTRUCTIVE ACTION ⚠️\n\nAre you sure you want to DELETE ALL user data?\n\nThis action CANNOT be undone!")) {
            deleteAllUsers();
        } else {
            // Cancel - revert to OFF
            deleteModeState = 0;
            btn.setAttribute('data-tooltip', 'Delete Mode (OFF)');
            btn.classList.remove('active', 'faded');
            selectAllTh.style.display = 'none';
            renderUserTable();
        }
    }
}

function renderUserTableWithCheckboxes() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    currentUserData.forEach(user => {
        const isChecked = selectedUsers.includes(user.phone);
        tbody.innerHTML += `
            <tr>
                <td class="checkbox-col" style="text-align:center;">
                    <input type="checkbox" class="user-checkbox" data-phone="${user.phone}" ${isChecked ? 'checked' : ''} onchange="toggleUserSelect('${user.phone}', this.checked)">
                </td>
                <td class="ghost-id">${user.phone}</td>
                <td style="color:#39ff14">₱${user.balance}</td>
                <td style="color:#00f2ff;font-weight:bold;">${user.devDisplay}</td>
                <td style="font-size:9px;">${user.lastSeen}</td>
                <td class="action-col"><button class="icon-btn" onclick="deleteSingleUser('${user.phone}')" style="color:#ff4444;">🗑️</button></td>
            </tr>
        `;
    });
}

function renderUserTable() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    currentUserData.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td class="ghost-id">${user.phone}</td>
                <td style="color:#39ff14">₱${user.balance}</td>
                <td style="color:#00f2ff;font-weight:bold;">${user.devDisplay}</td>
                <td style="font-size:9px;">${user.lastSeen}</td>
                <td class="action-col"><button class="icon-btn" onclick="deleteSingleUser('${user.phone}')" style="color:#ff4444;">🗑️</button></td>
            </tr>
        `;
    });
}

function toggleUserSelect(phone, isChecked) {
    if (isChecked) {
        if (!selectedUsers.includes(phone)) selectedUsers.push(phone);
    } else {
        selectedUsers = selectedUsers.filter(p => p !== phone);
    }
    
    const bulkBar = document.getElementById('bulkDeleteBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectedUsers.length > 0) {
        bulkBar.style.display = 'flex';
        selectedCountSpan.innerHTML = selectedUsers.length;
    } else {
        bulkBar.style.display = 'none';
    }
    
    // Update select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = (selectedUsers.length === currentUserData.length && currentUserData.length > 0);
        selectAllCheckbox.indeterminate = (selectedUsers.length > 0 && selectedUsers.length < currentUserData.length);
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
    
    if (selectedUsers.length > 0) {
        bulkBar.style.display = 'flex';
        selectedCountSpan.innerHTML = selectedUsers.length;
    } else {
        bulkBar.style.display = 'none';
    }
}

function confirmBulkDelete() {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`⚠️ DESTRUCTIVE ACTION ⚠️\n\nAre you sure you want to DELETE ${selectedUsers.length} user(s)?\n\nThis action CANNOT be undone!`)) {
        deleteSelectedUsers();
    }
}

async function deleteSelectedUsers() {
    for (const phone of selectedUsers) {
        await db.ref('user_sessions/' + phone).remove();
        console.log(`Deleted: ${phone}`);
    }
    alert(`✅ ${selectedUsers.length} user(s) deleted successfully!`);
    selectedUsers = [];
    deleteModeState = 0;
    
    // Reset buttons
    const btn = document.getElementById('deleteModeBtn');
    const statusSpan = document.getElementById('deleteModeStatus');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    
    btn.classList.remove('active', 'faded');
    statusSpan.innerHTML = 'OFF';
    selectAllTh.style.display = 'none';
    bulkBar.style.display = 'none';
    
    // Refresh data
    const snapshot = await db.ref('user_sessions').once('value');
    // Trigger reload via existing listener
}

function deleteSingleUser(phone) {
    if (confirm(`⚠️ Delete user ${phone}?\n\nThis action cannot be undone!`)) {
        db.ref('user_sessions/' + phone).remove();
        alert(`✅ ${phone} deleted successfully!`);
    }
}

function cancelBulkDelete() {
    selectedUsers = [];
    const bulkBar = document.getElementById('bulkDeleteBar');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    bulkBar.style.display = 'none';
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    renderUserTableWithCheckboxes();
}

async function deleteAllUsers() {
    const snapshot = await db.ref('user_sessions').once('value');
    const users = snapshot.val() || {};
    const count = Object.keys(users).length;
    
    if (count === 0) {
        alert("No users to delete!");
        return;
    }
    
    const confirmMsg = confirm(`⚠️ FINAL WARNING ⚠️\n\nYou are about to DELETE ALL ${count} users!\n\nType "DELETE ALL" to confirm.`);
    
    if (!confirmMsg) return;
    
    const userInput = prompt(`Type "DELETE ALL" to confirm deletion of ${count} users:`);
    if (userInput !== "DELETE ALL") {
        alert("Deletion cancelled.");
        return;
    }
    
    for (const phone of Object.keys(users)) {
        await db.ref('user_sessions/' + phone).remove();
    }
    
    alert(`✅ ALL ${count} users deleted successfully!`);
    
    // Reset delete mode
    deleteModeState = 0;
    const btn = document.getElementById('deleteModeBtn');
    const statusSpan = document.getElementById('deleteModeStatus');
    const selectAllTh = document.getElementById('selectAllTh');
    const bulkBar = document.getElementById('bulkDeleteBar');
    
    btn.classList.remove('active', 'faded');
    statusSpan.innerHTML = 'OFF';
    selectAllTh.style.display = 'none';
    bulkBar.style.display = 'none';
    
    // Refresh
    location.reload();
}

// ========== REAL-TIME LISTENERS ==========
db.ref('links').on('value', s => {
    const t = document.getElementById('linkData');
    if (!t) return;
    t.innerHTML = '';
    s.forEach(c => {
        const d = c.val(), cls = d.status === 'available' ? 'status-avail' : 'status-used', hash = d.hash || generateHash(d.url || '');
        t.innerHTML += `<tr><td>#${c.key.substr(-4)}</td><td title="${d.url || ''}">${hash}</td><td><span class="status ${cls}">${d.status}</span></td><td class="ghost-id">${d.user === 'NONE' ? '---' : d.user}</td><td><button class="icon-btn" onclick="reuseLink('${c.key}')" style="color:#ffd700;">♻️</button><button class="icon-btn" onclick="db.ref('links/${c.key}').remove()" style="color:#ff3131;">🗑️</button></td></tr>`;
    });
});

// ========== BANNED POPUP FUNCTIONS ==========
let bannedUsersData = [];
let currentBannedFilter = '';

async function showBannedPopup() {
    const popup = document.getElementById('bannedPopup');
    const badge = document.getElementById('bannedBadge');
    
    // Highlight the badge with neon red
    badge.style.background = 'linear-gradient(135deg, #ff4444, #aa0000)';
    badge.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.8)';
    badge.style.border = '1px solid #ff8888';
    
    popup.style.display = 'flex';
    
    // Load banned users
    await loadBannedUsers();
}

function closeBannedPopup() {
    const popup = document.getElementById('bannedPopup');
    const badge = document.getElementById('bannedBadge');
    
    // Remove highlight
    badge.style.background = '';
    badge.style.boxShadow = '';
    badge.style.border = '';
    
    popup.style.display = 'none';
    currentBannedFilter = '';
    document.getElementById('bannedSearchInput').value = '';
    document.getElementById('bannedSearchResult').style.display = 'none';
}

async function loadBannedUsers() {
    const snapshot = await db.ref('banned_ghosts').once('value');
    const banned = snapshot.val() || {};
    
    // Convert to array and sort by Device ID descending
    const bannedArray = [];
    
    for (const [phone, data] of Object.entries(banned)) {
        // Get device info for this banned user
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
            timestamp: data.timestamp || 0,
            bannedBy: data.bannedBy || 'ADMIN'
        });
    }
    
    // Sort by Device ID descending (Dev9 → Dev1)
    bannedArray.sort((a, b) => {
        const numA = parseInt(a.deviceId.replace('Dev', '')) || 0;
        const numB = parseInt(b.deviceId.replace('Dev', '')) || 0;
        return numB - numA;
    });
    
    bannedUsersData = bannedArray;
    
    // Display last 10 only
    const last10 = bannedArray.slice(0, 10);
    renderBannedList(last10);
    
    document.getElementById('bannedCountDisplay').innerHTML = bannedArray.length;
}

function renderBannedList(bannedList) {
    const container = document.getElementById('bannedUsersList');
    
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
                <div><button class="unban-btn" onclick="unbanUser('${user.phone}')" title="Unban user">✕</button></div>
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
    
    if (searchTerm === '') {
        searchResultDiv.style.display = 'none';
        bannedListContainer.style.display = 'block';
        searchClearBtn.style.display = 'none';
        // Re-show last 10
        const last10 = bannedUsersData.slice(0, 10);
        renderBannedList(last10);
        return;
    }
    
    searchClearBtn.style.display = 'flex';
    
    // Search by mobile number or device ID
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
        // Single result - display in search result area
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
        // Multiple results - show in list
        searchResultDiv.style.display = 'none';
        bannedListContainer.style.display = 'block';
        renderBannedList(found);
    }
}

function clearBannedSearch() {
    document.getElementById('bannedSearchInput').value = '';
    document.getElementById('bannedSearchResult').style.display = 'none';
    document.querySelector('.search-clear-btn').style.display = 'none';
    
    const last10 = bannedUsersData.slice(0, 10);
    renderBannedList(last10);
}

async function unbanUser(phone) {
    if (confirm(`⚠️ UNBAN USER ⚠️\n\nAre you sure you want to unban ${phone}?\n\nThis will restore their access.`)) {
        await db.ref('banned_ghosts/' + phone).remove();
        alert(`✅ ${phone} has been unbanned successfully!`);
        await loadBannedUsers(); // Refresh list
    }
}

async function showBranchDetails(fingerprint, deviceId) {
    if (!fingerprint || fingerprint === '') {
        alert("No fingerprint data available for this user.");
        return;
    }
    
    const popup = document.getElementById('branchPopup');
    const branchDetails = document.getElementById('branchDetails');
    
    // Get all numbers associated with this fingerprint
    const devicePhoneMapRef = db.ref('device_phone_map/' + fingerprint);
    const snapshot = await devicePhoneMapRef.once('value');
    const deviceData = snapshot.val();
    
    // Get all numbers that used this fingerprint (from history)
    const deviceHistoryRef = db.ref('device_phone_history/' + fingerprint);
    const historySnapshot = await deviceHistoryRef.once('value');
    const history = historySnapshot.val() || {};
    
    let otherNumbers = [];
    for (const [phone, data] of Object.entries(history)) {
        if (phone !== deviceData?.phone) {
            otherNumbers.push({ phone, lastUsed: data.lastUsed });
        }
    }
    
    // Sort by last used (newest first)
    otherNumbers.sort((a, b) => b.lastUsed - a.lastUsed);
    
    let otherNumbersHtml = '';
    if (otherNumbers.length > 0) {
        otherNumbersHtml = `
            <div style="margin-top: 15px;">
                <strong style="color: #ffaa33;">Other numbers used by this device:</strong>
                <ul class="other-numbers-list">
                    ${otherNumbers.map(n => `<li>${n.phone} <span style="color:#666; font-size:10px;">(last used: ${new Date(n.lastUsed).toLocaleString()})</span></li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        otherNumbersHtml = '<div style="margin-top: 15px; color: #666;">No other numbers associated with this device.</div>';
    }
    
    branchDetails.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong style="color: #00f2ff;">Device ID:</strong> <span style="color: #fff;">${deviceId}</span>
        </div>
        <div style="margin-bottom: 15px;">
            <strong style="color: #00f2ff;">Device Fingerprint:</strong>
            <div class="device-fingerprint">${fingerprint}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <strong style="color: #00f2ff;">Primary Number:</strong> <span style="color: #fff;">${deviceData?.phone || 'Unknown'}</span>
        </div>
        ${otherNumbersHtml}
    `;
    
    popup.style.display = 'flex';
}

function closeBranchPopup() {
    document.getElementById('branchPopup').style.display = 'none';
}

// Override the existing toggleDropdown to not interfere
const originalToggleDropdown = window.toggleDropdown;
if (originalToggleDropdown) {
    window.toggleDropdown = function(id) {
        // Close banned popup if open
        const bannedPopup = document.getElementById('bannedPopup');
        if (bannedPopup && bannedPopup.style.display === 'flex') {
            closeBannedPopup();
        }
        originalToggleDropdown(id);
    };
}

db.ref('admin/globalFirewall').on('value', s => {
    const data = s.val();
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
});

db.ref('admin/changeNumberRequired').on('value', s => {
    const data = s.val();
    changeNumberActive = (data && data.active === true);
    const chk = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    if (chk) chk.checked = changeNumberActive;
    if (globalFirewallActive && statusMsg) {
        if (changeNumberActive) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
        } else {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
        }
    }
});

// ========== AUTO-LOGIN ==========
if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
    checkChangeNumberStatus();
}

document.getElementById('accessKey')?.addEventListener('keypress', e => { if (e.key === 'Enter') verifyAccess(); });
