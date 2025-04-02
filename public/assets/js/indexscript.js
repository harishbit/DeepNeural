
// Theme Toggle
const htmlElement = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('.material-icons');
const themeText = themeToggle.querySelector('span:not(.material-icons)');

// Check for saved theme preference or use user's system preference
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
        // Load chat history after authentication
        loadChatHistory();
    } catch (error) {
        window.location.href = '/login.html';
    }
}

// Load chat history
async function loadChatHistory() {
    try {
        // Show loading indicator in history container
        const existingContainer = document.querySelector('.history-container');
        if (existingContainer) {
            existingContainer.innerHTML = '<p style="text-align: center; padding: 1rem;">Loading history...</p>';
            existingContainer.style.display = 'block';
        }

        const response = await fetch('/api/chats/history', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load history');
        }

        const history = await response.json();
        displayChatHistory(history);
    } catch (error) {
        console.error('Error loading chat history:', error);
        // Show error message in history container
        const existingContainer = document.querySelector('.history-container');
        if (existingContainer) {
            existingContainer.innerHTML = '<p style="color: var(--error-color); text-align: center; padding: 1rem;">Failed to load history</p>';
        }
    }
}

// Display chat history in sidebar
function displayChatHistory(history) {
    // Remove existing history container if it exists
    const existingContainer = document.querySelector('.history-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const historyContainer = document.createElement('div');
    historyContainer.className = 'history-container';
    historyContainer.style.display = 'block'; // Always show it once loaded
    historyContainer.style.marginTop = '1rem';
    historyContainer.style.borderTop = '1px solid var(--border-color)';
    historyContainer.style.paddingTop = '1rem';
    historyContainer.style.maxHeight = '50vh';
    historyContainer.style.overflowY = 'auto';

    // Add header with clear all button
    const historyHeader = document.createElement('div');
    historyHeader.style.display = 'flex';
    historyHeader.style.justifyContent = 'space-between';
    historyHeader.style.alignItems = 'center';
    historyHeader.style.padding = '0 1rem 0.5rem 1rem';
    historyHeader.style.borderBottom = '1px solid var(--border-color)';
    historyHeader.style.marginBottom = '0.5rem';

    const historyTitle = document.createElement('h3');
    historyTitle.textContent = 'Chat History';
    historyTitle.style.fontSize = '1rem';
    historyTitle.style.margin = '0';
    historyTitle.style.color = 'var(--text-primary)';

    const clearAllBtn = document.createElement('button');
    clearAllBtn.innerHTML = '<span class="material-icons" style="font-size: 1rem;">delete_sweep</span> Clear All';
    clearAllBtn.style.display = 'flex';
    clearAllBtn.style.alignItems = 'center';
    clearAllBtn.style.gap = '0.25rem';
    clearAllBtn.style.fontSize = '0.8rem';
    clearAllBtn.style.padding = '0.25rem 0.5rem';
    clearAllBtn.style.border = 'none';
    clearAllBtn.style.borderRadius = '0.25rem';
    clearAllBtn.style.background = 'var(--bg-primary)';
    clearAllBtn.style.color = 'var(--error-color)';
    clearAllBtn.style.cursor = 'pointer';

    clearAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete ALL chat history? This cannot be undone.')) {
            try {
                const response = await fetch('/api/chats', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (response.ok) {
                    // Show success message
                    historyContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No chat history</p>';
                    // Clear current chat if any
                    messageContainer.innerHTML = '';
                    document.querySelector('.chat-header h2').textContent = 'New Chat';
                } else {
                    alert('Failed to clear chat history');
                }
            } catch (error) {
                console.error('Error clearing history:', error);
                alert('Error clearing chat history');
            }
        }
    });

    historyHeader.appendChild(historyTitle);
    historyHeader.appendChild(clearAllBtn);
    historyContainer.appendChild(historyHeader);

    if (!history || history.length === 0) {
        historyContainer.innerHTML += '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No chat history</p>';
    } else {
        const historyList = document.createElement('div');
        historyList.className = 'history-list';

        history.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.setAttribute('data-chat-id', chat._id);
            historyItem.style.display = 'flex';
            historyItem.style.alignItems = 'center';
            historyItem.style.padding = '0.75rem 1rem';
            historyItem.style.margin = '0.25rem 0';
            historyItem.style.borderRadius = '0.5rem';
            historyItem.style.cursor = 'pointer';
            historyItem.style.transition = 'background-color 0.2s';
            historyItem.style.backgroundColor = 'var(--bg-primary)';
            historyItem.style.color = 'var(--text-primary)';

            // Check if this is the current active chat
            const currentChatId = sessionStorage.getItem('currentChatId');
            if (currentChatId === chat._id) {
                historyItem.style.backgroundColor = 'var(--bg-accent-light)';
                historyItem.style.borderLeft = '2px solid var(--accent-color)';
            }

            historyItem.innerHTML = `
                <span class="material-icons" style="font-size: 1.2rem; margin-right: 0.75rem; color: var(--text-secondary);">chat</span>
                <div style="flex-grow: 1; overflow: hidden;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.title || 'Chat'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${formatDate(new Date(chat.updatedAt))}
                    </div>
                </div>
            `;

            historyItem.addEventListener('mouseover', () => {
                if (currentChatId !== chat._id) {
                    historyItem.style.backgroundColor = 'var(--bg-hover)';
                }
            });

            historyItem.addEventListener('mouseout', () => {
                if (currentChatId !== chat._id) {
                    historyItem.style.backgroundColor = 'var(--bg-primary)';
                }
            });

            historyItem.addEventListener('click', () => {
                // Load the chat
                loadChat(chat._id);

                // Update the active state
                document.querySelectorAll('.history-item').forEach(item => {
                    item.style.backgroundColor = 'var(--bg-primary)';
                    item.style.borderLeft = 'none';
                });
                historyItem.style.backgroundColor = 'var(--bg-accent-light)';
                historyItem.style.borderLeft = '2px solid var(--accent-color)';
            });

            historyList.appendChild(historyItem);
        });

        historyContainer.appendChild(historyList);
    }

    // Format date helper
    function formatDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date >= today) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date >= yesterday) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    // Add to sidebar
    const sidebar = document.getElementById('sidebar');
    sidebar.appendChild(historyContainer);
}

