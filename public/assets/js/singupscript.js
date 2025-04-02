
        // Theme Toggle
        const htmlElement = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = themeToggle.querySelector('.material-icons');

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
            } else {
                themeIcon.textContent = 'dark_mode';
            }
        }

        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorMessage = document.getElementById('error-message');
            const submitButton = e.target.querySelector('button[type="submit"]');

            // Clear previous error messages
            errorMessage.style.display = 'none';

            // Validate passwords match
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }

            // Validate password strength
            if (password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters long';
                errorMessage.style.display = 'block';
                return;
            }

            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Account...';

            // Create loading overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000';
            document.body.appendChild(overlay);

            try {
                console.log('Sending signup request for:', email);
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // Important for cookies
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();
                console.log('Signup response status:', response.status);

                if (response.ok) {
                    // Signup successful, show success message then redirect
                    const successMessage = document.createElement('div');
                    successMessage.style.position = 'fixed';
                    successMessage.style.top = '50%';
                    successMessage.style.left = '50%';
                    successMessage.style.transform = 'translate(-50%, -50%)';
                    successMessage.style.padding = '20px';
                    successMessage.style.backgroundColor = 'white';
                    successMessage.style.borderRadius = '8px';
                    successMessage.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    successMessage.style.zIndex = '2000';
                    successMessage.innerHTML = `
                        <h3 style="color: #10b981; margin-bottom: 10px;">Account Created Successfully!</h3>
                        <p>Redirecting to login page...</p>
                    `;
                    document.body.appendChild(successMessage);

                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    // Show error message
                    errorMessage.textContent = data.message || 'Signup failed. Please try again.';
                    errorMessage.style.display = 'block';
                    // Remove overlay
                    document.body.removeChild(overlay);
                }
            } catch (error) {
                console.error('Signup error:', error);
                errorMessage.textContent = 'An error occurred. Please try again.';
                errorMessage.style.display = 'block';
                // Remove overlay
                document.body.removeChild(overlay);
            } finally {
                if (!errorMessage.style.display || errorMessage.style.display === 'none') {
                    // Don't restore the button if success (we're redirecting)
                } else {
                    // Re-enable button and restore text
                    submitButton.disabled = false;
                    submitButton.textContent = 'Sign Up';
                }
            }
        });
 