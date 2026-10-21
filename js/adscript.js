/**
 * ============================================================
 * C.I.A. ADMIN — adscript.js v4.0
 * ============================================================
 */

/* ============================================================
   1. FIREBASE
   ============================================================ */
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

/* ============================================================
   2. STATE
   ============================================================ */
let globalFirewallActive = false;
let banProtocolEnabled = false;
let currentUserData = [];
let bannedUsersData = [];

let verificationListener = null;
let verificationInterval = null;
let activeVerifications = {};
let lastRenderHash = '';

const AUTO_DELETE_MS = 2 * 60 * 1000;
const QUEUE_DELETE_MS = 12 * 60 * 1000;

let deleteModeState = 0;
let selectedUsers = [];
let devSortState = 0;

/* ============================================================
   3. UTILS
   ============================================================ */
function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) {
        h = ((h << 5) - h) + u.charCodeAt(i);
        h |= 0;
    }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
}

function formatVerificationTime(timestamp) {
    if (!timestamp) return '---';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes < 1) return seconds + 's ago';
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const date = new Date(timestamp);
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function copyToClipboard(text, btn) {
    const done = () => {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-check"/></svg>';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('copied');
        }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
}

function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
}

function showToast(message, type) {
    const old = document.getElementById('toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'toast';
    const color = type === 'success' ? 'var(--success)' : 'var(--danger)';
    const soft = type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)';
    toast.style.cssText =
        'position:fixed;top:20px;right:20px;padding:12px 18px;' +
        'background:' + soft + ';border:1px solid ' + color + ';' +
        'border-radius:10px;color:' + color + ';' +
        'font-family:var(--font-mono);font-size:11px;font-weight:700;' +
        'z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.3);' +
        'animation:slideDown 0.3s ease;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/* ============================================================
   4. THEME
   ============================================================ */
function applyTheme(day) {
    document.body.setAttribute('data-theme', day ? 'day' : 'night');
    const indicator = document.getElementById('themeIndicator');
    if (indicator) {
        indicator.innerHTML = day
            ? '<svg class="icon"><use href="#i-sun"/></svg><span>DAY</span>'
            : '<svg class="icon"><use href="#i-moon"/></svg><span>NIGHT</span>';
    }
}

/* ============================================================
   5. FIREWALL
   ============================================================ */
async function toggleFirewall() {
    if (!globalFirewallActive) {
        if (!confirm('🔥 ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.')) return;
        await db.ref('admin/globalFirewall').set({
            active: true,
            activatedBy: 'ADMIN',
            timestamp: Date.now()
        });
        globalFirewallActive = true;
        applyTheme(true);
        updateFirewallUI();
        alert('🔥 FIREWALL ACTIVATED — Day mode');
    } else {
        if (!confirm('🌙 DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.')) return;
        await db.ref('admin/globalFirewall').set({
            active: false,
            deactivatedBy: 'ADMIN',
            timestamp: Date.now()
        });
        globalFirewallActive = false;
        applyTheme(false);
        updateFirewallUI();
        alert('🌙 FIREWALL DEACTIVATED — Night mode');
    }
}

function updateFirewallUI() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    if (!btn) return;
    if (globalFirewallActive) {
        btn.className = 'firewall-btn firewall-on';
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-sun"/></svg><span>FIREWALL ON</span>';
        if (statusMsg) statusMsg.textContent = '☀️ Day mode — verification required';
    } else {
        btn.className = 'firewall-btn firewall-off';
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-moon"/></svg><span>FIREWALL OFF</span>';
        if (statusMsg) statusMsg.textContent = '🌙 Night mode — normal claiming';
    }
}

async function checkGlobalFirewallStatus() {
    try {
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        globalFirewallActive = !!(data && data.active === true);
        applyTheme(globalFirewallActive);
        updateFirewallUI();
    } catch (e) {
        console.warn('Could not check firewall:', e);
    }
}

/* ============================================================
   6. TOGGLES & COLLAPSE
   ============================================================ */
function bindToggles() {
    // --- User Logs: click-to-expand ---
    const userLogsHeader = document.getElementById('userLogsHeader');
    const userLogsBody = document.getElementById('userLogsBody');

    if (userLogsHeader && userLogsBody) {
        userLogsHeader.addEventListener('click', () => {
            const expanded = userLogsHeader.getAttribute('aria-expanded') === 'true';
            userLogsHeader.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            if (expanded) {
                userLogsBody.classList.add('is-closed');
            } else {
                userLogsBody.classList.remove('is-closed');
            }
        });
        userLogsHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                userLogsHeader.click();
            }
        });
    }

    // --- Ban Protocol: click-to-expand + toggle ---
    const banHeader = document.getElementById('banHeader');
    const banBody = document.getElementById('banBody');

    if (banHeader && banBody) {
        banHeader.addEventListener('click', () => {
            const expanded = banHeader.getAttribute('aria-expanded') === 'true';
            banHeader.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            if (expanded) {
                banBody.classList.add('is-closed');
            } else {
                banBody.classList.remove('is-closed');
            }
        });
        banHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                banHeader.click();
            }
        });
    }

    // --- Ban toggle (kill switch) ---
    const banToggle = document.getElementById('banToggle');
    if (banToggle) {
        banToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            banProtocolEnabled = enabled;
            updateToggleText(banToggle, enabled);
            updateBanStatusBanner(enabled);
            try {
                await db.ref('admin/banProtocolEnabled').set({
                    enabled: enabled,
                    updatedAt: Date.now(),
                    updatedBy: 'ADMIN'
                });
            } catch (err) {
                console.error('Failed to save ban protocol:', err);
                showToast('❌ Failed to save ban toggle', 'error');
            }
        });
    }
}

function updateToggleText(input, enabled) {
    const label = input.parentElement.querySelector('.toggle-text');
    if (label) label.textContent = enabled ? 'ON' : 'OFF';
}

function updateBanStatusBanner(enabled) {
    const banner = document.getElementById('banStatusBanner');
    const text = document.getElementById('banStatusText');
    if (!banner || !text) return;
    if (enabled) {
        banner.classList.remove('is-off');
        banner.classList.add('is-on');
        text.textContent = 'Ban system is ENABLED — banned users are restricted.';
    } else {
        banner.classList.remove('is-on');
        banner.classList.add('is-off');
        text.textContent = 'Ban system is DISABLED — banned users can access pages.';
    }
}