// Load specific chat
async function loadChat(chatId) {
    try {
        const response = await fetch(`/api/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load chat');
        }

        const chat = await response.json();

        // Clear the message container
        messageContainer.innerHTML = '';

        // Add each message to the container
        if (chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(msg => {
                addMessage(msg.content, msg.isUser);
            });
        }

        // Update active state for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('.history-item.active')?.classList.remove('active');

        // Set the chat title as header
        document.querySelector('.chat-header h2').textContent = chat.title || 'Chat';

    } catch (error) {
        console.error('Error loading chat:', error);
        messageContainer.innerHTML = '<div class="message ai-message">Error loading chat</div>';
    }
}

// Toggle history view - moved to its own function
function toggleHistoryView() {
    const historyContainer = document.querySelector('.history-container');
    if (historyContainer) {
        historyContainer.style.display = historyContainer.style.display === 'none' ? 'block' : 'none';
    } else {
        // Load history if it doesn't exist yet
        loadChatHistory();
    }
}

// Event listeners
const historyLink = document.getElementById('history-link');
if (historyLink) {
    historyLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleHistoryView();
    });
}

// Handle logout with simpler approach
function logout() {
    console.log('Logout function called');

    // Show a simple alert
    alert('Are you sure you want to log out?');

    // Directly redirect to login page after a brief delay
    setTimeout(function () {
        window.location.href = '/login.html';
    }, 500000);

    // Make the API call to clear the session
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).catch(function (error) {
        console.error('Logout error:', error);
        // Error already handled by redirect
    });

    // Clear client-side storage
    localStorage.clear();
    sessionStorage.clear();

    return false;
}

// This is now redundant but keeping as backup
document.addEventListener('DOMContentLoaded', function () {
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
            return false;
        });
    }
});

// New chat functionality
document.getElementById('new-chat').addEventListener('click', (e) => {
    e.preventDefault();
    messageContainer.innerHTML = '';
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
});

// Initialize the page
checkAuth();

// Handle chat functionality
const messageContainer = document.getElementById('messageContainer');
const userInput = document.getElementById('userInput');
const chatForm = document.getElementById('chat-form');

// Add direct event listeners (no need to wait for DOMContentLoaded)
chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage();
});

userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    console.log("Sending message:", message);

    // Clear input and focus it for next message
    userInput.value = '';
    userInput.focus();

    // Add user message to chat
    addMessage(message, true);

    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    const loadingElement = document.createElement('div');
    loadingElement.id = loadingId;
    loadingElement.className = 'message ai-message';

    // Create a better loading animation
    loadingElement.innerHTML = `
        <div class="sender">DeepNeural</div>
        <div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    // Add some CSS for the typing indicator
    if (!document.getElementById('typing-indicator-style')) {
        const style = document.createElement('style');
        style.id = 'typing-indicator-style';
        style.textContent = `
            .typing-indicator {
                display: inline-flex;
                align-items: center;
            }
            .typing-indicator span {
                height: 8px;
                width: 8px;
                background: var(--text-secondary);
                border-radius: 50%;
                display: block;
                margin: 0 3px;
                opacity: 0.4;
            }
            .typing-indicator span:nth-child(1) {
                animation: pulse 1s infinite 0s;
            }
            .typing-indicator span:nth-child(2) {
                animation: pulse 1s infinite 0.2s;
            }
            .typing-indicator span:nth-child(3) {
                animation: pulse 1s infinite 0.4s;
            }
            @keyframes pulse {
                0% { opacity: 0.4; }
                50% { opacity: 1; }
                100% { opacity: 0.4; }
            }
        `;
        document.head.appendChild(style);
    }

    messageContainer.appendChild(loadingElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Set a timeout to show an error if the request takes too long
    const timeoutId = setTimeout(() => {
        console.log("Request timeout reached");

        // Check if the loading element still exists
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.remove();
            addMessage("I'm sorry, the request is taking longer than expected. Please try again with a shorter message.", false);
        }
    }, 30000); // 30 seconds timeout

    // Call the API
    fetch('/run-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: message })
    })
        .then(response => {
            console.log("Response received, status:", response.status);
            return response.json();
        })
        .then(data => {
            // Clear timeout since we got a response
            clearTimeout(timeoutId);

            // Remove loading message
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) {
                loadingEl.remove();
            }

            console.log("Response data:", data);

            if (data && data.response) {
                // Add the AI response to the chat
                addMessage(data.response, false);

                // Try to save to history if needed
                try {
                    saveChatToHistory(message, data.response);
                } catch (e) {
                    console.error("Error saving to history:", e);
                }
            } else {
                console.error("Invalid response format:", data);
                addMessage("Sorry, I couldn't understand the response. Please try again.", false);
            }
        })
        .catch(error => {
            // Clear timeout since we got a response (error)
            clearTimeout(timeoutId);

            // Remove loading message
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) {
                loadingEl.remove();
            }

            console.error("Error calling API:", error);
            addMessage("Sorry, there was an error connecting to the server. Please check your connection and try again.", false);
        });
}

function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    // Create sender label
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = isUser ? 'You' : 'DeepNeural';
    messageDiv.appendChild(senderDiv);

    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.textContent = message;
    messageDiv.appendChild(contentDiv);

    // Add to container
    messageContainer.appendChild(messageDiv);

    // Ensure scroll to bottom happens after DOM update
    setTimeout(() => {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 0);
}

// Save chat to history
async function saveChatToHistory(userMessage, aiResponse) {
    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { content: userMessage, isUser: true },
                    { content: aiResponse, isUser: false }
                ]
            })
        });
        if (response.ok) {
            loadChatHistory(); // Reload history
        }
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

// Clear chat functionality
document.querySelector('.clear-chat').addEventListener('click', () => {
    messageContainer.innerHTML = '';
});
