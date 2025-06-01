/**
 * @file NavigationBar.tsx
 * @description This file contains the NavigationBar component, which provides site-wide navigation.
 * @dependencies React, react-router-dom
 */
import React from 'react';
import { Link } from 'react-router-dom';

const NavigationBar: React.FC = () => {
  const navStyle: React.CSSProperties = {
    backgroundColor: '#333',
    padding: '10px 0',
    textAlign: 'center',
  };

  const linkStyle: React.CSSProperties = {
    color: 'white',
    margin: '0 15px',
    textDecoration: 'none',
    fontSize: '18px',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle}>Home</Link>
      <Link to="/grammar" style={linkStyle}>Grammar Editor</Link>
      <Link to="/about" style={linkStyle}>About</Link>
    </nav>
  );
};


export default NavigationBar;

