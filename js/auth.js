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
            window.location.href = 'dashboard.html';
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Updated Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    // Show/hide vehicle info based on role
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const vehicleGroup = document.getElementById('vehicleInfoGroup');
    
    roleInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.value === 'driver') {
                vehicleGroup.style.display = 'block';
            } else {
                vehicleGroup.style.display = 'none';
            }
        });
    });
    
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
        const role = document.querySelector('input[name="role"]:checked').value;
        const vehicleInfo = document.getElementById('signupVehicle').value || '';
        
        // Validation
        if (password !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
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
            if (email === 'admin@muj.com') {
                role = 'admin';
            }
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