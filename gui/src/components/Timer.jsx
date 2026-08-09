export default function Timer({ remaining }) {
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const low = remaining <= 30;
  return (
    <div className={`timer ${low ? "timer-low" : ""}`}>
      {mins}:{secs}
    </div>
  );
}
