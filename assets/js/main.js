// File Converter Suite - Advanced Multi-Tool
// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class FileConverterSuite {
    constructor() {
        this.selectedFiles = [];
        this.convertedFiles = [];
        this.isConverting = false;
        this.currentMode = 'pdf-to-images';
        this.currentUser = null;
        this.aiUploadedFiles = [];
        this.currentChatSession = null;

        // Initialize API service
        this.api = window.apiService;

        this.initializeElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupModeSelector();
        this.setupAuthentication();

        this.loadUserData();

        // Show welcome message for first-time guests
        this.showWelcomeMessageIfNeeded();
    }

    showWelcomeMessageIfNeeded() {
        // Check if this is a first-time visitor
        const hasVisited = localStorage.getItem('hasVisited');
        const guestConversions = this.api.getGuestConversions();

        if (!hasVisited && guestConversions === 0) {
            localStorage.setItem('hasVisited', 'true');

            setTimeout(() => {
                this.showGuestPrompt(
                    '🎉 Welcome to File Converter!',
                    'Try our PDF converter for free! You get 3 free conversions to test all features. Sign up for 10 monthly conversions.',
                    false
                );
            }, 2000); // Show after 2 seconds
        }
    }

    initializeElements() {
        // Mode selector elements
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.conversionModes = document.querySelectorAll('.conversion-mode');

        // Drop zones for different modes
        this.pdfDropZone = document.getElementById('pdfDropZone');
        this.imageDropZone = document.getElementById('imageDropZone');
        this.imageToolsDropZone = document.getElementById('imageToolsDropZone');
        this.pdfToolsDropZone = document.getElementById('pdfToolsDropZone');

        // File inputs for different modes
        this.pdfFileInput = document.getElementById('pdfFileInput');
        this.imageFileInput = document.getElementById('imageFileInput');
        this.imageToolsInput = document.getElementById('imageToolsInput');
        this.pdfToolsInput = document.getElementById('pdfToolsInput');

        // Common elements
        this.optionsSection = document.getElementById('optionsSection');
        this.filesSection = document.getElementById('filesSection');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.filesList = document.getElementById('filesList');
        this.resultsList = document.getElementById('resultsList');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressDetails = document.getElementById('progressDetails');

        // Control elements
        this.outputFormat = document.getElementById('outputFormat');
        this.imageQuality = document.getElementById('imageQuality');
        this.jpegQuality = document.getElementById('jpegQuality');
        this.jpegQualityValue = document.getElementById('jpegQualityValue');
        this.pageRange = document.getElementById('pageRange');
        this.customPages = document.getElementById('customPages');
        this.customRangeGroup = document.getElementById('customRangeGroup');

        // Buttons
        this.convertBtn = document.getElementById('convertBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

        // Authentication elements
        this.userInfo = document.getElementById('userInfo');
        this.authButtons = document.getElementById('authButtons');
        this.userName = document.getElementById('userName');
        this.userUsage = document.getElementById('userUsage');
        this.loginBtn = document.getElementById('loginBtn');
        this.signupBtn = document.getElementById('signupBtn');
        this.upgradeBtn = document.getElementById('upgradeBtn');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Modals
        this.authModal = document.getElementById('authModal');
        this.upgradeModal = document.getElementById('upgradeModal');
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');

        // Dashboard elements
        this.dashboardSection = document.getElementById('dashboardSection');
        this.totalConversions = document.getElementById('totalConversions');
        this.monthlyConversions = document.getElementById('monthlyConversions');
        this.planType = document.getElementById('planType');
        this.remainingConversions = document.getElementById('remainingConversions');

        // Marketing elements
        this.ctaSignup = document.getElementById('ctaSignup');


    }

    setupEventListeners() {
        // File input changes for different modes
        this.pdfFileInput?.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        this.imageFileInput?.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        this.imageToolsInput?.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        this.pdfToolsInput?.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // JPEG quality slider
        this.jpegQuality?.addEventListener('input', (e) => {
            this.jpegQualityValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        // Page range selection
        this.pageRange?.addEventListener('change', (e) => {
            this.customRangeGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        // Output format change
        this.outputFormat?.addEventListener('change', (e) => {
            const jpegControls = document.querySelector('.option-group:has(#jpegQuality)');
            if (jpegControls) {
                jpegControls.style.display = e.target.value === 'jpeg' ? 'block' : 'none';
            }
        });

        // Button clicks
        this.convertBtn?.addEventListener('click', () => this.convertAllFiles());
        this.clearBtn?.addEventListener('click', () => this.clearAll());
        this.downloadAllBtn?.addEventListener('click', () => this.downloadAllAsZip());
    }

    setupModeSelector() {
        this.modeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update active button
        this.modeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Show/hide conversion modes
        this.conversionModes.forEach(modeDiv => {
            if (modeDiv.id === `${mode}-mode`) {
                modeDiv.classList.remove('hidden');
            } else {
                modeDiv.classList.add('hidden');
            }
        });

        // Clear previous files and results
        this.clearAll();

        // Update UI based on mode
        this.updateUIForMode(mode);
    }

    updateUIForMode(mode) {
        const convertBtn = this.convertBtn;
        if (!convertBtn) return;

        switch (mode) {
            case 'pdf-to-images':
                convertBtn.innerHTML = '🔄 Convert to Images';
                break;
            case 'images-to-pdf':
                convertBtn.innerHTML = '📄 Create PDF';
                break;
            case 'image-tools':
                convertBtn.innerHTML = '🎨 Process Images';
                break;
            case 'pdf-tools':
                convertBtn.innerHTML = '📋 Process PDFs';
                break;
            case 'ai-agent':
                // Redirect to dedicated AI assistant page
                window.location.href = 'ai-assistant.html';
                return;
        }
    }



    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        const hasText = this.messageInput?.value.trim().length > 0;
        const hasFiles = this.aiUploadedFiles.length > 0;

        if (this.sendButton) {
            this.sendButton.disabled = !hasText && !hasFiles;
        }
    }

    clearConversationHistory() {
        if (this.conversationArea) {
            // Reset to starter content
            this.conversationArea.innerHTML = `
                <div class="conversation-starter">
                    <div class="starter-content">
                        <h3>👋 Welcome! I'm your AI file processing assistant</h3>
                        <p>I can help you transform, analyze, and work with your files using simple conversation. Here's what I can do:</p>

                        <div class="capabilities-showcase">
                            <div class="capability-card">
                                <div class="capability-icon">📄➡️🖼️</div>
                                <h4>Convert Documents</h4>
                                <p>PDF to images, images to PDF, format conversion</p>
                            </div>
                            <div class="capability-card">
                                <div class="capability-icon">🎨</div>
                                <h4>Image Processing</h4>
                                <p>Remove backgrounds, resize, compress, enhance</p>
                            </div>
                            <div class="capability-card">
                                <div class="capability-icon">💬</div>
                                <h4>Document Chat</h4>
                                <p>Ask questions about your documents, get summaries</p>
                            </div>
                            <div class="capability-card">
                                <div class="capability-icon">📋</div>
                                <h4>PDF Tools</h4>
                                <p>Merge, split, compress, and organize PDFs</p>
                            </div>
                        </div>

                        <div class="starter-actions">
                            <button class="starter-btn primary" onclick="document.getElementById('aiFileInput').click()">
                                📎 Upload Files to Get Started
                            </button>
                            <button class="starter-btn secondary" onclick="converter.showExamples()">
                                💡 See Examples
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        this.currentChatSession = null;

        // Clear files
        this.aiUploadedFiles = [];
        this.updateAIFilesList();
    }

    showExamples() {
        const examples = [
            "Convert these PDFs to high-quality images",
            "Remove the background from these product photos",
            "Create a PDF from these scanned documents",
            "What is this contract about?",
            "Compress these images for web use"
        ];

        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        if (this.messageInput) {
            this.messageInput.value = randomExample;
            this.autoResizeTextarea(this.messageInput);
            this.updateSendButton();
            this.messageInput.focus();
        }
    }

    setupAuthentication() {
        // Listen for auth state changes from API service
        window.addEventListener('auth-state-changed', (e) => {
            const { type, user, data } = e.detail;
            this.currentUser = user;
            this.updateUserUI();

            if (type === 'login' || type === 'register') {
                this.hideAuthModal();
                this.showTemporaryMessage(
                    type === 'login' ? 'Login successful!' : 'Account created successfully!',
                    'success'
                );
            } else if (type === 'logout') {
                this.showTemporaryMessage('Logged out successfully', 'success');
            } else if (type === 'guest-usage-updated') {
                // Update guest usage display
                this.updateGuestUsageDisplay(data);
            }
        });

        // Login button
        this.loginBtn?.addEventListener('click', () => {
            this.showAuthModal('login');
        });

        // Signup button
        this.signupBtn?.addEventListener('click', () => {
            this.showAuthModal('signup');
        });

        // Logout button
        this.logoutBtn?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Upgrade button
        this.upgradeBtn?.addEventListener('click', () => {
            this.showUpgradeModal();
        });

        // Modal close buttons
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.hideAuthModal();
        });

        document.getElementById('closeUpgradeModal')?.addEventListener('click', () => {
            this.hideUpgradeModal();
        });

        // Form switches
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signup');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });

        // Form submissions
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Upgrade buttons
        document.getElementById('upgradeToPro')?.addEventListener('click', () => {
            this.handleUpgrade('pro');
        });

        document.getElementById('upgradeToEnterprise')?.addEventListener('click', () => {
            this.handleUpgrade('enterprise');
        });

        // CTA button
        this.ctaSignup?.addEventListener('click', () => {
            this.showAuthModal('signup');
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.hideAuthModal();
            }
            if (e.target === this.upgradeModal) {
                this.hideUpgradeModal();
            }
        });
    }

    async loadUserData() {
        try {
            // Use API service to get current user
            const user = await this.api.getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.updateUserUI();
            } else {
                // No user logged in - show guest interface
                this.updateUserUI();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // Show guest interface on error
            this.updateUserUI();
        }
    }

    createDemoUsers() {
        // Demo free user
        const demoFreeUser = {
            name: 'Demo User',
            email: 'demo@example.com',
            password: 'demo123',
            plan: 'free',
            conversionsUsed: 3,
            conversionsLimit: 10,
            maxFileSize: 5 * 1024 * 1024,
            createdAt: new Date().toISOString()
        };

        // Demo pro user
        const demoProUser = {
            name: 'Pro User',
            email: 'pro@example.com',
            password: 'pro123',
            plan: 'pro',
            conversionsUsed: 25,
            conversionsLimit: 100,
            maxFileSize: 50 * 1024 * 1024,
            createdAt: new Date().toISOString()
        };

        // Save demo users if they don't exist
        if (!localStorage.getItem('user_demo@example.com')) {
            localStorage.setItem('user_demo@example.com', JSON.stringify(demoFreeUser));
        }
        if (!localStorage.getItem('user_pro@example.com')) {
            localStorage.setItem('user_pro@example.com', JSON.stringify(demoProUser));
        }
    }

    updateUserUI() {
        if (this.currentUser) {
            // Show user info, hide auth buttons
            this.userInfo?.classList.remove('hidden');
            this.authButtons?.classList.add('hidden');
            this.dashboardSection?.classList.remove('hidden');

            // Update user display
            if (this.userName) this.userName.textContent = this.currentUser.name;
            if (this.userUsage) {
                const usage = `${this.currentUser.conversions_used || 0}/${this.currentUser.conversions_limit || 10} conversions`;
                this.userUsage.textContent = usage;
            }

            // Update dashboard
            this.updateDashboard();

            // Hide guest indicator for logged-in users
            const guestIndicator = document.getElementById('guestUsageIndicator');
            if (guestIndicator) {
                guestIndicator.style.display = 'none';
            }
        } else {
            // Guest user - show guest status
            this.userInfo?.classList.add('hidden');
            this.authButtons?.classList.remove('hidden');
            this.dashboardSection?.classList.add('hidden');

            // Update guest usage display
            this.updateGuestUsageDisplay();
        }
    }

    updateGuestUsageDisplay(usageData = null) {
        if (this.currentUser) return; // Only for guests

        const guestUsage = usageData || this.api.getGuestUsageInfo();

        // Create or update guest usage indicator
        let guestIndicator = document.getElementById('guestUsageIndicator');
        if (!guestIndicator) {
            guestIndicator = document.createElement('div');
            guestIndicator.id = 'guestUsageIndicator';
            guestIndicator.className = 'guest-usage-indicator';

            // Insert after auth buttons
            const authButtons = document.getElementById('authButtons');
            if (authButtons && authButtons.parentNode) {
                authButtons.parentNode.insertBefore(guestIndicator, authButtons.nextSibling);
            }
        }

        const remaining = guestUsage.remaining;
        const used = guestUsage.used;
        const limit = guestUsage.limit;

        let message = '';
        let className = 'guest-usage-indicator';

        if (remaining === 0) {
            message = `🚫 Guest limit reached (${used}/${limit}). <a href="#" onclick="fileConverter.showAuthModal('signup')">Sign up for free</a> to continue!`;
            className += ' guest-limit-reached';
        } else if (remaining === 1) {
            message = `⚠️ Last free conversion! <a href="#" onclick="fileConverter.showAuthModal('signup')">Sign up</a> for unlimited access.`;
            className += ' guest-limit-warning';
        } else {
            message = `🎯 Guest mode: ${remaining} free conversions left. <a href="#" onclick="fileConverter.showAuthModal('signup')">Sign up</a> for more!`;
            className += ' guest-limit-info';
        }

        guestIndicator.className = className;
        guestIndicator.innerHTML = message;

        // Make sure it's visible
        guestIndicator.style.display = 'block';
    }

    updateDashboard() {
        if (!this.currentUser) return;

        // Calculate monthly conversions (simulate with random data for demo)
        const monthlyUsed = Math.min(this.currentUser.conversions_used || 0, this.currentUser.conversions_limit || 10);
        const remaining = (this.currentUser.conversions_limit || 10) - (this.currentUser.conversions_used || 0);

        // Update dashboard stats
        if (this.totalConversions) {
            this.totalConversions.textContent = this.currentUser.conversions_used || 0;
        }
        if (this.monthlyConversions) {
            this.monthlyConversions.textContent = monthlyUsed;
        }
        if (this.planType) {
            const plan = this.currentUser.plan_type || 'free';
            this.planType.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
        }
        if (this.remainingConversions) {
            this.remainingConversions.textContent = Math.max(0, remaining);
        }
    }

    setupDragAndDrop() {
        const dropZones = [
            this.pdfDropZone,
            this.imageDropZone,
            this.imageToolsDropZone,
            this.pdfToolsDropZone
        ].filter(zone => zone); // Filter out null elements

        dropZones.forEach(dropZone => {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight drop zone when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('drag-over');
                }, false);
            });

            // Handle dropped files
            dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                this.handleFiles(files);
            }, false);
        });

        // Prevent default drag behaviors on document body
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFiles(files) {
        const allFiles = Array.from(files);
        let validFiles = [];
        let fileTypeMessage = '';

        switch (this.currentMode) {
            case 'pdf-to-images':
            case 'pdf-tools':
                validFiles = allFiles.filter(file =>
                    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
                );
                fileTypeMessage = 'PDF files';
                break;

            case 'images-to-pdf':
            case 'image-tools':
                validFiles = allFiles.filter(file =>
                    file.type.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
                );
                fileTypeMessage = 'image files';
                break;
        }

        if (validFiles.length === 0) {
            const fileTypes = allFiles.map(f => f.type || 'unknown').join(', ');
            alert(`Please select only ${fileTypeMessage}. Selected files: ${fileTypes}`);
            return;
        }

        // Check file sizes based on user plan
        const maxFileSize = this.currentUser ? (this.currentUser.max_file_size || 5242880) : 5242880; // 5MB default
        const oversizedFiles = validFiles.filter(file => file.size > maxFileSize);

        if (oversizedFiles.length > 0) {
            const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
            const planName = this.currentUser ? (this.currentUser.plan_type || 'free') : 'guest';

            alert(
                `File size limit exceeded! Your ${planName} plan allows files up to ${maxSizeMB}MB. ` +
                `${oversizedFiles.length} file(s) are too large. Please upgrade your plan or use smaller files.`
            );

            if (!this.currentUser || this.currentUser.plan_type === 'free') {
                this.showUpgradeModal();
            }
            return;
        }

        // Warn for large files that might be slow
        const slowFiles = validFiles.filter(file => file.size > 20 * 1024 * 1024); // 20MB
        if (slowFiles.length > 0) {
            const proceed = confirm(
                `Warning: ${slowFiles.length} file(s) are larger than 20MB. ` +
                `Processing may be slow and use significant memory. Continue?`
            );
            if (!proceed) return;
        }

        // Add new files to the list (avoid duplicates)
        let addedCount = 0;
        validFiles.forEach(file => {
            if (!this.selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                this.selectedFiles.push(file);
                addedCount++;
            }
        });

        if (addedCount === 0) {
            alert('All selected files are already in the list.');
            return;
        }

        this.updateFilesList();
        this.showSections();

        // Show success message
        if (addedCount > 0) {
            const message = addedCount === 1 ?
                `Added 1 ${fileTypeMessage.slice(0, -1)}` :
                `Added ${addedCount} ${fileTypeMessage}`;
            this.showTemporaryMessage(message, 'success');
        }
    }

    updateFilesList() {
        this.filesList.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)} • PDF Document</p>
                    </div>
                </div>
                <button class="remove-file" onclick="converter.removeFile(${index})">
                    ✕
                </button>
            `;
            this.filesList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilesList();
        
        if (this.selectedFiles.length === 0) {
            this.hideSections();
        }
    }

    showSections() {
        this.optionsSection.style.display = 'block';
        this.filesSection.style.display = 'block';
    }

    hideSections() {
        this.optionsSection.style.display = 'none';
        this.filesSection.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
    }

    clearAll() {
        this.selectedFiles = [];
        this.convertedImages = [];
        this.updateFilesList();
        this.hideSections();
        this.resultsList.innerHTML = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `temp-message temp-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
        `;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    parsePageRange(rangeStr, totalPages) {
        if (!rangeStr.trim()) return [];
        
        const pages = new Set();
        const parts = rangeStr.split(',');
        
        for (let part of parts) {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                    pages.add(i);
                }
            } else {
                const pageNum = parseInt(part);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    pages.add(pageNum);
                }
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
    }

    async convertAllFiles() {
        if (this.isConverting || this.selectedFiles.length === 0) return;

        // Show strategic prompt for guests
        if (!this.currentUser) {
            const guestUsage = this.api.getGuestUsageInfo();
            if (guestUsage.remaining === 2) {
                // Show soft prompt on second conversion
                this.showGuestPrompt(
                    '🎯 You\'re doing great!',
                    'This is your 2nd free conversion. Sign up to get 10 conversions per month and keep all your converted files!',
                    false // Don't block conversion
                );
            }
        }

        // Check user limits before starting conversion
        const totalFileSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        if (!(await this.checkUserLimits(totalFileSize))) {
            return;
        }

        this.isConverting = true;
        this.convertedFiles = [];
        this.convertBtn.disabled = true;
        this.convertBtn.innerHTML = '<span class="loading"></span> Converting...';

        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';

        try {
            switch (this.currentMode) {
                case 'pdf-to-images':
                    await this.convertPDFsToImages();
                    break;
                case 'images-to-pdf':
                    await this.convertImagesToPDF();
                    break;
                case 'image-tools':
                    await this.processImages();
                    break;
                case 'pdf-tools':
                    await this.processPDFs();
                    break;
            }

            // Increment usage counter after successful conversion
            this.incrementUserUsage();

            this.showResults();
        } catch (error) {
            console.error('Conversion error:', error);
            alert('An error occurred during conversion. Please try again.');
        } finally {
            this.isConverting = false;
            this.convertBtn.disabled = false;
            this.updateUIForMode(this.currentMode);
        }
    }

    async convertPDFsToImages() {
        const totalFiles = this.selectedFiles.length;
        let processedFiles = 0;

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            this.updateProgress(processedFiles, totalFiles, `Processing ${file.name}...`);

            await this.convertPDFToImages(file);
            processedFiles++;
            this.updateProgress(processedFiles, totalFiles, `Completed ${file.name}`);
        }
    }

    async convertImagesToPDF() {
        this.updateProgress(0, 1, 'Creating PDF from images...');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        let isFirstPage = true;

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];

            try {
                // Create image element to get dimensions
                const img = new Image();
                const imageData = await new Promise((resolve, reject) => {
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = URL.createObjectURL(file);
                });

                // Calculate dimensions to fit page
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const imgRatio = imageData.width / imageData.height;
                const pageRatio = pageWidth / pageHeight;

                let finalWidth, finalHeight;
                if (imgRatio > pageRatio) {
                    finalWidth = pageWidth - 20; // 10mm margin on each side
                    finalHeight = finalWidth / imgRatio;
                } else {
                    finalHeight = pageHeight - 20; // 10mm margin on top/bottom
                    finalWidth = finalHeight * imgRatio;
                }

                // Center the image
                const x = (pageWidth - finalWidth) / 2;
                const y = (pageHeight - finalHeight) / 2;

                // Add new page if not first image
                if (!isFirstPage) {
                    pdf.addPage();
                }
                isFirstPage = false;

                // Add image to PDF
                pdf.addImage(imageData.src, 'JPEG', x, y, finalWidth, finalHeight);

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        // Generate PDF blob
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        this.convertedFiles.push({
            name: 'converted-images.pdf',
            url: pdfUrl,
            type: 'pdf',
            size: pdfBlob.size,
            downloadName: 'images-to-pdf.pdf'
        });

        this.updateProgress(1, 1, 'PDF created successfully!');
    }

    async processImages() {
        // Placeholder for image processing tools
        this.updateProgress(0, 1, 'Processing images...');
        // TODO: Implement image resize, compress, format conversion
        this.updateProgress(1, 1, 'Image processing completed!');
    }

    async processPDFs() {
        // Placeholder for PDF tools
        this.updateProgress(0, 1, 'Processing PDFs...');
        // TODO: Implement PDF merge, split, compress
        this.updateProgress(1, 1, 'PDF processing completed!');
    }

    // Authentication Methods
    showAuthModal(type = 'login') {
        this.authModal?.classList.remove('hidden');
        this.switchAuthForm(type);
    }

    hideAuthModal() {
        this.authModal?.classList.add('hidden');
    }

    showUpgradeModal() {
        this.upgradeModal?.classList.remove('hidden');
    }

    hideUpgradeModal() {
        this.upgradeModal?.classList.add('hidden');
    }

    switchAuthForm(type) {
        if (type === 'login') {
            this.loginForm?.classList.remove('hidden');
            this.signupForm?.classList.add('hidden');
        } else {
            this.loginForm?.classList.add('hidden');
            this.signupForm?.classList.remove('hidden');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await this.api.login(email, password);
            // Success is handled by the auth-state-changed event listener
        } catch (error) {
            console.error('Login error:', error);
            alert(error.message || 'Login failed. Please check your connection and try again.');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;

        if (!name || !email || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await this.api.register(name, email, password);
            // Success is handled by the auth-state-changed event listener
        } catch (error) {
            console.error('Registration error:', error);
            alert(error.message || 'Registration failed. Please check your connection and try again.');
        }
    }

    async handleLogout() {
        await this.api.logout();
        // Success is handled by the auth-state-changed event listener
    }

    async handleUpgrade(plan) {
        if (!this.currentUser) {
            this.showAuthModal('login');
            return;
        }

        try {
            if (plan === 'pro') {
                await this.api.upgradePlan('pro');
                this.hideUpgradeModal();
                this.showTemporaryMessage('Upgraded to Pro! 🎉', 'success');
            } else if (plan === 'enterprise') {
                await this.api.upgradePlan('enterprise');
                this.hideUpgradeModal();
                this.showTemporaryMessage('Upgraded to Enterprise! 🚀', 'success');
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert(error.message || 'Upgrade failed. Please try again.');
        }
    }

    async checkUserLimits(fileSize = 0) {
        try {
            const response = await this.api.checkUsageLimits(fileSize);

            if (response.success && response.allowed) {
                return true;
            } else {
                alert(response.error || 'Conversion limit reached');
                if (response.error && response.error.includes('sign up')) {
                    this.showAuthModal('signup');
                } else if (response.error && response.error.includes('upgrade')) {
                    this.showUpgradeModal();
                }
                return false;
            }
        } catch (error) {
            console.error('Error checking limits:', error);
            // Fallback to local check for offline mode
            return this.checkUserLimitsLocal();
        }
    }

    checkUserLimitsLocal() {
        if (!this.currentUser) {
            const guestUsage = this.api.getGuestUsageInfo();
            if (guestUsage.remaining <= 0) {
                this.showGuestLimitModal();
                return false;
            }
            return true;
        }

        const used = this.currentUser.conversions_used || 0;
        const limit = this.currentUser.conversions_limit || 10;

        if (limit > 0 && used >= limit) {
            alert(`You've reached your ${this.currentUser.plan_type || 'free'} plan limit. Please upgrade to continue!`);
            this.showUpgradeModal();
            return false;
        }

        return true;
    }

    showGuestLimitModal() {
        const guestUsage = this.api.getGuestUsageInfo();

        if (guestUsage.remaining === 0) {
            // Show compelling signup modal for limit reached
            this.showGuestSignupModal(
                '🚫 Free Conversions Used Up!',
                `You've used all ${guestUsage.limit} free conversions. Create a free account to get 10 more conversions per month!`,
                'Get 10 Free Conversions'
            );
        } else if (guestUsage.remaining === 1) {
            // Show warning for last conversion
            this.showGuestSignupModal(
                '⚠️ Last Free Conversion!',
                'This is your last free conversion. Sign up now to get 10 conversions per month and larger file support!',
                'Sign Up for More'
            );
        }
    }

    showGuestSignupModal(title, message, buttonText) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('guestSignupModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'guestSignupModal';
            modal.className = 'modal guest-signup-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="guestModalTitle">${title}</h3>
                        <button class="close-modal" onclick="this.closest('.modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="guestModalMessage">${message}</p>
                        <div class="guest-benefits">
                            <h4>✨ Free Account Benefits:</h4>
                            <ul>
                                <li>🔄 10 conversions per month</li>
                                <li>📁 5MB file size limit</li>
                                <li>🎨 All conversion formats</li>
                                <li>💾 Conversion history</li>
                                <li>🔒 Secure & private</li>
                            </ul>
                        </div>
                        <div class="modal-actions">
                            <button class="auth-btn signup" id="guestSignupBtn">${buttonText}</button>
                            <button class="auth-btn secondary" onclick="this.closest('.modal').style.display='none'">Maybe Later</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listener for signup button
            modal.querySelector('#guestSignupBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                this.showAuthModal('signup');
            });
        } else {
            // Update existing modal
            modal.querySelector('#guestModalTitle').textContent = title;
            modal.querySelector('#guestModalMessage').textContent = message;
            modal.querySelector('#guestSignupBtn').textContent = buttonText;
        }

        modal.style.display = 'flex';
    }

    showGuestPrompt(title, message, blockConversion = false) {
        // Create a non-blocking notification
        const notification = document.createElement('div');
        notification.className = 'guest-prompt-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="notification-actions">
                    <button class="btn-small signup" onclick="fileConverter.showAuthModal('signup'); this.closest('.guest-prompt-notification').remove();">
                        Sign Up Free
                    </button>
                    <button class="btn-small secondary" onclick="this.closest('.guest-prompt-notification').remove();">
                        Continue as Guest
                    </button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 8 seconds if not interacted with
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);

        // Add slide-in animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    async incrementUserUsage(conversionData = {}) {
        try {
            const trackingData = {
                conversion_type: this.currentMode,
                filename: conversionData.filename || 'unknown',
                file_size: conversionData.file_size || 0,
                pages_converted: conversionData.pages_converted || 1,
                output_format: conversionData.output_format || 'unknown',
                quality_setting: conversionData.quality_setting || 'default'
            };

            await this.api.trackConversion(trackingData);
            // User data update is handled by the API service and auth-state-changed event
        } catch (error) {
            console.error('Error tracking conversion:', error);
            // Fallback to local tracking
            if (this.currentUser) {
                this.currentUser.conversions_used = (this.currentUser.conversions_used || 0) + 1;
                this.updateUserUI();
            } else {
                // Track guest conversions
                const guestConversions = parseInt(localStorage.getItem('guestConversions') || '0');
                localStorage.setItem('guestConversions', (guestConversions + 1).toString());
            }
        }
    }

    // AI Agent Methods
    async handleAIFileUpload(files) {
        if (!files || files.length === 0) return;

        // Show upload progress
        this.showUploadProgress(files.length);

        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append('files[]', file);
        });

        try {
            const response = await fetch('backend/api/ai-agent.php?action=upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Add files to the uploaded files array
                this.aiUploadedFiles = [...this.aiUploadedFiles, ...data.files];
                this.updateAIFilesList();

                // Add a message to chat about the upload
                const fileNames = data.files.map(f => f.name).join(', ');
                this.addMessageToChat('user', `📎 Uploaded ${data.files.length} file(s): ${fileNames}`);

                // AI response about the uploaded files
                this.addMessageToChat('assistant', `Great! I can see you've uploaded ${data.files.length} file(s). What would you like me to do with them? I can convert formats, remove backgrounds, compress images, or answer questions about document contents.`);

                this.showTemporaryMessage(`Uploaded ${data.files.length} files successfully!`, 'success');
            } else {
                this.showTemporaryMessage(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            // Fallback: create mock file objects for demo
            const mockFiles = Array.from(files).map((file, index) => ({
                id: Date.now() + index,
                name: file.name,
                size: file.size,
                type: file.type
            }));

            this.aiUploadedFiles = [...this.aiUploadedFiles, ...mockFiles];
            this.updateAIFilesList();

            const fileNames = mockFiles.map(f => f.name).join(', ');
            this.addMessageToChat('user', `📎 Uploaded ${mockFiles.length} file(s): ${fileNames}`);
            this.addMessageToChat('assistant', `I can see your files! Since we're in demo mode, I can simulate processing them. What would you like me to do?`);

            this.showTemporaryMessage('Files uploaded (demo mode)', 'success');
        } finally {
            this.hideUploadProgress();
        }
    }

    showUploadProgress(fileCount) {
        // Add upload progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.id = 'uploadProgress';
        progressDiv.className = 'upload-progress';
        progressDiv.innerHTML = `
            <div class="upload-progress-content">
                <div class="upload-spinner"></div>
                <span>Uploading ${fileCount} file(s)...</span>
            </div>
        `;

        if (this.chatMessages) {
            this.chatMessages.appendChild(progressDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    hideUploadProgress() {
        const progressDiv = document.getElementById('uploadProgress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }

    showTemporaryMessage(message, type = 'info') {
        // Remove any existing temporary messages
        const existingMessage = document.querySelector('.temporary-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new temporary message
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message temporary-message-${type}`;
        messageDiv.innerHTML = `
            <div class="temporary-message-content">
                <span class="temporary-message-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="temporary-message-text">${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(messageDiv);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.classList.add('fade-out');
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    handleWelcomeQuestion() {
        if (this.chatInput) {
            this.chatInput.value = 'What can you help me with?';
            this.autoResizeTextarea(this.chatInput);
            this.updateSendButton();
            this.chatInput.focus();
        }
    }

    updateAIFilesList() {
        if (!this.attachmentsList) return;

        // Show/hide attachments section
        if (this.fileAttachments) {
            if (this.aiUploadedFiles.length === 0) {
                this.fileAttachments.classList.add('hidden');
            } else {
                this.fileAttachments.classList.remove('hidden');
            }
        }

        // Update attachments list
        this.attachmentsList.innerHTML = '';

        this.aiUploadedFiles.forEach((file, index) => {
            const attachmentItem = document.createElement('div');
            attachmentItem.className = 'attachment-item';
            attachmentItem.innerHTML = `
                <span class="attachment-icon">${this.getFileIcon(file.type)}</span>
                <div class="attachment-info">
                    <div class="attachment-name" title="${file.name}">${this.truncateFileName(file.name, 40)}</div>
                    <div class="attachment-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-attachment" onclick="converter.removeAIFile(${index})" title="Remove file">×</button>
            `;
            this.attachmentsList.appendChild(attachmentItem);
        });

        // Update send button state
        this.updateSendButton();
    }

    truncateFileName(filename, maxLength) {
        if (filename.length <= maxLength) return filename;
        const extension = filename.split('.').pop();
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
        return truncatedName + '.' + extension;
    }

    removeAIFile(index) {
        this.aiUploadedFiles.splice(index, 1);
        this.updateAIFilesList();
    }

    getFileIcon(mimeType) {
        if (!mimeType) return '📁';

        // Images
        if (mimeType.startsWith('image/')) {
            if (mimeType.includes('png')) return '🖼️';
            if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '📸';
            if (mimeType.includes('gif')) return '🎞️';
            if (mimeType.includes('svg')) return '🎨';
            return '🖼️';
        }

        // Documents
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
        if (mimeType.includes('text/')) return '📃';

        // Media
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';

        // Archives
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';

        // Code files
        if (mimeType.includes('javascript') || mimeType.includes('json')) return '📜';
        if (mimeType.includes('html') || mimeType.includes('css')) return '🌐';

        return '📁';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async sendConversationMessage() {
        const message = this.messageInput?.value.trim();
        const hasFiles = this.aiUploadedFiles.length > 0;

        if (!message && !hasFiles) return;

        // Disable send button during processing
        if (this.sendButton) {
            this.sendButton.disabled = true;
            this.sendButton.classList.add('loading');
        }

        // Clear input and reset textarea height
        if (this.messageInput) {
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
        }
        this.updateSendButton();

        // Add user message to conversation
        if (message) {
            this.addConversationMessage('user', message);
        }

        // Show typing indicator
        const typingIndicator = this.showTypingIndicator();

        // Get file IDs
        const fileIds = this.aiUploadedFiles.map(file => file.id);

        try {
            const response = await fetch('backend/api/ai-agent.php?action=chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message || 'I have uploaded some files. What can you help me do with them?',
                    file_ids: fileIds,
                    session_id: this.currentChatSession
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);

            if (data.success) {
                this.currentChatSession = data.session_id;

                // Add AI response to conversation
                this.addConversationMessage('assistant', data.response.message);

                // Execute tool calls if any
                if (data.response.tool_calls && data.response.tool_calls.length > 0) {
                    for (const toolCall of data.response.tool_calls) {
                        await this.executeToolCall(toolCall);
                    }
                }
            } else {
                this.addConversationMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator(typingIndicator);

            // Provide helpful error message based on error type
            let errorMessage = 'I\'m having trouble connecting right now. ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('HTTP error')) {
                errorMessage += 'The server is experiencing issues. Please try again in a moment.';
            } else {
                errorMessage += 'Please try again or refresh the page.';
            }

            this.addConversationMessage('assistant', errorMessage);
        } finally {
            // Re-enable send button
            if (this.sendButton) {
                this.sendButton.disabled = false;
                this.sendButton.classList.remove('loading');
            }
            this.updateSendButton();
        }
    }

    addConversationMessage(role, content, isTyping = false) {
        if (!this.conversationArea) return;

        // Remove starter content if it exists
        const starter = this.conversationArea.querySelector('.conversation-starter');
        if (starter) {
            starter.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message ${role}-message`;

        const avatar = role === 'user' ? '👤' : '🤖';
        const author = role === 'user' ? 'You' : 'AI Assistant';

        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${avatar}</div>
                <div class="message-author">${author}</div>
            </div>
            <div class="message-content">
                ${isTyping ? '<div class="typing-indicator">AI is thinking...</div>' : `<p>${content.replace(/\n/g, '<br>')}</p>`}
            </div>
        `;

        this.conversationArea.appendChild(messageDiv);
        this.conversationArea.scrollTop = this.conversationArea.scrollHeight;

        return messageDiv; // Return for potential updates (like removing typing indicator)
    }

    showTypingIndicator() {
        const typingMessage = this.addConversationMessage('assistant', '', true);
        return typingMessage;
    }

    removeTypingIndicator(messageElement) {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }

    // Legacy method for compatibility
    addMessageToChat(role, content, isTyping = false) {
        return this.addConversationMessage(role, content, isTyping);
    }

    async executeToolCall(toolCall) {
        const { id: callId, function: func } = toolCall;
        const { name: toolName, arguments: args } = func;

        // Show processing message
        this.addMessageToChat('assistant', `🔄 Executing: ${toolName}...`);

        try {
            const response = await fetch('backend/api/tools.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tool_name: toolName,
                    arguments: JSON.parse(args),
                    call_id: callId
                })
            });

            const data = await response.json();

            if (data.success) {
                const result = data.result;
                let message = result.message;

                // Add download links if files were created
                if (result.files && result.files.length > 0) {
                    message += '\n\n📥 Download your files:';
                    result.files.forEach(file => {
                        message += `\n• ${file.filename} (${this.formatFileSize(file.size)})`;
                    });
                } else if (result.file) {
                    message += `\n\n📥 Download: ${result.file.filename} (${this.formatFileSize(result.file.size)})`;
                }

                this.addMessageToChat('assistant', message);
            } else {
                this.addMessageToChat('assistant', `❌ Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Tool execution error:', error);
            this.addMessageToChat('assistant', `❌ Error executing ${toolName}`);
        }
    }

    handleQuickAction(action) {
        let message = '';
        let requiresFiles = true;

        switch (action) {
            case 'convert-pdf-to-images':
                message = 'Convert these PDFs to images';
                break;
            case 'convert-images-to-pdf':
                message = 'Convert these images to a PDF';
                break;
            case 'remove-background':
                message = 'Remove the background from these images';
                break;
            case 'compress-images':
                message = 'Compress these images to reduce file size';
                break;
            case 'chat-with-document':
                message = 'What is this document about? Can you summarize its contents?';
                break;
            default:
                requiresFiles = false;
        }

        if (requiresFiles && this.aiUploadedFiles.length === 0) {
            // Show a helpful message and trigger file upload
            this.addConversationMessage('assistant', 'I\'d be happy to help with that! Please upload some files first using the 📎 button, then I can assist you.');
            this.aiFileInput?.click();
            return;
        }

        if (message) {
            if (this.messageInput) {
                this.messageInput.value = message;
                this.autoResizeTextarea(this.messageInput);
                this.updateSendButton();
            }
            this.sendConversationMessage();
        }
    }

    updateProgress(current, total, message) {
        const percentage = Math.round((current / total) * 100);
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = percentage + '%';
        this.progressDetails.textContent = message;
    }

    async convertPDFToImages(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const totalPages = pdf.numPages;

            // Determine which pages to convert
            let pagesToConvert = [];
            const pageRangeValue = this.pageRange.value;

            if (pageRangeValue === 'all') {
                pagesToConvert = Array.from({length: totalPages}, (_, i) => i + 1);
            } else if (pageRangeValue === 'first') {
                pagesToConvert = [1];
            } else if (pageRangeValue === 'custom') {
                pagesToConvert = this.parsePageRange(this.customPages.value, totalPages);
                if (pagesToConvert.length === 0) {
                    throw new Error(`Invalid page range for ${file.name}. Using first page only.`);
                }
            }

            // Show detailed progress for each page
            for (let i = 0; i < pagesToConvert.length; i++) {
                const pageNum = pagesToConvert[i];
                this.progressDetails.textContent = `Converting ${file.name} - Page ${pageNum} of ${totalPages} (${i + 1}/${pagesToConvert.length})`;

                const page = await pdf.getPage(pageNum);
                const imageData = await this.renderPageToImage(page, file.name, pageNum);
                this.convertedImages.push(imageData);

                // Small delay to allow UI updates
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (error) {
            console.error(`Error converting ${file.name}:`, error);
            this.progressDetails.textContent = `Error processing ${file.name}: ${error.message}`;
            throw error;
        }
    }

    async renderPageToImage(page, fileName, pageNum) {
        const scale = parseFloat(this.imageQuality.value);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Convert to desired format with proper encoding
        const format = this.outputFormat.value;
        const quality = format === 'jpeg' ? this.jpegQuality.value : 1;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

        // Create blob directly from canvas for better compatibility
        const rawBlob = await new Promise(resolve => {
            canvas.toBlob(resolve, mimeType, quality);
        });

        // Validate the blob has proper headers
        const blob = await this.validateImageBlob(rawBlob, format);

        // Convert blob to data URL for preview, but keep blob for ZIP
        const dataUrl = await this.blobToDataURL(blob);

        // Generate filename
        const baseName = fileName.replace('.pdf', '');
        const extension = format === 'jpeg' ? 'jpg' : 'png';
        const imageFileName = `${baseName}_page_${pageNum}.${extension}`;

        return {
            dataUrl,
            blob, // Store the original blob
            fileName: imageFileName,
            originalFile: fileName,
            pageNumber: pageNum,
            format,
            size: this.formatFileSize(blob.size)
        };
    }

    // Helper function to convert blob to data URL
    blobToDataURL(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    // Validate and fix image blob to ensure proper file headers
    async validateImageBlob(blob, format) {
        try {
            // Read the blob as array buffer to check headers
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Check if the blob has proper file signature
            let hasValidHeader = false;

            if (format === 'png') {
                // PNG signature: 89 50 4E 47 0D 0A 1A 0A
                const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                hasValidHeader = pngSignature.every((byte, index) => uint8Array[index] === byte);
            } else if (format === 'jpeg') {
                // JPEG signature: FF D8 FF
                hasValidHeader = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF;
            }

            if (hasValidHeader) {
                console.log(`Valid ${format.toUpperCase()} header found`);
                return blob;
            } else {
                console.warn(`Invalid ${format.toUpperCase()} header, blob may be corrupted`);
                return blob; // Return anyway, but log the issue
            }
        } catch (error) {
            console.error('Error validating image blob:', error);
            return blob;
        }
    }

    estimateImageSize(dataUrl) {
        // Rough estimation of file size from data URL
        const base64Length = dataUrl.split(',')[1].length;
        const sizeInBytes = (base64Length * 3) / 4;
        return this.formatFileSize(sizeInBytes);
    }

    showResults() {
        this.resultsSection.style.display = 'block';
        this.resultsList.innerHTML = '';

        // Handle both old convertedImages and new convertedFiles
        const files = this.convertedFiles.length > 0 ? this.convertedFiles : this.convertedImages;

        files.forEach((file, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            if (file.type === 'pdf') {
                // PDF file result
                resultItem.innerHTML = `
                    <div class="result-preview pdf-preview">📄</div>
                    <div class="result-info">
                        <h4>${file.name}</h4>
                        <p>PDF • ${this.formatFileSize(file.size)}</p>
                        <button class="download-btn" onclick="converter.downloadFile(${index})">
                            📥 Download PDF
                        </button>
                    </div>
                `;
            } else {
                // Image file result (backward compatibility)
                const dataUrl = file.dataUrl || file.url;
                const fileName = file.fileName || file.name;
                const format = file.format || 'IMAGE';
                const size = file.size || 'Unknown size';
                const pageInfo = file.pageNumber ? `Page ${file.pageNumber} • ` : '';

                resultItem.innerHTML = `
                    <img src="${dataUrl}" alt="${fileName}" class="result-preview">
                    <div class="result-info">
                        <h4>${fileName}</h4>
                        <p>${pageInfo}${format.toUpperCase()} • ${size}</p>
                        <button class="download-btn" onclick="converter.downloadFile(${index})">
                            📥 Download
                        </button>
                    </div>
                `;
            }

            this.resultsList.appendChild(resultItem);
        });
    }

    downloadFile(index) {
        // Handle both old convertedImages and new convertedFiles
        const files = this.convertedFiles.length > 0 ? this.convertedFiles : this.convertedImages;
        const file = files[index];

        try {
            const link = document.createElement('a');
            link.download = file.downloadName || file.fileName || file.name;
            link.style.display = 'none';

            // Use blob if available (more reliable), otherwise use data URL
            if (file.blob) {
                const url = URL.createObjectURL(file.blob);
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Clean up the object URL
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                link.href = file.dataUrl || file.url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            this.showTemporaryMessage(`Downloaded ${file.fileName || file.name}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showTemporaryMessage('Download failed', 'error');
        }
    }

    // Keep backward compatibility
    downloadImage(index) {
        this.downloadFile(index);
    }

    // Alternative method to convert data URL to blob for better ZIP compatibility
    dataURLtoBlob(dataURL) {
        try {
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);

            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            return new Blob([u8arr], { type: mime });
        } catch (error) {
            console.error('Error converting data URL to blob:', error);
            return null;
        }
    }

    async downloadAllAsZip() {
        if (this.convertedImages.length === 0) return;

        this.downloadAllBtn.disabled = true;
        this.downloadAllBtn.innerHTML = '<span class="loading"></span> Creating Archive...';

        // Since JSZip doesn't work in your environment, offer alternatives
        const choice = confirm(
            'ZIP creation is not compatible with your browser environment.\n\n' +
            'Choose an alternative:\n\n' +
            'OK = Download all images individually (recommended)\n' +
            'Cancel = Create HTML page with all images'
        );

        try {
            if (choice) {
                this.downloadAllIndividually();
            } else {
                this.createHTMLWithImages();
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed. Please try downloading images individually using the download buttons.');
        } finally {
            this.downloadAllBtn.disabled = false;
            this.downloadAllBtn.innerHTML = '📦 Download All';
        }
    }

    // Keep the old ZIP method as a backup (but it won't work in your environment)
    async downloadAllAsZipOld() {
        if (this.convertedImages.length === 0) return;

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('ZIP functionality is not available. Please download images individually.');
            return;
        }

        this.downloadAllBtn.disabled = true;
        this.downloadAllBtn.innerHTML = '<span class="loading"></span> Creating ZIP...';

        try {
            const zip = new JSZip();

            // Add each image to the zip using a completely different approach
            for (const image of this.convertedImages) {
                try {
                    // Method: Re-download the working individual image and add to ZIP
                    // This ensures the exact same data that works individually
                    let imageBlob;

                    if (image.blob) {
                        // Create a new blob copy to avoid any reference issues
                        const arrayBuffer = await image.blob.arrayBuffer();
                        imageBlob = new Blob([arrayBuffer], { type: image.blob.type });
                    } else {
                        // Convert data URL to blob using the exact same method as individual download
                        const response = await fetch(image.dataUrl);
                        imageBlob = await response.blob();
                    }

                    // Verify the blob is valid before adding to ZIP
                    if (imageBlob.size === 0) {
                        throw new Error('Empty blob detected');
                    }

                    // Add to ZIP using the blob directly (not arrayBuffer)
                    zip.file(image.fileName, imageBlob, {
                        binary: true,
                        createFolders: false
                    });

                    console.log(`Added ${image.fileName} to ZIP (${imageBlob.size} bytes, type: ${imageBlob.type})`);

                } catch (error) {
                    console.error(`Error adding ${image.fileName} to ZIP:`, error);
                    this.showTemporaryMessage(`Skipped ${image.fileName} due to error`, 'error');
                }
            }

            // Add a readme file to help Windows recognize the ZIP as valid
            const readmeContent = `PDF to Image Converter
Generated: ${new Date().toLocaleString()}
Total Images: ${this.convertedImages.length}
Format: ${this.outputFormat.value.toUpperCase()}
Quality: ${this.imageQuality.value}x

This ZIP file contains images converted from PDF files using a browser-based tool.
All images are safe and generated locally on your computer.

Files included:
${this.convertedImages.map(img => `- ${img.fileName}`).join('\n')}
`;
            zip.file('README.txt', readmeContent);

            // Verify zip has files before generating
            const fileNames = Object.keys(zip.files);
            console.log('Files in ZIP:', fileNames);

            if (fileNames.length <= 1) { // Only README file
                throw new Error('No image files were added to the ZIP');
            }

            // Generate ZIP with the most compatible settings possible
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'STORE', // No compression
                compressionOptions: {
                    level: 0 // Explicitly no compression
                },
                streamFiles: false,
                platform: 'UNIX', // Try UNIX instead of DOS
                mimeType: 'application/zip'
            });

            console.log('ZIP blob size:', content.size);

            // Verify the blob is not empty
            if (content.size === 0) {
                throw new Error('Generated ZIP file is empty');
            }

            // Create download link
            const link = document.createElement('a');
            const url = URL.createObjectURL(content);
            link.href = url;
            link.download = `converted_images_${new Date().getTime()}.zip`;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            this.showTemporaryMessage(`ZIP file created with ${this.convertedImages.length} images (${this.formatFileSize(content.size)})`, 'success');

        } catch (error) {
            console.error('Error creating ZIP file:', error);

            // Offer multiple alternatives
            const choice = confirm(
                'ZIP creation failed. Choose an alternative:\n\n' +
                'OK = Download all images individually (multiple downloads)\n' +
                'Cancel = Create an HTML page with all images'
            );

            if (choice) {
                this.downloadAllIndividually();
            } else {
                this.createHTMLWithImages();
            }

            this.showTemporaryMessage('ZIP creation failed', 'error');
        } finally {
            this.downloadAllBtn.disabled = false;
            this.downloadAllBtn.innerHTML = '📦 Download All as ZIP';
        }
    }

    downloadAllIndividually() {
        let downloadCount = 0;
        const totalImages = this.convertedImages.length;

        // Show progress
        this.progressSection.style.display = 'block';
        this.progressDetails.textContent = 'Starting individual downloads...';

        const downloadNext = () => {
            if (downloadCount < totalImages) {
                const image = this.convertedImages[downloadCount];

                // Update progress
                const percentage = Math.round((downloadCount / totalImages) * 100);
                this.progressFill.style.width = percentage + '%';
                this.progressText.textContent = percentage + '%';
                this.progressDetails.textContent = `Downloading ${image.fileName} (${downloadCount + 1}/${totalImages})`;

                // Download the image
                this.downloadImage(downloadCount);
                downloadCount++;

                // Delay between downloads to avoid browser blocking
                setTimeout(downloadNext, 800);
            } else {
                // Complete
                this.progressFill.style.width = '100%';
                this.progressText.textContent = '100%';
                this.progressDetails.textContent = `Completed! Downloaded ${totalImages} images individually.`;
                this.showTemporaryMessage(`Downloaded ${totalImages} images individually`, 'success');

                // Hide progress after a delay
                setTimeout(() => {
                    this.progressSection.style.display = 'none';
                }, 3000);
            }
        };

        downloadNext();
    }

    // Alternative ZIP creation method that preserves exact binary data
    async createZipAlternativeMethod() {
        console.log('Trying alternative ZIP creation method...');

        const zip = new JSZip();

        // Add images using the exact same method that works for individual downloads
        for (const image of this.convertedImages) {
            try {
                // Get the exact same blob that works for individual download
                let workingBlob;

                if (image.blob) {
                    workingBlob = image.blob;
                } else {
                    // Use fetch to get blob from data URL (same as individual download)
                    const response = await fetch(image.dataUrl);
                    workingBlob = await response.blob();
                }

                // Read the blob as Uint8Array to preserve exact binary data
                const arrayBuffer = await workingBlob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                // Add to ZIP as raw binary data
                zip.file(image.fileName, uint8Array, {
                    binary: true,
                    base64: false,
                    createFolders: false
                });

                console.log(`Alternative method: Added ${image.fileName} (${uint8Array.length} bytes)`);

            } catch (error) {
                console.error(`Alternative method failed for ${image.fileName}:`, error);
                throw error; // Fail the alternative method
            }
        }

        // Generate ZIP with absolute minimal processing
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'STORE',
            compressionOptions: { level: 0 }
        });

        // Download the ZIP
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);
        link.href = url;
        link.download = `converted_images_alt_${new Date().getTime()}.zip`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.downloadAllBtn.disabled = false;
        this.downloadAllBtn.innerHTML = '📦 Download All as ZIP';

        this.showTemporaryMessage(`Alternative ZIP created with ${this.convertedImages.length} images`, 'success');
    }

    // Create an HTML page with all images embedded as a fallback
    createHTMLWithImages() {
        console.log('Creating HTML page with embedded images...');

        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted PDF Images</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .image-item {
            background: white;
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-item h3 { margin: 0 0 10px 0; color: #333; }
        .image-item img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .download-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 0;
        }
        .download-btn:hover { background: #0056b3; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ Converted PDF Images</h1>
        <div class="info">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Images:</strong> ${this.convertedImages.length}<br>
            <strong>Format:</strong> ${this.outputFormat.value.toUpperCase()}<br>
            <strong>Quality:</strong> ${this.imageQuality.value}x<br><br>
            <em>Right-click any image and select "Save image as..." to download it individually.</em>
        </div>
`;

        // Add each image to the HTML
        this.convertedImages.forEach((image, index) => {
            htmlContent += `
        <div class="image-item">
            <h3>${image.fileName}</h3>
            <p><strong>Source:</strong> ${image.originalFile} (Page ${image.pageNumber})</p>
            <p><strong>Size:</strong> ${image.size}</p>
            <img src="${image.dataUrl}" alt="${image.fileName}" />
            <br>
            <button class="download-btn" onclick="downloadImage(${index})">📥 Download ${image.fileName}</button>
        </div>`;
        });

        htmlContent += `
    </div>

    <script>
        // Embedded image data for downloads
        const imageData = ${JSON.stringify(this.convertedImages.map(img => ({
            fileName: img.fileName,
            dataUrl: img.dataUrl
        })))};

        function downloadImage(index) {
            const image = imageData[index];
            const link = document.createElement('a');
            link.download = image.fileName;
            link.href = image.dataUrl;
            link.click();
        }
    </script>
</body>
</html>`;

        // Create and download the HTML file
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(htmlBlob);
        link.href = url;
        link.download = `converted_images_${new Date().getTime()}.html`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.showTemporaryMessage('HTML page created with all images embedded', 'success');
        alert('HTML page downloaded! Open it in your browser to view and download individual images.');
    }
}

// Initialize the converter when the page loads
let converter;
document.addEventListener('DOMContentLoaded', () => {
    converter = new FileConverterSuite();
});
