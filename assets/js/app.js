/* ==========================================================================
   XZENTREXUS OFFICIAL WEBSITE - APPLICATION INTERACTIVES
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize Click and Exit Sounds
    const clickAudio = new Audio('assets/music/click.wav');
    clickAudio.volume = 0.8; // Increased volume for clearer feedback

    const exitAudio = new Audio('assets/music/exit.wav');
    exitAudio.volume = 0.8; // Increased volume for clearer feedback

    function playClickSound() {
        clickAudio.currentTime = 0;
        clickAudio.play().catch(err => {
            console.log('Audio playback prevented by autoplay policy:', err);
        });
    }

    function playExitSound() {
        exitAudio.currentTime = 0;
        exitAudio.play().catch(err => {
            console.log('Audio playback prevented by autoplay policy:', err);
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
       1. NAVIGATION & MOBILE MENU
       ========================================================================== */
    const header = document.getElementById('header');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const menuIcon = document.getElementById('menu-icon');

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
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('open');
            
            // Toggle menu icon
            if (navMenu.classList.contains('open')) {
                menuIcon.setAttribute('data-lucide', 'x');
            } else {
                menuIcon.setAttribute('data-lucide', 'menu');
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
                menuIcon.setAttribute('data-lucide', 'menu');
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
            menuIcon.setAttribute('data-lucide', 'menu');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
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

    if (oldPlayBtn && oldAudio) {
        oldPlayBtn.addEventListener('click', () => {
            // Stop shop audio if playing
            if (shopAudio && !shopAudio.paused) {
                shopAudio.pause();
                resetShopIcons();
            }

            if (oldAudio.paused) {
                oldAudio.play().then(() => {
                    setOldPlayState(true);
                }).catch(err => {
                    console.log("Old audio play blocked, simulating:", err);
                    setOldPlayState(true);
                    simulateOldProgress();
                });
            } else {
                oldAudio.pause();
                setOldPlayState(false);
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
            if (oldAudio.paused) {
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
                    if (shopAudio.paused) {
                        shopAudio.play().then(() => {
                            playIcon.classList.add('hidden');
                            pauseIcon.classList.remove('hidden');
                        }).catch(() => {
                            playIcon.classList.add('hidden');
                            pauseIcon.classList.remove('hidden');
                        });
                    } else {
                        shopAudio.pause();
                        playIcon.classList.remove('hidden');
                        pauseIcon.classList.add('hidden');
                    }
                } else {
                    shopTrackRows.forEach(r => r.classList.remove('active'));
                    row.classList.add('active');
                    activeShopRow = row;
                    
                    resetShopIcons();
                    
                    const src = row.getAttribute('data-preview-src');
                    shopAudio.src = src;
                    
                    shopAudio.play().then(() => {
                        playIcon.classList.add('hidden');
                        pauseIcon.classList.remove('hidden');
                    }).catch(() => {
                        playIcon.classList.add('hidden');
                        pauseIcon.classList.remove('hidden');
                    });
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
            item.qty += amount;
            if (item.qty <= 0) {
                removeFromCart(id);
                return;
            }
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
        checkoutSummaryTotalVal.textContent = `${totalWithShipping.toFixed(2)} €`;

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
                            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                            <div class="cart-item-info">
                                <h4 class="cart-item-name">${item.name}</h4>
                                <span class="cart-item-price">${(item.price * item.qty).toFixed(2)} €</span>
                                <div class="cart-item-qty">
                                    <button class="qty-btn dec-qty" data-id="${item.id}">-</button>
                                    <span class="qty-val">${item.qty}</span>
                                    <button class="qty-btn inc-qty" data-id="${item.id}">+</button>
                                </div>
                            </div>
                            <button class="remove-item-btn" data-id="${item.id}" aria-label="Artikel entfernen">
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
            
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const shipping = 1.99;
            const total = subtotal + shipping;

            checkoutSummaryList.innerHTML = `
                ${cart.map(item => `
                    <li>
                        <span>${item.qty}x ${item.name}</span>
                        <span>${(item.price * item.qty).toFixed(2)} €</span>
                    </li>
                `).join('')}
                <li class="checkout-shipping-summary">
                    <span>Versandkosten (gepolstert)</span>
                    <span>${shipping.toFixed(2)} €</span>
                </li>
            `;
            
            checkoutSummaryTotalVal.textContent = `${total.toFixed(2)} €`;
            checkoutModal.classList.add('open');
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
                        alert('Danke für deine Bestellung! Du erhältst in Kürze eine E-Mail mit Zahlungs- und Download-Details.');
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
            
            setTimeout(() => {
                submitBtn.textContent = 'Bestellung erfolgreich!';
                cart = [];
                updateCart();
                
                setTimeout(() => {
                    checkoutModal.classList.remove('open');
                    submitBtn.textContent = origText;
                    submitBtn.disabled = false;
                    checkoutForm.reset();
                    
                    alert('Danke für deine Bestellung! Du erhältst in Kürze eine E-Mail mit Zahlungs- und Download-Details.');
                }, 1500);
            }, 2000);
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
            
            setTimeout(() => {
                submitBtn.textContent = 'Nachricht senden';
                submitBtn.disabled = false;
                
                formStatusMsg.classList.add('success');
                formStatusMsg.textContent = 'Deine Nachricht wurde erfolgreich gesendet. Ich melde mich in Kürze!';
                contactForm.reset();
                
                setTimeout(() => {
                    formStatusMsg.textContent = '';
                }, 5000);
            }, 1500);
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
            const openModals = document.querySelectorAll('.modal.open');
            openModals.forEach(modal => modal.classList.remove('open'));
            
            if (cartPanel && cartPanel.classList.contains('open')) {
                toggleCartPanel();
            }
        }
    });

    /* ==========================================================================
       10. GLOBAL CLICK & EXIT SOUND EFFECTS - EVENT LISTENER
       ========================================================================== */
    document.addEventListener('click', (e) => {
        // Check if it's an exit/close interaction first
        const isExitElement = e.target.closest('#brand-logo, .modal-close, .close-cart-btn, .modal-overlay, .cart-panel-overlay');
        if (isExitElement) {
            playExitSound();
            return; // Exit early, do not play the standard click sound
        }

        // Otherwise check if it's a standard interactive element
        const interactive = e.target.closest('a, button, .dot, .lightbox-dot, .cd-mockup, .portfolio-item, .track-item, .play-btn, .timeline-container, .skip-btn');
        if (interactive) {
            // Exclude all controls belonging to the "Alte Releases" player (e.g., play/pause, skip buttons, timeline clicks)
            if (interactive.closest('.custom-track-player')) {
                return;
            }
            playClickSound();
        }
    });
});
