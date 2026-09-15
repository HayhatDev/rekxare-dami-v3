import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-foreground">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('back_to_app')}
      </Link>

      <h1 className="text-3xl font-bold mb-2">{t('terms_title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('terms_last_updated')}</p>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s1_title')}</h2>
          <p>{t('terms_s1_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s2_title')}</h2>
          <p>{t('terms_s2_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s3_title')}</h2>
          <p>{t('terms_s3_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s4_title')}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('terms_s4_b1')}</li>
            <li>{t('terms_s4_b2')}</li>
            <li>{t('terms_s4_b3')}</li>
            <li>{t('terms_s4_b4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s5_title')}</h2>
          <p>{t('terms_s5_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s6_title')}</h2>
          <p>{t('terms_s6_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s7_title')}</h2>
          <p>
            {t('terms_s7_body')}{' '}
            <Link href="/privacy" className="underline hover:text-primary">{t('privacy_title')}</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s8_title')}</h2>
          <p>{t('terms_s8_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s9_title')}</h2>
          <p>{t('terms_s9_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s10_title')}</h2>
          <p>{t('terms_s10_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('terms_s11_title')}</h2>
          <p>
            {t('terms_s11_body')}{' '}
            <a href="https://github.com/HayhatDev/rekxare-dami-v3/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">GitHub Issues</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