async function checkBanProtocolStatus() {
    try {
        const snap = await db.ref('admin/banProtocolEnabled').once('value');
        const data = snap.val();
        banProtocolEnabled = !!(data && data.enabled === true);
        const banToggle = document.getElementById('banToggle');
        if (banToggle) {
            banToggle.checked = banProtocolEnabled;
            updateToggleText(banToggle, banProtocolEnabled);
        }
        updateBanStatusBanner(banProtocolEnabled);
    } catch (e) {
        console.warn('Could not check ban protocol:', e);
    }
}

/* ============================================================
   7. DEPLOY
   ============================================================ */
function deploy() {
    const input = document.getElementById('links');
    const v = input.value.trim();
    if (!v) { alert('⚠️ Enter at least one link'); return; }
    const links = v.split('\n').filter(u => u.trim());
    let count = 0;
    links.forEach(u => {
        const url = u.trim();
        if (!url) return;
        db.ref('links').push({
            url: url,
            hash: generateHash(url),
            status: 'available',
            user: 'NONE',
            createdAt: Date.now()
        });
        count++;
    });
    input.value = '';
    alert('✅ ' + count + ' link(s) deployed!');
}

function reuseLink(key) {
    if (confirm('♻️ Recycle this link?')) {
        db.ref('links/' + key).update({ status: 'available', user: 'NONE' });
    }
}

function deleteLink(key) {
    if (confirm('Delete this link?')) {
        db.ref('links/' + key).remove();
    }
}

/* ============================================================
   8. LINK MONITOR
   ============================================================ */
db.ref('links').on('value', function(snapshot) {
    const tbody = document.getElementById('linkData');
    if (!tbody) return;
    tbody.innerHTML = '';
    const links = snapshot.val() || {};

    if (Object.keys(links).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-hint">No links deployed yet</td></tr>';
        return;
    }

    Object.entries(links).forEach(function(entry) {
        const key = entry[0];
        const data = entry[1];
        const isAvail = data.status === 'available';
        const statusClass = isAvail ? 'available' : 'used';
        const statusLabel = isAvail ? 'AVAILABLE' : 'USED';

        tbody.innerHTML +=
            '<tr>' +
                '<td>' +
                    '<span class="link-status ' + statusClass + '">' +
                        '<span class="dot"></span>' +
                        statusLabel +
                    '</span>' +
                '</td>' +
                '<td class="cell-phone">' + (data.user === 'NONE' ? '---' : data.user) + '</td>' +
                '<td class="action-col">' +
                    '<div class="link-actions">' +
                        '<button class="btn-icon" onclick="reuseLink(\'' + key + '\')" title="Recycle">' +
                            '<svg class="icon icon-xs"><use href="#i-clock"/></svg>' +
                        '</button>' +
                        '<button class="btn-icon btn-icon-danger" onclick="deleteLink(\'' + key + '\')" title="Delete">' +
                            '<svg class="icon icon-xs"><use href="#i-trash"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
    });
});

/* ============================================================
   9. DEVICE MAP
   ============================================================ */
async function getDeviceDisplayId(fp) {
    if (!fp || fp === '---') return '---';
    try {
        const m = await db.ref('device_id_map/' + fp).once('value');
        if (m.exists()) return m.val().displayId;

        const result = await db.ref('admin/deviceCounter').transaction(function(n) {
            return (n || 0) + 1;
        });
        const id = 'Dev' + result.snapshot.val();
        await db.ref('device_id_map/' + fp).set({
            displayId: id,
            createdAt: Date.now(),
            fingerprint: fp
        });
        return id;
    } catch (e) {
        console.warn('Device mapping error:', e);
        return '---';
    }
}

/* ============================================================
   10. USER SESSIONS
   ============================================================ */
db.ref('user_sessions').on('value', async function(snapshot) {
    const sessions = snapshot.val() || {};
    const usersArray = [];

    for (const entry of Object.entries(sessions)) {
        const phone = entry[0];
        const data = entry[1];
        const lastRaw = data.lastUpdate || 0;
        let lastFormatted = '---';
        if (lastRaw) {
            const d = new Date(lastRaw);
            let h = d.getHours();
            const m = d.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            lastFormatted = h + ':' + m + ' ' + ampm;
        }
        const fp = data.deviceFingerprint || '---';
        let dev = '---';
        if (fp !== '---') dev = await getDeviceDisplayId(fp);

        usersArray.push({
            phone: phone,
            balance: (data.balance || 0).toLocaleString(),
            devDisplay: dev,
            lastSeen: lastFormatted,
            lastSeenRaw: lastRaw,
            status: data.status || 'online'
        });
    }

    currentUserData = usersArray;
    sortByLastSeen(true);

    if (deleteModeState === 1) renderUserTableWithCheckboxes();
    else renderUserTable();

    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.textContent = Object.keys(sessions).length;
});

/* ============================================================
   11. BANNED BADGE
   ============================================================ */
db.ref('banned_ghosts').on('value', function(snapshot) {
    const count = snapshot.numChildren() || 0;
    const badge = document.getElementById('bannedBadge');
    if (badge) badge.textContent = count;
});

/* ============================================================
   12. SORT
   ============================================================ */
function sortByLastSeen(silent) {
    currentUserData.sort(function(a, b) { return b.lastSeenRaw - a.lastSeenRaw; });
    if (!silent) renderUserTable();
}

function sortByDevice(asc) {
    currentUserData.sort(function(a, b) {
        const nA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const nB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return asc ? nA - nB : nB - nA;
    });
    renderUserTable();
}

/* ============================================================
   13. USER TABLE
   ============================================================ */
