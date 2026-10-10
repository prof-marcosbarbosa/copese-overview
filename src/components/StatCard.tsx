import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
};

export default function StatCard({ label, value, detail, icon: Icon, accent = false }: StatCardProps) {
  return (
    <article className={`stat-card ${accent ? 'accent' : ''}`}>
      <div className="stat-heading">
        <span>{label}</span>
        <div className="stat-icon" aria-hidden="true">
          <Icon />
        </div>
      </div>
      <strong>{value}</strong>
      <p className="stat-detail">{detail}</p>
    </article>
  );
}
