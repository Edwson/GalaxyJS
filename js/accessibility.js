/**
 * AccessibilityManager - Handles accessibility features
 * Including reduced motion support and keyboard navigation
 */
class AccessibilityManager {
    constructor(galaxyInstance) {
        this.galaxy = galaxyInstance;
        this.reducedMotion = this.checkReducedMotion();
        this.listeners = [];

        this.init();
    }

    /**
     * Initialize accessibility features
     */
    init() {
        // Monitor reduced motion preference changes
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e) => {
            this.reducedMotion = e.matches;
            this.handleReducedMotionChange();
        };

        motionQuery.addEventListener('change', handler);
        this.listeners.push({ query: motionQuery, handler });

        // Apply initial reduced motion state
        if (this.reducedMotion) {
            this.enableReducedMotion();
        }

        // Add keyboard navigation
        this.initKeyboardNavigation();

        // Add ARIA labels
        this.addAriaLabels();
    }

    /**
     * Check if user prefers reduced motion
     */
    checkReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Handle reduced motion preference change
     */
    handleReducedMotionChange() {
        if (this.reducedMotion) {
            this.enableReducedMotion();
        } else {
            this.disableReducedMotion();
        }

        console.log(`[Accessibility] Reduced motion: ${this.reducedMotion ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable reduced motion mode
     */
    enableReducedMotion() {
        document.body.classList.add('reduced-motion');

        // Disable infinite animations
        document.querySelectorAll('[style*="animation"]').forEach(el => {
            const style = el.getAttribute('style');
            if (style && style.includes('infinite')) {
                el.style.animationIterationCount = '1';
            }
        });

        // Reduce animation durations
        document.documentElement.style.setProperty('--animation-duration-multiplier', '0.01');

        // Pause or slow down canvas animations
        if (this.galaxy.advancedAnimations) {
            // Could implement pause functionality here
        }

        // Disable parallax effects
        if (this.galaxy.disableParallax) {
            this.galaxy.disableParallax();
        }
    }

    /**
     * Disable reduced motion mode
     */
    disableReducedMotion() {
        document.body.classList.remove('reduced-motion');
        document.documentElement.style.setProperty('--animation-duration-multiplier', '1');
    }

    /**
     * Initialize keyboard navigation
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Space or Enter to interact with demo cards
            if (e.key === ' ' || e.key === 'Enter') {
                const focusedCard = document.activeElement;
                if (focusedCard && focusedCard.classList.contains('demo-card')) {
                    e.preventDefault();
                    focusedCard.click();
                }
            }

            // Arrow keys for navigation
            if (e.key.startsWith('Arrow')) {
                this.handleArrowKeyNavigation(e);
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal.active, .modal-active');
                if (modal) {
                    e.preventDefault();
                    this.galaxy.closeModal?.();
                }
            }
        });
    }

    /**
     * Handle arrow key navigation
     */
    handleArrowKeyNavigation(e) {
        const cards = Array.from(document.querySelectorAll('.demo-card'));
        const currentIndex = cards.indexOf(document.activeElement);

        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                newIndex = (currentIndex + 1) % cards.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                newIndex = (currentIndex - 1 + cards.length) % cards.length;
                break;
        }

        if (newIndex !== currentIndex) {
            e.preventDefault();
            cards[newIndex].focus();
            cards[newIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    /**
     * Add ARIA labels to interactive elements
     */
    addAriaLabels() {
        // Add labels to demo cards
        document.querySelectorAll('.demo-card').forEach((card, index) => {
            if (!card.getAttribute('role')) {
                card.setAttribute('role', 'button');
            }
            if (!card.getAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
            }
            if (!card.getAttribute('aria-label')) {
                const title = card.querySelector('.demo-title')?.textContent || `Animation ${index + 1}`;
                card.setAttribute('aria-label', `View ${title} animation demo`);
            }
        });

        // Add labels to navigation
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const text = link.textContent.trim();
                link.setAttribute('aria-label', `Navigate to ${text}`);
            }
        });

        // Add labels to canvas elements
        document.querySelectorAll('canvas').forEach((canvas, index) => {
            if (!canvas.getAttribute('aria-label')) {
                canvas.setAttribute('aria-label', `Animation canvas ${index + 1}`);
            }
            canvas.setAttribute('role', 'img');
        });
    }

    /**
     * Add skip to content link
     */
    addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 100;
        `;

        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Announce dynamic content changes to screen readers
     */
    announce(message, priority = 'polite') {
        const announcer = document.getElementById('aria-live-announcer') || this.createAnnouncer();
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }

    /**
     * Create ARIA live region for announcements
     */
    createAnnouncer() {
        const announcer = document.createElement('div');
        announcer.id = 'aria-live-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announcer);
        return announcer;
    }

    /**
     * Check if reduced motion is enabled
     */
    isReducedMotion() {
        return this.reducedMotion;
    }

    /**
     * Get recommended animation settings based on accessibility preferences
     */
    getRecommendedSettings() {
        return {
            enableAnimations: !this.reducedMotion,
            enableParallax: !this.reducedMotion,
            animationDuration: this.reducedMotion ? 0.1 : 1,
            particleCount: this.reducedMotion ? 0.2 : 1,
            enableAutoPlay: !this.reducedMotion
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.listeners.forEach(({ query, handler }) => {
            query.removeEventListener('change', handler);
        });
        this.listeners = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}
