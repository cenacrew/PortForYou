import type { Metadata } from 'next';
import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';

export const metadata: Metadata = { title: "Templates — Port'ForYou" };

export default function TemplatesPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>La collection</h2>
          <p className="cartel">{TEMPLATES.length} templates — toutes fonctionnalités incluses</p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>
      </div>
    </section>
  );
}
