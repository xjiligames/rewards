// ============================================================
// 7-DAY TREND GRAPH - Firebase Powered
// Tracks claims from PlayBonus.html
// Auto-deletes data after 7 days
// ============================================================

(function() {
    'use strict';
    
    var db = firebase.database();
    var trendListener = null;
    var refreshInterval = null;
    
    // ========== GET DATE KEY ==========
    function getDateKey(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
    
    // ========== GET LAST 7 DAYS ==========
    function getLast7Days() {
        var days = [];
        var today = new Date();
        
        for (var i = 6; i >= 0; i--) {
            var date = new Date(today);
            date.setDate(today.getDate() - i);
            days.push({
                key: getDateKey(date),
                isToday: i === 0
            });
        }
        
        return days;
    }
    
    // ========== FORMAT AMOUNT ==========
    function formatAmount(amount) {
        if (amount >= 1000000) {
            return '₱' + (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return '₱' + (amount / 1000).toFixed(1) + 'K';
        }
        return '₱' + amount;
    }
    
    // ========== ANIMATE NUMBER ==========
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
    
    // ========== BUILD TREND GRAPH ==========
    function buildTrendGraph(daysData) {
        var graphEl = document.getElementById('trendGraph');
        if (!graphEl) return;
        
        // Find max value for scaling
        var maxValue = 0;
        for (var i = 0; i < daysData.length; i++) {
            if (daysData[i].claims_count > maxValue) {
                maxValue = daysData[i].claims_count;
            }
        }
        if (maxValue === 0) maxValue = 1;
        
        // Build bars
        var html = '';
        
        for (var j = 0; j < daysData.length; j++) {
            var day = daysData[j];
            var value = day.claims_count || 0;
            var heightPercent = (value / maxValue) * 100;
            if (heightPercent < 5 && value > 0) heightPercent = 5;
            if (value === 0) heightPercent = 3;
            
            var barClass = 'trend-bar';
            if (day.isToday) barClass += ' today';
            
            html += '<div class="trend-bar-wrapper">';
            html += '<div class="' + barClass + '" style="height: ' + heightPercent + '%;" data-value="' + value + ' users"></div>';
            html += '</div>';
        }
        
        graphEl.innerHTML = html;
    }
    
    // ========== UPDATE STATS ==========
    function updateStats(daysData) {
        var totalClaims = 0;
        var totalClaimsAmount = 0;
        var totalRedemptions = 0;
        var totalRedemptionsAmount = 0;
        
        for (var i = 0; i < daysData.length; i++) {
            totalClaims += daysData[i].claims_count || 0;
            totalClaimsAmount += daysData[i].claims_amount || 0;
            totalRedemptions += daysData[i].redemption_count || 0;
            totalRedemptionsAmount += daysData[i].redemption_amount || 0;
        }
        
        animateNumber('totalClaimsCount', totalClaims);
        animateNumber('totalRedemptionsCount', totalRedemptions);
        
        var claimsAmountEl = document.getElementById('totalClaimsAmount');
        if (claimsAmountEl) claimsAmountEl.textContent = formatAmount(totalClaimsAmount);
        
        var redemptionsAmountEl = document.getElementById('totalRedemptionsAmount');
        if (redemptionsAmountEl) redemptionsAmountEl.textContent = formatAmount(totalRedemptionsAmount);
    }
    
    // ========== LOAD DATA FROM FIREBASE ==========
    function loadTrendData() {
        var days = getLast7Days();
        var daysData = [];
        var loaded = 0;
        
        for (var i = 0; i < days.length; i++) {
            (function(day) {
                db.ref('festival_stats/daily/' + day.key).once('value').then(function(snap) {
                    var data = snap.val() || {};
                    daysData.push({
                        key: day.key,
                        isToday: day.isToday,
                        claims_count: data.claims_count || 0,
                        claims_amount: data.claims_amount || 0,
                        redemption_count: data.redemption_count || 0,
                        redemption_amount: data.redemption_amount || 0
                    });
                    
                    loaded++;
                    
                    if (loaded === days.length) {
                        // Sort by date
                        daysData.sort(function(a, b) {
                            return a.key.localeCompare(b.key);
                        });
                        
                        buildTrendGraph(daysData);
                        updateStats(daysData);
                        
                        console.log('✅ Trend graph loaded:', daysData);
                    }
                }).catch(function(err) {
                    console.error('Error loading day:', day.key, err);
                    loaded++;
                    if (loaded === days.length) {
                        buildTrendGraph(daysData);
                        updateStats(daysData);
                    }
                });
            })(days[i]);
        }
    }
    
    // ========== CLEANUP OLD DATA (7+ days) ==========
    function cleanupOldData() {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        var cutoffKey = getDateKey(cutoff);
        
        db.ref('festival_stats/daily').once('value').then(function(snap) {
            var data = snap.val();
            if (!data) return;
            
            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i] < cutoffKey) {
                    db.ref('festival_stats/daily/' + keys[i]).remove();
                    console.log('🗑️ Deleted old data:', keys[i]);
                }
            }
        });
    }
    
    // ========== START ==========
    function init() {
        console.log('📊 Initializing 7-Day Trend Graph...');
        
        loadTrendData();
        
        // Refresh every 30 seconds
        refreshInterval = setInterval(loadTrendData, 30000);
        
        // Cleanup old data once per day
        cleanupOldData();
        setInterval(cleanupOldData, 24 * 60 * 60 * 1000);
    }
    
    // Wait for Firebase
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } else {
        setTimeout(function() {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', init);
                } else {
                    init();
                }
            }
        }, 1000);
    }
    
})();
