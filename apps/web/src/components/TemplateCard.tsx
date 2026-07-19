import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TemplateMeta } from '@/lib/templates';
import styles from './TemplateCard.module.css';

/** Card « cartel de musée » : l'œuvre (mockup) au-dessus, le cartel dessous. */
export function TemplateCard({ template }: { template: TemplateMeta }) {
  const t = useTranslations('TemplateCard');
  return (
    <Link href={`/templates/${template.slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={template.image}
          alt={t('previewAlt', { name: template.name })}
          width={800}
          height={560}
        />
        {!template.available && <span className={styles.soon}>{t('soon')}</span>}
      </div>
      <div className={styles.cartel}>
        <p className={styles.title}>
          <em>{template.name}</em>, {template.year}
        </p>
        <p className="cartel">{template.medium}</p>
        <p className="cartel">{t('dimensions')}</p>
      </div>
    </Link>
  );
}
