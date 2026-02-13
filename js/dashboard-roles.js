// COMPLETE UPDATED dashboard-roles.js
// Includes: Clear fare split + Complete ride feature

let currentUser = null;
let currentUserData = null;
let userRole = 'student';

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        initDashboard();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadUserData() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            userRole = currentUserData.role || 'student';
            
            if (userRole === 'admin') {
                window.location.href = 'admin.html';
                return;
            }
            
            updateGreeting();
            loadProfile();
            buildSidebarForRole();
            setupRoleBadge();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function updateGreeting() {
    const greeting = document.getElementById('userGreeting');
    if (greeting && currentUserData) {
        greeting.textContent = `Welcome, ${currentUserData.name}!`;
    }
}

function setupRoleBadge() {
    const badge = document.getElementById('userRoleBadge');
    if (badge) {
        badge.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        badge.className = `role-badge ${userRole}`;
    }
}

function buildSidebarForRole() {
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (!sidebarMenu) return;
    
    sidebarMenu.innerHTML = '';
    
    const menuItems = [
        { icon: '🏠', text: 'Home', section: 'home', roles: ['all'] },
        { icon: '🔍', text: 'Search Rides', section: 'search', roles: ['student'] },
        { icon: '➕', text: 'Post a Ride', section: 'post', roles: ['student', 'driver'] },
        { icon: '📋', text: 'My Rides', section: 'myrides', roles: ['all'] },
        { icon: '👤', text: 'Profile', section: 'profile', roles: ['all'] }
    ];
    
    menuItems.forEach(item => {
        if (item.roles.includes('all') || item.roles.includes(userRole)) {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'sidebar-item';
            link.dataset.section = item.section;
            if (item.section === 'home') link.classList.add('active');
            link.innerHTML = `<span>${item.icon}</span> ${item.text}`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(item.section);
            });
            sidebarMenu.appendChild(link);
        }
    });
}

function initDashboard() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                showToast('Error logging out', 'error');
            }
        });
    }

    if (userRole === 'student') {
        const searchRidesBtn = document.getElementById('searchRidesBtn');
        if (searchRidesBtn) {
            searchRidesBtn.addEventListener('click', () => {
                const destination = document.getElementById('searchDestination').value;
                const date = document.getElementById('searchDate').value;
                
                if (destination && date) {
                    searchRides(destination, date);
                } else {
                    showToast('Please enter destination and date', 'error');
                }
            });
        }
    }

    const postRideForm = document.getElementById('postRideForm');
    if (postRideForm) {
        const seatsInput = document.getElementById('rideSeats');
        const fareInput = document.getElementById('rideFare');
        const farePreview = document.getElementById('farePreview');

        // ⭐ UPDATED FARE CALCULATION WITH CLEAR EXPLANATION
        const updateFare = () => {
            const seats = parseInt(seatsInput.value) || 0;
            const fare = parseFloat(fareInput.value) || 0;
            
            if (seats > 0 && fare > 0) {
                const totalPeople = seats + 1; // +1 for the person posting (driver/student)
                const perPerson = fare / totalPeople;
                
                farePreview.innerHTML = `
                    <strong>Cost per person: ₹${perPerson.toFixed(2)}</strong><br>
                    <small style="color: #666; font-size: 0.9rem;">
                        ₹${fare} ÷ ${totalPeople} people (${seats} passengers + you) = ₹${perPerson.toFixed(2)} each
                    </small>
                `;
            } else {
                farePreview.innerHTML = '<strong>Cost per person:</strong> ₹0';
            }
        };

        seatsInput.addEventListener('input', updateFare);
        fareInput.addEventListener('input', updateFare);

        postRideForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await postRide();
        });
    }

    buildMyRidesTabs();
    loadStats();
    loadRecentContent();
    loadMyBookings();
    loadDriverRides();
}

