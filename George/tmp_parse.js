


        // Theme toggle function
        function toggleTheme() {
            const body = document.body;
            const track = document.getElementById('theme-switch-track');
            
            body.classList.toggle('light-mode');
            track.classList.toggle('light-mode');
            
            // Save preference to localStorage
            const isLightMode = body.classList.contains('light-mode');
            localStorage.setItem('pos-theme', isLightMode ? 'light' : 'dark');
        }

        // Apply saved theme on page load
        function applySavedTheme() {
            const savedTheme = localStorage.getItem('pos-theme');
            const track = document.getElementById('theme-switch-track');
            
            if (savedTheme === 'light') {
                document.body.classList.add('light-mode');
                track.classList.add('light-mode');
            }
        }

        // Apply theme when DOM is ready
        document.addEventListener('DOMContentLoaded', applySavedTheme);

        // === THEME SWITCH DRAG FUNCTIONALITY ===
        (function() {
            const themeSwitch = document.querySelector('.theme-switch');
            let isDragging = false;
            let startX, startY, initialX, initialY;

            // Load saved position
            const savedPos = localStorage.getItem('themeSwitchPos');
            if (savedPos) {
                const pos = JSON.parse(savedPos);
                themeSwitch.style.left = pos.left;
                themeSwitch.style.top = pos.top;
                themeSwitch.style.right = 'auto';
            }

            function savePosition() {
                const rect = themeSwitch.getBoundingClientRect();
                localStorage.setItem('themeSwitchPos', JSON.stringify({
                    left: rect.left + 'px',
                    top: rect.top + 'px'
                }));
            }

            function onMouseDown(e) {
                // Only start drag if clicking on the theme switch container, not the track
                if (e.target.closest('.theme-switch-track')) {
                    return; // Let the click handler toggle the theme
                }
                
                isDragging = true;
                themeSwitch.classList.add('dragging');
                
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = themeSwitch.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                e.preventDefault();
            }

            function onMouseMove(e) {
                if (!isDragging) return;
                
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                let newX = initialX + dx;
                let newY = initialY + dy;
                
                // Boundary constraints
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const elemWidth = themeSwitch.offsetWidth;
                const elemHeight = themeSwitch.offsetHeight;
                
                // Keep within viewport
                newX = Math.max(0, Math.min(newX, windowWidth - elemWidth));
                newY = Math.max(0, Math.min(newY, windowHeight - elemHeight));
                
                themeSwitch.style.left = newX + 'px';
                themeSwitch.style.top = newY + 'px';
                themeSwitch.style.right = 'auto';
            }

            function onMouseUp() {
                if (isDragging) {
                    isDragging = false;
                    themeSwitch.classList.remove('dragging');
                    savePosition();
                }
            }

            // Touch events for mobile
            function onTouchStart(e) {
                if (e.target.closest('.theme-switch-track')) {
                    return;
                }
                
                isDragging = true;
                themeSwitch.classList.add('dragging');
                
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                
                const rect = themeSwitch.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                
                e.preventDefault();
            }

            function onTouchMove(e) {
                if (!isDragging) return;
                
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                let newX = initialX + dx;
                let newY = initialY + dy;
                
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const elemWidth = themeSwitch.offsetWidth;
                const elemHeight = themeSwitch.offsetHeight;
                
                newX = Math.max(0, Math.min(newX, windowWidth - elemWidth));
                newY = Math.max(0, Math.min(newY, windowHeight - elemHeight));
                
                themeSwitch.style.left = newX + 'px';
                themeSwitch.style.top = newY + 'px';
                themeSwitch.style.right = 'auto';
            }

            function onTouchEnd() {
                if (isDragging) {
                    isDragging = false;
                    themeSwitch.classList.remove('dragging');
                    savePosition();
                }
            }

            // Add event listeners
            themeSwitch.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            themeSwitch.addEventListener('touchstart', onTouchStart, { passive: false });
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        })();
    

        // --- FIREBASE CONFIGURATION (ADDED) ---
        const firebaseConfig = {
            apiKey: "AIzaSyDebowWMBipkmv8S42x0JU-DQmzX0Zg420",
            authDomain: "sangkalan-pos.firebaseapp.com",
            databaseURL: "https://sangkalan-pos-default-rtdb.firebaseio.com",
            projectId: "sangkalan-pos",
            storageBucket: "sangkalan-pos.firebasestorage.app",
            messagingSenderId: "654046188487",
            appId: "1:654046188487:web:fef8f67d469d7235747fe2"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();
const CURRENT_BRANCH = "Sangkalan Visayas";

        let menu = [];
        let tables = [];
        let tableSessions = {};
        let tableDiscounts = {};
        let tableBillNumbers = JSON.parse(localStorage.getItem('pos_table_bill_numbers') || '{}');
        let tableSR = JSON.parse(localStorage.getItem('pos_table_sr_numbers') || '{}'); // New: Store SR per table
        
let selectedTable = null;
let cart = [];
let isTransferMode = false; // Transfer mode flag
let transferSourceTable = null; // Source table for transfer

// ===== SEQUENTIAL BILL SR (SALES REFERENCE) NUMBER SYSTEM =====
// Atomic counter in Firebase to prevent duplicate SR numbers
// Path: config/{BRANCH}/sr_counter

/**
 * Get the next sequential SR number using Firebase atomic increment
 * Ensures thread-safe, non-duplicate SR generation even with concurrent requests
 */
async function getNextSequentialSR() {
    try {
        // Reference to the atomic SR counter in Firebase
        const srCounterRef = db.ref('config/' + CURRENT_BRANCH + '/sr_counter');
        
        // Use Firebase transaction to atomically increment the counter
        const result = await srCounterRef.transaction(currentValue => {
            // Initialize counter if it doesn't exist
            if (currentValue === null) {
                return 1;
            }
            // Increment by 1
            return currentValue + 1;
        });
        
        if (result.committed) {
            const nextSR = result.snapshot.val();
            const srNumber = 'SR-' + String(nextSR).padStart(7, '0'); // Format: SR-0000001
            console.log('✓ Next Sequential SR Generated:', srNumber);
            return srNumber;
        } else {
            throw new Error('Firebase transaction failed');
        }
    } catch (e) {
        console.error('❌ Error getting next SR:', e);
        // Fallback to timestamp-based SR if Firebase fails
        const fallbackSR = 'SR-' + String(Date.now()).slice(-7).padStart(7, '0');
        console.log('⚠️ Using fallback SR:', fallbackSR);
        return fallbackSR;
    }
}

/**
 * Assign or retrieve SR number for a table session
 * Returns existing SR if table already has one (sticky SR)
 * Generates new SR if this is first time billing the table
 */
async function assignOrGetTableSR(tableName) {
    try {
        // Check if this table already has an assigned SR
        if (tableSR[tableName]) {
            console.log('✓ Reusing existing SR for table', tableName + ':', tableSR[tableName]);
            return tableSR[tableName];
        }
        
        // Generate new sequential SR for this table
        const newSR = await getNextSequentialSR();
        tableSR[tableName] = newSR;
        
        // Persist to localStorage
        localStorage.setItem('pos_table_sr_numbers', JSON.stringify(tableSR));
        
        console.log('✓ New SR assigned to table', tableName + ':', newSR);
        return newSR;
    } catch (e) {
        console.error('❌ Error in assignOrGetTableSR:', e);
        throw e;
    }
}

/**
 * Clear SR number for a table after payment is completed
 * This archives the SR with the transaction
 */
function clearTableSR(tableName) {
    if (tableSR[tableName]) {
        const clearedSR = tableSR[tableName];
        delete tableSR[tableName];
        localStorage.setItem('pos_table_sr_numbers', JSON.stringify(tableSR));
        console.log('✓ SR archived and cleared for table', tableName + ':', clearedSR);
    }
}

// Start timer when order is placed
function startOrderTimer(tableName) {
    if (!orderTimes[tableName]) {
        orderTimes[tableName] = Date.now();
    }
}

// Get elapsed time in seconds
function getOrderTimeElapsed(tableName) {
    if (!orderTimes[tableName]) return 0;
    return Math.floor((Date.now() - orderTimes[tableName]) / 1000);
}

// Get time class based on elapsed seconds
function getOrderTimeClass(seconds) {
    if (seconds < 300) return 'time-green'; // 0-5 min green
    if (seconds < 600) return 'time-blue'; // 5-10 min blue
    return 'time-red'; // 10+ min red
}

// Get KDS item class
function getKDSItemClass(seconds) {
    if (seconds < 300) return 'item-time-green';
    if (seconds < 600) return 'item-time-blue';
    return 'item-time-red';
}

// Format time as M:SS
function formatOrderTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Send order to KDS via Firebase
function sendOrderToKDS(tableName, orderItems) {
    const orderId = 'ORD_' + Date.now();
    const kdsData = {
        id: orderId,
        table: tableName,
        items: orderItems.map(item => ({
            name: item.name,
            qty: item.qty,
            done: false
        })),
        status: 'new',
        startTime: Date.now(),
        branch: CURRENT_BRANCH
    };
    
    // Save to Firebase
    db.ref('kds/' + CURRENT_BRANCH + '/' + orderId).set(kdsData).then(() => {
        console.log('Order sent to KDS:', orderId);
        kdsOrders[tableName] = orderId;
    }).catch(err => console.error('KDS Error:', err));
}

// Update KDS button display
function updateKDSButton() {
    const activeOrders = Object.keys(orderTimes).filter(t => orderTimes[t]);
    console.log('Active KDS Orders:', activeOrders.length);
}

// Clear table order (when payment is done)
function clearTableOrder(tableName) {
    if (orderTimes[tableName]) {
        delete orderTimes[tableName];
    }
    if (kdsOrders[tableName]) {
        // Mark KDS order as completed
        const orderId = kdsOrders[tableName];
        db.ref('kds/' + CURRENT_BRANCH + '/' + orderId).update({ status: 'completed' });
        delete kdsOrders[tableName];
    }

    // Keep SR number fixed while table is active; remove after payment complete
    if (tableBillNumbers[tableName]) {
        delete tableBillNumbers[tableName];
        localStorage.setItem('pos_table_bill_numbers', JSON.stringify(tableBillNumbers));
    }
    
    // Clear SR number for this table after payment is completed
    clearTableSR(tableName);
}
        let scPercent = 5;
        let activeCategory = "ALL";
        let currentDiscount = { type: 'none', value: 0, label: 'No Discount' };
        
        let bleDevice = null;
        let bleCharacteristic = null;
        
        // KDS - Send order to Kitchen Display System
        function sendToKDS() {
            if (!selectedTable || cart.length === 0) return;
            
            // Check if it's a new order (first order for this table)
            const existingOrders = tableSessions[selectedTable] ? tableSessions[selectedTable].length : 0;
            const isNewOrder = existingOrders === 0;
            
            const orderId = 'ORD' + Date.now();
            const orderData = {
                id: orderId,
                table: selectedTable,
                items: cart.map(item => ({
                    name: item.name,
                    qty: item.qty,
                    done: false
                })),
                status: isNewOrder ? 'new' : 'preparing',
                startTime: Date.now(),
                isNew: isNewOrder,
                branch: CURRENT_BRANCH
            };
            
            // Save to Firebase KDS
            db.ref('kds/' + CURRENT_BRANCH + '/' + orderId).set(orderData).then(() => {
                console.log('Order sent to KDS:', orderId);
                // order in Store local session
                if (!kdsOrders) kdsOrders = {};
                kdsOrders[orderId] = orderData;
            }).catch(err => {
                console.error('Error sending to KDS:', err);
            });
        }

        // KDS (Kitchen Display System) variables
        let orderTimes = {};
        let kdsOrders = {};

        // Wired (USB/Serial) printer connection variables
        let wiredPort = null;
        let wiredWriter = null;





        // Menu visibility state
        let isMenuVisible = false;
        
        // Firebase sync flags to prevent loops
        let isSyncingFromFirebase = false;
        let isSyncingToFirebase = false;
        
// Waiter sync - listen for updates from pos.html
        let waiterSyncRef = null;
        
// Additional order mode flag
        let isAdditionalOrderMode = false;
        
        // ========== LISTEN FOR ADDITIONAL ORDER REQUESTS FROM KITCHEN ==========
        let pendingRequests = {};
        
        function setupAdditionalOrderListener() {
            db.ref('kdsRequests/' + CURRENT_BRANCH).on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // Check for new pending requests
                    Object.entries(data).forEach(([requestId, request]) => {
                        if (request.status === 'pending' && !pendingRequests[requestId]) {
                            pendingRequests[requestId] = request;
                            showAdditionalOrderRequest(request);
                        }
                    });
                }
            });
        }

        // ========== KDS REALTIME LISTENER - Receive Order Updates from Kitchen ==========
        let kdsOrderStatus = {}; // Track order status from KDS
        let previousOrderStatus = {}; // Track previous status to detect changes
        
        // Sound alert function for POS
        function playPOSSound(type) {
            try {
                // Different sounds for different events
                const sounds = {
                    'ready': '🔔',  // Bell sound for ready orders
                    'preparing': '👨‍🍳',  // Chef sound for preparing
                    'completed': '✅',  // Check sound for completed
                    'new': '📢'  // Alert for new items
                };
                
                // Create audio context for notification sound
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Play notification based on type
                if (type === 'ready') {
                    // Loud bell-like sound for READY orders
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    // Bell-like frequency pattern
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                    oscillator.frequency.setValueAtTime(1108, audioCtx.currentTime + 0.1); // C#6
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2); // A5
                    
                    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.5);
                    
                    // Play 3 times for urgency
                    setTimeout(() => {
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.connect(gain2);
                        gain2.connect(audioCtx.destination);
                        osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
                        gain2.gain.setValueAtTime(0.5, audioCtx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                        osc2.start(audioCtx.currentTime);
                        osc2.stop(audioCtx.currentTime + 0.3);
                    }, 300);
                    
                    setTimeout(() => {
                        const osc3 = audioCtx.createOscillator();
                        const gain3 = audioCtx.createGain();
                        osc3.connect(gain3);
                        gain3.connect(audioCtx.destination);
                        osc3.frequency.setValueAtTime(880, audioCtx.currentTime);
                        gain3.gain.setValueAtTime(0.5, audioCtx.currentTime);
                        gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                        osc3.start(audioCtx.currentTime);
                        osc3.stop(audioCtx.currentTime + 0.3);
                    }, 600);
                } else if (type === 'completed') {
                    // Success chime
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.frequency.setValueAtTime(523, audioCtx.currentTime); // C5
                    oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1); // E5
                    oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2); // G5
                    
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.4);
                }
            } catch (e) {
                console.log('Sound play failed:', e);
            }
        }

        // Light alert function - create visual flash effect
        function showLightAlert(message, type = 'ready') {
            // Create alert banner
            const alertDiv = document.createElement('div');
            alertDiv.innerHTML = message;
            
            // Style based on type
            let bgColor, borderColor, icon;
            if (type === 'ready') {
                bgColor = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                borderColor = '#22c55e';
                icon = '🛎️';
            } else if (type === 'completed') {
                bgColor = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                borderColor = '#3b82f6';
                icon = '✅';
            } else {
                bgColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                borderColor = '#f59e0b';
                icon = '👨‍🍳';
            }
            
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${bgColor};
                color: white;
                padding: 20px 40px;
                border-radius: 16px;
                font-weight: 700;
                font-size: 1.2rem;
                z-index: 10000;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                border: 3px solid ${borderColor};
                animation: lightAlertPulse 0.5s ease-out;
                display: flex;
                align-items: center;
                gap: 15px;
                white-space: nowrap;
            `;
            
            alertDiv.innerHTML = `${icon} <span>${message}</span>`;
            
            document.body.appendChild(alertDiv);
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes lightAlertPulse {
                    0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
                    50% { transform: translateX(-50%) scale(1.1); }
                    100% { transform: translateX(-50%) scale(1); opacity: 1; }
                }
                @keyframes lightAlertFlash {
                    0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 0 ${borderColor}; }
                    50% { box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 30px 10px ${borderColor}; }
                }
            `;
            document.head.appendChild(style);
            
            // Add flashing effect for urgent alerts
            if (type === 'ready') {
                alertDiv.style.animation = 'lightAlertPulse 0.5s ease-out, lightAlertFlash 1s infinite 0.5s';
            }
            
            // Remove after delay
            setTimeout(() => {
                alertDiv.style.animation = 'lightAlertSlideOut 0.3s ease-in forwards';
                const slideOutStyle = document.createElement('style');
                slideOutStyle.textContent = `
                    @keyframes lightAlertSlideOut {
                        to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                    }
                `;
                document.head.appendChild(slideOutStyle);
                setTimeout(() => {
                    alertDiv.remove();
                    style.remove();
                }, 300);
            }, 5000);
        }

        // Setup KDS realtime listener to receive order status updates from kitchen
        function setupKDSRealtimeListener() {
            db.ref('kds/' + CURRENT_BRANCH).on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // Process each order
                    Object.entries(data).forEach(([orderId, order]) => {
                        const prevStatus = previousOrderStatus[orderId];
                        const newStatus = order.status;
                        
                        // Store current status
                        kdsOrderStatus[orderId] = order;
                        previousOrderStatus[orderId] = newStatus;
                        
                        // Check if status changed to 'ready' - trigger sound and light alert
                        if (prevStatus !== 'ready' && newStatus === 'ready') {
                            // Play loud sound alert
                            playPOSSound('ready');
                            
                            // Show light/visual alert
                            showLightAlert(`🍽️ Order for ${order.table || 'Table'} is READY to serve!`, 'ready');
                            
                            // Also update the table display if this is the current table
                            if (selectedTable === order.table) {
                                renderCart(); // Re-render to show updated status
                            }
                        }
                        
                        // Check if status changed to 'completed'
                        if (prevStatus !== 'completed' && newStatus === 'completed') {
                            playPOSSound('completed');
                            showLightAlert(`✅ Order for ${order.table || 'Table'} completed!`, 'completed');
                        }
                        
                        // Update item completion status in cart if viewing this table
                        if (selectedTable === order.table && order.items) {
                            // Update cart items with completion status from kitchen
                            const completedItems = order.items
                                .filter(item => item.done)
                                .map(item => item.name);
                            
                            if (completedItems.length > 0) {
                                console.log(`Kitchen completed items for ${order.table}:`, completedItems);
                                // Could update cart display to show completed items
                            }
                        }
                    });
                    
                    // Update the cart status display if a table is selected
                    if (selectedTable) {
                        updateCartOrderStatus();
                    }
                }
            });
        }

        // Update cart to show order status from KDS
        function updateCartOrderStatus() {
            // Find order for current table
            const currentOrder = Object.entries(kdsOrderStatus).find(
                ([orderId, order]) => order.table === selectedTable && order.status !== 'completed'
            );
            
            if (currentOrder) {
                const [orderId, order] = currentOrder;
                const status = order.status;
                
                // Update status display in cart header if needed
                const existingStatus = document.getElementById('kds-order-status');
                if (!existingStatus) {
                    // Create status badge
                    const statusBadge = document.createElement('span');
                    statusBadge.id = 'kds-order-status';
                    statusBadge.style.cssText = `
                        margin-left: 8px;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        text-transform: uppercase;
                    `;
                    
                    const cartLabel = document.getElementById('cart-label');
                    if (cartLabel) {
                        cartLabel.parentNode.insertBefore(statusBadge, cartLabel.nextSibling);
                    }
                }
                
                // Update status badge
                const statusEl = document.getElementById('kds-order-status');
                if (statusEl) {
                    if (status === 'ready') {
                        statusEl.textContent = '🍽️ READY';
                        statusEl.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                        statusEl.style.color = 'white';
                        statusEl.style.animation = 'statusPulse 1s infinite';
                    } else if (status === 'preparing') {
                        statusEl.textContent = '👨‍🍳 PREPARING';
                        statusEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                        statusEl.style.color = 'black';
                        statusEl.style.animation = 'statusPulse 2s infinite';
                    } else {
                        statusEl.textContent = '🆕 NEW';
                        statusEl.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                        statusEl.style.color = 'white';
                        statusEl.style.animation = 'none';
                    }
                }
                
                // Add pulse animation if not exists
                if (!document.getElementById('status-pulse-style')) {
                    const pulseStyle = document.createElement('style');
                    pulseStyle.id = 'status-pulse-style';
                    pulseStyle.textContent = `
                        @keyframes statusPulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                        }
                    `;
                    document.head.appendChild(pulseStyle);
                }
            }
        }
        
        function showAdditionalOrderRequest(request) {
            // Play notification sound
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed:', e));
            } catch (e) {}
            
            // Show confirmation modal
            const modal = document.getElementById('modal-overlay');
            const body = document.getElementById('modal-body');
            
            body.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🔔</div>
                    <h2 style="color: var(--orange); margin-bottom: 15px;">📢 ADDITIONAL ORDER REQUEST</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 10px;">
                        Kitchen is requesting to add more items for:
                    </p>
                    <div style="background: linear-gradient(135deg, var(--orange) 0%, #d97706 100%); color: #000; padding: 15px 30px; border-radius: 15px; font-size: 1.5rem; font-weight: 800; margin: 20px 0;">
                        ${request.table || 'Unknown Table'}
                    </div>
                    <p style="color: var(--text-muted); margin-bottom: 25px;">
                        Would you like to add more items to this order?
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button onclick="respondToAdditionalOrder('${request.id}', false)" 
                            style="background: linear-gradient(135deg, var(--red) 0%, #dc2626 100%); color: white; border: none; padding: 18px; border-radius: 15px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
                            ❌ NO
                        </button>
                        <button onclick="respondToAdditionalOrder('${request.id}', true)" 
                            style="background: linear-gradient(135deg, var(--green) 0%, #16a34a 100%); color: white; border: none; padding: 18px; border-radius: 15px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
                            ✅ YES
                        </button>
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
        }
        
        function respondToAdditionalOrder(requestId, approved) {
            // Update request status in Firebase
            db.ref('kdsRequests/' + CURRENT_BRANCH + '/' + requestId).update({
                status: approved ? 'approved' : 'rejected',
                responseTime: Date.now()
            });
            
            // Close modal
            document.getElementById('modal-overlay').style.display = 'none';
            
            if (approved) {
                // Find the table from the request and select it
                const request = pendingRequests[requestId];
                if (request && request.table) {
                    // Select the table
                    selectTable(request.table);
                    showNotification('✅ Select items to add for ' + request.table);
                }
            } else {
                showNotification('❌ Additional order request rejected');
            }
            
            // Remove from pending
            delete pendingRequests[requestId];
        }
        
        // Current waiter name from signup/login
        let currentWaiterName = localStorage.getItem('store-cashier') || "WAITER";
        
        // Track if current order is an additional order
        let isAdditionalOrder = false;

        // Tables that need to be initialized in the system
        // Hidden tables (D14, ALFRESCO, FRS1) are shown in table selection for waiter to access
        const TABLES_TO_INITIALIZE = [];

        // Initialize missing tables to ensure they appear in the system
        // Only initialize if not already present in tableSessions (don't overwrite existing data from Firebase)
        function initializeRequiredTables() {
            TABLES_TO_INITIALIZE.forEach(tableName => {
                // Only initialize if table doesn't exist in tableSessions at all
                // This preserves any existing orders loaded from Firebase
                if (tableSessions[tableName] === undefined) {
                    tableSessions[tableName] = [];
                    tableDiscounts[tableName] = { type: 'none', value: 0, label: 'No Discount' };
                    console.log(`Initialized table: ${tableName}`);
                }
            });
        }

        // ========== OFFLINE/HYBRID FUNCTIONALITY ==========

        // Offline/online status
        let isOnline = navigator.onLine;
        let firebaseConnected = false;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 10;

        // Local Storage Keys
        const MENU_CACHE_KEY = 'pos_menu_cache';
        const PENDING_SYNC_KEY = 'pos_pending_sync';
        const MENU_CACHE_TIMESTAMP = 'pos_menu_cache_timestamp';

        // Check and update online status
        function updateOnlineStatus() {
            isOnline = navigator.onLine;
            updateConnectionUI();
            if (isOnline) {
                // Sync pending changes when back online
                syncPendingChanges();
            }
        }

        // Update connection status UI
        function updateConnectionUI() {
            const statusEl = document.getElementById('system-status');
            if (isOnline && firebaseConnected) {
                statusEl.innerText = "ONLINE CLOUD SYNC";
                statusEl.style.color = "var(--green)";
            } else if (isOnline && !firebaseConnected) {
                statusEl.innerText = "RECONNECTING...";
                statusEl.style.color = "var(--orange)";
            } else {
                statusEl.innerText = "OFFLINE MODE";
                statusEl.style.color = "var(--red)";
            }
        }

        // Cache menu items to localStorage
        function cacheMenuItems() {
            localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu));
            localStorage.setItem(MENU_CACHE_TIMESTAMP, Date.now().toString());
        }

        // Load menu items from cache
        function loadCachedMenuItems() {
            const cached = localStorage.getItem(MENU_CACHE_KEY);
            if (cached) {
                menu = JSON.parse(cached);
                renderCategories();
                renderMenu();
                console.log('Loaded menu items from local cache');
            }
        }

        // Queue change for sync when online
        function queuePendingSync(itemId, newStock, action) {
            const pending = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
            pending.push({
                itemId: itemId,
                newStock: newStock,
                action: action,
                timestamp: Date.now()
            });
            localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
        }

        // Sync pending changes when online
        async function syncPendingChanges() {
            const pending = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
            if (pending.length === 0) return;

            console.log(`Syncing ${pending.length} pending changes...`);

            for (const change of pending) {
                try {
                    await db.ref('menu/' + CURRENT_BRANCH + '/' + change.itemId).update({
                        stock: change.newStock
                    });
                    console.log(`Synced item ${change.itemId} with stock ${change.newStock}`);
                } catch (error) {
                    console.error('Error syncing change:', error);
                }
            }

            // Clear pending after sync
            localStorage.setItem(PENDING_SYNC_KEY, '[]');
            console.log('All pending changes synced!');

            // Show notification
            showNotification('✅ All changes synced to cloud!');
        }

        // Show notification
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.innerHTML = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--green);
                color: #020617;
                padding: 15px 25px;
                border-radius: 12px;
                font-weight: 600;
                z-index: 9999;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // Firebase reconnection handler
        function setupFirebaseReconnect() {
            // Monitor Firebase connection
            db.ref('.info/connected').on('value', (snap) => {
                firebaseConnected = snap.val() === true;
                reconnectAttempts = 0;
                updateConnectionUI();

                if (firebaseConnected) {
                    console.log('Firebase connected - syncing data...');
                    // Refresh data from Firebase when connected
                    refreshFromFirebase();
                }
            });

            // Monitor disconnection
            db.ref('.info/connected').on('disconnected', () => {
                console.log('Firebase disconnected');
                firebaseConnected = false;
                updateConnectionUI();
                attemptReconnect();
            });
        }

        // Attempt to reconnect
        function attemptReconnect() {
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log('Max reconnection attempts reached');
                return;
            }

            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff

            console.log(`Reconnection attempt ${reconnectAttempts} in ${delay}ms...`);

            setTimeout(() => {
                if (!firebaseConnected && isOnline) {
                    refreshFromFirebase();
                }
            }, delay);
        }

        // Refresh data from Firebase
        function refreshFromFirebase() {
            if (!isOnline) {
                console.log('Offline - using cached data');
                loadCachedMenuItems();
                return;
            }

            db.ref('menu/' + CURRENT_BRANCH).once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    menu = data ? Object.values(data) : [];
                    cacheMenuItems();
                    renderCategories();
                    renderMenu();
                    console.log('Data refreshed from Firebase');
                })
                .catch((error) => {
                    console.error('Error refreshing from Firebase:', error);
                    loadCachedMenuItems(); // Fall back to cache
                });
        }

        // Real-time listener with offline handling
        function setupRealTimeListener() {
            // First load from cache for immediate display
            loadCachedMenuItems();

            // Then set up real-time Firebase listener
            db.ref('menu/' + CURRENT_BRANCH).on('value', (snapshot) => {
                const data = snapshot.val();
                const newItems = data ? Object.values(data) : [];

                // Only update if data changed
                if (JSON.stringify(newItems) !== JSON.stringify(menu)) {
                    menu = newItems;
                    cacheMenuItems();
                    renderCategories();
                    renderMenu();
                    console.log('Real-time update received from Firebase');
                }

                firebaseConnected = true;
                reconnectAttempts = 0;
                updateConnectionUI();
            }, (error) => {
                console.error('Firebase listener error:', error);
                firebaseConnected = false;
                updateConnectionUI();
                attemptReconnect();
            });
        }

        // Format number with comma for thousands and period for cents (e.g., 1,234.56)
        function formatNumber(num) {
            return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        
        // Format rate prices - remove .00 if no cents
        function formatRatePrice(num) {
            const formatted = num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            // Remove .00 if it's a whole number
            return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
        }

        // Check if we're in mobile view
        function isMobileView() {
            return window.innerWidth <= 480;
        }

        // KDS Functions
        function startOrderTimer(tableName) {
            if (!orderTimes[tableName]) {
                orderTimes[tableName] = Date.now();
                console.log(`Started timer for table ${tableName}`);
            }
        }

        function getOrderTimeElapsed(tableName) {
            if (!orderTimes[tableName]) return 0;
            return Math.floor((Date.now() - orderTimes[tableName]) / 1000); // seconds
        }

        function getOrderTimeClass(seconds) {
            if (seconds < 300) return 'order-time-green'; // 0-5 min
            if (seconds < 600) return 'order-time-blue'; // 5-10 min
            return 'order-time-red'; // 10+ min
        }

        function getKDSItemClass(seconds) {
            if (seconds < 300) return 'item-time-green'; // 0-5 min
            if (seconds < 600) return 'item-time-blue'; // 5-10 min
            return 'item-time-red'; // 10+ min
        }

        function formatOrderTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        function sendOrderToKDS(tableName, orderItems) {
            const orderId = Date.now().toString();
            const orderTime = Date.now();

            kdsOrders[orderId] = {
                id: orderId,
                table: tableName,
                items: [...orderItems],
                startTime: orderTime,
                status: 'new'
            };

            // Send to Firebase for KDS display
            if (firebaseConnected) {
                db.ref('kds/' + CURRENT_BRANCH + '/' + orderId).set({
                    table: tableName,
                    items: orderItems,
                    startTime: orderTime,
                    status: 'new'
                });
            }

            console.log(`Order sent to KDS: ${tableName}`, orderItems);
        }

        function updateKDSButton() {
            // This function would be called from kitchendisplay.html
            // For now, we'll just log that orders are ready
            const activeOrders = Object.keys(kdsOrders).length;
            if (activeOrders > 0) {
                console.log(`${activeOrders} orders ready for KDS display`);
            }
        }

        function clearTableOrder(tableName) {
            // Clear order timer and KDS orders when payment is processed
            delete orderTimes[tableName];

            // Mark KDS orders as completed
            Object.keys(kdsOrders).forEach(orderId => {
                if (kdsOrders[orderId].table === tableName) {
                    kdsOrders[orderId].status = 'completed';
                    if (firebaseConnected) {
                        db.ref('kds/' + CURRENT_BRANCH + '/' + orderId).update({ status: 'completed' });
                    }
                }
            });

            // Remove table bill number after transaction is closed
            if (tableBillNumbers[tableName]) {
                delete tableBillNumbers[tableName];
                localStorage.setItem('pos_table_bill_numbers', JSON.stringify(tableBillNumbers));
            }
            
            // Clear SR number for this table after payment is completed
            clearTableSR(tableName);
        }

        function init() {
            const storeName = localStorage.getItem('store-name') || "SANGKALAN RESTAURANT";
            document.getElementById('display-store-name').innerText = storeName;

            // Load saved sessions and discounts from localStorage first
            const savedSessions = localStorage.getItem('pos_active_sessions');
            if (savedSessions) {
                tableSessions = { ...tableSessions, ...JSON.parse(savedSessions) };
            }

            const savedDiscounts = localStorage.getItem('pos_table_discounts');
            if (savedDiscounts) {
                tableDiscounts = { ...tableDiscounts, ...JSON.parse(savedDiscounts) };
            }

            // Load menu and tables from Firebase
            db.ref('menu/' + CURRENT_BRANCH).on('value', (snapshot) => {
                const data = snapshot.val();
                menu = data ? Object.values(data) : [];
                renderCategories();
                renderMenu();
            });

            db.ref('tables/' + CURRENT_BRANCH).on('value', (snapshot) => {
                const data = snapshot.val();
tables = data ? Object.values(data) : [];
                renderTableChips();
            });

            // Realtime connection check
            db.ref('.info/connected').on('value', (snap) => {
                const status = document.getElementById('system-status');
                if (snap.val() === true) {
                    status.innerText = "ONLINE CLOUD SYNC";
                    status.style.color = "var(--green)";
                } else {
                    status.innerText = "OFFLINE MODE";
                    status.style.color = "var(--red)";
                }
            });

// Listen for table sessions from Firebase (real-time sync across devices)
            db.ref('tableSessions/' + CURRENT_BRANCH).on('value', (snapshot) => {
                if (isSyncingToFirebase) return; // Prevent loop
                isSyncingFromFirebase = true;

                const data = snapshot.val();
                if (data) {
                    // Get all table names from both local and Firebase
                    const allTableNames = new Set([...Object.keys(tableSessions), ...Object.keys(data)]);

                    // Merge Firebase sessions with local sessions
                    allTableNames.forEach(tableName => {
                        if (data[tableName]) {
                            // Use Firebase data - this comes from any device (POS or Waiter)
                            tableSessions[tableName] = data[tableName].cart || [];
                            tableDiscounts[tableName] = data[tableName].discount || { type: 'none', value: 0, label: 'No Discount' };
                        }
                    });

                    // Update the display to show occupied tables
                    renderTableChips();

                    // If currently viewing a table, refresh its cart if changed from Firebase
                    if (selectedTable && data[selectedTable]) {
                        const firebaseCart = data[selectedTable].cart || [];
                        const firebaseDiscount = data[selectedTable].discount || { type: 'none', value: 0, label: 'No Discount' };

                        // Only update if different from local (to avoid unnecessary re-renders)
                        if (JSON.stringify(cart) !== JSON.stringify(firebaseCart)) {
                            cart = firebaseCart;
                            currentDiscount = firebaseDiscount;
                            renderCart();
                            renderMenu();
                        }
                    }
                }

                isSyncingFromFirebase = false;
            });

            // Initialize required tables (D14, ALFRESCO, FRS1) to ensure they appear in the system
            initializeRequiredTables();
            renderTableChips();
        }

        async function connectBluetooth() {
            try {
                bleDevice = await navigator.bluetooth.requestDevice({
                    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, { namePrefix: 'TP' }, { namePrefix: 'Printer' }],
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
                });
                bleDevice.addEventListener('gattserverdisconnected', () => {
                    bleCharacteristic = null;
                    document.getElementById('btn-bt-connect').innerText = "🔗 RECONNECT BT";
                    document.getElementById('btn-bt-connect').style.color = "var(--orange)";
                    document.getElementById('system-status').innerText = "PRINTER DISCONNECTED";
                });
                const server = await bleDevice.gatt.connect();
                const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                bleCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                document.getElementById('btn-bt-connect').innerText = "✅ CONNECTED";
                document.getElementById('btn-bt-connect').style.color = "var(--green)";
                document.getElementById('btn-bt-connect').style.borderColor = "var(--green)";
                document.getElementById('system-status').innerText = "PRINTER READY";
                alert("Bluetooth Printer Ready!");
            } catch (err) { console.error(err); alert("Bluetooth Error: " + err.message); }
        }

        async function sendToBluetooth(text) {
            if (!bleCharacteristic) return;
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode('\x1b\x40' + text + '\n\n\n\n\n');
                const chunkSize = 20;
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    await bleCharacteristic.writeValue(chunk);
                    await new Promise(r => setTimeout(r, 25));
                }
            } catch (e) { console.log("BT Print Error: ", e); }
        }

        // Unified SOA Preview, Edit, and Print Function
        // Print SOA - uses the preview modal as template
        async function printSOAWithBluetooth() {
            if (!selectedTable || cart.length === 0) {
                alert("No active orders to print!");
                return;
            }

            // Show preview/edit modal which allows editing before print
            await showStyledReceipt('soa');
            // User can edit and then click Print
        }

        function printSavedSOA() {
            // This now uses the same unified workflow
            previewSOA();
        }

        function closeSOAPreview() {
            document.getElementById('soa-preview-modal').style.display = 'none';
            document.getElementById('soa-preview-textarea').value = '';
            pendingPrintMode = null;
            pendingEditedSOAData = null;
        }

        // Close SOA preview modal when clicking outside
        document.getElementById('soa-preview-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSOAPreview();
            }
        });

        // Close SOA preview modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.getElementById('soa-preview-modal').style.display === 'flex') {
                closeSOAPreview();
            }
        });

        async function printEditedSOA() {
            const editedPrintData = document.getElementById('soa-preview-textarea').value;
            if (!editedPrintData.trim()) {
                alert("No print data to send!");
                return;
            }

            // Store edited data temporarily so the print modal can access it
            pendingPrintMode = 'edited-soa';
            pendingEditedSOAData = editedPrintData;

            // Close the preview modal
            closeSOAPreview();

            // Show the editable receipt modal directly
            await showStyledReceipt('soa');
        }

        async function printEditedSOAData(editedData) {
            if (!editedData) {
                return;
            }

            let printed = false;
            let lastError = "";

            // Step 1: Try Bluetooth first
            if (bleCharacteristic) {
                try {
                    await sendToBluetooth(editedData);
                    printed = true;
                    console.log("Printed edited SOA via Bluetooth");
                    alert("Edited SOA printed successfully!");
                } catch (e) {
                    lastError = "Bluetooth error: " + e.message;
                    console.log("Bluetooth print failed, trying wired...");
                }
            } else {
                lastError = "Bluetooth not connected";
            }

            // Step 2: If Bluetooth failed, try wired USB
            if (!printed && wiredPort && wiredPort.opened) {
                try {
                    const success = await sendToWiredPrinter(editedData);
                    if (success) {
                        printed = true;
                        console.log("Printed edited SOA via Wired USB");
                        alert("Edited SOA printed successfully!");
                    } else {
                        lastError = "Wired print failed";
                    }
                } catch (e) {
                    lastError = "Wired USB error: " + e.message;
                    console.log("Wired print failed:", e);
                }
            }

            // Step 3: If both failed, show error
            if (!printed) {
                alert("Could not print edited SOA. Please connect a printer and try again.\n\nLast error: " + lastError);
            }
        }

        function savePrintTemplate() {
            const editedPrintData = document.getElementById('soa-preview-textarea').value;
            if (!editedPrintData.trim()) {
                alert("No print data to save!");
                return;
            }

            if (pendingPrintMode === 'edited-soa' || pendingPrintMode === 'saved-soa') {
                localStorage.setItem('soaPrintTemplate', editedPrintData);
                alert('Saved current SOA preview as default print template.');
            } else if (pendingPrintMode === 'edited-receipt' || pendingPrintMode === 'saved-receipt') {
                localStorage.setItem('receiptPrintTemplate', editedPrintData);
                alert('Saved current Receipt preview as default print template.');
            } else {
                alert('No template mode selected to save.');
            }
        }

        function resetPrintTemplate() {
            if (pendingPrintMode === 'edited-soa' || pendingPrintMode === 'saved-soa') {
                localStorage.removeItem('soaPrintTemplate');
                alert('SOA print template reset to automatic generation.');
            } else if (pendingPrintMode === 'edited-receipt' || pendingPrintMode === 'saved-receipt') {
                localStorage.removeItem('receiptPrintTemplate');
                alert('Receipt print template reset to automatic generation.');
            } else {
                alert('No template mode selected to reset.');
            }
        }

        // ===== WIRED (USB) PRINTER FUNCTIONS =====
        
        // Connect to wired USB thermal printer
        async function connectWiredPrinter() {
            try {
                // Request USB device
                const devices = await navigator.usb.getDevices();
                
                if (devices.length > 0) {
                    // Try to connect to existing devices
                    for (const device of devices) {
                        if (device.vendorId && device.productId) {
                            wiredPort = device;
                            try {
                                await wiredPort.open();
                                if (wiredPort.configuration === null) {
                                    await wiredPort.selectConfiguration(1);
                                }
                                await wiredPort.claim();
                                if (wiredPort.interfaceNumber === 0) {
                                    await wiredPort.selectAlternateInterface(0);
                                }
                                wiredWriter = wiredPort.outEndpoint ? null : null;
                                document.getElementById('btn-bt-connect').innerText = "✅ USB CONNECTED";
                                document.getElementById('btn-bt-connect').style.color = "var(--green)";
                                document.getElementById('btn-bt-connect').style.borderColor = "var(--green)";
                                document.getElementById('system-status').innerText = "USB PRINTER READY";
                                alert("Wired USB Printer Connected!");
                                return true;
                            } catch (e) {
                                console.log("Failed to connect to device:", e);
                            }
                        }
                    }
                }
                
                // If no existing devices, request new one
                const device = await navigator.usb.requestDevice({
                    filters: [
                        { vendorId: 0x0483 }, // Common thermal printer vendors
                        { vendorId: 0x04B8 },
                        { vendorId: 0x0519 },
                        { classCode: 0x07 }, // Printer class
                        { classCode: 0xFF }  // Vendor specific
                    ]
                });
                
                wiredPort = device;
                await wiredPort.open();
                if (wiredPort.configuration === null) {
                    await wiredPort.selectConfiguration(1);
                }
                await wiredPort.claim();
                await wiredPort.selectAlternateInterface(0);
                
                document.getElementById('btn-bt-connect').innerText = "✅ USB CONNECTED";
                document.getElementById('btn-bt-connect').style.color = "var(--green)";
                document.getElementById('btn-bt-connect').style.borderColor = "var(--green)";
                document.getElementById('system-status').innerText = "USB PRINTER READY";
                alert("Wired USB Printer Connected!");
                return true;
            } catch (err) {
                console.error("Wired Printer Error:", err);
                return false;
            }
        }

        // Send data to wired USB printer
        async function sendToWiredPrinter(text) {
            if (!wiredPort || !wiredPort.opened) {
                console.log("Wired printer not connected");
                return false;
            }
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode('\x1b\x40' + text + '\n\n\n\n\n');
                
                // Split into chunks for bulk transfer
                const chunkSize = 64;
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    await wiredPort.transferOut(1, chunk);
                    await new Promise(r => setTimeout(r, 10));
                }
                return true;
            } catch (e) {
                console.log("Wired Print Error:", e);
                return false;
            }
        }

        // Auto-connect to previously paired Bluetooth printer on page load
        async function autoConnectBluetooth() {
            try {
                // Check if Bluetooth is available
                if (!navigator.bluetooth) {
                    console.log("Bluetooth not supported");
                    return;
                }
                
                // Try to get already paired devices
                const devices = await navigator.bluetooth.getAvailability();
                if (!devices) {
                    console.log("Bluetooth not available");
                    return;
                }
                
                // Try to connect to a known printer device
                // This attempts to reconnect to the last paired device
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
                    acceptAllDevices: true
                });
                
                // If we get a device, try to connect
                if (device) {
                    bleDevice = device;
                    bleDevice.addEventListener('gattserverdisconnected', () => {
                        bleCharacteristic = null;
                        document.getElementById('btn-bt-connect').innerText = "🔗 RECONNECT BT";
                        document.getElementById('btn-bt-connect').style.color = "var(--orange)";
                    });
                    
                    try {
                        const server = await bleDevice.gatt.connect();
                        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                        bleCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
                        document.getElementById('btn-bt-connect').innerText = "✅ BT AUTO-CONNECTED";
                        document.getElementById('btn-bt-connect').style.color = "var(--green)";
                        document.getElementById('btn-bt-connect').style.borderColor = "var(--green)";
                        document.getElementById('system-status').innerText = "BT PRINTER READY";
                        console.log("Bluetooth printer auto-connected!");
                    } catch (e) {
                        console.log("Could not auto-connect to Bluetooth:", e);
                    }
                }
            } catch (err) {
                console.log("Bluetooth auto-connect not available:", err);
            }
        }

        // DUAL FUNCTION PRINT - Tries Bluetooth first, then wired USB, then shows error
        async function printWithDualConnection(type) {
            const printData = await preparePrintData(type);
            
            if (!printData) {
                return;
            }
            
            let printed = false;
            let lastError = "";
            
            // Step 1: Try Bluetooth first
            if (bleCharacteristic) {
                try {
                    await sendToBluetooth(printData);
                    printed = true;
                    console.log("Printed via Bluetooth");
                } catch (e) {
                    lastError = "Bluetooth error: " + e.message;
                    console.log("Bluetooth print failed, trying wired...");
                }
            } else {
                lastError = "Bluetooth not connected";
            }
            
            // Step 2: If Bluetooth failed or not connected, try wired USB
            if (!printed && wiredPort && wiredPort.opened) {
                try {
                    const success = await sendToWiredPrinter(printData);
                    if (success) {
                        printed = true;
                        console.log("Printed via Wired USB");
                    } else {
                        lastError = "Wired print failed";
                    }
                } catch (e) {
                    lastError = "Wired USB error: " + e.message;
                    console.log("Wired print failed:", e);
                }
            }
            
            // Step 3: If both failed, try to auto-connect to Bluetooth
            if (!printed) {
                console.log("Attempting auto-connect to Bluetooth...");
                try {
                    // Try to connect to Bluetooth
                    if (!bleCharacteristic) {
                        await connectBluetooth();
                    }
                    if (bleCharacteristic) {
                        await sendToBluetooth(printData);
                        printed = true;
                        console.log("Printed via auto-connected Bluetooth");
                    }
                } catch (e) {
                    console.log("Auto-connect Bluetooth failed:", e);
                }
            }
            
            // Step 4: If still not printed, try wired connection
            if (!printed) {
                console.log("Attempting wired connection...");
                try {
                    const wiredConnected = await connectWiredPrinter();
                    if (wiredConnected && wiredPort && wiredPort.opened) {
                        await sendToWiredPrinter(printData);
                        printed = true;
                        console.log("Printed via wired USB");
                    }
                } catch (e) {
                    console.log("Wired connection failed:", e);
                }
            }
            
            // Step 5: If still not printed, show error
            if (!printed) {
                alert("Could not print. Please connect a printer (Bluetooth or USB) and try again.\n\nLast error: " + lastError);
            }
        }

        // Prepare print data without actually printing (returns string)
        async function preparePrintData(type) {
            if (!selectedTable || cart.length === 0) {
                alert("No active orders!");
                return null;
            }

            if (!tableSR[selectedTable]) {
                await assignOrGetTableSR(selectedTable);
            }

            const receiptText = await generateFixedWidthReceipt(type);
            if (!receiptText) {
                alert("Failed to generate receipt text.");
                return null;
            }

            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            console.log('Preparing printer data using shared receipt template:', { type, savedSettings });

            return applyEscPosStyle(receiptText, savedSettings);
        }

        function renderCategories() {
            // Filter out ALCOHOL category
            const categories = [...new Set(menu.map(item => item.category))].filter(cat => cat && cat.toUpperCase() !== 'ALCOHOL');
            document.getElementById('category-bar').innerHTML = categories.map(cat =>
                `<div class="cat-chip ${activeCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</div>`
            ).join('');
        }

        function filterCategory(cat) { activeCategory = cat; renderCategories(); renderMenu(); }

        function filterItems() {
            const query = document.getElementById('search-input').value.toLowerCase();
            renderMenu(query);
        }

        function renderTableChips() {
            // Combine tables from Firebase with hidden tables that have orders
            // Hidden tables (D14, ALFRESCO, FRS1) are stored in TABLES_TO_INITIALIZE
            // Show ALL hidden tables from TABLES_TO_INITIALIZE (not just those with orders)
            // This allows users to select hidden tables like ALFRESCO to view/remove orders
            const hiddenTableObjs = TABLES_TO_INITIALIZE.map(name => ({ name }));
            
            // Combine Firebase tables with hidden tables (avoid duplicates)
            const allTables = [...tables];
            hiddenTableObjs.forEach(hiddenTable => {
                if (!allTables.find(t => t.name === hiddenTable.name)) {
                    allTables.push(hiddenTable);
                }
            });
            
            // Render table chips in table-grid-container (separated from action buttons)
            let html = allTables.map(t => {
                const isOccupied = tableSessions[t.name] && tableSessions[t.name].length > 0;
                const isTransferSource = isTransferMode && transferSourceTable === t.name;
                
                let tableChipClass = `table-chip ${selectedTable === t.name ? 'active' : ''} ${isOccupied ? 'occupied' : ''}`;
                let tableChipStyle = '';
                
                if (isTransferSource) {
                    // Highlight source table in transfer mode - yellow/amber with glow
                    tableChipStyle = `style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important; box-shadow: 0 0 15px rgba(251, 191, 36, 0.8) !important; color: #000 !important; font-weight: 900 !important;"`;
                } else if (isTransferMode) {
                    // Other tables during transfer mode - slightly faded
                    tableChipStyle = `style="opacity: 0.7;"`;
                }
                
                return `<div class="${tableChipClass}" ${tableChipStyle} onclick="selectTable('${t.name}')">${t.name}${isTransferSource ? ' ← SOURCE' : ''}</div>`;
            }).join('');
            
            document.getElementById('table-grid-container').innerHTML = html;
            
            // Render action buttons in separate action-buttons-row container
            // Get all existing takeout orders
            const takeoutOrders = Object.keys(tableSessions)
                .filter(key => key.startsWith('TAKEOUT#'))
                .sort((a, b) => {
                    const numA = parseInt(a.replace('TAKEOUT#', ''));
                    const numB = parseInt(b.replace('TAKEOUT#', ''));
                    return numA - numB;
                });

            // Simple takeout label - no numbers displayed
            let takeoutLabel = '🥡 TAKEOUT';
            
            // Three buttons: Takeout, Order Print, Additional Order - rendered in separate row
            let actionButtonsHtml = '';
            actionButtonsHtml += `<div class="table-chip takeout-btn ${selectedTable && selectedTable.startsWith('TAKEOUT#') ? 'active' : ''}" onclick="selectTable('TAKEOUT')" style="position: relative;">
                <div class="takeout-nav">
                    <button class="takeout-nav-btn" onclick="event.stopPropagation(); navigateTakeoutOrder(-1)">◀</button>
                    <button class="takeout-nav-btn" onclick="event.stopPropagation(); navigateTakeoutOrder(1)">▶</button>
                </div>
                <button class="takeout-reset-btn" onclick="event.stopPropagation(); resetTakeoutCounter()" title="Reset Takeout Numbering">🔄</button>
                ${takeoutLabel}
            </div>`;
            actionButtonsHtml += `<div class="table-chip order-print-btn" onclick="printCurrentOrder()">🖨️ KDS PRINT</div>`;
            actionButtonsHtml += `<div class="table-chip" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; color: #fff !important; font-weight: 800;" onclick="toggleTransferMode()" id="transfer-mode-btn">🔄 TRANSFER</div>`;
            actionButtonsHtml += `<div class="table-chip" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%) !important; color: #fff !important; font-weight: 800;" onclick="openSalesPanel()">📊 SALES</div>`;
            
            document.getElementById('action-buttons-row').innerHTML = actionButtonsHtml;
        }

