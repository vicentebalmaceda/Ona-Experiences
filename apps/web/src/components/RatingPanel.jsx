import { useTranslation } from 'react-i18next';
import { getRatingStats } from '../utils/rating.js';

function RatingPanel({ item, ratingVersion, onRate }) {
  const { t } = useTranslation();
  const stats = getRatingStats(item);

  return (
    <div className="rating-panel">
      <div className="rating-panel__box">
        <div className="rating-panel__header">
          <div>
            <p className="rating-panel__title">{t('rating.title')}</p>
            <p className="rating-panel__text">{t('rating.text')}</p>
          </div>
          <div className="rating-panel__score"><span>★</span><span>{stats.average != null ? stats.average.toFixed(1) : '—'}</span></div>
        </div>
        <div className="rating-actions" aria-label={t('rating.rate_aria', { name: item.name })}>
          {[1, 2, 3, 4, 5].map(score => (
            <button key={score} type="button" className={`rating-button ${stats.userScore === score ? 'active' : ''}`} onClick={() => onRate(item, score)}>{score}★</button>
          ))}
        </div>
        <p className="rating-feedback">
          {stats.userScore
            ? t('rating.your_score', { score: stats.userScore })
            : t('rating.reviews_registered', { count: stats.reviews })}
        </p>
      </div>
    </div>
  );
}

export default RatingPanel;
