import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";
import AlertModal from "../components/AlertModal";
import AlertSuccess from "../components/AlertSuccess";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import "../css/SettingsScreen.css";

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [accessRightsModalVisible, setAccessRightsModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiptId, setReceiptId] = useState(null);

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("settings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  // Receipt Data State
  const [receiptData, setReceiptData] = useState({
    logo: null,
    headerInfo: "",
    footerInfo: "",
  });

  // Alert states
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Employee Roles and Permissions
  const [employeeRoles, setEmployeeRoles] = useState([
    {
      id: "driver",
      name: "Driver",
      icon: "🚗",
      color: "#007bff",
      permissions: {
        canSellTickets: true,
        canViewReports: false,
        canManageRoutes: false,
        canManageEmployees: false,
        canManageBuses: false,
        canAccessSettings: false,
        canDoReprint: false,
      },
    },
    {
      id: "conductor",
      name: "Conductor",
      icon: "👤",
      color: "#28a745",
      permissions: {
        canSellTickets: true,
        canViewReports: true,
        canManageRoutes: false,
        canManageEmployees: false,
        canManageBuses: false,
        canAccessSettings: false,
        canDoReprint: false,
      },
    },
    {
      id: "admin",
      name: "Admin",
      icon: "⚙️",
      color: "#6f42c1",
      permissions: {
        canSellTickets: true,
        canViewReports: true,
        canManageRoutes: true,
        canManageEmployees: true,
        canManageBuses: true,
        canAccessSettings: true,
        canDoReprint: false,
      },
    },
    {
      id: "owner",
      name: "Owner",
      icon: "🏢",
      color: "#fd7e14",
      permissions: {
        canSellTickets: true,
        canViewReports: true,
        canManageRoutes: true,
        canManageEmployees: true,
        canManageBuses: true,
        canAccessSettings: true,
        canDoReprint: false,
      },
    },
    {
      id: "supervisor",
      name: "Supervisor",
      icon: "👁️",
      color: "#20c997",
      permissions: {
        canSellTickets: true,
        canViewReports: true,
        canManageRoutes: true,
        canManageEmployees: false,
        canManageBuses: true,
        canAccessSettings: false,
        canDoReprint: false,
      },
    },
    {
      id: "inspector",
      name: "Inspector",
      icon: "🔍",
      color: "#e83e8c",
      permissions: {
        canSellTickets: false,
        canViewReports: true,
        canManageRoutes: false,
        canManageEmployees: false,
        canManageBuses: false,
        canAccessSettings: false,
        canDoReprint: false,
      },
    },
  ]);

  // Settings options
  const settingsOptions = [
    {
      id: 1,
      title: "Receipt Customization",
      subtitle: "Upload logo and set header/footer information",
      icon: "🧾",
      action: "receipt",
      gradientColors: ["#1a5b7b", "#276482"],
    },
    {
      id: 2,
      title: "Employee Access Rights",
      subtitle: "Manage permissions for different roles",
      icon: "🔒",
      action: "accessRights",
      gradientColors: ["#2a6f8f", "#3288ad"],
    },
  ];

  useEffect(() => {
    if (receiptModalVisible || accessRightsModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [receiptModalVisible, accessRightsModalVisible]);

  useEffect(() => {
    loadReceiptData();
    loadAccessRights();
  }, []);

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const loadReceiptData = async () => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();

      const response = await fetch(`${apiLink}/receiptdata`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const receipt = data[0];
          setReceiptId(receipt.id);
          setReceiptData({
            logo: receipt.logo ? `data:image/jpeg;base64,${receipt.logo}` : null,
            headerInfo: receipt.headerInfo || "",
            footerInfo: receipt.footerInfo || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading receipt data:", error);
    }
  };

  const saveReceiptData = async (data) => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();

      let base64Logo = data.logo;
      if (data.logo && data.logo.startsWith("file://")) {
        base64Logo = await convertImageToBase64(data.logo);
      } else if (data.logo && data.logo.startsWith("data:image")) {
        base64Logo = data.logo.split(",")[1];
      }

      const receiptData = {
        logo: base64Logo,
        headerInfo: data.headerInfo,
        footerInfo: data.footerInfo,
      };

      let response;
      if (receiptId) {
        response = await fetch(`${apiLink}/receiptdata/${receiptId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(receiptData),
        });
      } else {
        response = await fetch(`${apiLink}/receiptdata`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(receiptData),
        });
      }

      if (response.ok) {
        const result = await response.json();
        if (!receiptId && result._id) {
          setReceiptId(result._id);
        }
        return result;
      } else {
        throw new Error("Failed to save receipt data");
      }
    } catch (error) {
      console.error("Error saving receipt data:", error);
      throw error;
    }
  };

  const convertImageToBase64 = async (imageUri) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          resolve(reader.result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  const loadAccessRights = async () => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();

      const response = await fetch(`${apiLink}/employeeroles`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const serverRoles = await response.json();
        if (serverRoles && serverRoles.length > 0) {
          const mergedRoles = employeeRoles.map((defaultRole) => {
            const serverRole = serverRoles.find(
              (role) => role.id === defaultRole.id
            );
            if (serverRole) {
              return {
                ...defaultRole,
                permissions: {
                  ...defaultRole.permissions,
                  ...serverRole.permissions,
                },
              };
            }
            return defaultRole;
          });
          setEmployeeRoles(mergedRoles);
        }
      }
    } catch (error) {
      console.error("Error loading access rights:", error);
    }
  };

  const saveAccessRights = async (role) => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();

      const response = await fetch(
        `${apiLink}/employeeroles/update-permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(role),
        }
      );

      if (response.ok) {
        const result = await response.json();
        showSuccess("Access rights updated successfully");
        return result;
      } else {
        throw new Error("Failed to save access rights");
      }
    } catch (error) {
      console.error("Error saving access rights:", error);
      throw error;
    }
  };

  const handleChooseImage = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const updatedReceiptData = {
              ...receiptData,
              logo: event.target.result,
            };
            setReceiptData(updatedReceiptData);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } catch (error) {
      console.error("Error choosing image:", error);
      showAlert("Failed to select image");
    }
  };

  const handleSaveReceipt = async () => {
    setLoading(true);
    try {
      await saveReceiptData(receiptData);
      showSuccess("Receipt settings saved successfully!");
      setReceiptModalVisible(false);
    } catch (error) {
      showAlert("Failed to save receipt settings");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (roleId, permission, value) => {
    const updatedRoles = employeeRoles.map((role) => {
      if (role.id === roleId) {
        const updatedRole = {
          ...role,
          permissions: {
            ...role.permissions,
            [permission]: value,
          },
        };

        if (selectedRole && selectedRole.id === roleId) {
          setSelectedRole(updatedRole);
        }

        return updatedRole;
      }
      return role;
    });
    setEmployeeRoles(updatedRoles);
  };

  const handleSaveAccessRights = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await saveAccessRights(selectedRole);
      setAccessRightsModalVisible(false);
      setSelectedRole(null);
    } catch (error) {
      showAlert("Failed to save access rights");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionPress = (option) => {
    if (option.action === "receipt") {
      setReceiptModalVisible(true);
    } else if (option.action === "accessRights") {
      setAccessRightsModalVisible(true);
    }
  };

  const PermissionSwitch = ({ roleId, permission, value, label }) => (
    <div className="settings-permission-row">
      <div className="settings-permission-label">{label}</div>
      <label className="settings-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handlePermissionChange(roleId, permission, e.target.checked)}
        />
        <span className="settings-slider"></span>
      </label>
    </div>
  );

  const RoleCard = ({ role }) => (
    <div 
      className="settings-role-card"
      onClick={() => setSelectedRole(role)}
    >
      <div className="settings-role-gradient">
        <div className="settings-role-header">
          <div 
            className="settings-role-icon-container"
            style={{ backgroundColor: `${role.color}20` }}
          >
            <span className="settings-role-icon">{role.icon}</span>
          </div>
          <div className="settings-role-info">
            <div className="settings-role-name">{role.name}</div>
            <div className="settings-role-description">
              {Object.values(role.permissions).filter(Boolean).length} permissions enabled
            </div>
          </div>
          <span className="settings-chevron-forward">›</span>
        </div>
      </div>
    </div>
  );

  const ReceiptModal = () => (
    <div className="settings-modal-overlay">
      <div 
        className="settings-modal-content"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">Receipt Customization</div>
          <button
            onClick={() => setReceiptModalVisible(false)}
            className="settings-close-button"
          >
            <span className="settings-close-icon">✕</span>
          </button>
        </div>

        <div className="settings-modal-body">
          {/* Logo Upload */}
          <div className="settings-upload-section">
            <div className="settings-section-title">Company Logo</div>
            <div 
              className="settings-upload-container"
              onClick={handleChooseImage}
            >
              {receiptData.logo ? (
                <img 
                  src={receiptData.logo} 
                  alt="Company Logo" 
                  className="settings-logo-image"
                />
              ) : (
                <div className="settings-upload-placeholder">
                  <span className="settings-camera-icon">📷</span>
                  <div className="settings-upload-text">Click to upload logo</div>
                </div>
              )}
            </div>
          </div>

          {/* Header Information */}
          <div className="settings-input-section">
            <div className="settings-section-title">Header Information</div>
            <textarea
              className="settings-text-input"
              placeholder="Enter company name, address, contact info..."
              value={receiptData.headerInfo}
              onChange={(e) =>
                setReceiptData({ ...receiptData, headerInfo: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Footer Information */}
          <div className="settings-input-section">
            <div className="settings-section-title">Footer Information</div>
            <textarea
              className="settings-text-input"
              placeholder="Enter thank you message, terms, website..."
              value={receiptData.footerInfo}
              onChange={(e) =>
                setReceiptData({ ...receiptData, footerInfo: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>

        <div className="settings-modal-footer">
          <button
            className="settings-cancel-button"
            onClick={() => setReceiptModalVisible(false)}
          >
            Cancel
          </button>
          <button
            className={`settings-save-button ${loading ? 'settings-save-button-disabled' : ''}`}
            onClick={handleSaveReceipt}
            disabled={loading}
          >
            {loading ? (
              <div className="settings-loading-spinner-small"></div>
            ) : (
              <>
                <span className="settings-save-icon">💾</span>
                Save Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const AccessRightsModal = () => (
    <div className="settings-modal-overlay">
      <div 
        className="settings-modal-content"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">Employee Access Rights</div>
          <button
            onClick={() => setAccessRightsModalVisible(false)}
            className="settings-close-button"
          >
            <span className="settings-close-icon">✕</span>
          </button>
        </div>

        <div className="settings-modal-body">
          {!selectedRole ? (
            <div className="settings-roles-list">
              {employeeRoles.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          ) : (
            <div className="settings-role-details">
              <div className="settings-role-header-detail">
                <button
                  className="settings-back-button"
                  onClick={() => setSelectedRole(null)}
                >
                  <span className="settings-back-icon">←</span>
                </button>
                <div 
                  className="settings-role-icon-container"
                  style={{ backgroundColor: `${selectedRole.color}20` }}
                >
                  <span className="settings-role-icon">{selectedRole.icon}</span>
                </div>
                <div className="settings-role-name-large">
                  {selectedRole.name}
                </div>
              </div>

              <div className="settings-permissions-section">
                <div className="settings-section-title">Permissions</div>

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canSellTickets"
                  value={selectedRole.permissions.canSellTickets}
                  label="Sell Tickets"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canViewReports"
                  value={selectedRole.permissions.canViewReports}
                  label="View Reports"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canDoReprint"
                  value={selectedRole.permissions.canDoReprint}
                  label="Reprint Tickets"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canManageRoutes"
                  value={selectedRole.permissions.canManageRoutes}
                  label="Manage Routes"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canManageEmployees"
                  value={selectedRole.permissions.canManageEmployees}
                  label="Manage Employees"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canManageBuses"
                  value={selectedRole.permissions.canManageBuses}
                  label="Manage Buses"
                />

                <PermissionSwitch
                  roleId={selectedRole.id}
                  permission="canAccessSettings"
                  value={selectedRole.permissions.canAccessSettings}
                  label="Access Settings"
                />
              </div>
            </div>
          )}
        </div>

        {selectedRole && (
          <div className="settings-modal-footer">
            <button
              className="settings-cancel-button"
              onClick={() => setSelectedRole(null)}
            >
              Back
            </button>
            <button
              className={`settings-save-button ${loading ? 'settings-save-button-disabled' : ''}`}
              onClick={handleSaveAccessRights}
              disabled={loading}
            >
              {loading ? (
                <div className="settings-loading-spinner-small"></div>
              ) : (
                <>
                  <span className="settings-save-icon">💾</span>
                  Save Permissions
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Settings & Management"
        subtitle="Configure your FareLink system"
        companyName={user?.company_name || "Company"}
        onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={loading}
      />
      
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="settings-container">
          <div className="settings-content">
            {/* Header */}
            <div className="settings-header">
              <div className="settings-header-content">
                <button className="settings-back-button" onClick={() => navigate(-1)}>
                  <span className="settings-back-icon">←</span>
                  Back
                </button>
                
                <div className="settings-header-title-container">
                  <div className="settings-header-title">Settings & Management</div>
                  <div className="settings-header-subtitle">
                    Configure your FareLink system
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Options */}
            <div className="settings-scroll-content">
              <div className="settings-card-container">
                {settingsOptions.map((option, index) => (
                  <div 
                    key={option.id}
                    className="settings-option-card"
                    onClick={() => handleOptionPress(option)}
                  >
                    <div 
                      className="settings-icon-container"
                      style={{ background: `linear-gradient(135deg, ${option.gradientColors[0]}, ${option.gradientColors[1]})` }}
                    >
                      <span className="settings-option-icon">{option.icon}</span>
                    </div>

                    <div className="settings-option-text-container">
                      <div className="settings-option-title">{option.title}</div>
                      <div className="settings-option-subtitle">{option.subtitle}</div>
                    </div>

                    <span className="settings-chevron-forward">›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {receiptModalVisible && <ReceiptModal />}
        {accessRightsModalVisible && <AccessRightsModal />}

        <AlertModal
          visible={showAlertModal}
          title="Error"
          message={alertMessage}
          buttonText="Got It"
          onPress={() => setShowAlertModal(false)}
          type="error"
        />

        <AlertSuccess
          visible={showSuccessModal}
          title="Success"
          message={successMessage}
          buttonText="Got It"
          onPress={() => setShowSuccessModal(false)}
          type="success"
        />
      </div>
    </div>
  );
};

export default SettingsScreen;