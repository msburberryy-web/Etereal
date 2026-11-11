import { useEffect, useState } from 'react';

export function useLocale() {
  const [language, setLanguage] = useState<'my' | 'en'>('my');

  useEffect(() => {
    try {
      if (localStorage.getItem('etereal-language') === 'en') setLanguage('en');
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function chooseLanguage(next: 'my' | 'en') {
    setLanguage(next);
    try {
      localStorage.setItem('etereal-language', next);
    } catch {}
  }

  return {
    language,
    chooseLanguage,
    t: (english: string, burmese: string) => language === 'my' ? burmese : english,
  };
}

export function LanguageSwitch({ language, chooseLanguage }: Pick<ReturnType<typeof useLocale>, 'language' | 'chooseLanguage'>) {
  return (
    <div className="language-switch" role="group" aria-label={language === 'my' ? 'ဘာသာစကား' : 'Language'}>
      <button type="button" lang="my" aria-pressed={language === 'my'} onClick={() => chooseLanguage('my')}>မြန်မာ</button>
      <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => chooseLanguage('en')}>English</button>
    </div>
  );
}
