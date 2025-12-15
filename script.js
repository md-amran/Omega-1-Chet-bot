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
// আপনার N8N ওয়েবহুক URL এখানে বসান
// এটা পাবেন: N8N → Workflow → Execute Workflow → Copy Webhook URL
const N8N_WEBHOOK_URL = 'https://mdamran914.app.n8n.cloud/webhook/Omega1';
// বা
// const N8N_WEBHOOK_URL = 'https://mdamran914.app.n8n.cloud/webhook-test/Omega1';

// ===== SIMPLE TEST MODE (যদি N8N কাজ না করে) =====
const TEST_MODE = true; // true করলে N8N ছাড়াই কাজ করবে

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

    // TEST MODE: সরাসরি response
    if (TEST_MODE) {
        setTimeout(() => {
            removeTypingIndicator(loadingId);
            const responses = [
                `Thanks for your message: "${message}". I'm Omega 1 AI assistant.`,
                `I received: "${message}". This is a test response since N8N webhook is not configured.`,
                `You said: "${message}". To connect with real AI, please setup N8N workflow properly.`,
                `Message received! Currently in test mode. Setup N8N with OpenAI/Gemini for full functionality.`,
                `"${message}" - noted! Configure your N8N webhook to enable AI responses.`
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessageToChat(randomResponse, 'bot');
            saveToHistory(message);
            sendBtn.disabled = false;
        }, 1000);
        return;
    }

    try {
        console.log('Sending to N8N:', N8N_WEBHOOK_URL);
        
        // CORS proxy (যদি প্রয়োজন হয়)
        const useProxy = true;
        let url = N8N_WEBHOOK_URL;
        
        if (useProxy) {
            url = 'https://corsproxy.io/?' + encodeURIComponent(N8N_WEBHOOK_URL);
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString(),
                userId: 'web_user'
            })
        });

        console.log('Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`N8N Error: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Success:', data);
        
        removeTypingIndicator(loadingId);
        
        // Extract response
        let aiResponse = data.response || data.message || data.reply || 
                        data.text || data.content || 
                        "I received your message but couldn't generate a proper response.";
        
        addMessageToChat(aiResponse, 'bot');
        saveToHistory(message);

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(loadingId);
        
        // User-friendly error messages
        let errorMessage = "Sorry, I couldn't connect to the AI service. ";
        
        if (error.message.includes('404') || error.message.includes('not registered')) {
            errorMessage += "⚠️ **N8N Webhook Issue**: Please make sure:\n" +
                          "1. Your N8N workflow is **ACTIVATED** (not just in test mode)\n" +
                          "2. You clicked **'Execute Workflow'** button\n" +
                          "3. Webhook URL is correct\n\n" +
                          "Check N8N dashboard and activate the workflow.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += "Network connection error. Check internet.";
        } else {
            errorMessage += "Error: " + error.message;
        }
        
        addMessageToChat(errorMessage, 'bot');
    }

    sendBtn.disabled = false;
}

// ===== N8N Setup Instructions =====
function showSetupInstructions() {
    const instructions = `
    **To Setup N8N Webhook Properly:**
    
    1. **Go to N8N Dashboard** (mdamran914.app.n8n.cloud)
    2. **Open your workflow** with the webhook
    3. **Click "Execute Workflow"** button on canvas
    4. **Copy the Webhook URL** that appears
    5. **Activate/Publish** the workflow
    6. **Update URL** in script.js file
    
    **Required N8N Nodes:**
    1. Webhook Node (POST method)
    2. AI/LLM Node (OpenAI, Google AI, etc.)
    3. Respond to Webhook Node
    
    **Current URL:** ${N8N_WEBHOOK_URL}
    `;
    
    console.log(instructions);
    return instructions;
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
    
    // Convert newlines to <br> and paragraphs
    let formatted = String(text)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Markdown basic formatting
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
    
    historyItem.addEventListener('click', () => {
        document.querySelectorAll('.history-item').forEach(i => {
            i.classList.remove('active');
        });
        historyItem.classList.add('active');
        addMessageToChat(`Previously: "${message}"`, 'bot');
    });
    
    historyContainer.appendChild(historyItem);
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
    if (confirm('Start new chat?')) {
        while (chatContainer.children.length > 1) {
            chatContainer.removeChild(chatContainer.lastChild);
        }
        addMessageToChat("New chat started! How can I help?", 'bot');
    }
});

clearChatBtn.addEventListener('click', () => {
    if (confirm('Clear conversation?')) {
        while (chatContainer.children.length > 1) {
            chatContainer.removeChild(chatContainer.lastChild);
        }
        addMessageToChat("Chat cleared. Ready for your questions!", 'bot');
    }
});

// ===== Mobile Menu =====
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
    sendBtn.disabled = false;
    
    // Show setup instructions in console
    console.log('⚡ Omega 1 Chat Initialized');
    console.log('🔗 Current Webhook URL:', N8N_WEBHOOK_URL);
    console.log('🛠️ Test Mode:', TEST_MODE);
    
    if (TEST_MODE) {
        console.log('📝 Running in TEST MODE - N8N is bypassed');
    } else {
        showSetupInstructions();
    }
    
    // Add setup help command
    userInput.addEventListener('input', (e) => {
        if (e.target.value === '/setup') {
            const instructions = showSetupInstructions();
            addMessageToChat(instructions, 'bot');
            userInput.value = '';
        }
        if (e.target.value === '/test') {
            addMessageToChat("Test mode is " + (TEST_MODE ? "ENABLED" : "DISABLED"), 'bot');
            userInput.value = '';
        }
    });
});