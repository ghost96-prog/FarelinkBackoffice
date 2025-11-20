import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Apilink from '../baseUrl/baseUrl';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/SaveSubRoutesScreen.css';

const SaveSubRoutesScreen = () => {
  const navigate = useNavigate();
  const fareRefs = useRef({});
  const inputRefs = useRef({});
  const [selectedCurrency, setSelectedCurrency] = useState({
    symbol: "$",
    code: "USD",
    name: "United States Dollars",
    rate: 1,
  });

  const [allSubRoutes, setAllSubRoutes] = useState([]);
  const [newRoute, setNewRoute] = useState({});
  const [busNames, setBusNames] = useState([]);
  const [busPlates, setBusPlates] = useState([]);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isInputFocusedRef = useRef(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("routes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  useEffect(() => {
    fetchData();
    loadCurrency();
  }, []);

  const fetchData = async () => {
    try {
      const data = localStorage.getItem("busRoute");

      if (data) {
        const parsedData = JSON.parse(data);

        const editing = parsedData.isEditing || false;
        setIsEditing(editing);

        setNewRoute(parsedData);

        const busNamesArray = parsedData.busNames || [parsedData.busName];
        const busPlatesArray = parsedData.busPlates || [parsedData.busPlate];

        setBusNames(busNamesArray);
        setBusPlates(busPlatesArray);

        if (editing) {
          const newSubroutes = parsedData.subroutes || [];
          const existingSubroutes = parsedData.existingSubroutes || [];

          const allRoutes = [
            ...existingSubroutes.map((route) => ({ ...route, isNew: false })),
            ...newSubroutes.map((route) => ({ ...route, isNew: true })),
          ];

          setAllSubRoutes(allRoutes);

          allRoutes.forEach((route) => {
            fareRefs.current[route.subrouteid] = {
              fare: route.fare === "0.00" ? "" : route.fare || "",
              kidsFare: route.kidsFare === "0.00" ? "" : route.kidsFare || "",
            };
          });
        } else {
          const allRoutes = (parsedData.subroutes || []).map((route) => ({
            ...route,
            isNew: true,
          }));
          setAllSubRoutes(allRoutes);

          allRoutes.forEach((route) => {
            fareRefs.current[route.subrouteid] = {
              fare: route.fare === "0.00" ? "" : route.fare || "",
              kidsFare: route.kidsFare === "0.00" ? "" : route.kidsFare || "",
            };
          });
        }
      }
    } catch (error) {
      console.error("Error fetching bus route:", error);
    }
  };

  const loadCurrency = async () => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const response = await fetch(`${apiLink}/currencies`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        const defaultCurrency = data.find(
          (currency) => currency.isDefault === true
        );

        if (defaultCurrency) {
          const selectedCurrency = {
            code: defaultCurrency.code,
            symbol: defaultCurrency.symbol,
            name: defaultCurrency.name,
            rate: defaultCurrency.rate,
            isDefault: defaultCurrency.isDefault,
          };

          setSelectedCurrency(selectedCurrency);
        }
      } else {
        showAlert("Failed to fetch currencies");
      }
    } catch (error) {
      showAlert("Error loading currency:");
      console.error("Error loading currency:", error);
    }
  };

  if (!newRoute) {
    return (
      <div className="save-subroutes-loading">
        <div>Loading...</div>
      </div>
    );
  }

  const handleInputFocus = () => {
    isInputFocusedRef.current = true;
  };

  const handleInputBlur = () => {
    isInputFocusedRef.current = false;
  };

  const generateRouteNumber = (from, to, index) => {
    const fromCode = from.substring(0, 3).toUpperCase();
    const toCode = to.substring(0, 3).toUpperCase();
    const sequential = (index + 1).toString().padStart(3, "0");
    return `${fromCode}${toCode}-${sequential}`;
  };

  const getFareValue = (routeId, field) => {
    return fareRefs.current[routeId]?.[field] || "";
  };

  const saveAllRoutes = async () => {
    setSaving(true);
    try {
      const asyncdata = localStorage.getItem("busRoute");
      const parsedData = JSON.parse(asyncdata);

      const updatedSubRoutes = allSubRoutes.map((subroute) => {
        const fareData = fareRefs.current[subroute.subrouteid] || {};

        let fare = fareData.fare || "0.00";
        let kidsFare = fareData.kidsFare || "0.00";

        if (fare && !isNaN(parseFloat(fare))) {
          fare = parseFloat(fare).toFixed(2);
        }

        if (kidsFare && !isNaN(parseFloat(kidsFare))) {
          kidsFare = parseFloat(kidsFare).toFixed(2);
        }

        const { isNew, ...cleanSubroute } = {
          ...subroute,
          fare: fare,
          kidsFare: kidsFare,
        };

        return cleanSubroute;
      });

      parsedData.subroutes = updatedSubRoutes;
      parsedData.currency_symbol = selectedCurrency.symbol;
      parsedData.currency_code = selectedCurrency.code;

      const { isEditing, ...dataToSend } = parsedData;

      const token = user.token;
      const apiLink = Apilink.getLink();

      let response;
      let url;
      let method;

      if (isEditing) {
        method = "PUT";
        url = `${apiLink}/routes/${dataToSend.id}`;

        const updateData = {
          bus_ids: dataToSend.busIds.map((id) => parseInt(id)),
          departure: dataToSend.departure,
          destination: dataToSend.destination,
          currency_symbol: selectedCurrency.symbol,
          currency_code: selectedCurrency.code,
          stations: dataToSend.stations,
          subroutes: dataToSend.subroutes,
        };

        response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });
      } else {
        method = "POST";
        url = `${apiLink}/routes`;

        const createData = {
          bus_ids: dataToSend.busIds.map((id) => parseInt(id)),
          departure: dataToSend.departure,
          destination: dataToSend.destination,
          currency_symbol: selectedCurrency.symbol,
          currency_code: selectedCurrency.code,
          stations: dataToSend.stations,
          subroutes: dataToSend.subroutes,
        };

        response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(createData),
        });
      }

      const data = await response.json();
      setSaving(false);

      if (!response.ok) {
        showAlert(
          data.message || `Failed to ${isEditing ? "update" : "create"} route`
        );
      } else {
        showSuccess(`Route ${isEditing ? "updated" : "created"} successfully!`);
        localStorage.removeItem("busRoute");

        navigate("/routes");
      }
    } catch (error) {
      setSaving(false);
      console.error("Error saving route:", error);
      showAlert(
        `Failed to ${
          isEditing ? "update" : "create"
        } route, check your internet connectivity`
      );
    }
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const formatBusDisplay = () => {
    if (busNames.length === 0) return "No buses assigned";

    if (busNames.length === 1) {
      return `${busNames[0]} (${busPlates[0]})`;
    }

    return `${busNames.length} buses: ${busNames.join(", ")}`;
  };

  const handleFareChange = (value, field, routeId) => {
    let numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue === "") {
      if (!fareRefs.current[routeId]) {
        fareRefs.current[routeId] = {};
      }
      fareRefs.current[routeId][field] = "0.00";

      const inputKey = `${routeId}-${field}`;
      if (inputRefs.current[inputKey]) {
        inputRefs.current[inputKey].value = "";
      }
      return;
    }

    if (numericValue.length > 1 && numericValue[0] === "0") {
      numericValue = numericValue.slice(1).replace(/^0+/, "");
    }

    if (numericValue.length === 1) {
      numericValue = "0" + numericValue;
    }

    const formattedValue = `${
      numericValue.slice(0, -2) || "0"
    }.${numericValue.slice(-2)}`;

    if (!fareRefs.current[routeId]) {
      fareRefs.current[routeId] = {};
    }
    fareRefs.current[routeId][field] = formattedValue;

    const inputKey = `${routeId}-${field}`;
    if (inputRefs.current[inputKey]) {
      inputRefs.current[inputKey].value = formattedValue === "0.00" ? "" : formattedValue;
    }
  };

  const formatDisplayValue = (value) => {
    if (!value || value === "0.00") return "";

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "";

    return numValue.toFixed(2);
  };

  const SubRouteListItem = ({ route, index }) => {
    const currentFare = getFareValue(route.subrouteid, "fare");
    const currentKidsFare = getFareValue(route.subrouteid, "kidsFare");

    const isEditable =
      route.isNew ||
      !currentFare ||
      currentFare === "0.00" ||
      currentFare === "0" ||
      !currentKidsFare ||
      currentKidsFare === "0.00" ||
      currentKidsFare === "0";

    return (
      <div className={`save-subroutes-subroute-card ${route.isNew ? 'save-subroutes-new-subroute-card' : ''}`}>
        <div className="save-subroutes-subroute-content">
          <div className="save-subroutes-subroute-header">
            <div className="save-subroutes-subroute-info">
              <div className="save-subroutes-subroute-name">
                {route.from} → {route.to}
              </div>
              {route.isNew ? (
                <div className="save-subroutes-new-badge">
                  <div className="save-subroutes-new-badge-text">NEW</div>
                </div>
              ) : isEditable ? (
                <div className="save-subroutes-editable-badge">
                  <div className="save-subroutes-editable-badge-text">EDITABLE</div>
                </div>
              ) : (
                <div className="save-subroutes-existing-badge">
                  <div className="save-subroutes-existing-badge-text">EXISTING</div>
                </div>
              )}
            </div>
            <div className="save-subroutes-subroute-number">
              {generateRouteNumber(route.from, route.to, index)}
            </div>
          </div>

          <div className="save-subroutes-fare-inputs">
            <div className="save-subroutes-fare-input-group">
              <div className="save-subroutes-fare-label">
                Adult Fare ({selectedCurrency.symbol})
              </div>
              <input
                ref={(ref) => (inputRefs.current[`${route.subrouteid}-fare`] = ref)}
                onChange={(e) => handleFareChange(e.target.value, "fare", route.subrouteid)}
                defaultValue={formatDisplayValue(getFareValue(route.subrouteid, "fare"))}
                className={`save-subroutes-fare-input ${!isEditable ? 'save-subroutes-disabled-input' : ''}`}
                type="text"
                inputMode="numeric"
                placeholder="0.00"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={!isEditable}
              />
            </div>

            <div className="save-subroutes-fare-input-group">
              <div className="save-subroutes-fare-label">
                Kids Fare ({selectedCurrency.symbol})
              </div>
              <input
                ref={(ref) => (inputRefs.current[`${route.subrouteid}-kidsFare`] = ref)}
                onChange={(e) => handleFareChange(e.target.value, "kidsFare", route.subrouteid)}
                defaultValue={formatDisplayValue(getFareValue(route.subrouteid, "kidsFare"))}
                className={`save-subroutes-fare-input ${!isEditable ? 'save-subroutes-disabled-input' : ''}`}
                type="text"
                inputMode="numeric"
                placeholder="0.00"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={!isEditable}
              />
            </div>
          </div>

          {!isEditable && (
            <div className="save-subroutes-read-only-text">
              Existing route with prices set
            </div>
          )}
          {route.isNew && isEditable && (
            <div className="save-subroutes-new-route-text">
              New route - set fares
            </div>
          )}
          {!route.isNew && isEditable && (
            <div className="save-subroutes-editable-route-text">
              Existing route - fares not set, please enter prices
            </div>
          )}
        </div>
      </div>
    );
  };

  const newRoutesCount = allSubRoutes.filter((route) => route.isNew).length;
  const existingRoutesCount = allSubRoutes.filter((route) => !route.isNew).length;

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title={isEditing ? "Review & Set New Route Fares" : "Set Route Fares"}
        subtitle={
          isEditing
            ? `${allSubRoutes.length} total routes (${existingRoutesCount} existing, ${newRoutesCount} new)`
            : `Set fares for ${allSubRoutes.length} routes`
        }
        companyName={user?.company_name || "Company"}
        onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={saving}
      />
      
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="save-subroutes-container">
          <div className="save-subroutes-content">
            {/* Header */}
            <div className="save-subroutes-header">
              <div className="save-subroutes-header-content">
                <button className="save-subroutes-back-button" onClick={() => navigate(-1)}>
                  <span className="save-subroutes-back-icon">←</span>
                  Back
                </button>
                
                <div className="save-subroutes-header-title-container">
                  <div className="save-subroutes-header-top-row">
                    <div className="save-subroutes-header-title-section">
                      <div className="save-subroutes-header-title">
                        {isEditing ? "Review & Set New Route Fares" : "Set Route Fares"}
                      </div>
                      <div className="save-subroutes-header-subtitle">
                        {isEditing
                          ? `${allSubRoutes.length} total routes (${existingRoutesCount} existing, ${newRoutesCount} new)`
                          : `Set fares for ${allSubRoutes.length} routes`}
                      </div>
                    </div>
                    {isEditing && (
                      <div className="save-subroutes-edit-badge">
                        <div className="save-subroutes-edit-badge-text">EDITING MODE</div>
                      </div>
                    )}
                  </div>

                  <div className="save-subroutes-header-info-grid">
                    <div className="save-subroutes-header-info-item">
                      <span className="save-subroutes-info-label">Route: </span>
                      {newRoute.departure} → {newRoute.destination}
                    </div>
                    <div className="save-subroutes-header-info-item">
                      <span className="save-subroutes-info-label">Buses: </span>
                      {formatBusDisplay()}
                    </div>
                    <div className="save-subroutes-header-info-item">
                      <span className="save-subroutes-info-label">Stations: </span>
                      {newRoute?.stations?.length || 0}
                    </div>
                    <div className="save-subroutes-header-info-item">
                      <span className="save-subroutes-info-label">Default Currency: </span>
                      {selectedCurrency.symbol} ({selectedCurrency.code})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Routes List */}
            <div className="save-subroutes-list-container">
              {allSubRoutes.map((route, index) => (
                <SubRouteListItem key={`${route.subrouteid}-${index}`} route={route} index={index} />
              ))}
            </div>

            {/* Save Button */}
            <div className="save-subroutes-footer">
              <button
                className="save-subroutes-cancel-button"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={`save-subroutes-save-button ${saving ? 'save-subroutes-save-button-disabled' : ''}`}
                onClick={saveAllRoutes}
                disabled={saving}
              >
                {saving ? (
                  <div className="save-subroutes-loading-spinner"></div>
                ) : (
                  <>
                    <span className="save-subroutes-save-icon">💾</span>
                    <div className="save-subroutes-save-button-text">
                      {isEditing ? "Update All Routes" : "Save All Routes"}
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

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

export default SaveSubRoutesScreen;