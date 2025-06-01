/**
 * @file useAppLayout.test.ts
 * @description Unit tests for the useAppLayout custom hook.
 * @requires @testing-library/react
 * @requires ./useAppLayout
 */
import { renderHook, act } from '@testing-library/react';
import { useAppLayout, /* AppLayoutState, */ initialSectionsState as hookInitialSectionsState } from './useAppLayout';

// Define the initial state structure expected by the hook for sections
const initialSectionsState: Record<string, boolean> = hookInitialSectionsState;

describe('useAppLayout', () => {
  it('should initialize with default panel visibility and section states', () => {
    const { result } = renderHook(() => useAppLayout());
    expect(result.current.showCreatePane).toBe(true);
    expect(result.current.showEditPane).toBe(true);
    expect(result.current.sectionsOpen).toEqual(initialSectionsState);
  });

  it('should allow overriding initial panel visibility', () => {
    const { result } = renderHook(() => useAppLayout({ showCreatePane: false }));
    expect(result.current.showCreatePane).toBe(false);
    expect(result.current.showEditPane).toBe(true); // Default
  });

  it('should toggle showCreatePane', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => {
      result.current.setShowCreatePane(false);
    });
    expect(result.current.showCreatePane).toBe(false);
    act(() => {
      result.current.setShowCreatePane(true);
    });
    expect(result.current.showCreatePane).toBe(true);
  });

  it('should toggle showEditPane', () => {
    const { result } = renderHook(() => useAppLayout());
    act(() => {
      result.current.setShowEditPane(false);
    });
    expect(result.current.showEditPane).toBe(false);
  });

  it('should toggle a specific section using toggleSection', () => {
    const { result } = renderHook(() => useAppLayout());
    const sectionToToggle = 'addNode';
    const initialSectionState = result.current.sectionsOpen[sectionToToggle];

    act(() => {
      result.current.toggleSection(sectionToToggle);
    });
    expect(result.current.sectionsOpen[sectionToToggle]).toBe(!initialSectionState);

    act(() => {
      result.current.toggleSection(sectionToToggle);
    });
    expect(result.current.sectionsOpen[sectionToToggle]).toBe(initialSectionState);
  });

  it('should collapse all sections', () => {
    const { result } = renderHook(() => useAppLayout());
    // Ensure at least one is true initially if defaults change
    act(() => {
      result.current.toggleSection('addNode'); // Make one different if needed
    });

    act(() => {
      result.current.collapseAllSections();
    });
    const collapsedState: Record<string, boolean> = {};
    Object.keys(initialSectionsState).forEach(k => (collapsedState[k] = false));
    expect(result.current.sectionsOpen).toEqual(collapsedState);
  });

  it('should expand all sections', () => {
    const { result } = renderHook(() => useAppLayout());
    // First collapse them to ensure expand works
    act(() => {
      result.current.collapseAllSections();
    });
    act(() => {
      result.current.expandAllSections();
    });
    const expandedState: Record<string, boolean> = {};
    Object.keys(initialSectionsState).forEach(k => (expandedState[k] = true));
    expect(result.current.sectionsOpen).toEqual(expandedState);
  });

  it('adjustLayoutForNodeSelection should set showEditPane to true and adjust sections', () => {
    const { result } = renderHook(() => useAppLayout({ showEditPane: false }));
    // Ensure some sections are different from the target state
    act(() => {
      result.current.toggleSection('search'); // make it true
      result.current.toggleSection('addNode'); // make it false if default is true
    });

    act(() => {
      result.current.adjustLayoutForNodeSelection();
    });

    expect(result.current.showEditPane).toBe(true);
    expect(result.current.sectionsOpen.selectedNode).toBe(true);
    expect(result.current.sectionsOpen.search).toBe(false);
    expect(result.current.sectionsOpen.addNode).toBe(false);
    expect(result.current.sectionsOpen.addRelationship).toBe(true);
    expect(result.current.sectionsOpen.generateRelated).toBe(true);
  });
}); 