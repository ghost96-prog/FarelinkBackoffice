import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Apilink from '../baseUrl/baseUrl';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/RouteListScreen.css';

const RoutesListScreen = () => {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [routesModalVisible, setRoutesModalVisible] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedBuses, setSelectedBuses] = useState([]);
  const [generatedSubRoutes, setGeneratedSubRoutes] = useState([]);
  const [editingRoute, setEditingRoute] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("routes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  const [newRoute, setNewRoute] = useState({
    userid: "",
    busIds: [],
    busNames: [],
    busPlates: [],
    departure: "",
    destination: "",
    stations: [],
  });

  const [newStation, setNewStation] = useState("");
  const [editingFares, setEditingFares] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadBuses();
    loadRoutes();
  }, []);

  // Animation effects
  useEffect(() => {
    if (modalVisible || busModalVisible || routesModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [modalVisible, busModalVisible, routesModalVisible]);

  const loadRoutes = async () => {
    setFetching(true);
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let response = await fetch(`${apiLink}/routes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setFetching(false);
      
      if (!response.ok) {
        showAlert(data.message || "Failed to fetch routes");
      } else {
        const transformedRoutes = data.routes.map((route) => ({
          id: route.route_id.toString(),
          busIds: route.buses
            ? route.buses.map((bus) => bus.id.toString())
            : [route.bus.id.toString()],
          busNames: route.buses
            ? route.buses.map((bus) => bus.busname)
            : [route.bus.busname],
          busPlates: route.buses
            ? route.buses.map((bus) => bus.numberplate)
            : [route.bus.numberplate],
          departure: route.from,
          destination: route.to,
          stations: route.stations || [],
          subroutes: route.subroutes || [],
        }));
        setRoutes(transformedRoutes);
      }
    } catch (error) {
      setFetching(false);
      showAlert("Failed to load routes, check your internet connectivity");
    }
  };

  const loadBuses = async () => {
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
      if (!response.ok) {
        showAlert(data.message || "Failed to fetch buses");
      } else {
        setBuses(data.buses || []);
      }
    } catch (error) {
      showAlert("Failed to load buses, check your internet connectivity");
    }
  };

  const handleAddStation = () => {
    if (!newStation.trim()) {
      showAlert("Please enter station name");
      return;
    }

    let stationData;
    if (newRoute.stations.length == 0) {
      let depTown = newRoute.departure;
      let desTown = newRoute.destination;

      stationData = {
        id: `station_a${Date.now()}`,
        name: depTown.toUpperCase().trim(),
      };
      newRoute.stations.push(stationData);

      stationData = {
        id: `station_b${Date.now()}`,
        name: desTown.toUpperCase().trim(),
      };
      newRoute.stations.push(stationData);
    }

    stationData = {
      id: `station_c${Date.now()}`,
      name: newStation.toUpperCase().trim(),
    };
    newRoute.stations.push(stationData);

    setNewStation("");
  };

  const handleRemoveStation = async (stationId) => {
    try {
      const stationToRemove = newRoute.stations.find(
        (station) => station.id === stationId
      );

      if (!stationToRemove) return;

      if (window.confirm(`Are you sure you want to delete station "${stationToRemove.name}"?`)) {
        try {
          const updatedStations = newRoute.stations.filter(
            (station) => station.id !== stationId
          );
          setNewRoute({
            ...newRoute,
            stations: updatedStations,
          });

          if (editingRoute) {
            console.log("Station removed during edit mode");
          }

          showSuccess(
            `Station "${stationToRemove.name}" deleted successfully!`
          );
        } catch (error) {
          console.error("Error deleting station:", error);
          showAlert("Failed to delete station");
        }
      }
    } catch (error) {
      console.error("Error in handleRemoveStation:", error);
      showAlert("Failed to process station deletion");
    }
  };

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) {
      return routes;
    }

    const query = searchQuery.toLowerCase().trim();
    return routes.filter(
      (route) =>
        route.busNames.some((name) => name.toLowerCase().includes(query)) ||
        route.busPlates.some((plate) => plate.toLowerCase().includes(query)) ||
        route.departure.toLowerCase().includes(query) ||
        route.destination.toLowerCase().includes(query) ||
        route.stations.some((station) =>
          station.name.toLowerCase().includes(query)
        )
    );
  }, [searchQuery, routes]);

  const handleSelectBus = (bus) => {
    const isSelected = selectedBuses.some(
      (selectedBus) => selectedBus.id === bus.id
    );

    if (isSelected) {
      const updatedBuses = selectedBuses.filter(
        (selectedBus) => selectedBus.id !== bus.id
      );
      setSelectedBuses(updatedBuses);

      setNewRoute({
        ...newRoute,
        busIds: updatedBuses.map((b) => b.id),
        busNames: updatedBuses.map((b) => b.busname),
        busPlates: updatedBuses.map((b) => b.numberplate),
      });
    } else {
      const updatedBuses = [...selectedBuses, bus];
      setSelectedBuses(updatedBuses);

      setNewRoute({
        ...newRoute,
        busIds: updatedBuses.map((b) => b.id),
        busNames: updatedBuses.map((b) => b.busname),
        busPlates: updatedBuses.map((b) => b.numberplate),
      });
    }
  };

  const isBusSelected = (busId) => {
    return selectedBuses.some((bus) => bus.id === busId);
  };

  function generateAllSubRoutes(majorRouteId) {
    if (newRoute.stations.length < 2) {
      return [];
    }

    const towns = newRoute.stations;
    let reordered = [towns[0], ...towns.slice(2), towns[1]];

    let subRoutes = [];
    let counter = 1;

    for (let i = 0; i < reordered.length - 1; i++) {
      for (let j = i + 1; j < reordered.length; j++) {
        let from = reordered[i].name;
        let to = reordered[j].name;

        subRoutes.push({
          fare: "0.00",
          from: from,
          icon: "🚌",
          id: `subroute_${majorRouteId}_${counter}`,
          isNew: true,
          kidsFare: "0.00",
          majorRouteId: majorRouteId,
          name: `${from}-${to} Route`,
          number: `${from[0]}${to[0]}-00${counter}`,
          to: to,
        });

        counter++;
      }
    }

    return subRoutes;
  }

  const handleCreateRoute = async () => {
    if (!newRoute.departure.trim() || !newRoute.destination.trim()) {
      showAlert("Please enter both departure and destination");
      return;
    }

    if (selectedBuses.length === 0) {
      showAlert("Please select at least one bus");
      return;
    }

    if (newRoute.stations.length < 2) {
      showAlert("Please add at least 2 stations");
      return;
    }

    const routeData = {
      bus_ids: selectedBuses.map((bus) => parseInt(bus.id)),
      departure: newRoute.departure.toUpperCase().trim(),
      destination: newRoute.destination.toUpperCase().trim(),
      currency_symbol: "$",
      currency_code: "USD",
      stations: newRoute.stations.map((station) => station.name),
      subroutes: generateAllSubRoutes(
        editingRoute ? editingRoute.id : `route_${Date.now()}`
      ).map((subroute) => ({
        subrouteid: subroute.number,
        from: subroute.from,
        to: subroute.to,
        fare: parseFloat(subroute.fare) || 0.0,
        kidsFare: parseFloat(subroute.kidsFare) || 0.0,
      })),
    };

    const routeForStorage = {
      busIds: selectedBuses.map((bus) => bus.id.toString()),
      busNames: selectedBuses.map((bus) => bus.busname),
      busPlates: selectedBuses.map((bus) => bus.numberplate),
      departure: routeData.departure,
      destination: routeData.destination,
      stations: routeData.stations.map((station, index) => ({
        id: `station_${Date.now()}_${index}`,
        name: station,
      })),
      subroutes: routeData.subroutes || [],
    };

    if (editingRoute) {
      routeForStorage.id = editingRoute.id;
      localStorage.setItem("busRoute", JSON.stringify(routeForStorage));
      navigate("/save-subroutes");
    } else {
      localStorage.setItem("busRoute", JSON.stringify(routeForStorage));
      navigate("/save-subroutes");
    }
  };

  const calculateTotalSubRoutes = () => {
    const n = newRoute.stations.length;
    return (n * (n - 1)) / 2;
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const handleDeleteRoute = async (routeId) => {
    if (window.confirm("Are you sure you want to delete this route and ALL sub-routes?")) {
      setDeleting(true);
      try {
        const token = user.token;
        const apiLink = Apilink.getLink();
        
        let response = await fetch(`${apiLink}/routes/${routeId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setDeleting(false);

        if (!response.ok) {
          showAlert(data.message || "Failed to delete route");
        } else {
          setRoutes((prev) =>
            prev.filter((route) => route.id !== routeId)
          );
          showSuccess("Route deleted successfully!");
        }
      } catch (error) {
        setDeleting(false);
        showAlert("Failed to delete route, check your internet connectivity");
      }
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

  const handleOpenModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditRoute = async (route) => {
    try {
      if (route.busIds && route.busIds.length > 0) {
        const selectedBusesFromRoute = buses.filter((bus) =>
          route.busIds.includes(bus.id.toString())
        );
        setSelectedBuses(selectedBusesFromRoute);

        setNewRoute({
          ...newRoute,
          departure: route.departure,
          destination: route.destination,
          busIds: route.busIds,
          busNames: route.busNames,
          busPlates: route.busPlates,
          stations: route.stations,
        });
        setEditingRoute(route);
      }

      localStorage.setItem("editingRoute", JSON.stringify(route));
      localStorage.setItem("availableBuses", JSON.stringify(buses));

      navigate("/edit-route");
    } catch (error) {
      console.error("Error saving route to localStorage:", error);
      showAlert("Failed to open edit screen");
    }
  };

  const resetForm = () => {
    setNewRoute({
      departure: "",
      destination: "",
      busIds: [],
      busNames: [],
      busPlates: [],
      stations: [],
    });
    setSelectedBuses([]);
    setNewStation("");
    setEditingFares({});
    setGeneratedSubRoutes([]);
    setEditingRoute(null);
  };

  const StationListItem = ({ id, station, index }) => (
    <div className="route-station-card">
      <div className="route-station-content">
        <div className="route-station-header">
          <div className="route-station-number">
            <div className="route-station-number-text">{index + 1}</div>
          </div>
          <div className="route-station-name">{station}</div>
          <button
            className="route-delete-station-button"
            onClick={() => handleRemoveStation(id)}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  const RouteListItem = ({ route }) => {
    const [showAllBuses, setShowAllBuses] = useState(false);

    const initialBusesToShow = 2;
    const busesToShow = showAllBuses
      ? route.busNames
      : route.busNames.slice(0, initialBusesToShow);
    const hiddenBusesCount = route.busNames.length - initialBusesToShow;

    const handleToggleBuses = (e) => {
      e.stopPropagation();
      setShowAllBuses(!showAllBuses);
    };

    return (
      <div className="route-list-item" onClick={() => handleEditRoute(route)}>
        <div className="route-list-item-content">
          <div className="route-list-item-header">
            <div className="route-list-item-icon">
              <span className="route-icon">🗺️</span>
            </div>
            <div className="route-list-item-info">
              <div className="route-list-item-name">
                {route.departure} → {route.destination}
              </div>
              <div className="route-bus-info">
                Buses: {route.busNames.length}
              </div>
            </div>
            <div className="route-list-item-actions">
              <button 
                className="route-edit-button"
                onClick={(e) => { e.stopPropagation(); handleEditRoute(route); }}
              >
                ✏️
              </button>
              <button 
                className="route-delete-button"
                onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
              >
                🗑️
              </button>
            </div>
          </div>

          {route.busNames.length > 0 && (
            <div className="route-buses-preview">
              <div className="route-buses-label">
                Buses: {route.busNames.length}
              </div>
              <div className="route-buses-list">
                {busesToShow.map((busName, index) => (
                  <div key={`${busName}-${index}`} className="route-bus-chip">
                    <span className="route-bus-icon">🚌</span>
                    <div className="route-bus-chip-text">
                      {busName} ({route.busPlates[index]})
                    </div>
                  </div>
                ))}
                {!showAllBuses && hiddenBusesCount > 0 && (
                  <button
                    className="route-more-buses-chip"
                    onClick={handleToggleBuses}
                  >
                    <div className="route-more-buses-text">
                      +{hiddenBusesCount} more
                    </div>
                  </button>
                )}
                {showAllBuses && route.busNames.length > initialBusesToShow && (
                  <button
                    className="route-less-buses-chip"
                    onClick={handleToggleBuses}
                  >
                    <div className="route-less-buses-text">Show less</div>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="route-stations-preview">
            <div className="route-stations-label">
              Stations: {route.stations.length}
            </div>
            <div className="route-stations-list">
              {route.stations.slice(0, 3).map((station, index) => (
                <div key={station.id} className="route-station-chip">
                  <div className="route-station-chip-text">
                    {station.station || station.name}
                  </div>
                </div>
              ))}
              {route.stations.length > 3 && (
                <div className="route-more-stations-chip">
                  <div className="route-more-stations-text">
                    +{route.stations.length - 3} more
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BusListItem = ({ bus }) => (
    <div 
      className={`route-bus-list-item ${isBusSelected(bus.id) ? 'route-bus-list-item-selected' : ''}`}
      onClick={() => handleSelectBus(bus)}
    >
      <div className="route-bus-list-content">
        <div className="route-bus-list-icon">
          <span className="bus-icon">🚌</span>
        </div>
        <div className="route-bus-list-info">
          <div className="route-bus-list-name">{bus.busname}</div>
          <div className="route-bus-list-plate">{bus.numberplate}</div>
          <div className="route-bus-list-conductor">
            {bus.conductorname ? "Conductor Assigned" : "No conductor"}
          </div>
        </div>
        <div className="route-bus-selection-indicator">
          {isBusSelected(bus.id) ? (
            <span className="route-checkmark">✓</span>
          ) : (
            <div className="route-unselected-circle" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Major Route Management"
        subtitle="Create and manage bus routes"
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
        <div className="route-list-container">
          <div className="route-list-content">
            {/* Header */}
            <div className="route-list-header">
              <div className="route-list-header-content">
                <button className="route-list-back-button" onClick={() => navigate(-1)}>
                  <span className="route-list-back-icon">←</span>
                  Back
                </button>
                
                <div className="route-list-header-title-container">
                  <div className="route-list-header-title">Major Route Management</div>
                  <div className="route-list-header-subtitle">
                    Create and manage bus routes
                  </div>
                </div>
              </div>

              {/* Create Route Button */}
              <button
                className="route-list-create-button"
                onClick={handleOpenModal}
              >
                <span className="route-list-create-icon">+</span>
                Create Route
              </button>
            </div>

            {/* Search and Stats Section */}
            <div className="route-list-stats-section">
              <div className="route-list-search-container">
                <div className="route-list-search-wrapper">
                  <span className="route-list-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by bus, plate, departure, destination, or station..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                    className="route-list-search-input"
                  />
                  {searchQuery.length > 0 && (
                    <button className="route-list-clear-button" onClick={() => setSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="route-list-stats">
                <div className="route-list-stat">
                  <div className="route-list-stat-value">{routes.length}</div>
                  <div className="route-list-stat-label">Total Routes</div>
                </div>
                <div className="route-list-stat">
                  <div className="route-list-stat-value">
                    {routes.reduce((total, route) => total + route.busNames.length, 0)}
                  </div>
                  <div className="route-list-stat-label">Bus Assignments</div>
                </div>
              </div>
            </div>

            {/* Routes List */}
            <div className="route-list-main">
              {fetching && (
                <div className="route-list-loading">
                  <div className="route-list-loading-spinner"></div>
                  <div>Loading routes...</div>
                </div>
              )}

              <div className="route-list-items">
                {filteredRoutes.map((route) => (
                  <RouteListItem key={route.id} route={route} />
                ))}
                
                {filteredRoutes.length === 0 && !fetching && (
                  <div className="route-list-empty-state">
                    <div className="route-list-empty-icon">🗺️</div>
                    <div className="route-list-empty-text">
                      {searchQuery
                        ? "No matching routes found"
                        : "No routes found, Create your first route to get started"}
                    </div>
                    <div className="route-list-empty-subtext">
                      {searchQuery
                        ? "Try a different search term"
                        : "Create your first route to get started"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Route Modal */}
        {modalVisible && (
          <div className="route-list-modal-overlay">
            <div 
              className="route-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="route-list-modal-header">
                <div className="route-list-modal-header-content">
                  <div className="route-list-modal-title-row">
                    <div className="route-list-modal-icon">
                      🗺️
                    </div>
                    <div className="route-list-modal-title-container">
                      <div className="route-list-modal-title">
                        {editingRoute ? "Edit Route" : "Create New Route"}
                      </div>
                      <div className="route-list-modal-subtitle">
                        {editingRoute
                          ? "Update route and add new stations"
                          : "Define route with stations"}
                      </div>
                    </div>
                    <button
                      className="route-list-close-button"
                      onClick={() => {
                        setModalVisible(false);
                        resetForm();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="route-list-modal-body">
                <div className="route-list-form-container">
                  {/* Route Information */}
                  <div className="route-list-section">
                    <div className="route-list-section-title">Route Information</div>

                    <div className="route-list-input-group">
                      <div className="route-list-input-label">Departure City *</div>
                      <input
                        type="text"
                        placeholder="Enter departure city"
                        value={newRoute.departure}
                        onChange={(e) =>
                          setNewRoute({ ...newRoute, departure: e.target.value })
                        }
                        className="route-list-text-input"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>

                    <div className="route-list-input-group">
                      <div className="route-list-input-label">Destination City *</div>
                      <input
                        type="text"
                        placeholder="Enter destination city"
                        value={newRoute.destination}
                        onChange={(e) =>
                          setNewRoute({ ...newRoute, destination: e.target.value })
                        }
                        className="route-list-text-input"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>

                    {/* Bus Selection */}
                    <div className="route-list-input-group">
                      <div className="route-list-input-label">Assign Buses *</div>
                      <button
                        className="route-list-select-button"
                        onClick={() => setBusModalVisible(true)}
                      >
                        <span className="route-list-input-icon">🚌</span>
                        <div className={`route-list-select-button-text ${selectedBuses.length > 0 ? 'route-list-select-button-text-selected' : ''}`}>
                          {selectedBuses.length > 0
                            ? `${selectedBuses.length} bus${selectedBuses.length > 1 ? "es" : ""} selected`
                            : "Select buses"}
                        </div>
                        <span className="route-list-chevron-down">▼</span>
                      </button>
                      {selectedBuses.length > 0 && (
                        <div className="route-list-selected-bus-info">
                          {selectedBuses
                            .map((bus) => `${bus.busname} (${bus.numberplate})`)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stations Section */}
                  <div className="route-list-section">
                    <div className="route-list-section-title">Stations</div>
                    <div className="route-list-section-subtitle">
                      Add stations in order from departure to destination
                    </div>

                    {/* Add Station Form */}
                    <div className="route-list-add-station-form">
                      <div className="route-list-station-input-row">
                        <div className="route-list-input-group">
                          <div className="route-list-input-label">Station Name</div>
                          <input
                            type="text"
                            placeholder="Enter station name"
                            value={newStation}
                            onChange={(e) => setNewStation(e.target.value)}
                            className="route-list-text-input"
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                          />
                        </div>
                      </div>
                      <button
                        className="route-list-add-station-button"
                        onClick={handleAddStation}
                      >
                        <span className="route-list-add-icon">+</span>
                        <div className="route-list-add-station-button-text">
                          Add Station
                        </div>
                      </button>
                    </div>

                    {/* Stations List */}
                    {newRoute.stations.length > 0 && (
                      <div className="route-list-stations-list-container">
                        <div className="route-list-stations-list-title">
                          Added Stations ({newRoute?.stations?.length || 0})
                        </div>
                        <div className="route-list-stations-list">
                          {newRoute.stations.map((station, index) => (
                            <StationListItem
                              key={station.id}
                              id={station.id}
                              station={editingRoute ? station.station : station.name}
                              index={index}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isInputFocused && (
                <div className="route-list-modal-footer">
                  <button
                    className="route-list-cancel-button"
                    onClick={() => {
                      setModalVisible(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`route-list-create-modal-button ${(!newRoute.departure || !newRoute.destination || selectedBuses.length === 0 || newRoute.stations.length < 2) ? 'route-list-create-button-disabled' : ''}`}
                    onClick={handleCreateRoute}
                    disabled={!newRoute.departure || !newRoute.destination || selectedBuses.length === 0 || newRoute.stations.length < 2 || creating || updating}
                  >
                    {creating || updating ? 'Processing...' : (editingRoute ? '✓ Update Route' : '✓ Generate Routes')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bus Selection Modal */}
        {busModalVisible && (
          <div className="route-list-modal-overlay">
            <div 
              className="route-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="route-list-modal-header">
                <div className="route-list-modal-header-content">
                  <div className="route-list-modal-title-row">
                    <div className="route-list-modal-icon">
                      🚌
                    </div>
                    <div className="route-list-modal-title-container">
                      <div className="route-list-modal-title">Select Buses</div>
                      <div className="route-list-modal-subtitle">
                        Tap buses to select/deselect ({selectedBuses.length} selected)
                      </div>
                    </div>
                  </div>
                  <button
                    className="route-list-close-button"
                    onClick={() => setBusModalVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="route-list-modal-body">
                {selectedBuses.length > 0 && (
                  <div className="route-list-selected-buses-header">
                    <div className="route-list-selected-buses-text">
                      Selected: {selectedBuses.map((bus) => bus.busname).join(", ")}
                    </div>
                  </div>
                )}
                <div className="route-list-modal-list-container">
                  {buses.map((bus) => (
                    <BusListItem key={bus.id} bus={bus} />
                  ))}
                </div>
              </div>

              <div className="route-list-bus-modal-footer">
                <button
                  className="route-list-done-button"
                  onClick={() => setBusModalVisible(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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

export default RoutesListScreen;