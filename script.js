/**
 * Domingos de Rayuela - Main JavaScript
 */

(function() {
  'use strict';

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isHomePage = currentPage === 'index.html' || currentPage === '' || currentPage === '/';
  const isNestedPage = window.location.pathname.indexOf('/sumate/') !== -1;

  const INTERNAL_HERO_IMAGES = [
    'jugamos.jpeg',
    'merienda.jpeg',
    'actividades.jpeg',
    'procesos.jpeg',
    'fechas%20importantes.jpeg',
    'WhatsApp%20Image%202026-04-16%20at%2011.30.50%20(1).jpeg',
    'WhatsApp%20Image%202026-04-16%20at%2011.30.52.jpeg',
    'WhatsApp%20Image%202026-04-16%20at%2014.14.58.jpeg',
    'voluntarias1.jpeg',
    'voluntarias3.jpeg'
  ];

  // ===== WhatsApp Float Config =====
  // Para activar el botón flotante, completar `phone` con el número internacional
  // (sin "+" ni espacios, ej: "543814094858"). Si queda vacío, el botón se
  // muestra pero no enlaza a ningún destino real (placeholder seguro).
  const WA_CONFIG = {
    phone: '543814094858',
    message: '¡Hola! Quiero saber más sobre Domingos de Rayuela.'
  };

  // ===== DOM Elements =====
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menuBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.header__nav-link');
  const contactForm = document.getElementById('contactForm');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastClose = document.getElementById('toastClose');

  // Carousel elements (only on home page)
  const carousel = document.getElementById('carousel');
  const carouselTrack = document.getElementById('carouselTrack');
  const carouselSlides = document.querySelectorAll('.carousel__slide');
  const carouselDots = document.querySelectorAll('.carousel__dot');

  // ===== Banners internos con foto aleatoria =====
  (function initInternalHeroBanners() {
    const heroes = document.querySelectorAll('[data-random-hero]');
    if (!heroes.length || !INTERNAL_HERO_IMAGES.length) return;

    const assetPrefix = isNestedPage ? '../assets/images/' : './assets/images/';

    heroes.forEach(function(hero) {
      const randomIndex = Math.floor(Math.random() * INTERNAL_HERO_IMAGES.length);
      const imageUrl = assetPrefix + INTERNAL_HERO_IMAGES[randomIndex];

      hero.style.setProperty('--internal-hero-img', `url('${imageUrl}')`);
    });
  })();

  // ===== Carousel State =====
  let currentSlide = 0;
  let autoplayInterval = null;
  const slideCount = carouselSlides ? carouselSlides.length : 0;
  const autoplayDelay = 5000;

  // ===== Header: hide on scroll down, show on scroll up =====
  let lastScrollY = window.scrollY;
  const scrollThreshold = 120;
  const scrollDeltaMin = 40;

  // El navbar solo se auto-oculta en la home (donde tapa el hero/carrusel).
  // En páginas internas debe permanecer SIEMPRE visible.
  const hasHeroCarousel = !!document.querySelector('.hero .carousel');

  function handleScroll() {
    if (!header) return;

    const currentScrollY = window.scrollY;

    if (!hasHeroCarousel) {
      // Páginas internas: navbar siempre visible, agregar sombra al scrollear.
      header.classList.remove('header--hidden');
      if (currentScrollY > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    } else if (currentScrollY <= scrollThreshold) {
      header.classList.add('header--hidden');
      header.classList.remove('scrolled');
    } else {
      header.classList.remove('header--hidden');
      header.classList.add('scrolled');
    }

    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ===== Mobile Menu =====
  function toggleMenu() {
    if (!menuBtn || !navMenu) return;
    
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
    
    if (!isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function closeMenu() {
    if (!menuBtn || !navMenu) return;
    
    menuBtn.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', toggleMenu);
  }

  if (navLinks) {
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });
  }

  // Close menu on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
      closeMenu();
      if (menuBtn) menuBtn.focus();
    }
  });

  // ===== Smooth Scroll =====
  function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (!element) return;

    if (prefersReducedMotion) {
      element.scrollIntoView();
    } else {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = this.getAttribute('href');
      if (target && target !== '#') {
        e.preventDefault();
        smoothScrollTo(target);
      }
    });
  });

  // ===== Carousel (only on home page) =====
  if (carousel && carouselTrack && slideCount > 0) {
    function goToSlide(index) {
      if (index < 0) index = slideCount - 1;
      if (index >= slideCount) index = 0;
      
      currentSlide = index;
      
      const translateValue = -currentSlide * 100;
      carouselTrack.style.transform = `translateX(${translateValue}%)`;
      
      if (carouselDots) {
        carouselDots.forEach((dot, i) => {
          dot.classList.toggle('carousel__dot--active', i === currentSlide);
          dot.setAttribute('aria-selected', i === currentSlide);
        });
      }

      if (carouselSlides) {
        carouselSlides.forEach((slide, i) => {
          slide.setAttribute('aria-label', `${i + 1} de ${slideCount}`);
        });
      }
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      
      stopAutoplay();
      autoplayInterval = setInterval(nextSlide, autoplayDelay);
    }

    function stopAutoplay() {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    }

    if (carouselDots && carouselDots.length) {
      carouselDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          goToSlide(index);
          startAutoplay();
        });
      });
    }

    // Re-aplica el slide actual al redimensionar / rotar (evita desalineos en móvil)
    let resizeCarouselRaf = null;
    window.addEventListener('resize', function() {
      if (resizeCarouselRaf) cancelAnimationFrame(resizeCarouselRaf);
      resizeCarouselRaf = requestAnimationFrame(function() {
        resizeCarouselRaf = null;
        goToSlide(currentSlide);
      });
    });

    // Solo autoplay: sin pausa por hover ni swipe manual
    startAutoplay();
  }

  // ===== Galería: navegación manual sin quitar animación automática =====
  (function initGaleriaCarouselControls() {
    if (!isHomePage) return;

    const gallery = document.querySelector('.galeria__carousel');
    if (!gallery) return;

    const wrapper = gallery.querySelector('.galeria__wrapper');
    const track = gallery.querySelector('[data-galeria-track]');
    const prevButton = gallery.querySelector('[data-galeria-prev]');
    const nextButton = gallery.querySelector('[data-galeria-next]');

    if (!wrapper || !track || !prevButton || !nextButton) return;

    const manualPauseMs = 3500;
    let resumeTimer = null;

    function getSlides() {
      return Array.from(track.querySelectorAll('.galeria__slide'));
    }

    function setControlsState() {
      const hasEnoughSlides = getSlides().length > 1;
      prevButton.disabled = !hasEnoughSlides;
      nextButton.disabled = !hasEnoughSlides;
      wrapper.tabIndex = hasEnoughSlides ? 0 : -1;
    }

    function getSlideStep() {
      const firstSlide = track.querySelector('.galeria__slide');
      if (!firstSlide) return Math.max(wrapper.clientWidth * 0.75, 1);

      const trackStyles = window.getComputedStyle(track);
      const rawGap = trackStyles.columnGap || trackStyles.gap || '0';
      const gap = Number.parseFloat(rawGap);
      const slideWidth = firstSlide.getBoundingClientRect().width;

      if (!Number.isFinite(slideWidth) || slideWidth <= 0) {
        return Math.max(wrapper.clientWidth * 0.75, 1);
      }

      return slideWidth + (Number.isFinite(gap) ? gap : 0);
    }

    function pauseAutoscrollTemporarily() {
      track.classList.add('galeria__track--manual');

      if (resumeTimer) {
        window.clearTimeout(resumeTimer);
      }

      if (prefersReducedMotion) return;

      resumeTimer = window.setTimeout(function() {
        track.classList.remove('galeria__track--manual');
        resumeTimer = null;
      }, manualPauseMs);
    }

    function normalizeScrollBeforeMove(direction, step) {
      const halfTrackWidth = track.scrollWidth / 2;
      if (!Number.isFinite(halfTrackWidth) || halfTrackWidth <= wrapper.clientWidth) return;

      if (direction > 0 && wrapper.scrollLeft >= halfTrackWidth - step) {
        wrapper.scrollLeft = Math.max(wrapper.scrollLeft - halfTrackWidth, 0);
      }

      if (direction < 0 && wrapper.scrollLeft <= step) {
        wrapper.scrollLeft = wrapper.scrollLeft + halfTrackWidth;
      }
    }

    function moveGallery(direction) {
      const normalizedDirection = direction < 0 ? -1 : 1;
      const slides = getSlides();
      if (slides.length <= 1) return;

      const step = getSlideStep();
      pauseAutoscrollTemporarily();
      normalizeScrollBeforeMove(normalizedDirection, step);

      wrapper.scrollBy({
        left: normalizedDirection * step,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    prevButton.addEventListener('click', function() {
      moveGallery(-1);
    });

    nextButton.addEventListener('click', function() {
      moveGallery(1);
    });

    wrapper.addEventListener('keydown', function(event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveGallery(-1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveGallery(1);
      }
    });

    window.addEventListener('resize', function() {
      setControlsState();
    });

    window.addEventListener('domingos-de-rayuela:gallery-updated', function() {
      setControlsState();
    });

    setControlsState();
  })();

  // ===== Galería: quitar slides con imagen rota (misma src en ambas mitades del carril) =====
  (function initGaleriaBrokenImageGuard() {
    if (!isHomePage) return;
    const track = document.querySelector('.galeria__track');
    if (!track) return;

    function removeSlidesWithSrc(failedSrc) {
      if (!failedSrc) return;
      let removed = false;

      track.querySelectorAll('.galeria__slide').forEach(function(slide) {
        const im = slide.querySelector('img');
        if (im && im.getAttribute('src') === failedSrc) {
          slide.remove();
          removed = true;
        }
      });

      if (removed) {
        window.dispatchEvent(new CustomEvent('domingos-de-rayuela:gallery-updated'));
      }
    }

    track.querySelectorAll('.galeria__slide img').forEach(function(img) {
      const src = img.getAttribute('src');
      if (!src) return;
      if (img.complete && img.naturalWidth === 0) {
        removeSlidesWithSrc(src);
        return;
      }
      img.addEventListener('error', function onGalleryImgError() {
        removeSlidesWithSrc(src);
      }, { once: true });
    });
  })();

  // ===== Form Handling =====
  const STORAGE_KEY = 'domingosDeRayuela_formData';

  function validateField(input) {
    if (!input) return true;
    
    const name = input.name;
    const value = input.value.trim();
    const errorElement = document.getElementById(`${input.id}Error`);
    let isValid = true;
    let errorMessage = '';

    if (input.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'Este campo es obligatorio';
    } else if (name === 'whatsapp' && value && !/^[0-9\s\-+()]+$/.test(value)) {
      isValid = false;
      errorMessage = 'Ingresá un número de teléfono válido';
    } else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      isValid = false;
      errorMessage = 'Ingresá un correo electrónico válido';
    }

    if (isValid) {
      input.classList.remove('error');
      if (errorElement) errorElement.textContent = '';
    } else {
      input.classList.add('error');
      if (errorElement) errorElement.textContent = errorMessage;
    }

    return isValid;
  }

  function validateForm(form) {
    if (!form) return false;
    
    const inputs = form.querySelectorAll('.form__input, .form__select, .form__textarea');
    let isFormValid = true;

    inputs.forEach(input => {
      if (!validateField(input)) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }

  function saveFormData(form) {
    if (!form) return;
    
    const formData = {
      nombre: form.nombre ? form.nombre.value : '',
      whatsapp: form.whatsapp ? form.whatsapp.value : '',
      comoAyudar: form.comoAyudar ? form.comoAyudar.value : '',
      comentario: form.comentario ? form.comentario.value : '',
      timestamp: new Date().toISOString(),
      page: currentPage
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage:', e);
    }
  }

  function loadFormData(form) {
    if (!form) return;
    
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const formData = JSON.parse(savedData);
        if (formData.nombre && form.nombre) form.nombre.value = formData.nombre;
        if (formData.whatsapp && form.whatsapp) form.whatsapp.value = formData.whatsapp;
        // Don't override comoAyudar if it's already preselected on the page
        if (formData.comentario && form.comentario) form.comentario.value = formData.comentario;
      }
    } catch (e) {
      console.warn('No se pudo cargar desde localStorage:', e);
    }
  }

  // Initialize form if exists
  if (contactForm) {
    // Real-time validation
    contactForm.querySelectorAll('.form__input, .form__select, .form__textarea').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (validateForm(contactForm)) {
        saveFormData(contactForm);
        showToast('¡Gracias por querer sumarte! 💚 Te escribimos por WhatsApp para coordinar.');
        contactForm.reset();
      }
    });

    // Load saved form data on page load
    loadFormData(contactForm);
  }

  // ===== Toast =====
  let toastTimeout = null;

  function showToast(message) {
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.classList.add('active');

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
      hideToast();
    }, 5000);
  }

  function hideToast() {
    if (!toast) return;
    
    toast.classList.remove('active');
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
  }

  if (toastClose) {
    toastClose.addEventListener('click', hideToast);
  }

  window.addEventListener('domingos-de-rayuela:toast', function (event) {
    if (event && event.detail && typeof event.detail.message === 'string' && event.detail.message) {
      showToast(event.detail.message);
    }
  });

  // Close toast on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toast && toast.classList.contains('active')) {
      hideToast();
    }
  });

  // ===== Intersection Observer for Animations =====
  if (!prefersReducedMotion) {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatableElements = document.querySelectorAll(
      '.card, .ayuda-card, .content-card, .contact-box, .info-box, .help-box, .form, .nosotros__item, .nosotros__card-item, .quote-section__content'
    );
    
    animatableElements.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ===== Active Navigation Link =====
  function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      // Remove active class from all links
      link.classList.remove('header__nav-link--active');
      
      // Check if this link matches current page/hash
      if (href === currentPath || href === currentHash) {
        link.classList.add('header__nav-link--active');
      }
    });
  }

  setActiveNavLink();

  // Update active link on hash change
  window.addEventListener('hashchange', setActiveNavLink);

  // ===== "Quiero ayudar": toggle "Ver más / Ver menos" en cards colapsables =====
  (function initAyudaCardToggle() {
    const toggles = document.querySelectorAll('.ayuda-card__toggle');
    if (!toggles.length) return;

    toggles.forEach(function(btn) {
      const targetId = btn.getAttribute('aria-controls');
      if (!targetId) return;
      const panel = document.getElementById(targetId);
      if (!panel) return;
      const labelEl = btn.querySelector('.ayuda-card__toggle-label');

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        const next = !isOpen;

        btn.setAttribute('aria-expanded', String(next));
        if (next) {
          panel.removeAttribute('hidden');
          if (labelEl) labelEl.textContent = 'Ver menos';
        } else {
          panel.setAttribute('hidden', '');
          if (labelEl) labelEl.textContent = 'Ver más';
        }
      });
    });
  })();

  // ===== "Nosotros": cards interactivas con giro =====
  (function initNosotrosFlipCards() {
    const cards = document.querySelectorAll('[data-nosotros-card]');
    if (!cards.length) return;

    function setCardState(card, isFlipped) {
      if (!card) return;

      const toggles = card.querySelectorAll('.nosotros__card-toggle');
      card.classList.toggle('is-flipped', isFlipped);

      toggles.forEach(function(toggle) {
        const isBackToggle = toggle.classList.contains('nosotros__card-toggle--back');
        toggle.setAttribute('aria-expanded', String(isFlipped));
        toggle.tabIndex = isBackToggle === isFlipped ? 0 : -1;
      });
    }

    cards.forEach(function(card) {
      const toggles = card.querySelectorAll('.nosotros__card-toggle');
      if (!toggles.length) return;

      toggles.forEach(function(toggle) {
        const targetId = toggle.getAttribute('aria-controls');
        const panel = targetId ? document.getElementById(targetId) : null;
        if (!panel || !card.contains(panel)) return;

        toggle.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();

          const isFlipped = card.classList.contains('is-flipped');
          setCardState(card, !isFlipped);
        });
      });

      setCardState(card, false);
    });

    document.addEventListener('keydown', function(event) {
      if (event.key !== 'Escape') return;

      cards.forEach(function(card) {
        if (card.classList.contains('is-flipped')) {
          setCardState(card, false);
        }
      });
    });
  })();

  // ===== Botón flotante de WhatsApp =====
  // Configura todos los `.wa-float` (puede haber 1 por página) según WA_CONFIG.
  // Si no hay número configurado, el botón queda como placeholder (no rompe).
  (function initWhatsAppFloat() {
    const buttons = document.querySelectorAll('.wa-float');
    if (!buttons.length) return;

    const rawPhone = (WA_CONFIG.phone || '').toString().replace(/\D+/g, '');
    const message = encodeURIComponent(WA_CONFIG.message || '');

    buttons.forEach(function(btn) {
      if (rawPhone) {
        const url = 'https://wa.me/' + rawPhone + (message ? '?text=' + message : '');
        btn.setAttribute('href', url);
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener noreferrer');
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('data-placeholder');
      } else {
        btn.setAttribute('href', '#');
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('data-placeholder', 'true');
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (window && window.console && typeof window.console.info === 'function') {
            window.console.info('[WhatsApp Float] WA_CONFIG.phone vacío. Completar en script.js.');
          }
        });
      }
    });
  })();

  // La página quieroayudar.html carga además assets/js/quieroayudar-form.js (envío real + estados UI).

  // ===== Flecha "volver atrás" en páginas internas =====
  // Si el usuario llegó directo (sin historial), se usa el href del enlace
  // como fallback (típicamente index.html). Si tiene historial real, vuelve.
  (function initBackLink() {
    const links = document.querySelectorAll('[data-back]');
    if (!links.length) return;

    links.forEach(function(link) {
      link.addEventListener('click', function(e) {
        // Si el navegador tiene historial real dentro de este sitio, usarlo.
        const sameOrigin = document.referrer && document.referrer.indexOf(window.location.origin) === 0;
        if (window.history.length > 1 && sameOrigin) {
          e.preventDefault();
          window.history.back();
        }
        // Si no, el href del propio enlace funciona como fallback.
      });
    });
  })();

})();
