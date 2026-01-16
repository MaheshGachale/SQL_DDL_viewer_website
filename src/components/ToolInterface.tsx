import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import { Database, Play, Code2, PanelLeftClose, PanelLeftOpen, Terminal, Sparkles, Download, ArrowLeft } from 'lucide-react';
import { toPng } from 'html-to-image';
// @ts-ignore
import downloadjs from 'downloadjs';

import TableNode from './TableNode';
import { parseSqlToElements } from '../utils/sqlParser';

const nodeTypes = {
    table: TableNode,
};

const DEFAULT_SQL = `-- Paste your SQL DDL here (CREATE TABLE, VIEW, etc.)
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount DECIMAL(10,2),
    status VARCHAR(20)
);

CREATE VIEW user_order_summary AS
SELECT 
    u.username,
    COUNT(o.id) AS total_orders,
    SUM(o.amount) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.username;
`;

interface ToolInterfaceProps {
    onBack: () => void;
}

export const ToolInterface: React.FC<ToolInterfaceProps> = ({ onBack }) => {
    const [sql, setSql] = useState(DEFAULT_SQL);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const visualize = useCallback(() => {
        try {
            const { nodes: newNodes, edges: newEdges } = parseSqlToElements(sql);
            setNodes(newNodes);
            setEdges(newEdges);
        } catch (error) {
            console.error('Parsing error:', error);
        }
    }, [sql, setNodes, setEdges]);

    useEffect(() => {
        visualize();
    }, []);

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <button className="icon-button back-button" onClick={onBack} title="Back to Home" style={{ marginRight: '8px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="section-title">
                        <Code2 size={16} />
                        <span>SQL Editor</span>
                    </div>
                    <button
                        className="icon-button toggle-sidebar"
                        onClick={() => setIsSidebarOpen(false)}
                        title="Close Sidebar"
                    >
                        <PanelLeftClose size={20} />
                    </button>
                </div>

                <div className="editor-section">
                    <div className="editor-wrapper">
                        <Editor
                            value={sql}
                            onValueChange={setSql}
                            highlight={code => highlight(code, languages.sql, 'sql')}
                            padding={15}
                            className="sql-editor"
                            style={{
                                fontFamily: '"Fira Code", "Fira Mono", monospace',
                                fontSize: 14,
                            }}
                        />
                    </div>
                    <button className="visualize-button" onClick={visualize}>
                        <Play size={16} fill="currentColor" />
                        <span>Visualize SQL</span>
                    </button>
                </div>

                <div className="sidebar-footer">
                    <div className="footer-item">
                        <Terminal size={14} />
                        <span>v0.1.0-web</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {!isSidebarOpen && (
                    <button
                        className="icon-button floating-toggle"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Open Sidebar"
                    >
                        <PanelLeftOpen size={24} />
                    </button>
                )}

                <header className="view-header">
                    <div className="view-title">
                        <h1>Schema Lineage Visualizer</h1>
                        <p>Interactive diagram generated from your SQL DDL</p>
                    </div>
                    {/* Re-add back button in header for mobile or when sidebar is closed? 
                        For now, sidebar back button is sufficient, or global nav handles 'Home' 
                    */}
                </header>

                <div className="diagram-container">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-right"
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#334155" gap={20} />
                        <Controls />
                        <Panel position="top-right" className="download-panel">
                            <button
                                className="download-button"
                                onClick={() => {
                                    const element = document.querySelector('.react-flow__renderer') as HTMLElement;
                                    if (element) {
                                        toPng(element, {
                                            backgroundColor: '#0f172a',
                                            style: {
                                                transform: 'scale(1)',
                                                width: element.offsetWidth + 'px',
                                                height: element.offsetHeight + 'px'
                                            }
                                        }).then((dataUrl) => {
                                            downloadjs(dataUrl, 'ddl-diagram.png');
                                        });
                                    }
                                }}
                                title="Download Diagram as PNG"
                            >
                                <Download size={18} />
                                <span>Download PNG</span>
                            </button>
                        </Panel>
                        <MiniMap
                            nodeStrokeColor={(n) => {
                                if (n.type === 'table') return '#3b82f6';
                                return '#64748b';
                            }}
                            nodeColor={(n) => {
                                if (n.type === 'table') return '#1e293b';
                                return '#fff';
                            }}
                            maskColor="rgba(15, 23, 42, 0.6)"
                        />
                    </ReactFlow>
                </div>
            </main>
        </div>
    );
};
