export default function CommentaryFeed({ lines }) {
  if (!lines || lines.length === 0) return null;

  return (
    <div className="commentary-card">
      <h4 className="commentary-title">🎙️ AI Esports Commentator</h4>
      <ul className="commentary-list">
        {lines.map((line, i) => (
          <li key={i} className="commentary-item">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
