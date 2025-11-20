import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Apilink from '../baseUrl/baseUrl';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/EditRouteScreen.css';

const EditRouteScreen = () => {
  const navigate = useNavigate();
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [selectedBuses, setSelectedBuses] = useState([]);
  const [newRoute, setNewRoute] = useState({
    departure: "",
    destination: "",
    busIds: [],
    busNames: [],
    busPlates: [],
    stations: [],
  });
  const [newStation, setNewStation] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const [buses, setBuses] = useState([]);
  const [editingRoute, setEditingRoute] = useState(null);
  const [originalStations, setOriginalStations] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    if (editingRoute) {
      const initialRoute = {
        departure: editingRoute.departure,
        destination: editingRoute.destination,
        busIds: editingRoute.busIds || [editingRoute.busId],
        busNames: editingRoute.busNames || [editingRoute.busName],
        busPlates: editingRoute.busPlates || [editingRoute.busPlate],
        stations: editingRoute.stations || [],
      };

      setNewRoute(initialRoute);
      setOriginalStations([...editingRoute.stations]);

      const selectedBusesFromRoute = buses.filter((bus) =>
        initialRoute.busIds.includes(bus.id.toString())
      );
      setSelectedBuses(selectedBusesFromRoute);
    }
  }, [editingRoute, buses]);

  useEffect(() => {
    loadRouteData();
  }, []);

  // Animation effects
  useEffect(() => {
    if (busModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [busModalVisible]);

  const loadRouteData = async () => {
    try {
      const routeData = localStorage.getItem("editingRoute");
      const busesData = localStorage.getItem("availableBuses");

      if (routeData) {
        const route = JSON.parse(routeData);
        setEditingRoute(route);

        const initialRoute = {
          departure: route.departure,
          destination: route.destination,
          busIds: route.busIds || [route.busId],
          busNames: route.busNames || [route.busName],
          busPlates: route.busPlates || [route.busPlate],
          stations: route.stations || [],
        };

        setNewRoute(initialRoute);
        setOriginalStations([...route.stations]);
      }

      if (busesData) {
        const busesList = JSON.parse(busesData);
        setBuses(busesList);

        if (routeData) {
          const route = JSON.parse(routeData);
          const busIds = route.busIds || [route.busId];
          const selectedBusesFromRoute = busesList.filter((b) =>
            busIds.includes(b.id.toString())
          );
          setSelectedBuses(selectedBusesFromRoute);
        }
      }
    } catch (error) {
      console.error("Error loading route data from localStorage:", error);
      showAlert("Failed to load route data");
    }
  };

  const stationsModified = () => {
    if (newRoute.stations.length !== originalStations.length) {
      return true;
    }

    return newRoute.stations.some((station, index) => {
      const originalStation = originalStations[index];
      return !originalStation || station.name !== originalStation.name;
    });
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  const generateNewSubRoutes = () => {
    if (newRoute.stations.length < 2) {
      return [];
    }

    const allStations = newRoute.stations;
    const reordered = [allStations[0], ...allStations.slice(2), allStations[1]];

    let newSubRoutes = [];
    let counter = 1;

    for (let i = 0; i < reordered.length - 1; i++) {
      for (let j = i + 1; j < reordered.length; j++) {
        const from = reordered[i].station;
        const to = reordered[j].station;

        const subrouteExists = editingRoute.subroutes?.some(
          (subroute) => subroute.from === from && subroute.to === to
        );

        if (!subrouteExists) {
          newSubRoutes.push({
            subrouteid: `${from[0]}${to[0]}-${counter
              .toString()
              .padStart(3, "0")}`,
            from: from,
            to: to,
            fare: "0.00",
            kidsFare: "0.00",
            isNew: true,
          });
          counter++;
        }
      }
    }

    console.log("Generated new subroutes:", newSubRoutes);
    return newSubRoutes;
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
        station: depTown.toUpperCase().trim(),
      };
      newRoute.stations.push(stationData);

      stationData = {
        id: `station_b${Date.now()}`,
        station: desTown.toUpperCase().trim(),
      };
      newRoute.stations.push(stationData);
    }

    stationData = {
      id: `station_c${Date.now()}`,
      station: newStation.toUpperCase().trim(),
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

    const hasNewStations = stationsModified();
    console.log("====================================");
    console.log("editingRoute", editingRoute);
    console.log("====================================");
    if (hasNewStations) {
      const newSubRoutes = generateNewSubRoutes();
      console.log("New subroutes to generate:", newSubRoutes);

      const routeData = {
        id: parseFloat(editingRoute.id),
        busIds: selectedBuses.map((bus) => bus.id.toString()),
        busNames: selectedBuses.map((bus) => bus.busname),
        busPlates: selectedBuses.map((bus) => bus.numberplate),
        departure: newRoute.departure.toUpperCase().trim(),
        destination: newRoute.destination.toUpperCase().trim(),
        stations: newRoute.stations,
        subroutes: newSubRoutes,
        existingSubroutes: editingRoute.subroutes || [],
        isEditing: true,
      };

      localStorage.setItem("busRoute", JSON.stringify(routeData));
      navigate("/save-subroutes");
    } else {
      await handleDirectUpdate();
    }
  };

  const handleDirectUpdate = async () => {
    setUpdating(true);
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const updateData = {
        bus_ids: selectedBuses.map((bus) => parseInt(bus.id)),
        departure: newRoute.departure.toUpperCase().trim(),
        destination: newRoute.destination.toUpperCase().trim(),
        currency_symbol: "$",
        currency_code: "USD",
        stations: newRoute.stations,
        subroutes: editingRoute.subroutes || [],
      };

      let response = await fetch(`${apiLink}/routes/${editingRoute.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log("====================================");
      console.log(data);
      console.log("====================================");
      setUpdating(false);

      if (!response.ok) {
        showAlert(data.message || "Failed to update route");
      } else {
        showSuccess("Route updated successfully!");
        navigate(-1);
      }
    } catch (error) {
      setUpdating(false);
      showAlert("Failed to update route, check your internet connectivity");
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
  };

  const showAlert = (message) => {
    console.log("Showing alert:", message);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    console.log("Showing success:", message);
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const StationListItem = ({ station, id, index }) => (
    <div className="edit-route-station-card">
      <div className="edit-route-station-content">
        <div className="edit-route-station-header">
          <div className="edit-route-station-number">
            <div className="edit-route-station-number-text">{index + 1}</div>
          </div>
          <div className="edit-route-station-name">{station.station}</div>
          <button
            className="edit-route-delete-station-button"
            onClick={() => handleRemoveStation(id)}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

  const BusListItem = ({ bus }) => (
    <div 
      className={`edit-route-bus-list-item ${isBusSelected(bus.id) ? 'edit-route-bus-list-item-selected' : ''}`}
      onClick={() => handleSelectBus(bus)}
    >
      <div className="edit-route-bus-list-content">
        <div className="edit-route-bus-list-icon">
          <span className="edit-route-bus-icon">🚌</span>
        </div>
        <div className="edit-route-bus-list-info">
          <div className="edit-route-bus-list-name">{bus.busname}</div>
          <div className="edit-route-bus-list-plate">{bus.numberplate}</div>
        </div>
        <div className="edit-route-bus-list-meta">
          <div className="edit-route-bus-list-conductor">
            {bus.conductorname ? "Conductor Assigned" : "No conductor"}
          </div>
          {isBusSelected(bus.id) ? (
            <span className="edit-route-checkmark">✓</span>
          ) : (
            <span className="edit-route-chevron">›</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title={editingRoute ? "Edit Route" : "Create New Route"}
        subtitle={editingRoute ? "Update route and add new stations" : "Define route with stations"}
        companyName={user?.company_name || "Company"}
        onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={updating}
      />
      
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="edit-route-container">
          <div className="edit-route-content">
            {/* Header */}
            <div className="edit-route-header">
              <div className="edit-route-header-content">
                <button className="edit-route-back-button" onClick={() => navigate(-1)}>
                  <span className="edit-route-back-icon">←</span>
                  Back
                </button>
                
                <div className="edit-route-header-title-container">
                  <div className="edit-route-header-title">
                    {editingRoute ? "Edit Route" : "Create New Route"}
                  </div>
                  <div className="edit-route-header-subtitle">
                    {editingRoute
                      ? "Update route and add new stations"
                      : "Define route with stations"}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="edit-route-form-container">
              {/* Route Information */}
              <div className="edit-route-section">
                <div className="edit-route-section-title">Route Information</div>

                <div className="edit-route-input-group">
                  <div className="edit-route-input-label">Departure City *</div>
                  <input
                    type="text"
                    placeholder="Enter departure city"
                    value={newRoute.departure}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, departure: e.target.value })
                    }
                    className="edit-route-text-input"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>

                <div className="edit-route-input-group">
                  <div className="edit-route-input-label">Destination City *</div>
                  <input
                    type="text"
                    placeholder="Enter destination city"
                    value={newRoute.destination}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, destination: e.target.value })
                    }
                    className="edit-route-text-input"
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>

                {/* Bus Selection */}
                <div className="edit-route-input-group">
                  <div className="edit-route-input-label">Assign Buses *</div>
                  <button
                    className="edit-route-select-button"
                    onClick={() => setBusModalVisible(true)}
                  >
                    <span className="edit-route-input-icon">🚌</span>
                    <div className={`edit-route-select-button-text ${selectedBuses.length > 0 ? 'edit-route-select-button-text-selected' : ''}`}>
                      {selectedBuses.length > 0
                        ? `${selectedBuses.length} bus${selectedBuses.length > 1 ? "es" : ""} selected`
                        : "Select buses"}
                    </div>
                    <span className="edit-route-chevron-down">▼</span>
                  </button>
                  {selectedBuses.length > 0 && (
                    <div className="edit-route-selected-bus-info">
                      {selectedBuses
                        .map((bus) => `${bus.busname} (${bus.numberplate})`)
                        .join(", ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Stations Section */}
              <div className="edit-route-section">
                <div className="edit-route-section-title">Stations</div>
                <div className="edit-route-section-subtitle">
                  Add stations in order from departure to destination
                </div>

                {/* Add Station Form */}
                <div className="edit-route-add-station-form">
                  <div className="edit-route-station-input-row">
                    <div className="edit-route-input-group">
                      <div className="edit-route-input-label">Station Name</div>
                      <input
                        type="text"
                        placeholder="Enter station name"
                        value={newStation}
                        onChange={(e) => setNewStation(e.target.value)}
                        className="edit-route-text-input"
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>
                  </div>
                  <button
                    className="edit-route-add-station-button"
                    onClick={handleAddStation}
                  >
                    <span className="edit-route-add-icon">+</span>
                    <div className="edit-route-add-station-button-text">Add Station</div>
                  </button>
                </div>

                {/* Stations List */}
                {newRoute.stations.length > 0 && (
                  <div className="edit-route-stations-list-container">
                    <div className="edit-route-stations-list-title">
                      Added Stations ({newRoute.stations.length})
                    </div>
                    <div className="edit-route-stations-list">
                      {newRoute.stations.map((station, index) => (
                        <StationListItem
                          key={station.id}
                          station={station}
                          id={station.id}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            {!isInputFocused && (
              <div className="edit-route-footer">
                <button
                  className="edit-route-cancel-button"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
                <button
                  className={`edit-route-create-button ${(!newRoute.departure || !newRoute.destination || selectedBuses.length === 0 || newRoute.stations.length < 2) ? 'edit-route-create-button-disabled' : ''}`}
                  onClick={handleCreateRoute}
                  disabled={!newRoute.departure || !newRoute.destination || selectedBuses.length === 0 || newRoute.stations.length < 2 || creating || updating}
                >
                  {creating || updating ? (
                    <div className="edit-route-loading-spinner"></div>
                  ) : (
                    <>
                      <span className="edit-route-check-icon">✓</span>
                      <div className="edit-route-create-button-text">
                        {editingRoute ? "Update Route" : "Generate Routes"}
                      </div>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bus Selection Modal */}
        {busModalVisible && (
          <div className="edit-route-modal-overlay">
            <div 
              className="edit-route-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="edit-route-modal-header">
                <div className="edit-route-modal-header-content">
                  <div className="edit-route-modal-title-row">
                    <div className="edit-route-modal-icon">
                      🚌
                    </div>
                    <div className="edit-route-modal-title-container">
                      <div className="edit-route-modal-title">Select Buses</div>
                      <div className="edit-route-modal-subtitle">
                        Tap buses to select/deselect ({selectedBuses.length} selected)
                      </div>
                    </div>
                  </div>
                  <button
                    className="edit-route-close-button"
                    onClick={() => setBusModalVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="edit-route-modal-body">
                {selectedBuses.length > 0 && (
                  <div className="edit-route-selected-buses-header">
                    <div className="edit-route-selected-buses-text">
                      Selected: {selectedBuses.map((bus) => bus.busname).join(", ")}
                    </div>
                  </div>
                )}
                <div className="edit-route-modal-list-container">
                  {buses.map((bus) => (
                    <BusListItem key={bus.id} bus={bus} />
                  ))}
                </div>
              </div>

              <div className="edit-route-bus-modal-footer">
                <button
                  className="edit-route-done-button"
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

export default EditRouteScreen;