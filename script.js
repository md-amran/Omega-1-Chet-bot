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
const N8N_WEBHOOK_URL = 'https://mdamran914.app.n8n.cloud/webhook/Omega1';
const TEST_MODE = false;

// ===== Auto-resize Textarea =====
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// ===== Send Message Function =====
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) {
        showNotification('Please type a message!', 'warning');
        return;
    }

    // Add user message
    addMessageToChat(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const loadingId = showTypingIndicator();

    // TEST MODE
    if (TEST_MODE) {
        setTimeout(() => {
            removeTypingIndicator(loadingId);
            addMessageToChat(`TEST: "${message}" received.`, 'bot');
            saveToHistory(message);
            sendBtn.disabled = false;
        }, 1000);
        return;
    }

    try {
        console.log('🔄 Sending to N8N:', N8N_WEBHOOK_URL);
        
        // GET method এর জন্য URL এ query parameter
        const urlWithParams = `${N8N_WEBHOOK_URL}?chatInput=${encodeURIComponent(message)}&timestamp=${Date.now()}&userId=web_user`;
        
        // CORS proxy ব্যবহার
        const finalUrl = 'https://corsproxy.io/?' + encodeURIComponent(urlWithParams);
        
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });

        console.log('📥 Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const responseText = await response.text();
        console.log('✅ Response:', responseText);
        
        removeTypingIndicator(loadingId);
        
        // Process response
        let aiResponse = responseText;
        
        try {
            const jsonData = JSON.parse(responseText);
            if (jsonData.output) aiResponse = jsonData.output;
            else if (jsonData.response) aiResponse = jsonData.response;
            else if (jsonData.text) aiResponse = jsonData.text;
            else if (jsonData.message) aiResponse = jsonData.message;
        } catch (e) {
            console.log('Response is plain text');
        }
        
        if (!aiResponse || aiResponse.trim() === '') {
            aiResponse = `I received: "${message}". Response was empty.`;
        }
        
        addMessageToChat(aiResponse, 'bot');
        saveToHistory(message);

    } catch (error) {
        console.error('❌ Error:', error);
        removeTypingIndicator(loadingId);
        
        let errorMessage = "";
        
        if (error.message.includes('405')) {
            errorMessage = `⚠️ **Method Not Allowed**\nPlease check N8N webhook method.`;
        } else if (error.message.includes('500')) {
            errorMessage = `🚨 **Server Error**\nN8N workflow has internal error.`;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = `🌐 **Network Error**\nCheck your connection.`;
        } else {
            errorMessage = `Error: ${error.message}`;
        }
        
        addMessageToChat(errorMessage, 'bot');
    }

    sendBtn.disabled = false;
    userInput.focus();
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
    if (!text) return '<p>No content</p>';
    
    let formatted = String(text)
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    
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
                <span class="message-time">Thinking...</span>
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
    if (indicator) indicator.remove();
}

// ===== Save to History =====
function saveToHistory(message) {
    const historyContainer = document.querySelector('.chat-history');
    if (!historyContainer) return;
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const shortMessage = message.length > 25 ? 
        message.substring(0, 25) + '...' : message;
    
    historyItem.innerHTML = `
        <i class="fas fa-comment"></i>
        <span>${shortMessage}</span>
    `;
    
    // Click event for history items
    historyItem.addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        historyItem.classList.add('active');
        
        // Simulate loading this chat
        addMessageToChat(`Loading: "${shortMessage}"...`, 'bot');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
    
    historyContainer.appendChild(historyItem);
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'warning' ? '#f39c12' : '#10a37f'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== All Button Event Listeners =====

// 1. Send Button
sendBtn.addEventListener('click', sendMessage);

// 2. Enter Key
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 3. New Chat Button
newChatBtn.addEventListener('click', () => {
    if (chatContainer.children.length > 1) {
        if (confirm('Start a new chat? Current chat will be cleared.')) {
            // Clear all messages except the welcome message
            while (chatContainer.children.length > 1) {
                chatContainer.removeChild(chatContainer.lastChild);
            }
            
            // Add a new bot message
            addMessageToChat("✨ New chat started! I'm ready for our conversation. What would you like to discuss?", 'bot');
            
            // Show notification
            showNotification('New chat started', 'info');
        }
    } else {
        showNotification('No active chat to clear', 'warning');
    }
});

// 4. Clear Chat Button
clearChatBtn.addEventListener('click', () => {
    if (chatContainer.children.length > 1) {
        if (confirm('Clear the entire conversation?')) {
            // Clear all messages except the welcome message
            while (chatContainer.children.length > 1) {
                chatContainer.removeChild(chatContainer.lastChild);
            }
            
            // Add a bot confirmation message
            addMessageToChat("🗑️ Conversation cleared. How can I assist you now?", 'bot');
            
            // Show notification
            showNotification('Conversation cleared', 'info');
        }
    } else {
        showNotification('Chat is already empty', 'warning');
    }
});

// 5. Menu Toggle Button (Mobile)
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

// 6. Sidebar Overlay (Mobile)
sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// 7. Settings Button (Placeholder)
document.querySelector('.icon-btn[title="Settings"]').addEventListener('click', () => {
    showNotification('Settings feature coming soon!', 'info');
});

// 8. History Items Click Events
document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', function(e) {
        // Remove active class from all items
        document.querySelectorAll('.history-item').forEach(i => {
            i.classList.remove('active');
        });
        
        // Add active class to clicked item
        this.classList.add('active');
        
        // Show a message in chat
        const chatTitle = this.querySelector('span').textContent;
        addMessageToChat(`Loading: "${chatTitle}"...`, 'bot');
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Focus input field
    userInput.focus();
    sendBtn.disabled = false;
    
    // Console log initialization
    console.log('🚀 Omega 1 Chat Initialized');
    console.log('🔗 Webhook URL:', N8N_WEBHOOK_URL);
    console.log('🎯 All buttons are functional');
    
    // Welcome message
    setTimeout(() => {
        // Only add welcome if it's not already there
        if (chatContainer.children.length === 1) {
            addMessageToChat("🤖 **Omega 1 Online**\nConnected and ready to assist you!\n\nType a message to start our conversation.", 'bot');
        }
    }, 500);
    
    // Add CSS animations for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        newChatBtn.click();
    }
    
    // Ctrl/Cmd + K to clear chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearChatBtn.click();
    }
    
    // Escape to clear input
    if (e.key === 'Escape') {
        userInput.value = '';
        userInput.style.height = 'auto';
    }
    
    // Ctrl/Cmd + / to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        userInput.focus();
    }
});

// ===== Mobile Responsive Handling =====
window.addEventListener('resize', () => {
    // Auto-close sidebar on resize to desktop if open
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
});

// ===== Test Connection Function (Optional) =====
window.testConnection = async function() {
    try {
        const testUrl = 'https://corsproxy.io/?' + 
                       encodeURIComponent(`${N8N_WEBHOOK_URL}?chatInput=test&timestamp=${Date.now()}`);
        
        const response = await fetch(testUrl, { method: 'GET' });
        return {
            status: response.status,
            ok: response.ok,
            url: N8N_WEBHOOK_URL
        };
    } catch (error) {
        return { error: error.message };
    }
};