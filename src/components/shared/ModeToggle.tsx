import { useStore } from '@nanostores/react';
import { $mode, setMode, type Mode } from '../../stores';

interface ModeToggleProps {
  className?: string;
}

export function ModeToggle({ className = '' }: ModeToggleProps) {
  const mode = useStore($mode);

  const handleSetMode = (newMode: Mode) => {
    setMode(newMode);
  };

  return (
    <div className={`mode-toggle ${className}`}>
      <button
        className="mode-toggle-btn"
        data-active={mode === 'kasra'}
        onClick={() => handleSetMode('kasra')}
        title="Kasra Mode (K)"
      >
        <span className="hidden sm:inline">Kasra</span>
        <span className="sm:hidden">K</span>
      </button>
      <button
        className="mode-toggle-btn"
        data-active={mode === 'river'}
        onClick={() => handleSetMode('river')}
        title="River Mode (R)"
      >
        <span className="hidden sm:inline">River</span>
        <span className="sm:hidden">R</span>
      </button>
      <button
        className="mode-toggle-btn"
        data-active={mode === 'sol'}
        onClick={() => handleSetMode('sol')}
        title="Sol Mode (S)"
      >
        <span className="hidden sm:inline">Sol</span>
        <span className="sm:hidden">S</span>
      </button>
    </div>
  );
}
