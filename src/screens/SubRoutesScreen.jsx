import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Apilink from '../baseUrl/baseUrl';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/SubRoutesScreen.css';

const ITEMS_PER_PAGE = 3;

const SubRoutesScreen = () => {
  const navigate = useNavigate();
  const [subRoutes, setSubRoutes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [busFilterModalVisible, setBusFilterModalVisible] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState({
    code: "USD",
    symbol: "$",
    name: "United States Dollar",
    rate: 1,
  });
  const [selectedBus, setSelectedBus] = useState(null);
  const [availableBuses, setAvailableBuses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const editedRouteRef = useRef(null);

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("subroutes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  useEffect(() => {
    loadAvailableBuses();
  }, []);

  // Animation effects
  useEffect(() => {
    if (editModalVisible || busFilterModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [editModalVisible, busFilterModalVisible]);

  const createDefaultUSD = async () => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const defaultCurrency = {
        code: "USD",
        symbol: "$",
        name: "United States Dollar",
        rate: 1,
        isDefault: true,
      };

      const response = await fetch(`${apiLink}/currencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(defaultCurrency),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCurrency(data.currency);
      } else {
        console.error("Failed to create default currency");
      }
    } catch (error) {
      console.error("Error creating default currency:", error);
    }
  };

  const loadAvailableBuses = async () => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let response = await fetch(`${apiLink}/buses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const buses = data.buses || [];
        const transformedBuses = buses.map((bus) => ({
          name: bus.busname,
          numberplate: bus.numberplate,
          id: bus.id,
        }));

        setAvailableBuses(transformedBuses);

        if (transformedBuses.length > 0) {
          setSelectedBus(transformedBuses[0]);
          fetchSubRoutes(transformedBuses[0].id);
        } else {
          showAlert("No Buses", "No buses found. Please create a bus first");
        }
      } else {
        showAlert("Failed to load buses");
      }
    } catch (error) {
      console.log("Error loading buses:", error);
      showAlert("Failed to load buses");
    }
  };

  const fetchSubRoutes = async (busId) => {
    try {
      setFetching(true);
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let url = `${apiLink}/subroutes/bybus/${busId}`;

      let response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const subroutesArray = data.subroutes || data.routes || data.data || [];

        if (!Array.isArray(subroutesArray)) {
          console.log("Subroutes is not an array:");
          setSubRoutes([]);
          return;
        }

        const transformedRoutes = subroutesArray.map((route, index) => ({
          id: route.id,
          subrouteid: route.subrouteid,
          from: route.from,
          to: route.to,
          fare: route.fare || 0,
          kidsFare: route.kidsFare || 0,
          bus_id: selectedBus?.id,
          name: selectedBus?.name || "",
          numberplate: selectedBus?.numberplate || "",
          icon: "🚌",
          number: generateRouteNumber(route.from, route.to, index),
        }));

        setSubRoutes(transformedRoutes);
      } else {
        showAlert(data.message || "Failed to load subroutes");
      }
    } catch (error) {
      console.log("Error fetching subroutes:", error);
      showAlert("Failed to load subroutes");
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  const generateRouteNumber = (from, to, index) => {
    const fromCode = from ? from.substring(0, 3).toUpperCase() : "UNK";
    const toCode = to ? to.substring(0, 3).toUpperCase() : "UNK";
    const sequential = (index + 1).toString().padStart(3, "0");
    return `${fromCode}${toCode}-${sequential}`;
  };

  const handleEdit = (route) => {
    setCurrentRoute(route);
    editedRouteRef.current = { ...route };
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const editedRoute = editedRouteRef.current;

    if (!editedRoute?.from || !editedRoute?.to || !editedRoute?.fare) {
      showAlert("Please fill in all required fields");
      return;
    }

    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const updateData = {
        fare: editedRoute.fare,
        kidsFare: editedRoute.kidsFare,
      };

      let response = await fetch(`${apiLink}/subroutes/${editedRoute.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubRoutes(data.routes);
        setEditModalVisible(false);
        setCurrentRoute(null);
        editedRouteRef.current = null;
        showSuccess("Subroute updated successfully");
      } else {
        showAlert(data.message || "Failed to update subroute");
      }
    } catch (error) {
      showAlert("Failed to update subroute");
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

  const handleDelete = (routeId, subrouteId) => {
    if (window.confirm("Are you sure you want to delete this subroute?")) {
      confirmDelete(routeId, subrouteId);
    }
  };

  const confirmDelete = async (routeId, subrouteId) => {
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let response = await fetch(`${apiLink}/subroutes/${routeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSubRoutes(data.routes);
        showSuccess("Subroute deleted successfully");
      } else {
        showAlert(data.message || "Failed to delete subroute");
      }
    } catch (error) {
      showAlert("Failed to delete subroute");
    }
  };

  const handleBusSelect = (bus) => {
    setSelectedBus(bus);
    setBusFilterModalVisible(false);
    setCurrentPage(1);
    fetchSubRoutes(bus.id);
  };

  const filteredRoutes = useMemo(() => {
    const filtered = subRoutes.filter((route) => {
      const searchMatch =
        route.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.numberplate?.toLowerCase().includes(searchQuery.toLowerCase());

      return searchMatch;
    });

    setCurrentPage(1);
    return filtered;
  }, [subRoutes, searchQuery]);

  const totalPages = Math.ceil(filteredRoutes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRoutes = filteredRoutes.slice(startIndex, endIndex);

  const formatFare = (fare) => {
    if (!fare) return "0.00";
    return `${selectedCurrency.symbol}${parseFloat(fare).toFixed(2)}`;
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const BusFilterModal = () => (
    <div className="subroutes-modal-overlay">
      <div 
        className="subroutes-modal-content"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="subroutes-modal-header">
          <div className="subroutes-modal-title">Select Bus</div>
          <button
            className="subroutes-close-button"
            onClick={() => setBusFilterModalVisible(false)}
          >
            ✕
          </button>
        </div>

        <div className="subroutes-bus-list">
          {availableBuses.map((item) => (
            <button
              key={item.id}
              className={`subroutes-bus-option ${selectedBus?.id === item.id ? 'subroutes-selected-bus-option' : ''}`}
              onClick={() => handleBusSelect(item)}
            >
              <div className="subroutes-bus-option-content">
                <div className="subroutes-bus-name">{item.name}</div>
                <div className="subroutes-bus-numberplate">{item.numberplate}</div>
              </div>
              {selectedBus?.id === item.id && (
                <span className="subroutes-checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const EditModal = () => {
    const [localFrom, setLocalFrom] = useState(
      editedRouteRef.current?.from || ""
    );
    const [localTo, setLocalTo] = useState(editedRouteRef.current?.to || "");
    const [localFare, setLocalFare] = useState(
      editedRouteRef.current?.fare || "0.00"
    );
    const [localKidsFare, setLocalKidsFare] = useState(
      editedRouteRef.current?.kidsFare || "0.00"
    );

    const handleFareChange = (value, field) => {
      let numericValue = value.replace(/[^0-9]/g, "");

      if (numericValue.length > 1 && numericValue[0] === "0") {
        numericValue = numericValue.slice(1).replace(/^0+/, "");
      }

      if (numericValue.length === 1) {
        numericValue = "0" + numericValue;
      }

      const formattedValue = `${
        numericValue.slice(0, -2) || "0"
      }.${numericValue.slice(-2)}`;

      if (field === "adult") {
        setLocalFare(String(formattedValue));
      } else if (field === "kids") {
        setLocalKidsFare(String(formattedValue));
      }
    };

    const formatDisplayValue = (value) => {
      if (!value || value === "0.00") return "";
      return value;
    };

    const updateRef = () => {
      editedRouteRef.current = {
        ...editedRouteRef.current,
        from: localFrom,
        to: localTo,
        fare: localFare || "0.00",
        kidsFare: localKidsFare || "0.00",
      };
    };

    const handleSave = () => {
      updateRef();
      handleSaveEdit();
    };

    return (
      <div className="subroutes-modal-overlay">
        <div 
          className="subroutes-modal-content"
          style={{
            opacity: fadeAnim,
            transform: `translateY(${slideAnim}px)`
          }}
        >
          <div className="subroutes-modal-header">
            <div className="subroutes-modal-title">Edit Subroute</div>
            <button
              className="subroutes-close-button"
              onClick={() => setEditModalVisible(false)}
            >
              ✕
            </button>
          </div>

          <div className="subroutes-modal-body">
            <div className="subroutes-input-group">
              <div className="subroutes-input-label">From Station</div>
              <input
                className="subroutes-text-input-label"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                placeholder="Enter departure station"
                onBlur={updateRef}
                disabled
              />
            </div>

            <div className="subroutes-input-group">
              <div className="subroutes-input-label">To Station</div>
              <input
                className="subroutes-text-input-label"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                placeholder="Enter destination station"
                onBlur={updateRef}
                disabled
              />
            </div>

            <div className="subroutes-input-row">
              <div className="subroutes-input-group subroutes-flex1">
                <div className="subroutes-input-label">
                  Adult Fare ({selectedCurrency.symbol})
                </div>
                <input
                  className="subroutes-text-input"
                  value={formatDisplayValue(localFare)}
                  onChange={(e) => handleFareChange(e.target.value, "adult")}
                  type="text"
                  inputMode="numeric"
                  placeholder="0.00"
                  onBlur={updateRef}
                />
              </div>

              <div className="subroutes-input-group subroutes-flex1">
                <div className="subroutes-input-label">
                  Kids Fare ({selectedCurrency.symbol})
                </div>
                <input
                  className="subroutes-text-input"
                  value={formatDisplayValue(localKidsFare)}
                  onChange={(e) => handleFareChange(e.target.value, "kids")}
                  type="text"
                  inputMode="numeric"
                  placeholder="0.00"
                  onBlur={updateRef}
                />
              </div>
            </div>

            <div className="subroutes-modal-actions">
              <button
                className="subroutes-modal-button subroutes-cancel-modal-button"
                onClick={() => setEditModalVisible(false)}
              >
                Cancel
              </button>

              <button
                className="subroutes-modal-button subroutes-save-modal-button"
                onClick={handleSave}
              >
                <span className="subroutes-save-icon">💾</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RouteCard = ({ route, index }) => (
    <div className="subroutes-route-card">
      {/* Route Header */}
      <div className="subroutes-route-header">
        <div className="subroutes-route-icon-container">
          <span className="subroutes-route-icon">{route.icon || "🚌"}</span>
        </div>

        <div className="subroutes-route-info">
          <div className="subroutes-route-name">
            {route.from} → {route.to}
          </div>
          <div className="subroutes-sub-route-number">
            {generateRouteNumber(route.from, route.to, index)}
          </div>
        </div>
      </div>

      {/* Route Details */}
      <div className="subroutes-route-details">
        <div className="subroutes-fare-container">
          <div className="subroutes-fare-label">Adult Fare</div>
          <div className="subroutes-fare-value">{formatFare(route.fare)}</div>
        </div>

        <div className="subroutes-fare-container">
          <div className="subroutes-fare-label">Kids Fare</div>
          <div className="subroutes-fare-value">{formatFare(route.kidsFare)}</div>
        </div>

        <div className="subroutes-status-badge">
          <span className="subroutes-status-icon">✓</span>
          <div className="subroutes-status-text">Active</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="subroutes-action-buttons">
        <button
          className="subroutes-action-button subroutes-edit-button"
          onClick={() => handleEdit(route)}
        >
          <span className="subroutes-edit-icon">✏️</span>
          <div className="subroutes-edit-button-text">Edit</div>
        </button>

        <button
          className="subroutes-action-button subroutes-delete-button"
          onClick={() => handleDelete(route.id, route.subrouteid)}
        >
          <span className="subroutes-delete-icon">🗑️</span>
          <div className="subroutes-delete-button-text">Delete</div>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Bus Subroutes"
        subtitle={`Manage your bus subroutes • ${selectedCurrency.code}`}
        companyName={user?.company_name || "Company"}
        onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={fetching}
      />
      
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="subroutes-container">
          <div className="subroutes-content">
            {/* Header */}
            <div className="subroutes-header">
              <div className="subroutes-header-content">
                <button className="subroutes-back-button" onClick={() => navigate(-1)}>
                  <span className="subroutes-back-icon">←</span>
                  Back
                </button>
                
                <div className="subroutes-header-title-container">
                  <div className="subroutes-header-title">Bus Subroutes</div>
                  <div className="subroutes-header-subtitle">
                    Manage your bus subroutes • {selectedCurrency.code}
                  </div>
                </div>

                <button
                  className="subroutes-refresh-button"
                  onClick={() => fetchSubRoutes(selectedBus?.id)}
                >
                  <span className="subroutes-refresh-icon">🔄</span>
                </button>
              </div>
            </div>

            {/* Bus Filter Dropdown */}
            <button
              className="subroutes-bus-filter-button"
              onClick={() => setBusFilterModalVisible(true)}
            >
              <div className="subroutes-bus-filter-content">
                <span className="subroutes-bus-icon">🚌</span>
                <div className="subroutes-bus-filter-text">
                  <div className="subroutes-bus-filter-label">Bus</div>
                  <div className="subroutes-bus-filter-value">
                    {selectedBus?.name} • {selectedBus?.numberplate}
                  </div>
                </div>
              </div>
              <span className="subroutes-chevron-down">▼</span>
            </button>

            {/* Search Bar */}
            <div className="subroutes-search-container">
              <span className="subroutes-search-icon">🔍</span>
              <input
                className="subroutes-search-input"
                placeholder="Search subroutes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery.length > 0 && (
                <button 
                  className="subroutes-clear-search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Routes Count */}
            <div className="subroutes-stats-container">
              <div className="subroutes-stats-text">
                Showing {filteredRoutes.length} subroutes
                {selectedBus?.id !== "all" && ` • ${selectedBus?.name}`}
              </div>
            </div>

            {fetching ? (
              <div className="subroutes-loading-container">
                <div className="subroutes-loading-spinner"></div>
                <div className="subroutes-loading-text">Loading subroutes...</div>
              </div>
            ) : currentRoutes.length === 0 ? (
              <div className="subroutes-empty-state">
                <div className="subroutes-empty-icon">🔄</div>
                <div className="subroutes-empty-state-title">
                  {searchQuery ? "No Matching Subroutes" : "No Subroutes"}
                </div>
                <div className="subroutes-empty-state-text">
                  {searchQuery
                    ? "No subroutes match your search"
                    : selectedBus?.id !== "all"
                    ? `No subroutes found for ${selectedBus?.name}`
                    : "Subroutes will appear here after creating them"}
                </div>
              </div>
            ) : (
              <div className="subroutes-list-container">
                {currentRoutes.map((route, index) => (
                  <RouteCard key={route.subrouteid || route.id} route={route} index={index} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {filteredRoutes.length > ITEMS_PER_PAGE && (
              <div className="subroutes-pagination-container">
                <button
                  className={`subroutes-pagination-button ${currentPage === 1 ? 'subroutes-pagination-button-disabled' : ''}`}
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  ←
                </button>

                <div className="subroutes-page-numbers">
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      className={`subroutes-page-number ${currentPage === page ? 'subroutes-current-page-number' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className={`subroutes-pagination-button ${currentPage === totalPages ? 'subroutes-pagination-button-disabled' : ''}`}
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {editModalVisible && <EditModal />}
        {busFilterModalVisible && <BusFilterModal />}

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

export default SubRoutesScreen;