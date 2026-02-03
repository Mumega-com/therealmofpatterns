'use client';

import { useState } from 'react';
import { ModeToggle } from './ModeToggle';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  className?: string;
  currentLang?: string;
  transparent?: boolean;
}

const NAV_LINKS = [
  { href: '/theater', label: 'Theater', icon: '◎' },
  { href: '/learn', label: 'Learn', icon: '◈' },
  { href: '/squad', label: 'Squad', icon: '☉' },
  { href: '/docs', label: 'Docs', icon: '⚙' },
  { href: '/subscribe', label: 'Subscribe', icon: '✦' },
];

export function Header({ className = '', currentLang = 'en', transparent = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        ${transparent ? 'bg-transparent' : 'bg-[#0a0908]/95 backdrop-blur-sm'}
        border-b border-[rgba(212,168,84,0.1)]
        ${className}
      `}
    >
      {/* Main Navigation Bar */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2.5 font-medium hover:opacity-80 transition-opacity"
          >
            <img
              src="/assets/brand/logo.png"
              alt="The Realm of Patterns"
              className="w-8 h-8 rounded"
            />
            <span className="hidden sm:inline text-[#f0e8d8] font-serif">
              The Realm of Patterns
            </span>
            <span className="sm:hidden text-[#d4a854] font-mono text-sm">RoP</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#f0e8d8]/70 hover:text-[#d4a854] transition-colors rounded"
              >
                <span className="text-[#d4a854]/60">{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </nav>

          {/* Right Side: Language, Mode, Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Language Selector - Always visible, compact on mobile */}
            <LanguageSelector currentLang={currentLang} compact className="sm:hidden" />
            <LanguageSelector currentLang={currentLang} className="hidden sm:block" />

            {/* Mode Toggle */}
            <ModeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#f0e8d8]/70 hover:text-[#d4a854] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0908] border-t border-[rgba(212,168,84,0.1)]">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-[#f0e8d8]/80 hover:text-[#d4a854] hover:bg-[rgba(212,168,84,0.05)] rounded transition-colors"
              >
                <span className="text-[#d4a854]/60 text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}

            {/* Language Selector - Mobile */}
            <div className="pt-3 border-t border-[rgba(212,168,84,0.1)]">
              <LanguageSelector currentLang={currentLang} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