function renderUserTable() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;

    if (!currentUserData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No users found</td></tr>';
        return;
    }

    let html = '';
    currentUserData.forEach(function(u) {
        html +=
            '<tr>' +
                '<td class="cell-phone phone-cell" data-phone="' + u.phone + '" title="Click to force logout">' + u.phone + '</td>' +
                '<td class="cell-balance">₱' + u.balance + '</td>' +
                '<td class="cell-device">' + u.devDisplay + '</td>' +
                '<td class="cell-time">' + u.lastSeen + '</td>' +
                '<td class="action-col">' +
                    '<button class="btn-icon btn-icon-danger delete-user-btn" data-phone="' + u.phone + '" title="Delete">' +
                        '<svg class="icon icon-xs"><use href="#i-trash"/></svg>' +
                    '</button>' +
                '</td>' +
            '</tr>';
    });
    tbody.innerHTML = html;
    bindTableActions();
    bindForceLogout();
}

function renderUserTableWithCheckboxes() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;

    if (!currentUserData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No users found</td></tr>';
        return;
    }

    let html = '';
    currentUserData.forEach(function(u) {
        const checked = selectedUsers.indexOf(u.phone) !== -1 ? 'checked' : '';
        html +=
            '<tr>' +
                '<td class="checkbox-col">' +
                    '<input type="checkbox" class="user-checkbox" data-phone="' + u.phone + '" ' + checked + '>' +
                '</td>' +
                '<td class="cell-phone">' + u.phone + '</td>' +
                '<td class="cell-balance">₱' + u.balance + '</td>' +
                '<td class="cell-device">' + u.devDisplay + '</td>' +
                '<td class="cell-time">' + u.lastSeen + '</td>' +
                '<td class="action-col">' +
                    '<button class="btn-icon btn-icon-danger delete-user-btn" data-phone="' + u.phone + '" title="Delete">' +
                        '<svg class="icon icon-xs"><use href="#i-trash"/></svg>' +
                    '</button>' +
                '</td>' +
            '</tr>';
    });
    tbody.innerHTML = html;
    bindTableActions();
    bindCheckboxes();
}

function bindTableActions() {
    document.querySelectorAll('.delete-user-btn').forEach(function(btn) {
        btn.onclick = function(e) {
            e.stopPropagation();
            deleteSingleUser(btn.dataset.phone);
        };
    });
}

function bindCheckboxes() {
    document.querySelectorAll('.user-checkbox').forEach(function(cb) {
        cb.onchange = function() { toggleUserSelect(cb.dataset.phone, cb.checked); };
    });
    const all = document.getElementById('selectAllCheckbox');
    if (all) {
        all.checked = selectedUsers.length === currentUserData.length && currentUserData.length > 0;
        all.indeterminate = selectedUsers.length > 0 && selectedUsers.length < currentUserData.length;
    }
}

function bindForceLogout() {
    document.querySelectorAll('.phone-cell').forEach(function(cell) {
        if (cell.dataset.bound) return;
        cell.dataset.bound = '1';
        cell.addEventListener('click', function() {
            if (!confirm('⚠️ Force logout ' + cell.dataset.phone + '?')) return;
            db.ref('user_sessions/' + cell.dataset.phone).update({
                status: 'offline',
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                forceLogout: true
            }).then(function() {
                showToast('✅ ' + cell.dataset.phone + ' logged out', 'success');
            }).catch(function() {
                showToast('❌ Failed to logout', 'error');
            });
        });
    });
}

/* ============================================================
   14. DELETE
   ============================================================ */
function deleteSingleUser(phone) {
    if (!confirm('⚠️ Delete user ' + phone + '?\n\nThis cannot be undone.')) return;
    db.ref('user_sessions/' + phone).remove()
        .then(function() { showToast('✅ ' + phone + ' deleted', 'success'); })
        .catch(function() { showToast('❌ Delete failed', 'error'); });
}

function toggleUserSelect(phone, isChecked) {
    if (isChecked) {
        if (selectedUsers.indexOf(phone) === -1) selectedUsers.push(phone);
    } else {
        selectedUsers = selectedUsers.filter(function(p) { return p !== phone; });
    }
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkDeleteBar');
    const count = document.getElementById('selectedCount');
    if (!bar) return;
    if (selectedUsers.length > 0) {
        bar.style.display = 'flex';
        if (count) count.textContent = selectedUsers.length;
    } else {
        bar.style.display = 'none';
    }
}

function toggleSelectAll() {
    const cb = document.getElementById('selectAllCheckbox');
    selectedUsers = cb.checked ? currentUserData.map(function(u) { return u.phone; }) : [];
    renderUserTableWithCheckboxes();
    updateBulkBar();
}

function confirmBulkDelete() {
    if (!selectedUsers.length) return;
    if (!confirm('⚠️ Delete ' + selectedUsers.length + ' user(s)?')) return;
    deleteSelectedUsers();
}

async function deleteSelectedUsers() {
    let ok = 0, fail = 0;
    for (const phone of selectedUsers) {
        try { await db.ref('user_sessions/' + phone).remove(); ok++; }
        catch (e) { fail++; }
    }
    showToast('✅ ' + ok + ' deleted' + (fail ? ', ' + fail + ' failed' : ''), 'success');
    cancelBulkDelete();
}

function cancelBulkDelete() {
    selectedUsers = [];
    deleteModeState = 0;
    const th = document.getElementById('selectAllTh');
    const bar = document.getElementById('bulkDeleteBar');
    const btn = document.getElementById('deleteModeBtn');
    if (th) th.style.display = 'none';
    if (bar) bar.style.display = 'none';
    if (btn) btn.classList.remove('is-active');
    renderUserTable();
}

/* ============================================================
   15. TOOLBAR
   ============================================================ */
function toggleDevSort() {
    devSortState = (devSortState + 1) % 3;
    const btn = document.getElementById('devSortBtn');
    btn.classList.remove('is-active', 'is-faded');
    if (devSortState === 0) {
        sortByLastSeen();
    } else if (devSortState === 1) {
        btn.classList.add('is-faded');
        sortByDevice(true);
    } else {
        btn.classList.add('is-active');
        sortByDevice(false);
    }
}

function toggleTimeSort() {
    devSortState = 0;
    const devBtn = document.getElementById('devSortBtn');
    const timeBtn = document.getElementById('timeSortBtn');
    if (devBtn) devBtn.classList.remove('is-active', 'is-faded');
    if (timeBtn) timeBtn.classList.add('is-active');
    sortByLastSeen();
}

