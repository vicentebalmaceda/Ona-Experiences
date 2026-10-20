import { useState } from 'react';
import { isValidEmail, normalizeEmailList } from '../../../shared/siteSettings.ts';

/**
 * Chip input for a list of email addresses. Enter, comma, space or blur adds
 * the typed address; Backspace on an empty field removes the last chip.
 * Invalid addresses are not added and the field shows why.
 */
export default function AdminEmailListInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'correo@dominio.com',
  disabled = false,
  hint
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const commit = () => {
    const candidate = draft.trim().toLowerCase().replace(/[,;]+$/, '');
    if (!candidate) {
      setDraft('');
      return true;
    }
    if (!isValidEmail(candidate)) {
      setError(`"${candidate}" no es una dirección válida.`);
      return false;
    }
    onChange(normalizeEmailList([...value, candidate]));
    setDraft('');
    setError('');
    return true;
  };

  const remove = (email) => onChange(value.filter((item) => item !== email));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ' || event.key === ';') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-[0.12em] text-forest-400">
        {label}
      </label>
      <div
        className={`mt-1.5 flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-2xl border bg-white px-2.5 py-1.5 ${
          error ? 'border-rose-300' : 'border-forest-200'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-semibold text-forest-800"
          >
            {email}
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(email)}
                aria-label={`Quitar ${email}`}
                className="rounded-full px-1 text-forest-400 hover:text-forest-900"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          type="email"
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError('');
          }}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[180px] flex-1 border-0 bg-transparent px-1.5 py-1 text-sm text-forest-950 outline-none placeholder:text-forest-300"
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-forest-400">{hint}</p>
      ) : null}
    </div>
  );
}
