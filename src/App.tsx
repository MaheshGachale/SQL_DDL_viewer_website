import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ReactFlowProvider } from 'reactflow';
import { LandingPage } from './components/LandingPage';
import { ToolInterface } from './components/ToolInterface';
import { DocsPage } from './components/DocsPage';

export const App = () => {
    const [view, setView] = useState<'landing' | 'tool' | 'docs'>('landing');

    const handleNavigate = (newView: 'landing' | 'tool' | 'docs') => {
        setView(newView);
        window.scrollTo(0, 0);
    };

    return (
        <ReactFlowProvider>
            <Layout onNavigate={handleNavigate} isTool={view === 'tool'}>
                {view === 'landing' && <LandingPage onStart={() => handleNavigate('tool')} />}
                {view === 'tool' && <ToolInterface onBack={() => handleNavigate('landing')} />}
                {view === 'docs' && <DocsPage />}
            </Layout>
        </ReactFlowProvider>
    );
};

export default App;
