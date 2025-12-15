// ===== DOM Elements =====
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const newChatBtn = document.getElementById('newChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// ===== Configuration =====
const N8N_WEBHOOK_URL = 'https://mdamran914.app.n8n.cloud/webhook-test/Omega1'; // Replace with your n8n webhook URL

// ===== Auto-resize Textarea =====
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// ===== Send Message Function =====
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Add user message
    addMessageToChat(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const loadingId = showTypingIndicator();

    try {
        // Send to n8n backend
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString(),
                model: 'gpt-4'
            })
        });

        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(loadingId);
        
        // Add AI response
        const aiResponse = data.response || "I apologize, but I'm having trouble processing your request. Please try again.";
        addMessageToChat(aiResponse, 'bot');
        
        // Save to history
        saveToHistory(message);

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(loadingId);
        addMessageToChat("I'm experiencing connection issues. Please check your internet connection and try again.", 'bot');
    }

    sendBtn.disabled = false;
}

// ===== Add Message to Chat =====
function addMessageToChat(text, sender) {
    const messageDiv = document.createElement('div');
    const isUser = sender === 'user';
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}-message fade-in`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${isUser ? 'user-avatar-small' : 'bot-avatar-small'}">
            <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <h4>${isUser ? 'You' : 'Omega 1'}</h4>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">
                ${formatMessage(text)}
            </div>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ===== Format Message Text =====
function formatMessage(text) {
    // Convert markdown-style code blocks
    let formatted = text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// ===== Format Message Text =====
function formatMessage(text) {
    // Convert markdown-style code blocks
    let formatted = text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    return `<p>${formatted}</p>`;
}

// ===== Typing Indicator =====
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message fade-in';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar bot-avatar-small">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <h4>Omega 1</h4>
                <span class="message-time">Typing...</span>
            </div>
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return 'typing-indicator';
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

// ===== Save to History =====
function saveToHistory(message) {
    const historyContainer = document.querySelector('.chat-history');
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    // Shorten long messages
    const shortMessage = message.length > 30 ? 
        message.substring(0, 30) + '...' : 
        message;
    
    historyItem.innerHTML = `
        <i class="fas fa-message"></i>
        <span>${shortMessage}</span>
    `;
    
    // Add click event
    historyItem.addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        historyItem.classList.add('active');
    });
    
    historyContainer.insertBefore(historyItem, historyContainer.firstChild.nextSibling);
}

// ===== Event Listeners =====
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

newChatBtn.addEventListener('click', () => {
    if (chatContainer.children.length > 1) {
        if (confirm('Start a new chat? Your current chat will be cleared.')) {
            while (chatContainer.children.length > 1) {
                chatContainer.removeChild(chatContainer.lastChild);
            }
            addMessageToChat("Hello! I'm ready for our new conversation. What would you like to discuss?", 'bot');
        }
    }
});

clearChatBtn.addEventListener('click', () => {
    if (confirm('Clear entire conversation history?')) {
        while (chatContainer.children.length > 1) {
            chatContainer.removeChild(chatContainer.lastChild);
        }
        addMessageToChat("Conversation cleared. How can I help you now?", 'bot');
    }
});

// ===== Mobile Menu Toggle =====
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// ===== History Item Click =====
document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach(i => {
            i.classList.remove('active');
        });
        item.classList.add('active');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
});

// ===== Initial Setup =====
userInput.focus();
sendBtn.disabled = false;

// Welcome message formatting
const welcomeMessage = document.querySelector('.message .message-text');
if (welcomeMessage) {
    welcomeMessage.innerHTML = formatMessage(welcomeMessage.textContent);
}