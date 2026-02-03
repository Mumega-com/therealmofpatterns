interface FooterProps {
  className?: string;
}

const FOOTER_LINKS = {
  explore: [
    { href: '/theater', label: 'Cosmic Theater' },
    { href: '/weather', label: 'Cosmic Weather' },
    { href: '/sol/checkin', label: 'Daily Check-in' },
    { href: '/learn', label: 'Learn' },
    { href: '/subscribe', label: 'Subscribe' },
  ],
  modes: [
    { href: '/kasra', label: 'Kasra Mode' },
    { href: '/river', label: 'River Mode' },
    { href: '/sol', label: 'Sol Mode' },
  ],
  community: [
    { href: '/squad', label: 'Meet the Squad' },
    { href: '/docs', label: 'Documentation' },
  ],
};

export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-[#0a0908] border-t border-[rgba(212,168,84,0.1)] ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <img
                src="/assets/brand/logo.png"
                alt="The Realm of Patterns"
                className="w-10 h-10 rounded"
              />
              <span className="text-[#d4a854] font-serif text-lg">RoP</span>
            </a>
            <p className="text-[#f0e8d8]/50 text-sm leading-relaxed">
              Know the pattern.<br />
              Shape the pattern.
            </p>
          </div>

          {/* Explore Links */}
          <div>
            <h4 className="text-[#d4a854] text-xs font-semibold uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.explore.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[#f0e8d8]/60 hover:text-[#d4a854] text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Modes Links */}
          <div>
            <h4 className="text-[#d4a854] text-xs font-semibold uppercase tracking-wider mb-4">
              Modes
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.modes.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[#f0e8d8]/60 hover:text-[#d4a854] text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="text-[#d4a854] text-xs font-semibold uppercase tracking-wider mb-4">
              Community
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.community.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[#f0e8d8]/60 hover:text-[#d4a854] text-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[rgba(212,168,84,0.1)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#f0e8d8]/40 text-xs">
            © {currentYear} The Realm of Patterns. Built with cosmic intention.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="text-[#f0e8d8]/30 hover:text-[#f0e8d8]/50 text-xs transition-colors"
            >
              Admin
            </a>
            <span className="text-[#f0e8d8]/20">•</span>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f0e8d8]/30 hover:text-[#f0e8d8]/50 text-xs transition-colors"
            >
              Built with Claude
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
