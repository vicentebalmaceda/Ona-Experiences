import { useState } from 'react';

function ContactSection() {
  const [hint, setHint] = useState('Solución simple, profesional y funcional para una primera etapa.');

  function handleContactSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const mailSubject = `Consulta ONA Experiences | ${subject}`;
    const mailBody = `Hola, mi nombre es ${name}.%0D%0A%0D%0AMi correo es: ${email}%0D%0A%0D%0AConsulta:%0D%0A${encodeURIComponent(message).replace(/%20/g, ' ')}%0D%0A%0D%0AGracias.`;
    const mailtoUrl = `mailto:vbalmacedae@gmail.com?subject=${encodeURIComponent(mailSubject)}&body=${mailBody}`;
    setHint('Se abrirá tu correo con el mensaje listo para enviar.');
    window.location.href = mailtoUrl;
  }

  return (
    <section id="contacto" className="bg-slate-950 py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">ONA Experiences</p>
          <h2 className="mt-3 font-display text-4xl leading-tight">Contáctate con nosotros</h2>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">La forma más simple y profesional, sin backend, es abrir el correo del usuario con un mensaje ya armado. Así no dependes de servidor y ya puedes recibir consultas en <span className="font-semibold text-white">vbalmacedae@gmail.com</span>.</p>
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="text-2xl font-bold">Opción recomendada para esta etapa</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Botón directo a correo para contacto rápido.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Formulario elegante que abre el mail del usuario con asunto y mensaje precargados.</span></li>
              <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold"></span><span>Fácil de implementar hoy y fácil de reemplazar más adelante por Formspree, EmailJS o backend propio.</span></li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <a href="mailto:vbalmacedae@gmail.com?subject=Consulta%20ONA%20Experiences" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200">Contactate con nosotros</a>
              <a href="mailto:vbalmacedae@gmail.com" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10">vbalmacedae@gmail.com</a>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Formulario de contacto</p>
              <h3 className="mt-1 text-2xl font-bold text-white">Envíanos tu consulta</h3>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">Sin backend</span>
          </div>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-slate-200">Nombre</label>
                <input id="contactName" name="name" type="text" placeholder="Tu nombre" className="contact-input" required />
              </div>
              <div>
                <label htmlFor="contactEmail" className="mb-2 block text-sm font-medium text-slate-200">Correo</label>
                <input id="contactEmail" name="email" type="email" placeholder="tuemail@correo.com" className="contact-input" required />
              </div>
            </div>
            <div>
              <label htmlFor="contactSubject" className="mb-2 block text-sm font-medium text-slate-200">Asunto</label>
              <input id="contactSubject" name="subject" type="text" placeholder="Consulta sobre lodges, guías o alianzas" className="contact-input" required />
            </div>
            <div>
              <label htmlFor="contactMessage" className="mb-2 block text-sm font-medium text-slate-200">Mensaje</label>
              <textarea id="contactMessage" name="message" rows="5" placeholder="Cuéntanos qué necesitas..." className="contact-input contact-textarea" required></textarea>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Al apretar <span className="font-semibold text-white">Enviar consulta</span>, se abrirá tu aplicación de correo con el mensaje listo para enviar a <span className="font-semibold text-white">vbalmacedae@gmail.com</span>.
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <button type="submit" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200">Enviar consulta</button>
              <a href="mailto:vbalmacedae@gmail.com" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Escribir directo</a>
            </div>
            <p className="text-sm text-slate-400">{hint}</p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
