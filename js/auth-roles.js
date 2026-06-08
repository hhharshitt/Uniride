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
    
    if (roleInputs) {
        roleInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                updateSignupFieldsForRole(e.target.value);
            });
        });
    }
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        
        // Get selected role
        const roleRadio = document.querySelector('input[name="role"]:checked');
        let role = roleRadio ? roleRadio.value : 'student';
        
        const collegeId = role === 'student' ? document.getElementById('signupCollegeId').value : '';
        const branch = role === 'student' ? document.getElementById('signupBranch').value : '';
        const year = role === 'student' ? (parseInt(document.getElementById('signupYear').value) || 0) : 0;
        
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
        
        // admin mail 
        if (email === 'admin@muj.com') {
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
                role: role,  
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
