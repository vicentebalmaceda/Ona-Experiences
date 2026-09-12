import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { fetchReviewInvite, submitReview } from '../api/reviews.js';

function ReviewPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setStatus('invalid');
        setError(t('review.missing_token'));
        return;
      }

      try {
        const data = await fetchReviewInvite(token);
        if (cancelled) return;
        setPreview(data);
        setStatus('ready');
      } catch (loadError) {
        if (cancelled) return;
        setStatus('invalid');
        setError(loadError.message || t('review.invalid_invite'));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    try {
      await submitReview({ token, rating, comment });
      setStatus('done');
    } catch (submitError) {
      setStatus('ready');
      setError(submitError.message || t('review.submit_error'));
    }
  }

  return (
    <div className="min-h-screen bg-sand font-body text-slate-900 antialiased">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-44 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-deep">{t('review.eyebrow')}</p>
        <h1 className="mt-3 font-display text-4xl text-slate-950">{t('review.title')}</h1>

        {status === 'loading' ? (
          <p className="mt-8 text-slate-500">{t('review.loading')}</p>
        ) : null}

        {status === 'invalid' ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-white p-8">
            <p className="font-semibold text-slate-900">{t('review.invalid_title')}</p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
              {t('review.back_home')}
            </Link>
          </div>
        ) : null}

        {status === 'done' ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-lg font-black text-slate-950">{t('review.thanks_title')}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t('review.thanks_text')}</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
              {t('review.back_home')}
            </Link>
          </div>
        ) : null}

        {status === 'ready' || status === 'submitting' ? (
          <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold text-slate-500">{t('review.for_product')}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{preview?.productName}</p>
            {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}

            <fieldset className="mt-6">
              <legend className="text-sm font-bold text-slate-800">{t('review.rating_label')}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`rating-button ${rating === score ? 'active' : ''}`}
                    onClick={() => setRating(score)}
                  >
                    {score}★
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-slate-800">{t('review.comment_label')}</span>
              <textarea
                className="quote-textarea mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                minLength={20}
                maxLength={500}
                required
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t('review.comment_placeholder')}
              />
              <span className="mt-1 block text-xs text-slate-500">{t('review.comment_hint')}</span>
            </label>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {status === 'submitting' ? t('review.submitting') : t('review.submit')}
            </button>
          </form>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

export default ReviewPage;
