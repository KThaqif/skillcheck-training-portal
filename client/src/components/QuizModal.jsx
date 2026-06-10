export default function QuizModal({ question, selected, setSelected, onSubmit, result, error }) {
  return (
    <div className="modal-backdrop">
      <div className="quiz-modal">
        <span className="modal-label">Checkpoint Question</span>
        <h2>{question.questionText}</h2>
        <div className="option-list">
          {question.options.map((option) => (
            <button
              key={option}
              className={selected === option ? 'option selected' : 'option'}
              onClick={() => setSelected(option)}
              disabled={Boolean(result)}
            >
              {option}
            </button>
          ))}
        </div>
        {result && (
          <div className={result.isCorrect ? 'answer-result correct' : 'answer-result wrong'}>
            {result.isCorrect ? 'Correct answer. You may continue the video.' : `Wrong answer. Correct answer: ${result.correctAnswer}`}
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <button className="primary-button wide" onClick={onSubmit} disabled={!selected && !result}>
          {result ? 'Continue Video' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
