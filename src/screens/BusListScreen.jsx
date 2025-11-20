import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Apilink from '../baseUrl/baseUrl';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/BusListScreen.css';

const ITEMS_PER_PAGE = 10;

const BusListScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [buses, setBuses] = useState([]);
  const { logout, user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingType, setProcessingType] = useState('processing');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newBus, setNewBus] = useState({
    userid: '',
    busname: '',
    numberplate: '',
  });
  const [editingBus, setEditingBus] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("buses");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  // Load buses on component mount
  useEffect(() => {
    fetchBuses();
  }, []);

  // Animation effects
  useEffect(() => {
    if (modalVisible || editModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [modalVisible, editModalVisible]);

  // Show processing modal
  const showProcessing = (type = 'processing', customTitle, customSubtitle) => {
    setProcessingType(type);
    setProcessing(true);
  };

  // Hide processing modal
  const hideProcessing = () => {
    setProcessing(false);
  };

  // Load buses and routes
  const fetchBuses = async () => {
    setFetching(true);
    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      // Fetch buses
      let busResponse = await fetch(`${apiLink}/buses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const busData = await busResponse.json();

      if (!busResponse.ok) {
        showAlert('Failed to fetch buses, check your internet connectivity');
      } else {
        setBuses(busData.buses);
        // Fetch routes after buses are loaded
        await fetchRoutes(busData.buses);
      }
    } catch (error) {
      showAlert('Failed to fetch data, check your internet connectivity');
    } finally {
      setFetching(false);
    }
  };

  // Fetch routes data
  const fetchRoutes = async (busesList) => {
    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      let routesResponse = await fetch(`${apiLink}/routes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const routesData = await routesResponse.json();

      if (routesResponse.ok) {
        setRoutes(routesData.routes || []);
      }
    } catch (error) {
      console.log('Failed to fetch routes:', error);
    }
  };

  // Filter buses based on search
  const filteredBuses = useMemo(() => {
    const filtered = buses.filter(
      (bus) =>
        bus.busname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.numberplate.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setCurrentPage(1);
    return filtered;
  }, [searchQuery, buses]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBuses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentBuses = filteredBuses.slice(startIndex, endIndex);

  const handleCreateBus = async () => {
    // Validation
    if (!newBus.busname.trim() || !newBus.numberplate.trim()) {
      alert('Error: Please fill in Bus Name and Number Plate');
      return;
    }

    // Check if number plate already exists
    if (
      buses.some((bus) => bus.numberplate === newBus.numberplate.toUpperCase())
    ) {
      alert('Error: Number Plate already exists');
      return;
    }

    // Generate unique bus ID based on bus name and timestamp
    const busId = `BUS_${Date.now()}`;

    const busData = {
      busname: newBus.busname.toUpperCase(),
      numberplate: newBus.numberplate.toUpperCase(),
      id: busId,
      route: '',
      conductorname: '',
      conductorId: '',
      user_id: user.user_id,
    };

    await saveBuses(busData);
    setModalVisible(false);
    resetForm();
  };

  const updateBus = async () => {
    if (!editingBus) return;
    if (updating) return;

    setUpdating(true);
    showProcessing(
      'updating',
      'Updating Bus',
      'Please wait while we update bus information...'
    );

    // Validation
    if (!editingBus.busname.trim() || !editingBus.numberplate.trim()) {
      alert('Error: Please fill in Bus Name and Number Plate');
      hideProcessing();
      setUpdating(false);
      return;
    }

    const busObj = {
      busname: editingBus.busname,
      numberplate: editingBus.numberplate,
    };

    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      let response = await fetch(`${apiLink}/buses/${editingBus.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(busObj),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert(data.message);
      } else {
        showSuccess('Updating successful');
        setBuses(data.allbuses);
      }
    } catch (error) {
      showAlert('Failed to update bus');
    } finally {
      setEditModalVisible(false);
      setEditingBus(null);
      setUpdating(false);
      hideProcessing();
    }
  };

  const deleteBus = async (id) => {
    showProcessing(
      'deleting',
      'Deleting Bus',
      'Please wait while we delete the bus...'
    );

    const token = user.token;
    const apiLink = Apilink.getLink();
    
    try {
      let response = await fetch(`${apiLink}/buses/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert(data.message);
      } else {
        setBuses(data.allbuses);
        showSuccess('Deleting successful');
      }
    } catch (error) {
      showAlert('Failed to delete bus');
    } finally {
      hideProcessing();
    }
  };

  const saveBuses = async (busesArray) => {
    try {
      showProcessing(
        'saving',
        'Creating Bus',
        'Please wait while we create your bus...'
      );

      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let response = await fetch(`${apiLink}/buses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(busesArray),
      });
      
      const data = await response.json();
      if (!response.ok) {
        showAlert(data.message);
        throw new Error(`httpError ${response.status} `);
      }
      setBuses(data.allbuses);
      alert('Success: Bus created successfully!');
    } catch (error) {
      alert('Error: Failed to save buses');
    } finally {
      hideProcessing();
    }
  };

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setEditModalVisible(true);
  };

  const handleDeleteBus = (busId) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      deleteBus(busId);
    }
  };

  const resetForm = () => {
    setNewBus({
      busname: '',
      numberplate: '',
    });
    setFocusedInput(null);
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
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

  const getBusRoutes = (busId) => {
    return routes.filter((route) => {
      if (route.buses && Array.isArray(route.buses)) {
        return route.buses.some(
          (busItem) => busItem.id.toString() === busId.toString()
        );
      } else if (route.bus) {
        return route.bus.id.toString() === busId.toString();
      }
      return false;
    });
  };

  const BusListItem = ({ bus }) => {
    const busRoutes = getBusRoutes(bus.id);
    const [showAllRoutes, setShowAllRoutes] = useState(false);
    const initialRoutesToShow = 2;
    const routesToShow = showAllRoutes
      ? busRoutes
      : busRoutes.slice(0, initialRoutesToShow);
    const hiddenRoutesCount = busRoutes.length - initialRoutesToShow;

    const handleToggleRoutes = (e) => {
      e.stopPropagation();
      setShowAllRoutes(!showAllRoutes);
    };

    return (
      <div className="bus-list-item" onClick={() => handleEditBus(bus)}>
        <div className="bus-list-item-content">
          <div className="bus-list-item-header">
            <div className="bus-list-item-icon">
              <span className="bus-icon">🚌</span>
            </div>
            <div className="bus-list-item-info">
              <div className="bus-list-item-name">{bus.busname}</div>
              <div className="bus-list-item-plate">PLATE: {bus.numberplate}</div>
            </div>
          </div>

          <div className="bus-list-item-footer">
            <div className="bus-list-item-details">
              {busRoutes.length > 0 && (
                <div className="bus-routes-section">
                  <div className="bus-routes-header">
                    <span className="route-icon">📍</span>
                    <div className="bus-routes-label">
                      Assigned Routes: {busRoutes.length}
                    </div>
                  </div>

                  <div className="bus-routes-list">
                    {routesToShow.map((route, index) => (
                      <div key={route.route_id || index} className="bus-route-chip">
                        <span className="bus-route-icon">📍</span>
                        <div className="bus-route-chip-text">
                          {route.from} → {route.to}
                        </div>
                      </div>
                    ))}

                    {!showAllRoutes && hiddenRoutesCount > 0 && (
                      <div className="bus-more-routes-chip" onClick={handleToggleRoutes}>
                        <div className="bus-more-routes-text">
                          +{hiddenRoutesCount} more
                        </div>
                      </div>
                    )}

                    {showAllRoutes && busRoutes.length > initialRoutesToShow && (
                      <div className="bus-less-routes-chip" onClick={handleToggleRoutes}>
                        <div className="bus-less-routes-text">
                          Show less
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {busRoutes.length === 0 && (
                <div className="bus-no-routes-section">
                  <div className="bus-no-route-text">No routes assigned</div>
                </div>
              )}
            </div>

            <div className="bus-action-buttons">
              <button className="bus-edit-button" onClick={(e) => { e.stopPropagation(); handleEditBus(bus); }}>
                ✏️
              </button>
              <button className="bus-delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteBus(bus.id); }}>
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Bus Management"
        subtitle="Manage your bus fleet and assignments"
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
        <div className="bus-list-container">
          <div className="bus-list-content">
            {/* Header */}
            <div className="bus-list-header">
              <div className="bus-list-header-content">
                <button className="bus-list-back-button" onClick={() => navigate(-1)}>
                  <span className="bus-list-back-icon">←</span>
                  Back
                </button>
                
                <div className="bus-list-header-title-container">
                  <div className="bus-list-header-title">Bus Management</div>
                  <div className="bus-list-header-subtitle">
                    Manage your bus fleet and assignments
                  </div>
                </div>
              </div>

              {/* Create Bus Button */}
              <button
                className="bus-list-create-button"
                onClick={() => setModalVisible(true)}
              >
                <span className="bus-list-create-icon">+</span>
                Create Bus
              </button>
            </div>

            {/* Search and Stats Section */}
            <div className="bus-list-stats-section">
              <div className="bus-list-search-container">
                <div className="bus-list-search-wrapper">
                  <span className="bus-list-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search buses by name or plate..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                    className="bus-list-search-input"
                  />
                  {searchQuery.length > 0 && (
                    <button className="bus-list-clear-button" onClick={() => setSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="bus-list-stats">
                <div className="bus-list-stat">
                  <div className="bus-list-stat-value">{buses.length}</div>
                  <div className="bus-list-stat-label">Total Buses</div>
                </div>
                <div className="bus-list-stat">
                  <div className="bus-list-stat-value">
                    {buses.filter(bus => getBusRoutes(bus.id).length > 0).length}
                  </div>
                  <div className="bus-list-stat-label">Active Routes</div>
                </div>
              </div>
            </div>

            {/* Buses List */}
            <div className="bus-list-main">
              {fetching && (
                <div className="bus-list-loading">
                  <div className="bus-list-loading-spinner"></div>
                  <div>Loading buses...</div>
                </div>
              )}

              <div className="bus-list-items">
                {currentBuses.map((bus) => (
                  <BusListItem key={bus.id} bus={bus} />
                ))}
                
                {currentBuses.length === 0 && !fetching && (
                  <div className="bus-list-empty-state">
                    <div className="bus-list-empty-icon">🚌</div>
                    <div className="bus-list-empty-text">No buses found</div>
                    <div className="bus-list-empty-subtext">
                      {searchQuery ? "Try adjusting your search" : "Create your first bus to get started"}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredBuses.length > ITEMS_PER_PAGE && (
                <div className="bus-list-pagination-container">
                  <button
                    className={`bus-list-pagination-button ${currentPage === 1 ? 'bus-list-pagination-button-disabled' : ''}`}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  <div className="bus-list-page-numbers">
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        className={`bus-list-page-number ${currentPage === page ? 'bus-list-current-page-number' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className={`bus-list-pagination-button ${currentPage === totalPages ? 'bus-list-pagination-button-disabled' : ''}`}
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Bus Modal */}
        {modalVisible && (
          <div className="bus-list-modal-overlay">
            <div 
              className="bus-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="bus-list-modal-header">
                <div className="bus-list-modal-header-content">
                  <div className="bus-list-modal-title-row">
                    <div className="bus-list-modal-icon">
                      🚌
                    </div>
                    <div className="bus-list-modal-title-container">
                      <div className="bus-list-modal-title">Create New Bus</div>
                      <div className="bus-list-modal-subtitle">
                        Add a new bus to your fleet
                      </div>
                    </div>
                  </div>
                  <button
                    className="bus-list-close-button"
                    onClick={() => {
                      setModalVisible(false);
                      resetForm();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="bus-list-modal-body">
                <div className="bus-list-form-container">
                  <div className="bus-list-input-group">
                    <div className="bus-list-input-label">Bus Name</div>
                    <div className={`bus-list-input-wrapper ${focusedInput === 'busname' ? 'bus-list-input-wrapper-focused' : ''}`}>
                      <span className="bus-list-input-icon">🚌</span>
                      <input
                        type="text"
                        placeholder="Enter bus name"
                        value={newBus.busname}
                        onChange={(e) => setNewBus({ ...newBus, busname: e.target.value })}
                        className="bus-list-text-input"
                        onFocus={() => setFocusedInput('busname')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </div>
                  </div>

                  <div className="bus-list-input-group">
                    <div className="bus-list-input-label">Number Plate</div>
                    <div className={`bus-list-input-wrapper ${focusedInput === 'numberplate' ? 'bus-list-input-wrapper-focused' : ''}`}>
                      <span className="bus-list-input-icon">🔢</span>
                      <input
                        type="text"
                        placeholder="Enter number plate"
                        value={newBus.numberplate}
                        onChange={(e) => setNewBus({ ...newBus, numberplate: e.target.value })}
                        className="bus-list-text-input"
                        onFocus={() => setFocusedInput('numberplate')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bus-list-modal-footer">
                <button
                  className="bus-list-cancel-button"
                  onClick={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`bus-list-create-modal-button ${(!newBus.busname.trim() || !newBus.numberplate.trim()) ? 'bus-list-create-button-disabled' : ''}`}
                  onClick={handleCreateBus}
                  disabled={!newBus.busname.trim() || !newBus.numberplate.trim()}
                >
                  ✓ Create Bus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Bus Modal */}
        {editModalVisible && (
          <div className="bus-list-modal-overlay">
            <div 
              className="bus-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="bus-list-modal-header">
                <div className="bus-list-modal-header-content">
                  <div className="bus-list-modal-title-row">
                    <div className="bus-list-modal-icon">
                      ✏️
                    </div>
                    <div className="bus-list-modal-title-container">
                      <div className="bus-list-modal-title">Edit Bus</div>
                      <div className="bus-list-modal-subtitle">
                        Update bus information
                      </div>
                    </div>
                  </div>
                  <button
                    className="bus-list-close-button"
                    onClick={() => {
                      setEditModalVisible(false);
                      setEditingBus(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="bus-list-modal-body">
                {editingBus && (
                  <div className="bus-list-form-container">
                    <div className="bus-list-input-group">
                      <div className="bus-list-input-label">Bus Name</div>
                      <div className={`bus-list-input-wrapper ${focusedInput === 'edit_busname' ? 'bus-list-input-wrapper-focused' : ''}`}>
                        <span className="bus-list-input-icon">🚌</span>
                        <input
                          type="text"
                          placeholder="Enter bus name"
                          value={editingBus.busname}
                          onChange={(e) => setEditingBus({ ...editingBus, busname: e.target.value })}
                          className="bus-list-text-input"
                          onFocus={() => setFocusedInput('edit_busname')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </div>
                    </div>

                    <div className="bus-list-input-group">
                      <div className="bus-list-input-label">Number Plate</div>
                      <div className={`bus-list-input-wrapper ${focusedInput === 'edit_numberplate' ? 'bus-list-input-wrapper-focused' : ''}`}>
                        <span className="bus-list-input-icon">🔢</span>
                        <input
                          type="text"
                          placeholder="Enter number plate"
                          value={editingBus.numberplate}
                          onChange={(e) => setEditingBus({ ...editingBus, numberplate: e.target.value })}
                          className="bus-list-text-input"
                          onFocus={() => setFocusedInput('edit_numberplate')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bus-list-modal-footer">
                <button
                  className="bus-list-cancel-button"
                  onClick={() => {
                    setEditModalVisible(false);
                    setEditingBus(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`bus-list-create-modal-button ${(!editingBus?.busname.trim() || !editingBus?.numberplate.trim()) ? 'bus-list-create-button-disabled' : ''}`}
                  onClick={updateBus}
                  disabled={!editingBus?.busname.trim() || !editingBus?.numberplate.trim()}
                >
                  {updating ? 'Updating...' : '✓ Update Bus'}
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

        <ProcessingModal
          visible={processing}
          type={processingType}
          customTitle={
            processingType === 'saving'
              ? 'Creating Bus'
              : processingType === 'updating'
              ? 'Updating Bus'
              : processingType === 'deleting'
              ? 'Deleting Bus'
              : 'Processing'
          }
          customSubtitle={
            processingType === 'saving'
              ? 'Please wait while we create your bus...'
              : processingType === 'updating'
              ? 'Please wait while we update bus information...'
              : processingType === 'deleting'
              ? 'Please wait while we delete the bus...'
              : 'Please wait while we process your request...'
          }
        />
      </div>
    </div>
  );
};

export default BusListScreen;