function toggleDeleteMode() {
    deleteModeState = (deleteModeState + 1) % 3;
    const btn = document.getElementById('deleteModeBtn');
    const th = document.getElementById('selectAllTh');
    const bar = document.getElementById('bulkDeleteBar');

    if (deleteModeState === 0) {
        btn.classList.remove('is-active', 'is-faded');
        th.style.display = 'none';
        bar.style.display = 'none';
        selectedUsers = [];
        renderUserTable();
    } else if (deleteModeState === 1) {
        btn.classList.add('is-faded');
        btn.classList.remove('is-active');
        th.style.display = 'table-cell';
        selectedUsers = [];
        renderUserTableWithCheckboxes();
    } else {
        btn.classList.add('is-active');
        btn.classList.remove('is-faded');
        if (!selectedUsers.length) {
            alert('⚠️ No users selected.');
            deleteModeState = 1;
            btn.classList.remove('is-active');
            btn.classList.add('is-faded');
            return;
        }
        if (confirm('⚠️ Delete ' + selectedUsers.length + ' selected user(s)?')) {
            deleteSelectedUsers();
        } else {
            deleteModeState = 1;
            btn.classList.remove('is-active');
            btn.classList.add('is-faded');
        }
    }
}

/* ============================================================
   16. BAN
   ============================================================ */
function banGhost() {
    const input = document.getElementById('banTarget');
    const t = input.value.trim();
    if (!t) { alert('⚠️ Enter a phone number'); return; }
    if (!/^09\d{9}$/.test(t)) { alert('⚠️ Invalid format. Use 09XXXXXXXXX'); return; }
    if (!confirm('⚠️ Ban ' + t + '?')) return;
    db.ref('banned_ghosts/' + t).set({
        timestamp: Date.now(),
        bannedBy: 'ADMIN',
        reason: 'Manual ban'
    }).then(function() {
        alert('✅ ' + t + ' banned');
        input.value = '';
        loadBannedUsers();
    });
}

function liftBan(phone) {
    if (!confirm('Unban ' + phone + '?')) return;
    db.ref('banned_ghosts/' + phone).remove();
}

/* ============================================================
   17. BANNED POPUP
   ============================================================ */
async function showBannedPopup() {
    document.getElementById('bannedPopup').style.display = 'flex';
    await loadBannedUsers();
}

function closeBannedPopup() {
    document.getElementById('bannedPopup').style.display = 'none';
    const si = document.getElementById('bannedSearchInput');
    const sr = document.getElementById('bannedSearchResult');
    const cb = document.querySelector('.search-clear');
    if (si) si.value = '';
    if (sr) sr.style.display = 'none';
    if (cb) cb.style.display = 'none';
}

async function loadBannedUsers() {
    try {
        const snap = await db.ref('banned_ghosts').once('value');
        const banned = snap.val() || {};
        const deviceMapSnap = await db.ref('device_phone_map').once('value');
        const deviceMap = deviceMapSnap.val() || {};
        const arr = [];

        for (const entry of Object.entries(banned)) {
            const phone = entry[0];
            const data = entry[1];
            let deviceId = 'Unknown';
            let fingerprint = '';
            for (const fpEntry of Object.entries(deviceMap)) {
                const fp = fpEntry[0];
                const info = fpEntry[1];
                if (info.phone === phone) {
                    deviceId = info.displayId || 'Unknown';
                    fingerprint = fp;
                    break;
                }
            }
            arr.push({ phone: phone, deviceId: deviceId, fingerprint: fingerprint, timestamp: data.timestamp || 0 });
        }

        arr.sort(function(a, b) {
            const nA = parseInt(a.deviceId.replace('Dev', '')) || 0;
            const nB = parseInt(b.deviceId.replace('Dev', '')) || 0;
            return nB - nA;
        });

        bannedUsersData = arr;
        renderBannedList(arr);
        renderBannedPreview();

        const countEl = document.getElementById('bannedCountDisplay');
        if (countEl) countEl.textContent = arr.length;
    } catch (e) {
        console.warn('Load banned failed:', e);
    }
}

function renderBannedList(list) {
    const container = document.getElementById('bannedUsersList');
    if (!container) return;

    if (!list.length) {
        container.innerHTML = '<div class="empty-hint">No banned users</div>';
        return;
    }

    let html = '';
    list.forEach(function(u) {
        html +=
            '<div class="banned-item">' +
                '<div class="banned-item-device" onclick="showBranchDetails(\'' + u.fingerprint + '\',\'' + u.deviceId + '\')">' + u.deviceId + '</div>' +
                '<div class="banned-item-phone" onclick="showBranchDetails(\'' + u.fingerprint + '\',\'' + u.deviceId + '\')">' + u.phone + '</div>' +
                '<div class="banned-item-action">' +
                    '<button class="btn-unban" onclick="unbanUser(\'' + u.phone + '\')" title="Unban">' +
                        '<svg class="icon icon-xs"><use href="#i-unban"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>';
    });
    container.innerHTML = html;
}

function renderBannedPreview() {
    const container = document.getElementById('bannedPreview');
    if (!container) return;

    if (!bannedUsersData.length) {
        container.innerHTML = '<div class="empty-hint">No banned users yet</div>';
        return;
    }

    const preview = bannedUsersData.slice(0, 5);
    let html = '';
    preview.forEach(function(u) {
        html +=
            '<div class="banned-preview-item">' +
                '<span class="banned-preview-phone">' + u.phone + '</span>' +
                '<button class="btn-unban" onclick="unbanUser(\'' + u.phone + '\')" title="Unban">' +
                    '<svg class="icon icon-xs"><use href="#i-unban"/></svg>' +
                '</button>' +
            '</div>';
    });
    container.innerHTML = html;
}

function searchBannedUsers() {
    const term = document.getElementById('bannedSearchInput').value.trim().toLowerCase();
    const result = document.getElementById('bannedSearchResult');
    const clearBtn = document.querySelector('.search-clear');

    if (!term) {
        result.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        renderBannedList(bannedUsersData);
        return;
    }

    if (clearBtn) clearBtn.style.display = 'flex';

    const found = bannedUsersData.filter(function(u) {
        return u.phone.indexOf(term) !== -1 || u.deviceId.toLowerCase().indexOf(term) !== -1;
    });

    if (!found.length) {
        result.style.display = 'block';
        result.innerHTML = '<div class="empty-hint">No match found</div>';
        document.getElementById('bannedUsersList').innerHTML = '';
        return;
    }

    result.style.display = 'none';
    renderBannedList(found);
}

