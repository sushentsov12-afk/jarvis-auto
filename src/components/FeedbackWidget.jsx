import React, { useState } from 'react';
import './FeedbackWidget.css';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (feedback.trim() && rating > 0) {
      console.log('📧 Отзыв отправлен:', { feedback, rating });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setFeedback('');
        setRating(0);
        setSubmitted(false);
      }, 2000);
    }
  };

  return (
    <div className="feedback-widget">
      <button
        className="feedback-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Оставить отзыв"
      >
        💬
      </button>

      {isOpen && (
        <div className="feedback-panel">
          {!submitted ? (
            <>
              <div className="feedback-header">
                <h4>Ваш отзыв</h4>
                <button
                  className="feedback-close"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="rating-section">
                <p className="rating-label">⭐ Оцените приложение:</p>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      className={`star ${rating >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="feedback-input"
                placeholder="Расскажите нам, что вы думаете..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={300}
                rows={4}
              />
              <p className="char-count">{feedback.length}/300</p>

              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!feedback.trim() || rating === 0}
              >
                ✓ Отправить
              </button>
            </>
          ) : (
            <div className="success-message">
              <p>✨ Спасибо за отзыв!</p>
              <p>Ваше мнение помогает нам улучшаться</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
