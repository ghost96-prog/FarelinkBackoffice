import React, { useState, useEffect } from "react";
import "../css/ProcessingModal.css";

const ProcessingModal = ({
  visible = false,
  title = "Processing",
  subtitle = "Please wait while we process your request...",
  type = "processing",
  customTitle,
  customSubtitle,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [scale, setScale] = useState(0.8);
  const [opacity, setOpacity] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Get title and subtitle based on type
  const getTitle = () => {
    if (customTitle) return customTitle;
    switch (type) {
      case "creating":
      case "saving":
        return "Creating...";
      case "updating":
        return "Updating...";
      case "deleting":
        return "Deleting...";
      case "processing":
      default:
        return "Processing";
    }
  };

  const getSubtitle = () => {
    if (customSubtitle) return customSubtitle;
    switch (type) {
      case "creating":
      case "saving":
        return "Please wait while we create your item...";
      case "updating":
        return "Please wait while we update your item...";
      case "deleting":
        return "Please wait while we delete your item...";
      case "processing":
      default:
        return "Please wait while we process your request...";
    }
  };

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setScale(1);
      setOpacity(1);
      
      // Start rotation animation
      const rotateInterval = setInterval(() => {
        setRotation(prev => (prev + 10) % 360);
      }, 50);

      return () => clearInterval(rotateInterval);
    } else {
      setScale(0.8);
      setOpacity(0);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!isVisible) return null;

  return (
    <div className="processing-modal">
      <div 
        className="processing-backdrop"
        style={{ opacity }}
      >
        <div className="processing-container">
          <div 
            className="processing-content"
            style={{
              transform: `scale(${scale})`,
              opacity: opacity
            }}
          >
            {/* Animated Loading Spinner */}
            <div className="loading-spinner-container">
              <div 
                className="loading-spinner"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div 
                  className="spinner-gradient"
                  style={{ 
                    background: "linear-gradient(135deg, #2ecc71, #3498db, #9b59b6)" 
                  }}
                />
              </div>

              {/* Outer Ring */}
              <div className="spinner-outer-ring" />
            </div>

            {/* Processing Text */}
            <div className="processing-title">{getTitle()}</div>
            <div className="processing-subtitle">{getSubtitle()}</div>

            {/* Animated Dots */}
            <div className="dots-container">
              <div className="dot dot-1" />
              <div className="dot dot-2" />
              <div className="dot dot-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModal;