/**
 * @file DatabaseControls.tsx
 * @description Buttons for database operations displayed in the header
 */

import React from 'react';
import '../../styles/global.css';

interface DatabaseControlsProps {
  /** Export the current database to a file */
  onExport: () => void;
  /** Trigger the import file picker */
  onImport: () => void;
  /** Clear all data from the database */
  onClear: () => void;
}

const DatabaseControls: React.FC<DatabaseControlsProps> = ({ onExport, onImport, onClear }) => {
  return (
    <div className="database-controls">
      <a className="btn btn-secondary" href="/grammar">Grammar</a>
      <button className="btn btn-secondary" onClick={onExport}>Export DB</button>
      <button className="btn btn-secondary" onClick={onImport}>Import DB</button>
      <button className="btn btn-danger" onClick={onClear}>Clear DB</button>
    </div>
  );
};

export default DatabaseControls;