// ⭐ UPDATED: Build tabs with "Completed" option
function buildMyRidesTabs() {
    const tabsContainer = document.getElementById('myRidesTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    if (userRole === 'student') {
        const bookingsTab = document.createElement('button');
        bookingsTab.className = 'tab-btn active';
        bookingsTab.dataset.tab = 'bookings';
        bookingsTab.textContent = 'My Bookings';
        bookingsTab.addEventListener('click', () => switchTab('bookings'));
        
        const driverTab = document.createElement('button');
        driverTab.className = 'tab-btn';
        driverTab.dataset.tab = 'driver';
        driverTab.textContent = 'As Driver';
        driverTab.addEventListener('click', () => switchTab('driver'));
        
        const completedTab = document.createElement('button');
        completedTab.className = 'tab-btn';
        completedTab.dataset.tab = 'completed';
        completedTab.textContent = '✓ Completed';
        completedTab.addEventListener('click', () => switchTab('completed'));
        
        tabsContainer.appendChild(bookingsTab);
        tabsContainer.appendChild(driverTab);
        tabsContainer.appendChild(completedTab);
        
        document.getElementById('bookingsTab').classList.add('active');
    } else if (userRole === 'driver') {
        const driverTab = document.createElement('button');
        driverTab.className = 'tab-btn active';
        driverTab.dataset.tab = 'driver';
        driverTab.textContent = 'Booking Requests';
        driverTab.addEventListener('click', () => switchTab('driver'));
        
        const completedTab = document.createElement('button');
        completedTab.className = 'tab-btn';
        completedTab.dataset.tab = 'completed';
        completedTab.textContent = '✓ Completed';
        completedTab.addEventListener('click', () => switchTab('completed'));
        
        tabsContainer.appendChild(driverTab);
        tabsContainer.appendChild(completedTab);
        
        document.getElementById('driverTab').classList.add('active');
    }
}

function switchSection(section) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}Section`).classList.add('active');

    if (section === 'myrides') {
        loadMyBookings();
        loadDriverRides();
    } else if (section === 'profile') {
        loadProfile();
    }
}

// ⭐ UPDATED: Switch tabs including completed
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'completed') {
        loadCompletedRides();
        let completedTab = document.getElementById('completedTab');
        if (!completedTab) {
            completedTab = document.createElement('div');
            completedTab.id = 'completedTab';
            completedTab.className = 'tab-content';
            document.getElementById('myridesSection').appendChild(completedTab);
        }
        completedTab.classList.add('active');
    } else {
        document.getElementById(`${tab}Tab`).classList.add('active');
    }
}

async function loadStats() {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = '';
    
    try {
        if (userRole === 'student') {
            const ridesSnapshot = await db.collection('rides')
                .where('status', '==', 'ACTIVE')
                .where('driverId', '!=', currentUser.uid)
                .get();
            
            const stat1 = createStatCard('Available Rides', ridesSnapshot.size, '🔍');
            statsGrid.appendChild(stat1);

            const bookingsSnapshot = await db.collection('bookings')
                .where('passengerId', '==', currentUser.uid)
                .get();
            
            const stat2 = createStatCard('My Bookings', bookingsSnapshot.size, '📋');
            statsGrid.appendChild(stat2);

            const myRidesSnapshot = await db.collection('rides')
                .where('driverId', '==', currentUser.uid)
                .get();
            
            const stat3 = createStatCard('Rides Posted', myRidesSnapshot.size, '🚗');
            statsGrid.appendChild(stat3);
            
        } else if (userRole === 'driver') {
            const myRidesSnapshot = await db.collection('rides')
                .where('driverId', '==', currentUser.uid)
                .get();
            
            const stat1 = createStatCard('My Rides', myRidesSnapshot.size, '🚗');
            statsGrid.appendChild(stat1);

            const pendingSnapshot = await db.collection('bookings')
                .where('driverId', '==', currentUser.uid)
                .where('status', '==', 'REQUESTED')
                .get();
            
            const stat2 = createStatCard('Pending Requests', pendingSnapshot.size, '⏳');
            statsGrid.appendChild(stat2);

            const acceptedSnapshot = await db.collection('bookings')
                .where('driverId', '==', currentUser.uid)
                .where('status', '==', 'ACCEPTED')
                .get();
            
            const stat3 = createStatCard('Confirmed', acceptedSnapshot.size, '✅');
            statsGrid.appendChild(stat3);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function createStatCard(title, value, icon) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
        <h4>${title}</h4>
        <p class="stat-number">${value}</p>
        <small>${icon}</small>
    `;
    return card;
}

