/**
 * API Service for Frontend-Backend Communication
 * Handles authentication, user management, and usage tracking
 */

class APIService {
    constructor() {
        this.baseURL = './backend/api';
        this.currentUser = null;
        this.authToken = null;
        
        // Initialize from localStorage
        this.loadAuthState();
    }

    // Authentication Methods
    async login(email, password) {
        try {
            const response = await this.makeRequest('auth.php?action=login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (response.success) {
                this.currentUser = response.user;
                this.saveAuthState();
                this.dispatchAuthEvent('login', response.user);
                return response;
            } else {
                throw new Error(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(name, email, password) {
        try {
            const response = await this.makeRequest('auth.php?action=register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            if (response.success) {
                this.currentUser = response.user;
                this.saveAuthState();
                this.dispatchAuthEvent('register', response.user);
                return response;
            } else {
                throw new Error(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.makeRequest('auth.php?action=logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.currentUser = null;
            this.authToken = null;
            this.clearAuthState();
            this.dispatchAuthEvent('logout');
        }
    }

    async getCurrentUser() {
        try {
            const response = await this.makeRequest('auth.php?action=me', {
                method: 'GET'
            });

            if (response.success) {
                this.currentUser = response.user;
                this.saveAuthState();
                return response.user;
            } else {
                this.clearAuthState();
                return null;
            }
        } catch (error) {
            console.error('Get current user error:', error);
            this.clearAuthState();
            return null;
        }
    }

    // Usage Tracking Methods
    async checkUsageLimits(fileSize) {
        // For guest users, check local limits
        if (!this.isAuthenticated()) {
            return this.checkGuestLimits(fileSize);
        }

        try {
            const response = await this.makeRequest('conversions.php?action=check-limits', {
                method: 'POST',
                body: JSON.stringify({ file_size: fileSize })
            });

            return response;
        } catch (error) {
            console.error('Check usage limits error:', error);
            // Fallback to guest limits if backend fails
            return this.checkGuestLimits(fileSize);
        }
    }

    checkGuestLimits(fileSize) {
        const guestConversions = this.getGuestConversions();
        const guestLimit = 3;
        const maxGuestFileSize = 5 * 1024 * 1024; // 5MB

        if (guestConversions >= guestLimit) {
            return {
                success: false,
                allowed: false,
                error: 'Guest limit reached. Please sign up for a free account to continue!',
                remaining: 0,
                limit: guestLimit,
                used: guestConversions
            };
        }

        if (fileSize > maxGuestFileSize) {
            const maxMB = Math.round(maxGuestFileSize / (1024 * 1024));
            return {
                success: false,
                allowed: false,
                error: `File too large for guest users. Maximum size: ${maxMB}MB. Sign up for larger files!`,
                remaining: guestLimit - guestConversions,
                limit: guestLimit,
                used: guestConversions
            };
        }

        return {
            success: true,
            allowed: true,
            remaining: guestLimit - guestConversions,
            limit: guestLimit,
            used: guestConversions
        };
    }

    async trackConversion(conversionData) {
        // For guest users, track locally
        if (!this.isAuthenticated()) {
            return this.trackGuestConversion(conversionData);
        }

        try {
            const response = await this.makeRequest('conversions.php?action=track', {
                method: 'POST',
                body: JSON.stringify(conversionData)
            });

            if (response.success && this.currentUser) {
                // Update local user data
                this.currentUser.conversions_used = (this.currentUser.conversions_used || 0) + 1;
                this.saveAuthState();
                this.dispatchAuthEvent('usage-updated', this.currentUser);
            }

            return response;
        } catch (error) {
            console.error('Track conversion error:', error);
            // Fallback to guest tracking
            return this.trackGuestConversion(conversionData);
        }
    }

    trackGuestConversion(conversionData) {
        const currentCount = this.getGuestConversions();
        const newCount = currentCount + 1;

        localStorage.setItem('guestConversions', newCount.toString());
        localStorage.setItem('lastGuestConversion', new Date().toISOString());

        // Store conversion details for potential account creation
        const guestHistory = JSON.parse(localStorage.getItem('guestConversionHistory') || '[]');
        guestHistory.push({
            ...conversionData,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 conversions
        if (guestHistory.length > 10) {
            guestHistory.splice(0, guestHistory.length - 10);
        }

        localStorage.setItem('guestConversionHistory', JSON.stringify(guestHistory));

        // Dispatch event for UI updates
        this.dispatchAuthEvent('guest-usage-updated', {
            used: newCount,
            limit: 3,
            remaining: Math.max(0, 3 - newCount)
        });

        return {
            success: true,
            message: 'Guest conversion tracked',
            used: newCount,
            limit: 3,
            remaining: Math.max(0, 3 - newCount)
        };
    }

    async getConversionHistory() {
        try {
            const response = await this.makeRequest('conversions.php?action=history', {
                method: 'GET'
            });

            return response;
        } catch (error) {
            console.error('Get conversion history error:', error);
            throw error;
        }
    }

    // Plan Management
    async upgradePlan(plan) {
        try {
            const response = await this.makeRequest('auth.php?action=upgrade', {
                method: 'POST',
                body: JSON.stringify({ plan })
            });

            if (response.success) {
                // Refresh user data
                await this.getCurrentUser();
            }

            return response;
        } catch (error) {
            console.error('Upgrade plan error:', error);
            throw error;
        }
    }

    // Utility Methods
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}/${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication State Management
    saveAuthState() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    loadAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (error) {
                console.error('Error loading auth state:', error);
                this.clearAuthState();
            }
        }
    }

    clearAuthState() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.authToken = null;
    }

    // Event System for UI Updates
    dispatchAuthEvent(type, data = null) {
        const event = new CustomEvent('auth-state-changed', {
            detail: { type, data, user: this.currentUser }
        });
        window.dispatchEvent(event);
    }

    // Getters
    isAuthenticated() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }

    getUserPlan() {
        return this.currentUser?.plan_type || 'free';
    }

    getUsageInfo() {
        if (!this.currentUser) return null;
        
        return {
            used: this.currentUser.conversions_used || 0,
            limit: this.currentUser.conversions_limit || 10,
            remaining: Math.max(0, (this.currentUser.conversions_limit || 10) - (this.currentUser.conversions_used || 0)),
            maxFileSize: this.currentUser.max_file_size || 5242880
        };
    }

    canConvert(fileSize = 0) {
        if (!this.currentUser) {
            // Check guest limits
            const guestConversions = this.getGuestConversions();
            const hasConversionsLeft = guestConversions < 3;
            const fileSizeOk = fileSize <= (5 * 1024 * 1024); // 5MB for guests
            return hasConversionsLeft && fileSizeOk;
        }

        const usage = this.getUsageInfo();
        const hasConversionsLeft = usage.limit === -1 || usage.remaining > 0;
        const fileSizeOk = fileSize <= usage.maxFileSize;

        return hasConversionsLeft && fileSizeOk;
    }

    // Guest User Methods
    getGuestConversions() {
        return parseInt(localStorage.getItem('guestConversions') || '0');
    }

    getGuestUsageInfo() {
        const used = this.getGuestConversions();
        const limit = 3;
        return {
            used,
            limit,
            remaining: Math.max(0, limit - used),
            maxFileSize: 5 * 1024 * 1024 // 5MB
        };
    }

    isGuestLimitReached() {
        return this.getGuestConversions() >= 3;
    }

    clearGuestData() {
        localStorage.removeItem('guestConversions');
        localStorage.removeItem('lastGuestConversion');
        localStorage.removeItem('guestConversionHistory');
    }

    // Transfer guest data to new account
    getGuestConversionHistory() {
        return JSON.parse(localStorage.getItem('guestConversionHistory') || '[]');
    }
}

// Create global instance
window.apiService = new APIService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
