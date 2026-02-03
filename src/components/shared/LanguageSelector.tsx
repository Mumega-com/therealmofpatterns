'use client';

import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt-br', name: 'Portuguese (BR)', nativeName: 'Português', flag: '🇧🇷' },
] as const;

interface LanguageSelectorProps {
  currentLang?: string;
  className?: string;
}

export function LanguageSelector({ currentLang = 'en', className = '' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchLanguage(langCode: string) {
    // For now, store preference and reload
    // In full implementation, this would change URL path
    localStorage.setItem('rop_lang', langCode);
    setIsOpen(false);

    // Build new URL with language prefix
    const currentPath = window.location.pathname;
    let newPath: string;

    // Check if current path has a language prefix
    const langPrefixes = LANGUAGES.map(l => `/${l.code}`);
    const hasLangPrefix = langPrefixes.some(prefix =>
      currentPath === prefix || currentPath.startsWith(`${prefix}/`)
    );

    if (hasLangPrefix) {
      // Replace existing language prefix
      const parts = currentPath.split('/');
      parts[1] = langCode;
      newPath = parts.join('/');
    } else {
      // Add language prefix (except for English which is default)
      newPath = langCode === 'en' ? currentPath : `/${langCode}${currentPath}`;
    }

    window.location.href = newPath;
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-sm opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Select language"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="uppercase font-mono text-xs">{current.code}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 py-1 min-w-[140px] bg-[#141210] border border-[rgba(212,168,84,0.2)] rounded shadow-xl z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[rgba(212,168,84,0.1)] transition-colors ${
                lang.code === currentLang ? 'text-[#d4a854] bg-[rgba(212,168,84,0.05)]' : 'text-[#f0e8d8]'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="flex-1">{lang.nativeName}</span>
              {lang.code === currentLang && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
