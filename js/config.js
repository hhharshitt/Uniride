const firebaseConfig = {
  apiKey: "AIzaSyBqMxGKXVTIqgUZIaA5Qdqo65H94pSJOsY",
  authDomain: "unirideweb.firebaseapp.com",
  projectId: "unirideweb",
  storageBucket: "unirideweb.firebasestorage.app",
  messagingSenderId: "436899299933",
  appId: "1:436899299933:web:985605bb705c947c7f03b4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services - CRITICAL!
const auth = firebase.auth();
const db = firebase.firestore();

// Helper function for toast messages
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#1976D2'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Format date helper
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Check auth state and redirect
auth.onAuthStateChanged(async (user) => {
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.includes('index.html') || 
                        currentPage === '/' ||
                        currentPage === '' ||
                        currentPage.endsWith('/');
    const isAdminPage = currentPage.includes('admin.html');
    const isDashboardPage = currentPage.includes('dashboard.html');
    
    if (user) {
        try {
            // Get user role
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'student';
                
                if (isLoginPage) {
                    // User is logged in on login page, redirect based on role
                    if (userRole === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else if (isAdminPage && userRole !== 'admin') {
                    // Non-admin trying to access admin page
                    showToast('Access denied! Admin only.', 'error');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else if (isDashboardPage && userRole === 'admin') {
                    // Admin should use admin dashboard
                    window.location.href = 'admin.html';
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    } else if (!isLoginPage) {
        // User not logged in, redirect to login
        window.location.href = 'index.html';
    }
});

console.log('✅ Firebase initialized successfully!');