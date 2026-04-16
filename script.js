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
  const carouselPrev = document.getElementById('carouselPrev');
  const carouselNext = document.getElementById('carouselNext');
  const carouselDots = document.querySelectorAll('.carousel__dot');

  // ===== Carousel State =====
  let currentSlide = 0;
  let autoplayInterval = null;
  const slideCount = carouselSlides ? carouselSlides.length : 0;
  const autoplayDelay = 5000;

  // ===== Header: hide on scroll down, show on scroll up =====
  let lastScrollY = window.scrollY;
  const scrollThreshold = 120;
  const scrollDeltaMin = 40;

  function handleScroll() {
    if (!header) return;

    const currentScrollY = window.scrollY;

    if (currentScrollY <= scrollThreshold) {
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

    function prevSlide() {
      goToSlide(currentSlide - 1);
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

    // Carousel controls
    if (carouselPrev) {
      carouselPrev.addEventListener('click', () => {
        prevSlide();
        startAutoplay();
      });
    }

    if (carouselNext) {
      carouselNext.addEventListener('click', () => {
        nextSlide();
        startAutoplay();
      });
    }

    if (carouselDots) {
      carouselDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          goToSlide(index);
          startAutoplay();
        });
      });
    }

    // Pause on hover
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);

    // Keyboard navigation
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        startAutoplay();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        startAutoplay();
      }
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoplay();
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
      startAutoplay();
    }, { passive: true });

    function handleSwipe() {
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }

    // Start autoplay
    startAutoplay();
  }

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
        
        // Re-apply preselection based on page after reset
        const selectElement = contactForm.querySelector('#como-ayudar');
        if (selectElement) {
          if (currentPage === 'donaciones.html') {
            selectElement.value = 'donaciones';
          } else if (currentPage === 'padrinos.html') {
            selectElement.value = 'padrinos';
          } else if (currentPage === 'voluntariado.html') {
            selectElement.value = 'voluntariado';
          }
        }
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

})();
