/**
 * Página /sumate: video opcional (data-youtube-id), validación, POST a /api/sumatevoluntariado.
 */
(function () {
  'use strict';

  var API_URL = '/api/sumatevoluntariado';

  var prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isSumatePage() {
    return Boolean(document.getElementById('sumateForm') && document.getElementById('sumateVideoMount'));
  }

  if (!isSumatePage()) return;

  var videoMount = document.getElementById('sumateVideoMount');
  if (videoMount) {
    var ytId = (videoMount.getAttribute('data-youtube-id') || '').trim();
    if (ytId && /^[a-zA-Z0-9_-]{6,32}$/.test(ytId)) {
      videoMount.removeAttribute('aria-hidden');
      videoMount.innerHTML =
        '<div class="sumate-video__ratio">' +
        '<iframe title="Video de presentación del voluntariado" src="https://www.youtube-nocookie.com/embed/' +
        encodeURIComponent(ytId) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        '</div>';
    } else {
      videoMount.innerHTML = '';
      videoMount.setAttribute('aria-hidden', 'true');
    }
  }

  var form = document.getElementById('sumateForm');
  var successBlock = document.getElementById('sumateFormSuccess');
  var submitBtn = document.getElementById('sumateFormSubmit');
  var submitLabel = document.getElementById('sumateSubmitLabel');
  var submitLoading = document.getElementById('sumateSubmitLoading');
  var formError = document.getElementById('sumateFormError');

  if (!form || !successBlock || !submitBtn) return;

  function validateField(input) {
    if (!input) return true;
    var value = (input.value || '').trim();
    var name = input.name || '';
    var errorElement = document.getElementById(input.id + 'Error');
    var isValid = true;
    var errorMessage = '';

    if (input.type === 'checkbox' && input.name === 'areas') {
      return true;
    }

    if (input.type === 'radio' && input.name !== 'areas') {
      return true;
    }

    if (input.hasAttribute('required') && !value && input.type !== 'checkbox') {
      isValid = false;
      errorMessage = 'Este campo es obligatorio';
    } else if (name === 'celular' && value && !/^[0-9\s\-+()]+$/.test(value)) {
      isValid = false;
      errorMessage = 'Ingresá un número de celular válido';
    } else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      isValid = false;
      errorMessage = 'Ingresá un correo electrónico válido';
    } else if (input.id === 'edad' && value) {
      var n = parseInt(value, 10);
      if (!Number.isFinite(n) || n < 18) {
        isValid = false;
        errorMessage = 'Debés ser mayor de 18 años';
      }
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

  function validateRadioGroup(name) {
    var checked = form.querySelector('input[type="radio"][name="' + name + '"]:checked');
    var errId = name + 'Error';
    var errorElement = document.getElementById(errId);
    if (!checked) {
      if (errorElement) errorElement.textContent = 'Elegí una opción';
      return false;
    }
    if (errorElement) errorElement.textContent = '';
    return true;
  }

  function validateAreas() {
    var boxes = form.querySelectorAll('input[name="areas"]:checked');
    var err = document.getElementById('areasError');
    if (!boxes.length) {
      if (err) err.textContent = 'Elegí al menos una forma de participación';
      return false;
    }
    if (err) err.textContent = '';
    return true;
  }

  function validateSumateForm() {
    var ok = true;
    ['email', 'nombreCompleto', 'edad', 'ocupacion', 'celular'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !validateField(el)) ok = false;
    });

    var domicilioEl = document.getElementById('domicilio');
    if (domicilioEl && domicilioEl.value.trim()) validateField(domicilioEl);

    ['conoceActividades', 'experienciaVoluntariado', 'comoSeEntero', 'conoceIntegrante'].forEach(function (n) {
      if (!validateRadioGroup(n)) ok = false;
    });

    var expDetEl = document.getElementById('experienciaDetalle');
    if (expDetEl && expDetEl.hasAttribute('required') && !validateField(expDetEl)) ok = false;

    var intEl = document.getElementById('integranteQuien');
    if (intEl && intEl.hasAttribute('required') && !validateField(intEl)) ok = false;

    if (!validateAreas()) ok = false;

    return ok;
  }

  function showSuccess() {
    form.setAttribute('hidden', '');
    successBlock.removeAttribute('hidden');
    if (formError) {
      formError.textContent = '';
      formError.setAttribute('hidden', '');
    }
    var headingEl = document.getElementById('sumateFormSuccessHeading');
    if (headingEl) {
      headingEl.setAttribute('tabindex', '-1');
      try {
        headingEl.focus({ preventScroll: true });
      } catch (e) {
        headingEl.focus();
      }
    }
    if (prefersReducedMotion) {
      successBlock.scrollIntoView();
    } else {
      successBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    try {
      window.dispatchEvent(
        new CustomEvent('domingos-de-rayuela:toast', {
          detail: {
            message:
              '¡Listo! Tu postulación llegó bien. Te vamos a contactar por mail cuando avance la convocatoria.'
          }
        })
      );
    } catch (e) {
      /* ignore */
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

  function collectAreas() {
    var out = [];
    form.querySelectorAll('input[name="areas"]:checked').forEach(function (cb) {
      out.push(cb.value);
    });
    return out;
  }

  var textIds = ['email', 'nombreCompleto', 'edad', 'ocupacion', 'domicilio', 'celular', 'disponibilidad'];
  textIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function () {
      validateField(el);
    });
    el.addEventListener('input', function () {
      if (el.classList.contains('error')) validateField(el);
    });
  });

  var expDet = document.getElementById('experienciaDetalle');
  if (expDet) {
    expDet.addEventListener('blur', function () {
      validateField(expDet);
    });
  }

  form.querySelectorAll('input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var err = document.getElementById(radio.name + 'Error');
      if (err) err.textContent = '';
      validateRadioGroup(radio.name);
    });
  });

  form.querySelectorAll('input[name="areas"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      validateAreas();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setFormError('');

    var expSi = form.querySelector('input[name="experienciaVoluntariado"][value="si"]:checked');
    var expDetEl = document.getElementById('experienciaDetalle');
    if (expDetEl) {
      if (expSi) {
        expDetEl.setAttribute('required', '');
      } else {
        expDetEl.removeAttribute('required');
        expDetEl.classList.remove('error');
        var edErr = document.getElementById('experienciaDetalleError');
        if (edErr) edErr.textContent = '';
      }
    }

    var intSi = form.querySelector('input[name="conoceIntegrante"][value="si"]:checked');
    var intEl = document.getElementById('integranteQuien');
    if (intEl) {
      if (intSi) {
        intEl.setAttribute('required', '');
      } else {
        intEl.removeAttribute('required');
        intEl.classList.remove('error');
        var iqErr = document.getElementById('integranteQuienError');
        if (iqErr) iqErr.textContent = '';
      }
    }

    if (!validateSumateForm()) {
      var firstError = form.querySelector('.form__input.error, .form__textarea.error');
      if (firstError && typeof firstError.focus === 'function') firstError.focus();
      return;
    }

    var websiteEl = form.elements.namedItem('website');
    var payload = {
      email: form.email ? form.email.value.trim() : '',
      nombreCompleto: form.nombreCompleto ? form.nombreCompleto.value.trim() : '',
      edad: form.edad ? form.edad.value.trim() : '',
      ocupacion: form.ocupacion ? form.ocupacion.value.trim() : '',
      domicilio: form.domicilio ? form.domicilio.value.trim() : '',
      celular: form.celular ? form.celular.value.trim() : '',
      conoceActividades: form.querySelector('input[name="conoceActividades"]:checked')
        ? form.querySelector('input[name="conoceActividades"]:checked').value
        : '',
      experienciaVoluntariado: form.querySelector('input[name="experienciaVoluntariado"]:checked')
        ? form.querySelector('input[name="experienciaVoluntariado"]:checked').value
        : '',
      experienciaDetalle: form.experienciaDetalle ? form.experienciaDetalle.value.trim() : '',
      comoSeEntero: form.querySelector('input[name="comoSeEntero"]:checked')
        ? form.querySelector('input[name="comoSeEntero"]:checked').value
        : '',
      conoceIntegrante: form.querySelector('input[name="conoceIntegrante"]:checked')
        ? form.querySelector('input[name="conoceIntegrante"]:checked').value
        : '',
      integranteQuien: form.integranteQuien ? form.integranteQuien.value.trim() : '',
      areas: collectAreas(),
      disponibilidad: form.disponibilidad ? form.disponibilidad.value.trim() : '',
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
          showSuccess();
          return;
        }

        var friendly =
          'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.';
        if (json && json.error && json.error.message && res.status === 400) {
          friendly = json.error.message;
        }
        setFormError(friendly);
      })
      .catch(function () {
        setFormError(
          'Ocurrió un problema al enviar el formulario. Por favor, intentá nuevamente.'
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
})();
