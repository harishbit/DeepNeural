// Fetch chat history
function fetchChatHistory() {
    if (!isLoggedIn()) {
        console.log('User not logged in, not fetching history');
        return;
    }

    const sidebar = document.getElementById('sidebar');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading history...';
    loadingIndicator.style.padding = '1rem';
    loadingIndicator.style.color = 'var(--text-secondary)';
    loadingIndicator.style.textAlign = 'center';

    // Add loading indicator to sidebar only if history container doesn't exist
    if (!document.querySelector('.history-container')) {
        sidebar.appendChild(loadingIndicator);
    }

    fetch('/api/chats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch chat history');
            }
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            if (document.querySelector('.loading-indicator')) {
                document.querySelector('.loading-indicator').remove();
            }

            // Display chat history in sidebar
            if (data && Array.isArray(data.chats)) {
                displayChatHistory(data.chats);
            } else {
                displayChatHistory([]);
            }
        })
        .catch(error => {
            console.error('Error fetching chat history:', error);
            // Remove loading indicator
            if (document.querySelector('.loading-indicator')) {
                document.querySelector('.loading-indicator').remove();
            }

            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Failed to load chat history';
            errorMessage.style.padding = '1rem';
            errorMessage.style.color = 'var(--error-color)';
            errorMessage.style.textAlign = 'center';
            sidebar.appendChild(errorMessage);

            // Remove error message after 3 seconds
            setTimeout(() => {
                if (document.querySelector('.error-message')) {
                    document.querySelector('.error-message').remove();
                }
            }, 3000);
        });
}

// Load specific chat by ID
function loadChat(chatId) {
    // Show loading state
    messageContainer.innerHTML = '<div class="loading-indicator" style="display:flex;justify-content:center;align-items:center;height:100px;color:var(--text-secondary);">Loading chat...</div>';

    fetch(`/api/chats/${chatId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load chat');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.chat) {
                const chat = data.chat;

                // Update chat title
                document.querySelector('.chat-header h2').textContent = chat.title || 'Chat';

                // Clear message container
                messageContainer.innerHTML = '';

                // Add messages
                if (chat.messages && Array.isArray(chat.messages)) {
                    chat.messages.forEach(msg => {
                        addMessage(msg.role === 'user' ? 'You' : 'DeepNeural', msg.content, msg.role);
                    });

                    // Scroll to bottom
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }

                // Store current chat ID
                sessionStorage.setItem('currentChatId', chatId);
            } else {
                throw new Error('Invalid chat data');
            }
        })
        .catch(error => {
            console.error('Error loading chat:', error);
            messageContainer.innerHTML = '<div class="error-message" style="display:flex;justify-content:center;align-items:center;height:100px;color:var(--error-color);">Failed to load chat</div>';
        });
}

// Toggle sidebar function
function toggleSidebar() {
    const body = document.body;
    body.classList.toggle('sidebar-collapsed');

    // Save preference
    const isSidebarCollapsed = body.classList.contains('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
}

// Check login status
function checkLoginStatus() {
    // Check if user is logged in via session
    fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                // Redirect to login page if not authenticated
                window.location.href = '/login.html';
                return null;
            }
            return response.json();
        })
        .then(user => {
            if (user) {
                // Update UI with user info
                document.getElementById('username-display').textContent = user.username || 'User';
                document.getElementById('user-email-display').textContent = user.email || '';
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
            window.location.href = '/login.html';
        });
}

// Check if user is logged in
function isLoggedIn() {
    // Simple check if we have a userId in sessionStorage
    return sessionStorage.getItem('userId') !== null;
}

// Logout function
function logout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (response.ok) {
                // Clear session storage
                sessionStorage.clear();
                // Redirect to login page
                window.location.href = '/login.html';
            } else {
                throw new Error('Logout failed');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
            alert('Logout failed. Please try again.');
        });
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    // Set initial sidebar state from saved preference
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isSidebarCollapsed) {
        document.body.classList.add('sidebar-collapsed');
    }

    // Check login status
    checkLoginStatus();

    // Fetch chat history if logged in
    if (isLoggedIn()) {
        fetchChatHistory();
    }

    // Event listener for sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);

    // Event listener for floating toggle button
    document.getElementById('floating-toggle').addEventListener('click', toggleSidebar);

    // Event listener for form submission
    document.getElementById('chat-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const userInput = userInputField.value.trim();
        if (userInput) {
            sendMessage(userInput);
        }
    });

    // UI toggling
    document.getElementById('toggle-settings').addEventListener('click', toggleSettings);

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Set initial dark mode state based on saved preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.querySelector('span').textContent = 'light_mode';
    }

    // Add event listener for new chat button
    document.getElementById('new-chat-btn').addEventListener('click', function () {
        // Clear message container
        messageContainer.innerHTML = '';
        // Reset chat title
        document.querySelector('.chat-header h2').textContent = 'New Chat';
        // Clear current chat ID
        sessionStorage.removeItem('currentChatId');
    });

    // Add event listener for logout button
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Responsive textarea height
    userInputField.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
});

// Periodically refresh chat history
setInterval(fetchChatHistory, 30000); // Refresh every 30 seconds 