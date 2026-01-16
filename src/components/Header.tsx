import React from 'react';
import { Database, ExternalLink } from 'lucide-react';

interface HeaderProps {
    onNavigate: (view: 'landing' | 'tool' | 'docs') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    return (
        <header className="site-header">
            <div className="header-content">
                <div className="logo-section" onClick={() => onNavigate('landing')} style={{ cursor: 'pointer' }}>
                    <Database className="site-logo" size={28} />
                    <span className="site-title">DDL Viewer</span>
                </div>

                <nav className="site-nav">
                    <button onClick={() => onNavigate('landing')} className="nav-link active" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}>Home</button>
                    <button onClick={() => {
                        onNavigate('landing');
                        setTimeout(() => {
                            const el = document.getElementById('features');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                    }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}>Features</button>
                    <button onClick={() => onNavigate('docs')} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit' }}>
                        Docs
                    </button>
                </nav>

                <div className="header-actions">
                    <a
                        href="https://marketplace.visualstudio.com/items?itemName=MaheshG.ddl-viewer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cta-button"
                    >
                        <span>Get Extension</span>
                        <ExternalLink size={16} />
                    </a>

                </div>
            </div>
        </header>
    );
};
