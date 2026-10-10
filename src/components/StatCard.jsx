export default function StatCard({ label, value, accent = false }) {
  return (
    <article className={`stat-card ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
