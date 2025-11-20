// TopToolbar.jsx - Updated with mobile-friendly loading
import React from "react";
import "../css/TopToolbar.css";

const TopToolbar = ({
  title,
  subtitle,
  onMenuToggle,
  isLoading = false,
}) => {
  return (
    <div className="top-toolbar">
      {/* Loading Line at Top Edge */}
      {isLoading && <div className="loading-line"></div>}
      
      <button className="mobile-menu-toggle" onClick={onMenuToggle}>
        ☰
      </button>

      <div className="toolbar-content">
        <div className="toolbar-title-container">
          <h2 className="toolbar-title">{title}</h2>
        </div>
          {isLoading && (
            <div className="simple-loading">
              <span className="loading-text">Loading data, please wait</span>
              <div className="loading-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          )}
        <p className="toolbar-subtitle">{subtitle}</p>
      </div>
    </div>
  );
};

export default TopToolbar;