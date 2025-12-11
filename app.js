/**
 * Gemini Image Studio
 * A chat-based image generation and editing app using OpenRouter API
 * 
 * SECURITY NOTES:
 * - API key is stored in localStorage (client-side only)
 * - API key is ONLY sent to https://openrouter.ai (official API endpoint)
 * - No third-party analytics or tracking
 * - No server-side component - all data stays in your browser
 */

// ========================================
// State Management
// ========================================
const MAX_IMAGES = 10;

const state = {
    apiKey: localStorage.getItem('openrouter_api_key') || '',
    model: localStorage.getItem('selected_model') || 'google/gemini-3-pro-image-preview',
    currentImages: [], // Array of { file, base64 }
    messages: [],
    chatHistory: JSON.parse(localStorage.getItem('chat_history') || '[]'),
    currentChatId: null,
    isGenerating: false
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    newChatBtn: document.getElementById('newChatBtn'),
    historyList: document.getElementById('historyList'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Mobile
    menuBtn: document.getElementById('menuBtn'),
    
    // Chat
    chatArea: document.getElementById('chatArea'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    
    // Input
    promptInput: document.getElementById('promptInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachBtn: document.getElementById('attachBtn'),
    fileInput: document.getElementById('fileInput'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    
    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    modelSelect: document.getElementById('modelSelect'),
    saveSettings: document.getElementById('saveSettings'),
    cancelSettings: document.getElementById('cancelSettings'),
    closeSettings: document.getElementById('closeSettings'),
    
    // Other
    dropZone: document.getElementById('dropZone'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    suggestionCards: document.querySelectorAll('.suggestion-card')
};

// ========================================
// Initialization
// ========================================
function init() {
    loadSettings();
    renderChatHistory();
    setupEventListeners();
    autoResizeTextarea();
}

function loadSettings() {
    elements.apiKeyInput.value = state.apiKey;
    elements.modelSelect.value = state.model;
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Sidebar toggle
    elements.sidebarToggle?.addEventListener('click', toggleSidebar);
    elements.menuBtn?.addEventListener('click', openMobileSidebar);
    
    // New chat
    elements.newChatBtn.addEventListener('click', startNewChat);
    
    // Settings
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.saveSettings.addEventListener('click', saveSettings);
    elements.cancelSettings.addEventListener('click', closeSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettings();
    });
    
    // Input handling
    elements.promptInput.addEventListener('input', handleInputChange);
    elements.promptInput.addEventListener('keydown', handleKeyDown);
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // Image upload
    elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    
    // Suggestion cards
    elements.suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            elements.promptInput.value = prompt;
            handleInputChange();
            sendMessage();
        });
    });
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            elements.sidebar.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            e.target !== elements.menuBtn) {
            closeMobileSidebar();
        }
    });
}

// ========================================
// Sidebar Functions
// ========================================
function toggleSidebar() {
    elements.sidebar.classList.toggle('collapsed');
}

function openMobileSidebar() {
    elements.sidebar.classList.add('open');
    createSidebarOverlay();
}

function closeMobileSidebar() {
    elements.sidebar.classList.remove('open');
    removeSidebarOverlay();
}

function createSidebarOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeMobileSidebar);
    }
    setTimeout(() => overlay.classList.add('active'), 10);
}

