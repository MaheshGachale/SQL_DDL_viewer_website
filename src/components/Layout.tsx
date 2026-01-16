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
            <Header onNavigate={onNavigate} />
            <div className={`site-main-wrapper ${isTool ? 'layout-tool-mode' : ''}`}>
                {children}
            </div>
            {!isTool && <Footer />}
        </div>
    );
};