async function loadRecentContent() {
    const container = document.getElementById('recentContent');
    const title = document.getElementById('recentTitle');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading...</div>';
    
    if (title) {
        title.textContent = userRole === 'student' ? 'Recent Rides' : 'Recent Requests';
    }

    try {
        if (userRole === 'student') {
            const snapshot = await db.collection('rides')
                .where('status', '==', 'ACTIVE')
                .where('driverId', '!=', currentUser.uid)
                .orderBy('driverId')
                .orderBy('dateTime', 'desc')
                .limit(3)
                .get();

            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state">No rides available</div>';
                return;
            }

            container.innerHTML = '';
            snapshot.forEach(doc => {
                const ride = doc.data();
                container.appendChild(createRideCard(ride, true));
            });
        } else if (userRole === 'driver') {
            const snapshot = await db.collection('bookings')
                .where('driverId', '==', currentUser.uid)
                .where('status', '==', 'REQUESTED')
                .orderBy('requestedAt', 'desc')
                .limit(3)
                .get();

            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state">No pending requests</div>';
                return;
            }

            container.innerHTML = '';
            for (const doc of snapshot.docs) {
                const booking = doc.data();
                const rideDoc = await db.collection('rides').doc(booking.rideId).get();
                if (rideDoc.exists) {
                    const ride = rideDoc.data();
                    container.appendChild(createBookingCard(booking, ride, true));
                }
            }
        }
    } catch (error) {
        console.error('Error loading recent content:', error);
        container.innerHTML = '<div class="empty-state">Error loading content</div>';
    }
}

async function searchRides(destination, date) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="loading">Searching rides...</div>';

    try {
        const snapshot = await db.collection('rides')
            .where('to', '==', destination)
            .where('date', '==', date)
            .where('status', '==', 'ACTIVE')
            .get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <p>No rides found for ${destination} on ${formatDate(date)}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const ride = doc.data();
            if (ride.driverId !== currentUser.uid) {
                container.appendChild(createRideCard(ride, true));
            }
        });
    } catch (error) {
        console.error('Error searching rides:', error);
        showToast('Error searching rides', 'error');
    }
}

function createRideCard(ride, showBookButton = true) {
    const card = document.createElement('div');
    card.className = 'ride-card';

    const canBook = ride.seatsAvailable > 0 && showBookButton && userRole === 'student';

    card.innerHTML = `
        <div class="ride-header">
            <div class="ride-route">${ride.from} → ${ride.to}</div>
            <div class="ride-price">₹${ride.farePerPerson.toFixed(0)}</div>
        </div>
        <div class="ride-info">
            <div class="ride-info-item">
                <strong>Date:</strong> ${ride.date}
            </div>
            <div class="ride-info-item">
                <strong>Time:</strong> ${ride.time}
            </div>
            <div class="ride-info-item">
                <strong>Driver:</strong> ${ride.driverName}
            </div>
            <div class="ride-info-item">
                <strong>Rating:</strong> ⭐ ${ride.driverRating.toFixed(1)}
            </div>
            <div class="ride-info-item">
                <strong>Seats:</strong> ${ride.seatsAvailable} available
            </div>
            ${ride.vehicleInfo ? `
            <div class="ride-info-item">
                <strong>Vehicle:</strong> ${ride.vehicleInfo}
            </div>
            ` : ''}
        </div>
        ${canBook ? `
        <div class="ride-actions">
            <button class="btn-primary" onclick="requestSeat('${ride.id}', '${ride.driverName}', ${ride.farePerPerson})">
                Request Seat
            </button>
        </div>
        ` : ''}
    `;

    return card;
}

