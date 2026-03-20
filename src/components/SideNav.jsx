import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/SideNav.css";

const SideNav = ({ activeScreen, onScreenChange, isCollapsed, onToggle }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutModalRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  // All menu items including settings subitems as main items
  const menuItems = [
    {
      id: "dashboard",
      label: "Overall Bus Overview",
      icon: "fas fa-chart-bar",
      color: "#1a5b7b",
      path: "/dashboard"
    },
    // Settings subitems as individual menu items
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
      id: "systemSettings",
      label: "System Settings",
      icon: "fas fa-sliders-h",
      color: "#34495e",
      path: "/settings"
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

  // Close logout modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutModal && logoutModalRef.current && !logoutModalRef.current.contains(event.target)) {
        setShowLogoutModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutModal]);

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
    } else if (item.id === "buses") {
      ensureAuthenticatedNavigation("/buses");
    } else if (item.id === "employees") {
      ensureAuthenticatedNavigation("/employees");
    } else if (item.id === "routes") {
      ensureAuthenticatedNavigation("/routes");
    } else if (item.id === "subRoutes") {
      ensureAuthenticatedNavigation("/subroutes");
    } else if (item.id === "subscription_list") {
      ensureAuthenticatedNavigation("/subscription_list");
    } else if (item.id === "currency") {
      ensureAuthenticatedNavigation("/currency");
    } else if (item.id === "systemSettings") {
      ensureAuthenticatedNavigation("/settings");
    } else if (item.id === "logout") {
      // Show logout confirmation modal
      setShowLogoutModal(true);
      return;
    }
    
    // Close sidebar on mobile after selection
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

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && window.innerWidth <= 768 && (
        <div
          className="side-nav-overlay"
          onClick={() => {
            onToggle();
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
            <div key={item.id} className="nav-item-wrapper">
              <button
                className={`nav-item ${activeScreen === item.id ? "active" : ""}`}
                onClick={(e) => handleItemClick(item, e)}
                title={isCollapsed ? item.label : ""}
              >
                <span className="nav-icon" style={{ color: item.color }}>
                  <i className={item.icon}></i>
                </span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </div>
          ))}
        </nav>

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