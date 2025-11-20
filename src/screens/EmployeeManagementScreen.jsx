import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Apilink from '../baseUrl/baseUrl';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import AlertSuccess from '../components/AlertSuccess';
import ProcessingModal from '../components/ProcessingModal';
import TopToolbar from '../components/TopToolbar';
import SideNav from '../components/SideNav';
import '../css/EmployeeManagementScreen.css';

const ITEMS_PER_PAGE = 10;

const EmployeeManagementScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newEmployee, setNewEmployee] = useState({
    userid: '',
    staffname: '',
    phonenumber: '',
    pin: '',
    role: '',
    status: 'deactivated',
    id: '',
    busname: '',
  });
  const [filterBusModalVisible, setFilterBusModalVisible] = useState(false);
  const [selectedFilterBus, setSelectedFilterBus] = useState(null);
  const [isFilteredByBus, setIsFilteredByBus] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [switchingEmployeeId, setSwitchingEmployeeId] = useState(null);
  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("employees");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  // Available roles with icons
  const roles = [
    { id: "driver", name: "Driver", icon: "🚗", color: "#007bff" },
    { id: "conductor", name: "Conductor", icon: "👤", color: "#28a745" },
    { id: "admin", name: "Admin", icon: "⚙️", color: "#6f42c1" },
    { id: "owner", name: "Owner", icon: "🏢", color: "#fd7e14" },
    { id: "supervisor", name: "Supervisor", icon: "👁️", color: "#20c997" },
    { id: "inspector", name: "Inspector", icon: "🔍", color: "#e83e8c" },
  ];

  // Load data on component mount
  useEffect(() => {
    loadEmployees();
    fetchBuses();
  }, []);

  // Animation effects
  useEffect(() => {
    if (modalVisible || busModalVisible || roleModalVisible || editModalVisible || filterBusModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [modalVisible, busModalVisible, roleModalVisible, editModalVisible, filterBusModalVisible]);

  const checkPinUniqueness = (pin, excludeEmployeeId = null) => {
    return !employees.some(
      (employee) => employee.pin === pin && employee.id !== excludeEmployeeId
    );
  };

  const loadEmployees = async () => {
    setFetching(true);
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      let response = await fetch(`${apiLink}/employees`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setFetching(false);

      if (!response.ok) {
        showAlert("Failed to fetch employees");
      } else {
        setEmployees(data.allemployees || []);
      }
    } catch (error) {
      setFetching(false);
      showAlert("Failed to load employees");
    }
  };

  const fetchBuses = async () => {
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
      showAlert("Failed to fetch buses");
    } else {
      setBuses(data.buses || []);
    }
  };

  // Filter employees based on search and bus filter
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Apply bus filter if selected
    if (isFilteredByBus && selectedFilterBus) {
      filtered = filtered.filter(
        (employee) => employee.busid === selectedFilterBus.id
      );
    }

    // Apply search filter
    filtered = filtered.filter(
      (employee) =>
        employee.staffname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.busname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.phonenumber.includes(searchQuery)
    );

    setCurrentPage(1);
    return filtered;
  }, [searchQuery, employees, isFilteredByBus, selectedFilterBus]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const generatePin = () => {
    let pin = "";
    let attempts = 0;
    const maxAttempts = 100;

    do {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
    } while (!checkPinUniqueness(pin) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      showAlert("Could not generate a unique PIN automatically. Please enter one manually.");
      return "";
    }

    return pin;
  };

  // Bus filter functions
  const handleSelectFilterBus = (bus) => {
    setSelectedFilterBus(bus);
    setIsFilteredByBus(true);
    setFilterBusModalVisible(false);
  };

  const clearBusFilter = () => {
    setSelectedFilterBus(null);
    setIsFilteredByBus(false);
  };

  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setNewEmployee({
      ...newEmployee,
      busname: bus.busname,
      id: bus.id,
    });
    setBusModalVisible(false);

    // Auto-generate PIN when bus is selected
    const generatedPin = generatePin();
    setNewEmployee((prev) => ({
      ...prev,
      pin: generatedPin,
    }));
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setNewEmployee({
      ...newEmployee,
      role: role.id,
    });
    setRoleModalVisible(false);
  };

  const handleCreateEmployee = async () => {
    // Validation for each field
    if (!newEmployee.staffname.trim()) {
      showAlert("Please enter employee name");
      return;
    }
    if (!newEmployee.phonenumber.trim()) {
      showAlert("Please enter phone number");
      return;
    }

    if (!selectedBus) {
      showAlert("Please select a bus");
      return;
    }

    if (!selectedRole) {
      showAlert("Please select a role");
      return;
    }

    // Validate PIN - must be exactly 4 digits
    if (!newEmployee.pin.trim()) {
      showAlert("Please enter a 4-digit PIN");
      return;
    }

    if (newEmployee.pin.length !== 4) {
      showAlert("PIN must be exactly 4 digits");
      return;
    }

    if (!/^\d+$/.test(newEmployee.pin)) {
      showAlert("PIN must contain only numbers");
      return;
    }

    // Check if PIN is unique
    if (!checkPinUniqueness(newEmployee.pin)) {
      showAlert("This PIN is already assigned to another employee. Please use a different PIN.");
      return;
    }

    setCreating(true);
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const employeeData = {
        staffname: newEmployee.staffname,
        phonenumber: newEmployee.phonenumber,
        pin: newEmployee.pin,
        role: newEmployee.role,
        status: "deactivated",
        busid: selectedBus.id,
      };

      let response = await fetch(`${apiLink}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });

      const data = await response.json();
      setCreating(false);

      if (!response.ok) {
        showAlert(data.message || "Failed to create employee");
      } else {
        setEmployees(data.allemployees || []);
        setModalVisible(false);
        resetForm();
        showSuccess("Employee created successfully!");
      }
    } catch (error) {
      setCreating(false);
      showAlert("Failed to create employee");
    }
  };

  const resetForm = () => {
    setNewEmployee({
      staffname: "",
      busname: "",
      phonenumber: "",
      id: "",
      userid: "",
      pin: "",
      role: "",
      status: "deactivated",
    });
    setSelectedBus(null);
    setSelectedRole(null);
    setFocusedInput(null);
  };

  const handleDeleteEmployee = (employeeId) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setDeleting(true);
      const deleteEmployee = async () => {
        try {
          const token = user.token;
          const apiLink = Apilink.getLink();
          
          let response = await fetch(`${apiLink}/employees/${employeeId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          setDeleting(false);

          if (!response.ok) {
            showAlert(data.message || "Failed to delete employee");
          } else {
            setEmployees(data.allemployees || []);
            showSuccess("Employee deleted successfully!");
          }
        } catch (error) {
          setDeleting(false);
          showAlert("Failed to delete employee, check your internet connectivity");
        }
      };
      deleteEmployee();
    }
  };

