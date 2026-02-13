// Admin Dashboard Logic

let currentAdmin = null;
let allUsers = [];
let allRides = [];
let allBookings = [];

// Initialize Admin Dashboard
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentAdmin = user;
        await checkAdminAccess();
    } else {
        window.location.href = 'index.html';
    }
});

// Check Admin Access
async function checkAdminAccess() {
    try {
        const doc = await db.collection('users').doc(currentAdmin.uid).get();
        if (doc.exists) {
            const userData = doc.data();
            if (userData.role !== 'admin') {
                showToast('Access denied! Admin only.', 'error');
                setTimeout(() => {
                    auth.signOut();
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }
            initAdminDashboard();
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'index.html';
    }
}

// Initialize Admin Dashboard
function initAdminDashboard() {
    // Setup sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Search and Filter Handlers
    const searchUsers = document.getElementById('searchUsers');
    if (searchUsers) {
        searchUsers.addEventListener('input', filterUsers);
    }

    const filterRole = document.getElementById('filterRole');
    if (filterRole) {
        filterRole.addEventListener('change', filterUsers);
    }

    const searchRides = document.getElementById('searchRides');
    if (searchRides) {
        searchRides.addEventListener('input', filterRides);
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', filterRides);
    }

    const filterBookingStatus = document.getElementById('filterBookingStatus');
    if (filterBookingStatus) {
        filterBookingStatus.addEventListener('change', filterBookings);
    }

    // Load initial data
    loadAdminStats();
    loadRecentActivity();
}

// Switch Section
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

    // Load data for section
    if (section === 'users') {
        loadAllUsers();
    } else if (section === 'rides') {
        loadAllRides();
    } else if (section === 'bookings') {
        loadAllBookings();
    } else if (section === 'analytics') {
        loadAnalytics();
    }
}

// Load Admin Stats
async function loadAdminStats() {
    try {
        // Total Users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;

        // Total Rides
        const ridesSnapshot = await db.collection('rides')
            .where('status', '==', 'ACTIVE')
            .get();
        document.getElementById('totalRides').textContent = ridesSnapshot.size;

        // Total Bookings
        const bookingsSnapshot = await db.collection('bookings').get();
        document.getElementById('totalBookings').textContent = bookingsSnapshot.size;

        // Pending Requests
        const pendingSnapshot = await db.collection('bookings')
            .where('status', '==', 'REQUESTED')
            .get();
        document.getElementById('pendingRequests').textContent = pendingSnapshot.size;

    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading activity...</div>';

    try {
        const bookings = await db.collection('bookings')
            .orderBy('requestedAt', 'desc')
            .limit(10)
            .get();

        if (bookings.empty) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(doc => {
            const booking = doc.data();
            const activity = document.createElement('div');
            activity.className = 'activity-item';
            activity.innerHTML = `
                <p><strong>${booking.passengerName}</strong> requested a seat</p>
                <small>${booking.requestedAt ? booking.requestedAt.toDate().toLocaleString() : 'Just now'}</small>
            `;
            container.appendChild(activity);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<div class="empty-state">Error loading activity</div>';
    }
}

// Load All Users
async function loadAllUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading users...</div>';

    try {
        const snapshot = await db.collection('users').get();
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="empty-state">Error loading users</div>';
    }
}

// Display Users
function displayUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state">No users found</div>';
        return;
    }

    container.innerHTML = '';
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.innerHTML = `
            <div class="admin-card-header">
                <div>
                    <h3>${user.name}</h3>
                    <p>${user.email}</p>
                    <span class="role-badge ${user.role || 'student'}">${(user.role || 'student').toUpperCase()}</span>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-secondary" onclick="viewUserDetails('${user.id}')">View</button>
                    ${user.role !== 'admin' ? `
                    <button class="btn-danger" onclick="deleteUser('${user.id}', '${user.name}')">Delete</button>
                    ` : ''}
                </div>
            </div>
            <div class="ride-info">
                <div class="ride-info-item">
                    <strong>Phone:</strong> ${user.phone}
                </div>
                <div class="ride-info-item">
                    <strong>College ID:</strong> ${user.collegeId}
                </div>
                <div class="ride-info-item">
                    <strong>Branch:</strong> ${user.branch}
                </div>
                <div class="ride-info-item">
                    <strong>Rating:</strong> ⭐ ${user.rating.toFixed(1)}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Filter Users
function filterUsers() {
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('filterRole')?.value || 'all';

    let filtered = allUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) ||
                            user.email.toLowerCase().includes(searchTerm);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    displayUsers(filtered);
}

// Load All Rides
async function loadAllRides() {
    const container = document.getElementById('ridesList');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading rides...</div>';

    try {
        const snapshot = await db.collection('rides').orderBy('dateTime', 'desc').get();
        allRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        displayRides(allRides);
    } catch (error) {
        console.error('Error loading rides:', error);
        container.innerHTML = '<div class="empty-state">Error loading rides</div>';
    }
}

// Display Rides
function displayRides(rides) {
    const container = document.getElementById('ridesList');
    if (!container) return;

    if (rides.length === 0) {
        container.innerHTML = '<div class="empty-state">No rides found</div>';
        return;
    }

    container.innerHTML = '';
    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.innerHTML = `
            <div class="admin-card-header">
                <div>
                    <h3>${ride.from} → ${ride.to}</h3>
                    <p>Driver: ${ride.driverName}</p>
                    <span class="booking-status status-${ride.status.toLowerCase()}">${ride.status}</span>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-danger" onclick="deleteRide('${ride.id}', '${ride.from} → ${ride.to}')">Delete</button>
                </div>
            </div>
            <div class="ride-info">
                <div class="ride-info-item">
                    <strong>Date:</strong> ${ride.date} at ${ride.time}
                </div>
                <div class="ride-info-item">
                    <strong>Seats:</strong> ${ride.seatsAvailable}/${ride.seatsTotal}
                </div>
                <div class="ride-info-item">
                    <strong>Fare:</strong> ₹${ride.totalFare}
                </div>
                <div class="ride-info-item">
                    <strong>Per Person:</strong> ₹${ride.farePerPerson.toFixed(0)}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Filter Rides
function filterRides() {
    const searchTerm = document.getElementById('searchRides')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';

    let filtered = allRides.filter(ride => {
        const matchesSearch = ride.from.toLowerCase().includes(searchTerm) ||
                            ride.to.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || ride.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    displayRides(filtered);
}

// Load All Bookings
async function loadAllBookings() {
    const container = document.getElementById('bookingsList');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading bookings...</div>';

    try {
        const snapshot = await db.collection('bookings').orderBy('requestedAt', 'desc').get();
        allBookings = [];
        
        for (const doc of snapshot.docs) {
            const booking = doc.data();
            const rideDoc = await db.collection('rides').doc(booking.rideId).get();
            if (rideDoc.exists) {
                allBookings.push({
                    ...booking,
                    ride: rideDoc.data()
                });
            }
        }

        displayBookings(allBookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = '<div class="empty-state">Error loading bookings</div>';
    }
}

// Display Bookings
function displayBookings(bookings) {
    const container = document.getElementById('bookingsList');
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">No bookings found</div>';
        return;
    }

    container.innerHTML = '';
    bookings.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.innerHTML = `
            <div class="admin-card-header">
                <div>
                    <h3>${booking.ride.from} → ${booking.ride.to}</h3>
                    <p>Passenger: ${booking.passengerName}</p>
                    <span class="booking-status status-${booking.status.toLowerCase()}">${booking.status}</span>
                </div>
                <div class="admin-card-actions">
                    <button class="btn-danger" onclick="deleteBooking('${booking.id}')">Delete</button>
                </div>
            </div>
            <div class="ride-info">
                <div class="ride-info-item">
                    <strong>Date:</strong> ${booking.ride.date}
                </div>
                <div class="ride-info-item">
                    <strong>Fare:</strong> ₹${booking.fareShare.toFixed(0)}
                </div>
                <div class="ride-info-item">
                    <strong>Requested:</strong> ${booking.requestedAt ? booking.requestedAt.toDate().toLocaleDateString() : 'N/A'}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Filter Bookings
function filterBookings() {
    const statusFilter = document.getElementById('filterBookingStatus')?.value || 'all';

    let filtered = allBookings.filter(booking => {
        return statusFilter === 'all' || booking.status === statusFilter;
    });

    displayBookings(filtered);
}

// Load Analytics
async function loadAnalytics() {
    try {
        // Count by role
        const users = await db.collection('users').get();
        let studentCount = 0;
        let driverCount = 0;

        users.forEach(doc => {
            const role = doc.data().role || 'student';
            if (role === 'student') studentCount++;
            else if (role === 'driver') driverCount++;
        });

        document.getElementById('studentCount').textContent = studentCount;
        document.getElementById('driverCount').textContent = driverCount;

        // Average fare
        const rides = await db.collection('rides').get();
        let totalFare = 0;
        rides.forEach(doc => {
            totalFare += doc.data().farePerPerson || 0;
        });
        const avgFare = rides.size > 0 ? totalFare / rides.size : 0;
        document.getElementById('avgFare').textContent = `₹${avgFare.toFixed(0)}`;

        // Success rate
        const bookings = await db.collection('bookings').get();
        let acceptedCount = 0;
        bookings.forEach(doc => {
            if (doc.data().status === 'ACCEPTED') acceptedCount++;
        });
        const successRate = bookings.size > 0 ? (acceptedCount / bookings.size * 100) : 0;
        document.getElementById('successRate').textContent = `${successRate.toFixed(0)}%`;

        // Popular routes
        loadPopularRoutes();
        loadTopUsers();
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Load Popular Routes
async function loadPopularRoutes() {
    const container = document.getElementById('popularRoutes');
    if (!container) return;

    try {
        const rides = await db.collection('rides').get();
        const routes = {};

        rides.forEach(doc => {
            const ride = doc.data();
            const route = `${ride.from} → ${ride.to}`;
            routes[route] = (routes[route] || 0) + 1;
        });

        const sorted = Object.entries(routes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        container.innerHTML = '';
        sorted.forEach(([route, count]) => {
            const item = document.createElement('div');
            item.className = 'field';
            item.innerHTML = `
                <label>${route}:</label>
                <span>${count} rides</span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading popular routes:', error);
    }
}

// Load Top Users
async function loadTopUsers() {
    const container = document.getElementById('topUsers');
    if (!container) return;

    try {
        const users = await db.collection('users')
            .orderBy('ridesCompleted', 'desc')
            .limit(5)
            .get();

        container.innerHTML = '';
        users.forEach(doc => {
            const user = doc.data();
            const item = document.createElement('div');
            item.className = 'field';
            item.innerHTML = `
                <label>${user.name}:</label>
                <span>${user.ridesCompleted} rides | ⭐ ${user.rating.toFixed(1)}</span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading top users:', error);
    }
}

// Delete User
window.deleteUser = async function(userId, userName) {
    if (!confirm(`Delete user "${userName}"? This action cannot be undone.`)) return;

    try {
        await db.collection('users').doc(userId).delete();
        showToast('User deleted successfully', 'success');
        loadAllUsers();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user', 'error');
    }
};

// Delete Ride
window.deleteRide = async function(rideId, route) {
    if (!confirm(`Delete ride "${route}"? This action cannot be undone.`)) return;

    try {
        await db.collection('rides').doc(rideId).delete();
        showToast('Ride deleted successfully', 'success');
        loadAllRides();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting ride:', error);
        showToast('Error deleting ride', 'error');
    }
};

// Delete Booking
window.deleteBooking = async function(bookingId) {
    if (!confirm('Delete this booking? This action cannot be undone.')) return;

    try {
        await db.collection('bookings').doc(bookingId).delete();
        showToast('Booking deleted successfully', 'success');
        loadAllBookings();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast('Error deleting booking', 'error');
    }
};

// View User Details
window.viewUserDetails = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    alert(`
User Details:
Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone}
College ID: ${user.collegeId}
Branch: ${user.branch}
Year: ${user.year}
Role: ${user.role || 'student'}
Rating: ${user.rating.toFixed(1)}
Rides Completed: ${user.ridesCompleted}
    `);
};

// Quick Actions
window.viewAllUsers = function() {
    switchSection('users');
};

window.viewAllRides = function() {
    switchSection('rides');
};

window.exportData = function() {
    showToast('Export feature coming soon!', 'info');
};

window.refreshStats = function() {
    loadAdminStats();
    loadRecentActivity();
    showToast('Stats refreshed!', 'success');
};