function clearBannedSearch() {
    document.getElementById('bannedSearchInput').value = '';
    document.getElementById('bannedSearchResult').style.display = 'none';
    const cb = document.querySelector('.search-clear');
    if (cb) cb.style.display = 'none';
    renderBannedList(bannedUsersData);
}

async function unbanUser(phone) {
    if (!confirm('Unban ' + phone + '?')) return;
    try {
        await db.ref('banned_ghosts/' + phone).remove();
        showToast('✅ ' + phone + ' unbanned', 'success');
        await loadBannedUsers();
    } catch (e) {
        showToast('❌ Unban failed', 'error');
    }
}

/* ============================================================
   18. BRANCH DETAILS
   ============================================================ */
async function showBranchDetails(fp, deviceId) {
    if (!fp) { alert('No fingerprint available'); return; }
    const popup = document.getElementById('branchPopup');
    const details = document.getElementById('branchDetails');
    try {
        const snap = await db.ref('device_phone_map/' + fp).once('value');
        const data = snap.val() || {};
        details.innerHTML =
            '<div style="margin-bottom:12px;">' +
                '<strong style="color:var(--accent);">Device ID:</strong> ' + deviceId +
            '</div>' +
            '<div style="margin-bottom:12px;">' +
                '<strong style="color:var(--accent);">Fingerprint:</strong>' +
                '<div style="word-break:break-all;background:var(--input-bg);padding:8px;border-radius:6px;font-size:10px;margin-top:4px;color:var(--success);">' + fp + '</div>' +
            '</div>' +
            '<div>' +
                '<strong style="color:var(--accent);">Primary Number:</strong> ' + (data.phone || 'Unknown') +
            '</div>';
        popup.style.display = 'flex';
    } catch (e) {
        alert('Error loading details: ' + e.message);
    }
}

function closeBranchPopup() {
    document.getElementById('branchPopup').style.display = 'none';
}

/* ============================================================
   19. VERIFICATION
   ============================================================ */
function initVerification() {
    if (verificationListener) db.ref('user_sessions').off('value', verificationListener);

    lastRenderHash = '';
    verificationListener = db.ref('user_sessions').on('value', function(snap) {
        const sessions = snap.val() || {};
        const map = {};

        Object.keys(sessions).forEach(function(phone) {
            const v = sessions[phone].system_verification;
            if (v && ['active', 'expired', 'invalid', 'verified', 'counting_down'].indexOf(v.status) !== -1) {
                map[phone] = {
                    phone: phone,
                    code: v.code || '----',
                    userEnteredCode: v.userEnteredCode || null,
                    isMatch: v.isMatch || false,
                    timer: v.timer || 0,
                    countdownTimer: v.countdownTimer || 0,
                    countdownStartedAt: v.countdownStartedAt || 0,
                    gcashNumber: v.gcashNumber || null,
                    status: v.status || 'active',
                    deviceId: v.deviceId || 'Unknown',
                    createdAt: v.createdAt || 0,
                    userEnteredAt: v.userEnteredAt || 0,
                    lastUpdate: v.lastUpdate || 0
                };
            }
        });

        const arr = Object.values(map).sort(function(a, b) {
            if (a.status === 'counting_down' && b.status !== 'counting_down') return -1;
            if (b.status === 'counting_down' && a.status !== 'counting_down') return 1;
            return (b.lastUpdate || b.createdAt || 0) - (a.lastUpdate || a.createdAt || 0);
        });

        activeVerifications = map;

        const hash = arr.map(function(v) {
            return v.phone + '|' + v.status + '|' + (v.userEnteredCode || '-') + '|' + (v.isMatch ? 1 : 0) + '|' + (v.countdownTimer || '-') + '|' + v.deviceId;
        }).join('#');

        if (hash !== lastRenderHash) {
            lastRenderHash = hash;
            renderVerificationList(arr);
        }

        const activeCount = arr.filter(function(v) {
            return v.status === 'active' || v.status === 'counting_down';
        }).length;
        const el = document.getElementById('verificationCount');
        if (el) el.textContent = activeCount;
    });

    if (verificationInterval) clearInterval(verificationInterval);
    verificationInterval = setInterval(function() {
        updateVerificationTimers();
        cleanupVerifications();
    }, 1000);
}

