// ===============================
// DASHBOARD LOGIC (FIXED VERSION)
// ===============================

let currentUser = null;
let currentUserData = null;

// ===============================
// AUTH STATE
// ===============================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
        initDashboard();
    } else {
        window.location.href = 'index.html';
    }
});

// ===============================
// LOAD USER DATA
// ===============================
async function loadUserData() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            updateGreeting();
            loadProfile();

            // ✅ APPLY ROLE PERMISSIONS
            if (currentUserData.role) {
                applyRolePermissions(currentUserData.role);
            }
        }
    } catch (error) {
        console.error("Error loading user:", error);
    }
}

// ===============================
// GREETING
// ===============================
function updateGreeting() {
    const greeting = document.getElementById("userGreeting");
    if (greeting && currentUserData?.name) {
        greeting.textContent = `Welcome, ${currentUserData.name}!`;
    }
}

// ===============================
// ROLE PERMISSIONS
// ===============================
function applyRolePermissions(role) {
    const postRideBtn = document.getElementById("post-ride-nav");
    const searchRideBtn = document.getElementById("search-ride-nav");
    const adminPanelBtn = document.getElementById("admin-panel-nav");

    if (postRideBtn) postRideBtn.style.display = "none";
    if (searchRideBtn) searchRideBtn.style.display = "none";
    if (adminPanelBtn) adminPanelBtn.style.display = "none";

    if (role === "admin") {
        if (postRideBtn) postRideBtn.style.display = "block";
        if (searchRideBtn) searchRideBtn.style.display = "block";
        if (adminPanelBtn) adminPanelBtn.style.display = "block";
    } 
    else if (role === "driver") {
        if (postRideBtn) postRideBtn.style.display = "block";
    } 
    else if (role === "student") {
        if (postRideBtn) postRideBtn.style.display = "block";
        if (searchRideBtn) searchRideBtn.style.display = "block";
    }
}

// ===============================
// INIT DASHBOARD
// ===============================
function initDashboard() {

    loadStats();
    loadRecentRides();
    

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await auth.signOut();
            window.location.href = "index.html";
        });
    }

    const postRideForm = document.getElementById("postRideForm");
    if (postRideForm) {
        postRideForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await postRide();
        });
    }
}

// ===============================
// LOAD STATS
// ===============================
async function loadStats() {
    try {
        const ridesSnapshot = await db.collection("rides")
            .where("status", "==", "ACTIVE")
            .get();

        const available = ridesSnapshot.docs.filter(
            doc => doc.data().driverId !== currentUser.uid
        ).length;

        document.getElementById("availableRides").textContent = available;

        const bookingsSnapshot = await db.collection("bookings")
            .where("passengerId", "==", currentUser.uid)
            .get();

        document.getElementById("myBookings").textContent = bookingsSnapshot.size;

        const myRidesSnapshot = await db.collection("rides")
            .where("driverId", "==", currentUser.uid)
            .get();

        document.getElementById("ridesPosted").textContent = myRidesSnapshot.size;

    } catch (error) {
        console.error("Stats error:", error);
    }
}

// ===============================
// LOAD RECENT RIDES (FIXED QUERY)
// ===============================
async function loadRecentRides() {
    const container = document.getElementById("recentRidesList");
    if (!container) return;

    container.innerHTML = "Loading rides...";

    try {
        const snapshot = await db.collection("rides")
            .where("status", "==", "ACTIVE")
            .orderBy("dateTime", "desc")
            .limit(5)
            .get();

        container.innerHTML = "";

        snapshot.forEach(doc => {
            const ride = doc.data();
            if (ride.driverId !== currentUser.uid) {
                container.appendChild(createRideCard(ride));
            }
        });

        if (container.innerHTML === "") {
            container.innerHTML = "No rides available";
        }

    } catch (error) {
        console.error("Recent rides error:", error);
        container.innerHTML = "Error loading rides";
    }
}

// ===============================
// CREATE RIDE CARD (SAFE)
// ===============================
function createRideCard(ride) {

    const card = document.createElement("div");
    card.className = "ride-card";

    const fare = (ride.farePerPerson || 0).toFixed(0);
    const rating = (ride.driverRating || 0).toFixed(1);

    card.innerHTML = `
        <div><strong>${ride.from} → ${ride.to}</strong></div>
        <div>₹${fare}</div>
        <div>Date: ${ride.date}</div>
        <div>Time: ${ride.time}</div>
        <div>Driver: ${ride.driverName || "Unknown"}</div>
        <div>Rating: ⭐ ${rating}</div>
        <div>Seats: ${ride.seatsAvailable || 0}</div>
    `;

    return card;
}

// ===============================
// POST RIDE (SAFE VERSION)
// ===============================
async function postRide() {

    const from = document.getElementById("rideFrom").value;
    const to = document.getElementById("rideTo").value;
    const date = document.getElementById("rideDate").value;
    const time = document.getElementById("rideTime").value;
    const seats = parseInt(document.getElementById("rideSeats").value);
    const fare = parseFloat(document.getElementById("rideFare").value);

    if (!from || !to || !date || !time || !seats || !fare) {
        alert("Please fill all fields");
        return;
    }

    try {

        const rideRef = db.collection("rides").doc();
        const farePerPerson = fare / (seats + 1);

        await rideRef.set({
            id: rideRef.id,
            driverId: currentUser.uid,
            driverName: currentUserData.name || "Driver",
            from,
            to,
            date,
            time,
            dateTime: firebase.firestore.Timestamp.fromDate(new Date(`${date} ${time}`)),
            seatsTotal: seats,
            seatsAvailable: seats,
            totalFare: fare,
            farePerPerson,
            status: "ACTIVE",
            driverRating: currentUserData.rating || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Ride posted successfully!");

        document.getElementById("postRideForm").reset();

        loadStats();
        loadRecentRides();

    } catch (error) {
        console.error("Post ride error:", error);
    }
}

// ===============================
// LOAD PROFILE (SAFE)
// ===============================
function loadProfile() {

    if (!currentUserData) return;

    const rating = (currentUserData.rating || 0).toFixed(1);

    document.getElementById("profileName").textContent = currentUserData.name || "-";
    document.getElementById("profileEmail").textContent = currentUserData.email || "-";
    document.getElementById("profileRating").textContent = rating;
}
