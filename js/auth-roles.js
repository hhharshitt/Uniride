// Authentication Logic with Role Selection

// Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Login successful!', 'success');
            // Redirect is handled by config.js based on role
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Signup Form with Role Selection
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    // Show/hide vehicle info based on role
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const vehicleGroup = document.getElementById('vehicleInfoGroup');
    
    if (roleInputs && vehicleGroup) {
        roleInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.value === 'driver') {
                    vehicleGroup.style.display = 'block';
                } else {
                    vehicleGroup.style.display = 'none';
                }
            });
        });
    }
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const collegeId = document.getElementById('signupCollegeId').value;
        const branch = document.getElementById('signupBranch').value;
        const year = parseInt(document.getElementById('signupYear').value);
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        
        // Get selected role
        const roleRadio = document.querySelector('input[name="role"]:checked');
        let role = roleRadio ? roleRadio.value : 'student';
        
        // Get vehicle info (optional, for drivers)
        const vehicleInfoInput = document.getElementById('signupVehicle');
        const vehicleInfo = vehicleInfoInput ? vehicleInfoInput.value || '' : '';
        
        // Validation
        if (password !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        // Auto-admin for specific email (CHANGE THIS EMAIL!)
        if (email === 'admin@yourcollege.edu') {
            role = 'admin';
        }
        
        try {
            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Save user data to Firestore WITH ROLE
            await db.collection('users').doc(user.uid).set({
                id: user.uid,
                name: name,
                email: email,
                phone: phone,
                collegeId: collegeId,
                branch: branch,
                year: year,
                role: role,  // IMPORTANT: Save role!
                rating: 5.0,
                ridesCompleted: 0,
                vehicleInfo: vehicleInfo,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Account created successfully!', 'success');
            
            // Redirect based on role
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}