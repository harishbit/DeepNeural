// // Modern JavaScript with async/await
// async function sendJson() {
//     try {
//         const response = await fetch('/api/data', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 message: 'Hello from client'
//             })
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         const data = await response.json();
//         displayJson(data);
//     } catch (error) {
//         console.error('Error:', error);
//         displayError(error.message);
//     }
// }

// function displayJson(data) {
//     const outputElement = document.getElementById('output');
//     outputElement.textContent = JSON.stringify(data, null, 2);
// }

// function displayError(message) {
//     const outputElement = document.getElementById('output');
//     outputElement.textContent = `Error: ${message}`;
//     outputElement.style.color = '#e74c3c';
// }

// // Add loading state
// document.querySelector('button').addEventListener('click', () => {
//     const outputElement = document.getElementById('output');
//     outputElement.textContent = 'Loading...';
//     outputElement.style.color = '#333';
// });

// // Chat interface functionality
// const chatMessages = document.getElementById('chat-messages');
// const userInput = document.getElementById('user-input');
// const sendButton = document.getElementById('send-button');

// // Auto-resize textarea
// userInput.addEventListener('input', () => {
//     userInput.style.height = 'auto';
//     userInput.style.height = userInput.scrollHeight + 'px';
// });

// // Handle send button click
// sendButton.addEventListener('click', sendMessage);

// // Handle enter key (shift+enter for new line)
// userInput.addEventListener('keydown', (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//         e.preventDefault();
//         sendMessage();
//     }
// });

// async function sendMessage() {
//     const messageInput = document.getElementById('user-input');
//     const message = messageInput.value.trim();
//     
//     if (!message) return;
//     
//     // Clear input
//     messageInput.value = '';
//     
//     // Add user message to chat
//     const userMessageElement = createMessageElement(message, 'user-message');
//     chatMessages.appendChild(userMessageElement);
//     
//     // Create AI message element
//     const aiMessageElement = createMessageElement('', 'ai-message');
//     chatMessages.appendChild(aiMessageElement);
//     
//     try {
//         // Create EventSource for streaming response
//         const eventSource = new EventSource(`/run-script?prompt=${encodeURIComponent(message)}`);
//         
//         eventSource.onmessage = (event) => {
//             const data = JSON.parse(event.data);
//             if (data.response) {
//                 aiMessageElement.textContent = data.response;
//             }
//         };
//         
//         eventSource.onerror = (error) => {
//             console.error('EventSource error:', error);
//             eventSource.close();
//             aiMessageElement.textContent = 'Sorry, there was an error processing your request.';
//         };
//         
//         // Close EventSource when complete
//         eventSource.onclose = () => {
//             eventSource.close();
//         };
//         
//     } catch (error) {
//         console.error('Error:', error);
//         aiMessageElement.textContent = 'Sorry, there was an error processing your request.';
//     }
//     
//     // Scroll to bottom
//     chatMessages.scrollTop = chatMessages.scrollHeight;
// }

// // Add welcome message
// window.addEventListener('load', () => {
//     const welcomeDiv = document.createElement('div');
//     welcomeDiv.className = 'message assistant-message';
//     chatMessages.appendChild(welcomeDiv);
//     displayMessageWordByWord('Hello! How can I help you today?', welcomeDiv);
// });

// document.getElementById("send-button").addEventListener("click", function () {
//     let chatInputContainer = document.querySelector(".chat-input-container");

//     // Toggle class to move input box down
//     if (chatInputContainer.classList.contains("move-down")) {
//         chatInputContainer.classList.remove("move-down");
//     } else {
//         chatInputContainer.classList.add("move-down");
//     }
// });

// Chat interface functionality
const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const typingInput = document.querySelector(".typing-input");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const historyList = document.querySelector(".history-list");
const newChatBtn = document.querySelector(".new-chat-btn");