function renderVerificationList(list) {
    const el = document.getElementById('verificationList');
    if (!el) return;

    if (!list.length) {
        el.innerHTML =
            '<div class="verification-empty">' +
                '<svg class="icon icon-lg"><use href="#i-target"/></svg>' +
                '<p>No active verifications</p>' +
            '</div>';
        return;
    }

    let html = '';
    list.forEach(function(v) {
        const isQueue = v.status === 'counting_down';

        if (isQueue) {
            const mins = Math.floor((v.countdownTimer || 0) / 60);
            const secs = (v.countdownTimer || 0) % 60;
            const display = mins + ':' + String(secs).padStart(2, '0');
            const progress = ((600 - (v.countdownTimer || 0)) / 600) * 100;

            html +=
                '<div class="verification-item queue-item" data-phone="' + v.phone + '">' +
                    '<div class="v-header">' +
                        '<div class="v-phone-wrap">' +
                            '<svg class="icon icon-xs" style="color:var(--warning);"><use href="#i-hourglass"/></svg>' +
                            '<span class="v-phone-text">' + v.phone + '</span>' +
                            '<button class="v-copy" onclick="copyPhone(\'' + v.phone + '\', this)" title="Copy">' +
                                '<svg class="icon icon-xs"><use href="#i-copy"/></svg>' +
                            '</button>' +
                        '</div>' +
                        '<div class="v-actions">' +
                            '<span class="v-status counting_down">' +
                                '<span class="v-status-dot"></span> QUEUE' +
                            '</span>' +
                            '<button class="v-delete" onclick="deleteVerification(\'' + v.phone + '\')" title="Delete">' +
                                '<svg class="icon icon-xs"><use href="#i-trash"/></svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="queue-countdown-display">' +
                        '<div class="queue-label">⏳ Waiting for queue</div>' +
                        '<div class="queue-timer-big" data-phone="' + v.phone + '">' + display + '</div>' +
                        '<div class="queue-progress-track">' +
                            '<div class="queue-progress-fill" style="width:' + progress + '%"></div>' +
                        '</div>' +
                    '</div>' +
                    (v.gcashNumber
                        ? '<div class="queue-gcash-info">' +
                            '<svg class="icon icon-xs"><use href="#i-device"/></svg>' +
                            'GCash: <strong>' + v.gcashNumber + '</strong>' +
                          '</div>'
                        : '') +
                    '<div class="v-footer">' +
                        '<span class="v-device">' +
                            '<svg class="icon icon-xs"><use href="#i-device"/></svg> ' + v.deviceId +
                        '</span>' +
                        '<span class="v-time">' +
                            '<svg class="icon icon-xs"><use href="#i-clock"/></svg> ' + formatVerificationTime(v.createdAt) +
                        '</span>' +
                    '</div>' +
                '</div>';
            return;
        }

        const timerClass = v.status === 'active' && v.timer <= 9 ? 'urgent' : '';
        let userCodeHtml;
        if (v.userEnteredCode) {
            const matchClass = v.isMatch ? 'code-match' : 'code-mismatch';
            const matchText = v.isMatch ? '✅ MATCH' : '❌ MISMATCH';
            userCodeHtml =
                '<div class="v-value user-code-value ' + matchClass + '">' + v.userEnteredCode + '</div>' +
                '<div class="v-match-badge ' + matchClass + '">' + matchText + '</div>';
        } else {
            userCodeHtml =
                '<div class="v-value user-code-value waiting">----</div>' +
                '<div class="v-match-badge waiting">⏳ WAITING</div>';
        }

        html +=
            '<div class="verification-item status-' + v.status + '" data-phone="' + v.phone + '">' +
                '<div class="v-header">' +
                    '<div class="v-phone-wrap">' +
                        '<svg class="icon icon-xs"><use href="#i-device"/></svg>' +
                        '<span class="v-phone-text">' + v.phone + '</span>' +
                        '<button class="v-copy" onclick="copyPhone(\'' + v.phone + '\', this)" title="Copy">' +
                            '<svg class="icon icon-xs"><use href="#i-copy"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="v-actions">' +
                        '<span class="v-status ' + v.status + '">' +
                            '<span class="v-status-dot"></span> ' + v.status.toUpperCase() +
                        '</span>' +
                        '<button class="v-delete" onclick="deleteVerification(\'' + v.phone + '\')" title="Delete">' +
                            '<svg class="icon icon-xs"><use href="#i-trash"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                (v.gcashNumber
                    ? '<div class="queue-gcash-info">' +
                        '<svg class="icon icon-xs"><use href="#i-device"/></svg>' +
                        'GCash: <strong>' + v.gcashNumber + '</strong>' +
                      '</div>'
                    : '') +
                '<div class="v-grid">' +
                    '<div class="v-box">' +
                        '<div class="v-label">⏱ Timer</div>' +
                        '<div class="v-value timer-display ' + timerClass + '" data-phone="' + v.phone + '">' + v.timer + 's</div>' +
                    '</div>' +
                    '<div class="v-box">' +
                        '<div class="v-label">📝 User Input</div>' +
                        userCodeHtml +
                    '</div>' +
                '</div>' +
                '<div class="v-footer">' +
                    '<span class="v-device">' +
                        '<svg class="icon icon-xs"><use href="#i-device"/></svg> ' + v.deviceId +
                    '</span>' +
                    '<span class="v-time">' +
                        '<svg class="icon icon-xs"><use href="#i-clock"/></svg> ' + formatVerificationTime(v.createdAt) +
                    '</span>' +
                '</div>' +
            '</div>';
    });
    el.innerHTML = html;
}

function updateVerificationTimers() {
    document.querySelectorAll('.timer-display').forEach(function(el) {
        const phone = el.dataset.phone;
        const v = activeVerifications[phone];
        if (!v || v.status !== 'active') return;
        if (v.timer > 0) {
            v.timer--;
            el.textContent = v.timer + 's';
            if (v.timer <= 9) el.classList.add('urgent');
        }
    });

    document.querySelectorAll('.queue-timer-big').forEach(function(el) {
        const phone = el.dataset.phone;
        const v = activeVerifications[phone];
        if (!v || v.status !== 'counting_down') return;
        if (v.countdownTimer > 0) {
            v.countdownTimer--;
            const m = Math.floor(v.countdownTimer / 60);
            const s = v.countdownTimer % 60;
            el.textContent = m + ':' + String(s).padStart(2, '0');
            const track = el.parentElement.querySelector('.queue-progress-fill');
            if (track) track.style.width = ((600 - v.countdownTimer) / 600) * 100 + '%';
        }
    });
}

function cleanupVerifications() {
    const now = Date.now();
    Object.keys(activeVerifications).forEach(function(phone) {
        const v = activeVerifications[phone];
        if (v.status === 'counting_down') {
            const t = v.countdownStartedAt || v.createdAt || 0;
            if (t && now - t > QUEUE_DELETE_MS) removeVerification(phone);
        } else {
            const t = v.userEnteredAt || v.createdAt || 0;
            if (t && now - t > AUTO_DELETE_MS) removeVerification(phone);
        }
    });
}

function deleteVerification(phone) {
    if (!confirm('Delete verification for ' + phone + '?')) return;
    removeVerification(phone);
}

function removeVerification(phone) {
    db.ref('user_sessions/' + phone + '/system_verification').remove().catch(function() {});
    delete activeVerifications[phone];
    lastRenderHash = '';
    const el = document.querySelector('.verification-item[data-phone="' + phone + '"]');
    if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
        setTimeout(function() { el.remove(); }, 300);
    }
}

function copyPhone(phone, btn) {
    copyToClipboard(phone, btn);
}

/* ============================================================
   20. ADMIN CHAT
   ============================================================ */
