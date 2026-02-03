import { ModeToggle } from './ModeToggle';

interface HeaderProps {
  className?: string;
}

export function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`w-full px-4 py-3 ${className}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <a href="/" className="font-medium">
          <span className="hidden sm:inline">The Realm of Patterns</span>
          <span className="sm:hidden">RoP</span>
        </a>
        <ModeToggle />
      </div>
    </header>
  );
}