const handleToggleStatus = async (employeeId, currentStatus) => {
  const newStatus = currentStatus === "active" ? "deactivated" : "active";
  
  // Set loading state for this specific employee
  setSwitchingEmployeeId(employeeId);

  try {
    const token = user.token;
    const apiLink = Apilink.getLink();
    
    let response = await fetch(`${apiLink}/employees/${employeeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.message || "Failed to update employee status");
      // Reset loading state on error
      setSwitchingEmployeeId(null);
    } else {
      setEmployees(data.allemployees || []);
      // Reset loading state on success
      setSwitchingEmployeeId(null);
    }
  } catch (error) {
    showAlert("Failed to update employee status");
    // Reset loading state on error
    setSwitchingEmployeeId(null);
  }
};

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    // Find the bus and role for the employee
    const bus = buses.find((b) => b.id === employee.busid);
    const role = roles.find((r) => r.id === employee.role);

    setSelectedBus(bus || null);
    setSelectedRole(role || null);
    setEditModalVisible(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    // Validation
    if (!editingEmployee.staffname.trim()) {
      showAlert("Please enter employee name");
      return;
    }

    if (!selectedBus) {
      showAlert("Please select a bus");
      return;
    }

    if (!selectedRole) {
      showAlert("Please select a role");
      return;
    }

    // Validate PIN - must be exactly 4 digits
    if (!editingEmployee.pin.trim()) {
      showAlert("Please enter a 4-digit PIN");
      return;
    }

    if (editingEmployee.pin.length !== 4) {
      showAlert("PIN must be exactly 4 digits");
      return;
    }

    if (!/^\d+$/.test(editingEmployee.pin)) {
      showAlert("PIN must contain only numbers");
      return;
    }

    // Check if PIN is unique (excluding the current employee being edited)
    if (!checkPinUniqueness(editingEmployee.pin, editingEmployee.id)) {
      showAlert("This PIN is already assigned to another employee. Please use a different PIN.");
      return;
    }

    setUpdating(true);
    try {
      const token = user.token;
      const apiLink = Apilink.getLink();
      
      const updatedEmployee = {
        staffname: editingEmployee.staffname,
        phonenumber: editingEmployee.phonenumber,
        pin: editingEmployee.pin,
        role: selectedRole.id,
        busid: selectedBus.id,
      };

      let response = await fetch(`${apiLink}/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedEmployee),
      });

      const data = await response.json();
      setUpdating(false);

      if (!response.ok) {
        showAlert(data.message || "Failed to update employee");
      } else {
        setEmployees(data.allemployees || []);
        setEditModalVisible(false);
        setEditingEmployee(null);
        setSelectedBus(null);
        setSelectedRole(null);
        showSuccess("Employee updated successfully!");
      }
    } catch (error) {
      setUpdating(false);
      showAlert("Failed to update employee");
    }
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

  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

