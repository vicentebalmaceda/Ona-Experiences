import { useEffect, useState } from 'react';
import { createQuoteSale } from '../api/sales.js';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile.js';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function QuoteRequestForm({ catalogType, productId, productName }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [explanation, setExplanation] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [quoteResult, setQuoteResult] = useState(null);

  useEffect(() => {
    const profile = loadUserProfile();
    if (!profile) return;

    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage('');
    setQuoteResult(null);

    saveUserProfile({ email, firstName, lastName });

    try {
      const result = await createQuoteSale(catalogType, productId, {
        customer: {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim()
        },
        reservationDate,
        notes: explanation.trim(),
        quantity: 1
      });

      setQuoteResult(result);
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo enviar la cotización.');
      setStatus('error');
    }
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Solicitar cotización</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">Reserva para {productName}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Completa tus datos y te enviaremos una cotización vinculada a tu correo.
      </p>

      {status === 'success' && quoteResult ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Cotización enviada correctamente</p>
          <p className="mt-2">Referencia: {quoteResult.salesId}</p>
          {quoteResult.documentNumber ? (
            <p className="mt-1">Número de documento: {quoteResult.documentNumber}</p>
          ) : null}
          {quoteResult.totalAmount != null ? (
            <p className="mt-1">Total: ${quoteResult.totalAmount.toLocaleString('es-CL')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {quoteResult.urlPdf ? (
              <a
                href={quoteResult.urlPdf}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ver PDF
              </a>
            ) : null}
            {quoteResult.urlPublicView ? (
              <a
                href={quoteResult.urlPublicView}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                Ver cotización
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quoteFirstName" className="mb-2 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                id="quoteFirstName"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="quote-input"
                required
              />
            </div>
            <div>
              <label htmlFor="quoteLastName" className="mb-2 block text-sm font-medium text-slate-700">
                Apellido
              </label>
              <input
                id="quoteLastName"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="quote-input"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="quoteEmail" className="mb-2 block text-sm font-medium text-slate-700">
              Correo
            </label>
            <input
              id="quoteEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="quote-input"
              placeholder="tuemail@correo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="quoteDate" className="mb-2 block text-sm font-medium text-slate-700">
              Fecha de reserva
            </label>
            <input
              id="quoteDate"
              type="date"
              value={reservationDate}
              min={todayIsoDate()}
              onChange={(event) => setReservationDate(event.target.value)}
              className="quote-input"
              required
            />
          </div>

          <div>
            <label htmlFor="quoteExplanation" className="mb-2 block text-sm font-medium text-slate-700">
              Detalle de la reserva
            </label>
            <textarea
              id="quoteExplanation"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              className="quote-input quote-textarea"
              placeholder="Cuéntanos fechas, número de personas, servicios requeridos, etc."
              minLength={10}
              required
            />
          </div>

          {status === 'error' && errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'submitting' ? 'Enviando cotización…' : 'Solicitar cotización'}
          </button>
        </form>
      )}
    </section>
  );
}

export default QuoteRequestForm;
