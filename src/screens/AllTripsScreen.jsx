import React, { useState, useEffect, useCallback, useRef } from "react";
import "../css/AllTripsScreen.css";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import { DateRangePicker, defaultStaticRanges } from "react-date-range";
import DateRangeModal from "../components/DateRangeModal";
import CustomRangeModal from "../components/CustomRangeModal";
import {
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  addDays,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  subYears,
  addYears,
  format,
  parseISO,
  isToday,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";
import { useNavigate, useLocation } from "react-router-dom";

const AllTripsScreen = () => {
  const authContext = useAuth();
  const { user } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  
  // State variables - similar to BusDashboardScreen
  const [allBuses, setAllBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showBusDropdown, setShowBusDropdown] = useState(false);
  const [buses, setBuses] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalPassengers: 0,
    totalTrips: 0,
    busPerformance: [],
    dailySales: [],
    salesByEmployee: [],
    completedTrips: [],
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState(null);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [customStartTime, setCustomStartTime] = useState("00:00");
  const [customEndTime, setCustomEndTime] = useState("23:59");
  const [activeScreen, setActiveScreen] = useState("all-trips");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailModal, setTripDetailModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  // New state variables for missing functions
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiTotals, setApiTotals] = useState({
    totalRevenue: 0,
    totalTickets: 0,
  });

  // Date range picker state
  const [dateRangeState, setDateRangeState] = useState([
    {
      startDate: startOfToday(),
      endDate: endOfToday(),
      key: "selection",
    },
  ]);

  // Constants
  const ITEMS_PER_PAGE = 5;

  // Calculate pagination values
  const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTrips = filteredTrips.slice(startIndex, endIndex);

  // Load data on component mount
// Add this useEffect to fetch all buses and handle initial bus selection
useEffect(() => {
  fetchAllBuses();
  
  // Get bus data from navigation state
  const { bus } = location.state || {};
  if (bus) {
    setSelectedBus(bus);
    console.log("Received bus from navigation:", bus);
  }
}, [location.state]);

// Update the main useEffect to handle initial data fetch
useEffect(() => {
  const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
  setDateRangeState([{ startDate, endDate, key: "selection" }]);
  
  // Only fetch data if we have buses loaded and know which bus to show
  if (allBuses.length > 0) {
    fetchAllTripsData(startDate, endDate, selectedBus);
  }
  
  loadEmployees();
}, [allBuses.length]); // Add allBuses.length as dependency
  // Custom static ranges including "This Year"
  const customStaticRanges = [
    ...defaultStaticRanges,
    {
      label: "This Year",
      range: () => ({
        startDate: startOfYear(new Date()),
        endDate: endOfYear(new Date()),
      }),
      isSelected: () => selectedDateRange === "This Year",
    },
  ];

  // Fetch all buses
const fetchAllBuses = async () => {
  try {
    const token = user?.token;
    const apiLink = Apilink.getLink();

    if (!token) {
      console.error("No authentication token available");
      return;
    }

    let response = await fetch(`${apiLink}/buses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const transformedBuses = data.buses.map(bus => ({
        id: bus.id,
        name: bus.busname,
        plate: bus.numberplate,
        route: bus.route || "No route assigned",
        totalSales: 0,
        totalPassengers: 0,
        trips: 0,
        conductor: bus.conductorname || "Not assigned"
      }));
      setAllBuses(transformedBuses);
      console.log("Fetched all buses:", transformedBuses.length);
    } else {
      console.error("Failed to fetch all buses:", data);
    }
  } catch (error) {
    console.error("Error fetching all buses:", error);
  }
};

  // Fetch all trips data
const fetchAllTripsData = async (startDate, endDate, busToFetch = selectedBus) => {
  try {
    setLoading(true);
    const token = user?.token;
    const apiLink = Apilink.getLink();

    if (!token) {
      console.error("No authentication token available");
      return;
    }

    const requestBody = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    };

    // Only add bus filter if a specific bus is selected
    if (busToFetch?.id || busToFetch?.busId) {
      requestBody.busId = busToFetch.id || busToFetch.busId;
      console.log("Fetching trips for specific bus:", busToFetch.name);
    } else {
      console.log("Fetching trips for ALL buses");
    }

    console.log("Fetching all trips data with:", requestBody);

    let response = await fetch(`${apiLink}/bussummary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to fetch all trips data:", data);
      setDashboardData({
        totalSales: 0,
        totalPassengers: 0,
        totalTrips: 0,
        busPerformance: [],
        dailySales: [],
        salesByEmployee: [],
        completedTrips: [],
      });
    } else {
      console.log("All trips data received:", data);

      // Set base currency
      if (data.baseCurrency) {
        setBaseCurrency(data.baseCurrency);
      }

      // STORE API TOTALS
      setApiTotals({
        totalRevenue: data.totalBusRevenue || 0,
        totalTickets: data.totalBusTickets || 0,
      });

      // Transform API data
      const transformedTrips = (data.trips || []).map((trip) => ({
        tripId: trip.tripId || `TRIP_${trip.id}`,
        tripNumber: trip.tripNumber || 1,
        startTime: trip.startTime,
        endTime: trip.endTime,
        busId: trip.busId?.toString(),
        busName: trip.busName || "Unknown Bus",
        conductorId: trip.conductorId?.toString(),
        conductorName: trip.conductorName || "Unknown Conductor",
        totalSales: trip.totalIncome || trip.totalSales || 0,
        ticketCount: trip.totalTickets || trip.ticketCount || 0,
        status: "completed",
        majorRoute: trip.majorRoute || "Unknown Route",
        timeElapsed: trip.timeElapsed || "0h 0m",
        currencySymbol: trip.currencySymbol || data.baseCurrency?.symbol || "$",
        currencyCode: trip.currencyCode || data.baseCurrency?.code || "USD",
        currencyName: trip.currencyName || data.baseCurrency?.name || "United States Dollar",
      }));

      const transformedData = {
        totalSales: data.totalBusRevenue || 0,
        totalPassengers: data.totalBusTickets || 0,
        totalTrips: transformedTrips.length,
        busPerformance: [],
        dailySales: [],
        salesByEmployee: data.salesByEmployee || [],
        completedTrips: transformedTrips,
      };

      setDashboardData(transformedData);
      setFilteredTrips(transformedTrips);
    }
  } catch (error) {
    console.error("Error fetching all trips data:", error);
    setDashboardData({
      totalSales: 0,
      totalPassengers: 0,
      totalTrips: 0,
      busPerformance: [],
      dailySales: [],
      salesByEmployee: [],
      completedTrips: [],
    });
  } finally {
    setLoading(false);
    setIsRefreshing(false);
  }
};


  // Load employees
  const loadEmployees = async () => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();

      let response = await fetch(`${apiLink}/employees`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setEmployees(data.allemployees || []);
      } else {
        console.error("Failed to fetch employees:", data);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  // Load buses
  const loadBuses = async () => {
    try {
      const token = user?.token;
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
        setBuses(data.buses || []);
      } else {
        console.error("Failed to fetch buses:", data);
      }
    } catch (error) {
      console.error("Error loading buses:", error);
    }
  };

  // Bus selection function
  const handleBusSelect = (selectedBus) => {
    // Clear all existing data immediately
    setDashboardData({
      totalSales: 0,
      totalPassengers: 0,
      totalTrips: 0,
      busPerformance: [],
      dailySales: [],
      salesByEmployee: [],
      completedTrips: [],
    });
    setFilteredTrips([]);
    setApiTotals({
      totalRevenue: 0,
      totalTickets: 0,
    });
    
    // Set loading state to show loading indicator
    setLoading(true);
    
    // Update the selected bus
    setSelectedBus(selectedBus);
    setShowBusDropdown(false);
    
    // Reset search query
    setSearchQuery("");
    
    // Reset pagination
    setCurrentPage(1);
    
    // Fetch data for the newly selected bus
    const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
    fetchAllTripsData(startDate, endDate, selectedBus);
  };

  // Calculate date range function
  const calculateDateRange = (range, baseDate = new Date()) => {
    let startDate, endDate;

    switch (range) {
      case "Today":
        startDate = startOfToday();
        endDate = endOfToday();
        break;
      case "Yesterday":
        startDate = startOfYesterday();
        endDate = endOfYesterday();
        break;
      case "This Week":
        startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
        endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
        break;
      case "Last Week":
        const lastWeekDate = subWeeks(baseDate, 1);
        startDate = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
        break;
      case "This Month":
        startDate = startOfMonth(baseDate);
        endDate = endOfMonth(baseDate);
        break;
      case "Last Month":
        const lastMonthDate = subMonths(baseDate, 1);
        startDate = startOfMonth(lastMonthDate);
        endDate = endOfMonth(lastMonthDate);
        break;
      case "This Year":
        startDate = startOfYear(baseDate);
        endDate = endOfYear(baseDate);
        break;
      default:
        startDate = startOfToday();
        endDate = endOfToday();
    }

    return { startDate, endDate };
  };

  // Handle date range selection from modal
  const handleDateRangeSelect = (range) => {
    setSelectedDateRange(range);
    setShowDateModal(false);

    if (range !== "Custom") {
      let startDate, endDate;
      let newSelectedDate = new Date();

      switch (range) {
        case "Today":
          startDate = startOfToday();
          endDate = endOfToday();
          newSelectedDate = new Date();
          break;
        case "Yesterday":
          startDate = startOfYesterday();
          endDate = endOfYesterday();
          newSelectedDate = subDays(new Date(), 1);
          break;
        case "This Week":
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case "Last Week":
          const lastWeekDate = subWeeks(new Date(), 1);
          startDate = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
          endDate = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
          newSelectedDate = lastWeekDate;
          break;
        case "This Month":
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case "Last Month":
          const lastMonthDate = subMonths(new Date(), 1);
          startDate = startOfMonth(lastMonthDate);
          endDate = endOfMonth(lastMonthDate);
          newSelectedDate = lastMonthDate;
          break;
        case "This Year":
          startDate = startOfYear(new Date());
          endDate = endOfYear(new Date());
          break;
        default:
          startDate = startOfToday();
          endDate = endOfToday();
      }

      setDateRangeState([{ startDate, endDate, key: "selection" }]);
      setSelectedDate(newSelectedDate);
      fetchAllTripsData(startDate, endDate, selectedBus);
    } else {
      setShowCustomRangeModal(true);
    }
  };

  // Date navigation functions
  const handleBackClick = () => {
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];

    switch (selectedDateRange) {
      case "Today":
        const yesterday = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(yesterday);
        newEndDate = endOfDay(yesterday);
        setSelectedDate(yesterday);
        break;
      case "Yesterday":
        const dayBeforeYesterday = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(dayBeforeYesterday);
        newEndDate = endOfDay(dayBeforeYesterday);
        setSelectedDate(dayBeforeYesterday);
        break;
      case "This Week":
        const prevWeek = subWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(prevWeek, { weekStartsOn: 1 });
        newEndDate = endOfWeek(prevWeek, { weekStartsOn: 1 });
        setSelectedDate(prevWeek);
        break;
      case "Last Week":
        const prevLastWeek = subWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(prevLastWeek, { weekStartsOn: 1 });
        newEndDate = endOfWeek(prevLastWeek, { weekStartsOn: 1 });
        setSelectedDate(prevLastWeek);
        break;
      case "This Month":
        const prevMonth = subMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(prevMonth);
        newEndDate = endOfMonth(prevMonth);
        setSelectedDate(prevMonth);
        break;
      case "Last Month":
        const prevLastMonth = subMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(prevLastMonth);
        newEndDate = endOfMonth(prevLastMonth);
        setSelectedDate(prevLastMonth);
        break;
      case "This Year":
        const prevYear = subYears(currentRange.startDate, 1);
        newStartDate = startOfYear(prevYear);
        newEndDate = endOfYear(prevYear);
        setSelectedDate(prevYear);
        break;
      case "Custom":
        const dayDifference = Math.round(
          (currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24)
        );
        newStartDate = subDays(currentRange.startDate, dayDifference + 1);
        newEndDate = subDays(currentRange.endDate, dayDifference + 1);
        setSelectedDate(newStartDate);
        setCustomStartDate(newStartDate);
        setCustomEndDate(newEndDate);
        break;
      default:
        const prevDay = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(prevDay);
        newEndDate = endOfDay(prevDay);
        setSelectedDate(prevDay);
    }

    setDateRangeState([
      { startDate: newStartDate, endDate: newEndDate, key: "selection" },
    ]);
    fetchAllTripsData(newStartDate, newEndDate, selectedBus);
  };

  const handleForwardClick = () => {
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];
    const today = new Date();

    if (!canNavigateForward()) {
      return;
    }

    switch (selectedDateRange) {
      case "Today":
        const tomorrow = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(tomorrow);
        newEndDate = endOfDay(tomorrow);
        setSelectedDate(tomorrow);
        break;
      case "Yesterday":
        const nextDay = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(nextDay);
        newEndDate = endOfDay(nextDay);
        setSelectedDate(nextDay);
        break;
      case "This Week":
        const nextWeek = addWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(nextWeek, { weekStartsOn: 1 });
        newEndDate = endOfWeek(nextWeek, { weekStartsOn: 1 });
        if (newEndDate > today) {
          newEndDate = today;
        }
        setSelectedDate(nextWeek);
        break;
      case "Last Week":
        const nextLastWeek = addWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(nextLastWeek, { weekStartsOn: 1 });
        newEndDate = endOfWeek(nextLastWeek, { weekStartsOn: 1 });
        if (newEndDate > today) {
          newEndDate = today;
        }
        setSelectedDate(nextLastWeek);
        break;
      case "This Month":
        const nextMonth = addMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(nextMonth);
        newEndDate = endOfMonth(nextMonth);
        if (newEndDate > today) {
          newEndDate = today;
        }
        setSelectedDate(nextMonth);
        break;
      case "Last Month":
        const nextLastMonth = addMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(nextLastMonth);
        newEndDate = endOfMonth(nextLastMonth);
        if (newEndDate > today) {
          newEndDate = today;
        }
        setSelectedDate(nextLastMonth);
        break;
      case "This Year":
        const nextYear = addYears(currentRange.startDate, 1);
        newStartDate = startOfYear(nextYear);
        newEndDate = endOfYear(nextYear);
        if (newEndDate > today) {
          newEndDate = today;
        }
        setSelectedDate(nextYear);
        break;
      case "Custom":
        const dayDifference = Math.round(
          (currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24)
        );
        newStartDate = addDays(currentRange.startDate, dayDifference + 1);
        newEndDate = addDays(currentRange.endDate, dayDifference + 1);
        if (newEndDate > today) {
          newEndDate = today;
          newStartDate = subDays(today, dayDifference);
        }
        setSelectedDate(newStartDate);
        setCustomStartDate(newStartDate);
        setCustomEndDate(newEndDate);
        break;
      default:
        const nextDayDefault = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(nextDayDefault);
        newEndDate = endOfDay(nextDayDefault);
        setSelectedDate(nextDayDefault);
    }

    setDateRangeState([
      { startDate: newStartDate, endDate: newEndDate, key: "selection" },
    ]);
    fetchAllTripsData(newStartDate, newEndDate, selectedBus);
  };

  const canNavigateForward = () => {
    const { endDate } = dateRangeState[0];
    const today = new Date();
    
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      return !isToday(endDate);
    }
    
    return endDate < endOfDay(today);
  };

  // Helper function for startOfDay
  const startOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  // Helper function for endOfDay
  const endOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  // Combine date and time
  const combineDateAndTime = (date, time) => {
    const [hours, minutes] = time.split(":");
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return newDate;
  };

  // Format date display
  const formatDateDisplay = () => {
    const { startDate, endDate } = dateRangeState[0];

    if (selectedDateRange === "Today") {
      return format(startDate, "EEE, MMM dd, yyyy");
    } else if (selectedDateRange === "Yesterday") {
      return format(startDate, "EEE, MMM dd, yyyy");
    } else if (selectedDateRange === "Custom") {
      const startDateTime = combineDateAndTime(customStartDate, customStartTime);
      const endDateTime = combineDateAndTime(customEndDate, customEndTime);
      return `${format(startDateTime, "MMM dd, yyyy HH:mm")} - ${format(
        endDateTime,
        "MMM dd, yyyy HH:mm"
      )}`;
    } else {
      return `${format(startDate, "MMM dd")} - ${format(
        endDate,
        "MMM dd, yyyy"
      )}`;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    const symbol = baseCurrency?.symbol || "$";
    return `${symbol}${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy HH:mm:ss");
  };

  // Get trip duration
  const getTripDuration = (startTime, endTime) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = end - start;
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return "0h 0m";
    }
  };

  // Export functions
// Export functions
const exportToCSV = () => {
  setExportLoading(true);
  try {
    const headers = "Start Date,End Date,Bus Name,Conductor,Passengers,Trips,Total Sales,Route,Duration\n";
    
    const csvData = filteredTrips
      .map(trip => {
        const startDate = formatDate(trip.startTime);
        const endDate = formatDate(trip.endTime);
        return `"${startDate}","${endDate}","${trip.busName}","${trip.conductorName}",${trip.ticketCount},1,${trip.totalSales},"${trip.majorRoute}","${trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}"`;
      })
      .join('\n');
    
    // Add totals row
    const totalPassengers = filteredTrips.reduce((sum, trip) => sum + (trip.ticketCount || 0), 0);
    const totalSales = filteredTrips.reduce((sum, trip) => sum + (Number(trip.totalSales) || 0), 0);
    const totalsRow = `"TOTAL","","","",${totalPassengers},${filteredTrips.length},${totalSales},"",""`;
    
    const csvContent = headers + csvData + '\n' + totalsRow;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-trips-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
  } finally {
    setExportLoading(false);
  }
};

const exportToPDF = () => {
  setExportLoading(true);
  try {
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>All Trips Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1a5b7b; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1a5b7b; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .total-row { font-weight: bold; background-color: #e9ecef; }
        </style>
      </head>
      <body>
        <h1>All Trips Report - ${user?.company_name || 'Company'}</h1>
        <div class="summary">
          <p><strong>Period:</strong> ${formatDateDisplay()}</p>
          <p><strong>Total Sales:</strong> ${formatCurrency(dashboardData.totalSales)}</p>
          <p><strong>Total Passengers:</strong> ${dashboardData.totalPassengers}</p>
          <p><strong>Total Trips:</strong> ${dashboardData.totalTrips}</p>
          <p><strong>Bus:</strong> ${selectedBus ? `${selectedBus.name} (${selectedBus.plate})` : 'All Buses'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Trip #</th>
              <th>Bus</th>
              <th>Conductor</th>
              <th>Passengers</th>
              <th>Route</th>
              <th>Duration</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTrips.map(trip => `
              <tr>
                <td>${formatDate(trip.startTime)}</td>
                <td>${formatDate(trip.endTime)}</td>
                <td>${trip.tripNumber}</td>
                <td>${trip.busName}</td>
                <td>${trip.conductorName}</td>
                <td>${trip.ticketCount}</td>
                <td>${trip.majorRoute}</td>
                <td>${trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}</td>
                <td>${formatCurrency(trip.totalSales)}</td>
              </tr>
            `).join('')}
            ${filteredTrips.length > 0 ? `
              <tr class="total-row">
                <td colspan="5"><strong>TOTAL</strong></td>
                <td><strong>${filteredTrips.reduce((sum, trip) => sum + (trip.ticketCount || 0), 0)}</strong></td>
                <td colspan="2"></td>
                <td><strong>${formatCurrency(filteredTrips.reduce((sum, trip) => sum + (Number(trip.totalSales) || 0), 0))}</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        <p style="margin-top: 20px; text-align: center; color: #666;">
          Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}
        </p>
        ${filteredTrips.length === 0 ? `
          <p style="text-align: center; color: #999; font-style: italic; margin-top: 40px;">
            No trip data available for the selected period
          </p>
        ` : ''}
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
  } finally {
    setExportLoading(false);
  }
};

  // Show trip details
  const showTripDetails = (trip) => {
    setSelectedTrip(trip);
    setTripDetailModal(true);
  };

  // Filter trips based on search query
  useEffect(() => {
    let filtered = [...dashboardData.completedTrips];

    if (searchQuery) {
      filtered = filtered.filter(
        (trip) =>
          trip.conductorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.busName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (trip.tripNumber && trip.tripNumber.toString().includes(searchQuery)) ||
          (trip.majorRoute && trip.majorRoute.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    setFilteredTrips(filtered);
  }, [searchQuery, dashboardData.completedTrips]);

  // Pagination functions
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

  // Circular Metric Card Component
  const CircularMetricCard = ({
    value,
    subtitle,
    iconClass,
    colors,
    delay,
    onPress,
  }) => (
    <div className="all-trips-circular-metric-card" onClick={onPress}>
      <div className="all-trips-circular-metric-content">
        <div
          className="all-trips-circular-metric-icon"
          style={{ backgroundColor: colors[0] }}
        >
          <span className={`professional-icon ${iconClass}`}></span>
        </div>
        <div className="all-trips-circular-metric-text">
          <div className="all-trips-circular-metric-value">{value}</div>
          <div className="all-trips-circular-metric-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );

  // Trip List Item Component
  const TripListItem = ({ trip, index }) => {
    return (
      <div className="all-trips-trip-item" onClick={() => showTripDetails(trip)}>
        <div className="all-trips-trip-item-content">
          <div className="all-trips-trip-item-header">
            <div className="all-trips-trip-icon">
              <span className="fas fa-clock"></span>
            </div>
            <div className="all-trips-trip-info">
              <div className="all-trips-trip-id">Trip #{trip.tripNumber || "N/A"}</div>
              <div className="all-trips-trip-details">
                Ended on: {formatDate(trip.endTime)}
              </div>
              <div className="all-trips-conductor-name">
                Conductor: {trip.conductorName.toUpperCase() || "Unknown Conductor"}
              </div>
              <div className="all-trips-bus-name">
                Bus: {trip.busName || "Unknown Bus"}
              </div>
            </div>
            <div className="all-trips-trip-amount">
              {formatCurrency(Number(trip.totalSales))}
            </div>
          </div>
          <div className="all-trips-trip-stats">
            <div className="all-trips-trip-stat">
              <span className="fas fa-receipt"></span>
              {trip.ticketCount} tickets
            </div>
            <div className="all-trips-trip-stat">
              <span className="fas fa-hourglass-half"></span>
              {trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}
            </div>
          </div>
          <div className="all-trips-currency-badge2">
            <span className="fas fa-money-bill-wave"></span>
            {trip.currencyCode || baseCurrency?.code || "USD"}
          </div>
        </div>
      </div>
    );
  };

  // Trip Detail Modal Component
  const TripDetailModal = () => {
    if (!selectedTrip) return null;

    return (
      <div className="all-trips-modal-overlay" onClick={() => setTripDetailModal(false)}>
        <div className="all-trips-modal-container all-trips-trip-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="all-trips-modal-header">
            <div className="all-trips-modal-header-content">
              <div className="all-trips-modal-icon">
                <span className="professional-icon icon-bus"></span>
              </div>
              <div className="all-trips-modal-title-container">
                <div className="all-trips-modal-title">Trip Details</div>
                <div className="all-trips-modal-subtitle">
                  Trip #{selectedTrip.tripNumber} • {selectedTrip.busName}
                </div>
              </div>
            </div>
            
            <button className="all-trips-close-button" onClick={() => setTripDetailModal(false)}>
              <span className="fas fa-close"></span>
            </button>
          </div>

          <div className="all-trips-modal-content">
            <div className="all-trips-detail-section">
              <div className="all-trips-section-header">
                <span className="professional-icon icon-people"></span>
                <div className="all-trips-section-label">VEHICLE & CREW</div>
              </div>
              <div className="all-trips-info-card">
                <div className="all-trips-info-row">
                  <div className="all-trips-label-container">
                    <span className="professional-icon icon-bus"></span>
                    <div className="all-trips-info-label">Bus:</div>
                  </div>
                  <div className="all-trips-info-value">{selectedTrip.busName}</div>
                </div>
                <div className="all-trips-info-row">
                  <div className="all-trips-label-container">
                    <span className="professional-icon icon-person"></span>
                    <div className="all-trips-info-label">Conductor:</div>
                  </div>
                  <div className="all-trips-info-value">{selectedTrip.conductorName.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div className="all-trips-detail-section">
              <div className="all-trips-section-header">
                <span className="professional-icon icon-calendar"></span>
                <div className="all-trips-section-label">TIME INFORMATION</div>
              </div>
              <div className="all-trips-info-card">
                <div className="all-trips-info-row">
                  <div className="all-trips-label-container">
                    <span className="professional-icon icon-play"></span>
                    <div className="all-trips-info-label">Start Time:</div>
                  </div>
                  <div className="all-trips-info-value">{formatDate(selectedTrip.startTime)}</div>
                </div>
                <div className="all-trips-info-row">
                  <div className="all-trips-label-container">
                    <span className="professional-icon icon-stop"></span>
                    <div className="all-trips-info-label">End Time:</div>
                  </div>
                  <div className="all-trips-info-value">{formatDate(selectedTrip.endTime)}</div>
                </div>
              </div>
            </div>

            <div className="all-trips-detail-section">
              <div className="all-trips-section-header">
                <span className="professional-icon icon-bar-chart"></span>
                <div className="all-trips-section-label">PERFORMANCE</div>
              </div>
              <div className="all-trips-stats-grid">
                <div className="all-trips-stat-card">
                  <span className="professional-icon icon-receipt"></span>
                  <div className="all-trips-stat-card-value">{selectedTrip.ticketCount}</div>
                  <div className="all-trips-stat-card-label">Tickets Sold</div>
                </div>
                <div className="all-trips-stat-card">
                  <span className="professional-icon icon-cash"></span>
                  <div className="all-trips-stat-card-value">{formatCurrency(selectedTrip.totalSales)}</div>
                  <div className="all-trips-stat-card-label">Total Sales</div>
                </div>
              </div>
            </div>
          </div>

        <div className="all-trips-modal-actions">
  <button 
    className="all-trips-view-tickets-button"
    onClick={() => {
      setTripDetailModal(false);
      navigate('/trip-tickets', { state: { trip: selectedTrip } });
    }}
  >
    View All Trip Tickets
    <span className="professional-icon icon-arrow-forward"></span>
  </button>
</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
  <TopToolbar
  title={selectedBus ? `${selectedBus.name} - All Trips` : "All Trips"}
  subtitle={selectedBus ? `Complete trip history for ${selectedBus.name}` : "Complete trip history for all buses"}
  companyName={user?.company_name || "Company"}
  onMenuToggle={() => setSidebarCollapsed(false)}
  isLoading={loading || exportLoading}
/>
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="all-trips-container">
          <div className="all-trips-content">
            {/* Header */}
            <div className="all-trips-header">
              <div className="all-trips-header-content">
                <button className="all-trips-back-button" onClick={() => navigate(-1)}>
                  <span className="professional-icon icon-arrow-back"></span>
                  Back
                </button>
                
                {/* Bus Selector */}
                <div className="all-trips-bus-selector-wrapper">
                  <div
                    className="all-trips-bus-selector"
                    onClick={() => setShowBusDropdown(!showBusDropdown)}
                  >
                    <span className="all-trips-bus-selector-text">
                      {selectedBus?.name || "All Buses"} {selectedBus?.plate ? `(${selectedBus.plate})` : ''}
                    </span>
                    <span className="all-trips-dropdown-arrow">
                      <span className="professional-icon icon-arrow-down"></span>
                    </span>
                  </div>

                  {showBusDropdown && (
                    <div className="all-trips-bus-dropdown">
                      <div
                        className="all-trips-bus-dropdown-item"
                        onClick={() => handleBusSelect(null)}
                      >
                        All Buses
                      </div>
                      {allBuses.map((bus) => (
                        <div
                          key={bus.id}
                          className="all-trips-bus-dropdown-item"
                          onClick={() => handleBusSelect(bus)}
                        >
                          {bus.name} ({bus.plate})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date Navigation */}
              <div className="all-trips-date-navigation">
                <button
                  className="all-trips-date-nav-button"
                  onClick={handleBackClick}
                >
                  ‹
                </button>
                <button
                  className="all-trips-date-display"
                  onClick={() => setShowDateModal(true)}
                >
                  {formatDateDisplay()}
                  <span className="all-trips-calendar-icon">
                    <span className="professional-icon icon-calendar"></span>
                  </span>
                </button>
                <button
                  className="all-trips-date-nav-button"
                  onClick={handleForwardClick}
                  disabled={!canNavigateForward()}
                >
                  ›
                </button>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="all-trips-main-content-area">
              {/* Left Column - Metrics and Export */}
              <div className="all-trips-left-column">
                {/* Metrics Section */}
                <div className="all-trips-metrics-section">
                  <div className="all-trips-section-title">Trips Summary</div>
                  <div className="all-trips-circular-metrics-container">
                    <div className="all-trips-metric-column">
                      <div className="all-trips-metric-title">Passengers</div>
                      <CircularMetricCard
                        value={dashboardData.totalPassengers.toLocaleString()}
                        subtitle="Total carried"
                        iconClass="icon-users"
                        colors={["#17a2b8", "#6f42c1"]}
                        delay={200}
                      />
                    </div>
                    <div className="all-trips-metric-column">
                      <div className="all-trips-metric-title">Total Sales</div>
                      <CircularMetricCard
                        value={formatCurrency(dashboardData.totalSales)}
                        subtitle="All trips"
                        iconClass="icon-dollar"
                        colors={["#28a745", "#20c997"]}
                        delay={100}
                      />
                    </div>
                    <div className="all-trips-metric-column">
                      <div className="all-trips-metric-title">Trips</div>
                      <CircularMetricCard
                        value={dashboardData.totalTrips.toString()}
                        subtitle="Completed"
                        iconClass="icon-route"
                        colors={["#0798ff", "#1427fd"]}
                        delay={300}
                      />
                    </div>
                  </div>
                </div>

                {/* Export Controls */}
                <div className="all-trips-export-controls">
                  <button
                    className="all-trips-export-button all-trips-csv-button"
                    onClick={exportToCSV}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-download"></span>
                    {exportLoading ? "Exporting..." : "Export CSV"}
                  </button>
                  <button
                    className="all-trips-export-button all-trips-pdf-button"
                    onClick={exportToPDF}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-file-pdf"></span>
                    {exportLoading ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>

              {/* Right Column - Trips List */}
              <div className="all-trips-right-column">
                {/* Trips Section */}
                <div className="all-trips-trips-section">
                  <div className="all-trips-section-header">
                    <div className="all-trips-section-title">All Trips ({filteredTrips.length})</div>
                  </div>

                  {/* Search Bar */}
                  <div className="all-trips-search-container">
                    <span className="professional-icon icon-search all-trips-search-icon"></span>
                    <input
                      type="text"
                      className="all-trips-search-input"
                      placeholder="Search trips, buses, conductors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <span className="professional-icon icon-close-circle"></span>
                      </button>
                    )}
                  </div>

                  {filteredTrips.length === 0 ? (
                    <div className="all-trips-empty-state">
                      <span className="professional-icon icon-time all-trips-empty-icon"></span>
                      <div className="all-trips-empty-state-text">No completed trips found</div>
                      <div className="all-trips-empty-state-subtext">
                        {searchQuery ? "Try adjusting your search" : "Trips will appear here once completed"}
                      </div>
                    </div>
                  ) : (
                    <div className="all-trips-trips-list">
                      {currentTrips.map((trip, index) => (
                        <TripListItem
                          key={trip.tripId}
                          trip={trip}
                          index={index}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredTrips.length > ITEMS_PER_PAGE && (
                    <div className="all-trips-pagination-container">
                      <button
                        className="all-trips-pagination-button"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <span className="professional-icon icon-arrow-back"></span>
                      </button>

                      <div className="all-trips-page-numbers">
                        {getPageNumbers().map((page) => (
                          <button
                            key={page}
                            className={`all-trips-page-number ${currentPage === page ? 'all-trips-current-page-number' : ''}`}
                            onClick={() => goToPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        className="all-trips-pagination-button"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        <span className="professional-icon icon-arrow-forward"></span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table - Below both columns */}
          {/* Table - Below both columns */}
<div className="all-trips-daily-sales-card">
  <div className="all-trips-section-header">
    <div className="all-trips-section-title">All Trips Data</div>
  </div>
  <div className="all-trips-daily-sales-table-container">
    <table className="all-trips-daily-sales-table">
      <thead>
        <tr>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Trip #</th>
          <th>Bus</th>
          <th>Conductor</th>
          <th>Passengers</th>
          <th>Route</th>
          <th>Duration</th>
          <th>Total Sales</th>
        </tr>
      </thead>
      <tbody>
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
            <tr key={trip.tripId}>
              <td>{formatDate(trip.startTime)}</td>
              <td>{formatDate(trip.endTime)}</td>
              <td>{trip.tripNumber}</td>
              <td>{trip.busName}</td>
              <td>{trip.conductorName}</td>
              <td>{trip.ticketCount}</td>
              <td>{trip.majorRoute}</td>
              <td>{trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}</td>
              <td>{formatCurrency(trip.totalSales)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="9" className="all-trips-no-data">
              No trip data available for the selected period
            </td>
          </tr>
        )}
        {filteredTrips.length > 0 && (
          <tr className="all-trips-total-row">
            <td colSpan="5"><strong>TOTAL</strong></td>
            <td><strong>{filteredTrips.reduce((sum, trip) => sum + (trip.ticketCount || 0), 0)}</strong></td>
            <td colSpan="2"></td>
            <td><strong>{formatCurrency(filteredTrips.reduce((sum, trip) => sum + (Number(trip.totalSales) || 0), 0))}</strong></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
          </div>
        </div>

        {/* Date Range Modal */}
        <DateRangeModal
          visible={showDateModal}
          onClose={() => setShowDateModal(false)}
          selectedDateRange={selectedDateRange}
          onDateRangeSelect={handleDateRangeSelect}
          dateRangeState={dateRangeState}
          onDateRangeStateChange={setDateRangeState}
          customStaticRanges={customStaticRanges}
          onCustomPeriodClick={() => {
            setShowDateModal(false);
            setShowCustomRangeModal(true);
          }}
        />

        {/* Custom Range Modal */}
        <CustomRangeModal
          visible={showCustomRangeModal}
          onClose={() => setShowCustomRangeModal(false)}
          onApply={(startDateTime, endDateTime, startTime, endTime) => {
            setCustomStartDate(startDateTime);
            setCustomEndDate(endDateTime);
            setCustomStartTime(startTime);
            setCustomEndTime(endTime);
            setSelectedDateRange("Custom");
            setSelectedDate(startDateTime);
            setDateRangeState([{ startDate: startDateTime, endDate: endDateTime, key: "selection" }]);
            setShowCustomRangeModal(false);
            fetchAllTripsData(startDateTime, endDateTime, selectedBus);
          }}
          initialStartDate={customStartDate}
          initialEndDate={customEndDate}
          initialStartTime={customStartTime}
          initialEndTime={customEndTime}
        />

        {/* Trip Detail Modal */}
        {tripDetailModal && <TripDetailModal />}
      </div>
    </div>
  );
};

export default AllTripsScreen;