// Sidebar Toggle Functionality
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.history-sidebar');
    const mainContent = document.querySelector('.main-content');
    const floatingToggleBtn = document.querySelector('.floating-toggle-btn');
    const toggleText = floatingToggleBtn.querySelector('.toggle-text');
    const newChatBtn = document.querySelector('.new-chat-btn');

    // Function to update sidebar state
    const updateSidebarState = (isCollapsed) => {
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        }
        toggleText.textContent = isCollapsed ? 'Previous chat' : 'Close sidebar';
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    };

    // Function to toggle sidebar
    const toggleSidebar = () => {
        const willBeCollapsed = !sidebar.classList.contains('collapsed');
        updateSidebarState(willBeCollapsed);
    };

    // Check if there's a saved state in localStorage
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    updateSidebarState(isSidebarCollapsed);

    // Add click event for menu button
    floatingToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
    });

    // Handle new chat functionality
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Clear chat and show header
            const chatList = document.querySelector('.chat-list');
            if (chatList) {
                chatList.innerHTML = '';
            }
            document.body.classList.remove('hide-header');

            // Close sidebar
            updateSidebarState(true);
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            document.body.classList.add('mobile');
            // On mobile, sidebar is closed by default
            updateSidebarState(true);
        } else {
            document.body.classList.remove('mobile');
            // On desktop, restore saved state
            const savedState = localStorage.getItem('sidebarCollapsed') === 'true';
            updateSidebarState(savedState);
        }
    });

    // Initial mobile check
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile');
        updateSidebarState(true);
    }
});

