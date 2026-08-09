export default function CommentaryFeed({ lines }) {
  return (
    <div className="commentary-feed">
      <h4>Live Commentary</h4>
      <ul>
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
