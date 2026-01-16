import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Link, BarChart3, ArrowUpDown, FunctionSquare } from 'lucide-react';

interface Column {
    name: string;
    type: string;
    isPk?: boolean;
    isFk?: boolean;
    isGrouping?: boolean;
    isSortKey?: boolean;
}

interface TableNodeData {
    label: string;
    columns: Column[];
    isView?: boolean;
    isCte?: boolean;
}

const TableNode = ({ data }: { data: TableNodeData }) => {
    return (
        <div className={`table-node ${data.isView ? 'is-view' : ''} ${data.isCte ? 'is-cte' : ''}`}>
            {/* Input Handle (Target) */}
            <Handle type="target" position={Position.Left} style={{ background: '#94a3b8', width: '10px', height: '10px' }} />

            <div className="table-header">
                <div className="table-title">{data.label}</div>
            </div>
            <div className="table-columns">
                {data.columns.map((col, index) => (
                    <div key={index} className="table-column">
                        {/* Target Handle for incoming column links (Left) */}
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`tgt-${col.name}`}
                            style={{ left: '-6px', background: '#3b82f6', width: '6px', height: '6px' }}
                        />

                        <div className="column-info">
                            <span className="column-icons">
                                {col.isPk && <span title="Primary Key"><Key size={12} className="icon-pk" /></span>}
                                {col.isFk && <span title="Foreign Key"><Link size={12} className="icon-fk" /></span>}
                                {col.isGrouping && <span title="Group By"><BarChart3 size={12} className="icon-gb" /></span>}
                                {col.isSortKey && <span title="Sort Key"><ArrowUpDown size={12} className="icon-sk" /></span>}
                                {col.type === 'Calculated' && <span title="Calculated"><FunctionSquare size={12} className="icon-calc" /></span>}
                            </span>
                            <span className="column-name">{col.name}</span>
                        </div>
                        <span className="column-type">{col.type}</span>

                        {/* Source Handle for outgoing column links (Right) */}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`src-${col.name}`}
                            style={{ right: '-6px', background: '#3b82f6', width: '6px', height: '6px' }}
                        />
                    </div>
                ))}
            </div>

            {/* Output Handle (Source) */}
            <Handle type="source" position={Position.Right} style={{ background: '#94a3b8', width: '10px', height: '10px' }} />
        </div>
    );
};

export default memo(TableNode);
