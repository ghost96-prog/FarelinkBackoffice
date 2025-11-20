// components/Layout.js
import React, { useState } from "react";
import SideNav from "./SideNav";
import TopToolbar from "./TopToolbar";

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeScreen, setActiveScreen] = useState("dashboard");

  return (
    <div className="app-container">
      <SideNav 
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div >
        <TopToolbar 
          activeScreen={activeScreen}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {children}
      </div>
    </div>
  );
};

export default Layout;