function removeSidebarOverlay() {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

// ========================================
// Chat Functions
// ========================================
function startNewChat() {
    state.currentChatId = null;
    state.messages = [];
    state.currentImages = [];
    
    elements.welcomeScreen.style.display = 'flex';
    elements.messagesContainer.classList.remove('active');
    elements.messagesContainer.innerHTML = '';
    clearImagePreviews();
    elements.promptInput.value = '';
    handleInputChange();
    
    closeMobileSidebar();
}

function renderChatHistory() {
    elements.historyList.innerHTML = '';
    
    state.chatHistory.forEach(chat => {
        const item = document.createElement('button');
        item.className = 'history-item';
        if (chat.id === state.currentChatId) {
            item.classList.add('active');
        }
        item.textContent = chat.title || 'Untitled Chat';
        item.addEventListener('click', () => loadChat(chat.id));
        elements.historyList.appendChild(item);
    });
}

function loadChat(chatId) {
    const chat = state.chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    state.currentChatId = chatId;
    state.messages = chat.messages || [];
    
    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.classList.add('active');
    elements.messagesContainer.innerHTML = '';
    
    state.messages.forEach(msg => {
        // Support both old format (msg.image) and new format (msg.images)
        let images = msg.images || (msg.image ? [msg.image] : []);
        
        // Show placeholder if images were removed from storage
        let content = msg.content || '';
        if (msg.imageCount && msg.imageCount > 0 && images.length === 0) {
            content = content ? content + `\n\n📷 [${msg.imageCount} image(s) - not stored in history]` : `📷 [${msg.imageCount} image(s) - not stored in history]`;
        } else if (msg.hadImage && !msg.image) {
            content = content ? content + '\n\n📷 [Image - not stored in history]' : '📷 [Image - not stored in history]';
        }
        
        renderMessage(msg.role, content, images, msg.reasoning);
    });
    
    renderChatHistory();
    closeMobileSidebar();
}

function saveCurrentChat() {
    if (state.messages.length === 0) return;
    
    // Create a lightweight version of messages without base64 images
    const lightMessages = state.messages.map(msg => {
        const lightMsg = { ...msg };
        
        // Replace base64 images with placeholder to save storage
        if (lightMsg.images && Array.isArray(lightMsg.images)) {
            lightMsg.imageCount = lightMsg.images.length;
            lightMsg.images = []; // Don't store actual images in history
        }
        if (lightMsg.image) {
            lightMsg.hadImage = true;
            lightMsg.image = null;
        }
        
        return lightMsg;
    });
    
    if (!state.currentChatId) {
        state.currentChatId = Date.now().toString();
        const firstMessage = state.messages[0]?.content || 'New Chat';
        const title = firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
        
        state.chatHistory.unshift({
            id: state.currentChatId,
            title,
            messages: lightMessages,
            createdAt: Date.now()
        });
    } else {
        const chatIndex = state.chatHistory.findIndex(c => c.id === state.currentChatId);
        if (chatIndex !== -1) {
            state.chatHistory[chatIndex].messages = lightMessages;
        }
    }
    
    // Keep only last 50 chats
    state.chatHistory = state.chatHistory.slice(0, 50);
    
    try {
        localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
    } catch (e) {
        // If still too large, keep fewer chats
        console.warn('Storage quota exceeded, reducing history...');
        state.chatHistory = state.chatHistory.slice(0, 20);
        try {
            localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
        } catch (e2) {
            // Last resort: clear history
            state.chatHistory = [];
            localStorage.removeItem('chat_history');
            console.error('Had to clear chat history due to storage limits');
        }
    }
    
    renderChatHistory();
}

// ========================================
// Message Functions
// ========================================
function renderMessage(role, content, images = null, reasoning = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Normalize images to array
    let imageArray = [];
    if (images) {
        imageArray = Array.isArray(images) ? images : [images];
    }
    
    const avatarHtml = role === 'user' 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21"/>
               <circle cx="12" cy="7" r="4"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
               <path d="M2 17L12 22L22 17"/>
               <path d="M2 12L12 17L22 12"/>
           </svg>`;
    
    let contentHtml = '';
    
    // Show reasoning if available (collapsible)
    if (reasoning && role === 'assistant') {
        const reasoningId = 'reasoning-' + Date.now();
        contentHtml += `
            <div class="message-reasoning">
                <button class="reasoning-toggle" onclick="toggleReasoning('${reasoningId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    <span>View AI Reasoning</span>
                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9L12 15L18 9"/>
                    </svg>
                </button>
                <div class="reasoning-content" id="${reasoningId}">
                    ${formatReasoning(reasoning)}
                </div>
            </div>
        `;
    }
    
    if (content) {
        // Use formatted text for assistant messages (safe), escape HTML for user messages (security)
        const formattedContent = role === 'assistant' ? formatMessageText(content) : escapeHtml(content);
        contentHtml += `<div class="message-text">${formattedContent}</div>`;
    }
    
    // Render images (support multiple)
    if (imageArray.length > 0) {
        const isMultiple = imageArray.length > 1;
        contentHtml += `<div class="message-images ${isMultiple ? 'multiple' : 'single'}">`;
        
        imageArray.forEach((imgUrl, index) => {
            const imageId = 'img-' + Date.now() + '-' + index;
            contentHtml += `
                <div class="message-image">
                    <img id="${imageId}" src="${imgUrl}" alt="Image ${index + 1}" loading="lazy">
                    ${role === 'assistant' ? `
                        <div class="image-overlay-actions">
                            <button class="image-overlay-btn" onclick="downloadImageById('${imageId}')" title="Download">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15"/>
                                    <path d="M7 10L12 15L17 10"/>
                                    <path d="M12 15V3"/>
                                </svg>
                            </button>
                            <button class="image-overlay-btn" onclick="useAsInputById('${imageId}')" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4V20H20V13"/>
                                    <path d="M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"/>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        contentHtml += `</div>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarHtml}</div>
        <div class="message-content">${contentHtml}</div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function formatReasoning(reasoning) {
    // Convert markdown-like formatting to HTML
    return reasoning
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// Toggle reasoning visibility
window.toggleReasoning = function(id) {
    const content = document.getElementById(id);
    const toggle = content.previousElementSibling;
    content.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
};

function renderTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'typingIndicator';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    elements.chatArea.scrollTop = elements.chatArea.scrollHeight;
}

// ========================================
// Input Functions
// ========================================
function handleInputChange() {
    autoResizeTextarea();
    const hasContent = elements.promptInput.value.trim() || state.currentImages.length > 0;
    elements.sendBtn.disabled = !hasContent;
    
    // Update image count indicator
    updateImageCountIndicator();
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!elements.sendBtn.disabled) {
            sendMessage();
        }
    }
}

