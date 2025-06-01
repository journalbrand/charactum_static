import React, { ReactNode } from 'react';
import '../styles/main.scss';
import {
  PanelLeftIcon,
  PanelRightIcon,
  PanelBottomIcon,
} from './icons/PanelIcons';


/**
 * @file Header.tsx
 * @description A React component that renders the main header of the application.
 * It provides a clear, organized layout with controls grouped logically:
 * Branding (title), Database operations (export, import, clear),
 * UI/View controls (panel visibility: create, details, footer; accordion management: collapse/expand all),
 * and Application settings (theme toggle, custom right content).
 * This organization follows common UI/UX best practices for accessibility and ease of use.
 * @requires react
 * @requires ../styles/main.scss
 * @requires ./icons/PanelIcons
 * @see ./Header.test.tsx
 */


interface HeaderProps {
  /** Toggle between dark and light theme */
  onThemeToggle: () => void;
  /** Export the current database */
  onExport: () => void;
  /** Import a database from file */
  onImport: () => void;
  /** Clear all database contents */
  onClear: () => void;
  /** Show or hide the create panel */
  onToggleCreate: () => void;
  /** Show or hide the details panel */
  onToggleDetails: () => void;
  /** Collapse all accordion sections */
  onCollapseAll: () => void;
  /** Expand all accordion sections */
  onExpandAll: () => void;
  /** Show or hide the footer panel */
  onToggleFooter: () => void;
  /** Current theme mode */
  isDarkMode: boolean;
  /** Optional additional content rendered in the header */
  rightContent?: ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  onThemeToggle,
  onExport,
  onImport,
  onClear,
  onToggleCreate,
  onToggleDetails,
  onCollapseAll,
  onExpandAll,
  onToggleFooter,
  isDarkMode,
  rightContent,
}) => {
  const branch = import.meta.env.VITE_BRANCH as string | undefined;

  return (
    <header className="header-container">
      <div className="header-content">
        <h1>
          Ontorum Visualizer
          {branch && <span className="branch-name">{branch}</span>}
        </h1>
        <div className="header-controls">
          <div className="header-toolbar">
            <button
              className="toolbar-button"
              onClick={onExport}
              aria-label="Export database"
              title="Export database"
            >
              ⬇️
            </button>
            <button
              className="toolbar-button"
              onClick={onImport}
              aria-label="Import database"
              title="Import database"
            >
              ⬆️
            </button>
            <button
              className="toolbar-button"
              onClick={onClear}
              aria-label="Clear database"
              title="Clear database"
            >
              🗑️
            </button>
          </div>
          <div className="tool-palette">
            <button
              className="tool-button"
              onClick={onToggleCreate}
              aria-label="Toggle create pane"
              title="Toggle create pane"
            >
              <PanelLeftIcon />
            </button>
            <button
              className="tool-button"
              onClick={onToggleDetails}
              aria-label="Toggle details pane"
              title="Toggle details pane"
            >
              <PanelRightIcon />
            </button>
            <button
              className="tool-button"
              onClick={onToggleFooter}
              aria-label="Toggle footer pane"
              title="Toggle footer pane"
            >
              <PanelBottomIcon />
            </button>
            <button
              className="tool-button"
              onClick={onCollapseAll}
              aria-label="Collapse all cards"
              title="Collapse all cards"
            >
              📕
            </button>
            <button
              className="tool-button"
              onClick={onExpandAll}
              aria-label="Expand all cards"
              title="Expand all cards"
            >
              📖
            </button>
          </div>
          {rightContent}
          <button
            className="theme-toggle btn"
            onClick={onThemeToggle}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

