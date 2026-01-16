import React from 'react';
import { BookOpen, Code, Database, Share2 } from 'lucide-react';

export const DocsPage = () => {
    return (
        <div className="docs-page">
            <div className="docs-container">
                <aside className="docs-sidebar">
                    <nav className="docs-nav">
                        <h3>Documentation</h3>
                        <a href="#introduction" className="docs-link active">Introduction</a>
                        <a href="#getting-started" className="docs-link">Getting Started</a>
                        <a href="#supported-dialects" className="docs-link">Supported Dialects</a>
                        <a href="#features" className="docs-link">Key Features</a>
                    </nav>
                </aside>

                <main className="docs-content">
                    <section id="introduction">
                        <h1>DDL Viewer Documentation</h1>
                        <p className="lead">
                            DDL Viewer is a privacy-first, client-side tool that transforms your SQL Data Definition Language (DDL) scripts into interactive Entity-Relationship Diagrams (ERDs).
                        </p>
                    </section>

                    <section id="getting-started">
                        <h2>Getting Started</h2>
                        <div className="step-card">
                            <div className="step-icon">1</div>
                            <div className="step-text">
                                <h3>Prepare your SQL</h3>
                                <p>Export your database schema to a DDL file or copy your <code>CREATE TABLE</code> statements.</p>
                            </div>
                        </div>
                        <div className="step-card">
                            <div className="step-icon">2</div>
                            <div className="step-text">
                                <h3>Paste & Visualize</h3>
                                <p>Paste the code into the DDL Viewer editor. The diagram is generated instantly in your browser.</p>
                            </div>
                        </div>
                    </section>

                    <section id="supported-dialects">
                        <h2>Supported Dialects</h2>
                        <p>The parser supports standard ANSI SQL syntax and specific features from:</p>
                        <ul className="feature-list">
                            <li><Database size={16} /> PostgreSQL (including <code>SERIAL</code>, <code>UUID</code>)</li>
                            <li><Database size={16} /> MySQL / MariaDB</li>
                            <li><Database size={16} /> SQL Server (T-SQL)</li>
                            <li><Database size={16} /> SQLite</li>
                        </ul>
                    </section>

                    <section id="features">
                        <h2>Key Features</h2>
                        <div className="docs-grid">
                            <div className="doc-card">
                                <Code size={24} />
                                <h3>CTE Support</h3>
                                <p>Visualize Common Table Expressions (<code>WITH</code> clauses) to understand complex query logic.</p>
                            </div>
                            <div className="doc-card">
                                <Share2 size={24} />
                                <h3>Lineage Tracking</h3>
                                <p>See exactly how data flows from source tables into Views and Materialized Views.</p>
                            </div>
                            <div className="doc-card">
                                <BookOpen size={24} />
                                <h3>Privacy First</h3>
                                <p>No backend server. Your schema never leaves your browser.</p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};
