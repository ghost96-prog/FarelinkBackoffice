import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";
import AlertModal from "../components/AlertModal";
import AlertSuccess from "../components/AlertSuccess";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import "../css/SubscriptionPaymentScreen.css";

// Import images directly
import innbucksImage from "../assets/innbucks.png";
import ecocashImage from "../assets/ecocash.png";
import omariImage from "../assets/omari.png";

function SubscriptionPaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bus } = location.state || {}; // Get bus info from navigation state
  const { user } = useAuth();

  // State for subscription data
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [innbucksVisible, setInnbucksVisible] = useState(false);
  const [ecocashVisible, setEcocashVisible] = useState(false);
  const [paypalVisible, setPaypalVisible] = useState(false);
  const [omariVisible, setOmariVisible] = useState(false);
  const [subscriptionDisabled, setSubscriptionDisabled] = useState(false);
  const [paymentsZero, setPaymentsZero] = useState(false);
  const [errors, setErrors] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTimeData, setRemainingTimeData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [token, setToken] = useState("");
  const [latestPayment, setLatestPayment] = useState(null);
  const [latestPaymentStatus, setLatestPaymentStatus] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("subscriptions");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  // Subscription plans data
  const subscriptionPlans = [
    {
      id: "basic",
      title: "Basic",
      price: 9.99,
      period: "1 Month Access",
      value: 9.99,
      apiPlan: "Basic",
      apiPeriod: 1,
    },
    {
      id: "standard",
      title: "Standard",
      price: 49.99,
      period: "6 Months Access",
      value: 49.99,
      apiPlan: "Standard",
      apiPeriod: 6,
    },
    {
      id: "premium",
      title: "Premium",
      price: 99.99,
      period: "12 Months Access",
      value: 99.99,
      apiPlan: "Premium",
      apiPeriod: 12,
    },
  ];

  useEffect(() => {
    if (bus?.id) {
      fetchSubscriptionData();
    }
  }, [bus?.id]);

  useEffect(() => {
    if (isModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (selectedOption) {
      setTotalCost(selectedOption);
    }
  }, [selectedOption]);

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  // Fetch subscription data from server
  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const apiLink = Apilink.getLink();
      const userToken = user.token;

      // Fetch subscription for this bus
      const subscriptionResponse = await fetch(
        `${apiLink}/subscription/${bus.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      const subscriptionData = await subscriptionResponse.json();

      let subscription = null;
      if (subscriptionResponse.ok && subscriptionData.success) {
        // If multiple subscriptions, find the most recent one
        let subscriptionToUse = subscriptionData.subscription;

        if (Array.isArray(subscriptionData.subscription)) {
          subscriptionToUse = subscriptionData.subscription.reduce(
            (latest, current) => {
              const latestDate = new Date(latest.expirationDate);
              const currentDate = new Date(current.expirationDate);
              return currentDate > latestDate ? current : latest;
            }
          );
        }

        subscription = {
          id: subscriptionToUse.id,
          status: subscriptionToUse.status,
          expirationDate: new Date(subscriptionToUse.expirationDate),
          plan: subscriptionToUse.plan || "Basic",
          amount: parseFloat(subscriptionToUse.amount) || 0,
          period: subscriptionToUse.period || 1,
          paymentMethod: subscriptionToUse.paymentMethod,
          remainingTime: subscriptionData.remainingTime,
        };
      }

      setSubscription(subscription);

      // Update payment status based on subscription
      if (subscription) {
        setLatestPayment({
          id: bus.id,
          amount: subscription.amount,
          date: subscription.expirationDate,
          status: subscription.status,
          period: getPeriodFromPlan(subscription.plan),
        });

        setLatestPaymentStatus(subscription.status);
        setSubscriptionDisabled(subscription.status === "Active");

        if (subscription.status === "Expired") {
          setSelectedOption(null);
        } else {
          setSelectedOption(subscription.amount);
        }
      } else {
        setPaymentsZero(true);
        setSubscriptionDisabled(false);
        setLatestPaymentStatus("Expired");
      }

      // Calculate remaining time
      if (subscription && subscription.expirationDate) {
        const now = new Date();
        const expiration = new Date(subscription.expirationDate);
        const diff = expiration - now;

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          setRemainingTimeData({ days, hours, minutes });
        } else {
          setRemainingTimeData(null);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      showAlert("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert plan to period in months
  const getPeriodFromPlan = (plan) => {
    switch (plan) {
      case "Basic":
        return 1;
      case "Standard":
        return 6;
      case "Premium":
        return 12;
      default:
        return 1;
    }
  };

  const specialCharacters = [
    "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "~"
  ];
  const alphabeticalLetters = "abcdefghijklmnopqrstuvwxyz".split("");
  const digits = "1234567890".split("");

  const validateInput = () => {
    let isValid = true;

    let digitCount = 0;
    let specialCharCount = 0;
    let letterCount = 0;

    for (let char of paymentMessage) {
      if (digits.includes(char)) {
        digitCount++;
      } else if (specialCharacters.includes(char)) {
        specialCharCount++;
      } else if (alphabeticalLetters.includes(char.toLowerCase())) {
        letterCount++;
      }
    }

    if (digitCount < 3 || specialCharCount < 1 || letterCount < 1) {
      isValid = false;
    }

    return isValid;
  };

  // Handle subscription
  const handleSubscription = async () => {
    try {
      setIsLoading(true);

      const isValidInput = validateInput();
      if (!isValidInput) {
        showAlert("Voucher Validation Failed. Request for a new Token.");
        return;
      }

      if (!selectedOption) {
        showAlert("Please select a subscription plan");
        return;
      }

      if (!paymentType) {
        showAlert("Please select a payment method");
        return;
      }

      if (paymentMessage.trim() === "") {
        showAlert("Please enter your payment token");
        return;
      }

      // Find the selected plan details
      const selectedPlan = subscriptionPlans.find(
        (plan) => plan.value === selectedOption
      );

      if (!selectedPlan) {
        showAlert("Invalid plan selected");
        setIsLoading(false);
        return;
      }

      // Prepare subscription data for server submission
      const subscriptionData = {
        busId: parseInt(bus.id),
        plan: selectedPlan.apiPlan,
        amount: parseFloat(selectedOption),
        period: selectedPlan.apiPeriod,
        paymentMethod: paymentType,
        paymentToken: paymentMessage,
        date: new Date().toISOString(),
      };

      const apiLink = Apilink.getLink();
      const userToken = user.token;

      // Make actual API call to server
      const response = await fetch(`${apiLink}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccess("Subscription activated successfully!");
        // Refresh subscription data to get updated information
        await fetchSubscriptionData();

        // Reset form
        setPaymentMessage("");
        setPaymentType("");
        setSelectedOption(null);
      } else {
        throw new Error(result.message || "Failed to activate subscription");
      }
    } catch (error) {
      console.error("Error handling subscription:", error);
      showAlert(error.message || "Error handling subscription. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get plan name from amount
  const getPlanFromAmount = (amount) => {
    const plan = subscriptionPlans.find((p) => p.value === amount);
    return plan ? plan.apiPlan : "Basic";
  };

  // Helper function to get period from amount
  const getPeriodFromAmount = (amount) => {
    const plan = subscriptionPlans.find((p) => p.value === amount);
    return plan ? plan.apiPeriod : 1;
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSubscriptionData()
      .then(() => {
        setIsRefreshing(false);
      })
      .catch((error) => {
        console.error(error);
        setIsRefreshing(false);
      });
  };

  const handlePaymentTypeSelection = (type) => {
    setPaymentType(type);
    switch (type) {
      case "innbucks":
        setInnbucksVisible(true);
        setEcocashVisible(false);
        setPaypalVisible(false);
        setOmariVisible(false);
        break;
      case "ecocash":
        setInnbucksVisible(false);
        setEcocashVisible(true);
        setPaypalVisible(false);
        setOmariVisible(false);
        break;
      case "paypal":
        setInnbucksVisible(false);
        setEcocashVisible(false);
        setPaypalVisible(true);
        setOmariVisible(false);
        break;
      case "omari":
        setInnbucksVisible(false);
        setEcocashVisible(false);
        setPaypalVisible(false);
        setOmariVisible(true);
        break;
      default:
        break;
    }
  };

  const generate15DigitToken = () => {
    let token = "";
    for (let i = 0; i < 15; i++) {
      token += Math.floor(Math.random() * 10).toString();
    }
    return token;
  };

  const handlePlanSelection = (planValue) => {
    setSelectedOption(planValue);
    setToken(generate15DigitToken());
    setIsModalVisible(true);
  };

  const handleTokenPress = () => {
    if (!selectedOption) {
      showAlert("Please select a subscription plan first");
      return;
    }
    setToken(generate15DigitToken());
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("Copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleBackPress = () => {
    navigate(-1);
  };

  const openWhatsApp = () => {
    const phoneNumber = "+263783556354";
    const message = "Hello! I need assistance with my bus subscription.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openPhoneDialer = () => {
    const phoneNumber = "+263783556354";
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const openWhatsAppWithToken = () => {
    if (!token) {
      showAlert("Please generate a token first by clicking 'Get Token'");
      return;
    }

    const phoneNumber = "+263783556354";
    const plan = getPlanFromAmount(selectedOption);
    const busInfo = `${bus?.busname} (${bus?.numberplate})`;

    const message =
      `Hello! I would love to subscribe for my bus:\n\n` +
      `Bus: ${busInfo}\n` +
      `Plan: ${plan} ($${selectedOption})\n` +
      `Period: ${getPeriodFromAmount(selectedOption)} months\n\n` +
      `Here is my payment token: ${token}`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
    handleCloseModal();
  };

  const openEmailClient = () => {
    const emailAddress = "gkmangezi09@gmail.com";
    const subject = "Bus Subscription Assistance";
    const body = "Hello NexusPOS Team,\n\nI need help with my bus subscription.";
    const url = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_self');
  };

  const PaymentOption = ({ plan }) => (
    <div
      className={`subscription-payment-option ${
        selectedOption === plan.value ? 'subscription-selected-option' : ''
      } ${subscriptionDisabled ? 'subscription-option-disabled' : ''}`}
      onClick={() => !subscriptionDisabled && handlePlanSelection(plan.value)}
    >
      <div className="subscription-option-content">
        <div className="subscription-option-header">
          <div className="subscription-option-title">{plan.title}</div>
          <div className="subscription-radio-button">
            {selectedOption === plan.value && (
              <div className="subscription-radio-button-selected" />
            )}
          </div>
        </div>
        <div className="subscription-option-period">{plan.period}</div>
        <div className="subscription-option-price">${plan.price}</div>
      </div>
    </div>
  );

  const TokenModal = () => (
    <div className="subscription-modal-overlay">
      <div 
        className="subscription-modal-content"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="subscription-modal-title">Your Payment Token</div>
        <div className="subscription-modal-subtitle">
          COPY and select the PLAN you wish to subscribe for and send this
          Token to our Whatsapp for payment processing
        </div>

        <div 
          className="subscription-token-display"
          onClick={() => copyToClipboard(token)}
        >
          <div className="subscription-token-text">{token}</div>
          <span className="subscription-copy-icon">📋</span>
        </div>

        <button
          className="subscription-modal-whatsapp-button"
          onClick={openWhatsAppWithToken}
        >
          <span className="subscription-whatsapp-icon">💬</span>
          Send via WhatsApp
        </button>

        <div className="subscription-modal-note">
          Note: Copy this token or send via WhatsApp for payment processing
        </div>

        <button
          className="subscription-modal-button"
          onClick={handleCloseModal}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Bus Subscription Payment"
        subtitle="Manage your bus subscription"
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
        <div className="subscription-payment-container">
          <div className="subscription-payment-content">
            {/* Header */}
            <div className="subscription-payment-header">
              <div className="subscription-payment-header-content">
                <button className="subscription-back-button" onClick={handleBackPress}>
                  <span className="subscription-back-icon">←</span>
                  Back
                </button>
                {/* Refresh Button */}
                <button 
                  className="subscription-refresh-button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <div className="subscription-refresh-spinner"></div>
                  ) : (
                    <span className="subscription-refresh-icon">🔄</span>
                  )}
                  Refresh
                </button>
                <div className="subscription-payment-title-container">
                  <div className="subscription-payment-title">Bus Subscription</div>
                </div>

                <button
                  className="subscription-get-token-button"
                  onClick={handleTokenPress}
                >
                  Get Token
                </button>
              </div>
            </div>

            <div className="subscription-payment-scroll">
              {/* Bus Info Card */}
              <div className="subscription-status-card">
                <div className="subscription-status-header">
                  <div className="subscription-status-title">Bus Information</div>
                  <div className="subscription-bus-badge">
                    <span className="subscription-bus-emoji">🚌</span>
                  </div>
                </div>

                <div className="subscription-status-details">
                  <div className="subscription-status-detail-row">
                    <span className="subscription-detail-icon">🏢</span>
                    <div className="subscription-status-detail-text">
                      {bus?.busname || "N/A"}
                    </div>
                  </div>

                  <div className="subscription-status-detail-row">
                    <span className="subscription-detail-icon">🔢</span>
                    <div className="subscription-status-detail-text">
                      PLATE: {bus?.numberplate || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Status Card */}
              <div className="subscription-status-card">
                <div className="subscription-status-header">
                  <div className="subscription-status-title">Subscription Status</div>
                  <div 
                    className="subscription-status-badge"
                    style={{
                      backgroundColor:
                        latestPaymentStatus === "Active"
                          ? "#28a745"
                          : latestPaymentStatus === "Expired"
                          ? "#dc3545"
                          : "#6c757d",
                    }}
                  >
                    {latestPaymentStatus || "Checking..."}
                  </div>
                </div>

                <div className="subscription-status-details">
                  {subscription && (
                    <div className="subscription-status-detail-row">
                      <span className="subscription-detail-icon">📅</span>
                      <div className="subscription-status-detail-text">
                        Expires: {new Date(subscription.expirationDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {remainingTimeData && latestPaymentStatus === "Active" && (
                    <div className="subscription-status-detail-row">
                      <span className="subscription-detail-icon">⏰</span>
                      <div className="subscription-status-remaining-text">
                        Remaining: {remainingTimeData.days}d{" "}
                        {remainingTimeData.hours}h {remainingTimeData.minutes}m
                      </div>
                    </div>
                  )}

                  {subscription && (
                    <div className="subscription-status-detail-row">
                      <span className="subscription-detail-icon">💳</span>
                      <div className="subscription-status-detail-text">
                        Current Plan: {subscription.plan.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Options */}
              <div className="subscription-section">
                <div className="subscription-section-title">Subscription Plans</div>
                <div className="subscription-section-subtitle">
                  Choose a plan for your bus
                </div>

                {subscriptionPlans.map((plan) => (
                  <PaymentOption key={plan.id} plan={plan} />
                ))}

                <div className="subscription-total-container">
                  <div className="subscription-total-label">Total:</div>
                  <div className="subscription-total-amount">${totalCost}</div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="subscription-section">
                <div className="subscription-section-title">Payment Methods</div>
                <div className="subscription-section-subtitle">
                  Select your preferred payment method
                </div>

                <div className="subscription-payment-methods">
                  <button
                    className={`subscription-payment-method ${
                      paymentType === "innbucks" ? 'subscription-selected-payment-method' : ''
                    }`}
                    onClick={() => handlePaymentTypeSelection("innbucks")}
                  >
                    <img 
                      src={innbucksImage} 
                      alt="Innbucks"
                      className="subscription-payment-icon"
                    />
                    <div className="subscription-payment-method-text">Innbucks</div>
                  </button>

                  <button
                    className={`subscription-payment-method ${
                      paymentType === "ecocash" ? 'subscription-selected-payment-method' : ''
                    }`}
                    onClick={() => handlePaymentTypeSelection("ecocash")}
                  >
                    <img 
                      src={ecocashImage} 
                      alt="EcoCash"
                      className="subscription-payment-icon"
                    />
                    <div className="subscription-payment-method-text">EcoCash</div>
                  </button>

                  <button
                    className={`subscription-payment-method ${
                      paymentType === "omari" ? 'subscription-selected-payment-method' : ''
                    }`}
                    onClick={() => handlePaymentTypeSelection("omari")}
                  >
                    <img 
                      src={omariImage} 
                      alt="OMARI"
                      className="subscription-payment-icon"
                    />
                    <div className="subscription-payment-method-text">OMARI</div>
                  </button>
                </div>

                {innbucksVisible && (
                  <div className="subscription-payment-instructions">
                    <div className="subscription-instructions-title">
                      Innbucks Payment Instructions
                    </div>
                    <div className="subscription-instructions-text">
                      1. Dial *569#<br />
                      2. Select Send Money<br />
                      3. Enter 0783556354 (Germany Mangezi)<br />
                      4. Enter Amount<br />
                      5. Use reference: {bus?.numberplate || "BUSSUB"}<br />
                      6. Copy the transaction Confirmation text and paste it on our
                      Whatsapp to receive your Voucher
                    </div>
                  </div>
                )}

                {ecocashVisible && (
                  <div className="subscription-payment-instructions">
                    <div className="subscription-instructions-title">
                      EcoCash Payment Instructions
                    </div>
                    <div className="subscription-instructions-text">
                      1. Dial *151*1*1#<br />
                      2. Enter 0783556354<br />
                      3. Enter Amount<br />
                      4. Enter your PIN<br />
                      5. Copy the transaction confirmation text and send it to our
                      whatsapp to receive your Voucher
                    </div>
                  </div>
                )}

                {omariVisible && (
                  <div className="subscription-payment-instructions">
                    <div className="subscription-instructions-title">
                      Omari Payment Instructions
                    </div>
                    <div className="subscription-instructions-text">
                      Dial *707# on your phone.<br />
                      Select "Send Money".<br />
                      Choose recipient: 0783556354<br />
                      Enter amount: ${totalCost}<br />
                      Use reference: {bus?.numberplate || "BUSSUB"}<br />
                      Confirm with your PIN.<br />
                      Copy the transaction confirmation text and send to our
                      whatsapp to receive your voucher.
                    </div>
                  </div>
                )}

                {paymentType && (
                  <div className="subscription-token-input-container">
                    <textarea
                      className="subscription-token-input"
                      placeholder="Paste your payment voucher here"
                      value={paymentMessage}
                      onChange={(e) => setPaymentMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {/* Subscription Button */}
              <div className="subscription-button-container">
                <button
                  className={`subscription-subscribe-button ${
                    (subscriptionDisabled || !selectedOption || !paymentType) ? 'subscription-subscribe-button-disabled' : ''
                  }`}
                  onClick={handleSubscription}
                  disabled={
                    subscriptionDisabled ||
                    !selectedOption ||
                    !paymentType ||
                    isLoading
                  }
                >
                  {isLoading ? (
                    <div className="subscription-loading-spinner-small"></div>
                  ) : (
                    subscriptionDisabled ? "Already Subscribed" : "Subscribe Now"
                  )}
                </button>
              </div>

              {/* Support Section */}
              <div className="subscription-support-section">
                <div className="subscription-support-title">Need Help?</div>
                <div className="subscription-support-subtitle">
                  Contact our support team for assistance
                </div>

                <div className="subscription-support-options">
                  <button
                    className="subscription-support-option"
                    onClick={openWhatsApp}
                  >
                    <span className="subscription-whatsapp-icon">💬</span>
                    <div className="subscription-support-option-text">WhatsApp</div>
                  </button>

                  <button
                    className="subscription-support-option"
                    onClick={openPhoneDialer}
                  >
                    <span className="subscription-call-icon">📞</span>
                    <div className="subscription-support-option-text">Call Us</div>
                  </button>

                  <button
                    className="subscription-support-option"
                    onClick={openEmailClient}
                  >
                    <span className="subscription-email-icon">📧</span>
                    <div className="subscription-support-option-text">Email</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Modal */}
        {isModalVisible && <TokenModal />}

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
}

export default SubscriptionPaymentScreen;