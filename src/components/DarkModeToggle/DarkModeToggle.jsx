import { useEffect, useState } from 'react';
import './DarkModeToggle.css';

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');
    setIsDark(shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    setIsDark(nextTheme === 'dark');
  };

  return (
    <button
      type="button"
      className={`dark-mode-toggle ${isDark ? 'is-dark' : ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="toggle-thumb" aria-hidden="true">
        {isDark ? 'D' : 'L'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