function autoResizeTextarea() {
    const textarea = elements.promptInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// ========================================
// Image Functions
// ========================================
function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processImageFile(file));
    // Reset input to allow selecting the same file again
    e.target.value = '';
}

function handleDragEnter(e) {
    e.preventDefault();
    elements.dropZone.classList.add('active');
}

function handleDragLeave(e) {
    e.preventDefault();
    if (e.target === elements.dropZone) {
        elements.dropZone.classList.remove('active');
    }
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('active');
    
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            processImageFile(file);
        }
    });
}

function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    if (state.currentImages.length >= MAX_IMAGES) {
        alert(`Maximum ${MAX_IMAGES} images allowed. Remove some images first.`);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            file: file,
            base64: e.target.result
        };
        state.currentImages.push(imageData);
        renderImagePreviews();
        handleInputChange();
    };
    reader.readAsDataURL(file);
}

function removeImage(imageId) {
    state.currentImages = state.currentImages.filter(img => img.id !== imageId);
    renderImagePreviews();
    handleInputChange();
}

function clearImagePreviews() {
    state.currentImages = [];
    elements.imagePreviewContainer.classList.remove('active');
    elements.imagePreviewContainer.innerHTML = '';
    elements.fileInput.value = '';
}

function renderImagePreviews() {
    const container = elements.imagePreviewContainer;
    
    if (state.currentImages.length === 0) {
        container.classList.remove('active');
        container.innerHTML = '';
        return;
    }
    
    container.classList.add('active');
    container.innerHTML = state.currentImages.map(img => `
        <div class="image-preview-item" data-id="${img.id}">
            <img src="${img.base64}" alt="Preview">
            <button class="remove-image-btn" onclick="removeImageById('${img.id}')" aria-label="Remove image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6L18 18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function updateImageCountIndicator() {
    let indicator = document.querySelector('.image-count-indicator');
    
    if (state.currentImages.length === 0) {
        if (indicator) indicator.remove();
        return;
    }
    
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'image-count-indicator';
        elements.attachBtn.appendChild(indicator);
    }
    
    indicator.textContent = state.currentImages.length;
    indicator.classList.toggle('full', state.currentImages.length >= MAX_IMAGES);
}

// Global function for onclick handler
window.removeImageById = function(imageId) {
    removeImage(imageId);
};

// Global functions for button actions
window.downloadImage = function(dataUrl) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `gemini-image-${Date.now()}.png`;
    link.click();
};

window.downloadImageById = function(imageId) {
    const img = document.getElementById(imageId);
    if (img && img.src) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `gemini-image-${Date.now()}.png`;
        link.click();
    }
};

window.useAsInput = function(dataUrl) {
    if (state.currentImages.length >= MAX_IMAGES) {
        alert(`Maximum ${MAX_IMAGES} images allowed. Remove some images first.`);
        return;
    }
    const imageData = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        file: null,
        base64: dataUrl
    };
    state.currentImages.push(imageData);
    renderImagePreviews();
    handleInputChange();
    elements.promptInput.focus();
};

window.useAsInputById = function(imageId) {
    const img = document.getElementById(imageId);
    if (img && img.src) {
        if (state.currentImages.length >= MAX_IMAGES) {
            alert(`Maximum ${MAX_IMAGES} images allowed. Remove some images first.`);
            return;
        }
        const imageData = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            file: null,
            base64: img.src
        };
        state.currentImages.push(imageData);
        renderImagePreviews();
        handleInputChange();
        elements.promptInput.focus();
    }
};

// ========================================
// API Functions
// ========================================
async function sendMessage() {
    if (state.isGenerating) return;
    
    const prompt = elements.promptInput.value.trim();
    const hasImages = state.currentImages.length > 0;
    
    if (!prompt && !hasImages) return;
    
    if (!state.apiKey) {
        openSettings();
        alert('Please enter your OpenRouter API key in settings.');
        return;
    }
    
    // Show chat view
    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.classList.add('active');
    
    // Collect images to send
    const imagesToSend = state.currentImages.map(img => img.base64);
    
    // Add user message
    const userMessage = {
        role: 'user',
        content: prompt,
        images: hasImages ? imagesToSend : []  // Changed from single image to array
    };
    state.messages.push(userMessage);
    renderMessage('user', prompt, hasImages ? imagesToSend : []);
    
    // Clear input
    elements.promptInput.value = '';
    clearImagePreviews();
    handleInputChange();
    
    // Show typing indicator
    state.isGenerating = true;
    renderTypingIndicator();
    elements.loadingOverlay.classList.add('active');
    
    try {
        const response = await callOpenRouterAPI(prompt, imagesToSend);
        removeTypingIndicator();
        
        const assistantMessage = {
            role: 'assistant',
            content: response.text,
            image: response.image,
            reasoning: response.reasoning
        };
        state.messages.push(assistantMessage);
        renderMessage('assistant', response.text, response.image, response.reasoning);
        
        saveCurrentChat();
    } catch (error) {
        removeTypingIndicator();
        // Security: Only log error message, not full error object which might contain sensitive data
        console.error('API Error:', error.message);
        
        // Security: Sanitize error message to avoid exposing API key
        const safeErrorMessage = error.message?.replace(/sk-or-[a-zA-Z0-9-]+/g, '[API_KEY_HIDDEN]') || 'Unknown error';
        
        const errorMessage = {
            role: 'assistant',
            content: `Error: ${safeErrorMessage}. Please check your API key and try again.`,
            image: null
        };
        state.messages.push(errorMessage);
        renderMessage('assistant', errorMessage.content);
    } finally {
        state.isGenerating = false;
        elements.loadingOverlay.classList.remove('active');
    }
}

async function callOpenRouterAPI(prompt, images = []) {
    const messages = buildAPIMessages(prompt, images);
    
    const requestBody = {
        model: state.model,
        messages: messages,
        max_tokens: 4096
    };
    
    // Add modalities for image generation
    if (state.model.includes('image')) {
        requestBody.modalities = ['text', 'image'];
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Gemini Image Studio'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return parseAPIResponse(data);
}

function buildAPIMessages(prompt, images = []) {
    const messages = [];
    
    // Add conversation history (last 10 messages for context)
    const historyLimit = Math.max(0, state.messages.length - 10);
    for (let i = historyLimit; i < state.messages.length; i++) {
        const msg = state.messages[i];
        const content = [];
        
        if (msg.content) {
            content.push({ type: 'text', text: msg.content });
        }
        
        // Handle multiple images in history (new format)
        if (msg.images && Array.isArray(msg.images) && msg.role === 'user') {
            msg.images.forEach(imgBase64 => {
                content.push({
                    type: 'image_url',
                    image_url: { url: imgBase64 }
                });
            });
        }
        // Backward compatibility: handle single image (old format)
        else if (msg.image && msg.role === 'user') {
            content.push({
                type: 'image_url',
                image_url: { url: msg.image }
            });
        }
        
        if (content.length > 0) {
            messages.push({
                role: msg.role,
                content: content
            });
        }
    }
    
    // Add current message
    const currentContent = [];
    
    if (prompt) {
        currentContent.push({ type: 'text', text: prompt });
    }
    
    // Add all images
    if (images && images.length > 0) {
        images.forEach(imgBase64 => {
            currentContent.push({
                type: 'image_url',
                image_url: { url: imgBase64 }
            });
        });
    }
    
    if (currentContent.length > 0) {
        messages.push({
            role: 'user',
            content: currentContent
        });
    }
    
    return messages;
}

function parseAPIResponse(data) {
    const choice = data.choices?.[0];
    if (!choice) {
        throw new Error('No response from API');
    }
    
    const message = choice.message;
    let text = '';
    let image = null;
    let reasoning = '';
    
    // Check for content policy blocks
    const finishReason = choice.native_finish_reason || choice.finish_reason;
    if (finishReason === 'IMAGE_PROHIBITED_CONTENT') {
        return {
            text: '⚠️ **Image generation blocked by content policy**\n\nGoogle\'s safety filters prevented this image from being generated. Possible reasons:\n\n• Editing photos of real people may be restricted\n• Brand names/trademarks (Nike, Adidas, etc.) may be blocked\n• Content may have been flagged as potentially sensitive\n\n**Suggestions:**\n• Try describing the item generically (e.g., "sports headband" instead of "Nike headband")\n• Use illustrations or AI-generated images instead of real photos\n• Rephrase your request to avoid specific brands or identifiable people',
            image: null,
            reasoning: message.reasoning || ''
        };
    }
    
    // Handle text content
    if (typeof message.content === 'string') {
        text = message.content;
    } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
            if (part.type === 'text') {
                text += part.text;
            } else if (part.type === 'image_url') {
                image = part.image_url?.url || part.image_url;
            }
        }
    }
    
    // Handle images array (Gemini 3 Pro format)
    if (message.images && Array.isArray(message.images)) {
        for (const img of message.images) {
            if (img.type === 'image_url' && img.image_url?.url) {
                image = img.image_url.url;
                break; // Take the first image
            }
        }
    }
    
    // Handle reasoning (optional - for display)
    if (message.reasoning) {
        reasoning = message.reasoning;
    }
    
    // If no text content but has reasoning, use a summary
    if (!text && reasoning) {
        text = "Image generated successfully.";
    }
    
    // Check if image was expected but not generated
    if (!image && !text) {
        text = "The model processed your request but didn't generate an image. Try rephrasing your prompt.";
    }
    
    return { text, image, reasoning };
}

// ========================================
// Settings Functions
// ========================================
function openSettings() {
    elements.apiKeyInput.value = state.apiKey;
    elements.modelSelect.value = state.model;
    elements.settingsModal.classList.add('active');
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
}

function saveSettings() {
    state.apiKey = elements.apiKeyInput.value.trim();
    state.model = elements.modelSelect.value;
    
    localStorage.setItem('openrouter_api_key', state.apiKey);
    localStorage.setItem('selected_model', state.model);
    
    closeSettings();
}

// Clear all chat history
window.clearAllHistory = function() {
    if (confirm('Clear all chat history? This cannot be undone.')) {
        state.chatHistory = [];
        localStorage.removeItem('chat_history');
        renderChatHistory();
        startNewChat();
        console.log('Chat history cleared!');
    }
};

// ========================================
// Utility Functions
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageText(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Then apply simple markdown-like formatting
    formatted = formatted
        // Bold: **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic: *text*
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Bullet points: • item
        .replace(/•\s*/g, '<span class="bullet">•</span> ');
    
    return '<p>' + formatted + '</p>';
}

// ========================================
// Initialize App
// ========================================
document.addEventListener('DOMContentLoaded', init);

