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

  document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorMessage = document.getElementById('error-message');
      const submitButton = e.target.querySelector('button[type="submit"]');

      // Clear previous error messages
      errorMessage.style.display = 'none';

      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Logging in...';

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
          console.log('Sending login request with email:', email);
          const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              credentials: 'include', // Important for cookies
              body: JSON.stringify({ email, password })
          });

          const data = await response.json();
          console.log('Login response status:', response.status);

          if (response.ok) {
              // Login successful, redirect to main page
              console.log('Login successful, redirecting...');
              // Force a clean redirect
              window.location.href = '/';
          } else {
              // Show error message
              errorMessage.textContent = data.message || 'Login failed. Please try again.';
              errorMessage.style.display = 'block';
              // Remove overlay
              document.body.removeChild(overlay);
          }
      } catch (error) {
          console.error('Login error:', error);
          errorMessage.textContent = 'An error occurred. Please try again.';
          errorMessage.style.display = 'block';
          // Remove overlay
          document.body.removeChild(overlay);
      } finally {
          // Re-enable button and restore text
          submitButton.disabled = false;
          submitButton.textContent = 'Login';
      }
  });