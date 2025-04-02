
        // Theme Toggle
        const htmlElement = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = themeToggle.querySelector('.material-icons');
        const themeText = themeToggle.querySelector('span:not(.material-icons)');

        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            htmlElement.setAttribute('data-theme', savedTheme);
            updateThemeToggle(savedTheme);
        } else {
            // Check user's system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                htmlElement.setAttribute('data-theme', 'dark');
                updateThemeToggle('dark');
            }
        }

        // Theme toggle functionality
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggle(newTheme);
        });

        function updateThemeToggle(theme) {
            if (theme === 'dark') {
                themeIcon.textContent = 'light_mode';
                themeText.textContent = 'Light Mode';
            } else {
                themeIcon.textContent = 'dark_mode';
                themeText.textContent = 'Dark Mode';
            }
        }

        // Check authentication status
        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/me');
                if (!response.ok) {
                    window.location.href = '/login.html';
                    return;
                }
                const user = await response.json();
                document.getElementById('username-display').textContent = user.username;
                document.getElementById('user-email-display').textContent = user.email;

                // Populate form fields
                document.getElementById('username').value = user.username;
                document.getElementById('email').value = user.email;
            } catch (error) {
                window.location.href = '/login.html';
            }
        }

        // Handle form submission
        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessage = document.getElementById('error-message');
            const successMessage = document.getElementById('success-message');
            const submitButton = e.target.querySelector('button[type="submit"]');

            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            // Validate password match if changing password
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (newPassword && newPassword !== confirmPassword) {
                errorMessage.textContent = 'New passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }

            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                const response = await fetch('/api/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: document.getElementById('username').value,
                        email: document.getElementById('email').value,
                        currentPassword: document.getElementById('current-password').value,
                        newPassword: newPassword
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    successMessage.textContent = data.message;
                    successMessage.style.display = 'block';
                    // Clear password fields
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                } else {
                    errorMessage.textContent = data.message;
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'An error occurred. Please try again.';
                errorMessage.style.display = 'block';
            } finally {
                // Re-enable button and restore text
                submitButton.disabled = false;
                submitButton.textContent = 'Save Changes';
            }
        });

        // Handle logout
        document.getElementById('logout-link').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (response.ok) {
                    window.location.href = '/login.html';
                }
            } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/login.html';
            }
        });

        // Initial check for user's 2FA status on page load
        async function checkInitial2FAStatus() {
            try {
                // Use the correct endpoint and include credentials
                const response = await fetch('/api/auth/me', { credentials: 'include' }); 
                if (!response.ok) {
                    // Handle case where user isn't authenticated (should be caught by checkAuth earlier, but good practice)
                    if (response.status === 401) {
                        window.location.href = '/login.html'; 
                        return; 
                    }
                    throw new Error('Failed to fetch user data');
                }
                const userData = await response.json();
                // Assuming /api/auth/me returns the user object directly
                current2FAStatus = userData.twoFactorEnabled || false;
            } catch (error) {
                console.error('Error fetching initial 2FA status:', error);
                // Avoid showing 2FA specific error if main auth failed
                if (error.message !== 'Failed to fetch user data') { 
                     show2FAMessage('Could not load your current 2FA status.');
                }
                // Keep status as default false
                current2FAStatus = false; 
            } finally {
                update2FAUI(); // Update UI based on fetched or default status
            }
        }

        // Run initial check *after* main auth check
        // Modify the end of the script:
        // Initialize the page
        // checkAuth(); // Original call
        // document.addEventListener('DOMContentLoaded', checkInitial2FAStatus); // Original call

        // Chain the checks: check main auth, then check 2FA status
        document.addEventListener('DOMContentLoaded', async () => {
            await checkAuth(); // Wait for main auth check to complete
            await checkInitial2FAStatus(); // Now check 2FA status
        });

        // --- 2FA Logic ---
        const twoFactorSection = document.getElementById('two-factor-section');
        const statusDiv = document.getElementById('2fa-status');
        const setupArea = document.getElementById('2fa-setup-area');
        const qrCodeImg = document.getElementById('qr-code');
        const secretKeyCode = document.getElementById('secret-key');
        const tokenInput = document.getElementById('2fa-token');
        const verifyButton = document.getElementById('verify-2fa-button');
        const cancelButton = document.getElementById('cancel-2fa-button');
        const errorMessageDiv = document.getElementById('2fa-error-message');
        const successMessageDiv = document.getElementById('2fa-success-message');

        let current2FAStatus = false;

        // Function to display messages
        function show2FAMessage(message, type = 'error') {
            const div = (type === 'error') ? errorMessageDiv : successMessageDiv;
            const otherDiv = (type === 'error') ? successMessageDiv : errorMessageDiv;
            div.textContent = message;
            div.style.display = 'block';
            otherDiv.style.display = 'none';
            // Auto-hide after 5 seconds
            setTimeout(() => { div.style.display = 'none'; }, 5000);
        }

        // Function to update UI based on 2FA status
        function update2FAUI() {
            statusDiv.innerHTML = ''; // Clear previous content
            setupArea.style.display = 'none';
            errorMessageDiv.style.display = 'none';
            successMessageDiv.style.display = 'none';

            if (current2FAStatus) {
                statusDiv.innerHTML = `
                    <p>Two-Factor Authentication is <strong>enabled</strong>.</p>
                    <button id="disable-2fa-button" class="button" style="background-color: var(--error-color); margin-top: 1rem;">Disable 2FA</button>
                `;
                document.getElementById('disable-2fa-button').addEventListener('click', disable2FA);
            } else {
                statusDiv.innerHTML = `
                    <p>Two-Factor Authentication is <strong>disabled</strong>.</p>
                    <p style="margin-top: 0.5rem; color: var(--text-secondary);">Enhance your account security by enabling 2FA.</p>
                    <button id="enable-2fa-button" class="button" style="margin-top: 1rem;">Enable 2FA</button>
                `;
                document.getElementById('enable-2fa-button').addEventListener('click', initiate2FASetup);
            }
        }

        // 1. Initiate 2FA Setup
        async function initiate2FASetup() {
            show2FAMessage('Starting 2FA setup...', 'success');
            try {
                const response = await fetch('/api/2fa/setup', { 
                    method: 'POST', 
                    credentials: 'include' 
                });
                const data = await response.json();
                console.log('2FA setup response:', data); // Debug log

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to start setup');
                }

                if (!data.qrCode) {
                    console.error('No QR code in response:', data);
                    throw new Error('QR code not received from server');
                }

                // Set QR code image source
                qrCodeImg.src = data.qrCode;
                console.log('QR code length:', data.qrCode.length); // Debug log

                // Style the QR code image
                qrCodeImg.style.maxWidth = '200px';
                qrCodeImg.style.height = 'auto';
                qrCodeImg.style.display = 'block';
                qrCodeImg.style.margin = '20px auto';
                qrCodeImg.style.backgroundColor = '#fff';
                qrCodeImg.style.padding = '10px';
                qrCodeImg.style.borderRadius = '8px';
                qrCodeImg.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                
                // Set other elements
                secretKeyCode.textContent = data.secret;
                tokenInput.value = ''; // Clear previous token
                statusDiv.style.display = 'none'; // Hide status area
                setupArea.style.display = 'block'; // Show setup area
                show2FAMessage('Scan QR code or enter key, then input the token.', 'success');

            } catch (error) {
                console.error('Error initiating 2FA setup:', error);
                show2FAMessage(`Setup failed: ${error.message}`);
            }
        }

        // 2. Verify Token and Enable 2FA
        async function verifyAndEnable2FA() {
            const token = tokenInput.value.trim();
            if (!token || token.length !== 6 || !/^[0-9]+$/.test(token)) {
                show2FAMessage('Please enter a valid 6-digit code.');
                return;
            }

            show2FAMessage('Verifying token...', 'success');
            try {
                const response = await fetch('/api/auth/verify-2fa', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ token })
                });

                // Log response for debugging
                console.log('Verification response status:', response.status);
                
                // Handle non-JSON responses
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned non-JSON response. Please try logging in again.');
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Verification failed');
                }

                current2FAStatus = true; // Update status
                update2FAUI(); // Refresh UI
                show2FAMessage('2FA enabled successfully!', 'success');

            } catch (error) {
                console.error('Error verifying 2FA token:', error);
                if (error.message.includes('Server returned non-JSON response')) {
                    // Session might have expired
                    window.location.href = '/login.html';
                    return;
                }
                show2FAMessage(`Verification failed: ${error.message}`);
            }
        }

        // 3. Disable 2FA
        async function disable2FA() {
            if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) {
                return;
            }

            show2FAMessage('Disabling 2FA...', 'success');
            try {
                // Include credentials in the fetch request
                const response = await fetch('/api/2fa/disable', { method: 'POST', credentials: 'include' });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to disable 2FA');
                }

                current2FAStatus = false; // Update status
                update2FAUI(); // Refresh UI
                show2FAMessage('2FA disabled successfully.', 'success');

            } catch (error) {
                console.error('Error disabling 2FA:', error);
                show2FAMessage(`Failed to disable 2FA: ${error.message}`);
            }
        }

        // 4. Cancel Setup
        function cancel2FASetup() {
            setupArea.style.display = 'none';
            statusDiv.style.display = 'block'; // Show status area again
            errorMessageDiv.style.display = 'none';
            successMessageDiv.style.display = 'none';
            // Optionally, call backend to clear temporary secret if needed, though it gets overwritten on next setup
        }

        // Add event listeners
        verifyButton.addEventListener('click', verifyAndEnable2FA);
        cancelButton.addEventListener('click', cancel2FASetup);
    