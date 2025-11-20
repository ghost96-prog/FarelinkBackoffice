import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/SideNav.css";

const SideNav = ({ activeScreen, onScreenChange, isCollapsed, onToggle }) => {
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const settingsRef = useRef(null);
  const popupRef = useRef(null);
  const logoutModalRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const menuItems = [
    {
      id: "dashboard",
      label: "Overall Bus Overview",
      icon: "fas fa-chart-bar",
      color: "#1a5b7b",
      path: "/dashboard"
    },
    {
      id: "settings",
      label: "Account Settings",
      icon: "fas fa-cogs",
      color: "#6c757d",
      hasSubmenu: true,
      subItems: [
        {
          id: "buses",
          label: "Bus Management",
          icon: "fas fa-bus",
          color: "#e74c3c",
          path: "/buses"
        },
        {
          id: "employees",
          label: "Employee Management",
          icon: "fas fa-users",
          color: "#3498db",
          path: "/employees"
        },
        {
          id: "routes",
          label: "Route Management",
          icon: "fas fa-route",
          color: "#2ecc71",
          path: "/routes"
        },
        {
          id: "subRoutes",
          label: "Sub Routes Management",
          icon: "fas fa-road",
          color: "#f39c12",
          path: "/subroutes"
        },
        {
          id: "subscription_list",
          label: "Bus Subscription Management",
          icon: "fas fa-credit-card",
          color: "#9b59b6",
          path: "/subscription_list"
        },
        {
          id: "currency",
          label: "Currency Settings",
          icon: "fas fa-dollar-sign",
          color: "#27ae60",
          path: "/currency"
        },
        {
          id: "settings",
          label: "System Settings",
          icon: "fas fa-sliders-h",
          color: "#34495e",
          path: "/settings"
        },
      ]
    },
  ];

  const footerItems = [
    {
      id: "logout",
      label: "Logout",
      icon: "fas fa-sign-out-alt",
      color: "#dc3545",
    },
  ];

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For settings popup (collapsed state)
      if (showSettingsPopup && popupRef.current && !popupRef.current.contains(event.target)) {
        // Check if click is not on the settings button
        if (settingsRef.current && !settingsRef.current.contains(event.target)) {
          setShowSettingsPopup(false);
        }
      }
      
      // For settings submenu (expanded state)
      if (!isCollapsed && showSettingsSubmenu && settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsSubmenu(false);
      }

      // For logout modal
      if (showLogoutModal && logoutModalRef.current && !logoutModalRef.current.contains(event.target)) {
        setShowLogoutModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsPopup, showSettingsSubmenu, showLogoutModal, isCollapsed]);

  // Function to ensure token is included in navigation
  const ensureAuthenticatedNavigation = (path) => {
    if (!isAuthenticated || !user?.token) {
      console.log("No token found, redirecting to login");
      navigate("/login");
      return false;
    }
    
    // Store the token in localStorage for API requests to access
    localStorage.setItem("token", user.token);
    
    console.log("Navigating with token:", user.token);
    navigate(path);
    return true;
  };

  const handleItemClick = (item, event) => {
    event.stopPropagation();
    
    if (item.id === "dashboard") {
      ensureAuthenticatedNavigation("/dashboard");
      closeAllMenus();
    } else if (item.id === "settings") {
      if (isCollapsed) {
        setShowSettingsPopup(!showSettingsPopup);
      } else {
        setShowSettingsSubmenu(!showSettingsSubmenu);
      }
      return;
    } else if (item.id === "logout") {
      // Show logout confirmation modal instead of immediate logout
      setShowLogoutModal(true);
      closeAllMenus();
      return;
    }
    
    if (window.innerWidth <= 768) {
      onToggle();
    }
  };

  const handleSubItemClick = (subItem, event) => {
    event.stopPropagation();
    
    ensureAuthenticatedNavigation(subItem.path);
    closeAllMenus();
    
    if (window.innerWidth <= 768) {
      onToggle();
    }
  };

  const handlePopupItemClick = (subItem, event) => {
    event.stopPropagation();
    
    ensureAuthenticatedNavigation(subItem.path);
    setShowSettingsPopup(false);
    
    if (window.innerWidth <= 768) {
      onToggle();
    }
  };

  const handleLogoutConfirm = () => {
    // Clear token from localStorage on logout
    localStorage.removeItem("token");
    logout();
    setShowLogoutModal(false);
    navigate("/login");
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const closeAllMenus = () => {
    setShowSettingsSubmenu(false);
    setShowSettingsPopup(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && window.innerWidth <= 768 && (
        <div
          className="side-nav-overlay"
          onClick={() => {
            onToggle();
            closeAllMenus();
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="logout-modal" ref={logoutModalRef}>
            <div className="logout-modal-header">
              <span className="logout-modal-icon">🚪</span>
              <h3 className="logout-modal-title">Confirm Logout</h3>
            </div>
            <div className="logout-modal-content">
              <p className="logout-modal-message">
                Are you sure you want to logout?
              </p>
              <div className="logout-modal-user">
                <span className="user-email">{user?.user_email || "gkmangezi09@gmail.com"}</span>
                <span className="company-name">{user?.company_name || "MUFASA LOGISTICS"}</span>
              </div>
            </div>
            <div className="logout-modal-actions">
              <button 
                className="logout-modal-cancel"
                onClick={handleLogoutCancel}
              >
                Cancel
              </button>
              <button 
                className="logout-modal-confirm"
                onClick={handleLogoutConfirm}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`side-nav ${isCollapsed ? "collapsed" : ""}`}>
        <button className="sidebar-toggle" onClick={onToggle}>
          <span className="toggle-icon">{isCollapsed ? "☰" : "✕"}</span>
        </button>

        <div className="nav-header">
          <div className="company-logo">
            <div className="user-icon">
              <i className="fas fa-user"></i>
            </div>
            {!isCollapsed && (
              <div className="company-info">
                <span className="company-email">{user?.user_email || "gkmangezi09@gmail.com"}</span>
                <span className="toolbar-subtitle">{user?.company_name || "MUFASA LOGISTICS"}</span>
              </div>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <div 
              key={item.id} 
              className="nav-item-wrapper"
              ref={item.id === "settings" ? settingsRef : null}
            >
              <button
                className={`nav-item ${activeScreen === item.id ? "active" : ""} ${
                  item.hasSubmenu ? 'has-submenu' : ''
                } ${(item.id === "settings" && showSettingsSubmenu) ? 'submenu-open' : ''}`}
                onClick={(e) => handleItemClick(item, e)}
                title={isCollapsed ? item.label : ""}
              >
                <span className="nav-icon" style={{ color: item.color }}>
                  <i className={item.icon}></i>
                </span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                {!isCollapsed && item.hasSubmenu && (
                  <i 
                    className={`fas fa-chevron-down submenu-arrow ${
                      showSettingsSubmenu ? 'rotated' : ''
                    }`} 
                  />
                )}
              </button>
              
              {/* Settings Sub-menu - visible when expanded and submenu is open */}
              {!isCollapsed && item.hasSubmenu && showSettingsSubmenu && item.id === "settings" && (
                <div className="sub-menu">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      className="nav-item sub-item"
                      onClick={(e) => handleSubItemClick(subItem, e)}
                    >
                      <span className="nav-icon" style={{ color: subItem.color }}>
                        <i className={subItem.icon}></i>
                      </span>
                      <span className="nav-label sub-item-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Settings Popup for collapsed state */}
        {isCollapsed && showSettingsPopup && (
          <div 
            className="settings-popup"
            ref={popupRef}
          >
            <div className="settings-popup-header">
              <span>Account Settings</span>
            </div>
            {menuItems.find(item => item.id === "settings")?.subItems.map((subItem) => (
              <button
                key={subItem.id}
                className="settings-popup-item"
                onClick={(e) => handlePopupItemClick(subItem, e)}
              >
                <span className="settings-popup-icon" style={{ color: subItem.color }}>
                  <i className={subItem.icon}></i>
                </span>
                <span className="settings-popup-label">{subItem.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="nav-footer">
          {footerItems.map((item) => (
            <button
              key={item.id}
              className="nav-item"
              onClick={(e) => handleItemClick(item, e)}
              title={isCollapsed ? item.label : ""}
            >
              <span className="nav-icon" style={{ color: item.color }}>
                <i className={item.icon}></i>
              </span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SideNav;