// Function to create a history item
const createHistoryItem = (chat) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.chatId = chat._id; // Store chat ID in the element

    const preview = document.createElement("div");
    preview.className = "message-preview";
    preview.textContent = chat.userMessage;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn material-symbols-rounded";
    deleteBtn.textContent = "delete";

    // Delete individual chat
    deleteBtn.onclick = async (e) => {
        e.stopPropagation(); // Prevent chat loading when deleting
        e.preventDefault();

        if (confirm("Delete this chat?")) {
            try {
                const response = await fetch(`/api/history/${chat._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to delete chat');
                }

                // Remove the chat item from UI
                const chatItem = document.querySelector(`.history-item[data-chat-id="${chat._id}"]`);
                if (chatItem) {
                    chatItem.remove();
                }

                // If this was the currently displayed chat, clear it
                const currentMessage = chatList.querySelector(`.message.outgoing .text`);
                if (currentMessage && currentMessage.textContent === chat.userMessage) {
                    chatList.innerHTML = "";
                    document.body.classList.remove("hide-header");
                }

                // Check if there are any remaining chats
                const remainingChats = document.querySelectorAll('.history-item');
                if (remainingChats.length === 0) {
                    // If no chats left, show the header
                    document.body.classList.remove("hide-header");
                }

            } catch (error) {
                console.error('Error deleting chat:', error);
                alert(error.message || 'Failed to delete chat. Please try again.');
            }
        }
    };
};

// Load chat history from MongoDB
const loadChatHistory = async () => {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error('Failed to fetch history');

        const history = await response.json();

        // Clear history list
        historyList.innerHTML = "";

        // Add each chat to history sidebar
        history.forEach(chat => {
            const historyItem = createHistoryItem(chat);
            historyList.appendChild(historyItem);
        });

        // If there's chat history, load the most recent chat
        if (history.length > 0) {
            const latestChat = history[0];

            // Clear chat list
            chatList.innerHTML = "";

            // Add user message
            const { div: userMessageDiv, messageText: userMessageText } = createMessageElement(latestChat.userMessage, "outgoing");
            userMessageText.textContent = latestChat.userMessage;
            chatList.appendChild(userMessageDiv);

            // Add AI response
            const { div: aiMessageDiv, messageText: aiMessageText } = createMessageElement(latestChat.aiResponse, "incoming");
            aiMessageText.textContent = latestChat.aiResponse;
            chatList.appendChild(aiMessageDiv);

            // Hide header
            document.body.classList.add("hide-header");
        } else {
            // If no history, show header
            chatList.innerHTML = "";
            document.body.classList.remove("hide-header");
        }

        chatList.scrollTo(0, chatList.scrollHeight);
    } catch (error) {
        console.error('Error loading chat history:', error);
        alert('Failed to load chat history. Please refresh the page.');
    }
};

// Load history when page loads
loadChatHistory();

// Create a new message element
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const messageText = document.createElement("p");
    messageText.className = "text";

    messageContent.appendChild(messageText);
    div.appendChild(messageContent);

    // Add copy button for incoming messages
    if (classes.includes("incoming")) {
        const copyIcon = document.createElement("span");
        copyIcon.className = "icon material-symbols-rounded";
        copyIcon.textContent = "content_copy";
        copyIcon.onclick = () => copyMessage(copyIcon);
        div.appendChild(copyIcon);
    }

    return { div, messageText };
}

// Copy message content
const copyMessage = (copyIcon) => {
    const messageText = copyIcon.parentElement.querySelector(".text").textContent;
    navigator.clipboard.writeText(messageText).then(() => {
        copyIcon.textContent = "check";
        setTimeout(() => {
            copyIcon.textContent = "content_copy";
        }, 2000);
    });
}

// Function to show typing effect
const showTypingEffect = (text, messageElement, delay = 50) => {
    return new Promise((resolve) => {
        const words = text.split(' ');
        let currentIndex = 0;

        const typeNextWord = () => {
            if (currentIndex < words.length) {
                messageElement.textContent += (currentIndex === 0 ? '' : ' ') + words[currentIndex];
                currentIndex++;
                setTimeout(typeNextWord, delay);
            } else {
                resolve();
            }
        };

        setTimeout(typeNextWord, 500);
    });
}

// Handle suggestion clicks
document.querySelectorAll(".suggestion").forEach(suggestion => {
    suggestion.addEventListener("click", () => {
        const text = suggestion.querySelector(".text").textContent;
        typingInput.value = text;
        typingForm.dispatchEvent(new Event("submit"));
    });
});

// Handle theme toggle
toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
});

// Handle delete chat (now also clears MongoDB history)
deleteChatButton.addEventListener("click", async () => {
    if (confirm("Would you like to return to the home page?")) {
        try {
            // Clear MongoDB history
            const response = await fetch('/api/history', {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to clear chat history');
            }

            // Clear UI
            chatList.innerHTML = "";
            localStorage.removeItem("savedChats");
            document.body.classList.remove("hide-header");
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    }
});

async function sendMessage() {
    const messageInput = document.getElementById('user-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    
    // Add user message to chat
    const { div: userMessageElement } = createMessageElement(message, 'outgoing'); 
    chatList.appendChild(userMessageElement);
    userMessageElement.querySelector('.text').textContent = message; 
    
    // Create AI message element
    const { div: aiMessageElement, messageText: aiMessageText } = createMessageElement('', 'incoming'); 
    chatList.appendChild(aiMessageElement);
    
    // Scroll to show the latest messages
    chatList.scrollTop = chatList.scrollHeight;

    try {
        // Send message to server
        const response = await fetch('/run-script', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // In the sendMessage function, modify this section:
if (data.response) {
    // Improved word splitting with regex
    const words = data.response.split(/(\s+)/).filter(word => word.trim().length > 0);
    aiMessageText.textContent = '';
    
    for (const word of words) {
        aiMessageText.textContent += word + ' ';
        
        // Smooth scrolling
        chatList.scrollTo({
            top: chatList.scrollHeight,
            behavior: 'smooth'
        });
        
        // Increased delay to 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Cleanup trailing space
    aiMessageText.textContent = aiMessageText.textContent.trim();
} else {

            aiMessageText.textContent = "Sorry, I couldn't generate a response.";
        }
        
    } catch (error) {
        console.error('Error:', error);
        aiMessageText.textContent = 'Sorry, there was an error processing your request.';
    }
    
    // Scroll to bottom again after response is displayed
    chatList.scrollTop = chatList.scrollHeight;
}






