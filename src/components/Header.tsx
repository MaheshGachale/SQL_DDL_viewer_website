import React from 'react';
import { Database, ExternalLink } from 'lucide-react';

interface HeaderProps {
    onNavigate: (view: 'landing' | 'tool' | 'docs') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    const handleLogoClick = () => onNavigate('landing');

    const handleLogoKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate('landing');
        }
    };

    return (
        <header className="site-header" role="banner">
            <div className="header-content">
                <div
                    className="logo-section"
                    onClick={handleLogoClick}
                    onKeyDown={handleLogoKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-label="DDL Viewer home"
                    style={{ cursor: 'pointer' }}
                >
                    <Database className="site-logo" size={28} aria-hidden="true" />
                    <span className="site-title">DDL Viewer</span>
                </div>

                <nav className="site-nav" aria-label="Main navigation">
                    <button
                        onClick={() => onNavigate('landing')}
                        className="nav-link active"
                        aria-label="Navigate to home page"
                        aria-current="page"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => {
                            onNavigate('landing');
                            setTimeout(() => {
                                const el = document.getElementById('features');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                        }}
                        className="nav-link"
                        aria-label="Navigate to features section"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}
                    >
                        Features
                    </button>
                    <button
                        onClick={() => onNavigate('docs')}
                        className="nav-link"
                        aria-label="Navigate to documentation"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}
                    >
                        Docs
                    </button>
                </nav>

                <div className="header-actions">
                    <a
                        href="https://marketplace.visualstudio.com/items?itemName=MaheshG.ddl-viewer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cta-button"
                        aria-label="Get DDL Viewer Extension on Visual Studio Marketplace (opens in new tab)"
                    >
                        <span>Get Extension</span>
                        <ExternalLink size={16} aria-hidden="true" />
                    </a>

                </div>
            </div>
        </header>
    );
};
