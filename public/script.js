// API URL - Update this to your Render URL after deployment
const API_URL = 'https://barternow-api.onrender.com';

// Hide verification section initially
document.getElementById('verificationSection').style.display = 'none';

// Handle the form submission
async function submitForm(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const userType = document.getElementById('userType').value;
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!email || !userType) {
        messageDiv.innerHTML = 'Please fill in all fields.';
        messageDiv.className = 'error';
        return;
    }
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending...';
    messageDiv.innerHTML = '';
    
    try {
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, userType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show verification section
            document.getElementById('verificationSection').style.display = 'flex';
            messageDiv.innerHTML = 'Please check your email for a verification code.';
            messageDiv.className = 'success';
            
            // Disable email and user type fields
            document.getElementById('email').disabled = true;
            document.getElementById('userType').disabled = true;
            submitBtn.style.display = 'none';
        } else {
            messageDiv.innerHTML = data.error || 'An error occurred. Please try again.';
            messageDiv.className = 'error';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Notify Me';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = 'Connection error. Please try again later.';
        messageDiv.className = 'error';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Notify Me';
    }
}

// Verify the code
async function verifyCode() {
    const code = document.getElementById('verificationCode').value;
    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('message');
    
    if (!code || code.length !== 6) {
        messageDiv.innerHTML = 'Please enter a valid 6-digit verification code.';
        messageDiv.className = 'error';
        return;
    }
    
    messageDiv.innerHTML = 'Verifying...';
    
    try {
        const response = await fetch(`${API_URL}/api/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            document.getElementById('verificationSection').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            
            messageDiv.innerHTML = 'Thank you! Your email has been verified. We\'ll notify you when BarterNow launches.';
            messageDiv.className = 'success';
        } else {
            messageDiv.innerHTML = data.error || 'Invalid verification code. Please try again.';
            messageDiv.className = 'error';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = 'Connection error. Please try again later.';
        messageDiv.className = 'error';
    }
}