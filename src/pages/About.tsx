import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Globe, Heart, Shield, Sparkles } from 'lucide-react';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="text-center py-12 animate-fade-in-up">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary text-white rounded-3xl mx-auto flex items-center justify-center mb-6 rotate-3 hover:rotate-6 transition-all duration-300 shadow-lg animate-float">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          {t('about_title') || 'About Rekxare Dami'}
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          {t('about_subtitle') || 'Your personal study companion designed to keep you focused, motivated, and on track.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        <div className="glass-card p-6 rounded-3xl shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-1">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('about_smart_tracking') || 'Smart Tracking'}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('about_smart_tracking_desc') || 'Every minute counts. We track your progress, build your streak, and level you up using a gamified XP system to make studying actually rewarding.'}
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-2">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('about_trilingual') || 'Trilingual Support'}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('about_trilingual_desc') || 'Built for local and global communities. Seamlessly switch between English, Badini Kurdish, and Arabic without missing a beat.'}
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-3">
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('about_privacy') || 'Privacy First'}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('about_privacy_desc') || 'No forced logins. Your data is synced to the cloud securely behind the scenes, so your schedule and stats are always waiting for you.'}
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-4">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('about_for_students') || 'For Students'}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('about_for_students_desc') || "This isn't a corporate productivity tool. It's built specifically for students juggling multiple subjects, exams, and life."}
          </p>
        </div>
      </div>

      <div className="mt-16 text-center text-sm text-muted-foreground animate-fade-in-up stagger-5">
        <p className="flex items-center justify-center gap-2">
          {t('made_with')}
        </p>
        <p className="mt-2">Version 3.0</p>
      </div>
    </div>
  );
}