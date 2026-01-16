import React from 'react';

export const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>DDL Viewer</h4>
                    <p>Transform your SQL DDL into beautiful, interactive entity-relationship diagrams instantly.</p>
                </div>

                <div className="footer-section">
                    <h4>Links</h4>
                    <a href="https://marketplace.visualstudio.com/items?itemName=MaheshG.ddl-viewer" target="_blank" rel="noopener noreferrer">VS Code Extension</a>
                </div>
            </div>

            <div className="footer-bottom" style={{ justifyContent: 'center' }}>
                <p>&copy; 2026 DDL Viewer. All rights reserved.</p>
            </div>
        </footer>
    );
};
