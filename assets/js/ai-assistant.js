/**
 * Modern AI Assistant - Claude-inspired Design
 * Handles modern chat interface with smooth animations and interactions
 */

class ModernAIAssistant {
    constructor() {
        this.isFirstInteraction = true;
        this.messages = [];
        this.isTyping = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupInterface();
        this.setupAutoResize();
        console.log('Modern AI Assistant initialized');
    }

    bindEvents() {
        // Input handling
        const inputArea = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (inputArea && sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
            inputArea.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-focus input
            setTimeout(() => inputArea.focus(), 100);

            // Enable/disable send button based on input
            inputArea.addEventListener('input', () => {
                sendBtn.disabled = !inputArea.value.trim();
                this.autoResize(inputArea);
            });
        }

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Capability cards removed

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.fillInput(suggestion);
            });
        });

        // Modal handling
        const attachBtn = document.getElementById('attachBtn');
        const uploadModal = document.getElementById('uploadModal');
        const closeModal = document.getElementById('closeModal');

        if (attachBtn && uploadModal) {
            attachBtn.addEventListener('click', () => {
                uploadModal.classList.add('active');
            });
        }

        if (closeModal && uploadModal) {
            closeModal.addEventListener('click', () => {
                uploadModal.classList.remove('active');
            });

            // Close modal when clicking outside
            uploadModal.addEventListener('click', (e) => {
                if (e.target === uploadModal) {
                    uploadModal.classList.remove('active');
                }
            });
        }

        // New chat button
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewChat());
        }
    }

    setupInterface() {
        // Ensure proper initial state
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.style.display = 'none';
        }
    }

    setupAutoResize() {
        // Auto-resize textarea
        const inputArea = document.getElementById('messageInput');
        if (inputArea) {
            inputArea.style.height = 'auto';
            inputArea.style.height = inputArea.scrollHeight + 'px';
        }
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    fillInput(text) {
        const inputArea = document.getElementById('messageInput');
        if (inputArea) {
            inputArea.value = text;
            inputArea.focus();
            inputArea.dispatchEvent(new Event('input'));
        }
    }

    // Capability click handler removed

    startChatMode() {
        if (!this.isFirstInteraction) return;

        // Smooth transition to chat mode
        const welcomeSection = document.getElementById('welcomeSection');
        const quickActions = document.querySelector('.quick-actions');
        const chatMessages = document.getElementById('chatMessages');

        // Hide quick actions with animation
        if (quickActions) {
            quickActions.style.opacity = '0';
            quickActions.style.transform = 'translateY(-20px)';
            setTimeout(() => quickActions.classList.add('hidden'), 300);
        }

        // Show chat messages with animation
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.classList.add('active');
                chatMessages.style.display = 'flex';
            }, 400);
        }

        // Minimize welcome section
        if (welcomeSection) {
            welcomeSection.style.minHeight = 'auto';
            welcomeSection.style.flex = 'none';
        }

        this.isFirstInteraction = false;
    }

    startNewChat() {
        // Reset to initial state
        this.isFirstInteraction = true;
        this.messages = [];

        // Clear chat messages
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
            chatMessages.classList.remove('active');
            chatMessages.style.display = 'none';
        }

        // Show welcome section again
        const welcomeSection = document.getElementById('welcomeSection');
        const quickActions = document.querySelector('.quick-actions');

        if (welcomeSection) {
            welcomeSection.style.minHeight = '60vh';
            welcomeSection.style.flex = '1';
        }

        if (quickActions) {
            quickActions.classList.remove('hidden');
            quickActions.style.opacity = '1';
            quickActions.style.transform = 'translateY(0)';
        }

        // Clear and focus input
        const inputArea = document.getElementById('messageInput');
        if (inputArea) {
            inputArea.value = '';
            inputArea.focus();
        }
    }

    async sendMessage() {
        const inputArea = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const message = inputArea.value.trim();

        if (!message) return;

        // Start chat mode
        this.startChatMode();

        // Add user message
        this.addMessage(message, 'user');
        inputArea.value = '';
        sendBtn.disabled = true;

        // Simulate AI response
        setTimeout(() => {
            this.processMessage(message);
        }, 800);
    }

    addMessage(content, sender) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom smoothly
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Store message
        this.messages.push({ content, sender, timestamp: new Date() });
    }

    processMessage(message) {
        let response = "";
        
        // Simple AI-like responses
        if (message.toLowerCase().includes('convert') || message.toLowerCase().includes('pdf')) {
            response = "I can help you convert files! Our converter supports PDF to images, images to PDF, and many other formats. Would you like me to redirect you to the main converter tool?";
        } else if (message.toLowerCase().includes('upload')) {
            response = "Great! I can guide you through the file upload process. You can drag and drop files or use the file browser. Let me take you to our converter tool.";
        } else if (message.toLowerCase().includes('compress') || message.toLowerCase().includes('resize')) {
            response = "I can help you compress and resize images! Our tool supports various quality settings and size options. Would you like to try it?";
        } else if (message.toLowerCase().includes('merge') || message.toLowerCase().includes('split')) {
            response = "PDF merging and splitting are great features! You can combine multiple PDFs or extract specific pages. Let me show you how.";
        } else if (message.toLowerCase().includes('help') || message.toLowerCase().includes('what')) {
            response = "I'm here to help with file processing! I can assist with:\n\n• PDF to image conversion\n• Image to PDF conversion\n• File compression and resizing\n• PDF merging and splitting\n• Format conversion\n\nWhat would you like to do?";
        } else {
            response = "I understand you need help with file processing. While I'm still learning, I can guide you to our powerful converter tool that handles PDFs, images, and more. What type of files are you working with?";
        }
        
        this.addMessage(response, 'ai');
    }

    handleQuickAction(action) {
        this.startChatMode();
        
        switch (action) {
            case 'upload':
                this.addMessage("I'd like to upload files for processing", 'user');
                setTimeout(() => {
                    this.addMessage("Perfect! I can help you upload and process your files. Our converter supports drag & drop, multiple file selection, and various formats. Ready to get started?", 'ai');
                }, 800);
                break;
                
            case 'examples':
                this.addMessage("Can you show me some examples?", 'user');
                setTimeout(() => {
                    this.addMessage("Here are some popular tasks I can help with:\n\n📄 Convert PDF to high-quality images\n🖼️ Combine multiple images into a PDF\n🗜️ Compress large files for sharing\n📑 Split PDFs into separate pages\n🔄 Convert between different formats\n\nWhich one interests you?", 'ai');
                }, 800);
                break;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Modern AI Assistant...');
    try {
        new ModernAIAssistant();
        console.log('Modern AI Assistant initialized successfully');
    } catch (error) {
        console.error('Error initializing Modern AI Assistant:', error);
    }
});
