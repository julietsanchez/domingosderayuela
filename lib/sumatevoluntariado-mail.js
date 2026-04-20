'use strict';

const { trimString, escapeHtml } = require('./quieroayudar-utils');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SI_NO_VALUES = ['si', 'no'];

const COMO_SE_ENTERO_VALUES = ['facebook', 'instagram', 'amigo', 'otro'];

const AREA_VALUES = ['domingos', 'reuniones', 'tallerista', 'cumpleanios', 'capacitacion', 'otros'];

const AREA_LABELS = {
  domingos: 'Actividades que realiza el voluntariado todos los domingos',
  reuniones: 'Reuniones para planificar y evaluar las actividades',
  tallerista: 'Otra participación (por ejemplo tallerista)',
  cumpleanios: 'Cumpleaños de lxs niñxs',
  capacitacion: 'Capacitación dirigida a voluntarios',
  otros: 'Otros: gestión de recursos; prensa y difusión'
};

const COMO_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  amigo: 'Por un amigo/conocido',
  otro: 'Otro'
};

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeAreas(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(function (item) {
        return trimString(item).toLowerCase();
      })
      .filter(function (v) {
        return AREA_VALUES.indexOf(v) !== -1;
      });
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return normalizeAreas(parsed);
    } catch (e) {
      /* ignore */
    }
    const one = trimString(raw).toLowerCase();
    return AREA_VALUES.indexOf(one) !== -1 ? [one] : [];
  }
  return [];
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ honeypot: true } | { honeypot: false, ok: true, data: object } | { honeypot: false, ok: false, code: string, message: string, fields?: string[] }}
 */
function processSumateBody(body) {
  if (!body || typeof body !== 'object') {
    return {
      honeypot: false,
      ok: false,
      code: 'INVALID_JSON',
      message: 'No se pudo leer el cuerpo del pedido.'
    };
  }

  const honeypot = trimString(body.website);
  if (honeypot) {
    return { honeypot: true };
  }

  const email = trimString(body.email);
  const nombreCompleto = trimString(body.nombreCompleto);
  const edadRaw = body.edad;
  const ocupacion = trimString(body.ocupacion);
  const domicilio = trimString(body.domicilio);
  const celular = trimString(body.celular);
  const conoceActividades = trimString(body.conoceActividades).toLowerCase();
  const experienciaVoluntariado = trimString(body.experienciaVoluntariado).toLowerCase();
  const experienciaDetalle = trimString(body.experienciaDetalle);
  const comoSeEntero = trimString(body.comoSeEntero).toLowerCase();
  const conoceIntegrante = trimString(body.conoceIntegrante).toLowerCase();
  const integranteQuien = trimString(body.integranteQuien);
  const areas = normalizeAreas(body.areas);
  const disponibilidad = trimString(body.disponibilidad);

  const missing = [];
  if (!email) missing.push('email');
  if (!nombreCompleto) missing.push('nombreCompleto');
  if (edadRaw === '' || edadRaw === null || edadRaw === undefined) missing.push('edad');
  if (!ocupacion) missing.push('ocupacion');
  if (!celular) missing.push('celular');
  if (!conoceActividades) missing.push('conoceActividades');
  if (!experienciaVoluntariado) missing.push('experienciaVoluntariado');
  if (!comoSeEntero) missing.push('comoSeEntero');
  if (!conoceIntegrante) missing.push('conoceIntegrante');
  if (!areas.length) missing.push('areas');

  if (missing.length) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Faltan datos obligatorios. Revisá los campos marcados e intentá de nuevo.',
      fields: missing
    };
  }

  const edad = typeof edadRaw === 'number' ? edadRaw : parseInt(String(edadRaw).trim(), 10);
  if (!Number.isFinite(edad) || edad < 18) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La edad debe ser un número mayor o igual a 18.'
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'El correo electrónico no tiene un formato válido.'
    };
  }

  if (SI_NO_VALUES.indexOf(conoceActividades) === -1) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La respuesta sobre actividades del voluntariado no es válida.'
    };
  }

  if (SI_NO_VALUES.indexOf(experienciaVoluntariado) === -1) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La respuesta sobre experiencia previa no es válida.'
    };
  }

  if (COMO_SE_ENTERO_VALUES.indexOf(comoSeEntero) === -1) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La opción sobre cómo te enteraste no es válida.'
    };
  }

  if (SI_NO_VALUES.indexOf(conoceIntegrante) === -1) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La respuesta sobre si conocés a alguien del voluntariado no es válida.'
    };
  }

  if (!/^[0-9\s\-+()]+$/.test(celular)) {
    return {
      honeypot: false,
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Ingresá un número de celular válido.'
    };
  }

  const areasLabels = areas.map(function (a) {
    return AREA_LABELS[a] || a;
  });

  return {
    honeypot: false,
    ok: true,
    data: {
      email,
      nombreCompleto,
      edad,
      ocupacion,
      domicilio,
      celular,
      conoceActividades,
      experienciaVoluntariado,
      experienciaDetalle,
      comoSeEntero,
      comoSeEnteroLabel: COMO_LABELS[comoSeEntero] || comoSeEntero,
      conoceIntegrante,
      integranteQuien,
      areas,
      areasLabels,
      disponibilidad
    }
  };
}

