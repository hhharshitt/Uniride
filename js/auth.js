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
    // Show/hide vehicle info and other fields based on role
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const vehicleGroup = document.getElementById('vehicleInfoGroup');
    const collegeIdGroup = document.getElementById('collegeIdGroup');
    const branchYearGroup = document.getElementById('branchYearGroup');
    const emailLabel = document.getElementById('signupEmailLabel');
    const collegeIdInput = document.getElementById('signupCollegeId');
    const branchInput = document.getElementById('signupBranch');
    const yearSelect = document.getElementById('signupYear');

    const updateSignupFieldsForRole = (role) => {
        if (role === 'driver') {
            if (vehicleGroup) vehicleGroup.style.display = 'block';
            if (collegeIdGroup) collegeIdGroup.style.display = 'none';
            if (branchYearGroup) branchYearGroup.style.display = 'none';
            if (emailLabel) emailLabel.textContent = 'Email';
            
            // Remove required attributes
            if (collegeIdInput) collegeIdInput.removeAttribute('required');
            if (branchInput) branchInput.removeAttribute('required');
            if (yearSelect) yearSelect.removeAttribute('required');
        } else {
            if (vehicleGroup) vehicleGroup.style.display = 'none';
            if (collegeIdGroup) collegeIdGroup.style.display = 'block';
            if (branchYearGroup) branchYearGroup.style.display = 'grid';
            if (emailLabel) emailLabel.textContent = 'College Email';
            
            // Add required attributes
            if (collegeIdInput) collegeIdInput.setAttribute('required', '');
            if (branchInput) branchInput.setAttribute('required', '');
            if (yearSelect) yearSelect.setAttribute('required', '');
        }
    };
    
    roleInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            updateSignupFieldsForRole(e.target.value);
        });
    });
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        let role = document.querySelector('input[name="role"]:checked').value;
        const vehicleInfo = document.getElementById('signupVehicle').value || '';
        
        const collegeId = role === 'student' ? document.getElementById('signupCollegeId').value : '';
        const branch = role === 'student' ? document.getElementById('signupBranch').value : '';
        const year = role === 'student' ? (parseInt(document.getElementById('signupYear').value) || 0) : 0;
        
        console.log("Signup form submitted:", { name, email, role });
        
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
            // Set flag to prevent config.js from redirecting before Firestore write completes
            window.isSigningUp = true;
            
            // Create user
            console.log("Creating user with Firebase Auth...");
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log("Auth user created. UID:", user.uid);
            
            // Save user data to Firestore WITH ROLE
            console.log("Saving user doc to Firestore...");
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
            console.log("User doc saved to Firestore successfully.");
            
            showToast('Account created successfully!', 'success');
            
            // Redirect based on role
            if (email === 'admin@muj.com') {
                role = 'admin';
            }
            console.log("Redirecting user to dashboard. Role:", role);
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            window.isSigningUp = false;
            console.error("Signup error occurred:", error);
            showToast(error.message, 'error');
        }
    });
}
