// screens/ForgotPasswordScreen.jsx
import React, { useState } from "react";
import "../css/ForgotPasswordScreen.css";
import { useNavigate } from "react-router-dom";
import Apilink from "../baseUrl/baseUrl";

// Import images
import bg2 from "../assets/bg2.jpg";
import flogo from "../assets/flogo.png";

const ForgotPasswordScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isFocused, setIsFocused] = useState({
    email: false,
  });
  const [errors, setErrors] = useState({
    email: "",
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [otpCode, setOtpCode] = useState("");

  const navigate = useNavigate();

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showAlert = (title, message, type = "success", otp = "") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setOtpCode(otp);
    
    if (type === "success") {
      setShowOTPModal(true);
    } else {
      setShowAlertModal(true);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(otpCode);
      alert("Copied!", "OTP code copied to clipboard");
    } catch (error) {
      alert("Error", "Failed to copy OTP");
    }
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrors({ email: "" });

    // Validate form
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    } else if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);

    try {
      const apiLink = Apilink.getLink();
      
      // Check internet connection
      if (!navigator.onLine) {
        showAlert("Error", "No Internet Connection!", "error");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${apiLink}/forgotpassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      // Success - show success modal with OTP
      showAlert(
        "OTP Sent Successfully",
        `We've sent a 4-digit verification code to your email. Please copy this code and use it to reset your password.`,
        "success",
        data.otp.toString()
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      showAlert(
        "Error",
        error.message || "Failed to send OTP. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertClose = () => {
    setShowAlertModal(false);
  };

  const handleOTPModalClose = () => {
    setShowOTPModal(false);
    // Navigate to verification screen with email
    navigate('/enter-verification', { state: { email } });
  };

  const handleFocus = (field) => {
    setIsFocused({ ...isFocused, [field]: true });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleBlur = (field) => {
    setIsFocused({ ...isFocused, [field]: false });
  };

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleResetPassword();
    }
  };

  return (
    <div
      className="finalScreenContainer"
      style={{
        backgroundImage: `url(${bg2})`,
      }}
    >
      {/* Regular Alert Modal for errors */}
      {showAlertModal && (
        <div className="modalOverlay">
          <div className="alertModal alertModalError">
            <div className="alertModalContent">
              <h3 className="alertModalTitle">{alertTitle}</h3>
              <p className="alertModalMessage">{alertMessage}</p>
              <button
                className="alertModalButton"
                onClick={handleAlertClose}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom OTP Alert Modal for success */}
      {showOTPModal && (
        <div className="modalOverlay">
          <div className="otpModal">
            <div className="otpModalHeader">
              <span className="otpModalIcon">📧</span>
              <h3 className="otpModalTitle">{alertTitle}</h3>
            </div>

            <p className="otpModalMessage">{alertMessage}</p>

            {/* OTP Display Box */}
            <div className="otpContainer">
              <div className="otpLabel">Your OTP Code:</div>
              <div className="otpDisplay">
                <div className="otpCode">{otpCode}</div>
                <button className="copyButton" onClick={copyToClipboard}>
                  <span className="copyIcon">📋</span>
                  <span className="copyText">Copy</span>
                </button>
              </div>
              <div className="otpInstruction">
                📋 Please copy this code and paste it in the next screen
              </div>
            </div>

            <div className="otpModalActions">
              <button className="otpModalButton" onClick={handleOTPModalClose}>
                <span className="otpButtonText">
                  Continue to Reset Password
                </span>
                <span className="otpButtonIcon">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {isLoading && (
        <div className="modalOverlay">
          <div className="loadingModal">
            <div className="loadingSpinner"></div>
            <h3 className="loadingModalTitle">Sending Reset Link</h3>
            <p className="loadingModalMessage">
              Please wait while we send password reset instructions...
            </p>
          </div>
        </div>
      )}

      <div className="finalCardForgotPassword">
        <div className="finalContentForgotPassword">
          {/* Logo Section */}
          <div className="logoSection">
            <img className="logo" src={flogo} alt="FareLink Logo" />
            <h1 className="welcomeTitle">FareLink</h1>
            <p className="welcomeSubtitle">Smart Ticketing • Smooth Journeys</p>
          </div>

          {/* Form Section */}
          <div className="forgotPasswordFormSection">
            <h2 className="forgotPasswordTitle">Reset Your Password</h2>
            <p className="forgotPasswordSubtitle">
              Enter your email address and we'll send you a verification code to
              reset your password.
            </p>

            {/* Email Input */}
            <div className="forgotPasswordInputGroup">
              <div
                className={`forgotPasswordInputWrapper ${
                  isFocused.email ? "forgotPasswordInputFocused" : ""
                } ${errors.email ? "forgotPasswordInputError" : ""}`}
              >
                <span className="forgotPasswordInputIcon">📧</span>
                <input
                  type="email"
                  className="forgotPasswordInputField"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors({ ...errors, email: "" });
                    }
                  }}
                  onFocus={() => handleFocus("email")}
                  onBlur={() => handleBlur("email")}
                  onKeyPress={handleKeyPress}
                />
              </div>
              {errors.email && (
                <div className="errorText">{errors.email}</div>
              )}
            </div>

            {/* Reset Button */}
            <div className="forgotPasswordButtonWrapper">
              <button
                className={`forgotPasswordActionButton ${
                  isLoading ? "forgotPasswordButtonDisabled" : ""
                }`}
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                <span className="forgotPasswordButtonText">
                  {isLoading ? "SENDING..." : "SEND VERIFICATION CODE"}
                </span>
                <span className="forgotPasswordButtonIcon">📤</span>
              </button>
            </div>

            {/* Back to Login Link */}
            <div className="forgotPasswordLinksContainer">
              <button
                className="backToLoginLink"
                onClick={handleNavigateToLogin}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;