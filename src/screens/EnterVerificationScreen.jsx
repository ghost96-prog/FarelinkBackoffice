// screens/EnterVerificationScreen.jsx
import React, { useState, useRef, useEffect } from "react";
import "../css/EnterVerificationScreen.css";
import { useNavigate, useLocation } from "react-router-dom";
import Apilink from "../baseUrl/baseUrl";

// Import images
import bg2 from "../assets/bg2.jpg";
import flogo from "../assets/flogo.png";

const EnterVerificationScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState({
    verificationCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);

  useEffect(() => {
    // Get email from route params or location state
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const showAlert = (title, message, type = "success") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const handleCodeChange = (text, index) => {
    // If pasting a multi-digit code
    if (text.length > 1) {
      handlePasteCode(text);
      return;
    }

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1].focus();
    }

    // Clear error when user starts typing
    if (errors.verificationCode) {
      setErrors({ ...errors, verificationCode: "" });
    }
  };

  const handlePasteCode = async (pastedText = null) => {
    try {
      let codeToPaste = pastedText;

      // If no text provided, get from clipboard
      if (!codeToPaste) {
        codeToPaste = await navigator.clipboard.readText();
      }

      // Clean the code - remove non-numeric characters and take first 4 digits
      const cleanCode = codeToPaste.replace(/\D/g, "").substring(0, 4);

      if (cleanCode.length === 4) {
        const newCode = cleanCode.split("");
        setVerificationCode(newCode);

        // Focus the last input
        if (inputRefs.current[3]) {
          inputRefs.current[3].focus();
        }

        // Clear any verification errors
        if (errors.verificationCode) {
          setErrors({ ...errors, verificationCode: "" });
        }
      } else {
        alert("Invalid Code", "Please copy a valid 4-digit OTP code.");
      }
    } catch (error) {
      console.error("Paste error:", error);
      alert("Error", "Failed to paste OTP code. Please try again.");
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrors({
      verificationCode: "",
      newPassword: "",
      confirmPassword: "",
    });

    let isValid = true;
    const newErrors = { ...errors };

    // Validate verification code
    const otpCode = verificationCode.join("");
    if (otpCode.length !== 4) {
      newErrors.verificationCode = "Please enter the 4-digit verification code";
      isValid = false;
    }

    // Validate new password
    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required";
      isValid = false;
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = "Password must be at least 6 characters";
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
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

      const response = await fetch(`${apiLink}/resetpassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      // Success - show success modal
      showAlert("Success", "Password reset successfully!");
    } catch (error) {
      console.error("Reset password error:", error);
      showAlert(
        "Error",
        error.message || "Failed to reset password. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertClose = () => {
    setShowAlertModal(false);
    // If it was a success alert, navigate to login screen
    if (alertType === "success") {
      navigate('/login');
    }
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

  return (
    <div
      className="finalScreenContainer"
      style={{
        backgroundImage: `url(${bg2})`,
      }}
    >
      {/* Alert Modal */}
      {showAlertModal && (
        <div className="modalOverlay">
          <div className={`alertModal ${alertType === 'error' ? 'alertModalError' : ''}`}>
            <div className="alertModalContent">
              <h3 className="alertModalTitle">{alertTitle}</h3>
              <p className="alertModalMessage">{alertMessage}</p>
              <button
                className="alertModalButton"
                onClick={handleAlertClose}
              >
                Continue
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
            <h3 className="loadingModalTitle">Resetting Password</h3>
            <p className="loadingModalMessage">
              Please wait while we update your password...
            </p>
          </div>
        </div>
      )}

      <div className="finalCardVerification">
        <div className="finalContentVerification">
          {/* Logo Section */}
          <div className="logoSection">
            <img className="logo" src={flogo} alt="FareLink Logo" />
            <h1 className="welcomeTitle">FareLink</h1>
            <p className="welcomeSubtitle">Smart Ticketing • Smooth Journeys</p>
          </div>

          {/* Form Section */}
          <div className="verificationFormSection">
            <h2 className="verificationTitle">Reset Password</h2>
            <p className="verificationSubtitle">
              Enter the 4-digit code sent to {email} and set a new password.
            </p>

            {/* Verification Code Inputs */}
            <div className="verificationInputGroup">
              <div className="codeHeader">
                <span className="codeLabel">Verification Code</span>
                <button
                  className="pasteButton"
                  onClick={handlePasteCode}
                >
                  <span className="pasteIcon">📋</span>
                  <span className="pasteText">Paste OTP</span>
                </button>
              </div>

              <div className="codeContainer">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    className={`codeInput ${
                      verificationCode[index] ? "codeInputFilled" : ""
                    } ${errors.verificationCode ? "codeInputError" : ""}`}
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyPress(e, index)}
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                  />
                ))}
              </div>

              <p className="pasteHint">
                💡 Tip: You can paste the entire 4-digit code into any input field
              </p>

              {errors.verificationCode && (
                <div className="errorText">{errors.verificationCode}</div>
              )}
            </div>

            {/* New Password Input */}
            <div className="verificationInputGroup">
              <div
                className={`verificationInputWrapper ${
                  isFocused.newPassword ? "verificationInputFocused" : ""
                } ${errors.newPassword ? "verificationInputError" : ""}`}
              >
                <span className="verificationInputIcon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="verificationInputField"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors({ ...errors, newPassword: "" });
                    }
                  }}
                  onFocus={() => handleFocus("newPassword")}
                  onBlur={() => handleBlur("newPassword")}
                />
                <button
                  type="button"
                  className="passwordToggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="toggleIcon">
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </span>
                </button>
              </div>
              {errors.newPassword && (
                <div className="errorText">{errors.newPassword}</div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="verificationInputGroup">
              <div
                className={`verificationInputWrapper ${
                  isFocused.confirmPassword ? "verificationInputFocused" : ""
                } ${errors.confirmPassword ? "verificationInputError" : ""}`}
              >
                <span className="verificationInputIcon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="verificationInputField"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: "" });
                    }
                  }}
                  onFocus={() => handleFocus("confirmPassword")}
                  onBlur={() => handleBlur("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <div className="errorText">{errors.confirmPassword}</div>
              )}
            </div>

            {/* Reset Password Button */}
            <div className="verificationButtonWrapper">
              <button
                className={`verificationActionButton ${
                  isLoading ? "verificationButtonDisabled" : ""
                }`}
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                <span className="verificationButtonText">
                  {isLoading ? "RESETTING..." : "RESET PASSWORD"}
                </span>
                <span className="verificationButtonIcon">🔄</span>
              </button>
            </div>

            {/* Back to Login Link */}
            <div className="verificationLinksContainer">
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

export default EnterVerificationScreen;