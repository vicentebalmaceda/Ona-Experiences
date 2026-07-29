import { useState } from 'react';
import { sendContactMessage } from '../api/contact.js';

const DEFAULT_HINT = '¡Gracias por contactarnos. Te responderemos antes de 24 horas!';

function ContactSection() {
  const [hint, setHint] = useState(DEFAULT_HINT);
  const [hintTone, setHintTone] = useState('muted');
  const [submitting, setSubmitting] = useState(false);

  async function handleContactSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const message = String(formData.get('message') || '').trim();

    setSubmitting(true);
    setHint('Enviando tu consulta…');
    setHintTone('muted');

    try {
      await sendContactMessage({ name, email, subject, message });
      form.reset();
      setHint('¡Mensaje enviado! Te responderemos antes de 24 horas.');
      setHintTone('success');
    } catch (error) {
      setHint(error instanceof Error ? error.message : 'No pudimos enviar tu mensaje.');
      setHintTone('error');
    } finally {
      setSubmitting(false);
    }
  }

  const hintClass =
    hintTone === 'error'
      ? 'text-sm text-red-300'
      : hintTone === 'success'
        ? 'text-sm text-emerald-300'
        : 'text-sm text-slate-400';

  return (
    <section id="contacto" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">ONA Experiences</p>
          <h2 className="mt-3 font-display text-4xl leading-tight">Contáctate con nosotros</h2>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">Estamos disponibles para ayudarte en todo lo que necesites</p>
          <p className="mt-5 max-w-2xl text-lg text-slate-300"><span className="font-semibold text-white">¡Te esperamos!</span></p>
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="text-2xl font-bold">Te sugerimos algunos tips para ofrecerte la mejor experiencia</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Detalla lo más posible lo que buscas y lo que más te gusta.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Menciona cualquier detalle que pueda ayudarnos a personalizar tu viaje.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Cuéntanos qué tipo de experiencia buscas: por el día, varios días, lodge o guía privado.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Señala tus fechas aproximadas, destino preferido y duración del viaje.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Indica cuántas personas viajarán y cuántas participarán en la pesca.</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Formulario de contacto</p>
              <h3 className="mt-1 text-2xl font-bold text-white">Envíanos tu consulta</h3>
            </div>
          </div>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-slate-200">Nombre</label>
                <input id="contactName" name="name" type="text" placeholder="Tu nombre" className="contact-input" required disabled={submitting} maxLength={200} />
              </div>
              <div>
                <label htmlFor="contactEmail" className="mb-2 block text-sm font-medium text-slate-200">Correo</label>
                <input id="contactEmail" name="email" type="email" placeholder="tuemail@correo.com" className="contact-input" required disabled={submitting} maxLength={320} />
              </div>
            </div>
            <div>
              <label htmlFor="contactSubject" className="mb-2 block text-sm font-medium text-slate-200">Asunto</label>
              <input id="contactSubject" name="subject" type="text" placeholder="Consulta sobre lodges, guías o alianzas" className="contact-input" required disabled={submitting} maxLength={200} />
            </div>
            <div>
              <label htmlFor="contactMessage" className="mb-2 block text-sm font-medium text-slate-200">Mensaje</label>
              <textarea id="contactMessage" name="message" rows="5" placeholder="Cuéntanos qué necesitas..." className="contact-input contact-textarea" required disabled={submitting} maxLength={5000}></textarea>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </div>
            <p className={hintClass}>{hint}</p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
