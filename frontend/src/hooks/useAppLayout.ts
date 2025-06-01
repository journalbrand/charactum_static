/**
 * @file useAppLayout.ts
 * @description Custom hook to manage the layout state of the application,
 *              including visibility of main panels and open/closed states of accordion sections.
 * @requires react
 * @see ./useAppLayout.test.ts Corresponding unit tests
 */
import { useState, useCallback } from 'react';

export interface AppLayoutState {
  showCreatePane: boolean;
  showEditPane: boolean;
  showFooterPane: boolean;
  sectionsOpen: Record<string, boolean>;
}

export interface AppLayoutActions {
  setShowCreatePane: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEditPane: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFooterPane: React.Dispatch<React.SetStateAction<boolean>>;
  setSectionsOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleSection: (sectionName: string) => void;
  collapseAllSections: () => void;
  expandAllSections: () => void;
  // Function to adjust layout based on node selection
  adjustLayoutForNodeSelection: () => void;
  // Ensure the statistics view is visible
  openStatisticsPanel: () => void;
}

interface UseAppLayoutProps {
  showCreatePane?: boolean;
  showEditPane?: boolean;
  showFooterPane?: boolean;
}

export const initialSectionsState: Record<string, boolean> = {
  search: true,
  selectedNode: false,
  addNode: true,
  addRelationship: false,
  generateRelated: false,
};

export function useAppLayout(
  props?: UseAppLayoutProps
): AppLayoutState & AppLayoutActions {
  const [showCreatePane, setShowCreatePane] = useState(props?.showCreatePane ?? true);
  const [showEditPane, setShowEditPane] = useState(props?.showEditPane ?? true);
  const [showFooterPane, setShowFooterPane] = useState(props?.showFooterPane ?? false);
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(
    initialSectionsState
  );

  const toggleSection = useCallback((sectionName: string) => {
    setSectionsOpen(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

  const collapseAllSections = useCallback(() => {
    setSectionsOpen(prev => {
      const collapsed: Record<string, boolean> = {};
      Object.keys(prev).forEach(k => (collapsed[k] = false));
      return collapsed;
    });
  }, []);

  const expandAllSections = useCallback(() => {
    setSectionsOpen(prev => {
      const expanded: Record<string, boolean> = {};
      Object.keys(prev).forEach(k => (expanded[k] = true));
      return expanded;
    });
  }, []);

  const adjustLayoutForNodeSelection = useCallback(() => {
    setShowEditPane(true);
    setSectionsOpen(prev => ({
      ...prev,
      selectedNode: true,
      search: false,
      addNode: false, // Keep add relationship and generate related true
      addRelationship: true,
      generateRelated: true
    }));
  }, []);

  const openStatisticsPanel = useCallback(() => {
    setShowFooterPane(true);
  }, []);

  return {
    showCreatePane,
    setShowCreatePane,
    showEditPane,
    setShowEditPane,
    showFooterPane,
    setShowFooterPane,
    sectionsOpen,
    setSectionsOpen,
    toggleSection,
    collapseAllSections,
    expandAllSections,
    adjustLayoutForNodeSelection,
    openStatisticsPanel,
  };
}
