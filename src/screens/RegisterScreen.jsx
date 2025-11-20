// RegisterScreen.jsx
import React, { useState, useEffect } from "react";
import "../css/RegisterScreen.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";

// Import images
import bg2 from "../assets/bg2.jpg";
import flogo from "../assets/flogo.png";

const RegisterScreen = () => {
  const { register, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({
    name: false,
    companyName: false,
    address: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState({
    name: "",
    companyName: "",
    address: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation function
  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ""));
  };

  // Password validation function
  const validatePassword = (password) => {
    return (
      password.length >= 8 &&
      /\d/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  // Check if form is valid
  const checkFormValidity = () => {
    const isValid =
      name.trim().length >= 2 &&
      companyName.trim().length >= 2 &&
      address.trim().length >= 2 &&
      validateEmail(email) &&
      validatePhone(phone) &&
      validatePassword(password) &&
      password === confirmPassword &&
      confirmPassword.length > 0;

    setIsFormValid(isValid);
  };

  // Real-time validation
  useEffect(() => {
    const newErrors = { ...errors };

    // Name validation
    if (name && name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else {
      newErrors.name = "";
    }

    // Company Name validation
    if (companyName && companyName.trim().length < 2) {
      newErrors.companyName = "Company name must be at least 2 characters";
    } else {
      newErrors.companyName = "";
    }

    // Address validation
    if (address && address.trim().length < 2) {
      newErrors.address = "Address must be at least 2 characters";
    } else {
      newErrors.address = "";
    }

    // Email validation
    if (email && !validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    } else {
      newErrors.email = "";
    }

    // Phone validation
    if (phone && !validatePhone(phone)) {
      newErrors.phone = "Please enter a valid phone number";
    } else {
      newErrors.phone = "";
    }

    // Password validation
    if (password) {
      if (password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/\d/.test(password)) {
        newErrors.password = "Password must contain a number";
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        newErrors.password = "Password must contain a special character";
      } else {
        newErrors.password = "";
      }
    } else {
      newErrors.password = "";
    }

    // Confirm password validation
    if (confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    } else {
      newErrors.confirmPassword = "";
    }

    setErrors(newErrors);
  }, [name, address, companyName, email, phone, password, confirmPassword]);

  // Check form validity when fields change
  useEffect(() => {
    checkFormValidity();
  }, [name, address, companyName, email, phone, password, confirmPassword]);

  const validateFormOnSubmit = () => {
    const newErrors = {
      name: "",
      companyName: "",
      address: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    };

    let isValid = true;

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Full name is required";
      isValid = false;
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
      isValid = false;
    }

    // CompanyName validation
    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required";
      isValid = false;
    } else if (companyName.trim().length < 2) {
      newErrors.companyName = "Company name must be at least 2 characters";
      isValid = false;
    }

    // Address validation
    if (!address.trim()) {
      newErrors.address = "Address is required";
      isValid = false;
    } else if (address.trim().length < 2) {
      newErrors.address = "Address must be at least 2 characters";
      isValid = false;
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Phone validation
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
      isValid = false;
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Please enter a valid phone number";
      isValid = false;
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password =
        "Password must be at least 8 characters with a number and special character";
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleRegister = async () => {
    // Clear previous errors
    setErrors({
      name: "",
      address: "",
      companyName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });

    // Validate form on submit
    if (!validateFormOnSubmit()) {
      const errorFields = Object.values(errors).filter((error) => error);
      if (errorFields.length >= 3) {
        showAlert("Please check all fields and try again");
      }
      return;
    }

    setIsRegistering(true);

    try {
      const apiLink = Apilink.getLink();
      
      // Check internet connection
      if (!navigator.onLine) {
        showAlert("No Internet Connection!");
        setIsRegistering(false);
        return;
      }

      const userData = {
        company_name: companyName,
        company_phone: phone,
        company_address: address,
        admin_name: name,
        admin_email: email,
        admin_password: password,
      };

      console.log("Registration data:", userData);

      const response = await fetch(`${apiLink}/register-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showAlert(errorData.message || "Registration failed");
        setIsRegistering(false);
        return;
      }

      const data = await response.json();
      const admin = {
        name: data.admin.name,
        email: data.admin.email,
        role: data.admin.role,
        id: data.admin.id,
        password: userData.admin_password,
      };

      const sessionData = {
        company: data.company,
        admin,
        token: data.token,
      };

      // Use auth context for registration
      const result = await register(sessionData);
      
      if (result.success) {
        // Navigate to dashboard on successful registration
        navigate('/dashboard');
      } else {
        showAlert(result.error || "Registration failed");
      }

    } catch (error) {
      console.error("Registration error:", error);
      showAlert("Network error. Please try again.");
    } finally {
      setIsRegistering(false);
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
      handleRegister();
    }
  };

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  // Password strength indicators
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = () => {
    const strength = getPasswordStrength();
    switch (strength) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Medium";
      case 3: return "Strong";
      default: return "Very Weak";
    }
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    switch (strength) {
      case 1: return "#F44336";
      case 2: return "#FF9800";
      case 3: return "#4CAF50";
      default: return "#999";
    }
  };

  const loading = isRegistering || authLoading;

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
              <h3 className="alertModalTitle">Registration Error</h3>
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
            <h3 className="loadingModalTitle">Registration in progress</h3>
            <p className="loadingModalMessage">
              Please wait while we register you...
            </p>
          </div>
        </div>
      )}

      <div className="finalCardlogin">
        <div className="finalContentLogin">
          {/* Logo Section */}
          <div className="logoSection">
            <img className="logo" src={flogo} alt="FareLink Logo" />
            <h1 className="welcomeTitle">Join FareLink Today</h1>
            <p className="welcomeSubtitle">Create your account</p>

            <div className="taglineContainer">
              <span className="sparkle">✨</span>
              <span className="taglineText">Smart Ticketing • Smooth Journeys</span>
              <span className="sparkle">✨</span>
            </div>
          </div>

          {/* Form Section */}
          <div className="loginFormSection">
            <h2 className="registerTitle">Create Account</h2>

            {/* Name Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.name ? "loginInputFocused" : ""
                } ${errors.name ? "loginInputError" : ""} ${
                  name && !errors.name ? "loginInputValid" : ""
                }`}
              >
                <span className="loginInputIcon">👤</span>
                <input
                  type="text"
                  className="loginInputField"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors({ ...errors, name: "" });
                    }
                  }}
                  onFocus={() => handleFocus("name")}
                  onBlur={() => handleBlur("name")}
                  onKeyPress={handleKeyPress}
                />
                {name.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.name ? "❌" : "✅"}
                  </span>
                )}
              </div>
              {errors.name && (
                <div className="loginErrorText">{errors.name}</div>
              )}
            </div>

            {/* Company Name Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.companyName ? "loginInputFocused" : ""
                } ${errors.companyName ? "loginInputError" : ""} ${
                  companyName && !errors.companyName ? "loginInputValid" : ""
                }`}
              >
                <span className="loginInputIcon">🏢</span>
                <input
                  type="text"
                  className="loginInputField"
                  placeholder="Company Name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) {
                      setErrors({ ...errors, companyName: "" });
                    }
                  }}
                  onFocus={() => handleFocus("companyName")}
                  onBlur={() => handleBlur("companyName")}
                  onKeyPress={handleKeyPress}
                />
                {companyName.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.companyName ? "❌" : "✅"}
                  </span>
                )}
              </div>
              {errors.companyName && (
                <div className="loginErrorText">{errors.companyName}</div>
              )}
            </div>

            {/* Address Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.address ? "loginInputFocused" : ""
                } ${errors.address ? "loginInputError" : ""} ${
                  address && !errors.address ? "loginInputValid" : ""
                }`}
              >
                <span className="loginInputIcon">📍</span>
                <input
                  type="text"
                  className="loginInputField"
                  placeholder="Address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) {
                      setErrors({ ...errors, address: "" });
                    }
                  }}
                  onFocus={() => handleFocus("address")}
                  onBlur={() => handleBlur("address")}
                  onKeyPress={handleKeyPress}
                />
                {address.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.address ? "❌" : "✅"}
                  </span>
                )}
              </div>
              {errors.address && (
                <div className="loginErrorText">{errors.address}</div>
              )}
            </div>

            {/* Phone Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.phone ? "loginInputFocused" : ""
                } ${errors.phone ? "loginInputError" : ""} ${
                  phone && !errors.phone ? "loginInputValid" : ""
                }`}
              >
                <span className="loginInputIcon">📱</span>
                <input
                  type="tel"
                  className="loginInputField"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) {
                      setErrors({ ...errors, phone: "" });
                    }
                  }}
                  onFocus={() => handleFocus("phone")}
                  onBlur={() => handleBlur("phone")}
                  onKeyPress={handleKeyPress}
                />
                {phone.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.phone ? "❌" : "✅"}
                  </span>
                )}
              </div>
              {errors.phone && (
                <div className="loginErrorText">{errors.phone}</div>
              )}
            </div>

            {/* Email Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.email ? "loginInputFocused" : ""
                } ${errors.email ? "loginInputError" : ""} ${
                  email && !errors.email ? "loginInputValid" : ""
                }`}
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
                {email.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.email ? "❌" : "✅"}
                  </span>
                )}
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
                } ${errors.password ? "loginInputError" : ""} ${
                  password && !errors.password ? "loginInputValid" : ""
                }`}
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

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="passwordStrengthContainer">
                  <div className="passwordStrengthLabel">Password Strength:</div>
                  <div className="passwordStrengthBar">
                    {[1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`strengthSegment ${
                          index <= getPasswordStrength() ? "active" : ""
                        }`}
                        style={{
                          backgroundColor: index <= getPasswordStrength() 
                            ? getPasswordStrengthColor() 
                            : "#e0e0e0"
                        }}
                      />
                    ))}
                  </div>
                  <div 
                    className="passwordStrengthText"
                    style={{ color: getPasswordStrengthColor() }}
                  >
                    {getPasswordStrengthText()}
                  </div>
                </div>
              )}

              {errors.password && (
                <div className="loginErrorText">{errors.password}</div>
              )}

              {/* Password Requirements */}
              <div className="requirementContainer">
                <div className="requirementTitle">Password must contain:</div>
                <div className="requirementItem">
                  <span className="requirementIcon">
                    {password.length >= 8 ? "✅" : "⚪"}
                  </span>
                  <span className={`requirementText ${password.length >= 8 ? "requirementMet" : ""}`}>
                    Minimum 8 characters
                  </span>
                </div>
                <div className="requirementItem">
                  <span className="requirementIcon">
                    {/\d/.test(password) ? "✅" : "⚪"}
                  </span>
                  <span className={`requirementText ${/\d/.test(password) ? "requirementMet" : ""}`}>
                    At least one number
                  </span>
                </div>
                <div className="requirementItem">
                  <span className="requirementIcon">
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "✅" : "⚪"}
                  </span>
                  <span className={`requirementText ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "requirementMet" : ""}`}>
                    At least one special character
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="loginInputGroup">
              <div
                className={`loginInputWrapper ${
                  isFocused.confirmPassword ? "loginInputFocused" : ""
                } ${errors.confirmPassword ? "loginInputError" : ""} ${
                  confirmPassword && !errors.confirmPassword ? "loginInputValid" : ""
                }`}
              >
                <span className="loginInputIcon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="loginInputField"
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
                  onKeyPress={handleKeyPress}
                />
                {confirmPassword.length > 0 && (
                  <span className="loginInputStatus">
                    {errors.confirmPassword ? "❌" : "✅"}
                  </span>
                )}
              </div>
              {errors.confirmPassword && (
                <div className="loginErrorText">{errors.confirmPassword}</div>
              )}
            </div>

            {/* Register Button */}
            <div className="loginButtonWrapper">
              <button
                className={`loginActionButton ${
                  !isFormValid || loading ? "loginButtonDisabled" : ""
                }`}
                onClick={handleRegister}
                disabled={!isFormValid || loading}
              >
                <span className="loginButtonText">
                  {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                </span>
                <span className="loginChevron">→</span>
              </button>
            </div>

            {/* Login Link */}
            <div className="loginLinksContainer">
              <button
                className="loginForgotPassword"
                onClick={handleNavigateToLogin}
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this line at the end to fix the export error
export default RegisterScreen;