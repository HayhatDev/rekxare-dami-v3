import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Privacy() {
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

      <h1 className="text-3xl font-bold mb-2">{t('privacy_title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('privacy_last_updated')}</p>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s1_title')}</h2>
          <p>{t('privacy_s1_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s2_title')}</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>{t('auth_data')}</strong> — {t('privacy_s2_b1')}</li>
            <li><strong>{t('study_data')}</strong> — {t('privacy_s2_b2')}</li>
            <li><strong>{t('schedule_data')}</strong> — {t('privacy_s2_b3')}</li>
            <li><strong>{t('pref_data')}</strong> — {t('privacy_s2_b4')}</li>
            <li><strong>{t('guest_data')}</strong> — {t('privacy_s2_b5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s3_title')}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy_s3_b1')}</li>
            <li>{t('privacy_s3_b2')}</li>
            <li>{t('privacy_s3_b3')}</li>
            <li>{t('privacy_s3_b4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s4_title')}</h2>
          <p>{t('privacy_s4_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s5_title')}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google OAuth</strong> — {t('privacy_s5_b1')}</li>
            <li><strong>Supabase</strong> — {t('privacy_s5_b2')}</li>
            <li><strong>Groq</strong> — {t('privacy_s5_b3')}</li>
            <li><strong>Gemini</strong> — {t('privacy_s5_b4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s6_title')}</h2>
          <p>{t('privacy_s6_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s7_title')}</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{t('access_right')}</strong> — {t('privacy_s7_b1')}</li>
            <li><strong>{t('deletion_right')}</strong> — {t('privacy_s7_b2')}</li>
            <li><strong>{t('export_right')}</strong> — {t('privacy_s7_b3')}</li>
            <li><strong>{t('guest_data')}</strong> — {t('privacy_s7_b4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s8_title')}</h2>
          <p>{t('privacy_s8_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s9_title')}</h2>
          <p>{t('privacy_s9_body')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t('privacy_s10_title')}</h2>
          <p>
            {t('privacy_s10_body')}{' '}
            <a href="https://github.com/HayhatDev/rekxare-dami-v3/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">GitHub Issues</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
