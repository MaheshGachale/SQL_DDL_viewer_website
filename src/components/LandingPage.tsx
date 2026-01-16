import React from 'react';
import { Play, Database, Share2, Workflow, ChevronRight, ChevronDown } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Online SQL DDL Viewer & Schema Visualizer</h1>
                    <p className="hero-subtitle">
                        The easiest way to visualize your SQL Database Schema online.
                        Transform your DDL statements into interactive Entity-Relationship diagrams in seconds.
                    </p>
                    <button className="cta-button-large" onClick={onStart}>
                        <span>Visualize SQL Now</span>
                        <ChevronRight size={24} />
                    </button>
                </div>
            </section>

            {/* Features Grid */}
            <section className="features-section" id="features">
                <div className="features-container">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Workflow size={32} />
                        </div>
                        <h3>Interactive Lineage</h3>
                        <p>Track column-level lineage and dependencies across tables, views, and CTEs with our smart visualizer.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Database size={32} />
                        </div>
                        <h3>Multi-Dialect Support</h3>
                        <p>Works seamlessly with PostgreSQL, MySQL, SQL Server, and generic SQL dialects. Just paste and visualize.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Share2 size={32} />
                        </div>
                        <h3>Private & Deployment Free</h3>
                        <p>Your SQL runs locally in your browser. No data is sent to any server. Secure, privacy-first visualization.</p>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="how-it-works-section">
                <h2>How to Visualize SQL Schema</h2>
                <div className="steps-container">
                    <div className="step-item">
                        <span className="step-number">1</span>
                        <h4>Paste DDL</h4>
                        <p>Copy your CREATE TABLE, VIEW, or CTE statements.</p>
                    </div>
                    <div className="step-item">
                        <span className="step-number">2</span>
                        <h4>Visualize</h4>
                        <p>Click the button to generate the interactive diagram.</p>
                    </div>
                    <div className="step-item">
                        <span className="step-number">3</span>
                        <h4>Export</h4>
                        <p>Download your schema diagram as a high-quality PNG.</p>
                    </div>
                </div>
            </section>

            {/* SEO Content / FAQ */}
            <section className="seo-content-section">
                <div className="seo-container">
                    <h2>Frequently Asked Questions</h2>

                    <div className="faq-item">
                        <div className="faq-question" onClick={() => toggleFaq(0)}>
                            <h3>What is a DDL Viewer?</h3>
                            <ChevronDown className={`faq-icon ${openFaqIndex === 0 ? 'open' : ''}`} />
                        </div>
                        <div className={`faq-answer ${openFaqIndex === 0 ? 'open' : ''}`}>
                            <p>A DDL Viewer is a tool that takes Data Definition Language (DDL) SQL statements and visualizes them as diagrams. It helps developers understand database structures, relationships between tables, and column dependencies without reading raw code.</p>
                        </div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-question" onClick={() => toggleFaq(1)}>
                            <h3>Is my SQL code safe?</h3>
                            <ChevronDown className={`faq-icon ${openFaqIndex === 1 ? 'open' : ''}`} />
                        </div>
                        <div className={`faq-answer ${openFaqIndex === 1 ? 'open' : ''}`}>
                            <p>Yes, 100% safe. This tool runs entirely in your web browser. Your SQL code and data are never sent to any server, ensuring complete privacy and security for your schemas.</p>
                        </div>
                    </div>

                    <div className="faq-item">
                        <div className="faq-question" onClick={() => toggleFaq(2)}>
                            <h3>Which SQL Databases are supported?</h3>
                            <ChevronDown className={`faq-icon ${openFaqIndex === 2 ? 'open' : ''}`} />
                        </div>
                        <div className={`faq-answer ${openFaqIndex === 2 ? 'open' : ''}`}>
                            <p>We support standard SQL syntax compatible with major databases including PostgreSQL, MySQL, SQL Server (T-SQL), and SQLite. The parser is robust enough to handle most ANSI SQL standard DDL statements.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