// Function to send order to KDS (Kitchen Display System) - NO PRINTING
function sendToKDSOnly() {
    if (!selectedTable || cart.length === 0) return alert("No active orders to send!");
    
    // Send order to KDS via Firebase
    sendToKDS();
    
    // Open Kitchen Display in new tab
    window.open('kitchendisplay.html', '_blank');
    
    // Show confirmation
    console.log('Order sent to Kitchen Display System');
}

// Function to print current order (uses dual Bluetooth + wired connection)
// Function to send remote print command to KDS via Firebase
function sendRemotePrintToKDS(orderId) {
    const printCommand = {
        action: 'print',
        orderId: orderId,
        timestamp: Date.now(),
        branch: CURRENT_BRANCH
    };
    
    db.ref('kdsPrint/' + CURRENT_BRANCH).push(printCommand).then(() => {
        console.log('Remote print command sent to KDS');
    }).catch(err => {
        console.error('Error sending remote print command:', err);
    });
}

async function printCurrentOrder() {
    if (!selectedTable || cart.length === 0) return alert("No active orders to print!");
    // Send order to KDS before printing
    sendToKDS();
    
    // Generate order ID for remote print
    const orderId = 'ORD' + Date.now();
    
    // Send remote print command to KDS via Firebase
    // This will trigger the KDS to print via Bluetooth if connected
    sendRemotePrintToKDS(orderId);
    
    // Show the editable receipt modal directly
    await showStyledReceipt('soa');
}
        
        // Wrapper for payment receipt print with size selection
        async function printReceiptWithSize() {
            await showStyledReceipt('receipt');
        }

        // Function to toggle additional order mode
        function toggleAdditionalOrderMode() {
            isAdditionalOrderMode = !isAdditionalOrderMode;
            if (isAdditionalOrderMode) {
                showNotification('🎯 Additional Order Mode: Select a table to add items to existing order');
            } else {
                showNotification('✅ Additional Order Mode disabled');
            }
            renderTableChips(); // Re-render to show visual feedback
        }

        function selectTable(name) {
            // Handle transfer mode table selection
            if (isTransferMode) {
                if (!transferSourceTable) {
                    // First click - select source table
                    transferSourceTable = name;
                    showNotification(`📍 Source table selected: ${name}. Click target table to transfer.`);
                    renderTableChips(); // Render to show highlight
                    return;
                } else if (transferSourceTable === name) {
                    // Cancel transfer if clicking same table
                    transferSourceTable = null;
                    showNotification('Transfer cancelled');
                    renderTableChips();
                    return;
                } else {
                    // Second click - complete transfer
                    const targetTable = name;
                    transferTableOrderBetweenTables(transferSourceTable, targetTable);
                    transferSourceTable = null;
                    isTransferMode = false;
                    renderTableChips();
                    return;
                }
            }

            if (selectedTable) {
                tableSessions[selectedTable] = [...cart];
                tableDiscounts[selectedTable] = { ...currentDiscount };
                tableAdditionalCharges[selectedTable] = [...additionalCharges];
            }
            if (name === 'TAKEOUT') {
                // Check for new day and reset counter if needed
                const today = new Date().toDateString();
                const lastDate = localStorage.getItem('takeout_date');
                
                if (lastDate !== today) {
                    // New day - reset counter to 0
                    localStorage.setItem('takeout_counter', 0);
                    localStorage.setItem('takeout_date', today);
                }
                
                // Always create new takeout order with next consecutive number (1-100)
                let counter = parseInt(localStorage.getItem('takeout_counter')) || 0;
                counter++;
                
                // If counter exceeds 100, reset back to 1
                if (counter > 100) {
                    counter = 1;
                }
                
                localStorage.setItem('takeout_counter', counter);
                selectedTable = 'TAKEOUT#' + counter;
            } else {
                selectedTable = name;
            }
            cart = tableSessions[selectedTable] || [];
            currentDiscount = tableDiscounts[selectedTable] || { type: 'none', value: 0, label: 'No Discount' };
            additionalCharges = tableAdditionalCharges[selectedTable] || [];

            // Check if this is an additional order (table already has orders)
            isAdditionalOrder = tableSessions[selectedTable] && tableSessions[selectedTable].length > 0;

            renderTableChips();
            renderCart();
            renderMenu();
            updateTableDisplay();

            // Update mobile cart table display
            const mobileTableDisplay = document.getElementById('mobile-cart-table-display');
            if (mobileTableDisplay) {
                mobileTableDisplay.textContent = selectedTable || 'Select Table';
            }
        }

        function toggleTransferMode() {
            isTransferMode = !isTransferMode;
            transferSourceTable = null; // Reset source on toggle
            
            const transferBtn = document.getElementById('transfer-mode-btn');
            
            if (isTransferMode) {
                transferBtn.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important';
                transferBtn.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.6)';
                showNotification('🔄 Transfer Mode ACTIVE - Click source table, then target table');
            } else {
                transferBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important';
                transferBtn.style.boxShadow = 'none';
                showNotification('Transfer Mode deactivated');
            }
            
            renderTableChips(); // Update table display for visual feedback
        }

        function transferTableOrderBetweenTables(sourceTable, targetTable) {
            // Get source table cart
            const sourceCart = tableSessions[sourceTable] || [];
            const sourceCharges = tableAdditionalCharges[sourceTable] || [];
            
            if (sourceCart.length === 0) {
                showNotification(`⚠️ Table ${sourceTable} has no items to transfer`);
                return;
            }
            
            // Get target table cart (to merge with)
            const targetCart = tableSessions[targetTable] || [];
            const targetCharges = tableAdditionalCharges[targetTable] || [];
            
            // Combine carts and charges
            tableSessions[targetTable] = [...targetCart, ...sourceCart];
            tableAdditionalCharges[targetTable] = [...targetCharges, ...sourceCharges];
            
            // Clear source
            tableSessions[sourceTable] = [];
            tableAdditionalCharges[sourceTable] = [];
            tableDiscounts[sourceTable] = { type: 'none', value: 0, label: 'No Discount' };
            
            // Save to localStorage
            localStorage.setItem('pos_active_sessions', JSON.stringify(tableSessions));
            localStorage.setItem('pos_table_discounts', JSON.stringify(tableDiscounts));
            
            // Save to Firebase in real-time
            if (typeof db !== 'undefined' && db && firebaseConnected) {
                const firebaseData = {};
                
                // Update source table (cleared)
                firebaseData[sourceTable] = {
                    cart: tableSessions[sourceTable],
                    discount: tableDiscounts[sourceTable]
                };
                
                // Update target table (merged)
                firebaseData[targetTable] = {
                    cart: tableSessions[targetTable],
                    discount: tableDiscounts[targetTable]
                };
                
                // Sync to Firebase
                db.ref('tableSessions/' + CURRENT_BRANCH).update(firebaseData).then(() => {
                    console.log('✓ Transfer saved to Firebase:', sourceTable, '→', targetTable);
                }).catch(err => {
                    console.error('❌ Firebase transfer error:', err);
                });
            }
            
            // If currently viewing the source table, clear its display
            if (selectedTable === sourceTable) {
                cart = [];
                additionalCharges = [];
                currentDiscount = { type: 'none', value: 0, label: 'No Discount' };
                renderCart();
                renderMenu();
                updateChargesDisplay();
            }
            
            // Refresh table chips to remove highlight and occupied status from source table
            renderTableChips();
            
            showNotification(`✅ Transferred ${sourceCart.length} item(s) from ${sourceTable} to ${targetTable}`);
        }

        // Function to update table display in cart header
        function updateTableDisplay() {
            const tableDisplay = document.getElementById('table-display');
            const tableStar = document.getElementById('table-star');
            
            if (selectedTable) {
                // Show table name/number
                tableDisplay.textContent = selectedTable;
                tableDisplay.style.display = 'inline-block';
                // Show blinking star
                tableStar.classList.add('visible');
            } else {
                // Hide table display and star
                tableDisplay.textContent = '';
                tableDisplay.style.display = 'none';
                tableStar.classList.remove('visible');
            }
        }

        // Navigate between takeout orders
        function navigateTakeoutOrder(direction) {
            // Get all takeout orders from tableSessions
            const takeoutTables = Object.keys(tableSessions)
                .filter(key => key.startsWith('TAKEOUT#'))
                .sort((a, b) => {
                    const numA = parseInt(a.replace('TAKEOUT#', ''));
                    const numB = parseInt(b.replace('TAKEOUT#', ''));
                    return numA - numB;
                });
            
            if (takeoutTables.length === 0) {
                // No takeout orders yet, create a new one
                selectTable('TAKEOUT');
                return;
            }
            
            let currentIndex = -1;
            if (selectedTable && selectedTable.startsWith('TAKEOUT#')) {
                currentIndex = takeoutTables.indexOf(selectedTable);
            }
            
            let newIndex = currentIndex + direction;
            
            if (newIndex < 0) {
                newIndex = 0;
            } else if (newIndex >= takeoutTables.length) {
                // If going forward beyond last takeout, create a new one
                selectTable('TAKEOUT');
                return;
            }
            
            // Select the takeout order at newIndex
            selectTable(takeoutTables[newIndex]);
        }

        // Reset Takeout Counter Function
        function resetTakeoutCounter() {
            if (!confirm('⚠️ Reset Takeout Numbering?\n\nThis will reset the takeout counter back to #1. Are you sure?')) {
                return;
            }
            // Reset counter to 0 (so next takeout will be #1)
            localStorage.setItem('takeout_counter', 0);
            showNotification('🔄 Takeout numbering reset to #1');
        }

        function renderMenu(query = '') {
            let filtered = activeCategory === "ALL" ? menu : menu.filter(m => m.category === activeCategory);
            if (query) {
                filtered = filtered.filter(item => item.name.toLowerCase().includes(query));
            }
            document.getElementById('menu-grid').innerHTML = filtered.map(item => `
                <div class="item-card" onclick="addToCart(${item.id})">
                    <span class="stock-tag" style="color:${item.stock <= 5 ? 'var(--red)' : 'var(--green)'}; font-size:0.65rem; position:absolute; top:10px; right:10px;">STK: ${item.stock}</span>
                    <div>
                        <p style="font-size:0.6rem; color:var(--text-muted);">${item.category}</p>
                        <p style="font-weight:700; font-size:0.85rem;">${item.name}</p>
                        <p style="color:var(--accent); font-weight:800;">₱${item.price}</p>
                    </div>
                </div>`).join('');
        }

        function addToCart(id) {
            if (!selectedTable) return alert("Select a Table First!");
            let mItem = menu.find(m => m.id === id);
            if (mItem.stock <= 0) return alert("Out of Stock!");
            let cItem = cart.find(c => c.id === id);
            if (cItem) cItem.qty++; else cart.push({ ...mItem, qty: 1 });
            mItem.stock--;
            
            // HYBRID MODE: Update stock - try Firebase, fallback to queue if offline
            updateStockHybrid(id, mItem.stock);
            
            saveState();
            renderCart();
            renderMenu();
        }
        
        // Hybrid function to update stock - works online and offline
        function updateStockHybrid(itemId, newStock) {
            if (isOnline && firebaseConnected) {
                // Online: Update Firebase in real-time
                db.ref('menu/' + CURRENT_BRANCH + '/' + itemId).update({ stock: newStock })
                    .then(() => {
                        console.log('Stock updated in Firebase');
                    })
                    .catch((error) => {
                        console.error('Firebase update failed, queuing for later:', error);
                        queuePendingSync(itemId, newStock, 'update');
                    });
            } else {
                // Offline: Queue for later sync
                console.log('Offline - queuing stock update');
                queuePendingSync(itemId, newStock, 'update');
                
                // Also save to local cache
                const cached = JSON.parse(localStorage.getItem(MENU_CACHE_KEY) || '[]');
                const item = cached.find(i => i.id === itemId);
                if (item) {
                    item.stock = newStock;
                    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(cached));
                    localStorage.setItem(MENU_CACHE_TIMESTAMP, Date.now().toString());
                }
            }
        }

        function removeFromCart(index) {
            let item = cart[index];
            
            // Check if this is a manual item (manual items have IDs starting with 'manual-')
            // Manual items don't exist in the menu database, so we skip stock update for them
            let isManualItem = item.id && item.id.toString().startsWith('manual-');
            
            if (!isManualItem) {
                let mItem = menu.find(m => m.id === item.id);
                if (mItem) {
                    mItem.stock += item.qty;
                    // HYBRID MODE: Update stock - works online and offline
                    updateStockHybrid(item.id, mItem.stock);
                }
            }
            
            cart.splice(index, 1);
            saveState();
            renderCart();
            renderMenu();
        }

        function renderCart() {
            document.getElementById('cart-list').innerHTML = cart.map((c, i) => `
                <div class="cart-item-card">
                    <div style="flex:1;">
                        <p style="font-weight:700; font-size:0.8rem;">${c.name}</p>
                        <p style="color:var(--accent); font-weight:700; font-size:0.95rem; margin-top:8px;">₱${formatNumber(c.price * c.qty)}</p>
                        <div style="margin-top:8px;">
                            <span onclick="removeFromCart(${i})" style="color:var(--red); font-size:0.65rem; cursor:pointer; display:inline-block; padding:3px 8px; background:rgba(239,68,68,0.15); border-radius:4px; border:1px solid rgba(239,68,68,0.3);">REMOVE</span>
                        </div>
                    </div>
                    <div style="text-align:right; display:flex; flex-direction:column; justify-content:space-between; min-width:100px;">
                        <div class="qty-with-arrows" style="padding:4px 6px;">
                            <button class="qty-arrow-btn decrease" onclick="updateCartQty(${i}, ${c.qty - 1})" title="Decrease">▼</button>
                            <span class="qty-value">${c.qty}</span>
                            <button class="qty-arrow-btn increase" onclick="updateCartQty(${i}, ${c.qty + 1})" title="Increase">▲</button>
                        </div>
                        <div style="display:flex; gap:5px; align-items:center; margin-top:5px; padding:4px 6px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px solid var(--border);">
                            <label style="font-size:0.6rem; color:var(--text-muted);">Price:</label>
                            <input type="number" value="${c.price}" step="0.01" min="0" style="width:50px; background:rgba(255,255,255,0.1); border:1px solid var(--border-hover); color:white; text-align:center; border-radius:4px; padding:2px 4px; font-size:0.75rem;" oninput="updateCartPrice(${i}, this.value)" ${c.category === 'Manual' ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>`).join('');
            calculate();
        }

        function calculate() {
            let subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
            let discountableSubtotal = cart.reduce((sum, i) => {
                if (i.category) {
                    const cat = i.category.toUpperCase().trim();
                    // Exclude categories: BEER, LIQOURS, COCKTAILS, PROMO, CHEF'S CHOICE, PARTY TRAYS, VM, PLATTERS
                    const excludedCategories = ['BEER', 'LIQOURS', 'COCKTAILS', 'PROMO', "CHEF'S CHOICE", 'CHEF CHOICE', 'PARTY TRAYS', 'VM', 'PLATTERS'];
                    const isExcluded = excludedCategories.some(exc => cat === exc || cat.startsWith(exc));
                    if (isExcluded) {
                        return sum;
                    }
                }
                return sum + (i.price * i.qty);
            }, 0);

            let disc = 0;
            if (currentDiscount.type === 'senior') {
                let perPax = discountableSubtotal / currentDiscount.pax;
                let vatableAmount = (perPax * currentDiscount.withId) / 1.12;
                disc = (vatableAmount * 0.20) + ((perPax * currentDiscount.withId) - vatableAmount);
            } else if (currentDiscount.type === 'percent') {
                disc = discountableSubtotal * (currentDiscount.value / 100);
            } else if (currentDiscount.type === 'amount') {
                disc = Math.min(currentDiscount.value, discountableSubtotal);
            }

            let addtl = parseFloat(document.getElementById('sc-input').value) || 0;
            // Sync mobile additional charge input
            const mobileScInput = document.getElementById('mobile-sc-input');
            if (mobileScInput) {
                mobileScInput.value = addtl;
            }
            // Calculate service charge from NET AMOUNT (after discount) instead of subtotal
            let netAmount = subtotal - disc;
            let autoSC = netAmount * (scPercent / 100);
            let total = subtotal - disc + autoSC + addtl;

            document.getElementById('display-subtotal').innerHTML = `<span style="font-weight: bold; font-size: 1.1em; color: #2563eb;">₱${formatNumber(subtotal)}</span>`;
            document.getElementById('display-discount').innerText = `-₱${formatNumber(disc)}`;
            document.getElementById('label-discount').innerText = currentDiscount.label;
            document.getElementById('display-sc').innerText = `₱${formatNumber(autoSC)}`;
            document.getElementById('display-total').innerHTML = `<span style="font-weight: bold; font-size: 1.4em; color: #dc2626;">₱${formatNumber(total)}</span>`;
            
            // Update calculation display section
            const calculationDisplay = document.getElementById('calculation-display');
            const calcSubtotal = document.getElementById('calc-subtotal');
            const calcDiscount = document.getElementById('calc-discount');
            const calcNet = document.getElementById('calc-net');
            const calcServiceCharge = document.getElementById('calc-service-charge');
            
            if (disc > 0) {
                // Show calculation section when discount is applied
                calculationDisplay.style.display = 'block';
                calcSubtotal.innerHTML = `Subtotal: <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">P${formatNumber(subtotal)}</span>`;
                calcDiscount.innerHTML = `- Discount: <span style="font-weight: bold;">P${formatNumber(disc)}</span>`;
                const netAmount = subtotal - disc;
                calcNet.innerHTML = `Net Amount: <span style="font-weight: bold;">P${formatNumber(netAmount)}</span>`;
                calcServiceCharge.innerHTML = `Service Charge (${scPercent}% of Net Amount): <span style="font-weight: bold;">P${formatNumber(autoSC)}</span>`;
            } else {
                // Hide calculation section when no discount
                calculationDisplay.style.display = 'none';
            }
            
            return { subtotal, autoSC, addtl, disc, total, scPercent };
        }

        // Generate styled payment receipt HTML using same template and settings as showStyledReceipt
        async function generateStyledPaymentReceiptHTML() {
            if (!selectedTable || cart.length === 0) return null;

            // Use the same fixed-width receipt source as paper print for consistency
            const receiptText = await generateFixedWidthReceipt('receipt');
            if (!receiptText) return null;

            // Get saved style settings - same as generateStyledHTMLReceipt
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            const bgColor = savedSettings.backgroundColor || '#ffffff';
            const textColor = savedSettings.textColor || '#000000';
            const dividerColor = savedSettings.dividerColor || '#000000';
            const paperWidth = savedSettings.paperWidth || '80mm';
            const padding = savedSettings.padding || '20px';

            let width = '320px';
            if (paperWidth === '58mm') width = '230px';
            else if (paperWidth === '80mm') width = '320px';
            else if (paperWidth === '100mm') width = '400px';
            else if (paperWidth === '120mm') width = '480px';
            else if (paperWidth === 'custom') width = savedSettings.width || '320px';

            const lines = receiptText.split('\n');
            const renderLine = (line) => {
                const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
                if (!line.trim()) return '<br>';
                if (line.trim().startsWith('TOTAL')) {
                    return `<div style="font-size: 1.05rem; font-weight: 900;">${escaped}</div>`;
                }
                return `<div>${escaped}</div>`;
            };
            const renderedText = lines.map(renderLine).join('');

            const receiptHTML = `
                <style>
                    .receipt-container {
                        background-color: ${bgColor};
                        color: ${textColor};
                        font-family: 'Courier New', monospace;
                        width: ${width};
                        padding: ${padding};
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow-x: hidden;
                        font-size: 0.9rem;
                        line-height: 1.3;
                        letter-spacing: 0.5px;
                        margin: 0 auto;
                        box-sizing: border-box;
                        border: 1px solid ${dividerColor};
                    }
                </style>
                <div class="receipt-container">${renderedText}</div>
            `;

            return receiptHTML;
        }

        async function preparePrint(type) {
            if (!selectedTable || cart.length === 0) return alert("No active orders!");
            
            // ===== SEQUENTIAL SR LOGIC =====
            // Assign or retrieve the SR number for this table session
            let tableCurrentSR;
            try {
                tableCurrentSR = await assignOrGetTableSR(selectedTable);
            } catch (e) {
                console.error('Failed to assign SR:', e);
                return alert("Error assigning Bill SR number. Please try again.");
            }
            
            const res = calculate();
            const now = new Date();
            const fullDate = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            // Get current waiter name from localStorage (set during login from signup)
            const waiterName = localStorage.getItem('store-cashier') || "WAITER";

            // Get additional order header elements
            const additionalOrderHeader = document.getElementById('additional-order-header');
            const pAdditionalTable = document.getElementById('p-additional-table');
            const pAdditionalDatetime = document.getElementById('p-additional-datetime');
            const pAdditionalWaiter = document.getElementById('p-additional-waiter');

            // Check if this is an additional order (table already has orders)
            const existingOrders = tableSessions[selectedTable] ? tableSessions[selectedTable].length : 0;
            const hasExistingOrders = existingOrders > 0;

            // If additional order (table already has orders), show special header
            if (hasExistingOrders) {
                additionalOrderHeader.style.display = 'block';
                // Big letter table name and number
                pAdditionalTable.innerText = `=== ${selectedTable.toUpperCase()} ===`;
                // Exact date and time ordered
                pAdditionalDatetime.innerText = fullDate;
                // Waiter name from signup details
                pAdditionalWaiter.innerText = `ORDER TAKEN BY: ${waiterName.toUpperCase()}`;
            } else {
                additionalOrderHeader.style.display = 'none';
            }

            const sName = localStorage.getItem('store-name') || "SANGKALAN RESTAURANT";
            const sBranch = localStorage.getItem('store-branch') || "West Avenue Branch";
            const sAddress = localStorage.getItem('store-address') || "";
            const sCashier = localStorage.getItem('store-cashier') || "ADMIN";

            document.getElementById('p-store-name').innerText = sName;
            document.getElementById('p-store-info').innerHTML = `${sBranch}<br>${sAddress}`;
            document.getElementById('p-title').innerText = type === 'soa' ? "YOUR BILL" : (hasExistingOrders ? " UNOFFICIAL RECEIPT " : " NEW ORDER ");
            document.getElementById('p-cashier').innerText = `CASHIER: ${sCashier}`;
            document.getElementById('p-table').innerText = `TABLE: ${selectedTable}`;
            document.getElementById('p-datetime').innerText = fullDate;
            document.getElementById('p-sr').innerText = `SR #: ${tableCurrentSR}`;

            // Calculate discountable items total for proportional discount calculation
            let discountableTotal = cart.reduce((sum, i) => {
                if (i.category) {
                    const cat = i.category.toUpperCase();
                    if (cat === 'BEER & SPIRITS' || cat.startsWith('VM') || cat.startsWith('PARTY TRAYS') || cat.startsWith('CHEF CHOICE')) {
                        return sum;
                    }
                }
                return sum + (i.price * i.qty);
            }, 0);
            
            // Calculate discount ratio (if there's a discount)
            let discountRatio = 0;
            if (discountableTotal > 0 && res.disc > 0) {
                discountRatio = res.disc / discountableTotal;
            }

            document.getElementById('p-items').innerHTML = cart.map(c => {
                const total = c.price * c.qty;

                // Calculate per-item discount if applicable
                let itemDiscount = 0;
                if (discountRatio > 0) {
                    if (c.category) {
                        const cat = c.category.toUpperCase();
                        if (cat !== 'BEER & SPIRITS' && !cat.startsWith('VM') && !cat.startsWith('PARTY TRAYS') && !cat.startsWith('CHEF CHOICE')) {
                            itemDiscount = total * discountRatio;
                        }
                    }
                }

                return `<div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
                    <span style="flex:2.5;">${c.name}</span>
                    <span style="flex:0.8; text-align:right;">${c.qty}</span>
                    <span style="flex:1.2; text-align:right;"><span style="font-weight: bold;">₱</span>${formatNumber(total)}</span>
                    ${itemDiscount > 0 ? `<span style="flex:0.8; text-align:right; color:red;">-${formatNumber(itemDiscount)}</span>` : '<span style="flex:0.8;"></span>'}
                </div>`;
            }).join('');

            let tendered = type === 'receipt' ? (parseFloat(document.getElementById('m-tendered')?.value) || 0) : 0;
            const payMethod = type === 'receipt' ? document.getElementById('m-method').value : 'SOA';

            document.getElementById('p-calc').innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding: 8px 0; border-bottom: 1px solid #ccc; font-size: 10px;">
                    <span style="font-weight: bold;">SUBTOTAL:</span>
                    <span style="font-weight: normal;">₱${formatNumber(res.subtotal)}</span>
                </div>
                ${res.disc > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding: 8px 0; border-bottom: 1px solid #ccc;">
                    <span style="font-weight: bold;">${currentDiscount.label.toUpperCase()}:</span>
                    <span style="color: #cc0000; font-weight: bold; margin-left: 40px;">-<span style="font-weight: bold;">₱</span> ${formatNumber(res.disc)}</span>
                </div>` : ''}
                ${res.autoSC > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding: 8px 0; border-bottom: 1px solid #ccc;">
                    <span style="font-weight: bold;">SERVICE CHARGE (${scPercent}% of Net Amount):</span>
                    <span style="font-weight: bold; margin-left: 40px;"><span style="font-weight: bold;">₱</span> ${formatNumber(res.autoSC)}</span>
                </div>` : ''}
                ${res.addtl > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:12px; padding: 8px 0; border-bottom: 1px solid #ccc;">
                    <span style="font-weight: bold;">ADDITIONAL CHARGE:</span>
                    <span style="font-weight: bold; margin-left: 40px;"><span style="font-weight: bold;">₱</span> ${formatNumber(res.addtl)}</span>
                </div>` : ''}
                <div style="border-top: 2px solid #000; margin-top: 8px; padding-top: 12px; padding-bottom: 12px; background: #f0f0f0; border-bottom: 2px solid #000;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size: 14px; font-weight: 900;">TOTAL:</span>
                        <span style="font-size: 16px; font-weight: 900; background: #000; color: #fff; padding: 6px 12px; border-radius: 4px;"><span style="font-weight: bold;">₱</span> ${formatNumber(res.total)}</span>
                    </div>
                </div>
                ${type === 'receipt' ? `
                    <div style="margin-top:8px; border-top: 1px dashed #000; padding-top:8px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>METHOD:</span><span style="margin-left: 20px;">${payMethod}</span></div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>TENDERED:</span><span style="margin-left: 20px;"><span style="font-weight: bold; color: var(--accent);">₱</span> ${formatNumber(tendered)}</span></div>
                        <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>CHANGE:</span><span style="margin-left: 20px;"><span style="font-weight: bold; color: var(--accent);">₱</span> ${formatNumber(tendered - res.total)}</span></div>
                    </div>` : ''}`;

            if (type === 'receipt') {
                // Logic updated to push to Firebase
                const newSale = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    sr: tableCurrentSR,
                    table: selectedTable,
                    subtotal: res.subtotal,
                    discount: res.disc,
                    discountLabel: currentDiscount.label || 'DISCOUNT',
                    serviceCharge: res.autoSC,
                    additionalCharges: additionalCharges,
                    total: res.total,
                    method: payMethod,
                    items: cart,
                    branch: CURRENT_BRANCH
                };
                
                // Save Locally
                const salesHistory = JSON.parse(localStorage.getItem('pos_sales_history')) || [];
                salesHistory.push(newSale);
                localStorage.setItem('pos_sales_history', JSON.stringify(salesHistory));

                // SYNC TO CLOUD (REAL-TIME DASHBOARD) or LOCAL if offline
                if (navigator.onLine) {
                    db.ref('sales/' + CURRENT_BRANCH).push(newSale);
                } else {
                    const pendingSales = JSON.parse(localStorage.getItem('pending_sales')) || [];
                    pendingSales.push(newSale);
                    localStorage.setItem('pending_sales', JSON.stringify(pendingSales));
                }

                // Trigger local real-time update for sales.html
                localStorage.setItem('new_receipt', JSON.stringify(newSale));
                window.dispatchEvent(new StorageEvent('storage', { key: 'new_receipt', newValue: JSON.stringify(newSale) }));
            }

            if (bleCharacteristic) {
                let bt = `      ${sName.toUpperCase()}\n            ${sBranch}\n--------------------------------\n`;
                bt += `     ${type === 'soa' ? '      YOUR BILL' : '  OFFICIAL RECEIPT'}\n--------------------------------\n`;
                bt += `CASHIER: ${sCashier}\nTABLE: ${selectedTable}\nSR #: ${tableCurrentSR}\n${now.toLocaleString()}\n--------------------------------\n`;
                bt += `ITEM            QTY      AMOUNT\n`;
                cart.forEach(c => {
                    let name = c.name.substring(0, 15).padEnd(16, ' ');
                    bt += `${name}${c.qty.toString().padStart(3, ' ')}${(c.qty * c.price).toFixed(2).padStart(10, ' ')}\n`;
                });
                bt += `--------------------------------\n`;
                bt += `SUBTOTAL: ${res.subtotal.toFixed(2).padStart(20, ' ')} P\n`;
                
                if (res.disc > 0) {
                    bt += `DISCOUNT: ${res.disc.toFixed(2).padStart(20, ' ')} P\n`;
                }
                
                if (res.autoSC > 0) {
                    bt += `  S.C ${res.scPercent}% of Net:  ${res.autoSC.toFixed(2).padStart(15, ' ')} P\n`;
                }
                
                if (res.addtl > 0) {
                    bt += `ADDTL CHRG: ${res.addtl.toFixed(2).padStart(18, ' ')} P\n`;
                }
                
                bt += `TOTAL: ${res.total.toFixed(2).padStart(23, ' ')} P\n`;
                if(type === 'receipt') {
                    bt += `--------------------------------\n`;
                    bt += `AMOUNT RECEIVED: ${tendered.toFixed(2).padStart(15, ' ')} P\n`;
                    bt += `PAYMENT METHOD: ${(payMethod || 'Cash').padStart(18, ' ')}\n`;
                    bt += `CHANGE: ${(tendered - res.total).toFixed(2).padStart(23, ' ')} P\n`;
                }
                bt += `--------------------------------\n  THANK YOU! COME AGAIN\nWHERE GREAT FOOD BEGINS...`;
                await sendToBluetooth(bt);
            }

            const printSec = document.getElementById('print-section');
            
            // For payment receipts, use styled template; for SOA, use basic template
            if (type === 'receipt') {
                // Generate and display styled payment receipt
                const styledHTML = await generateStyledPaymentReceiptHTML();
                printSec.innerHTML = styledHTML;
            }
            
            printSec.style.display = "block";
            setTimeout(() => {
                window.print();
                printSec.style.display = "none";
                if(type === 'receipt') {
                    const tableToClear = selectedTable;
                    delete tableSessions[tableToClear];
                    delete tableDiscounts[tableToClear];
                    if (tableBillNumbers[tableToClear]) {
                        delete tableBillNumbers[tableToClear];
                        localStorage.setItem('pos_table_bill_numbers', JSON.stringify(tableBillNumbers));
                    }
                    // Clear the SR number (archive with transaction)
                    clearTableSR(tableToClear);
                    // Note: Do NOT reset takeout counter here - it continues incrementing
                    // Counter only resets at the start of a new day in selectTable function
                    selectedTable = null;
                    cart = [];
                    currentDiscount = { type: 'none', value: 0, label: 'No Discount' };
                    
                    // Save state and refresh POS display
                    saveState(); 
                    renderTableChips(); 
                    renderCart(); 
                    renderMenu(); 
                    updateTableDisplay();
                    closeModal();
                    
                    // Show success notification
                    alert(`Table ${tableToClear} cleared and sale recorded.`);
                }
            }, 600);
        }

        function openDiscount() {
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('modal-body').innerHTML = `
                <h3 style="margin-bottom:15px;">Apply Discount</h3>
                <button class="btn-pay" onclick="promptSenior()">SENIOR/PWD (20%)</button>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <button class="btn-pay" style="background:#475569" onclick="setDisc('percent', 5, 'VIP 5%')">VIP 5%</button>
                    <button class="btn-pay" style="background:#475569" onclick="setDisc('percent', 10, 'VIP 10%')">VIP 10%</button>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                    <button class="btn-pay" style="background:var(--orange); color:black;" onclick="promptManualPercent()">MANUAL %</button>
                    <button class="btn-pay" style="background:var(--orange); color:black;" onclick="promptManualAmount()">MANUAL ₱</button>
                </div>
                <button class="btn-pay" style="background:var(--red); margin-top:15px;" onclick="setDisc('none', 0, 'No Discount')">RESET</button>
                <button class="btn-pay" style="background:none; border:1px solid #fff; color:#fff;" onclick="closeModal()">CLOSE</button>`;
        }

        function promptSenior() {
            let pax = prompt("Total Persons?", "1");
            let count = prompt("How many Senior/PWD?", "1");
            if (pax && count) {
                currentDiscount = { type: 'senior', pax: parseInt(pax), withId: parseInt(count), label: `SENIOR/PWD (${count}/${pax})` };
                saveState(); closeModal(); calculate();
            }
        }

        function promptManualPercent() {
            let p = prompt("Enter Discount Percentage (0-100):", "0");
            if (p) setDisc('percent', parseFloat(p), `DISCOUNT ${p}%`);
        }

        function promptManualAmount() {
            let a = prompt("Enter Discount Amount (₱):", "0");
            if (a) setDisc('amount', parseFloat(a), `CASH DISC ₱${a}`);
        }

        function setDisc(type, val, label) {
            currentDiscount = { type, value: val, label };
            saveState(); closeModal(); calculate();
        }

        function openPayment() {
            if (cart.length === 0) return;
            const totalToPay = calculate().total;
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('modal-body').innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">Payment</h3>
                    <button onclick="closeModal()" style="background: var(--red); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">✕</button>
                </div>
                <p style="font-size: 1.2rem; font-weight: bold; color: var(--accent); margin-bottom: 10px;">Total Due: ₱${formatNumber(totalToPay)}</p>

                <label style="font-size:0.7rem; color:var(--text-muted);">Payment Method</label>
                <select id="m-method" class="pay-input" onchange="toggleTenderedInput(${totalToPay})">
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Debit (Visa)">Debit (Visa)</option>
                    <option value="Debit (Mastercard)">Debit (Mastercard)</option>
                    <option value="Credit (Visa)">Credit (Visa)</option>
                    <option value="Credit (Mastercard)">Credit (Mastercard)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>

                <label style="font-size:0.7rem; color:var(--text-muted); margin-top:10px;">Amount Tendered</label>
                <input type="number" id="m-tendered" placeholder="0.00" class="pay-input" style="font-size:1.5rem; text-align:center; font-weight:bold;" oninput="updateLiveChange(${totalToPay})">

                <div id="live-change-container" style="margin-top:15px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.05); text-align:center; border:1px dashed var(--border);">
                    <p style="font-size:0.7rem; color:var(--text-muted);">CHANGE (SUKLI)</p>
                    <p id="live-change-display" style="font-size:1.8rem; font-weight:800; color:var(--green);">₱0.00</p>
                </div>

                <button class="btn-pay" style="margin-top:20px;" onclick="processPayment()">PRINT RECEIPT</button>`;

            // Initial toggle based on default selection (Cash)
            toggleTenderedInput(totalToPay);

            setTimeout(() => {
                const tenderedInput = document.getElementById('m-tendered');
                if (!tenderedInput.disabled) {
                    tenderedInput.focus();
                }
            }, 100);
        }

        function toggleTenderedInput(totalToPay) {
            const method = document.getElementById('m-method').value;
            const tenderedInput = document.getElementById('m-tendered');
            if (method === 'Cash') {
                tenderedInput.disabled = false;
                tenderedInput.value = '';
                updateLiveChange(totalToPay);
            } else {
                tenderedInput.disabled = true;
                tenderedInput.value = formatNumber(totalToPay);
                updateLiveChange(totalToPay);
            }
        }

        function updateLiveChange(total) {
            const tendered = parseFloat(document.getElementById('m-tendered').value) || 0;
            const change = tendered - total;
            const display = document.getElementById('live-change-display');

            if (tendered > 0) {
                display.innerText = `₱${formatNumber(change)}`;
                display.style.color = change < 0 ? 'var(--red)' : 'var(--green)';
            } else {
                display.innerText = `₱0.00`;
                display.style.color = 'var(--green)';
            }
        }

        async function processPayment() {
            const totalToPay = calculate().total;
            const tendered = parseFloat(document.getElementById('m-tendered').value) || 0;
            const method = document.getElementById('m-method').value;

            // Check if payment amount is insufficient for cash payments
            if (method === 'Cash' && tendered < totalToPay) {
                showNotification('❌ Insufficient payment amount! Please enter a higher amount.');
                return;
            }

            // Show the styled receipt modal for payment completion
            // User can review and edit before printing
            // The print flow will handle Bluetooth → Wired → Browser print
            // And will save the sale and clear the table after successful print
            await showStyledReceipt('receipt');
        }

        function openManualItemModal() {
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('modal-body').innerHTML = `
                <h3>Add Manual Item</h3>
                <input type="text" id="manual-name" placeholder="Item Name" class="pay-input" style="margin-bottom:10px;">
                <input type="number" id="manual-price" placeholder="Price" class="pay-input" style="margin-bottom:10px;">
                <button class="btn-pay" onclick="addManualItem()">ADD TO CART</button>
                <button class="btn-pay" style="background:none; border:1px solid var(--border); color:#fff;" onclick="closeModal()">CANCEL</button>`;
        }

        function addManualItem() {
            const name = document.getElementById('manual-name').value.trim();
            const price = parseFloat(document.getElementById('manual-price').value);
            if (!name || isNaN(price) || price <= 0) return alert("Invalid name or price");
            if (!selectedTable) return alert("Select a Table First!");
            const manualItem = { id: 'manual-' + Date.now(), name, price, qty: 1, category: 'Manual' };
            cart.push(manualItem);
            saveState();
            renderCart();
            closeModal();
        }

        function updateCartQty(index, qty) {
            const newQty = parseInt(qty);
            const oldQty = cart[index].qty;
            
            if (newQty > 0) {
                // Calculate the difference in quantity
                const qtyDiff = newQty - oldQty;
                
                // Update the cart item quantity
                cart[index].qty = newQty;
                
                // Update the stock in Firebase if the item is not a manual item
                const item = cart[index];
                let isManualItem = item.id && item.id.toString().startsWith('manual-');
                
                if (!isManualItem) {
                    let mItem = menu.find(m => m.id === item.id);
                    if (mItem) {
                        // If qtyDiff is negative, we're removing items (return to stock)
                        // If qtyDiff is positive, we're adding items (remove from stock)
                        mItem.stock -= qtyDiff;
                        if (mItem.stock < 0) mItem.stock = 0;
                        
                        // HYBRID MODE: Update stock - works online and offline
                        updateStockHybrid(item.id, mItem.stock);
                    }
                }
                
                saveState();
                renderCart();
                renderMenu();
            }
        }

        function updateCartPrice(index, price) {
            const newPrice = parseFloat(price);
            if (!isNaN(newPrice) && newPrice >= 0) {
                cart[index].price = newPrice;
                saveState();
                renderCart();
            }
        }

        function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }
        
        function saveState() {
            if (selectedTable) {
                tableSessions[selectedTable] = [...cart];
                tableDiscounts[selectedTable] = { ...currentDiscount };
            }
            localStorage.setItem('pos_active_sessions', JSON.stringify(tableSessions));
            localStorage.setItem('pos_table_discounts', JSON.stringify(tableDiscounts));
            localStorage.setItem('pos_menu', JSON.stringify(menu));
            
            // Sync to Firebase for real-time multi-device support (POS and Waiter)
            localStorage.setItem('pos_table_bill_numbers', JSON.stringify(tableBillNumbers));
            if (!isSyncingFromFirebase) {
                isSyncingToFirebase = true;
                
                // Also store discount info in the same structure
                const firebaseData = {};
                Object.keys(tableSessions).forEach(tableName => {
                    firebaseData[tableName] = {
                        cart: tableSessions[tableName],
                        discount: tableDiscounts[tableName] || { type: 'none', value: 0, label: 'No Discount' }
                    };
                });
                
                db.ref('tableSessions/' + CURRENT_BRANCH).set(firebaseData).then(() => {
                    isSyncingToFirebase = false;
                }).catch(err => {
                    console.error('Firebase saveState error:', err);
                    isSyncingToFirebase = false;
                });
            }
        }

        function changeServiceCharge() {
            let v = prompt("Service Charge %?", scPercent);
            if (v !== null) { scPercent = parseFloat(v); calculate(); }
        }

        function sendToSales() {
            if (!selectedTable || cart.length === 0) return alert("No active orders to send!");
            const res = calculate();
            const newSale = {
                id: Date.now(),
                date: new Date().toISOString(),
                table: selectedTable,
                subtotal: res.subtotal,
                discount: res.disc,
                discountLabel: currentDiscount?.label || 'DISCOUNT',
                serviceCharge: res.autoSC,
                additionalCharges: additionalCharges,
                total: res.total,
                method: 'SOA',
                items: cart,
                branch: CURRENT_BRANCH
            };
            const salesHistory = JSON.parse(localStorage.getItem('pos_sales_history')) || [];
            salesHistory.push(newSale);
            localStorage.setItem('pos_sales_history', JSON.stringify(salesHistory));

            // SYNC TO CLOUD (REAL-TIME DASHBOARD) or LOCAL if offline
            if (navigator.onLine) {
                db.ref('sales/' + CURRENT_BRANCH).push(newSale);
            } else {
                const pendingSales = JSON.parse(localStorage.getItem('pending_sales')) || [];
                pendingSales.push(newSale);
                localStorage.setItem('pending_sales', JSON.stringify(pendingSales));
            }

            alert('Sale details sent to Sales Analytics!');
            window.location.href = 'sales.html';
        }

        // ==============================================
        // NEW: Date, Time, Weather, and Calendar Functions
        // ==============================================

        // Calendar variables
        let calendarDate = new Date();
        let selectedDate = null;

        // Initialize date, time, and weather on page load
        function initDateTimeWeather() {
            updateDateTime();
            setInterval(updateDateTime, 1000);
            initWeather();
            renderCalendar();
        }

        // Update date and time displays with alive clock effect
        function updateDateTime() {
            const now = new Date();
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateStr = now.toLocaleDateString('en-US', dateOptions);
            document.getElementById('date-display').textContent = dateStr;
            
            // Show time with seconds and blinking colon effect for alive look
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            const displaySeconds = seconds.toString().padStart(2, '0');
            
            // Create time string with blinking colon
            const timeStr = `${displayHours}:${displayMinutes} <span class="seconds">:${displaySeconds}</span> ${ampm}`;
            document.getElementById('time-display').innerHTML = timeStr;
        }

        // Get day/night status based on current hour
        function isDaytime() {
            const hour = new Date().getHours();
            // Daytime: 6 AM to 6 PM
            return hour >= 6 && hour < 18;
        }

        // Get weather icon based on WMO code and time of day
        function getWeatherIcon(wmoCode, isDay) {
            // WMO Weather interpretation codes
            // 0: Clear sky, 1-3: Mainly clear/partly cloudy/overcast
            // 45-48: Fog, 51-67: Drizzle/Rain, 71-77: Snow
            // 80-82: Rain showers, 85-86: Snow showers, 95-99: Thunderstorm
            
            if (wmoCode === 0) {
                return isDay ? { icon: '☀️', class: 'sunny' } : { icon: '🌙', class: 'clear-night' };
            } else if (wmoCode >= 1 && wmoCode <= 3) {
                return isDay ? { icon: '⛅', class: 'cloudy' } : { icon: '☁️', class: 'cloudy-night' };
            } else if (wmoCode >= 45 && wmoCode <= 48) {
                return { icon: '🌫️', class: 'foggy' };
            } else if (wmoCode >= 51 && wmoCode <= 67) {
                return isDay ? { icon: '🌧️', class: 'rainy' } : { icon: '🌧️', class: 'rainy-night' };
            } else if (wmoCode >= 71 && wmoCode <= 77) {
                return { icon: '❄️', class: 'snowy' };
            } else if (wmoCode >= 80 && wmoCode <= 82) {
                return isDay ? { icon: '🌦️', class: 'rainy' } : { icon: '🌧️', class: 'rainy-night' };
            } else if (wmoCode >= 85 && wmoCode <= 86) {
                return { icon: '🌨️', class: 'snowy' };
            } else if (wmoCode >= 95 && wmoCode <= 99) {
                return { icon: '⛈️', class: 'stormy' };
            }
            // Default
            return isDay ? { icon: '☀️', class: 'sunny' } : { icon: '🌙', class: 'clear-night' };
        }

        // Get weather condition text based on WMO code
        function getWeatherCondition(wmoCode) {
            if (wmoCode === 0) return 'Clear';
            if (wmoCode >= 1 && wmoCode <= 3) return 'Cloudy';
            if (wmoCode >= 45 && wmoCode <= 48) return 'Foggy';
            if (wmoCode >= 51 && wmoCode <= 55) return 'Drizzle';
            if (wmoCode >= 56 && wmoCode <= 57) return 'Freezing Drizzle';
            if (wmoCode >= 61 && wmoCode <= 65) return 'Rain';
            if (wmoCode >= 66 && wmoCode <= 67) return 'Freezing Rain';
            if (wmoCode >= 71 && wmoCode <= 75) return 'Snow';
            if (wmoCode === 77) return 'Snow Grains';
            if (wmoCode >= 80 && wmoCode <= 82) return 'Rain Showers';
            if (wmoCode >= 85 && wmoCode <= 86) return 'Snow Showers';
            if (wmoCode >= 95 && wmoCode <= 99) return 'Thunderstorm';
            return 'Unknown';
        }

        // Default location: Quezon City, Philippines
        const DEFAULT_LAT = 14.5995;
        const DEFAULT_LON = 121.0369;
        const DEFAULT_LOCATION_NAME = 'Quezon City';

        // Fetch weather - Auto locate to Quezon City without any prompts
        async function fetchLiveWeather() {
            // Directly use Quezon City as default location (no geolocation prompts)
            let lat = DEFAULT_LAT;
            let lon = DEFAULT_LON;
            let locationName = DEFAULT_LOCATION_NAME;
            
            try {
                // Fetch weather data from Open-Meteo
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
                
                const weatherResponse = await fetch(weatherUrl);
                const weatherData = await weatherResponse.json();
                
                const current = weatherData.current_weather;
                const isDay = isDaytime();
                const weatherInfo = getWeatherIcon(current.weathercode, isDay);
                const condition = getWeatherCondition(current.weathercode);
                const temp = Math.round(current.temperature) + '°C';
                
                return {
                    icon: weatherInfo.icon,
                    temp: temp,
                    condition: isDay ? condition : condition + ' (Night)',
                    class: weatherInfo.class,
                    location: locationName
                };
            } catch (error) {
                console.error('Weather fetch error:', error);
                // Return fallback data if API fails
                return getFallbackWeather();
            }
        }

        // Fallback weather when API fails (based on time of day)
        function getFallbackWeather() {
            const isDay = isDaytime();
            const hour = new Date().getHours();
            
            // Simulate different weather based on time for demo
            const fallbackConditions = [
                { wmo: 0, temp: isDay ? 32 : 26 },
                { wmo: 1, temp: isDay ? 30 : 25 },
                { wmo: 2, temp: isDay ? 28 : 24 },
                { wmo: 3, temp: isDay ? 27 : 23 },
                { wmo: 45, temp: isDay ? 24 : 22 },
                { wmo: 61, temp: isDay ? 25 : 23 },
                { wmo: 80, temp: isDay ? 26 : 24 },
                { wmo: 95, temp: isDay ? 27 : 24 }
            ];
            
            const random = fallbackConditions[Math.floor(Math.random() * fallbackConditions.length)];
            const weatherInfo = getWeatherIcon(random.wmo, isDay);
            const condition = getWeatherCondition(random.wmo);
            
            return {
                icon: weatherInfo.icon,
                temp: random.temp + '°C',
                condition: isDay ? condition : condition + ' (Night)',
                class: weatherInfo.class,
                location: 'Local'
            };
        }

        // Initialize weather (live data with animated icons) with auto-refresh
        async function initWeather() {
            const weather = await fetchLiveWeather();
            updateWeatherDisplay(weather);
            
            // Auto-refresh weather every 10 minutes (600000 milliseconds)
            setInterval(async () => {
                const weather = await fetchLiveWeather();
                updateWeatherDisplay(weather);
            }, 600000);
        }

        // Update weather display with data
        function updateWeatherDisplay(weather) {
            const iconEl = document.getElementById('weather-icon');
            iconEl.textContent = weather.icon;
            iconEl.className = 'weather-icon ' + weather.class;
            document.getElementById('weather-temp').textContent = weather.temp;
            document.getElementById('weather-condition').textContent = weather.condition;
        }

        // Refresh weather (fetch new live data)
        async function refreshWeather() {
            const btn = document.querySelector('.weather-display');
            btn.style.opacity = '0.5';
            
            const weather = await fetchLiveWeather();
            updateWeatherDisplay(weather);
            
            setTimeout(() => {
                btn.style.opacity = '1';
            }, 300);
        }

        // Toggle calendar modal
        function toggleCalendar() {
            const modal = document.getElementById('calendar-modal');
            modal.classList.toggle('active');
            if (modal.classList.contains('active')) {
                renderCalendar();
            }
        }

        // Change month in calendar
        function changeMonth(delta) {
            calendarDate.setMonth(calendarDate.getMonth() + delta);
            renderCalendar();
        }

        // Render calendar grid
        function renderCalendar() {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            document.getElementById('calendar-title').textContent = monthNames[month] + ' ' + year;
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, month, 0).getDate();
            const today = new Date();
            const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
            let html = '';
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            for (let i = 0; i < 7; i++) {
                html += '<div class="calendar-day-header">' + dayNames[i] + '</div>';
            }
            for (let i = firstDay - 1; i >= 0; i--) {
                const day = daysInPrevMonth - i;
                html += '<div class="calendar-day other-month">' + day + '</div>';
            }
            for (let day = 1; day <= daysInMonth; day++) {
                const isToday = isCurrentMonth && day === today.getDate();
                const isSelected = selectedDate && calendarDate.getMonth() === selectedDate.getMonth() && calendarDate.getFullYear() === selectedDate.getFullYear() && day === selectedDate.getDate();
                let classes = 'calendar-day';
                if (isToday) classes += ' today';
                if (isSelected) classes += ' selected';
                html += '<div class="' + classes + '" onclick="selectDate(' + day + ')">' + day + '</div>';
            }
            const totalCells = firstDay + daysInMonth;
            const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
            for (let day = 1; day <= remainingCells; day++) {
                html += '<div class="calendar-day other-month">' + day + '</div>';
            }
            document.getElementById('calendar-grid').innerHTML = html;
        }

        // Select date in calendar
        function selectDate(day) {
            selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
            renderCalendar();
            setTimeout(() => {
                document.getElementById('calendar-modal').classList.remove('active');
            }, 300);
        }

        // Close calendar when clicking outside
        document.addEventListener('click', function(e) {
            const modal = document.getElementById('calendar-modal');
            const btn = document.querySelector('.calendar-btn');
            if (modal && modal.classList.contains('active') && !modal.contains(e.target) && !btn.contains(e.target)) {
                modal.classList.remove('active');
            }
        });

        window.onload = function() {
            init();
            initDateTimeWeather();
            
            // Setup realtime listeners for KDS updates

            setupAdditionalOrderListener();

            setupKDSRealtimeListener();

            
            
            // Setup POS print listener - Listen for print requests from Kitchen Display

            setupPOSPrintListener();

        };

        

        // ========== POS PRINT LISTENER - Handle Print Requests from Kitchen ==========

        function setupPOSPrintListener() {

            db.ref('posPrint/' + CURRENT_BRANCH).on('child_added', async (snapshot) => {

                const printCommand = snapshot.val();

                if (printCommand && printCommand.action === 'print' && printCommand.orderId) {

                    const orderId = printCommand.orderId;

                    

                    console.log('Received print request from kitchen for order:', orderId);

                    

                    // Find the order in tableSessions

                    let foundOrder = null;

                    let foundTable = null;

                    

                    Object.entries(tableSessions).forEach(([tableName, cartItems]) => {

                        if (cartItems && cartItems.length > 0) {

                            foundOrder = cartItems;

                            foundTable = tableName;

                        }

                    });

                    

                    // If we found a table with orders, print the SOA

                    if (foundTable && foundOrder && foundOrder.length > 0) {

                        // Temporarily set selectedTable to foundTable and print

                        const originalTable = selectedTable;

                        selectedTable = foundTable;

                        

                        // Get cart from the table

                        cart = tableSessions[foundTable] || [];

                        

                        // Print the SOA

                        await printWithDualConnection('soa');

                        

                        // Restore original selection

                        selectedTable = originalTable;

                        cart = selectedTable ? (tableSessions[selectedTable] || []) : [];

                    }

                    

                    // Clear the command after processing

                    db.ref('posPrint/' + CURRENT_BRANCH + '/' + snapshot.key).remove();

                }

            });

        }

        

        // Function to request print from POS (called by kitchen)

        function requestPOSPrint(orderId) {

            const printCommand = {

                action: 'print',

                orderId: orderId,

                timestamp: Date.now(),

                branch: CURRENT_BRANCH

            };

            

            db.ref('posPrint/' + CURRENT_BRANCH).push(printCommand).then(() => {

                console.log('Print request sent to POS:', orderId);

            }).catch(err => {

                console.error('Error sending print request to POS:', err);

            });

        }


        // Sync pending sales when back online
        window.addEventListener('online', () => {
            const pendingSales = JSON.parse(localStorage.getItem('pending_sales')) || [];
            if (pendingSales.length > 0) {
                pendingSales.forEach(sale => {
                    db.ref('sales/' + CURRENT_BRANCH).push(sale);
                });
                localStorage.removeItem('pending_sales');
                alert('Pending sales synced to cloud!');
            }
        });

        // ==============================================
        // NEW: Schedule and Alarm Functionality
        // ==============================================

        // Schedule and alarm data structures
        let schedules = [];
        let activeAlarms = [];
        let alarmInterval = null;

        // Load schedules from localStorage
        function loadSchedules() {
            const saved = localStorage.getItem('pos_schedules');
            if (saved) {
                schedules = JSON.parse(saved);
            }
        }

        // Save schedules to localStorage
        function saveSchedules() {
            localStorage.setItem('pos_schedules', JSON.stringify(schedules));
        }

        // Initialize schedule system
        function initScheduleSystem() {
            loadSchedules();
            renderSchedules();
            startAlarmChecker();
        }

        // Render schedules for selected date
        function renderSchedules() {
            const selectedDateStr = selectedDate ? selectedDate.toDateString() : new Date().toDateString();
            const daySchedules = schedules.filter(s => new Date(s.date).toDateString() === selectedDateStr);

            if (daySchedules.length === 0) {
                document.getElementById('schedule-list').innerHTML = '<p class="no-schedules">No schedules for this date</p>';
                return;
            }

            const html = daySchedules.map(schedule => `
                <div class="schedule-item" onclick="editSchedule('${schedule.id}')">
                    <div class="schedule-time">${schedule.time}</div>
                    <div class="schedule-title">${schedule.title}</div>
                    ${schedule.alarm ? '<div class="schedule-alarm-badge">🔔</div>' : ''}
                </div>
            `).join('');

            document.getElementById('schedule-list').innerHTML = html;
        }

        // Open schedule form modal
        function openScheduleForm(scheduleId = null) {
            const modal = document.getElementById('schedule-form-modal');
            const titleInput = document.getElementById('schedule-title');
            const dateInput = document.getElementById('schedule-date');
            const timeInput = document.getElementById('schedule-time');
            const descInput = document.getElementById('schedule-desc');
            const alarmSwitch = document.getElementById('alarm-toggle-switch');
            const alarmTimeInput = document.getElementById('alarm-time-input');
            const soundSwitch = document.getElementById('sound-toggle-switch');

            // Set current date if no date selected
            if (!selectedDate) {
                selectedDate = new Date();
            }

            // Format date for input
            const dateStr = selectedDate.toISOString().split('T')[0];
            dateInput.value = dateStr;

            if (scheduleId) {
                // Edit existing schedule
                const schedule = schedules.find(s => s.id === scheduleId);
                if (schedule) {
                    titleInput.value = schedule.title;
                    timeInput.value = schedule.time;
                    descInput.value = schedule.description || '';
                    if (schedule.alarm) {
                        alarmSwitch.classList.add('active');
                        document.getElementById('alarm-time').value = schedule.alarmTime || schedule.time;
                        alarmTimeInput.classList.add('active');
                    }
                    if (schedule.sound) {
                        soundSwitch.classList.add('active');
                    }
                }
                document.querySelector('.schedule-form-title').textContent = 'Edit Schedule';
            } else {
                // New schedule
                titleInput.value = '';
                timeInput.value = '';
                descInput.value = '';
                alarmSwitch.classList.remove('active');
                alarmTimeInput.classList.remove('active');
                soundSwitch.classList.add('active'); // Sound on by default
                document.querySelector('.schedule-form-title').textContent = 'Add Schedule';
            }

            modal.classList.add('active');
        }

        // Close schedule form modal
        function closeScheduleForm() {
            document.getElementById('schedule-form-modal').classList.remove('active');
        }

        // Save schedule
        function saveSchedule() {
            const title = document.getElementById('schedule-title').value.trim();
            const date = document.getElementById('schedule-date').value;
            const time = document.getElementById('schedule-time').value;
            const description = document.getElementById('schedule-desc').value.trim();
            const hasAlarm = document.getElementById('alarm-toggle-switch').classList.contains('active');
            const alarmTime = hasAlarm ? document.getElementById('alarm-time').value : null;
            const hasSound = document.getElementById('sound-toggle-switch').classList.contains('active');

            if (!title || !date || !time) {
                alert('Please fill in all required fields');
                return;
            }

            const schedule = {
                id: Date.now().toString(),
                title,
                date,
                time,
                description,
                alarm: hasAlarm,
                alarmTime,
                sound: hasSound
            };

            // Check if editing existing schedule
            const existingIndex = schedules.findIndex(s => s.id === schedule.id);
            if (existingIndex >= 0) {
                schedules[existingIndex] = schedule;
            } else {
                schedules.push(schedule);
            }

            saveSchedules();
            renderSchedules();
            closeScheduleForm();
            showNotification('✅ Schedule saved!');
        }

        // Edit schedule
        function editSchedule(scheduleId) {
            openScheduleForm(scheduleId);
        }

        // Delete schedule (can be added to context menu later)
        function deleteSchedule(scheduleId) {
            if (confirm('Delete this schedule?')) {
                schedules = schedules.filter(s => s.id !== scheduleId);
                saveSchedules();
                renderSchedules();
                showNotification('🗑️ Schedule deleted');
            }
        }

        // Toggle alarm setting
        function toggleAlarmSetting() {
            const alarmSwitch = document.getElementById('alarm-toggle-switch');
            const alarmTimeInput = document.getElementById('alarm-time-input');

            alarmSwitch.classList.toggle('active');
            if (alarmSwitch.classList.contains('active')) {
                alarmTimeInput.classList.add('active');
                // Set default alarm time to schedule time
                const scheduleTime = document.getElementById('schedule-time').value;
                document.getElementById('alarm-time').value = scheduleTime;
            } else {
                alarmTimeInput.classList.remove('active');
            }
        }

        // Toggle sound setting
        function toggleSoundSetting(event) {
            event.stopPropagation();
            const soundSwitch = document.getElementById('sound-toggle-switch');
            soundSwitch.classList.toggle('active');
        }

        // Start alarm checker
        function startAlarmChecker() {
            if (alarmInterval) clearInterval(alarmInterval);

            alarmInterval = setInterval(() => {
                checkAlarms();
            }, 1000); // Check every second
        }

        // Check for active alarms
        function checkAlarms() {
            const now = new Date();
            const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
            const currentDate = now.toDateString();

            schedules.forEach(schedule => {
                if (schedule.alarm) {
                    const scheduleDate = new Date(schedule.date).toDateString();
                    const alarmTime = schedule.alarmTime || schedule.time;

                    if (scheduleDate === currentDate && alarmTime === currentTime) {
                        // Check if alarm already triggered
                        if (!activeAlarms.includes(schedule.id)) {
                            triggerAlarm(schedule);
                        }
                    }
                }
            });
        }

        // Trigger alarm
        function triggerAlarm(schedule) {
            activeAlarms.push(schedule.id);

            // Show alarm modal
            showAlarmModal(schedule);

            // Play sound if enabled
            if (schedule.sound) {
                playAlarmSound();
            }

            // Request notification permission and show notification
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    showNotificationAlert(schedule);
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            showNotificationAlert(schedule);
                        }
                    });
                }
            }
        }

        // Show alarm modal
        function showAlarmModal(schedule) {
            const modal = document.getElementById('alarm-modal-overlay');
            const timeDisplay = document.getElementById('alarm-time-display');
            const dateDisplay = document.getElementById('alarm-date-display');
            const messageTitle = document.getElementById('alarm-message-title');
            const messageText = document.getElementById('alarm-message-text');
            const subtitle = document.getElementById('alarm-subtitle');

            const now = new Date();
            timeDisplay.textContent = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
            });
            dateDisplay.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            messageTitle.textContent = schedule.title;
            messageText.textContent = schedule.description || 'You have a scheduled event!';
            subtitle.textContent = 'Time\'s up!';

            modal.classList.add('active');
        }

        // Dismiss alarm
        function dismissAlarm() {
            const modal = document.getElementById('alarm-modal-overlay');
            modal.classList.remove('active');

            // Clear active alarms
            activeAlarms = [];

            // Stop alarm sound
            stopAlarmSound();
        }

        // Snooze alarm
        function snoozeAlarm() {
            const modal = document.getElementById('alarm-modal-overlay');
            modal.classList.remove('active');

            // Stop alarm sound
            stopAlarmSound();

            // Add 5 minutes to current time for snooze
            const snoozeTime = new Date();
            snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);

            showNotification('⏰ Alarm snoozed for 5 minutes');

            // Remove from active alarms temporarily
            setTimeout(() => {
                activeAlarms = [];
            }, 5000);
        }

        // Play alarm sound
        function playAlarmSound() {
            // Create audio context and play a simple beep sound
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);

                // Repeat the sound every 2 seconds
                window.alarmSoundInterval = setInterval(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();

                    osc.connect(gain);
                    gain.connect(audioContext.destination);

                    osc.frequency.setValueAtTime(800, audioContext.currentTime);
                    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                    osc.start(audioContext.currentTime);
                    osc.stop(audioContext.currentTime + 0.5);
                }, 2000);

            } catch (error) {
                console.log('Audio not supported');
            }
        }

        // Stop alarm sound
        function stopAlarmSound() {
            if (window.alarmSoundInterval) {
                clearInterval(window.alarmSoundInterval);
                window.alarmSoundInterval = null;
            }
        }

        // Show notification alert
        function showNotificationAlert(schedule) {
            const notification = new Notification('🔔 Alarm!', {
                body: `${schedule.title}\n${schedule.description || 'Scheduled event'}`,
                icon: '/favicon.ico',
                tag: 'alarm-notification'
            });

            notification.onclick = function() {
                window.focus();
                notification.close();
            };

            // Auto close after 10 seconds
            setTimeout(() => {
                notification.close();
            }, 10000);
        }

        // Update calendar rendering to show schedules
        const originalRenderCalendar = renderCalendar;
        renderCalendar = function() {
            originalRenderCalendar();

            // Add schedule indicators to calendar days
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();

            schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if (scheduleDate.getFullYear() === year && scheduleDate.getMonth() === month) {
                    const day = scheduleDate.getDate();
                    const dayElement = document.querySelector(`.calendar-day:not(.other-month):nth-child(${day + 7})`);
                    if (dayElement && !dayElement.classList.contains('today') && !dayElement.classList.contains('selected')) {
                        dayElement.style.position = 'relative';
                        if (!dayElement.querySelector('.schedule-dot')) {
                            const dot = document.createElement('div');
                            dot.className = 'schedule-dot';
                            dot.style.cssText = `
                                position: absolute;
                                bottom: 2px;
                                left: 50%;
                                transform: translateX(-50%);
                                width: 4px;
                                height: 4px;
                                background: var(--accent);
                                border-radius: 50%;
                                box-shadow: 0 0 4px rgba(56, 189, 248, 0.6);
                            `;
                            dayElement.appendChild(dot);
                        }
                    }
                }
            });
        };

        // Update selectDate to render schedules
        const originalSelectDate = selectDate;
        selectDate = function(day) {
            originalSelectDate(day);
            renderSchedules();
        };

        // Update changeMonth to render schedules
        const originalChangeMonth = changeMonth;
        changeMonth = function(delta) {
            originalChangeMonth(delta);
            renderSchedules();
        };

        // Initialize schedule system when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initScheduleSystem();
        });

        // --- TABLE SECTION RESIZE FUNCTIONALITY ---
        (function() {
            const resizeHandle = document.getElementById('resize-handle');
            const tablesSection = document.getElementById('tables-section');
            const computationSection = document.getElementById('computation-section');
            const middleColumn = document.querySelector('.middle-column');

            let isResizing = false;
            let startY = 0;
            let startTablesHeight = 0;

            if (resizeHandle && tablesSection && computationSection) {
                resizeHandle.addEventListener('mousedown', function(e) {
                    isResizing = true;
                    startY = e.clientY;
                    startTablesHeight = tablesSection.offsetHeight;
                    document.body.style.cursor = 'ns-resize';
                    document.body.style.userSelect = 'none';
                    e.preventDefault();
                });

                document.addEventListener('mousemove', function(e) {
                    if (!isResizing) return;

                    const deltaY = e.clientY - startY;
                    const newHeight = startTablesHeight + deltaY;

                    // Get container dimensions for min/max constraints
                    const containerHeight = middleColumn.offsetHeight;
                    const minHeight = 150;
                    const maxHeight = containerHeight - 150;

                    // Apply constraints
                    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                    tablesSection.style.height = constrainedHeight + 'px';
                    tablesSection.style.flex = 'none';
                });

                document.addEventListener('mouseup', function() {
                    if (isResizing) {
                        isResizing = false;
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';

                        // Save preference to localStorage
                        localStorage.setItem('tablesSectionHeight', tablesSection.style.height);
                    }
                });

                // Load saved height preference
                const savedHeight = localStorage.getItem('tablesSectionHeight');
                if (savedHeight) {
                    tablesSection.style.height = savedHeight;
                    tablesSection.style.flex = 'none';
                }
            }
        })();

        // ==============================================
        // MOBILE SLIDE PANEL FUNCTIONALITY
        // ==============================================

        // Mobile navigation functions
        function showMobileCart() {
            // Update nav button states
            document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[onclick="showMobileCart()"]').classList.add('active');

            // Show cart and computation, hide other panels
            document.getElementById('mobile-main-panel').style.display = 'flex';
            document.getElementById('mobile-tables-panel').classList.remove('open');
            document.getElementById('mobile-menu-panel').classList.remove('open');
            document.getElementById('mobile-overlay').classList.remove('active');

            // Render mobile cart
            renderMobileCart();
            renderMobileComputation();
        }

        function showMobileTables() {
            // Update nav button states
            document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[onclick="showMobileTables()"]').classList.add('active');

            // Show tables panel
            document.getElementById('mobile-tables-panel').classList.add('open');
            document.getElementById('mobile-overlay').classList.add('active');

            // Render mobile tables
            renderMobileTables();
        }

        function showMobileMenu() {
            // Update nav button states
            document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[onclick="showMobileMenu()"]').classList.add('active');

            // Show menu panel
            document.getElementById('mobile-menu-panel').classList.add('open');
            document.getElementById('mobile-overlay').classList.add('active');

            // Render mobile menu
            renderMobileCategories();
        }

        function showMobilePayment() {
            // Update nav button states
            document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('[onclick="showMobilePayment()"]').classList.add('active');

            // Show payment modal
            openPayment();
        }

        // Close mobile panels
        function closeMobileTables() {
            document.getElementById('mobile-tables-panel').classList.remove('open');
            document.getElementById('mobile-overlay').classList.remove('active');
        }

        function closeMobileMenu() {
            document.getElementById('mobile-menu-panel').classList.remove('open');
            document.getElementById('mobile-overlay').classList.remove('active');
        }

        // Mobile table selection (modified selectTable for mobile)
        function selectMobileTable(name) {
            // Call original selectTable function
            selectTable(name);

            // Update mobile table display
            document.getElementById('mobile-table-display').textContent = selectedTable || 'Select Table';

            // Update mobile cart display when table is selected
            renderMobileCart();
            renderMobileComputation();

            // Close tables panel and show menu
            closeMobileTables();
            showMobileMenu();
        }

        // Render mobile cart
        function renderMobileCart() {
            const cartContainer = document.getElementById('mobile-cart-section');

            // Add table display at the top if a table is selected
            let tableDisplay = '';
            if (selectedTable) {
                tableDisplay = `<div style="text-align: center; padding: 10px; background: var(--surface-light); border-radius: 10px; margin-bottom: 10px; border: 1px solid var(--border);">
                    <span style="font-weight: 700; color: var(--accent); font-size: 0.9rem;">TABLE: ${selectedTable}</span>
                </div>`;
            }

            if (cart.length === 0) {
                cartContainer.innerHTML = tableDisplay + `
                    <div class="mobile-empty-cart">
                        <div class="empty-icon">🛒</div>
                        <p>No items in cart</p>
                    </div>
                `;
                return;
            }

            cartContainer.innerHTML = tableDisplay + cart.map((c, i) => `
                <div class="mobile-cart-item">
                    <div class="item-info">
                        <div class="item-name">${c.name}</div>
                        <div class="item-price">₱${formatNumber(c.price * c.qty)}</div>
                    </div>
                    <div class="qty-control">
                        <button class="mobile-qty-btn" onclick="updateCartQty(${i}, ${c.qty - 1})">-</button>
                        <span class="item-qty">${c.qty}</span>
                        <button class="mobile-qty-btn" onclick="updateCartQty(${i}, ${c.qty + 1})">+</button>
                    </div>
                    <button class="mobile-remove-btn" onclick="removeFromCart(${i})">×</button>
                </div>
            `).join('');

            // Update computation after rendering cart
            renderMobileComputation();
        }

        // Render mobile computation
        function renderMobileComputation() {
            const calc = calculate();

            document.getElementById('mobile-display-subtotal').innerHTML = `<span style="font-weight: bold; font-size: 1.1em; color: #2563eb;">₱${formatNumber(calc.subtotal)}</span>`;
            document.getElementById('mobile-display-discount').textContent = `-₱${formatNumber(calc.disc)}`;
            document.getElementById('mobile-label-discount').textContent = currentDiscount.label;
            document.getElementById('mobile-display-sc').textContent = `₱${formatNumber(calc.autoSC)}`;
            document.getElementById('mobile-display-total').innerHTML = `<span style="font-weight: bold; font-size: 1.4em; color: #dc2626;">₱${formatNumber(calc.total)}</span>`;
            
            // Sync additional charge input between desktop and mobile
            const desktopScInput = document.getElementById('sc-input');
            const mobileScInput = document.getElementById('mobile-sc-input');
            if (desktopScInput && mobileScInput) {
                mobileScInput.value = desktopScInput.value;
            }
            
            // Update mobile calculation display section
            const mobileCalculationDisplay = document.getElementById('mobile-calculation-display');
            const mobileCalcSubtotal = document.getElementById('mobile-calc-subtotal');
            const mobileCalcDiscount = document.getElementById('mobile-calc-discount');
            const mobileCalcNet = document.getElementById('mobile-calc-net');
            const mobileCalcServiceCharge = document.getElementById('mobile-calc-service-charge');
            
            if (calc.disc > 0) {
                // Show calculation section when discount is applied
                mobileCalculationDisplay.style.display = 'block';
                mobileCalcSubtotal.innerHTML = `Subtotal: <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">₱${formatNumber(calc.subtotal)}</span>`;
                mobileCalcDiscount.innerHTML = `- Discount: <span style="font-weight: bold;">₱${formatNumber(calc.disc)}</span>`;
                const netAmount = calc.subtotal - calc.disc;
                mobileCalcNet.innerHTML = `Net Amount: <span style="font-weight: bold;">₱${formatNumber(netAmount)}</span>`;
                mobileCalcServiceCharge.innerHTML = `Service Charge (${calc.scPercent}% of Net Amount): <span style="font-weight: bold;">₱${formatNumber(calc.autoSC)}</span>`;
            } else {
                // Hide calculation section when no discount
                mobileCalculationDisplay.style.display = 'none';
            }
        }

        // Render mobile tables
        function renderMobileTables() {
            // Combine tables from Firebase with hidden tables that have orders
            const hiddenTableObjs = TABLES_TO_INITIALIZE.map(name => ({ name }));

            // Combine Firebase tables with hidden tables (avoid duplicates)
            const allTables = [...tables];
            hiddenTableObjs.forEach(hiddenTable => {
                if (!allTables.find(t => t.name === hiddenTable.name)) {
                    allTables.push(hiddenTable);
                }
            });

            const tablesGrid = document.getElementById('mobile-tables-grid');
            tablesGrid.innerHTML = allTables.map(t => {
                const isOccupied = tableSessions[t.name] && tableSessions[t.name].length > 0;
                return `<div class="mobile-table-chip ${selectedTable === t.name ? 'active' : ''} ${isOccupied ? 'occupied' : ''}" onclick="selectMobileTable('${t.name}')">${t.name}</div>`;
            }).join('');
        }

        // Render mobile categories
        function renderMobileCategories() {
            // Show ALL categories in mobile (no filtering)
            const categories = [...new Set(menu.map(item => item.category))].filter(cat => cat);
            document.getElementById('mobile-categories').innerHTML = categories.map(cat =>
                `<div class="mobile-cat-chip ${activeCategory === cat ? 'active' : ''}" onclick="selectMobileCategory('${cat}')">${cat}</div>`
            ).join('');
        }

        // Show menu items for selected category (with slide effect)
        function selectMobileCategory(category) {
            filterCategory(category);
            renderMobileMenu();
            
            // Update current category display
            document.getElementById('mobile-current-category').textContent = category;
            
            // Slide to menu items panel
            document.getElementById('mobile-categories-panel').classList.add('slide-out');
            document.getElementById('mobile-menu-items-panel').classList.add('visible');
        }

        // Show categories panel (go back)
        function showMobileCategories() {
            // Slide back to categories panel
            document.getElementById('mobile-categories-panel').classList.remove('slide-out');
            document.getElementById('mobile-menu-items-panel').classList.remove('visible');
        }

        // Render mobile menu
        function renderMobileMenu(query = '') {
            let filtered = activeCategory === "ALL" ? menu : menu.filter(m => m.category === activeCategory);
            if (query) {
                filtered = filtered.filter(item => item.name.toLowerCase().includes(query));
            }

            document.getElementById('mobile-menu-grid').innerHTML = filtered.map(item => `
                <div class="mobile-item-card" onclick="addToCart(${item.id}); renderMobileCart();">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">₱${item.price}</div>
                    <div class="stock-tag" style="color:${item.stock <= 5 ? 'var(--red)' : 'var(--green)'};">STK: ${item.stock}</div>
                </div>
            `).join('');
        }

        // Initialize mobile functionality
        function initMobile() {
            // Check if we're on mobile (screen width <= 480px)
            if (window.innerWidth <= 480) {
                // Show mobile interface
                showMobileCart();

                // Update mobile table display
                document.getElementById('mobile-table-display').textContent = selectedTable || 'Select Table';
            }
        }

        // Call initMobile on page load
        document.addEventListener('DOMContentLoaded', function() {
            initMobile();
        });

        // ==================== SALES PANEL FUNCTIONS ====================
        let salesData = [];
        let currentSalesFilter = 'today';

        // Open Sales Panel
        function openSalesPanel() {
            document.getElementById('sales-modal-overlay').style.display = 'flex';
            loadSalesData();
        }

        // Close Sales Panel
        function closeSalesPanel() {
            document.getElementById('sales-modal-overlay').style.display = 'none';
        }

        // Open Sales Report Modal
        function openSalesReportModal() {
            // Switch to 'all' filter to show all sales
            filterSales('all');

            // Show notification that this shows all sales
            showNotification('📊 Showing all sales - use filters to narrow down');
        }

        // Load Sales Data from Firebase
        function loadSalesData() {
            if (!db) {
                console.log('Firebase not initialized');
                return;
            }

            const salesRef = db.ref('sales/' + CURRENT_BRANCH);
            salesRef.on('value', (snapshot) => {
                salesData = [];
                snapshot.forEach((childSnapshot) => {
                    const sale = childSnapshot.val();
                    sale.id = childSnapshot.key;
                    salesData.push(sale);
                });
                // Sort by date (newest first)
                salesData.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
                filterSales(currentSalesFilter);
            });
        }

        // Filter Sales
        function filterSales(filter) {
            currentSalesFilter = filter;
            
            // Update filter button styles
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.style.background = 'var(--surface-light)';
                btn.style.color = 'var(--text)';
                btn.style.border = '2px solid var(--border)';
            });
            event.target.style.background = 'var(--accent)';
            event.target.style.color = '#000';
            event.target.style.border = 'none';

            const now = new Date();
            let filteredData = [];

            salesData.forEach(sale => {
                const saleDate = new Date(sale.timestamp || sale.date);
                if (!saleDate.getTime()) return;

                if (filter === 'today') {
                    // Today - same day
                    if (saleDate.toDateString() === now.toDateString()) {
                        filteredData.push(sale);
                    }
                } else if (filter === 'week') {
                    // This week - last 7 days
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (saleDate >= weekAgo) {
                        filteredData.push(sale);
                    }
                } else if (filter === 'month') {
                    // This month - same month and year
                    if (saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()) {
                        filteredData.push(sale);
                    }
                } else {
                    // All time
                    filteredData.push(sale);
                }
            });

            updateSalesSummary(filteredData);
            renderSalesList(filteredData);
        }

        // Filter Sales by Date Range
        function filterSalesByDateRange() {
            const fromDate = document.getElementById('sales-date-from').value;
            const toDate = document.getElementById('sales-date-to').value;

            if (!fromDate || !toDate) {
                showNotification('⚠️ Please select both From and To dates');
                return;
            }

            const startDate = new Date(fromDate + 'T00:00:00');
            const endDate = new Date(toDate + 'T23:59:59');

            let filteredData = [];
            salesData.forEach(sale => {
                const saleDate = new Date(sale.timestamp || sale.date);
                if (saleDate >= startDate && saleDate <= endDate) {
                    filteredData.push(sale);
                }
            });

            updateSalesSummary(filteredData);
            renderSalesList(filteredData);
            showNotification(`📊 Showing ${filteredData.length} sales from ${fromDate} to ${toDate}`);
        }

        // Print Sales Table
        function printSalesTable() {
            const salesContainer = document.getElementById('sales-list');
            if (!salesContainer || salesContainer.innerHTML.trim() === '') {
                showNotification('⚠️ No sales data to print');
                return;
            }

            // Get current filter dates or display text
            const fromDate = document.getElementById('sales-date-from').value || 'All Time';
            const toDate = document.getElementById('sales-date-to').value || 'All Time';
            const storeName = localStorage.getItem('store-name') || 'SANGKALAN RESTAURANT';
            const storeBranch = localStorage.getItem('store-branch') || 'Branch';
            const printDate = new Date().toLocaleString('en-PH');

            // Get summary data
            const totalSales = document.getElementById('today-sales').textContent;
            const transactions = document.getElementById('today-transactions').textContent;
            const avgSale = document.getElementById('avg-sale').textContent;
            const itemsSold = document.getElementById('total-items').textContent;

            // Get all sales rows
            let tableHTML = `
                <html>
                <head>
                    <title>Sales Report</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Courier New', monospace; padding: 20px; background: white; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                        .header p { font-size: 12px; margin: 2px 0; }
                        .divider { border-bottom: 2px solid #000; margin: 10px 0; }
                        .summary-section { margin: 15px 0; }
                        .summary-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 12px; }
                        .summary-label { font-weight: bold; }
                        .summary-value { text-align: right; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                        th { border-bottom: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; }
                        td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
                        .total-row { font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
                        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
                        @media print {
                            body { margin: 0; padding: 10px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${storeName}</h1>
                        <p>${storeBranch}</p>
                        <p>Sales Report</p>
                        <p style="font-size: 10px; margin-top: 10px;">From: ${fromDate} | To: ${toDate}</p>
                        <p style="font-size: 10px;">Generated: ${printDate}</p>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="summary-section">
                        <div class="summary-row">
                            <span class="summary-label">Total Sales:</span>
                            <span class="summary-value">${totalSales}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Transactions:</span>
                            <span class="summary-value">${transactions}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Average Sale:</span>
                            <span class="summary-value">${avgSale}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">Total Items Sold:</span>
                            <span class="summary-value">${itemsSold}</span>
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Table</th>
                                <th>Items</th>
                                <th>Payment</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Extract sales data from the rendered HTML
            const salesItems = salesContainer.querySelectorAll('[style*="surface-light"]');
            salesItems.forEach(item => {
                const textContent = item.innerText;
                const amountMatch = textContent.match(/₱([0-9,.]+)/);
                const tableMatch = textContent.match(/([A-Z0-9]+)\s*•\s*(\d+)\s*items/);
                const dateMatch = textContent.match(/([A-Za-z]+\s+\d+,\s+\d+)\s+(\d+:\d+\s*(?:AM|PM)?)/);
                const paymentMatch = textContent.match(/(Cash|Card|GCash|Credit.*)\n/);

                if (amountMatch && dateMatch && tableMatch) {
                    const amount = amountMatch[1];
                    const table = tableMatch[1];
                    const items = tableMatch[2];
                    const dateTime = dateMatch[0].trim();
                    const payment = paymentMatch ? paymentMatch[1] : 'Cash';

                    tableHTML += `
                        <tr>
                            <td>${dateTime}</td>
                            <td>${table}</td>
                            <td>${items}</td>
                            <td>${payment}</td>
                            <td>₱${amount}</td>
                        </tr>
                    `;
                }
            });

            tableHTML += `
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
                        <p>Thank You!</p>
                        <p>Powered by CMPP FOOD CORP.</p>
                    </div>
                </body>
                </html>
            `;

            // Open print dialog
            const printWindow = window.open('', '', 'width=900,height=700');
            printWindow.document.write(tableHTML);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 250);
            
            showNotification('🖨️ Opening print preview...');
        }

// Update Sales Summary Cards
        function updateSalesSummary(data) {
            let totalSales = 0;
            let totalTransactions = data.length;
            let totalItems = 0;

            data.forEach(sale => {
                totalSales += parseFloat(sale.total || 0);
                // Count items from sale.items array (items are now saved with each sale)
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        totalItems += parseInt(item.qty || 0);
                    });
                } else if (sale.items && typeof sale.items === 'object') {
                    // Handle case where items might be stored as object instead of array
                    Object.values(sale.items).forEach(item => {
                        totalItems += parseInt(item.qty || 0);
                    });
                }
            });

            const avgSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

            document.getElementById('today-sales').textContent = '₱' + totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('today-transactions').textContent = totalTransactions;
            document.getElementById('avg-sale').textContent = '₱' + avgSale.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('total-items').textContent = totalItems;
        }

        // Render Sales List
        function renderSalesList(data) {
            const container = document.getElementById('sales-list');

            if (data.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 60px 40px; color: #64748b; font-size: 1.1rem; font-weight: 600;">📭 No sales found for this period</div>';
                return;
            }

            container.innerHTML = data.map((sale, index) => {
                const date = new Date(sale.timestamp || sale.date);
                const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                const itemsCount = sale.items ? (Array.isArray(sale.items) ? sale.items.length : Object.values(sale.items).length) : 0;
                const total = parseFloat(sale.total || 0);
                const paymentMethod = sale.paymentMethod || 'Cash';
                const tableNum = sale.table || 'Takeout';

                // Payment method color coding
                let paymentColor = '#3b82f6';
                if (paymentMethod === 'Card') paymentColor = '#8b5cf6';
                else if (paymentMethod === 'GCash') paymentColor = '#10b981';
                else if (paymentMethod.includes('Credit')) paymentColor = '#f59e0b';

                return `
                    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%); border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid rgba(61, 69, 86, 0.6); backdrop-filter: blur(10px); transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 20px; align-items: center;">
                            <!-- Left: Amount & Details -->
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="font-weight: 900; font-size: 1.8rem; color: #3b82f6; letter-spacing: -1px;">₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                                    <span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.85rem;">📍 ${tableNum}</span>
                                    <span style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.85rem;">📦 ${itemsCount} items</span>
                                </div>
                            </div>

                            <!-- Payment Method Badge -->
                            <div style="text-align: center;">
                                <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Payment</div>
                                <div style="background: ${paymentColor}20; color: ${paymentColor}; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: 1px solid ${paymentColor}40;">${paymentMethod}</div>
                            </div>

                            <!-- Date -->
                            <div style="text-align: center;">
                                <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Date</div>
                                <div style="color: #e2e8f0; font-weight: 700; font-size: 0.95rem;">${dateStr}</div>
                                <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">${timeStr}</div>
                            </div>

                            <!-- Items List -->
                            <div style="text-align: center;">
                                <div style="font-size: 0.85rem; color: #94a3b8; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Items</div>
                                <div style="color: #cbd5e1; font-size: 0.85rem; max-height: 60px; overflow-y: auto; line-height: 1.4;">
                                    ${sale.items ? (Array.isArray(sale.items) ? sale.items.map(item => `<div>${item.name} ×${item.qty}</div>`).join('') : Object.values(sale.items).map(item => `<div>${item.name} ×${item.qty}</div>`).join('')) : '<span style="opacity: 0.5;">No items</span>'}
                                </div>
                            </div>

                            <!-- Reprint Button -->
                            <button class="sales-reprint-btn" data-sale-id="${sale.id}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 14px 20px; border-radius: 12px; cursor: pointer; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; white-space: nowrap; height: 50px; display: flex; align-items: center; gap: 8px;">🖨️ Reprint</button>
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('.sales-reprint-btn').forEach(btn => {
                btn.onclick = () => reprintReceiptForSale(btn.dataset.saleId);
                btn.onmouseover = () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                };
                btn.onmouseout = () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                };
            });
        }

        // Reset Sales Data
        function resetSalesData() {
            if (!confirm('⚠️ WARNING: This will permanently delete ALL sales data!\n\nThis action cannot be undone. Are you sure you want to reset all sales records?')) {
                return;
            }
            
            // Delete all sales data from Firebase Realtime Database (v9/v10 SDK)
            if (navigator.onLine) {
                db.ref('sales/' + CURRENT_BRANCH).remove()
                    .then(() => {
                        console.log('Firebase sales data deleted successfully');
                    })
                    .catch((error) => {
                        console.error('Firebase delete error:', error);
                    });
            }

            // Clear local sales data
            localStorage.removeItem('pos_sales_history');
            localStorage.removeItem('pending_sales');

            // Reset sales data array
            salesData = [];

            // Reset summary display
            document.getElementById('today-sales').textContent = '₱0.00';
            document.getElementById('today-transactions').textContent = '0';
            document.getElementById('avg-sale').textContent = '₱0.00';
            document.getElementById('total-items').textContent = '0';

            // Clear sales list
            document.getElementById('sales-list').innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No sales found for this period</div>';

            showNotification('🗑️ All sales data has been reset!');
        }

        // Print Daily Sales Report with Manual GrabFood and Expenses
        async function printDailySalesReport() {
            // Get today's date
            const today = new Date();
            const todayStr = today.toDateString();

            // Filter sales for today
            const todaySales = salesData.filter(sale => {
                const saleDate = new Date(sale.timestamp || sale.date);
                return saleDate.toDateString() === todayStr;
            });

            if (todaySales.length === 0) {
                alert("No sales found for today!");
                return;
            }

            // Show modal to input GrabFood and Expenses
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); display: flex; align-items: center;
                    justify-content: center; z-index: 10000;
                `;
                modal.innerHTML = `
                    <div style="background: #1e293b; color: #f8fafc; padding: 30px; border-radius: 12px; width: 90%; max-width: 400px;">
                        <h2 style="margin-top: 0;">Daily Sales Report</h2>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">GrabFood Sales (₱)</label>
                            <input type="number" id="input-grabfood" placeholder="Enter GrabFood sales" value="0" min="0" step="0.01" 
                                style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Daily Expenses (₱)</label>
                            <input type="number" id="input-expenses" placeholder="Enter daily expenses" value="0" min="0" step="0.01"
                                style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; box-sizing: border-box;">
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                style="flex: 1; padding: 10px; background: #475569; color: #f8fafc; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                            <button id="btn-generate-report" 
                                style="flex: 1; padding: 10px; background: #22c55e; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Generate Report</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                document.getElementById('btn-generate-report').onclick = async () => {
                    const grabFoodSales = parseFloat(document.getElementById('input-grabfood').value) || 0;
                    const dailyExpenses = parseFloat(document.getElementById('input-expenses').value) || 0;
                    modal.remove();
                    
                    // Calculate totals
                    let totalSales = 0;
                    let totalServiceCharge = 0;
                    let totalDiscounts = 0;
                    let totalTransactions = todaySales.length;
                    let totalItems = 0;
                    let cashPayments = 0;
                    let cardPayments = 0;

                    todaySales.forEach(sale => {
                        const saleTotal = parseFloat(sale.total || 0);
                        const sc = parseFloat(sale.serviceCharge || 0);
                        const discount = parseFloat(sale.discount || 0);
                        
                        totalSales += saleTotal;
                        totalServiceCharge += sc;
                        totalDiscounts += discount;

                        if (sale.items) {
                            sale.items.forEach(item => {
                                totalItems += parseInt(item.qty || 0);
                            });
                        }

                        // Count payment methods
                        const method = sale.method || sale.paymentMethod || 'Cash';
                        if (method.toLowerCase().includes('cash')) {
                            cashPayments += saleTotal;
                        } else if (method.toLowerCase().includes('card')) {
                            cardPayments += saleTotal;
                        }
                    });

                    const netSales = totalSales - totalDiscounts - totalServiceCharge;
                    const totalSalesWithGrabFood = netSales + grabFoodSales;
                    const overallSales = totalSalesWithGrabFood - dailyExpenses;

                    // Format report for Bluetooth printing
                    const now = new Date();
                    const reportTime = now.toLocaleString('en-PH');
                    const sName = localStorage.getItem('store-name') || "SANGKALAN RESTAURANT";
                    const sBranch = localStorage.getItem('store-branch') || "West Avenue Branch";

                    let report = "";
                    report += `      ${sName.toUpperCase()} ${sBranch}\n`;
                    report += `--------------------------------\n`;
                    report += `      DAILY SALES REPORT\n`;
                    report += `      ${today.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
                    report += `--------------------------------\n`;
                    report += `REPORT GENERATED: ${reportTime}\n`;
                    report += `--------------------------------\n`;
                    report += `TOTAL SALES:        ${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `LESS: DISCOUNTS:    ${totalDiscounts.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `LESS: SERVICE CHG:  ${totalServiceCharge.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `NET SALES:          ${netSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `ADD: GRABFOOD:      ${grabFoodSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `--------------------------------\n`;
                    report += `SUBTOTAL:           ${totalSalesWithGrabFood.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `LESS: EXPENSES:     ${dailyExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `================================\n`;
                    report += `OVERALL SALES:   >> P ${overallSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <<\n`;
                    report += `================================\n`;
                    report += `TRANSACTIONS: ${totalTransactions}\n`;
                    report += `ITEMS SOLD: ${totalItems}\n`;
                    report += `AVG SALE: ${(totalTransactions > 0 ? netSales / totalTransactions : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `--------------------------------\n`;
                    report += `PAYMENT BREAKDOWN:\n`;
                    report += `CASH:       ${cashPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    report += `CARD:       ${cardPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    if (grabFoodSales > 0) {
                        report += `GRABFOOD:   ${grabFoodSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                    }
                    report += `--------------------------------\n`;
                    report += `TRANSACTION DETAILS:\n`;
                    report += `--------------------------------\n`;

                    todaySales.forEach((sale, index) => {
                        const saleTime = new Date(sale.timestamp || sale.date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                        const tableNum = sale.table || 'Takeout';
                        const method = sale.method || sale.paymentMethod || 'Cash';
                        const total = parseFloat(sale.total || 0);
                        const sc = parseFloat(sale.serviceCharge || 0);
                        const netAmount = total - sc;

                        report += `${index + 1}. ${saleTime} ${tableNum}\n`;
                        report += `   ${method}: ${total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;

                        if (sale.discount > 0) {
                            const discountLabel = sale.discountLabel || 'DISCOUNT';
                            report += `   ${discountLabel}: -${sale.discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                        }

                        if (sc > 0) {
                            report += `   SC: ${sc.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                            report += `   Net: ${netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
                        }

                        if (sale.items && sale.items.length > 0) {
                            const itemsText = sale.items.map(item => `${item.name}x${item.qty}`).join(', ');
                            report += `   Items: ${itemsText}\n`;
                        }
                        report += `--------------------------------\n`;
                    });

                    report += `      END OF REPORT\n`;
                    report += `   THANK YOU FOR YOUR BUSINESS\n`;

                    // Print via Bluetooth
                    if (!bleCharacteristic) {
                        try {
                            await connectBluetooth();
                        } catch (err) {
                            alert("Failed to connect to Bluetooth printer: " + err.message);
                            resolve();
                            return;
                        }
                    }

                    if (bleCharacteristic) {
                        try {
                            // Apply ESC/POS styling for proper paper formatting (same as receipt prints)
                            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
                            const styledReport = applyEscPosStyle(report, savedSettings);
                            await sendToBluetooth(styledReport);
                            showNotification('✅ Daily sales report printed successfully!');
                        } catch (e) {
                            console.log("Print error:", e);
                            alert("Failed to print report. Please check Bluetooth connection.");
                        }
                    } else {
                        alert("Bluetooth printer not connected. Please connect first.");
                    }
                    
                    resolve();
                };
            });
        }

        // Function to generate styled HTML receipt using the template
        // Generate fixed-width text receipt for thermal printer (applies all print style settings)
        async function generateFixedWidthReceipt(type = 'soa') {
            if (!selectedTable || cart.length === 0) {
                return null;
            }

            if (!tableSR[selectedTable]) {
                await assignOrGetTableSR(selectedTable);
            }

            const res = calculate();
            const now = new Date();
            const storeName = "SANGKALAN RESTAURANT";
            const storeBranch = localStorage.getItem('store-branch') || "West Ave Branch";
            const storeAddress = localStorage.getItem('store-address') || "41 West Avenue Brgy. Nayong Kanluran";
            const storeCity = localStorage.getItem('store-city') || "Quezon City";
            const storePhone = localStorage.getItem('store-phone') || "+639681455724";
            const cashierName = localStorage.getItem('store-cashier') || "Romeo Butch";

            // Use the assigned sequential SR number for paper output
            let billNo = tableSR[selectedTable] || tableBillNumbers[selectedTable] || 'SR-PENDING';

            const dateTimeStr = now.toLocaleDateString('en-PH', { year: '2-digit', month: '2-digit', day: '2-digit' }) + ' ' + 
                               now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

            // Get saved print style settings from localStorage (applied to ALL print outputs)
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            const dividerStyle = savedSettings.dividerStyle || 'dashed';
            const paperWidth = savedSettings.paperWidth || '80mm';
            const fontFamily = savedSettings.fontFamily || 'Courier New';
            
            // Log settings being applied for debugging
            console.log('Applying Print Style Settings to Text Output:', {
                dividerStyle,
                paperWidth,
                fontFamily,
                backgroundColor: savedSettings.backgroundColor,
                textColor: savedSettings.textColor,
                dividerColor: savedSettings.dividerColor
            });

            // Calculate character width based on paper size
            let CHAR_WIDTH = 32; // Default 80mm
            if (paperWidth === '58mm') {
                CHAR_WIDTH = 23;
            } else if (paperWidth === '80mm') {
                CHAR_WIDTH = 32;
            } else if (paperWidth === '100mm') {
                CHAR_WIDTH = 40;
            } else if (paperWidth === '120mm') {
                CHAR_WIDTH = 48;
            }

            // Debug: Log the centering calculation
            console.log('Receipt Generation Debug:', {
                paperWidth,
                CHAR_WIDTH,
                storeName: storeName.toUpperCase(),
                storeNameLength: storeName.toUpperCase().length,
                centeredExample: ' '.repeat(Math.floor((CHAR_WIDTH - storeName.toUpperCase().length) / 2)) + storeName.toUpperCase()
            });
            
            // Create dividers based on print style settings
            let DIVIDER, DIVIDER_DASHED;
            if (dividerStyle === 'solid') {
                DIVIDER = '='.repeat(CHAR_WIDTH);
                DIVIDER_DASHED = '='.repeat(CHAR_WIDTH);
            } else if (dividerStyle === 'dotted') {
                DIVIDER = '.'.repeat(CHAR_WIDTH);
                DIVIDER_DASHED = '.'.repeat(CHAR_WIDTH);
            } else { // dashed (default)
                DIVIDER = '-'.repeat(CHAR_WIDTH);
                DIVIDER_DASHED = '-'.repeat(CHAR_WIDTH);
            }

            // Helper function to center text
            const center = (text, width = CHAR_WIDTH) => {
                const padding = Math.max(0, width - text.length);
                const left = Math.floor(padding / 2);
                const right = padding - left;
                return ' '.repeat(left) + text + ' '.repeat(right);
            };

            // Helper function for left padding
            const leftPad = (text, width = CHAR_WIDTH) => {
                return text.padEnd(width);
            };

            // Helper function for right padding
            const rightPad = (text, width = CHAR_WIDTH) => {
                const padding = Math.max(0, width - text.length);
                return ' '.repeat(padding) + text;
            };

            // Build receipt text - thermal printer format (adjusted for paper width)
            let receiptText = '\n';
            // HIGHLIGHTED RESTAURANT NAME (BIGGER & PROMINENT) - no decorative characters
            receiptText += DIVIDER + '\n';

            // Debug the centering
            const centeredName = center(storeName.toUpperCase());
            console.log('Centering Debug:', {
                storeName: storeName.toUpperCase(),
                nameLength: storeName.toUpperCase().length,
                CHAR_WIDTH,
                centeredName,
                centeredLength: centeredName.length,
                expectedLength: CHAR_WIDTH
            });

            receiptText += centeredName + '\n';
            receiptText += center('Where Great Food Begins...') + '\n';
            receiptText += DIVIDER + '\n\n';
            receiptText += center(storeBranch.substring(0, CHAR_WIDTH)) + '\n';
            receiptText += center(storeAddress.substring(0, CHAR_WIDTH)) + '\n';
            receiptText += center(storeCity.substring(0, CHAR_WIDTH)) + '\n';
            receiptText += center(storePhone.substring(0, CHAR_WIDTH)) + '\n';
            receiptText += center('This document is not valid for') + '\n';
            receiptText += center('claiming of input tax') + '\n';
            receiptText += center('YOUR BILL') + '\n';
            receiptText += DIVIDER_DASHED + '\n';
            receiptText += center(dateTimeStr) + '\n';
            receiptText += center('SR #: ' + billNo) + '\n';
            receiptText += 'Table: ' + selectedTable.padEnd(CHAR_WIDTH - 7) + '\n';
            receiptText += 'Cashier: ' + cashierName.substring(0, CHAR_WIDTH - 9).padEnd(CHAR_WIDTH - 9) + '\n';
            receiptText += DIVIDER_DASHED + '\n';

            // Item header with dynamic column alignment based on paper width
            const itemCol = Math.floor(CHAR_WIDTH * 0.5);
            const rateCol = Math.floor(CHAR_WIDTH * 0.2);
            const qtyCol = Math.floor(CHAR_WIDTH * 0.15);
            const amtCol = CHAR_WIDTH - itemCol - rateCol - qtyCol;

            const header = 'Item'.padEnd(itemCol) + 'Rate'.padStart(rateCol - 1) + ' ' + 'Qty'.padStart(qtyCol - 1) + ' ' + 'Amt'.padStart(amtCol - 1);
            receiptText += header.substring(0, CHAR_WIDTH) + '\n';
            receiptText += DIVIDER_DASHED + '\n';

            // Items with dynamic column alignment
            cart.forEach(item => {
                const itemTotal = item.price * item.qty;
                
                // Item name column
                let itemName = item.name.substring(0, itemCol).padEnd(itemCol);
                if (item.name.length > itemCol) {
                    itemName = item.name.substring(0, itemCol - 2).padEnd(itemCol - 2) + '..';
                }
                
                // Rate column - use formatRatePrice to remove .00 for whole numbers
                const rateStr = formatRatePrice(item.price);
                const rate = rateStr.padStart(rateCol - 1);
                
                // Qty column
                const qty = item.qty.toString().padStart(qtyCol - 1);
                
                // Amount column - right-align within amtCol width
                const amountStr = formatNumber(itemTotal);
                const amount = amountStr.padStart(amtCol - 1);
                
                const line = itemName + rate + ' ' + qty + ' ' + amount;
                receiptText += line.substring(0, CHAR_WIDTH) + '\n';
            });

            receiptText += DIVIDER + '\n';
            
            // Summary section
            const summaryLabelWidth = Math.floor(CHAR_WIDTH * 0.8);
            const summaryValueWidth = CHAR_WIDTH - summaryLabelWidth;
            
            const itemsLabel = 'Items:';
            const itemsValue = cart.length.toString();
            receiptText += itemsLabel.padEnd(summaryLabelWidth) + itemsValue.padStart(summaryValueWidth) + '\n';
            
            const subtotalLabel = 'Subtotal:';
            const subtotalValue = formatNumber(res.subtotal);
            const subLine = subtotalLabel.padEnd(CHAR_WIDTH - subtotalValue.length) + subtotalValue;
            receiptText += subLine.substring(0, CHAR_WIDTH) + '\n';

            if (res.disc > 0) {
                const discLabel = currentDiscount.label;
                const discValue = '-' + formatNumber(res.disc);
                const discLine = discLabel.substring(0, summaryLabelWidth).padEnd(CHAR_WIDTH - discValue.length) + discValue;
                receiptText += discLine.substring(0, CHAR_WIDTH) + '\n';
            }

            if (res.autoSC > 0) {
                // Display service charge with percentage prominently
                const scLabel = `SERVICE CHARGE (${res.scPercent}%)`;
                const scValue = formatNumber(res.autoSC);
                const scLine = scLabel.padEnd(CHAR_WIDTH - scValue.length) + scValue;
                receiptText += scLine.substring(0, CHAR_WIDTH) + '\n';
            }

            receiptText += DIVIDER_DASHED + '\n';
            
            // Total - ensure it fits on one line with P sign and all digits
            const totalLabel = 'TOTAL';
            const totalAmount = formatNumber(res.total);
            const totalWithP = 'P' + totalAmount;
            // Right-align the total amount to end of line
            const totalLine = totalLabel.padEnd(CHAR_WIDTH - totalWithP.length) + totalWithP;
            receiptText += totalLine.substring(0, CHAR_WIDTH) + '\n';
            
            if (type !== 'soa') {
                // Get payment details from form
                const tendered = parseFloat(document.getElementById('m-tendered')?.value) || 0;
                let payMethod = document.getElementById('m-method')?.value || 'Cash';
                const change = tendered - res.total;
                
                // Format payment method for better display (shorten to fit on one line)
                const formatPaymentMethod = (method) => {
                    const paymentMap = {
                        'Cash': 'Cash',
                        'GCash': 'GCash',
                        'Debit (Visa)': 'Debit Visa',
                        'Debit (Mastercard)': 'Debit MC',
                        'Credit (Visa)': 'Credit Visa',
                        'Credit (Mastercard)': 'Credit MC',
                        'Bank Transfer': 'Bank Transfer'
                    };
                    return paymentMap[method] || method;
                };
                payMethod = formatPaymentMethod(payMethod);
                
                receiptText += DIVIDER_DASHED + '\n';
                receiptText += 'Amount Received'.padEnd(summaryLabelWidth) + ('P' + formatNumber(tendered)).padStart(summaryValueWidth) + '\n';
                receiptText += 'Payment Method'.padEnd(summaryLabelWidth) + payMethod.substring(0, summaryValueWidth).padStart(summaryValueWidth) + '\n';
                // Show change only if payment method is cash
                if (payMethod === 'Cash') {
                    receiptText += 'Change'.padEnd(summaryLabelWidth) + ('P' + formatNumber(change)).padStart(summaryValueWidth) + '\n';
                }
                receiptText += DIVIDER_DASHED + '\n\n';
            } else {
                receiptText += DIVIDER_DASHED + '\n\n';
            }
            receiptText += center('Thank You') + '\n';
            receiptText += center('Visit Again') + '\n';
            receiptText += center('Powered by') + '\n';
            receiptText += center('CMPP FOOD CORP.') + '\n';

            return receiptText;
        }

        async function generateStyledHTMLReceipt(type = 'soa') {
            const receiptText = await generateFixedWidthReceipt(type);
            if (!receiptText) return null;

            // Get saved style settings or use defaults
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            const bgColor = savedSettings.backgroundColor || '#ffffff';
            const textColor = savedSettings.textColor || '#000000';
            const dividerColor = savedSettings.dividerColor || '#000000';
            const dividerStyle = savedSettings.dividerStyle || 'dashed';
            const fontFamily = savedSettings.fontFamily || 'Courier New';
            const headerSize = savedSettings.headerSize || '1.4rem';
            const bodySize = savedSettings.bodySize || '0.9rem';
            const padding = savedSettings.padding || '20px';
            const paperWidth = savedSettings.paperWidth || '80mm';
            const storeName = (localStorage.getItem('store-name') || 'SANGKALAN RESTAURANT').toUpperCase().trim();
            
            // Log for debugging
            console.log('Applied Settings:', {
                headerSize, bodySize, dividerStyle, paperWidth,
                bgColor, textColor, fontFamily
            });
            
            // Convert paper width to pixel width or use custom value
            let width = savedSettings.width || '320px';
            if (paperWidth === '58mm') {
                width = '230px';
            } else if (paperWidth === '80mm') {
                width = '320px';
            } else if (paperWidth === '100mm') {
                width = '400px';
            } else if (paperWidth === '120mm') {
                width = '480px';
            } else if (paperWidth === 'custom') {
                width = savedSettings.width || '320px';
            }

            // Convert text receipt to HTML with proper monospace display optimized for thermal printer
            const lines = receiptText.split('\n');
            const renderLine = (line) => {
                const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
                if (!line.trim()) return '<br>';
                if (line.trim() === storeName) {
                    return `<div style="font-size: 1.5rem; font-weight: 900; letter-spacing: 0.6px; text-align: center;">${escaped}</div>`;
                }
                if (line.trim().startsWith('TOTAL')) {
                    return `<div class="no-wrap" style="font-size: 1.05rem; font-weight: 900;">${escaped}</div>`;
                }
                // Highlight payment-related lines (Amount Received, Payment Method, Change)
                if (line.includes('Amount Received') || line.includes('Payment Method') || line.includes('Change')) {
                    return `<div class="payment-highlight no-wrap">${escaped}</div>`;
                }
                // Add no-wrap to lines with amounts (Subtotal, Discount, Service Charge, Additional Charges)
                if (line.includes('Subtotal') || line.includes('DISCOUNT') || line.includes('SERVICE CHARGE') || line.includes('ADDITIONAL CHARGES') || (/:\s+[\d.-]+$/.test(line))) {
                    return `<div class="no-wrap">${escaped}</div>`;
                }
                return `<div>${escaped}</div>`;
            };
            const renderedText = lines.map(renderLine).join('');

            const receiptHTML = `
                <style>
                    .receipt-container {
                        background-color: ${bgColor};
                        color: ${textColor};
                        font-family: 'Courier New', monospace;
                        width: ${width};
                        padding: ${padding};
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow-x: hidden;
                        font-size: ${bodySize};
                        line-height: 1.3;
                        letter-spacing: 0.5px;
                        margin: 0 auto;
                        box-sizing: border-box;
                        border: 1px solid ${dividerColor};
                    }
                    
                    .receipt-container strong {
                        font-weight: bold;
                    }
                    
                    .payment-highlight {
                        font-size: ${bodySize};
                    }
                    
                    .no-wrap {
                        white-space: nowrap !important;
                    }
                    
                    @media print {
                        .receipt-container {
                            width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            border: none !important;
                            background: white !important;
                            color: black !important;
                            white-space: pre-wrap !important;
                            word-wrap: break-word !important;
                            word-break: break-word !important;
                            overflow-wrap: break-word !important;
                        }
                        
                        .receipt-container div {
                            text-align: left !important;
                            text-overflow: clip !important;
                            white-space: pre-wrap !important;
                            word-wrap: break-word !important;
                            word-break: break-word !important;
                            overflow-wrap: break-word !important;
                        }
                        
                        /* Prevent amount and total lines from wrapping - display all digits */
                        .receipt-container .no-wrap {
                            white-space: nowrap !important;
                            overflow: visible !important;
                            word-wrap: normal !important;
                            word-break: normal !important;
                        }
                        
                        /* TOTAL line with bold - ensure single line display with all digits and P sign */
                        .receipt-container div[style*="font-weight: 900"].no-wrap {
                            white-space: nowrap !important;
                            overflow: visible !important;
                        }
                        
                        .receipt-container div[style*="text-align: center"] {
                            text-align: center !important;
                        }
                        
                        .receipt-container div[style*="text-align: right"] {
                            text-align: left !important;
                        }
                        
                        /* Highlight payment-related lines in print mode */
                        .receipt-container .payment-highlight {
                            font-size: 1.25rem !important;
                            font-weight: bold !important;
                            background-color: #f0f0f0 !important;
                            padding: 4px 0 !important;
                            border-top: 1px solid #999 !important;
                            border-bottom: 1px solid #999 !important;
                            margin: 2px 0 !important;
                        }
                    }
                </style>
                <div class="receipt-container">${renderedText}</div>
            `;
            return receiptHTML;
        }

        // Track edit mode state
        let receiptEditMode = false;
        let editableReceiptData = null;
        let soaOriginalData = null;
        let currentReceiptType = 'soa'; // Track whether showing SOA or payment receipt

        // Function to display the styled receipt in a modal
        async function showStyledReceipt(type = 'soa') {
            const receiptHTML = await generateStyledHTMLReceipt(type);
            if (!receiptHTML) {
                alert("No receipt data to display");
                return;
            }

            // Track the receipt type for later use in print function
            currentReceiptType = type;

            // Save original data for cancel operations
            soaOriginalData = JSON.parse(JSON.stringify(cart));

            receiptEditMode = false;
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = receiptHTML;
            
            // Update modal footer buttons
            updateReceiptModalButtons();
            document.getElementById('receipt-print-modal').style.display = 'flex';
        }

        // Update modal buttons based on edit mode
        function updateReceiptModalButtons() {
            const footer = document.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="btn-secondary" onclick="closeReceiptModal()">Close</button>
                <button class="btn-primary" onclick="printReceiptModal()">🖨️ Print Receipt</button>
            `;
        }

        // Enable edit mode
        function enableEditMode() {
            receiptEditMode = true;
            editableReceiptData = JSON.parse(JSON.stringify(cart));
            
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = generateEditableReceipt();
            updateReceiptModalButtons();
            
            // Setup drag and drop
            setupDragAndDrop();
        }

        // Generate editable receipt form
        function generateEditableReceipt() {
            const res = calculate();
            const storeName = localStorage.getItem('store-name') || "SANGKALAN RESTAURANT";
            const storeBranch = localStorage.getItem('store-branch') || "West Ave Branch";
            const storeAddress = localStorage.getItem('store-address') || "41 West Avenue Brgy. Nayong Kanluran, Quezon City";
            const storePhone = "+639681455724";
            const cashierName = localStorage.getItem('store-cashier') || "Romeo Butch";

            let itemsHTML = '';
            cart.forEach((item, index) => {
                itemsHTML += `
                    <div class="edit-item-row" draggable="true" data-index="${index}">
                        <div class="drag-handle">☰</div>
                        <input type="text" class="edit-item-name" value="${item.name}" placeholder="Item name" style="flex: 1;">
                        <input type="number" class="edit-item-price" value="${item.price}" placeholder="Price" style="width: 80px;">
                        <input type="number" class="edit-item-qty" value="${item.qty}" placeholder="Qty" style="width: 60px;">
                        <button onclick="removeReceiptItem(${index})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
                    </div>
                `;
            });

            return `
                <div style="padding: 15px; background: #f0f0f0; border-radius: 8px; max-height: 600px; overflow-y: auto;">
                    <div style="margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">Store Name:</label>
                        <input type="text" id="edit-store-name" value="${storeName}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        
                        <label style="display: block; font-weight: bold; margin-top: 10px; margin-bottom: 5px;">Branch:</label>
                        <input type="text" id="edit-store-branch" value="${storeBranch}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        
                        <label style="display: block; font-weight: bold; margin-top: 10px; margin-bottom: 5px;">Cashier:</label>
                        <input type="text" id="edit-cashier" value="${cashierName}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: bold; margin-bottom: 10px;">📦 Items (Drag to reorder):</label>
                        <div id="edit-items-list" style="background: white; padding: 10px; border-radius: 6px;">
                            ${itemsHTML}
                        </div>
                        <button onclick="addReceiptItem()" style="background: #22c55e; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px; width: 100%;">+ Add Item</button>
                    </div>

                    <div style="background: white; padding: 10px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>Subtotal:</span>
                            <strong>₱${formatNumber(res.subtotal)}</strong>
                        </div>
                        ${res.disc > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>${currentDiscount.label}:</span>
                            <strong>-₱${formatNumber(res.disc)}</strong>
                        </div>
                        ` : ''}
                        ${res.autoSC > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; border-top: 1px solid #ddd; padding-top: 5px;">
                            <span>SERVICE CHARGE (${scPercent}%):</span>
                            <strong>₱${formatNumber(res.autoSC)}</strong>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.2rem; font-weight: bold; border-top: 2px solid #000; padding-top: 10px;">
                            <span>TOTAL:</span>
                            <span>₱${formatNumber(res.total)}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add new item to receipt
        function addReceiptItem() {
            const newItem = {
                name: "New Item",
                price: 0,
                qty: 1
            };
            cart.push(newItem);
            
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = generateEditableReceipt();
            setupDragAndDrop();
        }

        // Remove item from receipt
        function removeReceiptItem(index) {
            cart.splice(index, 1);
            
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = generateEditableReceipt();
            setupDragAndDrop();
        }

        // Setup drag and drop for items
        function setupDragAndDrop() {
            const itemsList = document.getElementById('edit-items-list');
            let draggedElement = null;

            itemsList.addEventListener('dragstart', function(e) {
                draggedElement = e.target.closest('.edit-item-row');
                draggedElement.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            });

            itemsList.addEventListener('dragend', function(e) {
                if (draggedElement) {
                    draggedElement.style.opacity = '1';
                    draggedElement = null;
                }
            });

            itemsList.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = getDragAfterElement(itemsList, e.clientY);
                if (afterElement == null) {
                    itemsList.appendChild(draggedElement);
                } else {
                    itemsList.insertBefore(draggedElement, afterElement);
                }
            });
        }

        // Helper function for drag and drop
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.edit-item-row:not(.dragging)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        // Save receipt edits and return to preview
        async function saveReceiptEdits() {
            // Update cart from edited values
            const editItems = document.querySelectorAll('.edit-item-row');
            const updatedCart = [];
            
            editItems.forEach(row => {
                const name = row.querySelector('.edit-item-name').value;
                const price = parseFloat(row.querySelector('.edit-item-price').value) || 0;
                const qty = parseInt(row.querySelector('.edit-item-qty').value) || 1;
                
                if (name.trim()) {
                    updatedCart.push({ name, price, qty });
                }
            });

            if (updatedCart.length === 0) {
                alert("Please add at least one item!");
                return;
            }

            // Update cart
            cart.length = 0;
            cart.push(...updatedCart);

            // Update localStorage
            localStorage.setItem('store-name', document.getElementById('edit-store-name').value);
            localStorage.setItem('store-branch', document.getElementById('edit-store-branch').value);
            localStorage.setItem('store-cashier', document.getElementById('edit-cashier').value);

            // Regenerate receipt preview
            receiptEditMode = false;
            const receiptHTML = await generateStyledHTMLReceipt('soa');
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = receiptHTML;
            updateReceiptModalButtons();
        }

        // Cancel edits - restore to original data
        async function cancelReceiptEdits() {
            receiptEditMode = false;
            // Restore original cart data
            if (soaOriginalData) {
                cart.length = 0;
                cart.push(...JSON.parse(JSON.stringify(soaOriginalData)));
            }
            const receiptHTML = await generateStyledHTMLReceipt('soa');
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = receiptHTML;
            updateReceiptModalButtons();
        }

        // Function to close the receipt modal
        function closeReceiptModal() {
            document.getElementById('receipt-print-modal').style.display = 'none';
            receiptEditMode = false;
        }

        // Function to convert receipt HTML to plain text for thermal printer
        async function convertReceiptHTMLToText(type = currentReceiptType) {
            // Generate fixed-width text receipt using ALL print style settings
            // This applies to BOTH Bluetooth and wired printer outputs and matches the modal template
            const receiptText = await generateFixedWidthReceipt(type);
            if (!receiptText) return '';

            // Log that settings are being applied to printer output
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            console.log('Sending receipt to printer with settings:', {
                receiptType: type,
                dividerStyle: savedSettings.dividerStyle || 'dashed',
                paperWidth: savedSettings.paperWidth || '80mm',
                fontFamily: savedSettings.fontFamily || 'Courier New',
                headerSize: savedSettings.headerSize || '1.4rem',
                bodySize: savedSettings.bodySize || '0.9rem'
            });

            return applyEscPosStyle(receiptText, savedSettings);
        }

        // Helper: Convert plain report text into ESC/POS style-aware text for thermal printer
        function applyEscPosStyle(receiptText, settings) {
            if (!receiptText) return '';

            // Map body size to ESC/POS text size for regular text
            const bodySize = parseFloat(settings.bodySize || '0.9');
            let bodySizeCode = 0x00; // normal
            if (bodySize >= 1.0 && bodySize < 1.4) {
                bodySizeCode = 0x10; // double width
            } else if (bodySize >= 1.4 && bodySize < 1.8) {
                bodySizeCode = 0x11; // double width and height
            } else if (bodySize >= 1.8 && bodySize < 2.4) {
                bodySizeCode = 0x22; // 3x width and height
            } else if (bodySize >= 2.4) {
                bodySizeCode = 0x33; // 4x width and height
            }

            // Map header size to ESC/POS text size for restaurant name
            const headerSize = parseFloat(settings.headerSize || '1.4');
            let headerSizeCode = 0x11; // default double width and height
            if (headerSize >= 1.0 && headerSize < 1.8) {
                headerSizeCode = 0x11; // double width and height
            } else if (headerSize >= 1.8 && headerSize < 2.4) {
                headerSizeCode = 0x22; // 3x width and height
            } else if (headerSize >= 2.4) {
                headerSizeCode = 0x33; // 4x width and height
            }

            // Choose divider character for visual on plain text
            const dividerStyle = settings.dividerStyle || 'dashed';
            let dividerChar = '-';
            if (dividerStyle === 'solid') dividerChar = '=';
            if (dividerStyle === 'dotted') dividerChar = '.';

            // Header styling: make restaurant name bold and larger
            let styledText = '';
            styledText += '\x1b\x40'; // Initialize printer

            const storeName = (localStorage.getItem('store-name') || 'SANGKALAN RESTAURANT').toUpperCase().trim();
            const lines = receiptText.split('\n');

            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (trimmedLine.toUpperCase() === storeName) {
                    // Center and enlarge the restaurant name for the top of the receipt
                    styledText += '\x1ba\x01'; // Center justify
                    styledText += '\x1b\x45\x01'; // Bold on
                    styledText += '\x1d\x21' + String.fromCharCode(headerSizeCode); // Header size
                    styledText += trimmedLine + '\n';
                    styledText += '\x1d\x21\x00'; // Back to normal size
                    styledText += '\x1b\x45\x00'; // Bold off
                    styledText += '\x1ba\x00'; // Back to left justify
                } else if (trimmedLine.startsWith('Subtotal:') && trimmedLine.includes('P')) {
                    // Keep subtotal size consistent with the receipt display
                    styledText += '\x1b\x45\x01'; // Bold on
                    styledText += '\x1d\x21\x00'; // Normal size
                    styledText += line + '\n';
                    styledText += '\x1b\x45\x00'; // Bold off
                } else if (trimmedLine.startsWith('TOTAL') && trimmedLine.includes('P')) {
                    // Make total stand out in a highlighted, larger regular style
                    styledText += '\x1b\x45\x01'; // Bold on
                    styledText += '\x1d\x21\x11'; // Double width and height
                    styledText += line + '\n';
                    styledText += '\x1d\x21\x00'; // back to normal
                    styledText += '\x1b\x45\x00'; // Bold off
                } else {
                    // default body text size for all other lines
                    styledText += '\x1d\x21' + String.fromCharCode(bodySizeCode);
                    styledText += line + '\n';
                }
            });

            // Add explicit style for divider in the text output
            if (dividerChar !== '-') {
                styledText = styledText.replace(/\n-+/g, '\n' + dividerChar.repeat(40));
            }

            // Reset to normal printer mode before sending
            styledText += '\x1b\x21\x00';
            styledText += '\x1dV\x00'; // Cut paper immediately after final line

            return styledText;
        }

        // DEBUG: Verify print style settings are working
        async function debugPrintSettings() {
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            const receiptText = await generateFixedWidthReceipt('soa');
            
            console.clear();
            console.log('╔════════════════════════════════════════╗');
            console.log('║    PRINT STYLE SETTINGS DEBUG INFO     ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('Saved Settings:', JSON.stringify(savedSettings, null, 2));
            console.log('\n📄 PRINT OUTPUT PREVIEW:\n');
            console.log(receiptText);
            console.log('\n═══════════════════════════════════════\n');
            
            // Show in alert as well for verification
            alert('✓ Print settings verified!\n\nCheck browser console (F12) for detailed output.\n\nSettings saved:\n- Divider Style: ' + (savedSettings.dividerStyle || 'dashed') + '\n- Paper Width: ' + (savedSettings.paperWidth || '80mm') + '\n- Font: ' + (savedSettings.fontFamily || 'Courier New'));
        }

        // View stored localStorage settings
        function viewStoredSettings() {
            const stored = localStorage.getItem('receiptTemplateStyle');
            if (!stored) {
                alert('⚠️ No print style settings found in localStorage.\n\nClick "Save" in Print Style Settings first!');
            } else {
                const settings = JSON.parse(stored);
                alert('✓ Stored Settings Found!\n\n' + JSON.stringify(settings, null, 2));
            }
        }

        // Function to print the receipt modal with current edited data
        // Ensures all print style settings are applied to BOTH Bluetooth and wired printers
        async function printReceiptModal() {
            // Regenerate receipt with current edited data
            if (receiptEditMode) {
                // Save edits first before printing
                await saveReceiptEditsForPrint();
            }

            // VERIFY SETTINGS EXIST BEFORE PRINTING
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            console.log('═══════════════════════════════════════════════');
            console.log('🖨️  PRINT RECEIPT - APPLYING SETTINGS');
            console.log('═══════════════════════════════════════════════');
            console.log('Saved Print Settings:', savedSettings);
            
            // Get receipt text content (with print style settings applied)
            const receiptText = await convertReceiptHTMLToText(currentReceiptType);
            if (!receiptText.trim()) {
                alert("No receipt data to print!");
                return;
            }

            // Apply ESC/POS styling for printer output
            const styledReceiptText = applyEscPosStyle(receiptText, savedSettings);

            // Get print style settings to verify they're being used
            const paperWidth = savedSettings.paperWidth || '80mm';
            const dividerStyle = savedSettings.dividerStyle || 'dashed';
            
            console.log('📋 Print Configuration:');
            console.log('   • Paper Width: ' + paperWidth);
            console.log('   • Divider Style: ' + dividerStyle);
            console.log('   • Font: ' + (savedSettings.fontFamily || 'Courier New'));
            console.log('═══════════════════════════════════════════════\n');

            let printed = false;
            let lastError = "";
            let newSaleData = null; // Store sale data to save after printing

            // For payment receipts, prepare the sale data first (but save AFTER printing)
            if (currentReceiptType === 'receipt' && selectedTable && cart.length > 0) {
                const res = calculate();
                const tableCurrentSR = tableSR[selectedTable] || 'SR-PENDING';
                const payMethod = document.getElementById('m-method')?.value || 'Cash';
                
                newSaleData = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    sr: tableCurrentSR,
                    table: selectedTable,
                    subtotal: res.subtotal,
                    discount: res.disc,
                    discountLabel: currentDiscount.label || 'DISCOUNT',
                    serviceCharge: res.autoSC,
                    additionalCharges: additionalCharges,
                    total: res.total,
                    method: payMethod,
                    items: cart,
                    branch: CURRENT_BRANCH
                };
            }

            // Step 1: Try Bluetooth first (with print style settings)
            if (bleCharacteristic) {
                try {
                    console.log('Sending to Bluetooth printer with paper width:', paperWidth);
                    await sendToBluetooth(styledReceiptText);
                    printed = true;
                    console.log("Receipt printed via Bluetooth with applied settings");
                    alert("✓ Bill printed successfully via Bluetooth!");
                } catch (e) {
                    lastError = "Bluetooth error: " + e.message;
                    console.log("Bluetooth print failed, trying wired...");
                }
            } else {
                lastError = "Bluetooth not connected";
            }

            // Step 2: If Bluetooth failed, try wired USB (with print style settings)
            if (!printed && wiredPort && wiredPort.opened) {
                try {
                    console.log('Sending to Wired printer with paper width:', paperWidth);
                    const success = await sendToWiredPrinter(styledReceiptText);
                    if (success) {
                        printed = true;
                        console.log("Receipt printed via Wired USB with applied settings");
                        alert("✓ Bill printed successfully via USB!");
                    } else {
                        lastError = "Wired print failed";
                    }
                } catch (e) {
                    lastError = "Wired USB error: " + e.message;
                    console.log("Wired print failed:", e);
                }
            }

            // Step 3: If both failed, fallback to browser print
            if (!printed) {
                console.log("No printer connected, using browser print");
                
                // For payment receipts, show styled HTML in print section instead of raw text
                if (currentReceiptType === 'receipt') {
                    const styledHTML = await generateStyledHTMLReceipt('receipt');
                    const printSec = document.getElementById('print-section');
                    printSec.innerHTML = styledHTML;
                    printSec.style.display = "block";
                    setTimeout(() => {
                        window.print();
                        printSec.style.display = "none";
                        printed = true;
                        // Save sale and clear table after browser print
                        if (newSaleData) saveAndClearPaymentReceipt(newSaleData);
                        closeReceiptModal();
                    }, 600);
                } else {
                    window.print();
                    closeReceiptModal();
                }
            }

            // Save sale and clear table after successful hardware print
            if (printed && newSaleData && currentReceiptType === 'receipt') {
                saveAndClearPaymentReceipt(newSaleData);
            }
        }

        // Helper function to save sale and clear table after payment
        function saveAndClearPaymentReceipt(newSaleData) {
            // Save Locally
            const salesHistory = JSON.parse(localStorage.getItem('pos_sales_history')) || [];
            salesHistory.push(newSaleData);
            localStorage.setItem('pos_sales_history', JSON.stringify(salesHistory));

            // SYNC TO CLOUD (REAL-TIME DASHBOARD) or LOCAL if offline
            if (navigator.onLine) {
                db.ref('sales/' + CURRENT_BRANCH).push(newSaleData);
            } else {
                const pendingSales = JSON.parse(localStorage.getItem('pending_sales')) || [];
                pendingSales.push(newSaleData);
                localStorage.setItem('pending_sales', JSON.stringify(pendingSales));
            }

            // Trigger local real-time update for sales.html
            localStorage.setItem('new_receipt', JSON.stringify(newSaleData));
            window.dispatchEvent(new StorageEvent('storage', { key: 'new_receipt', newValue: JSON.stringify(newSaleData) }));

            // Clear the table after saving
            handlePaymentCompletion();
        }

        // Handle table clearing and sale completion after payment receipt print
        function handlePaymentCompletion() {
            if (selectedTable && currentReceiptType === 'receipt') {
                const tableToClear = selectedTable;
                delete tableSessions[tableToClear];
                delete tableDiscounts[tableToClear];
                delete tableAdditionalCharges[tableToClear];
                if (tableBillNumbers[tableToClear]) {
                    delete tableBillNumbers[tableToClear];
                    localStorage.setItem('pos_table_bill_numbers', JSON.stringify(tableBillNumbers));
                }
                // Clear the SR number (archive with transaction)
                clearTableSR(tableToClear);
                
                selectedTable = null;
                cart = [];
                currentDiscount = { type: 'none', value: 0, label: 'No Discount' };
                additionalCharges = [];
                
                // Save state and refresh POS display
                saveState(); 
                renderTableChips(); 
                renderCart(); 
                renderMenu(); 
                updateTableDisplay();
                updateChargesDisplay();
                
                // Show success notification
                alert(`Table ${tableToClear} cleared and sale recorded.`);
            }
        }

        // Save edits and prepare for print
        async function saveReceiptEditsForPrint() {
            // Update cart from edited values
            const editItems = document.querySelectorAll('.edit-item-row');
            const updatedCart = [];
            
            editItems.forEach(row => {
                const name = row.querySelector('.edit-item-name').value;
                const price = parseFloat(row.querySelector('.edit-item-price').value) || 0;
                const qty = parseInt(row.querySelector('.edit-item-qty').value) || 1;
                
                if (name.trim()) {
                    updatedCart.push({ name, price, qty });
                }
            });

            // Update cart
            cart.length = 0;
            cart.push(...updatedCart);

            // Update localStorage
            localStorage.setItem('store-name', document.getElementById('edit-store-name').value);
            localStorage.setItem('store-branch', document.getElementById('edit-store-branch').value);
            localStorage.setItem('store-cashier', document.getElementById('edit-cashier').value);

            // Update receipt preview
            const receiptHTML = await generateStyledHTMLReceipt('soa');
            const receiptContent = document.getElementById('receipt-content');
            receiptContent.innerHTML = receiptHTML;
            receiptEditMode = false;
            updateReceiptModalButtons();
        }

        // Close modal when clicking outside
        document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('receipt-print-modal');
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeReceiptModal();
                    }
                });
            }
        });

        // Apply Text Size Presets
        function applyTextSizePreset(preset) {
            let headerSize, bodySize;
            
            switch(preset) {
                case 'tiny':
                    headerSize = 0.8;
                    bodySize = 0.6;
                    break;
                case 'small':
                    headerSize = 1.0;
                    bodySize = 0.7;
                    break;
                case 'medium':
                    headerSize = 1.4;
                    bodySize = 0.9;
                    break;
                case 'large':
                    headerSize = 1.8;
                    bodySize = 1.0;
                    break;
                case 'extra-large':
                    headerSize = 2.0;
                    bodySize = 1.2;
                    break;
                case 'xxl':
                    headerSize = 2.4;
                    bodySize = 1.4;
                    break;
                case 'huge':
                    headerSize = 2.8;
                    bodySize = 1.6;
                    break;
                default:
                    headerSize = 1.4;
                    bodySize = 0.9;
                    break;
            }
            
            // Update sliders
            document.getElementById('header-size').value = headerSize;
            document.getElementById('body-size').value = bodySize;
            
            // Update display values
            document.getElementById('header-size-value').textContent = headerSize + 'rem';
            document.getElementById('body-size-value').textContent = bodySize + 'rem';
            
            // Update button styles - highlight selected preset
            const presets = ['tiny', 'small', 'medium', 'large', 'extra-large', 'xxl', 'huge'];
            presets.forEach(p => {
                const btn = document.getElementById('preset-' + p);
                if (!btn) return;
                if (p === preset) {
                    btn.style.background = '#38bdf8';
                    btn.style.borderColor = '#38bdf8';
                    btn.style.color = '#000';
                } else {
                    let bgColor = '#334155';
                    let borderColor = '#334155';
                    let textColor = '#f8fafc';
                    
                    if (p === 'xxl') {
                        bgColor = '#e11d48';
                        borderColor = '#e11d48';
                        textColor = '#fff';
                    } else if (p === 'huge') {
                        bgColor = '#7c3aed';
                        borderColor = '#7c3aed';
                        textColor = '#fff';
                    }
                    
                    btn.style.background = bgColor;
                    btn.style.borderColor = borderColor;
                    btn.style.color = textColor;
                }
            });
        }

        // Show Print Style Settings Modal
        function showPrintStyleSettings() {
            const modal = document.createElement('div');
            modal.id = 'print-style-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Get stored settings or use defaults
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            const settings = {
                backgroundColor: savedSettings.backgroundColor || '#fff',
                textColor: savedSettings.textColor || '#000',
                dividerColor: savedSettings.dividerColor || '#000',
                dividerStyle: savedSettings.dividerStyle || 'dashed',
                fontFamily: savedSettings.fontFamily || 'Courier New',
                headerSize: savedSettings.headerSize || '1.4rem',
                bodySize: savedSettings.bodySize || '0.9rem',
                width: savedSettings.width || '320px',
                padding: savedSettings.padding || '20px',
                paperWidth: savedSettings.paperWidth || '80mm'
            };

            modal.innerHTML = `
                <div style="background: #1e293b; color: #f8fafc; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 1.5rem;">🎨 Print Style Settings</h2>
                    
                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Receipt Background Color:</label>
                        <input type="color" id="bg-color" value="${settings.backgroundColor}" style="width: 100%; height: 45px; border: none; border-radius: 6px; cursor: pointer;">
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Text Color:</label>
                        <input type="color" id="text-color" value="${settings.textColor}" style="width: 100%; height: 45px; border: none; border-radius: 6px; cursor: pointer;">
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Divider Color:</label>
                        <input type="color" id="divider-color" value="${settings.dividerColor}" style="width: 100%; height: 45px; border: none; border-radius: 6px; cursor: pointer;">
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Divider Style:</label>
                        <select id="divider-style" style="width: 100%; padding: 10px; border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px;">
                            <option value="solid" ${settings.dividerStyle === 'solid' ? 'selected' : ''}>Solid</option>
                            <option value="dashed" ${settings.dividerStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                            <option value="dotted" ${settings.dividerStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                        </select>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Font Family:</label>
                        <select id="font-family" style="width: 100%; padding: 10px; border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px;">
                            <option value="Courier New" ${settings.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                            <option value="Arial" ${settings.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                            <option value="Georgia" ${settings.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                            <option value="Verdana" ${settings.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                        </select>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">📏 Text Size Preset (Applies to Paper Output):</label>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
                            <button onclick="applyTextSizePreset('tiny')" id="preset-tiny" style="background: #334155; color: #f8fafc; padding: 8px; border: 2px solid #334155; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">Tiny</button>
                            <button onclick="applyTextSizePreset('small')" id="preset-small" style="background: #334155; color: #f8fafc; padding: 8px; border: 2px solid #334155; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">Small</button>
                            <button onclick="applyTextSizePreset('medium')" id="preset-medium" style="background: #38bdf8; color: #000; padding: 8px; border: 2px solid #38bdf8; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">Medium</button>
                            <button onclick="applyTextSizePreset('large')" id="preset-large" style="background: #334155; color: #f8fafc; padding: 8px; border: 2px solid #334155; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">Large</button>
                            <button onclick="applyTextSizePreset('extra-large')" id="preset-extra-large" style="background: #334155; color: #f8fafc; padding: 8px; border: 2px solid #334155; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">XL</button>
                            <button onclick="applyTextSizePreset('xxl')" id="preset-xxl" style="background: #e11d48; color: #fff; padding: 8px; border: 2px solid #e11d48; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">XXL</button>
                            <button onclick="applyTextSizePreset('huge')" id="preset-huge" style="background: #7c3aed; color: #fff; padding: 8px; border: 2px solid #7c3aed; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.7rem; transition: all 0.2s;">Huge</button>
                        </div>
                        <small style="color: #94a3b8; display: block; margin-top: 8px;">These sizes apply to both screen preview and paper print output</small>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Header Font Size: <span id="header-size-value">${settings.headerSize}</span></label>
                        <input type="range" id="header-size" min="1" max="2" step="0.1" value="${parseFloat(settings.headerSize)}" style="width: 100%;">
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Body Font Size: <span id="body-size-value">${settings.bodySize}</span></label>
                        <input type="range" id="body-size" min="0.7" max="1.2" step="0.1" value="${parseFloat(settings.bodySize)}" style="width: 100%;">
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Paper Width (Thermal Printer Size):</label>
                        <select id="paper-width" onchange="updatePaperWidthDisplay()" style="width: 100%; padding: 10px; border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px;">
                            <option value="58mm" ${settings.paperWidth === '58mm' ? 'selected' : ''}>58mm (Portable Printer)</option>
                            <option value="80mm" ${settings.paperWidth === '80mm' ? 'selected' : ''}>80mm (Standard Thermal)</option>
                            <option value="100mm" ${settings.paperWidth === '100mm' ? 'selected' : ''}>100mm (Wide Thermal)</option>
                            <option value="120mm" ${settings.paperWidth === '120mm' ? 'selected' : ''}>120mm (Extra Wide)</option>
                            <option value="custom" ${settings.paperWidth === 'custom' ? 'selected' : ''}>Custom Size</option>
                        </select>
                        <small id="paper-width-info" style="color: #94a3b8; display: block; margin-top: 5px;">Estimated width: 320px (32 characters)</small>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Receipt Width:</label>
                        <input type="text" id="receipt-width" value="${settings.width}" style="width: 100%; padding: 10px; border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px;">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">e.g., 280px, 320px, 360px</small>
                    </div>

                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 10px;">Receipt Padding:</label>
                        <input type="text" id="receipt-padding" value="${settings.padding}" style="width: 100%; padding: 10px; border: 1px solid #334155; background: #1e293b; color: #f8fafc; border-radius: 6px;">
                        <small style="color: #94a3b8; display: block; margin-top: 5px;">e.g., 10px, 15px, 20px</small>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-top: 25px;">
                        <button onclick="closePrintStyleModal()" style="background: #334155; color: #f8fafc; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                        <button onclick="resetPrintStyle()" style="background: #f59e0b; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🔄 Reset to 80mm</button>
                        <button onclick="testPrintStyleSettings()" style="background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🧪 Test Output</button>
                        <button onclick="savePrintStyle()" style="background: #22c55e; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">💾 Save</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Update initial paper width display
            updatePaperWidthDisplay();

            // Auto-highlight the appropriate text size preset
            const headerSizeNum = parseFloat(settings.headerSize);
            const bodySizeNum = parseFloat(settings.bodySize);
            let currentPreset = 'medium'; // default
            
            if (headerSizeNum === 0.8 && bodySizeNum === 0.6) {
                currentPreset = 'tiny';
            } else if (headerSizeNum === 1.0 && bodySizeNum === 0.7) {
                currentPreset = 'small';
            } else if (headerSizeNum === 1.4 && bodySizeNum === 0.9) {
                currentPreset = 'medium';
            } else if (headerSizeNum === 1.8 && bodySizeNum === 1.0) {
                currentPreset = 'large';
            } else if (headerSizeNum === 2.0 && bodySizeNum === 1.2) {
                currentPreset = 'extra-large';
            } else if (headerSizeNum === 2.4 && bodySizeNum === 1.4) {
                currentPreset = 'xxl';
            } else if (headerSizeNum === 2.8 && bodySizeNum === 1.6) {
                currentPreset = 'huge';
            }
            
            // Highlight the current preset
            setTimeout(function() {
                applyTextSizePreset(currentPreset);
            }, 50);

            // Update size values in real time
            document.getElementById('header-size').addEventListener('input', function() {
                document.getElementById('header-size-value').textContent = this.value + 'rem';
            });

            document.getElementById('body-size').addEventListener('input', function() {
                document.getElementById('body-size-value').textContent = this.value + 'rem';
            });

            // Close on outside click
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closePrintStyleModal();
                }
            });
        }

        function closePrintStyleModal() {
            const modal = document.getElementById('print-style-modal');
            if (modal) modal.remove();
        }

        function updatePaperWidthDisplay() {
            const paperWidth = document.getElementById('paper-width').value;
            const infoEl = document.getElementById('paper-width-info');
            
            let displayText = '';
            if (paperWidth === '58mm') {
                displayText = 'Estimated width: 230px (23 characters)';
            } else if (paperWidth === '80mm') {
                displayText = 'Estimated width: 320px (32 characters)';
            } else if (paperWidth === '100mm') {
                displayText = 'Estimated width: 400px (40 characters)';
            } else if (paperWidth === '120mm') {
                displayText = 'Estimated width: 480px (48 characters)';
            } else if (paperWidth === 'custom') {
                displayText = 'Use custom Receipt Width setting below';
            }
            
            infoEl.textContent = displayText;
        }

        function savePrintStyle() {
            const settings = {
                backgroundColor: document.getElementById('bg-color').value,
                textColor: document.getElementById('text-color').value,
                dividerColor: document.getElementById('divider-color').value,
                dividerStyle: document.getElementById('divider-style').value,
                fontFamily: document.getElementById('font-family').value,
                headerSize: document.getElementById('header-size').value + 'rem',
                bodySize: document.getElementById('body-size').value + 'rem',
                width: document.getElementById('receipt-width').value,
                padding: document.getElementById('receipt-padding').value,
                paperWidth: document.getElementById('paper-width').value
            };

            // SAVE SETTINGS
            localStorage.setItem('receiptTemplateStyle', JSON.stringify(settings));
            
            // VERIFY SETTINGS WERE SAVED BY READING THEM BACK
            const verification = JSON.parse(localStorage.getItem('receiptTemplateStyle'));
            console.log('╔════════════════════════════════════════╗');
            console.log('║ ✓ PRINT STYLE SETTINGS SAVED & VERIFIED ║');
            console.log('╚════════════════════════════════════════╝');
            console.log(verification);
            console.log('Settings will apply to next print output!');
            console.log('═════════════════════════════════════════\n');
            
            alert('✓ Print style settings saved successfully!\n\nSettings will apply to:\n✓ Paper Width: ' + settings.paperWidth + '\n✓ Divider Style: ' + settings.dividerStyle + '\n✓ Font: ' + settings.fontFamily + '\n\nTo see changes, print a receipt now!');
            closePrintStyleModal();
        }

        // TEST PRINT OUTPUT TO VERIFY SETTINGS ARE APPLIED
        async function testPrintStyleSettings() {
            const savedSettings = JSON.parse(localStorage.getItem('receiptTemplateStyle') || '{}');
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║  🧪 TEST PRINT - VERIFYING STYLE SETTINGS ARE APPLIED      ║');
            console.log('╚═══════════════════════════════════════════════════════════╝\n');
            
            // Generate a test receipt with current settings
            const testReceipt = await generateFixedWidthReceipt('test');
            
            console.log('\n✓ PRINT STYLE SETTINGS LOADED:');
            console.log(JSON.stringify(savedSettings, null, 2));
            console.log('\n✓ TEST RECEIPT OUTPUT (This is what will print):');
            console.log('\n' + testReceipt);
            console.log('\n╔═══════════════════════════════════════════════════════════╗');
            console.log('║  Check above output for:                                   ║');
            console.log('║  ✓ Divider style (= solid / - dashed / . dotted)          ║');
            console.log('║  ✓ Character width matches paper width (' + (savedSettings.paperWidth || '80mm') + ')    ║');
            console.log('║  ✓ Restaurant name highlighted with borders               ║');
            console.log('╚═══════════════════════════════════════════════════════════╝\n');
            
            alert('✓ Test receipt generated!\n\nCheck browser console (F12) for detailed output.\n\nYour print will look exactly like this!');
        }

        function resetPrintStyle() {
            // Reset to default 80mm settings
            const defaultSettings = {
                backgroundColor: '#fff',
                textColor: '#000',
                dividerColor: '#000',
                dividerStyle: 'dashed',
                fontFamily: 'Courier New',
                headerSize: '1.4rem',
                bodySize: '0.9rem',
                width: '320px',
                padding: '20px',
                paperWidth: '80mm'  // Ensure 80mm default
            };
            localStorage.setItem('receiptTemplateStyle', JSON.stringify(defaultSettings));
            alert('✓ Print styles reset to default 80mm settings!\n\nThis should fix centering issues.');
            closePrintStyleModal();
        }

    

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    