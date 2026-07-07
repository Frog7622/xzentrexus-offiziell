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

    // Initialize Web Audio API and Audio Buffers for Zero-Latency Playback
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let clickBuffer = null;
    let exitBuffer = null;

    // XZ Companion Audio Buffers
    let xzClickBuffer = null;
    let xzDragBuffer = null;
    let xzCloseBuffer = null;
    let xzDragSourceNode = null;
    let xzDragGainNode = null;
    let xzDragFadeInterval = null;
    let isSoundEnabled = true; // global sound toggle — controlled by sound orb

    // Instantiate fallback HTML5 Audio elements immediately for aggressive browser caching
    const clickAudioFallback = new Audio('assets/music/click.wav');
    clickAudioFallback.volume = 1.0;  // +2 dB
    clickAudioFallback.preload = 'auto';

    const exitAudioFallback = new Audio('assets/music/exit.wav');
    exitAudioFallback.volume = 1.0;   // +2 dB
    exitAudioFallback.preload = 'auto';

    // XZ Companion Audio Fallbacks
    const xzClickAudioFallback = new Audio('assets/music/xz_click.wav');
    xzClickAudioFallback.volume = 1.0;   // +5.0 dB total (HTML5 max 1.0)
    xzClickAudioFallback.preload = 'auto';

    const xzDragAudioFallback = new Audio('assets/music/xz_drag.wav');
    xzDragAudioFallback.volume = 1.0;    // +3.5 dB (HTML5 max 1.0)
    xzDragAudioFallback.preload = 'auto';

    const xzCloseAudioFallback = new Audio('assets/music/xz_close.wav');
    xzCloseAudioFallback.volume = 1.0;   // +3.5 dB (HTML5 max 1.0)
    xzCloseAudioFallback.preload = 'auto';

    if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        
        // Preload and decode Web Audio API buffers immediately in the background
        preloadSound('assets/music/click.wav').then(buffer => { clickBuffer = buffer; });
        preloadSound('assets/music/exit.wav').then(buffer => { exitBuffer = buffer; });
        
        // Preload XZ sounds
        preloadSound('assets/music/xz_click.wav').then(buffer => { xzClickBuffer = buffer; });
        preloadSound('assets/music/xz_drag.wav').then(buffer => { xzDragBuffer = buffer; });
        preloadSound('assets/music/xz_close.wav').then(buffer => { xzCloseBuffer = buffer; });
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

    function playBuffer(buffer, volume = 0.8, isRetry = false, offset = 0) {
        if (!audioCtx || !buffer) return;
        
        // Safety resume for context state (in case it is suspended)
        if (audioCtx.state === 'suspended' && !isRetry) {
            audioCtx.resume().then(() => {
                playBuffer(buffer, volume, true, offset);
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
                playBufferDirect(buffer, volume, offset);
            });
            return;
        }
        
        playBufferDirect(buffer, volume, offset);
    }

    function playBufferDirect(buffer, volume, offset = 0) {
        try {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            source.start(0, offset);
        } catch (e) {
            console.error('playBufferDirect failed:', e);
        }
    }

    // Use Web Audio API if loaded, fallback to HTML5 fallback otherwise
    function playClickSound() {
        if (!isSoundEnabled) return;
        if (audioCtx && clickBuffer) {
            playBuffer(clickBuffer, 1.19);  // +3.5 dB total
        } else {
            // HTML5 Fallback (preloaded and unlocked)
            if (clickAudioFallback) {
                clickAudioFallback.currentTime = 0;
                clickAudioFallback.play().catch(e => console.log('Fallback click play failed:', e));
            }
        }
    }

    function playExitSound() {
        if (!isSoundEnabled) return;
        if (audioCtx && exitBuffer) {
            playBuffer(exitBuffer, 1.19);   // +3.5 dB total
        } else {
            // HTML5 Fallback (preloaded and unlocked)
            if (exitAudioFallback) {
                exitAudioFallback.currentTime = 0;
                exitAudioFallback.play().catch(e => console.log('Fallback exit play failed:', e));
            }
        }
    }

    // XZ Companion Playback Functions
    function playXzClickSound() {
        if (!isSoundEnabled) return;
        if (audioCtx && xzClickBuffer) {
            playBuffer(xzClickBuffer, 1.07);  // +5.0 dB total
        } else {
            if (xzClickAudioFallback) {
                xzClickAudioFallback.currentTime = 0;
                xzClickAudioFallback.play().catch(e => console.log('Fallback xz_click play failed:', e));
            }
        }
    }

    function playXzDragSound() {
        if (!isSoundEnabled) return;
        stopXzDragSound(); // Stop any currently playing drag sound first

        if (xzDragFadeInterval) {
            clearInterval(xzDragFadeInterval);
            xzDragFadeInterval = null;
        }

        if (audioCtx && xzDragBuffer) {
            try {
                const source = audioCtx.createBufferSource();
                source.buffer = xzDragBuffer;
                source.loop = true; // Loop the drag sound continuously while dragging
                
                const gainNode = audioCtx.createGain();
                const currentTime = audioCtx.currentTime;
                
                // Start volume at 0 for smooth fade-in
                gainNode.gain.setValueAtTime(0, currentTime);
                // Linear ramp to full volume over 1.0 seconds (+5.0 dB total: 0.85 → 1.51)
                gainNode.gain.linearRampToValueAtTime(1.51, currentTime + 1.0);
                
                source.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                source.start(0);
                xzDragSourceNode = source;
                xzDragGainNode = gainNode;
            } catch (e) {
                console.error('playXzDragSound Web Audio failed:', e);
            }
        } else {
            if (xzDragAudioFallback) {
                xzDragAudioFallback.loop = true; // Loop the fallback element while dragging
                xzDragAudioFallback.volume = 0;
                xzDragAudioFallback.currentTime = 0;
                xzDragAudioFallback.play().then(() => {
                    // Fade in fallback over 1.0 seconds (1000ms) using 50ms intervals
                    const totalInSteps = 20; // 1000ms / 50ms
                    const increment = 1.0 / totalInSteps; // HTML5 max 1.0 (+3.5 dB)
                    xzDragFadeInterval = setInterval(() => {
                        if (xzDragAudioFallback.volume < 1.0) {
                            xzDragAudioFallback.volume = Math.min(1.0, xzDragAudioFallback.volume + increment);
                        } else {
                            xzDragAudioFallback.volume = 1.0;
                            clearInterval(xzDragFadeInterval);
                            xzDragFadeInterval = null;
                        }
                    }, 50);
                }).catch(e => console.log('Fallback xz_drag play failed:', e));
            }
        }
    }

    function stopXzDragSound() {
        const fadeOutDuration = 1.0; // 1 second linear fade-out

        if (xzDragFadeInterval) {
            clearInterval(xzDragFadeInterval);
            xzDragFadeInterval = null;
        }

        if (xzDragSourceNode && xzDragGainNode && audioCtx) {
            try {
                const currentTime = audioCtx.currentTime;
                // Cancel any pending ramps (like the fade-in)
                xzDragGainNode.gain.cancelScheduledValues(currentTime);
                // Determine starting gain: use current instantaneous value (clamped to max 0.85)
                let startGain = xzDragGainNode.gain.value;
                if (startGain > 1.51) startGain = 1.51;  // clamp to new drag max
                if (startGain < 0) startGain = 0;
                // Start linear fade-out to 0 over 1 second
                xzDragGainNode.gain.setValueAtTime(startGain, currentTime);
                xzDragGainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);
                
                const sourceToStop = xzDragSourceNode;
                setTimeout(() => {
                    try {
                        sourceToStop.stop(0);
                    } catch (e) {
                        // Already stopped
                    }
                }, fadeOutDuration * 1000);
            } catch (e) {
                console.error('stopXzDragSound Web Audio fade-out failed:', e);
            }
            xzDragSourceNode = null;
            xzDragGainNode = null;
        }

        if (xzDragAudioFallback) {
            try {
                // Disable loop so it stops after fading
                xzDragAudioFallback.loop = false;
                // Get current fallback volume as fade-out starting point
                const startVol = xzDragAudioFallback.volume;
                // Fade out HTML5 Audio fallback using interval decrements over 1.0 seconds
                const totalSteps = 20; // 1000ms / 50ms
                const decrement = startVol / totalSteps;
                xzDragFadeInterval = setInterval(() => {
                    if (xzDragAudioFallback.volume > decrement) {
                        xzDragAudioFallback.volume -= decrement;
                    } else {
                        xzDragAudioFallback.pause();
                        xzDragAudioFallback.volume = 1.0; // Reset to new max for next play
                        clearInterval(xzDragFadeInterval);
                        xzDragFadeInterval = null;
                    }
                }, 50);
            } catch (e) {
                // Ignore fallback stop issues
            }
        }
    }

    function playXzCloseSound() {
        if (!isSoundEnabled) return;
        if (audioCtx && xzCloseBuffer) {
            playBuffer(xzCloseBuffer, 1.51, false, 0.01);  // +5.0 dB total, skip first 10ms (0.01s)
        } else {
            if (xzCloseAudioFallback) {
                xzCloseAudioFallback.currentTime = 0.01; // Skip first 10ms
                xzCloseAudioFallback.play().catch(e => console.log('Fallback xz_close play failed:', e));
            }
        }
    }

    function playXzOutSound() {
        if (!isSoundEnabled) return;
        if (audioCtx && exitBuffer) {
            playBuffer(exitBuffer, 1.51, false, 0.01);  // +5.0 dB total, skip first 10ms (0.01s)
        } else {
            if (exitAudioFallback) {
                exitAudioFallback.currentTime = 0.01; // Skip first 10ms
                exitAudioFallback.play().catch(e => console.log('Fallback xz_out play failed:', e));
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

        if (xzClickAudioFallback) {
            const origVol = xzClickAudioFallback.volume;
            xzClickAudioFallback.volume = 0;
            xzClickAudioFallback.play().then(() => {
                xzClickAudioFallback.pause();
                xzClickAudioFallback.volume = origVol;
                xzClickAudioFallback.currentTime = 0;
            }).catch(e => console.log('Unlock xzClick fallback failed:', e));
        }

        if (xzDragAudioFallback) {
            const origVol = xzDragAudioFallback.volume;
            xzDragAudioFallback.volume = 0;
            xzDragAudioFallback.play().then(() => {
                xzDragAudioFallback.pause();
                xzDragAudioFallback.volume = origVol;
                xzDragAudioFallback.currentTime = 0;
            }).catch(e => console.log('Unlock xzDrag fallback failed:', e));
        }

        if (xzCloseAudioFallback) {
            const origVol = xzCloseAudioFallback.volume;
            xzCloseAudioFallback.volume = 0;
            xzCloseAudioFallback.play().then(() => {
                xzCloseAudioFallback.pause();
                xzCloseAudioFallback.volume = origVol;
                xzCloseAudioFallback.currentTime = 0;
            }).catch(e => console.log('Unlock xzClose fallback failed:', e));
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
       1. NAVIGATION & MOBILE MENU
       ========================================================================== */
    const header = document.getElementById('header');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll handling optimization
    let scrollScheduled = false;
    let cachedSections = [];
    const sections = document.querySelectorAll('section[id]');

    function updateSectionOffsets() {
        cachedSections = Array.from(sections).map(section => ({
            id: section.getAttribute('id'),
            top: section.offsetTop,
            height: section.offsetHeight
        }));
    }

    // Cache immediately and on load/resize
    updateSectionOffsets();
    window.addEventListener('load', updateSectionOffsets);
    window.addEventListener('resize', updateSectionOffsets);

    window.addEventListener('scroll', () => {
        if (!scrollScheduled) {
            scrollScheduled = true;
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                
                // 1. Header scroll background change
                if (scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }

                // 2. Active link highlight (Scroll spy)
                let currentSectionId = '';
                const scrollPosition = scrollY + 150;

                for (let i = 0; i < cachedSections.length; i++) {
                    const section = cachedSections[i];
                    if (scrollPosition >= section.top && scrollPosition < section.top + section.height) {
                        currentSectionId = section.id;
                        break;
                    }
                }

                navLinks.forEach(link => {
                    const isHrefMatch = link.getAttribute('href') === `#${currentSectionId}`;
                    if (isHrefMatch) {
                        if (!link.classList.contains('active')) {
                            link.classList.add('active');
                        }
                    } else {
                        if (link.classList.contains('active')) {
                            link.classList.remove('active');
                        }
                    }
                });

                scrollScheduled = false;
            });
        }
    }, { passive: true });

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

    // Scroll spy now handled under the optimized passive scroll listener in section 1.

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
        // Event-driven state updates for old releases audio
        oldAudio.addEventListener('play', () => {
            if (shopAudio && !shopAudio.paused) {
                shopAudio.pause();
            }
            setOldPlayState(true);
        });

        oldAudio.addEventListener('pause', () => {
            setOldPlayState(false);
        });

        oldPlayBtn.addEventListener('click', () => {
            if (oldAudio.paused) {
                // Optimistic UI update
                setOldPlayState(true);
                
                oldPlayPromise = oldAudio.play();
                if (oldPlayPromise !== undefined) {
                    oldPlayPromise.catch(err => {
                        // Revert UI if play fails
                        setOldPlayState(false);
                        if (err.name === 'AbortError') {
                            console.log("Old audio play interrupted by pause.");
                            return;
                        }
                        console.error("Old audio play failed:", err);
                    });
                }
            } else {
                // Optimistic UI update
                setOldPlayState(false);
                oldAudio.pause();
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

            const onMouseMove = (e) => {
                handleProgressSeek(e.clientX);
            };

            const onMouseUp = () => {
                isSeeking = false;
                oldProgressBg.classList.remove('dragging');
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            oldProgressBg.addEventListener('mousedown', (e) => {
                isSeeking = true;
                oldProgressBg.classList.add('dragging');
                handleProgressSeek(e.clientX);
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });

            // Touch support
            const onTouchMove = (e) => {
                if (e.touches && e.touches[0]) {
                    handleProgressSeek(e.touches[0].clientX);
                }
            };

            const onTouchEnd = () => {
                isSeeking = false;
                oldProgressBg.classList.remove('dragging');
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('touchend', onTouchEnd);
            };

            oldProgressBg.addEventListener('touchstart', (e) => {
                isSeeking = true;
                oldProgressBg.classList.add('dragging');
                if (e.touches && e.touches[0]) {
                    handleProgressSeek(e.touches[0].clientX);
                }
                window.addEventListener('touchmove', onTouchMove, { passive: true });
                window.addEventListener('touchend', onTouchEnd);
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
        // Event-driven state updates for shop audio
        shopAudio.addEventListener('play', () => {
            // Stop old releases audio
            if (oldAudio && !oldAudio.paused) {
                oldAudio.pause();
                setOldPlayState(false);
            }
            // Find active row and show pause icon
            if (activeShopRow) {
                const playIcon = activeShopRow.querySelector('.shop-play-icon');
                const pauseIcon = activeShopRow.querySelector('.shop-pause-icon');
                if (playIcon && pauseIcon) {
                    playIcon.classList.add('hidden');
                    pauseIcon.classList.remove('hidden');
                }
            }
        });

        shopAudio.addEventListener('pause', () => {
            resetShopIcons();
        });

        shopTrackRows.forEach(row => {
            row.addEventListener('click', () => {
                const isCurrentlyActive = row.classList.contains('active');

                if (isCurrentlyActive) {
                    const playIcon = row.querySelector('.shop-play-icon');
                    const isPlayIconVisible = playIcon && !playIcon.classList.contains('hidden');

                    if (isPlayIconVisible) {
                        shopPlayPromise = shopAudio.play();
                        if (shopPlayPromise !== undefined) {
                            shopPlayPromise.catch(err => {
                                if (err.name === 'AbortError') return;
                                console.error("Shop audio play failed:", err);
                            });
                        }
                    } else {
                        shopAudio.pause();
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
                        shopPlayPromise.catch(err => {
                            if (err.name === 'AbortError') return;
                            console.error("Shop audio play transition failed:", err);
                        });
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
    let freeShipping = false;

    const validPromoCodes = {
        'ANFANG': 0.20,      // 20% discount
        'XZENTREXUS': 0.10,  // 10% discount
        'PROMO15': 0.15      // 15% discount
    };

    // Special promo codes (non-percentage)
    const specialPromoCodes = {
        'VERSAND100': 'free_shipping'   // removes shipping costs entirely
    };

    function updateCheckoutTotal() {
        if (!checkoutSummaryTotalVal) return;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const shippingBase = subtotal > 0 ? 1.99 : 0.00;
        const shipping = freeShipping ? 0.00 : shippingBase;
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

        if (freeShipping) {
            summaryHtml += `
                <li class="checkout-shipping-summary" style="color: #00d4d4; font-weight: 600;">
                    <span>Versandkosten (gepolstert)</span>
                    <span><s style="color: #888; font-weight: 400;">${shippingBase.toFixed(2)} €</s> 0,00 € ✓</span>
                </li>
            `;
        } else {
            summaryHtml += `
                <li class="checkout-shipping-summary">
                    <span>Versandkosten (gepolstert)</span>
                    <span>${shippingBase.toFixed(2)} €</span>
                </li>
            `;
        }

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
            freeShipping = false;
            
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

            if (specialPromoCodes.hasOwnProperty(enteredCode)) {
                const action = specialPromoCodes[enteredCode];
                if (action === 'free_shipping') {
                    freeShipping = true;
                    appliedDiscountCode = appliedDiscountCode ? appliedDiscountCode + ' + ' + enteredCode : enteredCode;
                    discountFeedback.textContent = `Code '${enteredCode}' eingelöst – Versandkosten entfallen!`;
                    discountFeedback.className = 'discount-feedback success';
                    updateCheckoutTotal();
                }
            } else if (validPromoCodes.hasOwnProperty(enteredCode)) {
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
                        freeShipping = false;
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
            const shippingBase = subtotal > 0 ? 1.99 : 0.00;
            const shipping = freeShipping ? 0.00 : shippingBase;
            const discountAmount = subtotal * appliedDiscountPercent;
            const total = Math.max(0, subtotal - discountAmount) + shipping;

            const orderItemsText = cart.map(item =>
                `${item.qty}x ${item.name} — ${(item.price * item.qty).toFixed(2)} €`
            ).join('\n') +
                (appliedDiscountPercent > 0 ? `\nRabatt (${appliedDiscountCode}): -${discountAmount.toFixed(2)} €` : '') +
                (freeShipping ? `\nVersand: 0,00 € (Code: VERSAND100 – kostenloser Versand)` : `\nVersand: ${shippingBase.toFixed(2)} €`);

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


                cart = [];
                updateCart();
                
                setTimeout(() => {
                    checkoutModal.classList.remove('open');
                    submitBtn.textContent = origText;
                    submitBtn.disabled = false;
                    checkoutForm.reset();
                    appliedDiscountPercent = 0;
                    appliedDiscountCode = "";
                    freeShipping = false;
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
        // Exclude XZ companion and its menu completely from global click sounds
        if (e.target.closest('#xz-companion-root') || e.target.closest('.xz-companion-menu')) {
            return;
        }

        // Exclude the entire "Frühere Veröffentlichungen" container/section completely (including any future elements inside it)
        if (e.target.closest('#music') || e.target.closest('.music-section')) {
            return;
        }

        // Check if it's an exit/close interaction first
        const isExitElement = e.target.closest('#brand-logo, .modal-close, .close-cart-btn, .modal-overlay, .cart-panel-overlay');
        if (isExitElement) {
            playExitSound();
            return;
        }

        // Otherwise check if it's a standard interactive element
        const interactive = e.target.closest('a, button, [role="button"], input, textarea, select, label, .dot, .lightbox-dot, .cd-mockup, .portfolio-item, .track-item, .play-btn, .timeline-container, .skip-btn');
        if (interactive) {
            playClickSound();
        }
    });

    // ==========================================================================
    // 16. INTERACTIVE COMPANION "XZ"
    // ==========================================================================
    (function initXZCompanion() {
        const root = document.getElementById('xz-companion-root');
        const body = document.getElementById('xz-companion-body');
        const menu = document.getElementById('xz-companion-menu');
        const menuClose = document.getElementById('xz-menu-close');
        const dialogText = document.getElementById('xz-dialog-text');
        const optionsList = document.getElementById('xz-options-list');
        const backBtn = document.getElementById('xz-back-btn');
        const droneSvg = body ? body.querySelector('.xz-drone-svg') : null;

        const assetBrain = body ? body.querySelector('.xz-asset-brain') : null;
        const assetCar = body ? body.querySelector('.xz-asset-car') : null;
        const eyesGroup = body ? body.querySelector('.xz-eyes-group') : null;

        const eyesNormal = body ? body.querySelector('.xz-eyes-normal') : null;
        const eyesAngry = body ? body.querySelector('.xz-eyes-angry') : null;
        const handsLeft = body ? body.querySelector('.xz-hand-left') : null;
        const handsRight = body ? body.querySelector('.xz-hand-right') : null;

        if (!root || !body || !menu) return;

        // Position & Movement variables (relative to fixed viewport)
        let x = document.documentElement.clientWidth - 80;
        let y = document.documentElement.clientHeight - 150;
        let vx = 0;
        let vy = 0;
        let targetX = x;
        let targetY = y;
        let rotation = 0;

        // Drag and Drop state
        let isDragging = false;
        let hasDragged = false;
        let dragOffsetRotation = 0;

        // Mouse/Touch viewport coordinates tracking
        let mouseX = document.documentElement.clientWidth / 2;
        let mouseY = document.documentElement.clientHeight / 2;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Settings
        const SPEED_LIMIT = 1.4;
        const STEERING_FORCE = 0.025;
        const AVOID_FORCE = 0.75;
        const AVOID_RADIUS = 95;

        let isMenuOpen = false;
        let isAnimating = false;
        let currentAnimation = 'IDLE'; // IDLE, BRAIN_RIDE, CAR_RIDE, SINGING
        let animationTimer = null;
        let customAnimEndTimer = null;
        let isFreeFlightActive = true;
        let isXZAtDock = false;
        let isDockingInProgress = false; // XZ is flying toward dock, not yet arrived

        // Mobile touch control variables
        let mobileTouchTimeout = null;
        let mobileTouchStartPoint = null;
        let mobileDragUnlocked = false;
        let isAlignmentMode = false;
        let tapCount = 0;
        let lastTapTime = 0;
        let tapTimeout = null;

        // Cabrio Spot-Drive Bumping Physics
        let carBumpY = 0;
        let carBumpVy = 0;
        let riderBounceY = 5;

        // Bounding boxes cache of elements to avoid (in document-absolute coordinates)
        let avoidRects = [];

        function updateAvoidRects() {
            avoidRects = [];
            const selectors = [
                'header',
                '.btn',
                'button:not(.xz-menu-close-btn):not(.xz-option-btn):not(.xz-back-btn)',
                'input',
                'textarea',
                'select',
                '.add-to-cart-btn',
                '.qty-btn',
                '.cart-btn',
                '.mobile-menu-btn',
                '.social-icon',
                '.track-player',
                '.play-btn',
                '.modal-content',
                '.cart-panel.open'
            ];

            selectors.forEach(sel => {
                const elms = document.querySelectorAll(sel);
                elms.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        const left = rect.left;
                        const right = rect.right;
                        const top = rect.top;
                        const bottom = rect.bottom;
                        avoidRects.push({
                            left: left,
                            right: right,
                            top: top,
                            bottom: bottom,
                            cx: left + rect.width / 2,
                            cy: top + rect.height / 2
                        });
                    }
                });
            });
        }

        setInterval(updateAvoidRects, 1000);
        window.addEventListener('resize', updateAvoidRects);
        window.addEventListener('scroll', updateAvoidRects);

        const sectors = [
            { name: 'top-left', minX: 60, maxX: 0.35, minY: 100, maxY: 0.35 },
            { name: 'top-right', minX: 0.65, maxX: 0.9, minY: 100, maxY: 0.35 },
            { name: 'bottom-left', minX: 60, maxX: 0.35, minY: 0.65, maxY: 0.82 },
            { name: 'bottom-right', minX: 0.65, maxX: 0.9, minY: 0.65, maxY: 0.82 },
            { name: 'center', minX: 0.35, maxX: 0.65, minY: 0.35, maxY: 0.65 }
        ];
        let currentSectorIndex = 4;
        let isWaitingForNextTarget = false;

        function getSectorBounds(sector) {
            const w = document.documentElement.clientWidth;
            const h = document.documentElement.clientHeight;
            const xMin = sector.minX < 1 ? sector.minX * w : sector.minX;
            const xMax = sector.maxX < 1 ? sector.maxX * w : sector.maxX;
            const yMin = sector.minY < 1 ? sector.minY * h : sector.minY;
            const yMax = sector.maxY < 1 ? sector.maxY * h : sector.maxY;
            return { xMin, xMax, yMin, yMax };
        }

        function pickNewTarget() {
            if (!isFreeFlightActive || isMenuOpen || currentAnimation === 'CAR_RIDE' || isDragging) return;

            let attempts = 0;
            let foundSafeTarget = false;

            let nextSectorIndex;
            do {
                nextSectorIndex = Math.floor(Math.random() * sectors.length);
            } while (nextSectorIndex === currentSectorIndex && sectors.length > 1);
            currentSectorIndex = nextSectorIndex;
            
            const sector = sectors[currentSectorIndex];
            const bounds = getSectorBounds(sector);

            while (attempts < 20 && !foundSafeTarget) {
                const tx = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
                const ty = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

                let isSafe = true;
                for (let rect of avoidRects) {
                    if (tx > rect.left - 50 && tx < rect.right + 50 &&
                        ty > rect.top - 50 && ty < rect.bottom + 50) {
                        isSafe = false;
                        break;
                    }
                }

                if (isSafe) {
                    targetX = tx;
                    targetY = ty;
                    foundSafeTarget = true;
                }
                attempts++;
            }

            if (!foundSafeTarget) {
                targetX = document.documentElement.clientWidth - 80;
                targetY = document.documentElement.clientHeight - 150;
            }
        }

        // Strict 15 Seconds Wander Interval Timer (non-active during ride animations/drag)
        setInterval(() => {
            if (!isDragging && !isMenuOpen && currentAnimation === 'IDLE' && !isWaitingForNextTarget) {
                pickNewTarget();
            }
        }, 15000);

        // Drag and Drop Event Listeners (PC & Mobile Touch)
        function startDrag(clientX, clientY) {
            isDragging = true;
            hasDragged = false;
            body.classList.add('state-dragging');
            closeMenu(true); // close silently so close sound doesn't conflict
            isDockingInProgress = false; // Cancel docking if dragged manually

            if (eyesNormal) eyesNormal.style.display = 'none';
            if (eyesAngry) eyesAngry.style.display = 'block';
            if (handsLeft) handsLeft.style.display = 'block';
            if (handsRight) handsRight.style.display = 'block';
        }

        function handleDragMove(clientX, clientY) {
            if (!isDragging) return;

            // Only trigger the drag sound once when they actually start moving XZ
            if (!hasDragged) {
                playXzDragSound();
            }

            mouseX = clientX;
            mouseY = clientY;
            hasDragged = true;
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            body.classList.remove('state-dragging');
            stopXzDragSound(); // Stop the drag sound immediately on release

            if (!isAlignmentMode) {
                if (eyesNormal) eyesNormal.style.display = 'block';
                if (eyesAngry) eyesAngry.style.display = 'none';
            }
            if (handsLeft) handsLeft.style.display = 'none';
            if (handsRight) handsRight.style.display = 'none';

            isXZAtDock = false; // XZ has been manually dragged, so he is no longer at the dock

            // pick target coordinates near release point to settle down
            const minX = 50;
            const maxX = document.documentElement.clientWidth - 50;
            const minY = 100;
            const maxY = document.documentElement.clientHeight - 100;
            targetX = Math.max(minX, Math.min(maxX, x));
            targetY = Math.max(minY, Math.min(maxY, y));
        }

        body.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Left mouse click only
            e.stopPropagation();
            startDrag(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                handleDragMove(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) endDrag();
        });

        // Touch support (Mobile & Tablet: double-tap to enter alignment mode, tap outside to exit)
        body.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.touches && e.touches.length === 1) {
                const touch = e.touches[0];
                mobileTouchStartPoint = { x: touch.clientX, y: touch.clientY };

                if (isAlignmentMode) {
                    // Start dragging immediately if in alignment mode
                    startDrag(touch.clientX, touch.clientY);
                    return;
                }

                const now = Date.now();
                if (now - lastTapTime < 350) {
                    tapCount++;
                } else {
                    tapCount = 1;
                }
                lastTapTime = now;

                if (tapTimeout) clearTimeout(tapTimeout);

                if (tapCount === 2) {
                    tapCount = 0;
                    isAlignmentMode = true;
                    body.classList.add('xz-alignment-mode');
                    closeMenu(true); // silent close
                    if (eyesNormal) eyesNormal.style.display = 'none';
                    if (eyesAngry) eyesAngry.style.display = 'block';
                    startDrag(touch.clientX, touch.clientY);
                } else {
                    tapTimeout = setTimeout(() => {
                        if (!isAlignmentMode) {
                            if (isMenuOpen) {
                                closeMenu();
                            } else {
                                openMenu();
                            }
                        }
                        tapCount = 0;
                    }, 350);
                }
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const touch = e.touches[0];

                if (!isAlignmentMode && mobileTouchStartPoint) {
                    const dx = touch.clientX - mobileTouchStartPoint.x;
                    const dy = touch.clientY - mobileTouchStartPoint.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 10) {
                        tapCount = 0;
                    }
                }

                if (isDragging) {
                    e.preventDefault(); // Stop mobile page scroll while dragging XZ
                    handleDragMove(touch.clientX, touch.clientY);
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', () => {
            if (isDragging) {
                endDrag();
            }
            mobileTouchStartPoint = null;
        });

        // Steer towards target and avoid obstacles
        function updateMovement() {
            // ── Dock mode: pin absolutely to viewport corner, no physics lag ──────
            // Use document.documentElement.clientWidth to exclude scrollbar width,
            // preventing XZ from drifting behind the scrollbar on Windows.
            if (isXZAtDock && !isDragging) {
                const cw = document.documentElement.clientWidth;
                const ch = document.documentElement.clientHeight;
                x = cw - 55;
                y = ch - 95;
                vx = 0; vy = 0;
                const hoverY = Math.cos(Date.now() / 450) * 1.5;
                body.style.transform = `translate3d(${x}px, ${y + hoverY}px, 0) rotate(0deg)`;
                requestAnimationFrame(updateMovement);
                return;
            }

            // Sichern vor NaN-Fehlern (Bulletproof physics reset)
            if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy) || isNaN(targetX) || isNaN(targetY)) {
                x = document.documentElement.clientWidth - 80;
                y = document.documentElement.clientHeight - 150;
                vx = 0;
                vy = 0;
                targetX = x;
                targetY = y;
            }

            if (isNaN(mouseX) || isNaN(mouseY)) {
                mouseX = document.documentElement.clientWidth / 2;
                mouseY = document.documentElement.clientHeight / 2;
            }

            // Viewport boundaries (fixed coordinates)
            // Use clientWidth and clientHeight to exclude scrollbar widths on desktop
            const cw = document.documentElement.clientWidth;
            const ch = document.documentElement.clientHeight;
            const borderPad = 40;
            const minX = borderPad;
            const maxX = cw - borderPad;
            const minY = borderPad + 40;
            const maxY = ch - borderPad;

            // Flight mode clamping / docking-flight target tracking
            if (!isFreeFlightActive) {
                if (isDockingInProgress) {
                    const dkX = cw - 55;
                    const dkY = ch - 95;
                    targetX = dkX;
                    targetY = dkY;

                    // Arrival detection — snap into dock once close enough (reduced to 5px for smooth glide)
                    const dockDist = Math.hypot(x - dkX, y - dkY);
                    if (dockDist < 5) {
                        isDockingInProgress = false;
                        isXZAtDock = true;
                        const orb = document.getElementById('xz-dock-orb');
                        if (orb) {
                            orb.classList.remove('xz-dock-orb--free', 'xz-dock-orb--docking');
                            orb.classList.add('xz-dock-orb--docked');
                        }
                    }
                } else if (!isXZAtDock) {
                    // Parked at a custom (dragged) position — clamp to viewport
                    if (targetX < minX) targetX = minX;
                    if (targetX > maxX) targetX = maxX;
                    if (targetY < minY) targetY = minY;
                    if (targetY > maxY) targetY = maxY;
                }
                // isXZAtDock case is handled by the early-return above
            }

            // Calculate speed for Motion Blur
            const speed = Math.sqrt(vx * vx + vy * vy);
            const blurVal = Math.min(2.5, speed * 0.6);

            // Realistic Perspective Shadow Calculation
            // Light source sits at center screen
            const screenCx = cw / 2;
            const screenCy = ch / 2;
            const shadowDx = (x - screenCx) * 0.08;
            const shadowDy = (y - screenCy) * 0.08 + 12; // light elevated
            
            // Hover bobbing factor affects shadow blur & opacity
            const bobFactor = Math.sin(Date.now() / 450);
            const shadowBlur = 10 + bobFactor * 2;
            const shadowOpacity = 0.35 - bobFactor * 0.05;

            // Apply filter to body
            body.style.filter = `drop-shadow(${shadowDx}px ${shadowDy}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})) blur(${blurVal}px)`;

            // Gaze tracking processing (runs during special animations)
            if (eyesGroup && !isDragging) {
                if ((currentAnimation === 'BRAIN_RIDE' || currentAnimation === 'CAR_RIDE') && !isMenuOpen) {
                    const dx = mouseX - x;
                    const dy = mouseY - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    let moveX = 0;
                    let moveY = 0;
                    if (dist > 5) {
                        const limit = 3.5;
                        moveX = (dx / dist) * limit;
                        moveY = (dy / dist) * limit;
                    }
                    eyesGroup.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
                } else {
                    eyesGroup.style.transform = 'translate3d(0, 0, 0)';
                }
            }

            // --- DRAGGING STATE MECHANICS ---
            if (isDragging) {
                // Spring-LERP Dragging with slight resistance
                const prevX = x;
                const prevY = y;
                
                const pageMouseX = mouseX;
                const pageMouseY = mouseY;

                x += (pageMouseX - x) * 0.14;
                y += (pageMouseY - y) * 0.14;
                
                // Constrain drag within screen limits
                if (x < minX) x = minX;
                if (x > maxX) x = maxX;
                if (y < minY) y = minY;
                if (y > maxY) y = maxY;

                // Set inertia velocity on throw release
                vx = (x - prevX) * 0.8;
                vy = (y - prevY) * 0.8;

                // Widerwilliges Querstellen: tilt opposite or lag behind movement
                const dragVx = pageMouseX - x;
                const targetRot = Math.max(-35, Math.min(35, dragVx * 0.7));
                rotation += (targetRot - rotation) * 0.15;

                // Animation spot-offsets during drag
                let animYOffset = 0;
                let animXOffset = 0;
                let animRotOffset = 0;

                if (currentAnimation === 'CAR_RIDE') {
                    const suspension = Math.sin(Date.now() / 250) * 1.5;
                    const vibration = Math.sin(Date.now() / 45) * 0.5;
                    animYOffset = suspension + vibration + carBumpY;
                    
                    if (droneSvg) {
                        riderBounceY += ((carBumpY * 0.65 + 5) - riderBounceY) * 0.22;
                        droneSvg.style.transform = `translate3d(0, ${riderBounceY}px, 0)`;
                    }
                } else if (currentAnimation === 'BRAIN_RIDE') {
                    const rideWaveY = Math.sin(Date.now() / 200) * 15;
                    const rideWaveX = Math.cos(Date.now() / 400) * 4;
                    const rideTilt = Math.cos(Date.now() / 200) * 6;
                    animYOffset = rideWaveY;
                    animXOffset = rideWaveX;
                    animRotOffset = rideTilt;

                    if (droneSvg) {
                        const riderY = Math.sin(Date.now() / 100) * 6 - 8;
                        const riderRot = Math.cos(Date.now() / 100) * 5;
                        droneSvg.style.transform = `translate3d(0, ${riderY}px, 0) rotate(${riderRot}deg)`;
                    }

                    if (assetBrain) {
                        const bScaleY = 1 + Math.sin(Date.now() / 100) * 0.05;
                        const bScaleX = 1 - Math.sin(Date.now() / 100) * 0.03;
                        assetBrain.style.transform = `scale(${bScaleX}, ${bScaleY})`;
                    }
                }

                body.style.transform = `translate3d(${x + animXOffset}px, ${y + animYOffset}px, 0) rotate(${rotation + animRotOffset}deg)`;
                
                requestAnimationFrame(updateMovement);
                return;
            }

            if (isMenuOpen) {
                vx *= 0.85;
                vy *= 0.85;
                x += vx;
                y += vy;

                body.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                requestAnimationFrame(updateMovement);
                return;
            }

            // --- ANIMATION TYPE: CAR RIDE (Spot-Drive with Obstacle Bumps) ---
            if (currentAnimation === 'CAR_RIDE') {
                targetX = x;
                targetY = y;

                // Decelerate and settle
                let desiredVx = targetX - x;
                let desiredVy = targetY - y;
                const distToTarget = Math.sqrt(desiredVx * desiredVx + desiredVy * desiredVy);

                if (distToTarget > 0) {
                    desiredVx = (desiredVx / distToTarget) * (SPEED_LIMIT * 1.5);
                    desiredVy = (desiredVy / distToTarget) * (SPEED_LIMIT * 1.5);
                }
                vx += (desiredVx - vx) * 0.05;
                vy += (desiredVy - vy) * 0.05;

                // CAR_RIDE is stationary — no boundary push needed

                x += vx;
                y += vy;

                // Cabrio Engine Vibration + Suspension Bounce
                const suspension = Math.sin(Date.now() / 250) * 1.5;
                const vibration = Math.sin(Date.now() / 45) * 0.5;

                // Random Obstacle Bumping (spring physics)
                if (Math.random() < 0.008 && carBumpY === 0) {
                    carBumpVy = -5.5 - Math.random() * 4; // jolt up
                }

                if (carBumpY !== 0 || carBumpVy !== 0) {
                    carBumpVy += 0.75; // gravity force
                    carBumpY += carBumpVy;
                    if (carBumpY > 0) {
                        carBumpY = 0; // hit baseline
                        carBumpVy = 0;
                    }
                }

                body.style.transform = `translate3d(${x}px, ${y + suspension + vibration + carBumpY}px, 0) rotate(0deg)`;

                // Springy rider reaction inside the cabrio cockpit (XZ bounces with lag)
                if (droneSvg) {
                    riderBounceY += ((carBumpY * 0.65 + 5) - riderBounceY) * 0.22;
                    droneSvg.style.transform = `translate3d(0, ${riderBounceY}px, 0)`;
                }

                requestAnimationFrame(updateMovement);
                return;
            }

            // --- ANIMATION TYPE: BRAIN RIDE (Horse-riding simulation in spot) ---
            if (currentAnimation === 'BRAIN_RIDE') {
                targetX = x;
                targetY = y;

                let desiredVx = targetX - x;
                let desiredVy = targetY - y;
                const distToTarget = Math.sqrt(desiredVx * desiredVx + desiredVy * desiredVy);

                if (distToTarget > 0) {
                    desiredVx = (desiredVx / distToTarget) * (SPEED_LIMIT * 1.5);
                    desiredVy = (desiredVy / distToTarget) * (SPEED_LIMIT * 1.5);
                }

                vx += (desiredVx - vx) * 0.05;
                vy += (desiredVy - vy) * 0.05;

                // BRAIN_RIDE is stationary — no boundary push needed

                x += vx;
                y += vy;

                // Bouncy flight trajectory like a riding horse in spot
                const rideWaveY = Math.sin(Date.now() / 200) * 15;
                const rideWaveX = Math.cos(Date.now() / 400) * 4;
                const rideTilt = Math.cos(Date.now() / 200) * 6; // roll rotation

                body.style.transform = `translate3d(${x + rideWaveX}px, ${y + rideWaveY}px, 0) rotate(${rideTilt}deg)`;

                // Springy rider bouncing relative to the brain
                if (droneSvg) {
                    const riderY = Math.sin(Date.now() / 100) * 6 - 8;
                    const riderRot = Math.cos(Date.now() / 100) * 5;
                    droneSvg.style.transform = `translate3d(0, ${riderY}px, 0) rotate(${riderRot}deg)`;
                }

                // Brain squash and stretch pulsing
                if (assetBrain) {
                    const bScaleY = 1 + Math.sin(Date.now() / 100) * 0.05;
                    const bScaleX = 1 - Math.sin(Date.now() / 100) * 0.03;
                    assetBrain.style.transform = `scale(${bScaleX}, ${bScaleY})`;
                }

                requestAnimationFrame(updateMovement);
                return;
            }

            // --- STANDARD IDLE FLIGHT MODE ---
            let desiredVx = targetX - x;
            let desiredVy = targetY - y;
            const distToTarget = Math.sqrt(desiredVx * desiredVx + desiredVy * desiredVy);

            if (distToTarget > 0) {
                const speed = distToTarget < 120 ? SPEED_LIMIT * (distToTarget / 120) : SPEED_LIMIT;
                desiredVx = (desiredVx / distToTarget) * Math.max(0.18, speed);
                desiredVy = (desiredVy / distToTarget) * Math.max(0.18, speed);
            }

            let steerX = desiredVx - vx;
            let steerY = desiredVy - vy;

            vx += steerX * STEERING_FORCE;
            vy += steerY * STEERING_FORCE;

            for (let rect of avoidRects) {
                const dx = x - rect.cx;
                const dy = y - rect.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < AVOID_RADIUS && dist > 0) {
                    const force = (1 - dist / AVOID_RADIUS) * AVOID_FORCE;
                    vx += (dx / dist) * force;
                    vy += (dy / dist) * force;
                }
            }

            // Bouncing off screen boundaries in free flight
            if (x < minX) {
                x = minX;
                vx = Math.abs(vx) * 0.8 + 0.2; // bounce right
                pickNewTarget();
            } else if (x > maxX) {
                x = maxX;
                vx = -Math.abs(vx) * 0.8 - 0.2; // bounce left
                pickNewTarget();
            }

            if (y < minY) {
                y = minY;
                vy = Math.abs(vy) * 0.8 + 0.2; // bounce down
                pickNewTarget();
            } else if (y > maxY) {
                y = maxY;
                vy = -Math.abs(vy) * 0.8 - 0.2; // bounce up
                pickNewTarget();
            }

            const speedNorm = Math.sqrt(vx * vx + vy * vy);
            if (speedNorm > SPEED_LIMIT) {
                vx = (vx / speedNorm) * SPEED_LIMIT;
                vy = (vy / speedNorm) * SPEED_LIMIT;
            }

            x += vx;
            y += vy;

            const targetRot = vx * 12.5;
            rotation += (targetRot - rotation) * 0.08;

            const hoverX = Math.sin(Date.now() / 600) * 3.5;
            const hoverY = Math.cos(Date.now() / 450) * 2.5;

            body.style.transform = `translate3d(${x + hoverX}px, ${y + hoverY}px, 0) rotate(${rotation}deg)`;

            if (distToTarget < 25 && !isWaitingForNextTarget) {
                isWaitingForNextTarget = true;
                setTimeout(() => {
                    pickNewTarget();
                    isWaitingForNextTarget = false;
                }, 1000 + Math.random() * 1200);
            }

            requestAnimationFrame(updateMovement);
        }

        // Animation System
        function startAnimationTimer() {
            if (animationTimer) clearTimeout(animationTimer);
            animationTimer = setTimeout(() => {
                triggerRandomAnimation();
            }, 15000);
        }

        function triggerRandomAnimation() {
            if (isMenuOpen || isAnimating || isDragging || !isFreeFlightActive) {
                startAnimationTimer();
                return;
            }

            isAnimating = true;
            const animations = ['BRAIN', 'CAR', 'SINGING'];
            const chosen = animations[Math.floor(Math.random() * animations.length)];

            if (chosen === 'BRAIN') {
                runBrainAnimation();
            } else if (chosen === 'CAR') {
                runCarAnimation();
            } else if (chosen === 'SINGING') {
                runSingingAnimation();
            }
        }

        function runBrainAnimation() {
            currentAnimation = 'BRAIN_RIDE';
            if (assetBrain) assetBrain.style.display = 'block';
            
            // Stay in place at current coordinates
            targetX = x;
            targetY = y;
            vx = 0;
            vy = 0;

            customAnimEndTimer = setTimeout(() => {
                if (assetBrain) assetBrain.style.display = 'none';
                if (droneSvg) droneSvg.style.transform = '';
                currentAnimation = 'IDLE';
                isAnimating = false;
                startAnimationTimer();
            }, 10000);
        }

        function runCarAnimation() {
            currentAnimation = 'CAR_RIDE';
            body.classList.add('state-car-ride');
            if (assetCar) assetCar.style.display = 'block';

            // Stay in place at current coordinates
            targetX = x;
            targetY = y;
            vx = 0;
            vy = 0;
            carBumpY = 0;
            carBumpVy = 0;
            riderBounceY = 5;

            customAnimEndTimer = setTimeout(() => {
                body.classList.remove('state-car-ride');
                if (assetCar) assetCar.style.display = 'none';
                if (droneSvg) droneSvg.style.transform = '';
                currentAnimation = 'IDLE';
                isAnimating = false;
                startAnimationTimer();
            }, 10000);
        }

        let singingNoteInterval = null;

        function runSingingAnimation() {
            currentAnimation = 'SINGING';
            const notes = ['🎵', '🎶', '♩', '♪', '♫', '♬'];
            let noteCount = 0;

            singingNoteInterval = setInterval(() => {
                if (noteCount > 15 || currentAnimation !== 'SINGING' || isDragging) {
                    clearInterval(singingNoteInterval);
                    return;
                }

                const note = document.createElement('div');
                note.className = 'xz-music-note';
                note.textContent = notes[Math.floor(Math.random() * notes.length)];
                
                // Position relative to XZ body (since notes are appended to body)
                note.style.left = `14px`;
                note.style.top = `10px`;

                const xDrift = (Math.random() - 0.5) * 60;
                const rotDrift = (Math.random() - 0.5) * 50;
                note.style.setProperty('--x-drift', `${xDrift}px`);
                note.style.setProperty('--rot-drift', `${rotDrift}deg`);

                body.appendChild(note);
                setTimeout(() => note.remove(), 2000);
                noteCount++;
            }, 600);

            if (droneSvg) droneSvg.style.animation = 'xzDroneHover 0.4s ease-in-out infinite alternate';

            customAnimEndTimer = setTimeout(() => {
                clearInterval(singingNoteInterval);
                if (droneSvg) {
                    droneSvg.style.animation = '';
                    droneSvg.style.transform = '';
                }
                currentAnimation = 'IDLE';
                isAnimating = false;
                startAnimationTimer();
            }, 10000);
        }

        // Menu & Dialog Logic
        const dialogData = {
            greet: "Hey! Ich bin XZ. Hast du eine Frage an mich?",
            1: "Ich bin XZ – dein kleiner Begleiter auf der Website von xzentrexus.",
            2: "xzentrexus heißt mit bürgerlichem Namen Leandro. In den vergangenen Monaten und Jahren hat er sich auf Plattformen wie TikTok und YouTube eine Community aufgebaut. Sein aktueller Schwerpunkt liegt auf der Musik. Sein neuestes Album trägt den Titel 'Anfang'.",
            3: "Jeglicher Support auf den verlinkten Social-Media-Kanälen – egal ob Like, Kommentar oder Follow – bedeutet uns unglaublich viel. Auch mit dem Kauf unserer Produkte unterstützt du xzentrexus's Projekte direkt. Vielen Dank für deine Unterstützung! ❤️"
        };

        let typewriterTimeout = null;

        function typeText(text, callback) {
            if (typewriterTimeout) clearTimeout(typewriterTimeout);
            dialogText.textContent = '';
            let index = 0;

            function nextChar() {
                if (index < text.length) {
                    dialogText.textContent += text.charAt(index);
                    index++;
                    typewriterTimeout = setTimeout(nextChar, 20);
                } else if (callback) {
                    callback();
                }
            }
            nextChar();
        }

        function positionMenu() {
            const menuWidth = 290;
            const menuHeight = 240;
            
            const cw = document.documentElement.clientWidth;
            const ch = document.documentElement.clientHeight;

            let menuLeft = 0;
            let menuTop = 0;

            if (cw >= 600) {
                // DESKTOP / TABLET: Place next to XZ horizontally (left or right)
                // Centered vertically relative to XZ
                menuTop = y - menuHeight / 2;

                // Choose side with more horizontal space
                if (x > cw / 2) {
                    // Place to the Left of XZ
                    menuLeft = x - 26 - menuWidth - 15;
                } else {
                    // Place to the Right of XZ
                    menuLeft = x + 26 + 15;
                }
            } else {
                // MOBILE: Center horizontally in the viewport
                menuLeft = (cw - menuWidth) / 2;

                // Position vertically above or below XZ based on XZ's position
                if (y > ch / 2) {
                    // XZ is in bottom half -> place menu above XZ
                    menuTop = y - 26 - menuHeight - 15;
                } else {
                    // XZ is in top half -> place menu below XZ
                    menuTop = y + 26 + 15;
                }
            }

            // --- Robust Viewport Clamping (Safe boundary guards) ---
            const minX = 15;
            const maxX = cw - menuWidth - 15;
            const minY = 70; // avoid header
            const maxY = ch - menuHeight - 15;

            if (menuLeft < minX) menuLeft = minX;
            if (menuLeft > maxX) menuLeft = maxX;
            if (menuTop < minY) menuTop = minY;
            if (menuTop > maxY) menuTop = maxY;

            menu.style.left = `${menuLeft}px`;
            menu.style.top = `${menuTop}px`;
        }

        function openMenu() {
            isMenuOpen = true;
            body.classList.add('state-listening');
            menu.style.display = 'block';
            positionMenu();
            setTimeout(() => menu.classList.add('open'), 10);
            
            typeText(dialogData.greet);
            optionsList.style.display = 'flex';
            backBtn.style.display = 'none';
            playXzClickSound();
        }

        function closeMenu(silent = false, useCloseSound = false) {
            if (!silent) {
                if (useCloseSound) {
                    playXzCloseSound(); // plays xz_close.wav
                } else {
                    playXzOutSound(); // plays exit.wav
                }
            }
            isMenuOpen = false;
            body.classList.remove('state-listening');
            menu.classList.remove('open');
            if (typewriterTimeout) clearTimeout(typewriterTimeout);
            setTimeout(() => {
                menu.style.display = 'none';
            }, 250);
        }

        body.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Prevent toggling menu if dragging occurred
            if (isDragging || hasDragged) {
                hasDragged = false;
                return;
            }

            if (isMenuOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        menuClose.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            closeMenu(false, true);
        });
        menuClose.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            closeMenu(false, true);
        }, { passive: false });
        menuClose.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        // Draggable companion menu window logic
        let menuIsDragging = false;
        let menuStartX = 0;
        let menuStartY = 0;
        let menuStartLeft = 0;
        let menuStartTop = 0;

        const menuHeader = menu.querySelector('.xz-menu-header');
        if (menuHeader) {
            menuHeader.style.cursor = 'move';
            
            menuHeader.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Left mouse button only
                e.stopPropagation();
                e.preventDefault();
                
                menuIsDragging = true;
                menuStartX = e.clientX;
                menuStartY = e.clientY;
                menuStartLeft = parseFloat(menu.style.left) || 0;
                menuStartTop = parseFloat(menu.style.top) || 0;
            });

            window.addEventListener('mousemove', (e) => {
                if (!menuIsDragging) return;
                e.stopPropagation();
                e.preventDefault();
                
                const dx = e.clientX - menuStartX;
                const dy = e.clientY - menuStartY;
                
                let newLeft = menuStartLeft + dx;
                let newTop = menuStartTop + dy;
                
                // Clamp menu within viewport limits so user doesn't drag it offscreen
                const minL = 10;
                const maxL = document.documentElement.clientWidth - 300;
                const minT = 70;
                const maxT = document.documentElement.clientHeight - 250;
                
                if (newLeft < minL) newLeft = minL;
                if (newLeft > maxL) newLeft = maxL;
                if (newTop < minT) newTop = minT;
                if (newTop > maxT) newTop = maxT;
                
                menu.style.left = `${newLeft}px`;
                menu.style.top = `${newTop}px`;
            });

            window.addEventListener('mouseup', () => {
                menuIsDragging = false;
            });

            // Touch Support for dragging menu header
            menuHeader.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length > 0) {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    menuIsDragging = true;
                    menuStartX = touch.clientX;
                    menuStartY = touch.clientY;
                    menuStartLeft = parseFloat(menu.style.left) || 0;
                    menuStartTop = parseFloat(menu.style.top) || 0;
                }
            }, { passive: false });

            menuHeader.addEventListener('touchmove', (e) => {
                if (!menuIsDragging) return;
                if (e.touches && e.touches.length > 0) {
                    e.stopPropagation();
                    e.preventDefault();
                    const touch = e.touches[0];
                    const dx = touch.clientX - menuStartX;
                    const dy = touch.clientY - menuStartY;
                    
                    let newLeft = menuStartLeft + dx;
                    let newTop = menuStartTop + dy;
                    
                    const minL = 10;
                    const maxL = document.documentElement.clientWidth - 300;
                    const minT = 70;
                    const maxT = document.documentElement.clientHeight - 250;
                    
                    if (newLeft < minL) newLeft = minL;
                    if (newLeft > maxL) newLeft = maxL;
                    if (newTop < minT) newTop = minT;
                    if (newTop > maxT) newTop = maxT;
                    
                    menu.style.left = `${newLeft}px`;
                    menu.style.top = `${newTop}px`;
                }
            }, { passive: false });

            menuHeader.addEventListener('touchend', () => {
                menuIsDragging = false;
            });
        }

        // Robust click-away listener inside the capture phase to bypass propagation blocks
        document.addEventListener('mousedown', (e) => {
            const dockOrbEl = document.getElementById('xz-dock-orb');
            const clickedOrb = dockOrbEl && dockOrbEl.contains(e.target);
            if (isMenuOpen && !menu.contains(e.target) && !body.contains(e.target) && !clickedOrb) {
                closeMenu();
            }
            // Deactivate Alignment Mode if clicked outside XZ body
            if (isAlignmentMode && !body.contains(e.target)) {
                isAlignmentMode = false;
                body.classList.remove('xz-alignment-mode');
                if (eyesNormal) eyesNormal.style.display = 'block';
                if (eyesAngry) eyesAngry.style.display = 'none';
            }
        }, { capture: true });

        document.addEventListener('touchstart', (e) => {
            const dockOrbEl = document.getElementById('xz-dock-orb');
            const clickedOrb = dockOrbEl && dockOrbEl.contains(e.target);
            if (isMenuOpen && !menu.contains(e.target) && !body.contains(e.target) && !clickedOrb) {
                closeMenu();
            }
            // Deactivate Alignment Mode if tapped outside XZ body
            if (isAlignmentMode && !body.contains(e.target)) {
                isAlignmentMode = false;
                body.classList.remove('xz-alignment-mode');
                if (eyesNormal) eyesNormal.style.display = 'block';
                if (eyesAngry) eyesAngry.style.display = 'none';
            }
        }, { capture: true, passive: true });

        // ── XZ Dock Orb click handler ─────────────────────────────────────────────
        const dockOrb = document.getElementById('xz-dock-orb');

        if (dockOrb) {
            const handleDockClick = (e) => {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }

                if (isFreeFlightActive) {
                    // ── Start docking: XZ flies physically to the orb ────────────
                    isFreeFlightActive    = false;
                    isDockingInProgress   = true;
                    isXZAtDock            = false;

                    // Orb turns red immediately to signal docking intent
                    dockOrb.classList.remove('xz-dock-orb--free');
                    dockOrb.classList.add('xz-dock-orb--docked');

                    // targetX/Y will be updated every frame in updateMovement()

                } else if (isDockingInProgress) {
                    // ── Cancel in-progress docking: return to free flight ────────
                    isDockingInProgress = false;
                    isFreeFlightActive  = true;

                    dockOrb.classList.remove('xz-dock-orb--docked');
                    dockOrb.classList.add('xz-dock-orb--free');

                    pickNewTarget();

                } else if (isXZAtDock) {
                    // ── Undock: release XZ back into free flight ─────────────────
                    isXZAtDock         = false;
                    isFreeFlightActive = true;

                    dockOrb.classList.remove('xz-dock-orb--docked');
                    dockOrb.classList.add('xz-dock-orb--free');

                    // Small natural launch push away from the corner
                    vx = -1.2 - Math.random() * 0.8;
                    vy = -(0.8 + Math.random() * 0.8);

                    pickNewTarget();
                }
            };

            dockOrb.addEventListener('click', handleDockClick);
            dockOrb.addEventListener('touchstart', handleDockClick, { passive: false });
        }

        // ── Sound Orb click handler ───────────────────────────────────────────────
        const soundOrb = document.getElementById('xz-sound-orb');

        if (soundOrb) {
            const handleSoundClick = (e) => {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }

                isSoundEnabled = !isSoundEnabled;

                if (!isSoundEnabled) {
                    // Muting: immediately fade out any active drag sound
                    stopXzDragSound();
                    soundOrb.classList.remove('xz-sound-orb--on');
                    soundOrb.classList.add('xz-sound-orb--off');
                } else {
                    soundOrb.classList.remove('xz-sound-orb--off');
                    soundOrb.classList.add('xz-sound-orb--on');
                }
            };

            soundOrb.addEventListener('click', handleSoundClick);
            soundOrb.addEventListener('touchstart', handleSoundClick, { passive: false });
        }

        const optionButtons = optionsList.querySelectorAll('.xz-option-btn');
        optionButtons.forEach(btn => {
            const handleOptionClick = (e) => {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                playClickSound();
                const qId = btn.getAttribute('data-question');
                optionsList.style.display = 'none';
                
                typeText(dialogData[qId], () => {
                    backBtn.style.display = 'block';
                });
            };
            btn.addEventListener('click', handleOptionClick);
            btn.addEventListener('touchstart', handleOptionClick, { passive: false });
        });

        const handleBackClick = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            playClickSound();
            backBtn.style.display = 'none';
            typeText(dialogData.greet, () => {
                optionsList.style.display = 'flex';
            });
        };
        backBtn.addEventListener('click', handleBackClick);
        backBtn.addEventListener('touchstart', handleBackClick, { passive: false });

        // Init procedures
        updateAvoidRects();
        setTimeout(pickNewTarget, 1000);
        requestAnimationFrame(updateMovement);
        startAnimationTimer();
    })();
});
