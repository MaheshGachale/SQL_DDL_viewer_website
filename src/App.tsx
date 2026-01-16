import React, { useState, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { ReactFlowProvider } from 'reactflow';

// Lazy load heavy components for better performance
const LandingPage = lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const ToolInterface = lazy(() => import('./components/ToolInterface').then(module => ({ default: module.ToolInterface })));
const DocsPage = lazy(() => import('./components/DocsPage').then(module => ({ default: module.DocsPage })));

// Simple loading component
const LoadingFallback = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        color: '#94a3b8'
    }}>
        Loading...
    </div>
);

export const App = () => {
    const [view, setView] = useState<'landing' | 'tool' | 'docs'>('landing');

    const handleNavigate = (newView: 'landing' | 'tool' | 'docs') => {
        setView(newView);
        window.scrollTo(0, 0);
    };

    return (
        <ReactFlowProvider>
            <Layout onNavigate={handleNavigate} isTool={view === 'tool'}>
                <Suspense fallback={<LoadingFallback />}>
                    {view === 'landing' && <LandingPage onStart={() => handleNavigate('tool')} />}
                    {view === 'tool' && <ToolInterface onBack={() => handleNavigate('landing')} />}
                    {view === 'docs' && <DocsPage />}
                </Suspense>
            </Layout>
        </ReactFlowProvider>
    );
};

export default App;
