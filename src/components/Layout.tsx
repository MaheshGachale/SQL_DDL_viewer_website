import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
    children: React.ReactNode;
    onNavigate: (view: 'landing' | 'tool' | 'docs') => void;
    isTool?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate, isTool = false }) => {
    return (
        <div className="site-layout">
            {/* Skip to main content link for accessibility */}
            <a href="#main-content" className="skip-link">Skip to main content</a>

            <Header onNavigate={onNavigate} />
            <main
                id="main-content"
                className={`site-main-wrapper ${isTool ? 'layout-tool-mode' : ''}`}
                role="main"
                aria-label="Main content"
            >
                {children}
            </main>
            {!isTool && <Footer />}
        </div>
    );
};
