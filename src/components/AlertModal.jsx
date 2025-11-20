import React from "react";
import "../css/AlertModal.css";

const AlertModal = ({
  visible,
  title,
  message,
  buttonText,
  onPress,
  type = "info",
}) => {
  if (!visible) return null;

  const iconConfig = {
    error: {
      icon: "❌",
      gradient: ["#FF416C", "#FF4B2B"],
      iconBg: "#FF6B6B",
    },
    warning: {
      icon: "⚠️",
      gradient: ["#FFB347", "#FF8C00"],
      iconBg: "#FFA500",
    },
    success: {
      icon: "✅",
      gradient: ["#4CAF50", "#2E7D32"],
      iconBg: "#4CAF50",
    },
    info: {
      icon: "ℹ️",
      gradient: ["#2196F3", "#1976D2"],
      iconBg: "#2196F3",
    },
  };

  const { icon, gradient, iconBg } = iconConfig[type] || iconConfig.info;

  return (
    <div className="alert-overlay">
      <div className="alert-modal-container alert-bounce-in">
        <div 
          className="alert-gradient-background"
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        >
          <div 
            className="alert-icon-container"
            style={{ backgroundColor: iconBg }}
          >
            <div className="alert-pulse-animation">
              <span className="alert-icon">{icon}</span>
            </div>
          </div>

          <div className="alert-title">{title}</div>

          <div className="alert-message-container">
            {typeof message === "string" ? (
              <div className="alert-message-text">{message}</div>
            ) : (
              message
            )}
          </div>

          <button onClick={onPress} className="alert-button">
            <div 
              className="alert-button-gradient"
              style={{ background: "linear-gradient(90deg, white, #f1f1f1)" }}
            >
              <div className="alert-button-text" style={{ color: iconBg }}>
                {buttonText}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;