/**
 * @param {string} label
 * @param {string} value
 */
function row(label, value) {
  const v = value && String(value).trim() ? value : '—';
  return (
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;width:38%;vertical-align:top;">' +
    escapeHtml(label) +
    '</td><td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;">' +
    escapeHtml(v) +
    '</td></tr>'
  );
}

/**
 * @param {string} label
 * @param {string} value
 */
function rowHtmlBlock(label, value) {
  const raw = value && String(value).trim() ? String(value) : '—';
  const nl = raw === '—' ? '—' : escapeHtml(raw).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  return (
    '<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;width:38%;vertical-align:top;">' +
    escapeHtml(label) +
    '</td><td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;">' +
    (raw === '—' ? '—' : nl) +
    '</td></tr>'
  );
}

/**
 * @param {object} data
 * @param {string} receivedAt
 * @returns {{ html: string, text: string }}
 */
function buildSumateEmailContent(data, receivedAt) {
  const siNo = function (v) {
    return v === 'si' ? 'Sí' : 'No';
  };

  const areasText = data.areasLabels.join('; ');

  const html =
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.5;max-width:640px;">' +
    '<p style="margin:0 0 16px;font-weight:700;color:#0d6b4c;">Domingos de Rayuela</p>' +
    '<h1 style="margin:0 0 12px;font-size:18px;">Nueva postulación — Convocatoria voluntariado (/sumate)</h1>' +
    '<p style="margin:0 0 20px;color:#555;font-size:14px;">Recibido: <strong>' +
    escapeHtml(receivedAt) +
    '</strong></p>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    row('Correo electrónico', data.email) +
    row('Nombre y apellido', data.nombreCompleto) +
    row('Edad', String(data.edad)) +
    row('Ocupación', data.ocupacion) +
    row('Domicilio', data.domicilio) +
    row('Celular', data.celular) +
    row('¿Conocés las actividades del voluntariado?', siNo(data.conoceActividades)) +
    row('¿Voluntariado previo?', siNo(data.experienciaVoluntariado)) +
    rowHtmlBlock('Experiencia previa (detalle)', data.experienciaDetalle) +
    row('¿Cómo te enteraste?', data.comoSeEnteroLabel) +
    row('¿Conocés a alguien del voluntariado?', siNo(data.conoceIntegrante)) +
    row('¿A quién?', data.integranteQuien) +
    rowHtmlBlock('Áreas de interés', areasText) +
    rowHtmlBlock('Disponibilidad horaria', data.disponibilidad) +
    '</table>' +
    '</div>';

  const textLines = [
    'Domingos de Rayuela — Convocatoria voluntariado (/sumate)',
    'Recibido: ' + receivedAt,
    '',
    'Email: ' + data.email,
    'Nombre y apellido: ' + data.nombreCompleto,
    'Edad: ' + data.edad,
    'Ocupación: ' + data.ocupacion,
    'Domicilio: ' + (data.domicilio || '—'),
    'Celular: ' + data.celular,
    '¿Conocés actividades?: ' + siNo(data.conoceActividades),
    '¿Voluntariado previo?: ' + siNo(data.experienciaVoluntariado),
    'Experiencia (detalle): ' + (data.experienciaDetalle || '—'),
    '¿Cómo te enteraste?: ' + data.comoSeEnteroLabel,
    '¿Conocés integrante?: ' + siNo(data.conoceIntegrante),
    '¿A quién?: ' + (data.integranteQuien || '—'),
    'Áreas: ' + areasText,
    'Disponibilidad: ' + (data.disponibilidad || '—'),
    ''
  ];
  const text = textLines.join('\n');

  return { html, text };
}

module.exports = {
  normalizeAreas,
  processSumateBody,
  buildSumateEmailContent
};
