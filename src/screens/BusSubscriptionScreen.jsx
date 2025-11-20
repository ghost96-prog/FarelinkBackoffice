import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";
import AlertModal from "../components/AlertModal";
import AlertSuccess from "../components/AlertSuccess";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import "../css/BusSubscriptionScreen.css";

const BusSubscriptionListScreen = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const { user } = useAuth();
  
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

  // Filter options
  const filterOptions = [
    { id: "all", label: "All Buses" },
    { id: "active", label: "Active" },
    { id: "expired", label: "Expired" },
    { id: "expiring7days", label: "Expiring Soon" },
  ];

  // Calculate active and expired counts
  const activeBusesCount = buses.filter(
    (bus) => bus.subscription?.status === "Active"
  ).length;
  const expiredBusesCount = buses.filter(
    (bus) => bus.subscription?.status === "Expired"
  ).length;

  useEffect(() => {
    fetchBusesAndSubscriptions();
  }, []);

  useEffect(() => {
    if (showTrialModal) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [showTrialModal]);

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const fetchBusesAndSubscriptions = async () => {
    setLoading(true);
    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      // Fetch buses
      let busesResponse = await fetch(`${apiLink}/buses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const busesData = await busesResponse.json();

      if (!busesResponse.ok) {
        console.log("Failed to fetch buses:", busesData);
        setBuses([]);
        return;
      }

      // Fetch subscription for each bus individually
      const busesWithSubscriptions = await Promise.all(
        busesData.buses.map(async (bus) => {
          try {
            // Fetch subscription for this specific bus
            const subscriptionResponse = await fetch(
              `${apiLink}/subscription/${bus.id}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const subscriptionData = await subscriptionResponse.json();

            if (subscriptionResponse.ok && subscriptionData.success) {
              // If multiple subscriptions are returned, find the most recent one
              let subscriptionToUse = subscriptionData.subscription;

              // Check if we have multiple subscriptions and find the one with latest expiration
              if (Array.isArray(subscriptionData.subscription)) {
                subscriptionToUse = subscriptionData.subscription.reduce(
                  (latest, current) => {
                    const latestDate = new Date(latest.expirationDate);
                    const currentDate = new Date(current.expirationDate);
                    return currentDate > latestDate ? current : latest;
                  }
                );
              }

              // Use the status directly from API, don't calculate manually
              return {
                id: bus.id.toString(),
                busname: bus.busname || "Unknown Bus",
                numberplate: bus.numberplate || "N/A",
                subscription: {
                  id: subscriptionToUse.id,
                  status: subscriptionToUse.status, // Use API status
                  expirationDate: new Date(subscriptionToUse.expirationDate),
                  plan: subscriptionToUse.plan || "Basic",
                  amount: parseFloat(subscriptionToUse.amount) || 0,
                  period: subscriptionToUse.period || 1,
                  paymentMethod: subscriptionToUse.paymentMethod,
                  remainingTime: subscriptionData.remainingTime,
                },
              };
            } else {
              // No subscription found - set null data
              return {
                id: bus.id.toString(),
                busname: bus.busname || "Unknown Bus",
                numberplate: bus.numberplate || "N/A",
                subscription: null,
              };
            }
          } catch (error) {
            console.log(
              `Error fetching subscription for bus ${bus.id}:`,
              error
            );
            return {
              id: bus.id.toString(),
              busname: bus.busname || "Unknown Bus",
              numberplate: bus.numberplate || "N/A",
              subscription: null,
            };
          }
        })
      );

      setBuses(busesWithSubscriptions);
    } catch (error) {
      console.log("Error fetching buses and subscriptions:", error);
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  const activateFreeTrial = async () => {
    if (!selectedBus) return;

    setActivatingTrial(true);
    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      const trialData = {
        busId: parseInt(selectedBus.id),
        plan: "trial",
        amount: 0.01,
        period: 1,
        paymentMethod: "trial",
        paymentToken: "trial",
        date: new Date().toISOString(),
      };

      const response = await fetch(`${apiLink}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(trialData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the bus with new subscription data using the correct response structure
        const updatedBuses = buses.map((bus) => {
          if (bus.id === selectedBus.id) {
            const expirationDate = new Date(
              result.bus.subscription.expirationDate
            );
            const now = new Date();
            const status = expirationDate > now ? "Active" : "Expired";

            return {
              ...bus,
              subscription: {
                id: result.bus.subscription.id || Date.now(), // Use ID from response or fallback
                status: status,
                expirationDate: expirationDate,
                plan: result.bus.subscription.plan,
                amount: parseFloat(result.bus.subscription.amount),
                period: result.bus.subscription.period,
                paymentMethod: result.bus.subscription.paymentMethod || "trial",
                remainingTime: result.bus.subscription.remainingTime,
              },
            };
          }
          return bus;
        });

        setBuses(updatedBuses);
        setShowTrialModal(false);
        showSuccess("Free trial activated successfully!");
      } else {
        throw new Error(result.message || "Failed to activate trial");
      }
    } catch (error) {
      console.log("Error activating free trial:", error);
      showAlert("Failed to activate free trial. Please try again.");
    } finally {
      setActivatingTrial(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusesAndSubscriptions();
    setRefreshing(false);
  };

  const filteredBuses = useMemo(() => {
    let filtered = [...buses];

    // Apply status filter
    if (currentFilter === "active") {
      filtered = filtered.filter(
        (bus) => bus.subscription?.status === "Active"
      );
    } else if (currentFilter === "expired") {
      filtered = filtered.filter(
        (bus) => bus.subscription?.status === "Expired"
      );
    } else if (currentFilter === "expiring7days") {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (bus) =>
          bus.subscription?.status === "Active" &&
          bus.subscription?.expirationDate <= sevenDaysFromNow
      );
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (bus) =>
          bus.busname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bus.numberplate.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [currentFilter, searchQuery, buses]);

  const handleFilterChange = (filterId) => {
    setCurrentFilter(filterId);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const cancelSearch = () => {
    setSearchQuery("");
    setShowSearch(false);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const calculateTimeRemaining = (subscription) => {
    if (!subscription) {
      return {
        text: "No Subscription",
        color: "#6c757d",
        fullText: "No active subscription",
      };
    }

    // Use remainingTime from API if available
    if (subscription.remainingTime) {
      const { days, hours, minutes } = subscription.remainingTime;
      const fullText = `${days.toString().padStart(2, "0")}days :${hours
        .toString()
        .padStart(2, "0")}hrs:${minutes.toString().padStart(2, "0")}min`;

      if (days > 0) {
        return {
          text: `${days}d ${hours}h`,
          fullText: fullText,
          color: days <= 7 ? "#ffc107" : "#28a745",
        };
      }

      if (hours > 0) {
        return {
          text: `${hours}h ${minutes}m`,
          fullText: fullText,
          color: "#ffc107",
        };
      }

      return {
        text: `${minutes}m`,
        fullText: fullText,
        color: "#dc3545",
      };
    }

    // Fallback calculation if remainingTime is not available
    const now = new Date();
    const diff = subscription.expirationDate - now;

    if (diff <= 0)
      return { text: "Expired", color: "#dc3545", fullText: "00:00:00" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Format as DD:HH:MM
    const formattedDays = days.toString().padStart(2, "0");
    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");

    const fullText = `${formattedDays}days :${formattedHours}hrs:${formattedMinutes}min`;

    if (days > 0) {
      return {
        text: `${days}d ${hours}h`,
        fullText: fullText,
        color: days <= 7 ? "#ffc107" : "#28a745",
      };
    }

    if (hours > 0) {
      return {
        text: `${hours}h ${minutes}m`,
        fullText: fullText,
        color: "#ffc107",
      };
    }

    return {
      text: `${minutes}m`,
      fullText: fullText,
      color: "#dc3545",
    };
  };

  const handleBusSelect = (bus) => {
    if (!bus.subscription) {
      // No subscription - show free trial modal
      setSelectedBus(bus);
      setShowTrialModal(true);
    } else {
      // Has subscription - navigate to subscription screen with essential bus info only
      navigate("/subscription", {
        state: {
          bus: {
            id: bus.id,
            busname: bus.busname,
            numberplate: bus.numberplate,
          },
        },
      });
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "#6c757d"; // Gray for no subscription
    return status === "Active" ? "#28a745" : "#dc3545";
  };

  const getPlanColor = (plan) => {
    if (!plan) return "#6c757d"; // Gray for no subscription

    switch (plan) {
      case "Premium":
        return "#1a5b7b";
      case "Standard":
        return "#6c757d";
      case "Basic":
        return "#28a745";
      case "trial":
        return "#17a2b8"; // Blue for trial
      default:
        return "#6c757d";
    }
  };

  const getExpirationColor = (subscription) => {
    if (!subscription) return "#6c757d"; // Gray for no subscription

    const now = new Date();
    const diff = subscription.expirationDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff <= 0) return "#dc3545"; // Red for expired
    if (days <= 7) return "#ffc107"; // Yellow for expiring soon
    return "#6c757d"; // Gray for normal
  };

  const BusItem = ({ bus }) => {
    const hasSubscription = bus.subscription !== null;
    const isExpired = hasSubscription && bus.subscription?.status === "Expired";
    const timeRemaining = calculateTimeRemaining(bus.subscription);
    const expirationColor = getExpirationColor(bus.subscription);

    return (
      <div className="subscription-bus-item">
        <div className="subscription-bus-content" onClick={() => handleBusSelect(bus)}>
          {/* Header Row */}
          <div className="subscription-bus-header">
            <div className="subscription-bus-info">
              <div className="subscription-bus-icon">
                <span className="subscription-bus-emoji">🚌</span>
              </div>
              <div className="subscription-bus-text">
                <div className="subscription-bus-name">{bus.busname}</div>
                <div className="subscription-bus-plate">PLATE: {bus.numberplate}</div>
              </div>
            </div>

            <div className="subscription-status-badge">
              <div
                className="subscription-status-dot"
                style={{ backgroundColor: getStatusColor(bus.subscription?.status) }}
              />
              <div
                className="subscription-status-text"
                style={{ color: getStatusColor(bus.subscription?.status) }}
              >
                {hasSubscription
                  ? bus.subscription?.status || "Expired"
                  : "No Subscription"}
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="subscription-bus-details">
            <div className="subscription-detail-column">
              <div className="subscription-detail-item">
                <span className="subscription-detail-icon">📅</span>
                <div className="subscription-detail-label">Expires:</div>
                <div 
                  className="subscription-detail-value" 
                  style={{ color: expirationColor }}
                >
                  {formatDate(bus.subscription?.expirationDate)}
                </div>
              </div>

              <div className="subscription-detail-item">
                <span className="subscription-detail-icon">⏰</span>
                <div className="subscription-detail-label">Remaining:</div>
                <div 
                  className="subscription-detail-value" 
                  style={{ color: timeRemaining.color }}
                >
                  {timeRemaining.fullText}
                </div>
              </div>
            </div>

            <div className="subscription-detail-column">
              <div className="subscription-detail-item">
                <span className="subscription-detail-icon">💳</span>
                <div className="subscription-detail-label">Plan:</div>
                <div 
                  className="subscription-detail-value"
                  style={{ color: getPlanColor(bus.subscription?.plan) }}
                >
                  {bus.subscription?.plan || "No Plan"}
                </div>
              </div>

              <div className="subscription-detail-item">
                <span className="subscription-detail-icon">💰</span>
                <div className="subscription-detail-label">Amount:</div>
                <div className="subscription-detail-value">
                  ${bus.subscription?.amount || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Warning for expired subscriptions */}
          {isExpired && (
            <div className="subscription-warning-container">
              <span className="subscription-warning-icon">⚠️</span>
              <div className="subscription-warning-text">
                Subscription expired - Renew now
              </div>
            </div>
          )}

          {/* Info for no subscription */}
          {!hasSubscription && (
            <div className="subscription-info-container">
              <span className="subscription-info-icon">ℹ️</span>
              <div className="subscription-info-text">
                No subscription - Start free trial
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TrialModal = () => (
    <div className="subscription-modal-overlay">
      <div 
        className="subscription-modal-content"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="subscription-modal-title">Start Free Trial</div>
        <div className="subscription-modal-subtitle">
          Start a 1-month free trial for {selectedBus?.busname} (
          {selectedBus?.numberplate})
        </div>

        <div className="subscription-trial-features">
          <div className="subscription-feature-text">✓ 1 Month Free Access</div>
          <div className="subscription-feature-text">✓ All Basic Features</div>
          <div className="subscription-feature-text">✓ No Payment Required</div>
        </div>

        <div className="subscription-modal-buttons">
          <button
            className="subscription-modal-button subscription-cancel-button"
            onClick={() => setShowTrialModal(false)}
            disabled={activatingTrial}
          >
            Cancel
          </button>

          <button
            className="subscription-modal-button subscription-trial-button"
            onClick={activateFreeTrial}
            disabled={activatingTrial}
          >
            {activatingTrial ? (
              <div className="subscription-loading-spinner"></div>
            ) : (
              "Start Free Trial"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Bus Subscriptions"
        subtitle={`Active: ${activeBusesCount} • Expired: ${expiredBusesCount}`}
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
        <div className="subscription-container">
          <div className="subscription-content">
            {/* Header */}
            <div className="subscription-header">
              <div className="subscription-header-content">
                <button className="subscription-back-button" onClick={() => navigate(-1)}>
                  <span className="subscription-back-icon">←</span>
                  Back
                </button>
                 {/* Refresh Button */}
            <button 
              className="subscription-refresh-button"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <div className="subscription-refresh-spinner"></div>
              ) : (
                <span className="subscription-refresh-icon">🔄</span>
              )}
              Refresh
            </button>
                <div className="subscription-header-title-container">
                  <div className="subscription-header-title">Bus Subscriptions</div>
                  <div className="subscription-header-subtitle">
                    Active: {activeBusesCount} • Expired: {expiredBusesCount}
                  </div>
                </div>

                <button
                  className="subscription-search-toggle-button"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <span className="subscription-search-icon">🔍</span>
                </button>
              </div>

              {/* Search Input */}
              {showSearch && (
                <div className="subscription-search-container">
                  <div className="subscription-search-input-wrapper">
                    <span className="subscription-search-icon">🔍</span>
                    <input
                      className="subscription-search-input"
                      placeholder="Search by name or plate..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery.length > 0 && (
                      <button 
                        className="subscription-clear-search"
                        onClick={cancelSearch}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Container */}
            <div className="subscription-filter-container">
              <div className="subscription-filter-scroll">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`subscription-filter-option ${
                      currentFilter === option.id ? 'subscription-selected-filter-option' : ''
                    }`}
                    onClick={() => handleFilterChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bus List */}
            {loading ? (
              <div className="subscription-loading-container">
                <div className="subscription-loading-spinner"></div>
                <div className="subscription-loading-text">Loading buses...</div>
              </div>
            ) : (
              <div className="subscription-list-container">
                {filteredBuses.map((bus) => (
                  <BusItem key={bus.id} bus={bus} />
                ))}
                
                {filteredBuses.length === 0 && (
                  <div className="subscription-empty-container">
                    <div className="subscription-empty-icon">🚌</div>
                    <div className="subscription-empty-text">
                      {searchQuery
                        ? `No buses found matching "${searchQuery}"`
                        : buses.length === 0
                        ? "No buses available"
                        : "No buses found with this filter"}
                    </div>
                  </div>
                )}
              </div>
            )}

           
          </div>
        </div>

        {/* Free Trial Modal */}
        {showTrialModal && <TrialModal />}

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

export default BusSubscriptionListScreen;