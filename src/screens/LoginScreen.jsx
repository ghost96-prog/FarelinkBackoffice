// LoginScreen.jsx
import React, { useState } from "react";
import "../css/LoginScreen.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl"; // Import your API link
// Import images
import bg2 from "../assets/bg2.jpg";
import flogo from "../assets/flogo.png";

const LoginScreen = () => {
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false,
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    let isValid = true;

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({ email: "", password: "" });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoggingIn(true);

    try {
      const apiLink = Apilink.getLink();
      
      // Check internet connection (basic check for web)
      if (!navigator.onLine) {
        showAlert("No Internet Connection!");
        setIsLoggingIn(false);
        return;
      }

      const response = await fetch(`${apiLink}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showAlert(errorData.message || "Login failed");
        setIsLoggingIn(false);
        return;
      }

      const data = await response.json();
      
      // Prepare session data similar to React Native app
      const admin = {
        name: data.admin.name,
        email: data.admin.email,
        role: data.admin.role,
        id: data.admin.id,
        password: password,
      };

      const sessionData = {
        company: data.company,
        admin,
        token: data.token,
      };

      console.log("Login data:", data);
      console.log("Session data:", sessionData);

      // Use auth context for login
      const result = await login(sessionData);
      
      if (result.success) {
        // Navigate to dashboard on successful login
        navigate('/dashboard');
      } else {
        showAlert(result.error || "Login failed");
      }

    } catch (error) {
      console.error("Login error:", error);
      showAlert("Network error. Please try again.");
    } finally {
      setIsLoggingIn(false);
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleNavigateToRegister = () => {
    navigate('/register'); // if you have register route
  };

  const handleNavigateToForgotPassword = () => {
    navigate('/forgot-password'); // if you have forgot password route
  };

  const loading = isLoggingIn || authLoading;

  return (
    <div
      className="finalScreenContainer"
      style={{
        backgroundImage: `url(${bg2})`,
      }}
    >
      {/* Alert Modal for validation errors */}
      {showAlertModal && (
        <div className="modalOverlay">
          <div className="alertModal">
            <div className="alertModalContent">
              <h3 className="alertModalTitle">Login Error</h3>
              <p className="alertModalMessage">{alertMessage}</p>
              <button
                className="alertModalButton"
                onClick={() => setShowAlertModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loading && (
        <div className="modalOverlay">
          <div className="loadingModal">
            <div className="loadingSpinner"></div>
            <h3 className="loadingModalTitle">Logging In</h3>
            <p className="loadingModalMessage">
              Please wait while we sign you in...
            </p>
          </div>
        </div>
      )}

      <div className="finalCardlogin">
        <div className="finalContentLogin">
          {/* Logo Section */}
          <div className="logoSection">
            <img className="logo" src={flogo} alt="FareLink Logo" />
            <h1 className="welcomeTitle">Welcome to FareLink</h1>
            <p className="welcomeSubtitle">Sign in to your account</p>

            <div className="taglineContainer">
              <span className="sparkle">✨</span>
              <span className="taglineText">Smart • Secure • Simple</span>
              <span className="sparkle">✨</span>
            </div>
          </div>

          {/* Form Section */}
          <div className="loginFormSection">
            {/* Email Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.email ? "loginInputFocused" : ""
                } ${errors.email ? "loginInputError" : ""}`}
              >
                <span className="loginInputIcon">📧</span>
                <input
                  type="email"
                  className="loginInputField"
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
                <div className="loginErrorText">{errors.email}</div>
              )}
            </div>

            {/* Password Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.password ? "loginInputFocused" : ""
                } ${errors.password ? "loginInputError" : ""}`}
              >
                <span className="loginInputIcon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="loginInputField"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors({ ...errors, password: "" });
                    }
                  }}
                  onFocus={() => handleFocus("password")}
                  onBlur={() => handleBlur("password")}
                  onKeyPress={handleKeyPress}
                />
                <button
                  type="button"
                  className="loginPasswordToggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="loginToggleIcon">
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <div className="loginErrorText">{errors.password}</div>
              )}
            </div>

            {/* Login Button */}
            <div className="loginButtonWrapper">
              <button
                className={`loginActionButton ${
                  loading ? "loginButtonDisabled" : ""
                }`}
                onClick={handleLogin}
                disabled={loading}
              >
                <span className="loginButtonText">
                  {loading ? "SIGNING IN..." : "SIGN IN"}
                </span>
                <span className="loginChevron">→</span>
              </button>
            </div>

            {/* Links */}
            <div className="loginLinksContainer">
              <a
                className="loginForgotPassword"
                onClick={handleNavigateToForgotPassword}
              >
                Forgot Password?
              </a>
              <a className="loginForgotPassword" onClick={handleNavigateToRegister}>
                New to Farelink? Register?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;