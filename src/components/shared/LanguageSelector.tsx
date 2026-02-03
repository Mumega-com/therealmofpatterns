'use client';

import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt-br', name: 'Portuguese (BR)', nativeName: 'Português', flag: '🇧🇷' },
] as const;

// Detect browser language and return matching supported language
function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  const langCode = browserLang.toLowerCase();

  // Direct matches
  if (langCode.startsWith('pt-br') || langCode === 'pt') return 'pt-br';
  if (langCode.startsWith('es')) return 'es';
  if (langCode.startsWith('en')) return 'en';

  return 'en';
}

interface LanguageSelectorProps {
  currentLang?: string;
  className?: string;
  compact?: boolean;
}

export function LanguageSelector({ currentLang = 'en', className = '', compact = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAutoDetectBanner, setShowAutoDetectBanner] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  // Auto-detect language on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('rop_visited');
    const savedLang = localStorage.getItem('rop_lang');

    if (!hasVisited && !savedLang) {
      const detectedLang = detectBrowserLanguage();
      localStorage.setItem('rop_visited', 'true');

      if (detectedLang !== currentLang && detectedLang !== 'en') {
        // Show banner suggesting detected language
        setShowAutoDetectBanner(true);
        setTimeout(() => setShowAutoDetectBanner(false), 8000);
      }
    }
  }, [currentLang]);

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

  const detectedLang = detectBrowserLanguage();
  const suggestedLang = LANGUAGES.find(l => l.code === detectedLang);

  return (
    <>
      {/* Auto-detect suggestion banner */}
      {showAutoDetectBanner && suggestedLang && suggestedLang.code !== currentLang && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm bg-[#1a1814] border border-[rgba(212,168,84,0.3)] rounded-xl p-4 shadow-xl z-50 animate-slide-up">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{suggestedLang.flag}</span>
            <div className="flex-1">
              <p className="text-[#f0e8d8] text-sm mb-2">
                Would you like to view in {suggestedLang.nativeName}?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAutoDetectBanner(false);
                    switchLanguage(suggestedLang.code);
                  }}
                  className="px-3 py-1 text-sm bg-[#d4a854] text-[#0a0908] rounded hover:bg-[#e5b964] transition-colors"
                >
                  Yes, switch
                </button>
                <button
                  onClick={() => setShowAutoDetectBanner(false)}
                  className="px-3 py-1 text-sm text-[#f0e8d8]/60 hover:text-[#f0e8d8] transition-colors"
                >
                  No thanks
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowAutoDetectBanner(false)}
              className="text-[#f0e8d8]/40 hover:text-[#f0e8d8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div ref={menuRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 rounded text-sm transition-all ${
            compact
              ? 'px-2 py-1 text-[#f0e8d8]/70 hover:text-[#d4a854]'
              : 'px-2.5 py-1.5 bg-[rgba(212,168,84,0.05)] border border-[rgba(212,168,84,0.15)] hover:border-[#d4a854] text-[#f0e8d8]'
          }`}
          aria-label="Select language"
        >
          <span className="text-base">{current.flag}</span>
          {!compact && (
            <>
              <span className="uppercase font-mono text-xs">{current.code}</span>
              <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 py-1 min-w-[160px] bg-[#141210] border border-[rgba(212,168,84,0.2)] rounded-lg shadow-xl z-50">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-[rgba(212,168,84,0.1)] transition-colors ${
                  lang.code === currentLang ? 'text-[#d4a854] bg-[rgba(212,168,84,0.05)]' : 'text-[#f0e8d8]'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
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

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