const EmployeeListItem = ({ employee }) => {
  const role = roles.find((r) => r.id === employee.role);
  const isSwitching = switchingEmployeeId === employee.id;

  // Handle switch toggle separately
  const handleSwitchToggle = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    if (!isSwitching) { // Only allow toggle if not already switching
      handleToggleStatus(employee.id, employee.status);
    }
  };

  // Handle edit button click
  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    handleEditEmployee(employee);
  };

  // Handle delete button click
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    handleDeleteEmployee(employee.id);
  };

  return (
    <div className="employee-list-item" onClick={() => !isSwitching && handleEditEmployee(employee)}>
      <div className="employee-list-item-content">
        <div className="employee-list-item-header">
          <div 
            className="employee-list-item-icon"
            style={{ backgroundColor: role?.color + "20" }}
          >
            <span className="employee-icon">{role?.icon || "👤"}</span>
          </div>
          <div className="employee-list-item-info">
            <div className="employee-list-item-name">{employee.staffname}</div>
            <div className="employee-list-item-role">{role?.name || "No role"}</div>
          </div>
          <div className="employee-list-item-meta">
            <div className="employee-list-item-bus">{employee.busname}</div>
            <div className="employee-status-container">
              <div className="employee-status-label">
                {employee.status === "active" ? "Active" : "Inactive"}
              </div>
              
              {/* Show loading spinner instead of switch when switching */}
              {isSwitching ? (
                <div className="employee-switch-loading-indicator">
                  <div className="employee-switch-spinner"></div>
                </div>
              ) : (
                <label className="employee-switch" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={employee.status === "active"}
                    onChange={handleSwitchToggle}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="employee-slider"></span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="employee-list-item-footer">
          <div className="employee-list-item-details">
            <div className="employee-detail-row">
              <span className="employee-detail-icon">📞</span>
              <div className="employee-detail-text">{employee.phonenumber}</div>
            </div>
            <div className="employee-detail-row">
              <span className="employee-detail-icon">🔑</span>
              <div className="employee-detail-text">PIN: {employee.pin}</div>
            </div>
          </div>
          <div className="employee-action-buttons">
            <button 
              className="employee-edit-button"
              onClick={handleEditClick}
              disabled={isSwitching}
            >
              ✏️
            </button>
            <button 
              className="employee-delete-button"
              onClick={handleDeleteClick}
              disabled={isSwitching}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const BusListItem = ({ bus }) => {
    return (
      <div 
        className={`employee-bus-list-item ${selectedBus && selectedBus.id === bus.id ? 'employee-selected-bus-item' : ''}`}
        onClick={() => handleSelectBus(bus)}
      >
        <div className="employee-bus-list-content">
          <div className="employee-bus-list-icon">
            <span className="bus-icon">🚌</span>
          </div>
          <div className="employee-bus-list-info">
            <div className="employee-bus-list-name">{bus.busname}</div>
            <div className="employee-bus-list-plate">{bus.numberplate}</div>
          </div>
          <div className="employee-bus-list-meta">
            <div className="employee-bus-list-conductor">
              {bus.conductorname || "No conductor"}
            </div>
            {selectedBus && selectedBus.id === bus.id && (
              <span className="employee-checkmark">✓</span>
            )}
            <span className="employee-chevron">›</span>
          </div>
        </div>
      </div>
    );
  };

  const FilterBusListItem = ({ bus }) => (
    <div 
      className={`employee-bus-list-item ${selectedFilterBus && selectedFilterBus.id === bus.id ? 'employee-selected-bus-item' : ''}`}
      onClick={() => handleSelectFilterBus(bus)}
    >
      <div className="employee-bus-list-content">
        <div className="employee-bus-list-icon">
          <span className="bus-icon">🚌</span>
        </div>
        <div className="employee-bus-list-info">
          <div className="employee-bus-list-name">{bus.busname}</div>
          <div className="employee-bus-list-plate">{bus.numberplate}</div>
        </div>
        <div className="employee-bus-list-meta">
          <div className="employee-bus-list-conductor">
            {bus.conductorname || "No conductor"}
          </div>
          {selectedFilterBus && selectedFilterBus.id === bus.id && (
            <span className="employee-checkmark">✓</span>
          )}
          <span className="employee-chevron">›</span>
        </div>
      </div>
    </div>
  );

  const RoleListItem = ({ role }) => (
    <div className="employee-role-list-item" onClick={() => handleSelectRole(role)}>
      <div className="employee-role-list-content">
        <div 
          className="employee-role-icon-container"
          style={{ backgroundColor: role.color + "20" }}
        >
          <span className="employee-role-icon">{role.icon}</span>
        </div>
        <div className="employee-role-list-info">
          <div className="employee-role-list-name">{role.name}</div>
        </div>
        <span className="employee-chevron">›</span>
      </div>
    </div>
  );

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
        title="Employee Management"
        subtitle="Manage bus staff and assignments"
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
        <div className="employee-list-container">
          <div className="employee-list-content">
            {/* Header */}
            <div className="employee-list-header">
              <div className="employee-list-header-content">
                <button className="employee-list-back-button" onClick={() => navigate(-1)}>
                  <span className="employee-list-back-icon">←</span>
                  Back
                </button>
                
                <div className="employee-list-header-title-container">
                  <div className="employee-list-header-title">Employee Management</div>
                  <div className="employee-list-header-subtitle">
                    Manage bus staff and assignments
                  </div>
                </div>

                {/* Filter Button */}
                <button
                  className="employee-filter-button"
                  onClick={() => setFilterBusModalVisible(true)}
                >
                  <span 
                    className="employee-filter-icon"
                    style={{ color: isFilteredByBus ? "#ffd700" : "white" }}
                  >
                    🔍
                  </span>
                  {isFilteredByBus && <div className="employee-filter-active-dot" />}
                </button>
              </div>

              {/* Create Employee Button */}
              <button
                className="employee-list-create-button"
                onClick={() => setModalVisible(true)}
              >
                <span className="employee-list-create-icon">+</span>
                Add Employee
              </button>
            </div>

            {/* Search and Stats Section */}
            <div className="employee-list-stats-section">
              <div className="employee-list-search-container">
                <div className="employee-list-search-wrapper">
                  <span className="employee-list-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder={
                      isFilteredByBus && selectedFilterBus
                        ? `Search employees in ${selectedFilterBus.busname}...`
                        : "Search employees by name, phone or bus..."
                    }
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                    className="employee-list-search-input"
                  />
                  {searchQuery.length > 0 && (
                    <button className="employee-list-clear-button" onClick={() => setSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>

                {/* Show active bus filter */}
                {isFilteredByBus && selectedFilterBus && (
                  <div className="employee-active-filter-container">
                    <div className="employee-active-filter-badge">
                      <span className="employee-active-filter-icon">🚌</span>
                      <div className="employee-active-filter-text">
                        Showing: {selectedFilterBus.busname}
                      </div>
                      <button
                        className="employee-clear-active-filter"
                        onClick={clearBusFilter}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="employee-list-stats">
                <div className="employee-list-stat">
                  <div className="employee-list-stat-value">{employees.length}</div>
                  <div className="employee-list-stat-label">Total Employees</div>
                </div>
                <div className="employee-list-stat">
                  <div className="employee-list-stat-value">
                    {employees.filter(emp => emp.status === 'active').length}
                  </div>
                  <div className="employee-list-stat-label">Active</div>
                </div>
              </div>
            </div>

            {/* Employees List */}
            <div className="employee-list-main">
              {fetching && (
                <div className="employee-list-loading">
                  <div className="employee-list-loading-spinner"></div>
                  <div>Loading employees...</div>
                </div>
              )}

              <div className="employee-list-items">
                {currentEmployees.map((employee) => (
                  <EmployeeListItem key={employee.id} employee={employee} />
                ))}
                
                {currentEmployees.length === 0 && !fetching && (
                  <div className="employee-list-empty-state">
                    <div className="employee-list-empty-icon">👥</div>
                    <div className="employee-list-empty-text">No employees found</div>
                    <div className="employee-list-empty-subtext">
                      {searchQuery ? "Try adjusting your search" : "Add your first employee to get started"}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {filteredEmployees.length > ITEMS_PER_PAGE && (
                <div className="employee-list-pagination-container">
                  <button
                    className={`employee-list-pagination-button ${currentPage === 1 ? 'employee-list-pagination-button-disabled' : ''}`}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  <div className="employee-list-page-numbers">
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        className={`employee-list-page-number ${currentPage === page ? 'employee-list-current-page-number' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    className={`employee-list-pagination-button ${currentPage === totalPages ? 'employee-list-pagination-button-disabled' : ''}`}
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

        {/* Create Employee Modal */}
        {modalVisible && (
          <div className="employee-list-modal-overlay">
            <div 
              className="employee-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="employee-list-modal-header">
                <div className="employee-list-modal-header-content">
                  <div className="employee-list-modal-title-row">
                    <div className="employee-list-modal-icon">
                      👤
                    </div>
                    <div className="employee-list-modal-title-container">
                      <div className="employee-list-modal-title">Add New Employee</div>
                      <div className="employee-list-modal-subtitle">
                        Assign staff to buses and roles
                      </div>
                    </div>
                  </div>
                  <button
                    className="employee-list-close-button"
                    onClick={() => {
                      setModalVisible(false);
                      resetForm();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="employee-list-modal-body">
                <div className="employee-list-form-container">
                  {/* Employee Name */}
                  <div className="employee-list-input-group">
                    <div className="employee-list-input-label">Employee Name *</div>
                    <div className={`employee-list-input-wrapper ${focusedInput === 'staffname' ? 'employee-list-input-wrapper-focused' : ''}`}>
                      <span className="employee-list-input-icon">👤</span>
                      <input
                        type="text"
                        placeholder="Enter employee name"
                        value={newEmployee.staffname}
                        onChange={(e) => setNewEmployee({ ...newEmployee, staffname: e.target.value })}
                        className="employee-list-text-input"
                        onFocus={() => setFocusedInput('staffname')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="employee-list-input-group">
                    <div className="employee-list-input-label">Phone Number</div>
                    <div className={`employee-list-input-wrapper ${focusedInput === 'phonenumber' ? 'employee-list-input-wrapper-focused' : ''}`}>
                      <span className="employee-list-input-icon">📞</span>
                      <input
                        type="text"
                        placeholder="Enter phone number"
                        value={newEmployee.phonenumber}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phonenumber: e.target.value })}
                        className="employee-list-text-input"
                        onFocus={() => setFocusedInput('phonenumber')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </div>
                  </div>

                  {/* Bus Selection */}
                  <div className="employee-list-input-group">
                    <div className="employee-list-input-label">Assign to Bus *</div>
                    <button
                      className="employee-list-select-button"
                      onClick={() => setBusModalVisible(true)}
                    >
                      <span className="employee-list-input-icon">🚌</span>
                      <div className={`employee-list-select-button-text ${selectedBus ? 'employee-list-select-button-text-selected' : ''}`}>
                        {selectedBus ? selectedBus.busname : "Select a bus"}
                      </div>
                      <span className="employee-list-chevron-down">▼</span>
                    </button>
                  </div>

                  {/* Role Selection */}
                  <div className="employee-list-input-group">
                    <div className="employee-list-input-label">Role *</div>
                    <button
                      className="employee-list-select-button"
                      onClick={() => setRoleModalVisible(true)}
                    >
                      <span className="employee-list-input-icon">💼</span>
                      <div className={`employee-list-select-button-text ${selectedRole ? 'employee-list-select-button-text-selected' : ''}`}>
                        {selectedRole ? selectedRole.name : "Select a role"}
                      </div>
                      <span className="employee-list-chevron-down">▼</span>
                    </button>
                  </div>

                  {/* PIN Display */}
                  {selectedBus && (
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">4-Digit PIN *</div>
                      <div className="employee-list-pin-container">
                        <span className="employee-list-input-icon">🔑</span>
                        <input
                          type="text"
                          value={newEmployee.pin}
                          onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                          className="employee-list-pin-input"
                          maxLength={4}
                          onFocus={() => setFocusedInput('pin')}
                          onBlur={() => setFocusedInput(null)}
                        />
                        <div className="employee-list-pin-hint">Auto-generated</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="employee-list-modal-footer">
                <button
                  className="employee-list-cancel-button"
                  onClick={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`employee-list-create-modal-button ${(!newEmployee.staffname.trim() || !newEmployee.pin.trim() || newEmployee.pin.length !== 4 || !selectedBus || !selectedRole) ? 'employee-list-create-button-disabled' : ''}`}
                  onClick={handleCreateEmployee}
                  disabled={!newEmployee.pin.trim() || newEmployee.pin.length !== 4 || !newEmployee.staffname.trim() || !selectedBus || !selectedRole || creating}
                >
                  {creating ? 'Creating...' : '✓ Add Employee'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editModalVisible && (
          <div className="employee-list-modal-overlay">
            <div 
              className="employee-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="employee-list-modal-header">
                <div className="employee-list-modal-header-content">
                  <div className="employee-list-modal-title-row">
                    <div className="employee-list-modal-icon">
                      ✏️
                    </div>
                    <div className="employee-list-modal-title-container">
                      <div className="employee-list-modal-title">Edit Employee</div>
                      <div className="employee-list-modal-subtitle">
                        Update employee information
                      </div>
                    </div>
                  </div>
                  <button
                    className="employee-list-close-button"
                    onClick={() => {
                      setEditModalVisible(false);
                      setEditingEmployee(null);
                      setSelectedBus(null);
                      setSelectedRole(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="employee-list-modal-body">
                {editingEmployee && (
                  <div className="employee-list-form-container">
                    {/* Employee Name */}
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">Employee Name *</div>
                      <div className={`employee-list-input-wrapper ${focusedInput === 'edit_staffname' ? 'employee-list-input-wrapper-focused' : ''}`}>
                        <span className="employee-list-input-icon">👤</span>
                        <input
                          type="text"
                          placeholder="Enter employee name"
                          value={editingEmployee.staffname}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, staffname: e.target.value })}
                          className="employee-list-text-input"
                          onFocus={() => setFocusedInput('edit_staffname')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">Phone Number</div>
                      <div className={`employee-list-input-wrapper ${focusedInput === 'edit_phonenumber' ? 'employee-list-input-wrapper-focused' : ''}`}>
                        <span className="employee-list-input-icon">📞</span>
                        <input
                          type="text"
                          placeholder="Enter phone number"
                          value={editingEmployee.phonenumber}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, phonenumber: e.target.value })}
                          className="employee-list-text-input"
                          onFocus={() => setFocusedInput('edit_phonenumber')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </div>
                    </div>

                    {/* Bus Selection */}
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">Assign to Bus *</div>
                      <button
                        className="employee-list-select-button"
                        onClick={() => setBusModalVisible(true)}
                      >
                        <span className="employee-list-input-icon">🚌</span>
                        <div className={`employee-list-select-button-text ${selectedBus ? 'employee-list-select-button-text-selected' : ''}`}>
                          {selectedBus ? selectedBus.busname : "Select a bus"}
                        </div>
                        <span className="employee-list-chevron-down">▼</span>
                      </button>
                    </div>

                    {/* Role Selection */}
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">Role *</div>
                      <button
                        className="employee-list-select-button"
                        onClick={() => setRoleModalVisible(true)}
                      >
                        <span className="employee-list-input-icon">💼</span>
                        <div className={`employee-list-select-button-text ${selectedRole ? 'employee-list-select-button-text-selected' : ''}`}>
                          {selectedRole ? selectedRole.name : "Select a role"}
                        </div>
                        <span className="employee-list-chevron-down">▼</span>
                      </button>
                    </div>

                    {/* PIN Display */}
                    <div className="employee-list-input-group">
                      <div className="employee-list-input-label">4-Digit PIN *</div>
                      <div className="employee-list-pin-container">
                        <span className="employee-list-input-icon">🔑</span>
                        <input
                          type="text"
                          value={editingEmployee.pin}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, pin: e.target.value })}
                          className="employee-list-pin-input"
                          maxLength={4}
                          onFocus={() => setFocusedInput('edit_pin')}
                          onBlur={() => setFocusedInput(null)}
                        />
                        <div className="employee-list-pin-hint">Required</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="employee-list-modal-footer">
                <button
                  className="employee-list-cancel-button"
                  onClick={() => {
                    setEditModalVisible(false);
                    setEditingEmployee(null);
                    setSelectedBus(null);
                    setSelectedRole(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`employee-list-create-modal-button ${(!editingEmployee?.staffname.trim() || !editingEmployee?.pin.trim() || editingEmployee?.pin.length !== 4 || !selectedBus || !selectedRole) ? 'employee-list-create-button-disabled' : ''}`}
                  onClick={handleUpdateEmployee}
                  disabled={!editingEmployee?.pin.trim() || editingEmployee?.pin.length !== 4 || !editingEmployee?.staffname.trim() || !selectedBus || !selectedRole || updating}
                >
                  {updating ? 'Updating...' : '✓ Update Employee'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bus Selection Modal */}
        {busModalVisible && (
          <div className="employee-list-modal-overlay">
            <div 
              className="employee-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="employee-list-modal-header">
                <div className="employee-list-modal-header-content">
                  <div className="employee-list-modal-title-row">
                    <div className="employee-list-modal-icon">
                      🚌
                    </div>
                    <div className="employee-list-modal-title-container">
                      <div className="employee-list-modal-title">Select Bus</div>
                      <div className="employee-list-modal-subtitle">
                        Choose a bus for this employee
                      </div>
                    </div>
                  </div>
                  <button
                    className="employee-list-close-button"
                    onClick={() => setBusModalVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="employee-list-modal-body">
                <div className="employee-bus-list-container">
                  {buses.map((bus) => (
                    <BusListItem key={bus.id} bus={bus} />
                  ))}
                  
                  {buses.length === 0 && (
                    <div className="employee-list-empty-state">
                      <div className="employee-list-empty-icon">🚌</div>
                      <div className="employee-list-empty-text">No buses found</div>
                      <div className="employee-list-empty-subtext">
                        Add buses first to assign employees
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Selection Modal */}
        {roleModalVisible && (
          <div className="employee-list-modal-overlay">
            <div 
              className="employee-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="employee-list-modal-header">
                <div className="employee-list-modal-header-content">
                  <div className="employee-list-modal-title-row">
                    <div className="employee-list-modal-icon">
                      💼
                    </div>
                    <div className="employee-list-modal-title-container">
                      <div className="employee-list-modal-title">Select Role</div>
                      <div className="employee-list-modal-subtitle">
                        Choose a role for this employee
                      </div>
                    </div>
                  </div>
                  <button
                    className="employee-list-close-button"
                    onClick={() => setRoleModalVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="employee-list-modal-body">
                <div className="employee-role-list-container">
                  {roles.map((role) => (
                    <RoleListItem key={role.id} role={role} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bus Filter Modal */}
        {filterBusModalVisible && (
          <div className="employee-list-modal-overlay">
            <div 
              className="employee-list-modal-card"
              style={{
                opacity: fadeAnim,
                transform: `translateY(${slideAnim}px)`
              }}
            >
              <div className="employee-list-modal-header">
                <div className="employee-list-modal-header-content">
                  <div className="employee-list-modal-title-row">
                    <div className="employee-list-modal-icon">
                      🔍
                    </div>
                    <div className="employee-list-modal-title-container">
                      <div className="employee-list-modal-title">Filter by Bus</div>
                      <div className="employee-list-modal-subtitle">
                        Select a bus to view its employees
                      </div>
                    </div>
                  </div>
                  <button
                    className="employee-list-close-button"
                    onClick={() => setFilterBusModalVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="employee-list-modal-body">
                {/* Clear Filter Button */}
                {isFilteredByBus && (
                  <button
                    className="employee-clear-filter-button"
                    onClick={clearBusFilter}
                  >
                    <span className="employee-clear-filter-icon">✕</span>
                    <div className="employee-clear-filter-text">Clear Filter</div>
                  </button>
                )}

                <div className="employee-bus-list-container">
                  {buses.map((bus) => (
                    <FilterBusListItem key={bus.id} bus={bus} />
                  ))}
                  
                  {buses.length === 0 && (
                    <div className="employee-list-empty-state">
                      <div className="employee-list-empty-icon">🚌</div>
                      <div className="employee-list-empty-text">No buses found</div>
                      <div className="employee-list-empty-subtext">
                        Add buses first to filter employees
                      </div>
                    </div>
                  )}
                </div>
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

export default EmployeeManagementScreen;