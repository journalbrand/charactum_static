import React from 'react';
import '../styles/main.scss';

interface Distribution {
  [key: string]: number;
}

interface GraphStatisticsPanelProps {
  totalNodes: number;
  totalRelationships: number;
  averageDegree: number;
  nodeTypeDistribution: Distribution;
  relationshipTypeDistribution: Distribution;
}

const GraphStatisticsPanel: React.FC<GraphStatisticsPanelProps> = ({
  totalNodes,
  totalRelationships,
  averageDegree,
  nodeTypeDistribution,
  relationshipTypeDistribution
}) => {
  return (
    <div className="stats card">
      <h3>Graph Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <h4>Overview</h4>
          <div className="stat-row">
            <span className="stat-label">Total Nodes:</span>
            <span className="stat-value">{totalNodes}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Relationships:</span>
            <span className="stat-value">{totalRelationships}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg. Degree:</span>
            <span className="stat-value">{averageDegree.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-item">
          <h4>Node Types</h4>
          {Object.entries(nodeTypeDistribution).map(([type, count]) => (
            <div key={type} className="distribution-row">
              <span>{type}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>

        <div className="stat-item">
          <h4>Relationship Types</h4>
          {Object.entries(relationshipTypeDistribution).map(([type, count]) => (
            <div key={type} className="distribution-row">
              <span>{type}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GraphStatisticsPanel; 
