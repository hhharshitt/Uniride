# 🚗 Uniride — Share Rides, Save Money

Uniride is a premium, eco-friendly, and cost-effective carpooling platform designed specifically for college and university students. By connecting students who share similar travel routes, Uniride helps split travel costs, reduce carbon footprints, and foster a safer community through student-only verification.

---

### 🌐 Live Deployment
The project is live and deployed at:
👉 **[https://uniride-lemon.vercel.app/](https://uniride-lemon.vercel.app/)**

---

## ⚡ Key Features

### 🔐 Role-Based Authentication & Verification
*   **Dual Sign-up Flow**: Dynamic role selection during signup for **Students** and **Drivers**.
*   **Student Verification**: Requires fields like College Email, Phone Number, College ID, Branch, and Academic Year.
*   **Driver Setup**: Requires vehicle details (e.g., brand, model, license plate number).
*   **Firebase Integration**: Secure sign-in, session-based persistence, and database validation.

### 🎓 Student Dashboard
*   **Search Rides**: Search for available carpools by destination and date.
*   **Easy Booking**: View fares, request to join rides, and manage active/past bookings.
*   **Live Tracking**: Real-time Leaflet map integration displaying the route and simulated car position.
*   **Simulated Route Tracking**: Control simulation speed (1x, 5x, 10x, 50x) for testing/live preview.

### 🚗 Driver Dashboard
*   **Post a Ride**: Set departure (From), destination (To), departure date, departure time, total fare, and available seats.
*   **Automatic Fare Splitter**: Real-time fare-per-seat calculation shown on the creation card.
*   **Ride Management**: Accept or reject pending student booking requests, update ride status (Active/Completed/Cancelled), and manage travel histories.

### 👨‍💼 Admin Panel
*   **System Overview**: Detailed dashboard displaying total users, active rides, total bookings, and pending approvals.
*   **User Management**: Search, filter by role (Student/Driver/Admin), and edit/remove user records.
*   **Booking & Ride Administration**: Audit all active routes and change booking/ride statuses.
*   **Analytics**: Visualize platform-wide metrics (ratios, average fares, popular routes, and top active users).

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (featuring responsive layouts, modern interactive gradients, sidebar menus, and glassmorphism styling).
*   **Database & Auth**: Google Firebase Auth & Firebase Cloud Firestore.
*   **Mapping**: Leaflet.js and OpenStreetMap API for rendering maps, setting markers, and tracking paths.

---

## 📂 Project Structure

```text
Uniride-main/
├── index.html           # Landing Page with Login/Signup modals
├── dashboard.html       # Role-based Dashboard (Student & Driver)
├── admin.html           # Admin Dashboard for user & platform auditing
├── css/
│   ├── style.css        # Main application CSS
│   └── role-styles.css  # Specialized styling rules for user roles
├── js/
│   ├── config.js        # Firebase configuration and common helper utilities
│   ├── auth.js          # Authentication state, login & signup form handlers
│   ├── auth-roles.js    # Specialized authentication middleware
│   ├── dashboard.js     # Shared dashboard routines
│   ├── dashboard-roles.js # Core dashboard UI population logic based on user role
│   ├── admin.js         # Admin panel control scripts
│   └── mapsn.js         # Leaflet map setup and real-time path/simulation engine
└── PBL-4 PPT Uniride.pptx # Project presentation slide deck
```

---

---

## 📂 Original Project Resources
*   **Submission/Sharepoint Drive**: [Link to Drive](https://mujmanipal-my.sharepoint.com/:f:/g/personal/harshit_23fe10cse00435_muj_manipal_edu/IgAFLt3DEG20S4fJ5fDucWbEAX_dKFJnXvayVPHTrkSEUKk?e=AU2BsH)
