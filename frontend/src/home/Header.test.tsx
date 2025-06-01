/**
 * @file Header.test.tsx
 * @description Unit tests for the Header component.
 * @requires ./Header.tsx
 * @see ./Header.tsx
 */
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header'; // Adjust the import path as necessary

describe('Header component', () => {
  const mockOnThemeToggle = jest.fn();
  const mockOnExport = jest.fn();
  const mockOnImport = jest.fn();
  const mockOnClear = jest.fn();
  const mockOnToggleCreate = jest.fn();
  const mockOnToggleDetails = jest.fn();
  const mockOnCollapseAll = jest.fn();
  const mockOnExpandAll = jest.fn();
  const mockOnToggleFooter = jest.fn();

  const defaultProps = {
    onThemeToggle: mockOnThemeToggle,
    onExport: mockOnExport,
    onImport: mockOnImport,
    onClear: mockOnClear,
    onToggleCreate: mockOnToggleCreate,
    onToggleDetails: mockOnToggleDetails,
    onCollapseAll: mockOnCollapseAll,
    onExpandAll: mockOnExpandAll,
    onToggleFooter: mockOnToggleFooter,
    isDarkMode: false,
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders the header with title and controls', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Ontorum Visualizer')).toBeInTheDocument();
    // Check for one of the buttons to ensure controls are rendered
    expect(screen.getByLabelText('Export database')).toBeInTheDocument();
  });

  test('displays branch name from import.meta.env mock', () => {
    // This test relies on ts-jest-mock-import-meta configured in jest.config.cjs
    // to provide a value for import.meta.env.VITE_BRANCH
    render(<Header {...defaultProps} />);
    expect(screen.getByText('test-branch-from-jest')).toBeInTheDocument(); // Value from jest.config.cjs
  });

  // Test button clicks
  test('calls onExport when export button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Export database'));
    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  test('calls onImport when import button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Import database'));
    expect(mockOnImport).toHaveBeenCalledTimes(1);
  });

  test('calls onClear when clear button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Clear database'));
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  test('calls onToggleCreate when toggle create pane button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle create pane'));
    expect(mockOnToggleCreate).toHaveBeenCalledTimes(1);
  });

  test('calls onToggleDetails when toggle details pane button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle details pane'));
    expect(mockOnToggleDetails).toHaveBeenCalledTimes(1);
  });

  test('calls onCollapseAll when collapse all button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Collapse all cards'));
    expect(mockOnCollapseAll).toHaveBeenCalledTimes(1);
  });

  test('calls onExpandAll when expand all button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Expand all cards'));
    expect(mockOnExpandAll).toHaveBeenCalledTimes(1);
  });

  test('calls onToggleFooter when toggle footer pane button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle footer pane'));
    expect(mockOnToggleFooter).toHaveBeenCalledTimes(1);
  });

  test('calls onThemeToggle when theme toggle button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Switch to dark mode'));
    expect(mockOnThemeToggle).toHaveBeenCalledTimes(1);
  });

  test('theme toggle button shows correct icon and label for light mode', () => {
    render(<Header {...defaultProps} isDarkMode={false} />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  test('theme toggle button shows correct icon and label for dark mode', () => {
    render(<Header {...defaultProps} isDarkMode={true} />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  test('renders rightContent if provided', () => {
    const RightContent = () => <div data-testid="custom-content">Custom Content</div>;
    render(<Header {...defaultProps} rightContent={<RightContent />} />);
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  // Test for tooltips (title attribute)
  const buttonsWithTooltips = [
    { label: 'Export database', tooltip: 'Export database' },
    { label: 'Import database', tooltip: 'Import database' },
    { label: 'Clear database', tooltip: 'Clear database' },
    { label: 'Toggle create pane', tooltip: 'Toggle create pane' },
    { label: 'Toggle details pane', tooltip: 'Toggle details pane' },
    { label: 'Collapse all cards', tooltip: 'Collapse all cards' },
    { label: 'Expand all cards', tooltip: 'Expand all cards' },
    { label: 'Toggle footer pane', tooltip: 'Toggle footer pane' },
  ];

  buttonsWithTooltips.forEach(({ label, tooltip }) => {
    test(`${label} button has correct tooltip`, () => {
      render(<Header {...defaultProps} />);
      const button = screen.getByLabelText(label);
      expect(button).toHaveAttribute('title', tooltip);
    });
  });
});