window.requestSeat = async function(rideId, driverName, fareShare) {
    if (!confirm(`Request a seat on this ride?\nDriver: ${driverName}\nCost: ₹${fareShare.toFixed(0)}`)) {
        return;
    }

    try {
        const existing = await db.collection('bookings')
            .where('rideId', '==', rideId)
            .where('passengerId', '==', currentUser.uid)
            .get();

        if (!existing.empty) {
            showToast('You already have a booking for this ride', 'error');
            return;
        }

        const rideDoc = await db.collection('rides').doc(rideId).get();
        const ride = rideDoc.data();

        const bookingRef = db.collection('bookings').doc();
        await bookingRef.set({
            id: bookingRef.id,
            rideId: rideId,
            passengerId: currentUser.uid,
            passengerName: currentUserData.name,
            driverId: ride.driverId,
            status: 'REQUESTED',
            fareShare: fareShare,
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Seat requested! Wait for driver to accept', 'success');
        loadMyBookings();
    } catch (error) {
        console.error('Error requesting seat:', error);
        showToast('Error requesting seat', 'error');
    }
};

async function postRide() {
    const from = document.getElementById('rideFrom').value;
    const to = document.getElementById('rideTo').value;
    const date = document.getElementById('rideDate').value;
    const time = document.getElementById('rideTime').value;
    const seats = parseInt(document.getElementById('rideSeats').value);
    const fare = parseFloat(document.getElementById('rideFare').value);
    const vehicle = document.getElementById('rideVehicle').value;

    try {
        const rideRef = db.collection('rides').doc();
        const farePerPerson = fare / (seats + 1); // ⭐ Correct calculation: includes poster

        await rideRef.set({
            id: rideRef.id,
            driverId: currentUser.uid,
            driverName: currentUserData.name,
            from: from,
            to: to,
            date: date,
            time: time,
            dateTime: firebase.firestore.Timestamp.fromDate(new Date(date + ' ' + time)),
            seatsTotal: seats,
            seatsAvailable: seats,
            totalFare: fare,
            farePerPerson: farePerPerson,
            status: 'ACTIVE',
            vehicleInfo: vehicle || currentUserData.vehicleInfo || '',
            driverRating: currentUserData.rating,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Ride posted successfully!', 'success');
        document.getElementById('postRideForm').reset();
        document.getElementById('farePreview').innerHTML = '<strong>Cost per person:</strong> ₹0';
        loadStats();
        loadDriverRides();
    } catch (error) {
        console.error('Error posting ride:', error);
        showToast('Error posting ride', 'error');
    }
}

async function loadMyBookings() {
    const container = document.getElementById('myBookingsList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading bookings...</div>';

    try {
        const snapshot = await db.collection('bookings')
            .where('passengerId', '==', currentUser.uid)
            .where('status', 'in', ['REQUESTED', 'ACCEPTED'])
            .orderBy('requestedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">No active bookings</div>';
            return;
        }

        container.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const booking = doc.data();
            const rideDoc = await db.collection('rides').doc(booking.rideId).get();
            if (rideDoc.exists) {
                const ride = rideDoc.data();
                container.appendChild(createBookingCard(booking, ride, false));
            }
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<div class="empty-state">Error loading bookings</div>';
    }
}

async function loadDriverRides() {
    const container = document.getElementById('driverRidesList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading requests...</div>';

    try {
        const snapshot = await db.collection('bookings')
            .where('driverId', '==', currentUser.uid)
            .orderBy('requestedAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">No booking requests</div>';
            return;
        }

        container.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const booking = doc.data();
            if (booking.status === 'COMPLETED') continue; // Skip completed in active tab
            
            const rideDoc = await db.collection('rides').doc(booking.rideId).get();
            if (rideDoc.exists) {
                const ride = rideDoc.data();
                container.appendChild(createBookingCard(booking, ride, true));
            }
        }
    } catch (error) {
        console.error('Error loading driver rides:', error);
        container.innerHTML = '<div class="empty-state">Error loading requests</div>';
    }
}

// ⭐ UPDATED: Create booking card with complete button
function createBookingCard(booking, ride, isDriver) {
    const card = document.createElement('div');
    card.className = 'booking-card';

    const statusClass = `status-${booking.status.toLowerCase()}`;
    
    // Check if ride date has passed (for complete button)
    const rideDate = new Date(ride.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastRide = rideDate < today;

    card.innerHTML = `
        <span class="booking-status ${statusClass}">${booking.status}</span>
        ${ride.status === 'COMPLETED' ? '<span class="booking-status status-completed">✓ RIDE COMPLETED</span>' : ''}
        <div class="ride-route">${ride.from} → ${ride.to}</div>
        <div class="ride-info">
            <div class="ride-info-item">
                <strong>Date:</strong> ${ride.date} at ${ride.time}
            </div>
            <div class="ride-info-item">
                <strong>${isDriver ? 'Passenger' : 'Driver'}:</strong> ${isDriver ? booking.passengerName : ride.driverName}
            </div>
            <div class="ride-info-item">
                <strong>Your Share:</strong> ₹${booking.fareShare.toFixed(0)}
            </div>
        </div>
        ${isDriver && booking.status === 'REQUESTED' && ride.status === 'ACTIVE' ? `
        <div class="ride-actions" style="margin-top: 1rem;">
            <button class="btn-primary" onclick="acceptBooking('${booking.id}', '${booking.rideId}')">
                Accept
            </button>
            <button class="btn-secondary" onclick="rejectBooking('${booking.id}')">
                Reject
            </button>
        </div>
        ` : ''}
        ${!isDriver && (booking.status === 'REQUESTED' || booking.status === 'ACCEPTED') && ride.status === 'ACTIVE' ? `
        <div class="ride-actions" style="margin-top: 1rem;">
            <button class="btn-secondary" onclick="cancelBooking('${booking.id}', '${booking.rideId}', '${booking.status}')">
                Cancel Booking
            </button>
        </div>
        ` : ''}
        ${isDriver && booking.status === 'ACCEPTED' && ride.status === 'ACTIVE' && isPastRide ? `
        <div class="ride-actions" style="margin-top: 1rem;">
            <button class="btn-success" onclick="completeRide('${booking.rideId}')">
                ✓ Mark Ride as Completed
            </button>
        </div>
        ` : ''}
    `;

    return card;
}

window.acceptBooking = async function(bookingId, rideId) {
    if (!confirm('Accept this booking request?')) return;

    try {
        await db.collection('bookings').doc(bookingId).update({
            status: 'ACCEPTED',
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const rideDoc = await db.collection('rides').doc(rideId).get();
        const ride = rideDoc.data();
        await db.collection('rides').doc(rideId).update({
            seatsAvailable: ride.seatsAvailable - 1
        });

        showToast('Booking accepted!', 'success');
        loadDriverRides();
        loadStats();
    } catch (error) {
        console.error('Error accepting booking:', error);
        showToast('Error accepting booking', 'error');
    }
};

window.rejectBooking = async function(bookingId) {
    if (!confirm('Reject this booking request?')) return;

    try {
        await db.collection('bookings').doc(bookingId).update({
            status: 'REJECTED',
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Booking rejected', 'success');
        loadDriverRides();
    } catch (error) {
        console.error('Error rejecting booking:', error);
        showToast('Error rejecting booking', 'error');
    }
};

window.cancelBooking = async function(bookingId, rideId, currentStatus) {
    if (!confirm('Cancel your booking?')) return;

    try {
        await db.collection('bookings').doc(bookingId).update({
            status: 'CANCELLED'
        });

        if (currentStatus === 'ACCEPTED') {
            const rideDoc = await db.collection('rides').doc(rideId).get();
            const ride = rideDoc.data();
            await db.collection('rides').doc(rideId).update({
                seatsAvailable: ride.seatsAvailable + 1
            });
        }

        showToast('Booking cancelled', 'success');
        loadMyBookings();
        loadStats();
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Error cancelling booking', 'error');
    }
};

// ⭐ NEW: Complete Ride Function
window.completeRide = async function(rideId) {
    if (!confirm('Mark this ride as completed?\n\nThis will:\n- Update ride status to COMPLETED\n- Update all accepted bookings to COMPLETED\n- Increase rides completed count for you and all passengers')) {
        return;
    }

    try {
        const batch = db.batch();

        // 1. Update ride status
        const rideRef = db.collection('rides').doc(rideId);
        batch.update(rideRef, {
            status: 'COMPLETED',
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Get all ACCEPTED bookings
        const bookingsSnapshot = await db.collection('bookings')
            .where('rideId', '==', rideId)
            .where('status', '==', 'ACCEPTED')
            .get();

        // 3. Update all accepted bookings to COMPLETED
        bookingsSnapshot.forEach(doc => {
            batch.update(db.collection('bookings').doc(doc.id), {
                status: 'COMPLETED',
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // 4. Increment driver's rides completed count
        const driverRef = db.collection('users').doc(currentUser.uid);
        batch.update(driverRef, {
            ridesCompleted: firebase.firestore.FieldValue.increment(1)
        });

        // 5. Increment passengers' rides completed count
        for (const doc of bookingsSnapshot.docs) {
            const booking = doc.data();
            const passengerRef = db.collection('users').doc(booking.passengerId);
            batch.update(passengerRef, {
                ridesCompleted: firebase.firestore.FieldValue.increment(1)
            });
        }

        await batch.commit();

        showToast('✓ Ride marked as completed!', 'success');
        
        loadDriverRides();
        loadMyBookings();
        loadStats();
        loadProfile();

    } catch (error) {
        console.error('Error completing ride:', error);
        showToast('Error: ' + error.message, 'error');
    }
};

// ⭐ NEW: Load Completed Rides
async function loadCompletedRides() {
    let container = document.getElementById('completedTab');
    if (!container) {
        container = document.createElement('div');
        container.id = 'completedTab';
        container.className = 'tab-content';
        document.getElementById('myridesSection').appendChild(container);
    }
    
    container.innerHTML = '<div class="loading">Loading completed rides...</div>';

    try {
        if (userRole === 'student') {
            const snapshot = await db.collection('bookings')
                .where('passengerId', '==', currentUser.uid)
                .where('status', '==', 'COMPLETED')
                .orderBy('completedAt', 'desc')
                .get();

            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state">No completed rides yet</div>';
                return;
            }

            container.innerHTML = '';
            
            for (const doc of snapshot.docs) {
                const booking = doc.data();
                const rideDoc = await db.collection('rides').doc(booking.rideId).get();
                if (rideDoc.exists) {
                    const ride = rideDoc.data();
                    container.appendChild(createBookingCard(booking, ride, false));
                }
            }
        } else if (userRole === 'driver') {
            const ridesSnapshot = await db.collection('rides')
                .where('driverId', '==', currentUser.uid)
                .where('status', '==', 'COMPLETED')
                .orderBy('completedAt', 'desc')
                .get();

            if (ridesSnapshot.empty) {
                container.innerHTML = '<div class="empty-state">No completed rides yet</div>';
                return;
            }

            container.innerHTML = '';
            
            for (const doc of ridesSnapshot.docs) {
                const ride = doc.data();
                
                const bookingsSnapshot = await db.collection('bookings')
                    .where('rideId', '==', ride.id)
                    .where('status', '==', 'COMPLETED')
                    .get();
                
                const card = document.createElement('div');
                card.className = 'ride-card completed-ride';
                card.innerHTML = `
                    <div class="ride-header">
                        <div class="ride-route">${ride.from} → ${ride.to}</div>
                        <div class="ride-price" style="background: #4CAF50; color: white; padding: 0.5rem 1rem; border-radius: 20px;">✓ Completed</div>
                    </div>
                    <div class="ride-info">
                        <div class="ride-info-item">
                            <strong>Date:</strong> ${ride.date}
                        </div>
                        <div class="ride-info-item">
                            <strong>Passengers:</strong> ${bookingsSnapshot.size}
                        </div>
                        <div class="ride-info-item">
                            <strong>Total Earned:</strong> ₹${(ride.farePerPerson * bookingsSnapshot.size).toFixed(0)}
                        </div>
                        <div class="ride-info-item">
                            <strong>Completed:</strong> ${ride.completedAt ? ride.completedAt.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }
        }
    } catch (error) {
        console.error('Error loading completed rides:', error);
        container.innerHTML = '<div class="empty-state">Error loading completed rides</div>';
    }
}

function loadProfile() {
    if (!currentUserData) return;

    document.getElementById('profileName').textContent = currentUserData.name;
    document.getElementById('profileEmail').textContent = currentUserData.email;
    document.getElementById('profileRating').textContent = currentUserData.rating.toFixed(1);
    document.getElementById('profileRides').textContent = currentUserData.ridesCompleted || 0;
    document.getElementById('profilePhone').textContent = currentUserData.phone;
    document.getElementById('profileCollegeId').textContent = currentUserData.collegeId;
    document.getElementById('profileBranch').textContent = currentUserData.branch;
    document.getElementById('profileYear').textContent = `${currentUserData.year}${getOrdinalSuffix(currentUserData.year)} Year`;
    
    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        avatar.textContent = userRole === 'student' ? '🎓' : '🚗';
    }
    
    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
        roleBadge.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        roleBadge.className = `role-badge ${userRole}`;
    }
    
    if (userRole === 'driver' && currentUserData.vehicleInfo) {
        const vehicleField = document.getElementById('vehicleField');
        const vehicleSpan = document.getElementById('profileVehicle');
        if (vehicleField && vehicleSpan) {
            vehicleField.style.display = 'flex';
            vehicleSpan.textContent = currentUserData.vehicleInfo;
        }
    }
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return 'st';
    if (j == 2 && k != 12) return 'nd';
    if (j == 3 && k != 13) return 'rd';
    return 'th';
}