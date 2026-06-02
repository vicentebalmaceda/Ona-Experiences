import { getRatingStats } from '../utils/rating.js';

function RatingPanel({ item, ratingVersion, onRate }) {
  const stats = getRatingStats(item, ratingVersion);

  return (
    <div className="rating-panel">
      <div className="rating-panel__box">
        <div className="rating-panel__header">
          <div>
            <p className="rating-panel__title">Calificación de visitantes</p>
            <p className="rating-panel__text">Deja tu nota para ayudar a otros viajeros a elegir con más confianza.</p>
          </div>
          <div className="rating-panel__score"><span>★</span><span>{stats.average.toFixed(1)}</span></div>
        </div>
        <div className="rating-actions" aria-label={`Calificar ${item.name}`}>
          {[1, 2, 3, 4, 5].map(score => (
            <button key={score} type="button" className={`rating-button ${stats.userScore === score ? 'active' : ''}`} onClick={() => onRate(item, score)}>{score}★</button>
          ))}
        </div>
        <p className="rating-feedback">{stats.userScore ? `Tu calificación: ${stats.userScore} de 5. Puedes cambiarla cuando quieras.` : `${stats.reviews} reseñas registradas.`}</p>
      </div>
    </div>
  );
}

export default RatingPanel;
