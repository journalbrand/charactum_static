import React, { ReactNode, useState, useEffect } from 'react';
import '../styles/main.scss';

interface FooterPaneProps {
  showPanel: boolean;
  appVersion?: string;
  children?: ReactNode;
  isStatisticsOpen?: boolean;
  onToggleStatistics?: () => void;
  leftInfoContent?: ReactNode;
  centerInfoContent?: ReactNode;
  rightInfoContent?: ReactNode;
  /** Current height of the footer in pixels */
  height: number;
  /** Callback when the user drags to resize the footer */
  onHeightChange: (h: number) => void;
  /** Minimum height for the footer */
  minHeight?: number;
}

const FooterPane: React.FC<FooterPaneProps> = ({
  showPanel,
  appVersion,
  children,
  isStatisticsOpen,
  onToggleStatistics,
  leftInfoContent,
  centerInfoContent,
  rightInfoContent,
  height,
  onHeightChange,
  minHeight = 100
}) => {
  const currentYear = new Date().getFullYear();
  const branch = import.meta.env.VITE_BRANCH as string | undefined;

  if (!showPanel) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startHeight = height;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const newHeight = Math.max(minHeight, startHeight + delta);
      onHeightChange(newHeight);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="footer-pane-container scrollable"
      data-area="footer"
      style={{
        '--footer-pane-height': `${height}px`
      } as React.CSSProperties}
    >
      <div className="footer-resize-handle" onMouseDown={handleMouseDown} />
      <div className="footer-pane-main-content">
        {children}
      </div>
      <div className="footer-info-bar">
        <div className="footer-info-left">
          {leftInfoContent ? leftInfoContent : <p>&copy; {currentYear} Ontorum. All rights reserved.</p>}
        </div>
        <div className="footer-info-center">
          {centerInfoContent}
          {branch && <span className="branch-name">Branch: {branch}</span>}
        </div>
        <div className="footer-info-right">
          {rightInfoContent}
          {appVersion && <span className="app-version">Version: {appVersion}</span>}
        </div>
      </div>
    </div>
  );
};

export default FooterPane; 
