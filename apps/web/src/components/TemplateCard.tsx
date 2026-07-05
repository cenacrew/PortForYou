import Link from 'next/link';
import Image from 'next/image';
import type { TemplateMeta } from '@/lib/templates';
import styles from './TemplateCard.module.css';

/** Card « cartel de musée » : l'œuvre (mockup) au-dessus, le cartel dessous. */
export function TemplateCard({ template }: { template: TemplateMeta }) {
  return (
    <Link href={`/templates/${template.slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={template.image}
          alt={`Aperçu de la template ${template.name}`}
          width={800}
          height={560}
        />
        {!template.available && <span className={styles.soon}>Bientôt</span>}
      </div>
      <div className={styles.cartel}>
        <p className={styles.title}>
          <em>{template.name}</em>, {template.year}
        </p>
        <p className="cartel">{template.medium}</p>
        <p className="cartel">Dimensions variables — back-office inclus</p>
      </div>
    </Link>
  );
}
