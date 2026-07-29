import type { ContactMessage } from '../types.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function contactEmailSubject(data: ContactMessage): string {
  return `Contact form: ${data.name}`;
}

export function contactEmailHtml(data: ContactMessage): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <h1 style="font-size: 1.25rem;">Nuevo mensaje de contacto</h1>
  <p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
  <p><strong>Asunto:</strong> ${escapeHtml(data.subject)}</p>
  <p><strong>Mensaje:</strong></p>
  <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
</body>
</html>`;
}

export function contactEmailText(data: ContactMessage): string {
  return [
    'Nuevo mensaje de contacto',
    '',
    `Nombre: ${data.name}`,
    `Email: ${data.email}`,
    `Asunto: ${data.subject}`,
    '',
    'Mensaje:',
    data.message
  ].join('\n');
}
