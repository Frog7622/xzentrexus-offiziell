/* ==========================================================================
   XZENTREXUS OFFICIAL WEBSITE - APPLICATION INTERACTIVES
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Force scroll to top (Hero) on page load – prevents browser scroll restoration
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // === SECURITY: HTML Escape Helper (XSS Protection) ===
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // === FORMSPREE CONFIGURATION ===
    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdavbype';

    // === ORDER NUMBER GENERATOR ===
    function generateOrderNumber() {
        const now = new Date();
        const datePart = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I to avoid confusion
        let randomPart = '';
        for (let i = 0; i < 5; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `XZ-${datePart}-${randomPart}`;
    }

    // === SECURITY: localStorage Integrity Helper ===
    const INTEGRITY_SALT = 'xz_2026_cd_anfang';
    function computeHash(value) {
        // Simple hash for tamper detection (not cryptographic, but prevents casual manipulation)
        let hash = 0;
        const str = INTEGRITY_SALT + ':' + String(value);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    function setSecureStorage(key, value) {
        localStorage.setItem(key, value);
        localStorage.setItem(key + '_hash', computeHash(value));
    }

    function getSecureStorage(key, defaultValue) {
        const value = localStorage.getItem(key);
        const storedHash = localStorage.getItem(key + '_hash');
        if (value === null) return defaultValue;
        if (storedHash !== computeHash(value)) {
            // Tampered – reset to default
            console.warn('localStorage integrity check failed for key:', key);
            localStorage.removeItem(key);
            localStorage.removeItem(key + '_hash');
            return defaultValue;
        }
        return parseInt(value, 10);
    }

    // Initialize Web Audio API and Audio Buffers for Zero-Latency Playback
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let clickBuffer = null;
    let exitBuffer = null;

    // Instantiate fallback HTML5 Audio elements immediately for aggressive browser caching
    const clickAudioFallback = new Audio('assets/music/click.wav');
    clickAudioFallback.volume = 0.8;
    clickAudioFallback.preload = 'auto';

    const exitAudioFallback = new Audio('assets/music/exit.wav');
    exitAudioFallback.volume = 0.8;
    exitAudioFallback.preload = 'auto';

    if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        
        // Preload and decode Web Audio API buffers immediately in the background
        preloadSound('assets/music/click.wav').then(buffer => { clickBuffer = buffer; });
        preloadSound('assets/music/exit.wav').then(buffer => { exitBuffer = buffer; });
    }

    async function preloadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return new Promise((resolve, reject) => {
                if (!audioCtx) {
                    reject(new Error("AudioContext not initialized"));
                    return;
                }
                audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
            });
        } catch (err) {
            console.error('Failed to preload and decode sound:', url, err);
            return null;
        }
    }

    function playBuffer(buffer, volume = 0.8, isRetry = false) {
        if (!audioCtx || !buffer) return;
        
        // Safety resume for context state (in case it is suspended)
        if (audioCtx.state === 'suspended' && !isRetry) {
            audioCtx.resume().then(() => {
                playBuffer(buffer, volume, true);
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
                playBufferDirect(buffer, volume);
            });
            return;
        }
        
        playBufferDirect(buffer, volume);
    }

    function playBufferDirect(buffer, volume) {
        try {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            source.start(0);
        } catch (e) {
            console.error('playBufferDirect failed:', e);
        }
    }

    // Use Web Audio API if loaded, fallback to HTML5 fallback otherwise
    function playClickSound() {
        if (audioCtx && clickBuffer) {
            playBuffer(clickBuffer, 0.8);
        } else {
            // HTML5 Fallback (preloaded and unlocked)
            if (clickAudioFallback) {
                clickAudioFallback.currentTime = 0;
                clickAudioFallback.play().catch(e => console.log('Fallback click play failed:', e));
            }
        }
    }

    function playExitSound() {
        if (audioCtx && exitBuffer) {
            playBuffer(exitBuffer, 0.8);
        } else {
            // HTML5 Fallback (preloaded and unlocked)
            if (exitAudioFallback) {
                exitAudioFallback.currentTime = 0;
                exitAudioFallback.play().catch(e => console.log('Fallback exit play failed:', e));
            }
        }
    }

    // Earliest user interaction AudioContext & HTML5 Audio unlocking
    let audioUnlocked = false;
    const unlockAudio = () => {
        if (audioUnlocked) return;
        
        // 1. Resume AudioContext if suspended
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log('AudioContext successfully unlocked on user interaction.');
            });
        }
        
        // 2. Play and immediately pause fallbacks to unlock them for future programmatic playback
        if (clickAudioFallback) {
            const origVol = clickAudioFallback.volume;
            clickAudioFallback.volume = 0;
            clickAudioFallback.play().then(() => {
                clickAudioFallback.pause();
                clickAudioFallback.volume = origVol;
                clickAudioFallback.currentTime = 0;
            }).catch(e => console.log('Unlock click fallback failed:', e));
        }
        
        if (exitAudioFallback) {
            const origVol = exitAudioFallback.volume;
            exitAudioFallback.volume = 0;
            exitAudioFallback.play().then(() => {
                exitAudioFallback.pause();
                exitAudioFallback.volume = origVol;
                exitAudioFallback.currentTime = 0;
            }).catch(e => console.log('Unlock exit fallback failed:', e));
        }
        
        audioUnlocked = true;
        document.removeEventListener('pointerdown', unlockAudio, { capture: true });
        document.removeEventListener('touchstart', unlockAudio, { capture: true });
        document.removeEventListener('click', unlockAudio, { capture: true });
    };

    // Use capture phase to ensure this runs BEFORE target click handlers call e.stopPropagation()
    document.addEventListener('pointerdown', unlockAudio, { capture: true });
    document.addEventListener('touchstart', unlockAudio, { capture: true });
    document.addEventListener('click', unlockAudio, { capture: true });

    // Body scroll lock management via MutationObserver
    function updateBodyScrollLock() {
        const hasOpenModal = document.querySelectorAll('.modal.open').length > 0;
        const isCartOpen = document.getElementById('cart-panel') && document.getElementById('cart-panel').classList.contains('open');
        const isMenuOpen = document.getElementById('nav-menu') && document.getElementById('nav-menu').classList.contains('open');
        
        if (hasOpenModal || isCartOpen || isMenuOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }

    if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    updateBodyScrollLock();
                }
            });
        });
        
        // Observe all modals, cart panel, and mobile menu for class changes
        const targets = document.querySelectorAll('.modal, #cart-panel, #nav-menu');
        targets.forEach(target => {
            observer.observe(target, { attributes: true, attributeFilter: ['class'] });
        });
    }

    // Dynamic Copyright Year
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Smooth scroll for brand logo to jump to top
    const brandLogo = document.getElementById('brand-logo');
    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(brandLogo.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    /* ==========================================================================
       SALES COUNTER – LIMITED EDITION (30 UNITS)
       ========================================================================== */
    const SALES_TOTAL_EDITION = 30;
    const SALES_STORAGE_KEY = 'xzentrexus_sales_count';

    let salesCount = getSecureStorage(SALES_STORAGE_KEY, 0);
    if (isNaN(salesCount) || salesCount < 0) salesCount = 0;
    if (salesCount > SALES_TOTAL_EDITION) salesCount = SALES_TOTAL_EDITION;

    const salesCountValEl = document.getElementById('sales-count-val');
    const salesCounterBadgeEl = document.getElementById('sales-counter-badge');

    function updateSalesCounterUI() {
        const remaining = Math.max(0, SALES_TOTAL_EDITION - salesCount);
        const isSoldOut = remaining <= 0;

        if (salesCountValEl) salesCountValEl.textContent = salesCount;

        // Sold out state
        if (isSoldOut && salesCounterBadgeEl) {
            salesCounterBadgeEl.innerHTML = '<span class="sales-counter-text" style="color: #ff5e5e; font-weight: 800;">Ausverkauft</span>';
        }

        // Disable / enable buy button
        const shopOrderBtn = document.getElementById('shop-order-btn');
        if (shopOrderBtn) {
            if (isSoldOut) {
                shopOrderBtn.disabled = true;
                shopOrderBtn.style.opacity = '0.4';
                shopOrderBtn.style.cursor = 'not-allowed';
                shopOrderBtn.innerHTML = '<i data-lucide="x-circle"></i> Ausverkauft';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                shopOrderBtn.disabled = false;
                shopOrderBtn.style.opacity = '1';
                shopOrderBtn.style.cursor = 'pointer';
            }
        }

        // Update product status badge
        const statusBadgeEl = document.getElementById('product-status-badge');
        if (isSoldOut && statusBadgeEl) {
            statusBadgeEl.textContent = 'Ausverkauft';
        }
    }

    function incrementSalesCount(qty) {
        salesCount = Math.min(SALES_TOTAL_EDITION, salesCount + qty);
        setSecureStorage(SALES_STORAGE_KEY, salesCount);
        updateSalesCounterUI();
    }

    function getRemainingStock() {
        return Math.max(0, SALES_TOTAL_EDITION - salesCount);
    }

    // Initialize sales counter on page load
    updateSalesCounterUI();

    /* ==========================================================================
       1. NAVIGATION & MOBILE MENU
       ========================================================================== */
    const header = document.getElementById('header');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    // Header scroll background change
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    if (mobileMenuBtn && navMenu) {
        // Play haptic sound on pointerdown for instant responsive feedback on mobile/desktop
        mobileMenuBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); // prevent bubbling to document pointerdown
            
            // Safety resume for context state (in case it is suspended)
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            if (navMenu.classList.contains('open')) {
                playExitSound(); // will close
            } else {
                playClickSound(); // will open
            }
        });

        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('open');
            
            // Toggle menu icon dynamically to avoid stale Lucide DOM references
            const currentMenuIcon = document.getElementById('menu-icon');
            if (currentMenuIcon) {
                if (navMenu.classList.contains('open')) {
                    currentMenuIcon.setAttribute('data-lucide', 'x');
                } else {
                    currentMenuIcon.setAttribute('data-lucide', 'menu');
                }
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    }

    // Close mobile menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu && navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                const currentMenuIcon = document.getElementById('menu-icon');
                if (currentMenuIcon) {
                    currentMenuIcon.setAttribute('data-lucide', 'menu');
                }
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('open') && !navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            navMenu.classList.remove('open');
            const currentMenuIcon = document.getElementById('menu-icon');
            if (currentMenuIcon) {
                currentMenuIcon.setAttribute('data-lucide', 'menu');
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            playExitSound(); // Play exit sound when closing mobile menu by clicking outside
        }
    });

    // Smooth Scroll spy (Active link highlight)
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    /* ==========================================================================
       2. SCROLL ANIMATIONS (INTERSECTION OBSERVER)
       ========================================================================== */
    const animatedElements = document.querySelectorAll('[data-scroll-animate]');
    
    if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => animationObserver.observe(el));
    } else {
        animatedElements.forEach(el => el.classList.add('animated'));
    }

    // Helper to format time (e.g. 125 -> 2:05)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /* ==========================================================================
       3. AUDIO PLAYER 1: ALTE RELEASES PLAYER
       ========================================================================== */
    const oldAudio = document.getElementById('old-releases-audio');
    const oldPlayBtn = document.getElementById('old-play-btn');
    const oldPlayIcon = document.getElementById('old-play-icon');
    const oldPauseIcon = document.getElementById('old-pause-icon');
    const oldSkipBackBtn = document.getElementById('old-skip-back-btn');
    const oldSkipForwardBtn = document.getElementById('old-skip-forward-btn');
    const oldProgressBg = document.getElementById('old-progress-bar-bg');
    const oldProgressFill = document.getElementById('old-progress-bar-fill');
    const oldProgressHandle = document.getElementById('old-progress-handle');
    const oldTimeCurrent = document.getElementById('old-time-current');
    const oldTimeDuration = document.getElementById('old-time-duration');

    let isSeeking = false;

    function updateOldProgress(time) {
        const duration = oldAudio.duration || 300;
        const pct = (time / duration) * 100;
        oldProgressFill.style.width = `${pct}%`;
        oldProgressHandle.style.left = `${pct}%`;
        oldTimeCurrent.textContent = formatTime(time);
    }

    let oldPlayPromise = null;
    if (oldPlayBtn && oldAudio) {
        oldPlayBtn.addEventListener('click', () => {
            // Stop shop audio if playing
            if (shopAudio && !shopAudio.paused) {
                shopAudio.pause();
                resetShopIcons();
            }

            // Determine action based on UI state (is the play icon currently visible?)
            const isPlayIconVisible = !oldPlayIcon.classList.contains('hidden');

            if (isPlayIconVisible) {
                // UI shows Play -> User wants to PLAY
                setOldPlayState(true);
                
                oldPlayPromise = oldAudio.play();
                if (oldPlayPromise !== undefined) {
                    oldPlayPromise.then(() => {
                        // Successfully playing
                    }).catch(err => {
                        if (err.name === 'AbortError') {
                            console.log("Old audio play interrupted by pause.");
                            return;
                        }
                        console.log("Old audio play blocked, simulating:", err);
                        simulateOldProgress();
                    });
                }
            } else {
                // UI shows Pause -> User wants to PAUSE
                setOldPlayState(false);
                
                if (oldPlayPromise !== undefined && oldPlayPromise !== null) {
                    oldPlayPromise.then(() => {
                        oldAudio.pause();
                    }).catch(() => {
                        oldAudio.pause();
                    });
                } else {
                    oldAudio.pause();
                }

                if (oldMockInterval) {
                    clearInterval(oldMockInterval);
                }
            }
        });

        // Skip buttons
        if (oldSkipBackBtn) {
            oldSkipBackBtn.addEventListener('click', () => {
                oldAudio.currentTime = Math.max(0, oldAudio.currentTime - 10);
                updateOldProgress(oldAudio.currentTime);
            });
        }

        if (oldSkipForwardBtn) {
            oldSkipForwardBtn.addEventListener('click', () => {
                const duration = oldAudio.duration || 300;
                oldAudio.currentTime = Math.min(duration, oldAudio.currentTime + 10);
                updateOldProgress(oldAudio.currentTime);
            });
        }

        oldAudio.addEventListener('loadedmetadata', () => {
            oldTimeDuration.textContent = formatTime(oldAudio.duration);
        });

        oldAudio.addEventListener('durationchange', () => {
            oldTimeDuration.textContent = formatTime(oldAudio.duration);
        });

        oldAudio.addEventListener('timeupdate', () => {
            if (!oldAudio.paused && !isSeeking) {
                updateOldProgress(oldAudio.currentTime);
            }
        });

        oldAudio.addEventListener('ended', () => {
            setOldPlayState(false);
            oldAudio.currentTime = 0;
            oldProgressFill.style.width = '0%';
            oldProgressHandle.style.left = '0%';
            oldTimeCurrent.textContent = '0:00';
        });

        // Drag to seek logic
        if (oldProgressBg) {
            const handleProgressSeek = (clientX) => {
                const rect = oldProgressBg.getBoundingClientRect();
                const posX = clientX - rect.left;
                const width = rect.width;
                let pct = posX / width;
                pct = Math.max(0, Math.min(1, pct)); // Clamp between 0 and 1
                
                const duration = oldAudio.duration || 300;
                const targetTime = pct * duration;
                
                oldAudio.currentTime = targetTime;
                updateOldProgress(targetTime);
            };

            oldProgressBg.addEventListener('mousedown', (e) => {
                isSeeking = true;
                oldProgressBg.classList.add('dragging');
                handleProgressSeek(e.clientX);
            });

            window.addEventListener('mousemove', (e) => {
                if (isSeeking) {
                    handleProgressSeek(e.clientX);
                }
            });

            window.addEventListener('mouseup', () => {
                if (isSeeking) {
                    isSeeking = false;
                    oldProgressBg.classList.remove('dragging');
                }
            });

            // Touch support
            oldProgressBg.addEventListener('touchstart', (e) => {
                isSeeking = true;
                oldProgressBg.classList.add('dragging');
                handleProgressSeek(e.touches[0].clientX);
            });

            window.addEventListener('touchmove', (e) => {
                if (isSeeking) {
                    handleProgressSeek(e.touches[0].clientX);
                }
            });

            window.addEventListener('touchend', () => {
                if (isSeeking) {
                    isSeeking = false;
                    oldProgressBg.classList.remove('dragging');
                }
            });
        }
    }

    function setOldPlayState(isPlaying) {
        if (isPlaying) {
            oldPlayIcon.classList.add('hidden');
            oldPauseIcon.classList.remove('hidden');
        } else {
            oldPlayIcon.classList.remove('hidden');
            oldPauseIcon.classList.add('hidden');
        }
    }

    let oldMockInterval = null;
    function simulateOldProgress() {
        if (oldMockInterval) clearInterval(oldMockInterval);
        
        let duration = oldAudio.duration || 300;
        oldTimeDuration.textContent = formatTime(duration);
        
        oldMockInterval = setInterval(() => {
            // Clear if UI returns to paused state
            if (!oldPlayIcon.classList.contains('hidden')) {
                clearInterval(oldMockInterval);
                return;
            }
            if (oldAudio.currentTime >= duration) {
                oldAudio.currentTime = 0;
                setOldPlayState(false);
                clearInterval(oldMockInterval);
                return;
            }
            if (!isSeeking) {
                oldAudio.currentTime += 1;
                updateOldProgress(oldAudio.currentTime);
            }
        }, 1000);
    }

    /* ==========================================================================
       4. AUDIO PLAYER 2: CD SHOP PREVIEW PLAYER
       ========================================================================== */
    const shopAudio = document.getElementById('shop-preview-audio');
    const shopTrackRows = document.querySelectorAll('.shop-track-row');
    let activeShopRow = document.querySelector('.shop-track-row.active');

    function resetShopIcons() {
        shopTrackRows.forEach(row => {
            const playIcon = row.querySelector('.shop-play-icon');
            const pauseIcon = row.querySelector('.shop-pause-icon');
            if (playIcon && pauseIcon) {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            }
        });
    }

    let shopPlayPromise = null;
    if (shopTrackRows.length > 0 && shopAudio) {
        shopTrackRows.forEach(row => {
            row.addEventListener('click', () => {
                // Stop old releases audio
                if (oldAudio && !oldAudio.paused) {
                    oldAudio.pause();
                    setOldPlayState(false);
                }

                const isCurrentlyActive = row.classList.contains('active');
                const playIcon = row.querySelector('.shop-play-icon');
                const pauseIcon = row.querySelector('.shop-pause-icon');

                if (isCurrentlyActive) {
                    const isPlayIconVisible = !playIcon.classList.contains('hidden');

                    if (isPlayIconVisible) {
                        playIcon.classList.add('hidden');
                        pauseIcon.classList.remove('hidden');
                        
                        shopPlayPromise = shopAudio.play();
                        if (shopPlayPromise !== undefined) {
                            shopPlayPromise.then(() => {
                                // Successfully playing
                            }).catch(err => {
                                if (err.name === 'AbortError') {
                                    console.log("Shop audio play interrupted by pause.");
                                    return;
                                }
                                playIcon.classList.add('hidden');
                                pauseIcon.classList.remove('hidden');
                            });
                        }
                    } else {
                        playIcon.classList.remove('hidden');
                        pauseIcon.classList.add('hidden');

                        if (shopPlayPromise !== undefined && shopPlayPromise !== null) {
                            shopPlayPromise.then(() => {
                                shopAudio.pause();
                            }).catch(() => {
                                shopAudio.pause();
                            });
                        } else {
                            shopAudio.pause();
                        }
                    }
                } else {
                    shopTrackRows.forEach(r => r.classList.remove('active'));
                    row.classList.add('active');
                    activeShopRow = row;
                    
                    resetShopIcons();
                    
                    const src = row.getAttribute('data-preview-src');
                    shopAudio.src = src;
                    
                    shopPlayPromise = shopAudio.play();
                    if (shopPlayPromise !== undefined) {
                        shopPlayPromise.then(() => {
                            playIcon.classList.add('hidden');
                            pauseIcon.classList.remove('hidden');
                        }).catch(err => {
                            if (err.name === 'AbortError') {
                                console.log("Shop audio play source transition interrupted by pause.");
                                return;
                            }
                            playIcon.classList.add('hidden');
                            pauseIcon.classList.remove('hidden');
                        });
                    } else {
                        playIcon.classList.add('hidden');
                        pauseIcon.classList.remove('hidden');
                    }
                }
            });
        });

        shopAudio.addEventListener('ended', () => {
            resetShopIcons();
            // Auto play next track in the row list
            if (activeShopRow) {
                const nextRow = activeShopRow.nextElementSibling;
                if (nextRow && nextRow.classList.contains('shop-track-row')) {
                    nextRow.click();
                }
            }
        });
    }

    /* ==========================================================================
       5. SHOPPING CART SYSTEM
       ========================================================================== */
    let cart = [];
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartPanel = document.getElementById('cart-panel');
    const cartPanelOverlay = document.getElementById('cart-panel-overlay');
    const cartBadge = document.getElementById('cart-badge');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalValue = document.getElementById('cart-total-value');
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutModal = document.getElementById('close-checkout-modal');
    const checkoutSummaryList = document.getElementById('checkout-summary-list');
    const checkoutSummaryTotalVal = document.getElementById('checkout-summary-total-val');
    const checkoutForm = document.getElementById('checkout-form');

    // Promo Code elements and state
    const discountCodeInput = document.getElementById('checkout-discount-code');
    const applyDiscountBtn = document.getElementById('apply-discount-btn');
    const discountFeedback = document.getElementById('discount-feedback');

    let appliedDiscountPercent = 0;
    let appliedDiscountCode = "";

    const validPromoCodes = {
        'ANFANG': 0.20,      // 20% discount
        'XZENTREXUS': 0.10,  // 10% discount
        'PROMO15': 0.15      // 15% discount
    };

    function updateCheckoutTotal() {
        if (!checkoutSummaryTotalVal) return;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const shipping = subtotal > 0 ? 1.99 : 0.00;
        const discountAmount = subtotal * appliedDiscountPercent;
        const total = Math.max(0, subtotal - discountAmount) + shipping;

        // Render summary items
        let summaryHtml = cart.map(item => `
            <li>
                <span>${item.qty}x ${escapeHTML(item.name)}</span>
                <span>${(item.price * item.qty).toFixed(2)} €</span>
            </li>
        `).join('');

        if (appliedDiscountPercent > 0) {
            summaryHtml += `
                <li class="checkout-discount-summary" style="color: #00d4d4; font-weight: 600;">
                    <span>Rabatt (${appliedDiscountCode})</span>
                    <span>-${discountAmount.toFixed(2)} €</span>
                </li>
            `;
        }

        summaryHtml += `
            <li class="checkout-shipping-summary">
                <span>Versandkosten (gepolstert)</span>
                <span>${shipping.toFixed(2)} €</span>
            </li>
        `;

        if (checkoutSummaryList) {
            checkoutSummaryList.innerHTML = summaryHtml;
        }
        checkoutSummaryTotalVal.textContent = `${total.toFixed(2)} €`;
    }

    // Cart overlay toggle functions
    function toggleCartPanel() {
        cartPanel.classList.toggle('open');
        cartPanelOverlay.classList.toggle('open');
    }

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', toggleCartPanel);
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCartPanel);
    if (cartPanelOverlay) cartPanelOverlay.addEventListener('click', toggleCartPanel);

    // Add product to cart logic
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const price = parseFloat(btn.getAttribute('data-price'));
            const image = btn.getAttribute('data-image');
            
            addToCart(id, name, price, image);
            
            if (!cartPanel.classList.contains('open')) {
                toggleCartPanel();
            }
        });
    });

    function addToCart(id, name, price, image) {
        // Stock validation for CD items
        if (id.includes('anfang') || id.includes('cd')) {
            const remaining = getRemainingStock();
            const currentInCart = cart.filter(item => item.id === id).reduce((sum, item) => sum + item.qty, 0);
            if (currentInCart + 1 > remaining) {
                alert(`Es sind nur noch ${remaining} Einheiten verfügbar.`);
                return;
            }
        }

        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ id, name, price, image, qty: 1 });
        }
        updateCart();
    }

    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        updateCart();
    }

    function changeQuantity(id, amount) {
        const item = cart.find(item => item.id === id);
        if (item) {
            const newQty = item.qty + amount;
            if (newQty <= 0) {
                removeFromCart(id);
                return;
            }
            // Stock validation for CD items on increment
            if (amount > 0 && (id.includes('anfang') || id.includes('cd'))) {
                const remaining = getRemainingStock();
                if (newQty > remaining) {
                    alert(`Es sind nur noch ${remaining} Einheiten verfügbar.`);
                    return;
                }
            }
            item.qty = newQty;
        }
        updateCart();
    }

    function updateCart() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        cartBadge.textContent = totalItems;
        
        // Subtotal
        const itemsSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        // Shipping cost flat rate: 1,99 € zzgl.
        const shippingCost = itemsSubtotal > 0 ? 1.99 : 0.00;
        const totalWithShipping = itemsSubtotal + shippingCost;
        
        cartTotalValue.textContent = `${totalWithShipping.toFixed(2)} €`;
        if (checkoutSummaryTotalVal) {
            updateCheckoutTotal();
        }

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Dein Warenkorb ist leer.</div>';
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
            
            cartItemsContainer.innerHTML = `
                <div class="cart-items-list">
                    ${cart.map(item => `
                        <div class="cart-item">
                            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="cart-item-img">
                            <div class="cart-item-info">
                                <h4 class="cart-item-name">${escapeHTML(item.name)}</h4>
                                <span class="cart-item-price">${(item.price * item.qty).toFixed(2)} €</span>
                                <div class="cart-item-qty">
                                    <button class="qty-btn dec-qty" data-id="${escapeHTML(item.id)}">-</button>
                                    <span class="qty-val">${item.qty}</span>
                                    <button class="qty-btn inc-qty" data-id="${escapeHTML(item.id)}">+</button>
                                </div>
                            </div>
                            <button class="remove-item-btn" data-id="${escapeHTML(item.id)}" aria-label="Artikel entfernen">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="cart-shipping-info-row">
                    <span class="shipping-info-label">Versand (gepolstert):</span>
                    <span class="shipping-info-val">${shippingCost.toFixed(2)} €</span>
                </div>
            `;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Cart item event listeners
            document.querySelectorAll('.dec-qty').forEach(btn => {
                btn.addEventListener('click', () => changeQuantity(btn.getAttribute('data-id'), -1));
            });
            document.querySelectorAll('.inc-qty').forEach(btn => {
                btn.addEventListener('click', () => changeQuantity(btn.getAttribute('data-id'), 1));
            });
            document.querySelectorAll('.remove-item-btn').forEach(btn => {
                btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-id')));
            });
        }
    }

    // Checkout Modal interactions
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return;
            
            toggleCartPanel();
            
            // Reset discount inputs on checkout opening
            if (discountCodeInput) discountCodeInput.value = '';
            if (discountFeedback) {
                discountFeedback.textContent = '';
                discountFeedback.className = 'discount-feedback';
            }
            appliedDiscountPercent = 0;
            appliedDiscountCode = "";
            
            updateCheckoutTotal();
            checkoutModal.classList.add('open');
        });
    }

    if (applyDiscountBtn && discountCodeInput && discountFeedback) {
        applyDiscountBtn.addEventListener('click', () => {
            const enteredCode = discountCodeInput.value.trim().toUpperCase();
            if (!enteredCode) {
                discountFeedback.textContent = 'Bitte gib einen Code ein.';
                discountFeedback.className = 'discount-feedback error';
                return;
            }

            if (validPromoCodes.hasOwnProperty(enteredCode)) {
                appliedDiscountPercent = validPromoCodes[enteredCode];
                appliedDiscountCode = enteredCode;
                discountFeedback.textContent = `Rabattcode '${enteredCode}' (${appliedDiscountPercent * 100}%) erfolgreich angewendet!`;
                discountFeedback.className = 'discount-feedback success';
                updateCheckoutTotal();
            } else {
                discountFeedback.textContent = 'Rabattcode ungültig.';
                discountFeedback.className = 'discount-feedback error';
            }
        });
    }

    if (closeCheckoutModal) {
        closeCheckoutModal.addEventListener('click', () => {
            checkoutModal.classList.remove('open');
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Honeypot check for spam protection
            const hpField = document.getElementById('checkout-hp');
            if (hpField && hpField.value) {
                console.warn('Spam order detected via Honeypot.');
                // Simulate success silently so the bot thinks it succeeded
                const submitBtn = checkoutForm.querySelector('button[type="submit"]');
                const origText = submitBtn.textContent;
                submitBtn.textContent = 'Verarbeite Bestellung...';
                submitBtn.disabled = true;
                setTimeout(() => {
                    submitBtn.textContent = 'Bestellung erfolgreich!';
                    cart = [];
                    updateCart();
                    setTimeout(() => {
                        checkoutModal.classList.remove('open');
                        submitBtn.textContent = origText;
                        submitBtn.disabled = false;
                        checkoutForm.reset();
                        appliedDiscountPercent = 0;
                        appliedDiscountCode = "";
                        if (discountCodeInput) discountCodeInput.value = '';
                        if (discountFeedback) {
                            discountFeedback.textContent = '';
                            discountFeedback.className = 'discount-feedback';
                        }
                    }, 1500);
                }, 1000);
                return;
            }

            const nameVal = document.getElementById('checkout-name').value.trim();
            const emailVal = document.getElementById('checkout-email').value.trim();
            const addressField = document.getElementById('checkout-address');
            const addressVal = addressField ? addressField.value.trim() : '';

            // Clean client-side validation
            if (!nameVal || !emailVal) {
                alert('Bitte fülle Name und E-Mail-Adresse aus.');
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailVal)) {
                alert('Bitte gib eine gültige E-Mail-Adresse ein.');
                return;
            }

            // Since the cart contains physical items, address is required
            const hasPhysical = cart.some(item => item.id.includes('physical') || item.id.includes('cd'));
            if (hasPhysical && !addressVal) {
                alert('Bitte gib eine vollständige Lieferadresse für den CD-Versand an.');
                if (addressField) addressField.focus();
                return;
            }

            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Verarbeite Bestellung...';
            submitBtn.disabled = true;

            // Generate unique order number and timestamp
            const orderId = generateOrderNumber();
            const now = new Date();
            const timestamp = now.toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // Build order items summary text
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const shipping = subtotal > 0 ? 1.99 : 0.00;
            const discountAmount = subtotal * appliedDiscountPercent;
            const total = Math.max(0, subtotal - discountAmount) + shipping;

            const orderItemsText = cart.map(item =>
                `${item.qty}x ${item.name} — ${(item.price * item.qty).toFixed(2)} €`
            ).join('\n') +
                (appliedDiscountPercent > 0 ? `\nRabatt (${appliedDiscountCode}): -${discountAmount.toFixed(2)} €` : '') +
                `\nVersand: ${shipping.toFixed(2)} €`;

            const totalPrice = `${total.toFixed(2)} €`;

            // Send order via Formspree
            fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: 'Neue Bestellung ' + orderId + ' von ' + nameVal,
                    Typ: 'Bestellung',
                    Bestellnummer: orderId,
                    Name: nameVal,
                    Email: emailVal,
                    Lieferadresse: addressVal || 'Keine Adresse angegeben',
                    Produkte: orderItemsText,
                    Rabattcode: appliedDiscountCode || 'Keiner',
                    Gesamtpreis: totalPrice,
                    Zeitpunkt: timestamp
                })
            })
            .then(response => {
                if (!response.ok) throw new Error('Formspree response not ok');

                submitBtn.textContent = 'Weiterleitung zu Stripe...';

                // Increment sales counter by the actual CD quantity purchased
                const cdItem = cart.find(item => item.id.includes('anfang') || item.id.includes('cd'));
                if (cdItem) {
                    incrementSalesCount(cdItem.qty);
                }

                cart = [];
                updateCart();
                
                setTimeout(() => {
                    checkoutModal.classList.remove('open');
                    submitBtn.textContent = origText;
                    submitBtn.disabled = false;
                    checkoutForm.reset();
                    appliedDiscountPercent = 0;
                    appliedDiscountCode = "";
                    if (discountCodeInput) discountCodeInput.value = '';
                    if (discountFeedback) {
                        discountFeedback.textContent = '';
                        discountFeedback.className = 'discount-feedback';
                    }
                    
                    // Redirect to Stripe page
                    window.location.href = "https://buy.stripe.com/test_4gM7sLb6V3un9W0aHecwg00";
                }, 1000);
            })
            .catch((error) => {
                console.error('Order form send failed:', error);
                submitBtn.textContent = origText;
                submitBtn.disabled = false;
                alert('Bestellung konnte nicht verarbeitet werden. Bitte versuche es erneut oder kontaktiere uns unter info@xzentrexus.com.');
            });
        });
    }

    /* ==========================================================================
       5.5. PRODUCT SLIDER (CD SHOP)
       ========================================================================== */
    const productSlider = document.getElementById('product-slider');
    const sliderPrev = document.getElementById('slider-prev');
    const sliderNext = document.getElementById('slider-next');
    const sliderDotsContainer = document.getElementById('slider-dots');
    
    if (productSlider) {
        const slides = productSlider.querySelectorAll('.product-slide');
        const dots = sliderDotsContainer ? sliderDotsContainer.querySelectorAll('.dot') : [];
        let currentSlideIndex = 0;
        const totalSlides = slides.length;

        function goToSlide(index) {
            // Clamp and wrap index
            if (index < 0) {
                currentSlideIndex = totalSlides - 1;
            } else if (index >= totalSlides) {
                currentSlideIndex = 0;
            } else {
                currentSlideIndex = index;
            }

            // Translate the slider container
            productSlider.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

            // Update active states on slides
            slides.forEach((slide, i) => {
                if (i === currentSlideIndex) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });

            // Update dots active state
            dots.forEach((dot, i) => {
                if (i === currentSlideIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        // Prev Arrow click
        if (sliderPrev) {
            sliderPrev.addEventListener('click', () => {
                goToSlide(currentSlideIndex - 1);
            });
        }

        // Next Arrow click
        if (sliderNext) {
            sliderNext.addEventListener('click', () => {
                goToSlide(currentSlideIndex + 1);
            });
        }

        // Dots click
        dots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-slide'), 10);
                if (!isNaN(index)) {
                    goToSlide(index);
                }
            });
        });

        // Initialize first slide state
        goToSlide(0);
        
        // Touch gestures for swipe support
        let startX = 0;
        let endX = 0;

        productSlider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            endX = startX; // Reset endX to startX to prevent tap-to-slide calculation bug
        }, { passive: true });

        productSlider.addEventListener('touchmove', (e) => {
            endX = e.touches[0].clientX;
        }, { passive: true });

        productSlider.addEventListener('touchend', () => {
            const diffX = startX - endX;
            const threshold = 50; // pixels
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // Swiped left, go next
                    goToSlide(currentSlideIndex + 1);
                } else {
                    // Swiped right, go prev
                    goToSlide(currentSlideIndex - 1);
                }
            }
        });
    }

    /* ==========================================================================
       5.6. AUTOMATIC PRE-ORDER & RELEASE SYSTEM
       ========================================================================== */
    const releaseTargetTime = new Date(2026, 7, 14, 0, 0, 0).getTime();
    
    const statusBadge = document.getElementById('product-status-badge');
    const releaseBadge = document.getElementById('product-release-badge');
    const countdownContainer = document.getElementById('release-countdown');
    const preorderNotice = document.getElementById('preorder-notice');
    const orderBtn = document.getElementById('shop-order-btn');
    
    const cdDays = document.getElementById('countdown-days');
    const cdHours = document.getElementById('countdown-hours');
    const cdMinutes = document.getElementById('countdown-minutes');
    const cdSeconds = document.getElementById('countdown-seconds');

    function updateReleaseSystem() {
        const now = new Date().getTime();
        const timeLeft = releaseTargetTime - now;

        if (timeLeft > 0) {
            // Pre-release mode
            if (statusBadge && statusBadge.textContent !== 'Vorbestellung möglich') {
                statusBadge.textContent = 'Vorbestellung möglich';
            }
            if (releaseBadge) {
                releaseBadge.textContent = 'Veröffentlichung am 14.08.2026';
                releaseBadge.style.display = 'inline-block';
            }
            if (countdownContainer) countdownContainer.style.display = 'block';
            if (preorderNotice) preorderNotice.style.display = 'flex';
            
            if (orderBtn) {
                if (!orderBtn.innerHTML.includes('Jetzt vorbestellen')) {
                    orderBtn.innerHTML = '<i data-lucide="shopping-cart"></i> Jetzt vorbestellen';
                    orderBtn.setAttribute('data-name', 'CD - Anfang (Vorbestellung)');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }

            // Calculate countdown values
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
            if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
            if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, '0');
            if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, '0');
        } else {
            // Released mode
            if (statusBadge && statusBadge.textContent !== 'Jetzt erhältlich') {
                statusBadge.textContent = 'Jetzt erhältlich';
            }
            if (releaseBadge) releaseBadge.style.display = 'none';
            if (countdownContainer) countdownContainer.style.display = 'none';
            if (preorderNotice) preorderNotice.style.display = 'none';
            
            if (orderBtn) {
                if (!orderBtn.innerHTML.includes('Jetzt bestellen')) {
                    orderBtn.innerHTML = '<i data-lucide="shopping-cart"></i> Jetzt bestellen';
                    orderBtn.setAttribute('data-name', 'CD - Anfang (Physische CD)');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }
    }

    if (orderBtn) {
        // Run immediately
        updateReleaseSystem();
        // Update countdown every second
        const countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const timeLeft = releaseTargetTime - now;
            updateReleaseSystem();
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    /* ==========================================================================
       6. PORTFOLIO & PRODUCT GALLERY LIGHTBOX SYSTEM
       ========================================================================== */
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const productMockups = document.querySelectorAll('.cd-mockup');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxModal = document.getElementById('close-lightbox-modal');
    const lightboxDotsContainer = document.getElementById('lightbox-dots');

    let activeGallery = [];
    let activeIndex = 0;

    function openLightbox(imagesList, index) {
        activeGallery = Array.from(imagesList);
        activeIndex = index;
        
        // Build navigation dots
        if (lightboxDotsContainer) {
            lightboxDotsContainer.innerHTML = '';
            if (activeGallery.length > 1) {
                activeGallery.forEach((_, i) => {
                    const dot = document.createElement('span');
                    dot.className = 'lightbox-dot';
                    if (i === activeIndex) dot.classList.add('active');
                    dot.addEventListener('click', (e) => {
                        e.stopPropagation();
                        playClickSound();
                        activeIndex = i;
                        updateLightboxImage();
                    });
                    lightboxDotsContainer.appendChild(dot);
                });
            }
        }
        
        updateLightboxImage();
        if (lightboxModal) {
            lightboxModal.classList.add('open');
        }
    }

    function updateLightboxImage() {
        if (activeGallery.length === 0 || !lightboxImg) return;
        
        const currentImg = activeGallery[activeIndex];
        
        // Remove animation class and trigger reflow to restart animation
        lightboxImg.classList.remove('animate-glow');
        void lightboxImg.offsetWidth; // Force reflow
        
        // Update source
        lightboxImg.src = currentImg.src || currentImg.querySelector('img').src;
        
        // Add animation class
        lightboxImg.classList.add('animate-glow');
        
        // Update active dot indicators
        if (lightboxDotsContainer) {
            const dots = lightboxDotsContainer.querySelectorAll('.lightbox-dot');
            dots.forEach((dot, i) => {
                if (i === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function nextLightboxImage() {
        if (activeGallery.length <= 1) return;
        activeIndex = (activeIndex + 1) % activeGallery.length;
        updateLightboxImage();
    }

    function prevLightboxImage() {
        if (activeGallery.length <= 1) return;
        activeIndex = (activeIndex - 1 + activeGallery.length) % activeGallery.length;
        updateLightboxImage();
    }

    // Attach portfolio click listeners
    portfolioItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const allPortfolioImgs = Array.from(document.querySelectorAll('.portfolio-item img'));
            openLightbox(allPortfolioImgs, index);
        });
    });

    // Attach product mockup click listeners
    productMockups.forEach((img, index) => {
        img.addEventListener('click', () => {
            // Add click visual glow feedback
            img.classList.add('clicked-glow');
            setTimeout(() => {
                img.classList.remove('clicked-glow');
            }, 600);

            // Open lightbox after a tiny delay to let the click animation play
            setTimeout(() => {
                openLightbox(productMockups, index);
            }, 250);
        });
    });

    if (closeLightboxModal) {
        closeLightboxModal.addEventListener('click', () => {
            lightboxModal.classList.remove('open');
        });
    }

    if (lightboxModal) {
        lightboxModal.querySelector('.modal-overlay').addEventListener('click', () => {
            lightboxModal.classList.remove('open');
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightboxModal && lightboxModal.classList.contains('open')) {
            if (e.key === 'ArrowRight') {
                nextLightboxImage();
            } else if (e.key === 'ArrowLeft') {
                prevLightboxImage();
            }
        }
    });

    /* ==========================================================================
       7. CONTACT FORM HANDLING
       ========================================================================== */
    const contactForm = document.getElementById('contact-form');
    const formStatusMsg = document.getElementById('form-status-msg');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Honeypot check for spam protection
            const hpField = document.getElementById('contact-hp');
            if (hpField && hpField.value) {
                console.warn('Spam contact message detected via Honeypot.');
                // Simulate success silently
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Wird gesendet...';
                submitBtn.disabled = true;
                formStatusMsg.className = 'form-status-msg';
                formStatusMsg.textContent = '';
                setTimeout(() => {
                    submitBtn.textContent = 'Nachricht senden';
                    submitBtn.disabled = false;
                    formStatusMsg.classList.add('success');
                    formStatusMsg.textContent = 'Deine Nachricht wurde erfolgreich gesendet. Ich melde mich in Kürze!';
                    contactForm.reset();
                }, 1000);
                return;
            }

            const nameVal = document.getElementById('contact-name').value.trim();
            const emailVal = document.getElementById('contact-email').value.trim();
            const messageVal = document.getElementById('contact-message').value.trim();

            if (!nameVal || !emailVal || !messageVal) {
                alert('Bitte fülle alle Pflichtfelder aus.');
                return;
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emailVal)) {
                alert('Bitte gib eine gültige E-Mail-Adresse ein.');
                return;
            }
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Wird gesendet...';
            submitBtn.disabled = true;
            formStatusMsg.className = 'form-status-msg';
            formStatusMsg.textContent = '';

            // Build Formspree payload
            const now = new Date();
            const timestamp = now.toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // Send via Formspree
            fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: 'Neue Kontaktanfrage von ' + nameVal,
                    Typ: 'Kontaktanfrage',
                    Name: nameVal,
                    Email: emailVal,
                    Nachricht: messageVal,
                    Zeitpunkt: timestamp
                })
            })
            .then(response => {
                if (response.ok) {
                    submitBtn.textContent = 'Nachricht senden';
                    submitBtn.disabled = false;
                    formStatusMsg.classList.add('success');
                    formStatusMsg.textContent = 'Deine Nachricht wurde erfolgreich gesendet. Ich melde mich in Kürze!';
                    contactForm.reset();
                    setTimeout(() => {
                        formStatusMsg.textContent = '';
                    }, 5000);
                } else {
                    throw new Error('Formspree response not ok');
                }
            })
            .catch((error) => {
                console.error('Contact form send failed:', error);
                submitBtn.textContent = 'Nachricht senden';
                submitBtn.disabled = false;
                formStatusMsg.classList.add('error');
                formStatusMsg.textContent = 'Senden fehlgeschlagen. Bitte versuche es erneut oder schreibe direkt an info@xzentrexus.com.';
            });
        });
    }

    /* ==========================================================================
       8. LEGAL INFORMATION MODALS (IMPRESSUM, DATENSCHUTZ, SHOP-INFO)
       ========================================================================== */
    const impressumLink = document.getElementById('impressum-link');
    const datenschutzLink = document.getElementById('datenschutz-link');
    const shopInfoLink = document.getElementById('shop-info-link');
    
    const impressumModal = document.getElementById('impressum-modal');
    const datenschutzModal = document.getElementById('datenschutz-modal');
    const shopInfoModal = document.getElementById('shop-info-modal');
    
    const closeImpressumModal = document.getElementById('close-impressum-modal');
    const closeDatenschutzModal = document.getElementById('close-datenschutz-modal');
    const closeShopInfoModal = document.getElementById('close-shop-info-modal');

    if (impressumLink && impressumModal) {
        impressumLink.addEventListener('click', (e) => {
            e.preventDefault();
            impressumModal.classList.add('open');
        });
    }
    if (closeImpressumModal) {
        closeImpressumModal.addEventListener('click', () => {
            impressumModal.classList.remove('open');
        });
    }
    if (impressumModal) {
        impressumModal.querySelector('.modal-overlay').addEventListener('click', () => {
            impressumModal.classList.remove('open');
        });
    }

    if (datenschutzLink && datenschutzModal) {
        datenschutzLink.addEventListener('click', (e) => {
            e.preventDefault();
            datenschutzModal.classList.add('open');
        });
    }
    if (closeDatenschutzModal) {
        closeDatenschutzModal.addEventListener('click', () => {
            datenschutzModal.classList.remove('open');
        });
    }
    if (datenschutzModal) {
        datenschutzModal.querySelector('.modal-overlay').addEventListener('click', () => {
            datenschutzModal.classList.remove('open');
        });
    }

    if (shopInfoLink && shopInfoModal) {
        shopInfoLink.addEventListener('click', (e) => {
            e.preventDefault();
            shopInfoModal.classList.add('open');
        });
    }
    if (closeShopInfoModal) {
        closeShopInfoModal.addEventListener('click', () => {
            shopInfoModal.classList.remove('open');
        });
    }
    if (shopInfoModal) {
        shopInfoModal.querySelector('.modal-overlay').addEventListener('click', () => {
            shopInfoModal.classList.remove('open');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            let closedSomething = false;
            
            const openModals = document.querySelectorAll('.modal.open');
            if (openModals.length > 0) {
                openModals.forEach(modal => modal.classList.remove('open'));
                closedSomething = true;
            }
            
            if (cartPanel && cartPanel.classList.contains('open')) {
                toggleCartPanel();
                closedSomething = true;
            }
            
            if (navMenu && navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                const currentMenuIcon = document.getElementById('menu-icon');
                if (currentMenuIcon) {
                    currentMenuIcon.setAttribute('data-lucide', 'menu');
                }
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                closedSomething = true;
            }
            
            if (closedSomething) {
                playExitSound(); // Play exit sound when closing modals, cart or menu via Escape key
            }
        }
    });

    /* ==========================================================================
       10. GLOBAL CLICK & EXIT SOUND EFFECTS - EVENT LISTENER
       ========================================================================== */
    document.addEventListener('click', (e) => {
        // Exclude the entire "Frühere Veröffentlichungen" container/section completely (including any future elements inside it)
        if (e.target.closest('#music') || e.target.closest('.music-section')) {
            return;
        }

        // Check if it's an exit/close interaction first
        const isExitElement = e.target.closest('#brand-logo, .modal-close, .close-cart-btn, .modal-overlay, .cart-panel-overlay');
        if (isExitElement) {
            playExitSound();
            return; // Exit early, do not play the standard click sound
        }

        // Otherwise check if it's a standard interactive element
        const interactive = e.target.closest('a, button, [role="button"], input, textarea, select, label, .dot, .lightbox-dot, .cd-mockup, .portfolio-item, .track-item, .play-btn, .timeline-container, .skip-btn');
        if (interactive) {
            playClickSound();
        }
    });
});
