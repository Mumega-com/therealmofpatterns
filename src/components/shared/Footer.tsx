interface FooterProps {
  className?: string;
}

const FOOTER_LINKS = {
  explore: [
    { href: '/reading', label: 'Daily Reading' },
    { href: '/discover', label: 'Discover Your Pattern' },
    { href: '/sol/checkin', label: 'Daily Check-in' },
    { href: '/subscribe', label: 'Go Pro' },
  ],
  stages: [
    { href: '/stage/nigredo', label: 'Reset' },
    { href: '/stage/albedo', label: 'Clarity' },
    { href: '/stage/citrinitas', label: 'Growth' },
    { href: '/stage/rubedo', label: 'Flow' },
  ],
  info: [
    { href: '/about', label: 'About' },
    { href: '/faq', label: 'FAQ' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
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

          {/* Stages Links */}
          <div>
            <h4 className="text-[#d4a854] text-xs font-semibold uppercase tracking-wider mb-4">
              Stages
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.stages.map(link => (
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

          {/* Info Links */}
          <div>
            <h4 className="text-[#d4a854] text-xs font-semibold uppercase tracking-wider mb-4">
              Info
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.info.map(link => (
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
