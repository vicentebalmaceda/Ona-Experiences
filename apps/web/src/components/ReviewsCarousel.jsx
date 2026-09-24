import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRating, renderStars } from '../utils/rating.js';

function ReviewsCarousel({ reviews }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  if (!reviews.length) return null;

  const review = reviews[index];
  const canNavigate = reviews.length > 1;

  function go(delta) {
    setIndex((current) => (current + delta + reviews.length) % reviews.length);
  }

  return (
    <div className="reviews-carousel mt-6">
      <div className="reviews-carousel__toolbar">
        <p className="reviews-carousel__count">
          {t('detail.review_position', { current: index + 1, total: reviews.length })}
        </p>
        {canNavigate ? (
          <div className="reviews-carousel__nav">
            <button
              type="button"
              className="reviews-carousel__btn"
              onClick={() => go(-1)}
              aria-label={t('detail.review_prev')}
            >
              ←
            </button>
            <button
              type="button"
              className="reviews-carousel__btn"
              onClick={() => go(1)}
              aria-label={t('detail.review_next')}
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <article className="review-card" key={review.id}>
        <div className="review-card__quote" aria-hidden="true">“</div>
        <div className="review-card__header">
          <div>
            <p className="review-card__name">{review.displayName}</p>
            <p className="rating-stars text-sm">{renderStars(review.rating)}</p>
          </div>
          <span className="review-card__score">{formatRating(review.rating)}</span>
        </div>
        <p className="review-card__comment">{review.comment}</p>
      </article>

      {canNavigate ? (
        <div className="reviews-carousel__dots" role="tablist" aria-label={t('detail.reviews_nav')}>
          {reviews.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              className={`reviews-carousel__dot ${dotIndex === index ? 'is-active' : ''}`}
              onClick={() => setIndex(dotIndex)}
              aria-label={t('detail.review_goto', { index: dotIndex + 1 })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ReviewsCarousel;
