/**
 * Formulario "Quiero ayudar": validación, anti-spam (honeypot), POST a /api/quieroayudar
 * y estados idle / loading / success / error.
 *
 * Futuro (reCAPTCHA u otro): agregar token en el body y validarlo en api/quieroayudar.js
 * antes de llamar a Resend.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'domingosDeRayuela_quieroAyudar';
  var API_URL = '/api/quieroayudar';

  var prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function currentPath() {
    return window.location.pathname.split('/').pop() || '';
  }

  function isQuieroAyudarPage() {
    var currentPage = currentPath();
    return (
      currentPage === 'quieroayudar.html' ||
      currentPage === 'quieroayudar' ||
      window.location.pathname.replace(/\/$/, '').endsWith('/quieroayudar')
    );
  }

  if (!isQuieroAyudarPage()) return;

  var form = document.getElementById('ayudaForm');
  var successBlock = document.getElementById('formSuccess');
  var motivoSelect = document.getElementById('motivo');
  var motivoHint = document.getElementById('motivoHint');
  var submitBtn = document.getElementById('ayudaFormSubmit');
  var submitLabel = document.getElementById('ayudaSubmitLabel');
  var submitLoading = document.getElementById('ayudaSubmitLoading');
  var formError = document.getElementById('formSubmitError');

  if (!form || !successBlock || !motivoSelect || !submitBtn) return;

  var MOTIVO_MAP = {
    donaciones: 'donaciones',
    donacion: 'donaciones',
    donar: 'donaciones',
    padrinos: 'padrinos',
    padrino: 'padrinos',
    madrina: 'padrinos',
    'programa-de-padrinos': 'padrinos',
    voluntariado: 'voluntariado',
    voluntario: 'voluntariado',
    'programa-de-voluntariado': 'voluntariado'
  };

  var MOTIVO_LABELS = {
    donaciones: 'Donaciones',
    padrinos: 'Programa de padrinos',
    voluntariado: 'Programa de voluntariado'
  };

  function validateField(input) {
    if (!input) return true;
    var value = (input.value || '').trim();
    var name = input.name || '';
    var errorElement = document.getElementById(input.id + 'Error');
    var isValid = true;
    var errorMessage = '';

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

  function validateAyudaForm() {
    var ids = ['nombre', 'apellido', 'email', 'whatsapp', 'motivo'];
    var ok = true;
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && !validateField(el)) ok = false;
    }
    return ok;
  }

  function applyMotivoFromUrl() {
    var raw = '';
    try {
      var params = new URLSearchParams(window.location.search);
      raw = (params.get('motivo') || '').trim().toLowerCase();
    } catch (e) {
      return;
    }
    if (!raw) return;

    var normalized = MOTIVO_MAP[raw];
    if (!normalized) return;

    var optionExists = Array.prototype.some.call(motivoSelect.options, function (opt) {
      return opt.value === normalized;
    });
    if (!optionExists) return;

    motivoSelect.value = normalized;
    motivoSelect.classList.add('form__select--prefilled');

    if (motivoHint && MOTIVO_LABELS[normalized]) {
      motivoHint.textContent =
        '✓ Motivo seleccionado: ' + MOTIVO_LABELS[normalized] + '. Podés cambiarlo si querés.';
    }
  }

  motivoSelect.addEventListener('change', function () {
    motivoSelect.classList.remove('form__select--prefilled');
    if (motivoHint) motivoHint.textContent = '';
  });

  function showSuccess() {
    form.setAttribute('hidden', '');
    successBlock.removeAttribute('hidden');
    if (formError) {
      formError.textContent = '';
      formError.setAttribute('hidden', '');
    }

    var msgEl = document.getElementById('formSuccessMessage');
    if (msgEl) {
      msgEl.setAttribute('tabindex', '-1');
      try {
        msgEl.focus({ preventScroll: true });
      } catch (e) {
        msgEl.focus();
      }
    }

    if (prefersReducedMotion) {
      successBlock.scrollIntoView();
    } else {
      successBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function persistAyudaData(data) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          whatsapp: data.whatsapp,
          motivo: data.motivo,
          contanosMas: data.contanosMas,
          timestamp: new Date().toISOString(),
          page: 'quieroayudar.html'
        })
      );
    } catch (e) {
      if (window.console && typeof window.console.warn === 'function') {
        window.console.warn('No se pudo guardar en localStorage:', e);
      }
    }
  }

  function setFormError(message) {
    if (!formError) return;
    if (message) {
      formError.textContent = message;
      formError.removeAttribute('hidden');
      if (prefersReducedMotion) {
        formError.scrollIntoView();
      } else {
        formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      formError.textContent = '';
      formError.setAttribute('hidden', '');
    }
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      if (submitLabel) submitLabel.setAttribute('hidden', '');
      if (submitLoading) submitLoading.removeAttribute('hidden');
    } else {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      if (submitLabel) submitLabel.removeAttribute('hidden');
      if (submitLoading) submitLoading.setAttribute('hidden', '');
    }
  }

  var fieldIds = ['nombre', 'apellido', 'email', 'whatsapp', 'motivo'];
  fieldIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      validateField(el);
    });
    el.addEventListener('input', function () {
      if (el.classList.contains('error')) validateField(el);
    });
    el.addEventListener('change', function () {
      if (el.classList.contains('error')) validateField(el);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setFormError('');

    if (!validateAyudaForm()) {
      var firstError = form.querySelector('.form__input.error, .form__select.error, .form__textarea.error');
      if (firstError && typeof firstError.focus === 'function') firstError.focus();
      return;
    }

    var contanosEl = form.elements.namedItem('contanosMas');
    var websiteEl = form.elements.namedItem('website');
    var payload = {
      nombre: form.nombre ? form.nombre.value.trim() : '',
      apellido: form.apellido ? form.apellido.value.trim() : '',
      email: form.email ? form.email.value.trim() : '',
      whatsapp: form.whatsapp ? form.whatsapp.value.trim() : '',
      motivo: form.motivo ? form.motivo.value : '',
      contanosMas: contanosEl && contanosEl.value ? contanosEl.value.trim() : '',
      website: websiteEl && websiteEl.value ? websiteEl.value.trim() : ''
    };

    setLoading(true);

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var json = null;
          if (text) {
            try {
              json = JSON.parse(text);
            } catch (parseErr) {
              json = null;
            }
          }
          return { res: res, json: json };
        });
      })
      .then(function (result) {
        var res = result.res;
        var json = result.json;

        if (res.ok && json && json.success === true) {
          persistAyudaData(payload);
          showSuccess();
          return;
        }

        var friendly =
          'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.';
        var detail = '';

        if (json && json.error && typeof json.error.message === 'string' && json.error.message.trim()) {
          friendly = json.error.message.trim();
          if (typeof json.error.detail === 'string' && json.error.detail.trim()) {
            detail = json.error.detail.trim();
          }
        } else if (res.status >= 500) {
          friendly =
            'El servidor no pudo procesar el envío (error ' + res.status + '). Intentá nuevamente en unos minutos.';
        } else if (res.status === 404) {
          friendly =
            'No se encontró el endpoint del formulario (404). Avisanos por otro canal mientras lo revisamos.';
        } else if (res.status === 0) {
          friendly =
            'No pudimos contactar al servidor. Revisá tu conexión e intentá de nuevo.';
        }

        if (window.console && typeof window.console.error === 'function') {
          window.console.error('[quieroayudar] Envío falló. status=', res.status, 'body=', json);
        }

        setFormError(detail ? friendly + ' (' + detail + ')' : friendly);
      })
      .catch(function (err) {
        if (window.console && typeof window.console.error === 'function') {
          window.console.error('[quieroayudar] Error de red al enviar:', err);
        }
        setFormError(
          'No pudimos contactar al servidor. Revisá tu conexión e intentá de nuevo.'
        );
      })
      .finally(function () {
        setLoading(false);
      });
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      successBlock.setAttribute('hidden', '');
      form.removeAttribute('hidden');
      setFormError('');
      setLoading(false);
    }
  });

  applyMotivoFromUrl();
})();
