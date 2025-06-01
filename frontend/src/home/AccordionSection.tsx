import React, { useState } from 'react';
import '../styles/main.scss';

interface AccordionSectionProps {
  title: string;
  /** Whether the section should start open. Ignored when `open` is provided. */
  defaultOpen?: boolean;
  /** Controlled open state. When provided the component becomes controlled. */
  open?: boolean;
  /** Callback fired when the header is clicked in controlled mode. */
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
  children
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.(!controlledOpen);
    } else {
      setInternalOpen(v => !v);
    }
  };

  return (
    <div className="accordion-section">
      <div className="accordion-header" onClick={handleToggle}>
        <span>{title}</span>
        <span>{open ? '▾' : '▸'}</span>
      </div>
      {open && <div className="accordion-content scrollable">{children}</div>}
    </div>
  );
};

export default AccordionSection;