(function initChat() {
    let activeChatId = null;
    let messagesListener = null;
    let usersListener = null;
    let currentMessages = {};

    function createPanel() {
        if (document.querySelector('.admin-chat-widget')) return;

        const panel = document.createElement('div');
        panel.className = 'admin-chat-widget';
        panel.innerHTML =
            '<button class="admin-chat-toggle" id="adminChatToggle">' +
                '<svg class="icon" style="width:26px;height:26px;"><use href="#i-chat"/></svg>' +
                '<span class="admin-chat-badge" id="adminBadge" style="display:none">0</span>' +
            '</button>' +
            '<div class="admin-chat-panel" id="adminChatPanel">' +
                '<div class="admin-chat-header">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<svg class="icon"><use href="#i-chat"/></svg>' +
                        '<h4 style="font-size:11px;letter-spacing:1.5px;">SUPPORT CHAT</h4>' +
                    '</div>' +
                    '<button class="admin-chat-close" id="adminChatClose" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(0,0,0,0.2);border:none;border-radius:50%;cursor:pointer;color:inherit;">' +
                        '<svg class="icon icon-xs"><use href="#i-x"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="admin-chat-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;">' +
                    '<div class="admin-chat-list" id="adminUserList" style="flex:1;overflow-y:auto;padding:8px;">' +
                        '<div class="admin-empty-state" style="text-align:center;padding:40px 20px;color:var(--fg-subtle);">' +
                            '<svg class="icon icon-lg" style="display:block;margin:0 auto 12px;opacity:0.4;"><use href="#i-chat"/></svg>' +
                            '<p style="font-size:11px;">No conversations</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="admin-chat-convo" id="adminConvo" style="display:none;flex-direction:column;height:100%;">' +
                        '<div class="admin-convo-header" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--accent-soft);border-bottom:1px solid var(--divider);">' +
                            '<button class="admin-back-btn" id="adminBackBtn" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--card-bg);border:1px solid var(--card-border);color:var(--accent);cursor:pointer;">' +
                                '<svg class="icon icon-xs"><use href="#i-back"/></svg>' +
                            '</button>' +
                            '<span id="adminConvoTitle" style="font-size:11px;font-weight:700;color:var(--accent);flex:1;">Chat</span>' +
                        '</div>' +
                        '<div class="admin-messages" id="adminMessages" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;"></div>' +
                        '<div class="admin-chat-input" style="display:flex;gap:6px;padding:10px;border-top:1px solid var(--divider);background:var(--card-bg);">' +
                            '<input type="text" id="adminChatInput" placeholder="Type reply..." style="flex:1;margin:0;padding:8px 12px;border-radius:20px;background:var(--input-bg);border:1px solid var(--input-border);color:var(--fg);font-family:var(--font-mono);font-size:11px;outline:none;">' +
                            '<button class="admin-send-btn" id="adminSendBtn" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--btn-primary-bg);border:none;color:var(--btn-primary-fg);cursor:pointer;flex-shrink:0;">' +
                                '<svg class="icon" style="width:16px;height:16px;"><use href="#i-send"/></svg>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(panel);

        const style = document.createElement('style');
        style.textContent =
            '.admin-chat-widget{position:fixed;bottom:20px;right:20px;z-index:9000;font-family:var(--font-mono);}' +
            '.admin-chat-toggle{width:56px;height:56px;border-radius:50%;background:var(--btn-primary-bg);border:2px solid var(--accent);color:var(--btn-primary-fg);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px var(--accent-glow);position:relative;transition:transform 0.15s;}' +
            '.admin-chat-toggle:hover{transform:scale(1.06);}' +
            '.admin-chat-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:var(--danger);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg-solid);box-shadow:0 0 10px rgba(255,68,68,0.8);}' +
            '.admin-chat-panel{display:none;position:fixed;bottom:88px;right:20px;width:340px;max-height:500px;height:500px;background:var(--card-bg);border:1px solid var(--accent);border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.45);z-index:8999;flex-direction:column;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:slideUp 0.25s ease;}' +
            '.admin-chat-panel.show{display:flex;}' +
            '.admin-chat-header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--btn-primary-bg);color:var(--btn-primary-fg);}' +
            '.admin-chat-header h4{font-weight:800;text-transform:uppercase;}' +
            '.msg-bubble{max-width:78%;padding:8px 12px;border-radius:12px;font-size:11px;line-height:1.4;word-wrap:break-word;animation:msgSlide 0.2s ease;}' +
            '.msg-bubble.user-msg{align-self:flex-end;background:var(--btn-primary-bg);color:var(--btn-primary-fg);border-bottom-right-radius:4px;font-weight:600;}' +
            '.msg-bubble.admin-msg{align-self:flex-start;background:var(--input-bg);color:var(--fg);border:1px solid var(--input-border);border-bottom-left-radius:4px;}' +
            '.msg-time{font-size:8px;opacity:0.6;margin-top:3px;text-align:right;}' +
            '.admin-user-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.15s;border:1px solid transparent;margin-bottom:4px;}' +
            '.admin-user-item:hover{background:var(--accent-soft);border-color:var(--card-border);}' +
            '.admin-user-item.active{background:var(--accent-soft);border-color:var(--accent);}' +
            '.admin-user-avatar{width:36px;height:36px;border-radius:50%;background:var(--btn-primary-bg);color:var(--btn-primary-fg);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;}' +
            '.admin-user-info{flex:1;min-width:0;}' +
            '.admin-user-name{font-size:11px;font-weight:700;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
            '.admin-user-last{font-size:9px;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}' +
            '.admin-user-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}' +
            '.admin-user-time{font-size:8px;color:var(--fg-subtle);}' +
            '.admin-unread-dot{width:8px;height:8px;border-radius:50%;background:var(--danger);box-shadow:0 0 6px var(--danger);}' +
            '@keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}' +
            '@keyframes msgSlide{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}' +
            '@media(max-width:480px){.admin-chat-panel{width:calc(100vw - 24px);right:12px;bottom:82px;max-height:420px;height:420px;}}';
        document.head.appendChild(style);

        document.getElementById('adminChatToggle').onclick = function() {
            const p = document.getElementById('adminChatPanel');
            p.classList.toggle('show');
            if (p.classList.contains('show')) loadUserList();
        };
        document.getElementById('adminChatClose').onclick = function() {
            document.getElementById('adminChatPanel').classList.remove('show');
        };
        document.getElementById('adminBackBtn').onclick = closeConversation;
        document.getElementById('adminSendBtn').onclick = sendMessage;
        document.getElementById('adminChatInput').onkeypress = function(e) {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        };
    }

    function loadUserList() {
        if (usersListener) db.ref('chats').off('value', usersListener);
        usersListener = db.ref('chats').on('value', function(snap) {
            const list = document.getElementById('adminUserList');
            const convo = document.getElementById('adminConvo');
            if (!list || (convo && convo.style.display !== 'none')) return;

            list.style.display = 'block';
            list.innerHTML = '';

            if (!snap.exists()) {
                list.innerHTML =
                    '<div class="admin-empty-state" style="text-align:center;padding:40px 20px;color:var(--fg-subtle);">' +
                        '<svg class="icon icon-lg" style="display:block;margin:0 auto 12px;opacity:0.4;"><use href="#i-chat"/></svg>' +
                        '<p style="font-size:11px;">No conversations</p>' +
                    '</div>';
                return;
            }

            const chats = snap.val();
            const ids = Object.keys(chats).sort(function(a, b) {
                return (chats[b].lastMessageTime || 0) - (chats[a].lastMessageTime || 0);
            });

            let totalUnread = 0;
            ids.forEach(function(id) {
                const c = chats[id];
                const unread = c.unreadAdmin || 0;
                totalUnread += unread;
                const time = c.lastMessageTime ? formatTime(c.lastMessageTime) : '';

                const div = document.createElement('div');
                div.className = 'admin-user-item' + (activeChatId === id ? ' active' : '');
                div.innerHTML =
                    '<div class="admin-user-avatar">' + id.slice(-2) + '</div>' +
                    '<div class="admin-user-info">' +
                        '<div class="admin-user-name">' + id + '</div>' +
                        '<div class="admin-user-last">' + (c.lastMessage ? truncateText(c.lastMessage, 22) : 'No messages') + '</div>' +
                    '</div>' +
                    '<div class="admin-user-meta">' +
                        '<div class="admin-user-time">' + time + '</div>' +
                        (unread > 0 ? '<div class="admin-unread-dot"></div>' : '') +
                    '</div>';
                div.onclick = function() { openConversation(id); };
                list.appendChild(div);
            });

            updateBadge(totalUnread);
        });
    }

    function openConversation(id) {
        activeChatId = id;
        document.getElementById('adminUserList').style.display = 'none';
        const convo = document.getElementById('adminConvo');
        convo.style.display = 'flex';
        document.getElementById('adminConvoTitle').textContent = id;
        document.getElementById('adminMessages').innerHTML = '';
        currentMessages = {};

        if (messagesListener) db.ref('chats/' + id + '/messages').off('child_added', messagesListener);
        messagesListener = db.ref('chats/' + id + '/messages').orderByChild('timestamp').on('child_added', function(snap) {
            const msg = snap.val();
            if (currentMessages[snap.key]) return;
            currentMessages[snap.key] = true;
            displayMessage(msg);
        });

        db.ref('chats/' + id).update({ unreadAdmin: 0 });
    }

    function closeConversation() {
        if (messagesListener && activeChatId) {
            db.ref('chats/' + activeChatId + '/messages').off('child_added', messagesListener);
            messagesListener = null;
        }
        activeChatId = null;
        currentMessages = {};
        document.getElementById('adminConvo').style.display = 'none';
        document.getElementById('adminUserList').style.display = 'block';
        loadUserList();
    }

    function displayMessage(msg) {
        const container = document.getElementById('adminMessages');
        if (!container) return;
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
        const el = document.createElement('div');
        el.className = 'msg-bubble ' + (msg.sender === 'admin' ? 'user-msg' : 'admin-msg');
        el.innerHTML = escapeHtml(msg.text) + '<div class="msg-time">' + (msg.sender === 'admin' ? 'You' : 'User') + ' • ' + time + '</div>';
        container.appendChild(el);
        setTimeout(function() { container.scrollTop = container.scrollHeight; }, 50);
    }

    function sendMessage() {
        if (!activeChatId) return;
        const input = document.getElementById('adminChatInput');
        const text = input.value.trim();
        if (!text) return;

        db.ref('chats/' + activeChatId + '/messages').push({
            text: text,
            sender: 'admin',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        });

        db.ref('chats/' + activeChatId).update({
            lastMessage: text,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            lastSender: 'admin',
            unreadUser: firebase.database.ServerValue.increment(1)
        });

        input.value = '';
    }

    function updateBadge(count) {
        const b = document.getElementById('adminBadge');
        if (!b) return;
        if (count > 0) {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = 'flex';
        } else {
            b.style.display = 'none';
        }
    }

    function formatTime(ts) {
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'now';
        if (m < 60) return m + 'm';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h';
        const d = Math.floor(h / 24);
        if (d < 7) return d + 'd';
        return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    setTimeout(function() {
        createPanel();
        loadUserList();
    }, 1000);
})();

/* ============================================================
   21. INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 C.I.A. Admin v4.0 starting...');

    bindToggles();

    const dev = document.getElementById('devSortBtn');
    const time = document.getElementById('timeSortBtn');
    const del = document.getElementById('deleteModeBtn');
    if (dev) dev.onclick = toggleDevSort;
    if (time) time.onclick = toggleTimeSort;
    if (del) del.onclick = toggleDeleteMode;

    checkGlobalFirewallStatus();
    checkBanProtocolStatus();
    initVerification();
    loadBannedUsers();

    console.log('✅ Admin ready');
});

/* ============================================================
   22. EXPORTS
   ============================================================ */
window.toggleFirewall = toggleFirewall;
window.deploy = deploy;
window.reuseLink = reuseLink;
window.deleteLink = deleteLink;
window.banGhost = banGhost;
window.liftBan = liftBan;
window.deleteSingleUser = deleteSingleUser;
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
window.deleteVerification = deleteVerification;
window.copyPhone = copyPhone;
