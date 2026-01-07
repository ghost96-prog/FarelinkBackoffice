import React, { useState, useEffect, useCallback, useRef } from "react";
import "../css/BusDashboardScreen.css";
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

const BusDashboardScreen = () => {
  const authContext = useAuth();
  const { user } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get bus data from navigation state
  const { bus } = location.state || {};
  const [allBuses, setAllBuses] = useState([]);

  const [selectedBus, setSelectedBus] = useState(bus || null);
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
  const [activeScreen, setActiveScreen] = useState("bus-dashboard");
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

  // New state for sales breakdown by currency
  const [salesByCurrency, setSalesByCurrency] = useState([]);
  const [currencyBreakdownLoading, setCurrencyBreakdownLoading] = useState(false);

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

  // Load data on component mount and when date range changes
  useEffect(() => {
    const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
    setDateRangeState([{ startDate, endDate, key: "selection" }]);
    fetchBusDashboardData(startDate, endDate);
    loadEmployees();
    loadBuses();
  }, []);

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
        // Transform the bus data to match the expected format
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
      } else {
        console.error("Failed to fetch all buses:", data);
      }
    } catch (error) {
      console.error("Error fetching all buses:", error);
    }
  };

  // Call fetchAllBuses when component mounts
  useEffect(() => {
    fetchAllBuses();
  }, []);

  // Fetch bus dashboard data
  const fetchBusDashboardData = async (startDate, endDate, busToFetch = selectedBus) => {
    try {
      setLoading(true);
      setCurrencyBreakdownLoading(true);
      const token = user?.token;
      const apiLink = Apilink.getLink();

      if (!token) {
        console.error("No authentication token available");
        return;
      }

      const requestBody = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        busId: busToFetch?.id || busToFetch?.busId,
      };

      console.log("Fetching bus dashboard data for:", busToFetch?.name, "with:", requestBody);

      // Fetch bus summary data
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
        console.error("Failed to fetch bus dashboard data:", data);
        setDashboardData({
          totalSales: 0,
          totalPassengers: 0,
          totalTrips: 0,
          busPerformance: [],
          dailySales: [],
          salesByEmployee: [],
          completedTrips: [],
        });
        setSalesByCurrency([]);
      } else {
        console.log("Bus dashboard data received:", data);

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
          busPerformance: [{
            id: busToFetch?.id || busToFetch?.busId,
            name: busToFetch?.name || "Unknown Bus",
            plate: busToFetch?.plate || "Unknown Plate",
            route: busToFetch?.route || "Multiple Routes",
            totalSales: data.totalBusRevenue || 0,
            totalPassengers: data.totalBusTickets || 0,
            conductor: "Not Assigned",
            trips: transformedTrips.length,
          }],
          dailySales: [],
          salesByEmployee: data.salesByEmployee || [],
          completedTrips: transformedTrips,
        };

        setDashboardData(transformedData);
        setFilteredTrips(transformedTrips);

        // Now fetch ticket data for currency breakdown
        await fetchTicketDataForCurrencyBreakdown(startDate, endDate, busToFetch);
      }
    } catch (error) {
      console.error("Error fetching bus dashboard data:", error);
      setDashboardData({
        totalSales: 0,
        totalPassengers: 0,
        totalTrips: 0,
        busPerformance: [],
        dailySales: [],
        salesByEmployee: [],
        completedTrips: [],
      });
      setSalesByCurrency([]);
    } finally {
      setLoading(false);
      setCurrencyBreakdownLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch ticket data for currency breakdown
  const fetchTicketDataForCurrencyBreakdown = async (startDate, endDate, busToFetch) => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();

      const requestBody = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        busId: busToFetch?.id || busToFetch?.busId,
      };

      console.log("Fetching ticket data for currency breakdown with:", requestBody);

      let response = await fetch(`${apiLink}/ticketssummary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.tickets) {
        console.log("Ticket data received for currency breakdown:", data.tickets.length, "tickets");
        
        // Calculate sales breakdown by currency
        const currencyMap = {};
        
        data.tickets.forEach(ticket => {
          const currencyCode = ticket.currencyCode || "USD";
          const currencyName = ticket.currencyName || "United States Dollar";
          const currencySymbol = ticket.currencySymbol || "$";
          const amount = Number(ticket.amountPaid) || 0;
          
          if (!currencyMap[currencyCode]) {
            currencyMap[currencyCode] = {
              currencyCode,
              currencyName,
              currencySymbol,
              totalSales: 0,
              ticketCount: 0,
              percentage: 0
            };
          }
          
          currencyMap[currencyCode].totalSales += amount;
          currencyMap[currencyCode].ticketCount += 1;
        });
        
        // Convert to array and calculate percentages
        const currencyBreakdown = Object.values(currencyMap);
        const totalSales = currencyBreakdown.reduce((sum, curr) => sum + curr.totalSales, 0);
        
        currencyBreakdown.forEach(curr => {
          curr.percentage = totalSales > 0 ? (curr.totalSales / totalSales) * 100 : 0;
        });
        
        // Sort by total sales (descending)
        currencyBreakdown.sort((a, b) => b.totalSales - a.totalSales);
        
        console.log("Currency breakdown calculated:", currencyBreakdown);
        setSalesByCurrency(currencyBreakdown);
      } else {
        console.log("No ticket data available for currency breakdown");
        setSalesByCurrency([]);
      }
    } catch (error) {
      console.error("Error fetching ticket data for currency breakdown:", error);
      setSalesByCurrency([]);
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

  // MISSING FUNCTIONS FROM REACT NATIVE VERSION

  // Get bus details function
  const getBusDetails = (busId) => {
    const busData = buses.find(
      (bus) =>
        bus.id?.toString() === busId?.toString() ||
        bus.busId?.toString() === busId?.toString()
    );

    return (
      busData || {
        name: "Unknown Bus",
        busname: "Unknown Bus",
        plate: "N/A",
        numberplate: "N/A",
      }
    );
  };

  // Get conductor details function
  const getConductorDetails = (conductorId) => {
    if (!conductorId) {
      return {
        name: "Unknown Conductor",
        staffname: "Unknown Conductor",
        role: "Unknown",
      };
    }

    const emp = employees.find((emp) => {
      // Check all possible ID fields
      return (
        emp.id?.toString() === conductorId?.toString() ||
        emp.conductorId?.toString() === conductorId?.toString() ||
        emp.conducterid?.toString() === conductorId?.toString() ||
        emp.userid?.toString() === conductorId?.toString()
      );
    });

    return (
      emp || {
        name: "Unknown Conductor",
        staffname: "Unknown Conductor",
        role: "Unknown",
      }
    );
  };

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

  // Get range days function for date navigation
  const getRangeDays = (range) => {
    switch (range) {
      case "This Week":
      case "Last Week":
        return 7;
      case "This Month":
      case "Last Month":
        return 30;
      case "This Year":
        return 365;
      default:
        return 1;
    }
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
      fetchBusDashboardData(startDate, endDate, selectedBus);
    } else {
      setShowCustomRangeModal(true);
    }
  };

  // Update the bus selection function to clear previous data
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
    setSalesByCurrency([]);
    
    // Set loading state to show loading indicator
    setLoading(true);
    setCurrencyBreakdownLoading(true);
    
    // Update the selected bus
    setSelectedBus(selectedBus);
    setShowBusDropdown(false);
    
    // Reset search query
    setSearchQuery("");
    
    // Reset pagination
    setCurrentPage(1);
    
    // Fetch data for the newly selected bus
    const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
    fetchBusDashboardData(startDate, endDate, selectedBus);
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
    fetchBusDashboardData(newStartDate, newEndDate, selectedBus);
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
    fetchBusDashboardData(newStartDate, newEndDate, selectedBus);
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
  const formatCurrency = (amount, currencySymbol = null) => {
    const symbol = currencySymbol || baseCurrency?.symbol || "$";
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

  // Export functions - Updated to include currency breakdown
const exportToPDF = () => {
  setExportLoading(true);
  try {
    const printWindow = window.open('', '_blank');
    
    // Generate date range for title
    const startDate = dateRangeState[0].startDate;
    const endDate = dateRangeState[0].endDate;
    let dateRangeTitle;
    
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      dateRangeTitle = format(startDate, 'yyyy-MM-dd');
    } else {
      dateRangeTitle = `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;
    }
    
    const busName = selectedBus?.name || 'Bus';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bus Trips Report - ${busName} - ${dateRangeTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1a5b7b; text-align: center; }
          h2 { color: #1a5b7b; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1a5b7b; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .total-row { font-weight: bold; background-color: #e9ecef; }
          .section-break { margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>Bus Trips Report - ${busName}</h1>
        <div class="summary">
          <p><strong>Period:</strong> ${formatDateDisplay()}</p>
          <p><strong>Total Sales:</strong> ${formatCurrency(dashboardData.totalSales)}</p>
          <p><strong>Total Passengers:</strong> ${dashboardData.totalPassengers}</p>
          <p><strong>Total Trips:</strong> ${dashboardData.totalTrips}</p>
          <p><strong>Bus:</strong> ${selectedBus?.name || 'N/A'} (${selectedBus?.plate || 'N/A'})</p>
        </div>
        
        <h2>Trip Data</h2>
        <table>
          <thead>
            <tr>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Trip #</th>
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
                <td>${trip.conductorName}</td>
                <td>${trip.ticketCount}</td>
                <td>${trip.majorRoute}</td>
                <td>${trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}</td>
                <td>${formatCurrency(trip.totalSales)}</td>
              </tr>
            `).join('')}
            ${filteredTrips.length > 0 ? `
              <tr class="total-row">
                <td colspan="4"><strong>TOTAL TRIP SALES</strong></td>
                <td><strong>${filteredTrips.reduce((sum, trip) => sum + (trip.ticketCount || 0), 0)}</strong></td>
                <td colspan="2"></td>
                <td><strong>${formatCurrency(filteredTrips.reduce((sum, trip) => sum + (Number(trip.totalSales) || 0), 0))}</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        
        ${dashboardData.salesByEmployee.length > 0 ? `
          <div class="section-break">
            <h2>Sales by Employee</h2>
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Role</th>
                  <th>Tickets</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                ${dashboardData.salesByEmployee.map(employee => {
                  const conductorDetails = getConductorDetails(employee.conducterId || employee.conductorId);
                  const employeeName = employee.conductorName?.toUpperCase() || conductorDetails.name?.toUpperCase() || "Unknown Employee";
                  const role = conductorDetails.role || employee.role || "Employee";
                  return `
                    <tr>
                      <td>${employeeName}</td>
                      <td>${role}</td>
                      <td>${employee.ticketsCount || 0}</td>
                      <td>${formatCurrency(employee.amountPaidSum || 0)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${salesByCurrency.length > 0 ? `
          <div class="section-break">
            <h2>Sales Breakdown by Currency</h2>
            <table>
              <thead>
                <tr>
                  <th>Currency Code</th>
                  <th>Currency Name</th>
                  <th>Tickets</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                ${salesByCurrency.map(currency => `
                  <tr>
                    <td>${currency.currencyCode}</td>
                    <td>${currency.currencyName}</td>
                    <td>${currency.ticketCount}</td>
                    <td>${formatCurrency(currency.totalSales, currency.currencySymbol)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <p style="margin-top: 20px; text-align: center; color: #666;">
          Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}
        </p>
        ${filteredTrips.length === 0 && salesByCurrency.length === 0 && dashboardData.salesByEmployee.length === 0 ? `
          <p style="text-align: center; color: #999; font-style: italic; margin-top: 40px;">
            No data available for the selected period
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
};const exportToCSV = () => {
  setExportLoading(true);
  try {
    // Trip data headers
    const tripHeaders = "Start Date,End Date,Bus Name,Conductor,Passengers,Trips,Total Sales,Route,Duration\n";
    
    const tripData = filteredTrips
      .map(trip => {
        const startDate = formatDate(trip.startTime);
        const endDate = formatDate(trip.endTime);
        return `"${startDate}","${endDate}","${trip.busName}","${trip.conductorName}",${trip.ticketCount},1,${trip.totalSales},"${trip.majorRoute}","${trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}"`;
      })
      .join('\n');
    
    // Add totals row for trips
    const totalPassengers = filteredTrips.reduce((sum, trip) => sum + (trip.ticketCount || 0), 0);
    const totalTripSales = filteredTrips.reduce((sum, trip) => sum + (Number(trip.totalSales) || 0), 0);
    const tripTotalsRow = `"TOTAL TRIP SALES","","","",${totalPassengers},${filteredTrips.length},${totalTripSales},"",""`;
    
    // Employee sales headers
    const employeeHeaders = "\n\nSALES BY EMPLOYEE\nEmployee Name,Role,Tickets,Total Sales\n";
    
    const employeeData = dashboardData.salesByEmployee
      .map(employee => {
        const conductorDetails = getConductorDetails(employee.conducterId || employee.conductorId);
        const employeeName = employee.conductorName?.toUpperCase() || conductorDetails.name?.toUpperCase() || "Unknown Employee";
        const role = conductorDetails.role || employee.role || "Employee";
        return `"${employeeName}","${role}",${employee.ticketsCount || 0},${employee.amountPaidSum || 0}`;
      })
      .join('\n');
    
    // Currency breakdown headers
    const currencyHeaders = "\n\nCURRENCY BREAKDOWN\nCurrency Code,Currency Name,Tickets,Total Sales\n";
    
    const currencyData = salesByCurrency
      .map(currency => {
        return `"${currency.currencyCode}","${currency.currencyName}",${currency.ticketCount},${currency.totalSales}`;
      })
      .join('\n');
    
    const csvContent = tripHeaders + tripData + '\n' + tripTotalsRow + 
                      (dashboardData.salesByEmployee.length > 0 ? employeeHeaders + employeeData : '') + 
                      (salesByCurrency.length > 0 ? currencyHeaders + currencyData : '');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename based on actual date range
    const startDate = dateRangeState[0].startDate;
    const endDate = dateRangeState[0].endDate;
    const busName = selectedBus?.name || 'bus';
    const sanitizedBusName = busName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    let fileName;

    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      // For single day ranges: bus-trips-{bus-name}-YYYY-MM-DD.csv
      fileName = `bus-trips-${sanitizedBusName}-${format(startDate, 'yyyy-MM-dd')}.csv`;
    } else if (selectedDateRange === "Custom") {
      // For custom ranges: bus-trips-{bus-name}-YYYY-MM-DD-to-YYYY-MM-DD.csv
      const startFormatted = format(startDate, 'yyyy-MM-dd');
      const endFormatted = format(endDate, 'yyyy-MM-dd');
      fileName = `bus-trips-${sanitizedBusName}-${startFormatted}-to-${endFormatted}.csv`;
    } else {
      // For other ranges: bus-trips-{bus-name}-YYYY-MM-DD-to-YYYY-MM-DD.csv
      const startFormatted = format(startDate, 'yyyy-MM-dd');
      const endFormatted = format(endDate, 'yyyy-MM-dd');
      fileName = `bus-trips-${sanitizedBusName}-${startFormatted}-to-${endFormatted}.csv`;
    }

    link.download = fileName;
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
          (trip.tripNumber && trip.tripNumber.toString().includes(searchQuery)) ||
          (trip.majorRoute && trip.majorRoute.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    setFilteredTrips(filtered);
  }, [searchQuery, dashboardData.completedTrips]);

  // Circular Metric Card Component
  const CircularMetricCard = ({
    value,
    subtitle,
    iconClass,
    colors,
    delay,
    onPress,
  }) => (
    <div className="bus-dashboard-circular-metric-card" onClick={onPress}>
      <div className="bus-dashboard-circular-metric-content">
        <div
          className="bus-dashboard-circular-metric-icon"
          style={{ backgroundColor: colors[0] }}
        >
          <span className={`professional-icon ${iconClass}`}></span>
        </div>
        <div className="bus-dashboard-circular-metric-text">
          <div className="bus-dashboard-circular-metric-value">{value}</div>
          <div className="bus-dashboard-circular-metric-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );

  // Trip List Item Component
  const TripListItem = ({ trip, index }) => {
    return (
      <div className="bus-dashboard-trip-item" onClick={() => showTripDetails(trip)}>
        <div className="bus-dashboard-trip-item-content">
          <div className="bus-dashboard-trip-item-header">
            <div className="bus-dashboard-trip-icon">
              <span className="fas fa-clock"></span> {/* Changed */}
            </div>
            <div className="bus-dashboard-trip-info">
              <div className="bus-dashboard-trip-id">Trip #{trip.tripNumber || "N/A"}</div>
              <div className="bus-dashboard-trip-details">
                Ended on: {formatDate(trip.endTime)}
              </div>
              <div className="bus-dashboard-conductor-name">
                Conductor: {trip.conductorName.toUpperCase() || "Unknown Conductor"}
              </div>
            </div>
            <div className="bus-dashboard-trip-amount">
              {formatCurrency(Number(trip.totalSales))}
            </div>
          </div>
          <div className="bus-dashboard-trip-stats">
            <div className="bus-dashboard-trip-stat">
              <span className="fas fa-receipt"></span> {/* Changed */}
              {trip.ticketCount} tickets
            </div>
            <div className="bus-dashboard-trip-stat">
              <span className="fas fa-hourglass-half"></span> {/* Changed - using hourglass for duration */}
              {trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}
            </div>
          </div>
          <div className="bus-dashboard-currency-badge2">
            <span className="fas fa-money-bill-wave"></span> {/* Changed */}
            {trip.currencyCode || baseCurrency?.code || "USD"}
          </div>
        </div>
      </div>
    );
  };

  // Employee Sales List Item Component
  const EmployeeSalesListItem = ({ employee, index }) => {
    // Use the getConductorDetails function to get role information
    const conductorDetails = getConductorDetails(employee.conducterId || employee.conductorId);
    
    return (
      <div className="bus-dashboard-trip-item bus-dashboard-employee-sales-item">
        <div className="bus-dashboard-trip-item-content">
          <div className="bus-dashboard-trip-item-header">
            <div className="bus-dashboard-trip-icon">
              <span className="fas fa-user"></span>
            </div>
            <div className="bus-dashboard-trip-info">
              <div className="bus-dashboard-trip-id">
                {employee.conductorName?.toUpperCase() || conductorDetails.name?.toUpperCase() || "Unknown Employee"}
              </div>
            </div>
            <div className="bus-dashboard-trip-amount bus-dashboard-employee-amount">
              {formatCurrency(Number(employee.amountPaidSum || 0))}
            </div>
          </div>
          <div className="bus-dashboard-trip-stats">
            <div className="bus-dashboard-trip-stat">
              <span className="professional-icon icon-receipt"></span>
              {employee.ticketsCount || 0} tickets
            </div>
          </div>
          <div className="bus-dashboard-currency-badge">
            <span className="professional-icon icon-person"></span>
            {conductorDetails.role || employee.role || "Employee"}
          </div>
        </div>
      </div>
    );
  };

  // Currency Breakdown Card Component
  const CurrencyBreakdownCard = () => {
    if (salesByCurrency.length === 0) {
      return (
        <div className="bus-dashboard-currency-breakdown-section">
          <div className="bus-dashboard-section-header">
            <div className="bus-dashboard-section-title">Sales by Currency</div>
          </div>
          <div className="bus-dashboard-empty-state">
            <span className="fas fa-money-bill-wave bus-dashboard-empty-icon"></span>
            <div className="bus-dashboard-empty-state-text">No currency data available</div>
            <div className="bus-dashboard-empty-state-subtext">
              {currencyBreakdownLoading ? "Loading..." : "Currency breakdown will appear here"}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bus-dashboard-currency-breakdown-section">
        <div className="bus-dashboard-section-header">
          <div className="bus-dashboard-section-title">Sales by Currency</div>
        </div>
        <div className="bus-dashboard-currency-breakdown-table-container">
          <table className="bus-dashboard-currency-breakdown-table">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Code</th>
                <th>Tickets</th>
                <th>Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {salesByCurrency.map((currency, index) => (
                <tr key={currency.currencyCode}>
                  <td>
                    <div className="bus-dashboard-currency-name">
                      <span className="fas fa-money-bill-wave"></span>
                      {currency.currencyName}
                    </div>
                  </td>
                  <td>
                    <span className="bus-dashboard-currency-code-badge">
                      {currency.currencyCode}
                    </span>
                  </td>
                  <td>{currency.ticketCount}</td>
                  <td>{formatCurrency(currency.totalSales, currency.currencySymbol)}</td>
                  <td>
                   
                  </td>
                </tr>
              ))}
            
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Trip Detail Modal Component
  const TripDetailModal = () => {
    if (!selectedTrip) return null;

    return (
      <div className="bus-dashboard-modal-overlay" onClick={() => setTripDetailModal(false)}>
        <div className="bus-dashboard-modal-container bus-dashboard-trip-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="bus-dashboard-modal-header">
            <div className="bus-dashboard-modal-header-content">
              <div className="bus-dashboard-modal-icon">
                <span className="professional-icon icon-bus"></span>
              </div>
              <div className="bus-dashboard-modal-title-container">
                <div className="bus-dashboard-modal-title">Trip Details</div>
                <div className="bus-dashboard-modal-subtitle">
                  Trip #{selectedTrip.tripNumber} • {selectedTrip.busName}
                </div>
              </div>
            </div>
            <button className="bus-dashboard-close-button" onClick={() => setTripDetailModal(false)}>
              <span className="fas fa-close"></span>
            </button>
          </div>

          <div className="bus-dashboard-modal-content">
            <div className="bus-dashboard-detail-section">
              <div className="bus-dashboard-section-header">
                <span className="professional-icon icon-people"></span>
                <div className="bus-dashboard-section-label">VEHICLE</div>
              </div>
              <div className="bus-dashboard-info-card">
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-bus"></span>
                    <div className="bus-dashboard-info-label">Bus:</div>
                  </div>
                  <div className="bus-dashboard-info-value">{selectedTrip.busName}</div>
                </div>
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-car"></span>
                    <div className="bus-dashboard-info-label">Plate:</div>
                  </div>
                  <div className="bus-dashboard-info-value">
                    {bus.plate || getBusDetails(selectedTrip.busId).numberplate || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bus-dashboard-detail-section">
              <div className="bus-dashboard-section-header">
                <span className="professional-icon icon-people"></span>
                <div className="bus-dashboard-section-label">VEHICLE & CREW</div>
              </div>
              <div className="bus-dashboard-info-card">
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-bus"></span>
                    <div className="bus-dashboard-info-label">Bus:</div>
                  </div>
                  <div className="bus-dashboard-info-value">{selectedTrip.busName}</div>
                </div>
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-person"></span>
                    <div className="bus-dashboard-info-label">Conductor:</div>
                  </div>
                  <div className="bus-dashboard-info-value">{selectedTrip.conductorName.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div className="bus-dashboard-detail-section">
              <div className="bus-dashboard-section-header">
                <span className="professional-icon icon-calendar"></span>
                <div className="bus-dashboard-section-label">TIME INFORMATION</div>
              </div>
              <div className="bus-dashboard-info-card">
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-play"></span>
                    <div className="bus-dashboard-info-label">Start Time:</div>
                  </div>
                  <div className="bus-dashboard-info-value">{formatDate(selectedTrip.startTime)}</div>
                </div>
                <div className="bus-dashboard-info-row">
                  <div className="bus-dashboard-label-container">
                    <span className="professional-icon icon-stop"></span>
                    <div className="bus-dashboard-info-label">End Time:</div>
                  </div>
                  <div className="bus-dashboard-info-value">{formatDate(selectedTrip.endTime)}</div>
                </div>
              </div>
            </div>

            <div className="bus-dashboard-detail-section">
              <div className="bus-dashboard-section-header">
                <span className="professional-icon icon-bar-chart"></span>
                <div className="bus-dashboard-section-label">PERFORMANCE</div>
              </div>
              <div className="bus-dashboard-stats-grid">
                <div className="bus-dashboard-stat-card">
                  <span className="professional-icon icon-receipt"></span>
                  <div className="bus-dashboard-stat-card-value">{selectedTrip.ticketCount}</div>
                  <div className="bus-dashboard-stat-card-label">Tickets Sold</div>
                </div>
                <div className="bus-dashboard-stat-card">
                  <span className="professional-icon icon-cash"></span>
                  <div className="bus-dashboard-stat-card-value">{formatCurrency(selectedTrip.totalSales)}</div>
                  <div className="bus-dashboard-stat-card-label">Total Sales</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bus-dashboard-modal-actions">
            <button className="bus-dashboard-close-modal-button" onClick={() => setTripDetailModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title={`SALES BY BUS (${selectedBus?.name}- ${selectedBus?.plate ? `${selectedBus.plate})` : ''}`}
        subtitle="Bus Performance Overview"
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
        <div className="bus-dashboard-container">
          <div className="bus-dashboard-content">
            {/* Header */}
            <div className="bus-dashboard-header">
              <div className="bus-dashboard-header-content">
                <button className="bus-dashboard-back-button" onClick={() => navigate(-1)}>
                  <span className="professional-icon icon-arrow-back"></span>
                  Back
                </button>
                
                {/* Add Bus Selector */}
                <div className="bus-dashboard-bus-selector-wrapper">
                  <div
                    className="bus-dashboard-bus-selector"
                    onClick={() => setShowBusDropdown(!showBusDropdown)}
                  >
                    <span className="bus-dashboard-bus-selector-text">
                      {selectedBus?.name || "Select Bus"} {selectedBus?.plate ? `(${selectedBus.plate})` : ''}
                    </span>
                    <span className="bus-dashboard-dropdown-arrow">
                      <span className="professional-icon icon-arrow-down"></span>
                    </span>
                  </div>

                  {showBusDropdown && (
                    <div className="bus-dashboard-bus-dropdown">
                      {allBuses.map((bus) => (
                        <div
                          key={bus.id}
                          className="bus-dashboard-bus-dropdown-item"
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
              <div className="bus-dashboard-date-navigation">
                <button
                  className="bus-dashboard-date-nav-button"
                  onClick={handleBackClick}
                >
                  ‹
                </button>
                <button
                  className="bus-dashboard-date-display"
                  onClick={() => setShowDateModal(true)}
                >
                  {formatDateDisplay()}
                  <span className="bus-dashboard-calendar-icon">
                    <span className="professional-icon icon-calendar"></span>
                  </span>
                </button>
                <button
                  className="bus-dashboard-date-nav-button"
                  onClick={handleForwardClick}
                  disabled={!canNavigateForward()}
                >
                  ›
                </button>
              </div>
            </div>

            {/* NEW: Two Column Layout */}
            <div className="bus-dashboard-main-content-area">
              {/* Left Column - Metrics and Export */}
              <div className="bus-dashboard-left-column">
                {/* Metrics Section */}
                <div className="bus-dashboard-metrics-section">
                  <div className="bus-dashboard-section-title">Performance Summary</div>
                  <div className="bus-dashboard-circular-metrics-container">
                    <div className="bus-dashboard-metric-column">
                      <div className="bus-dashboard-metric-title">Passengers</div>
                      <CircularMetricCard
                        value={dashboardData.totalPassengers.toLocaleString()}
                        subtitle="Total carried"
                        iconClass="icon-users"
                        colors={["#17a2b8", "#6f42c1"]}
                        delay={200}
                      />
                    </div>
                    <div className="bus-dashboard-metric-column">
                      <div className="bus-dashboard-metric-title">Total Sales</div>
                      <CircularMetricCard
                        value={formatCurrency(dashboardData.totalSales)}
                        subtitle="Total Bus Sales"
                        iconClass="icon-dollar"
                        colors={["#28a745", "#20c997"]}
                        delay={100}
                      />
                    </div>
                    <div className="bus-dashboard-metric-column">
                      <div className="bus-dashboard-metric-title">Trips</div>
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
                <div className="bus-dashboard-export-controls">
                  <button
                    className="bus-dashboard-export-button bus-dashboard-csv-button"
                    onClick={exportToCSV}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-download"></span>
                    {exportLoading ? "Exporting..." : "Export CSV"}
                  </button>
                  <button
                    className="bus-dashboard-export-button bus-dashboard-pdf-button"
                    onClick={exportToPDF}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-file-pdf"></span>
                    {exportLoading ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>

              {/* Right Column - Lists */}
              <div className="bus-dashboard-right-column">
                {/* Employee Sales Section */}
                {dashboardData.salesByEmployee.length > 0 && (
                  <div className="bus-dashboard-employee-sales-section">
                    <div className="bus-dashboard-section-header">
                      <div className="bus-dashboard-section-title">Sales by Employee</div>
                    </div>
                    <div className="bus-dashboard-trips-list">
                      {dashboardData.salesByEmployee.map((employee, index) => (
                        <EmployeeSalesListItem
                          key={employee.conducterId || index}
                          employee={employee}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trips Section */}
                <div className="bus-dashboard-trips-section">
                  <div className="bus-dashboard-section-header">
                    <div className="bus-dashboard-section-title">Recent Trips</div>
                    <button 
                      className="bus-dashboard-show-all-button"
                      onClick={() => navigate('/all-trips', { state: { bus: selectedBus } })}
                    >
                      All Trips
                      <span className="professional-icon icon-arrow-forward"></span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="bus-dashboard-search-container">
                    <span className="professional-icon icon-search bus-dashboard-search-icon"></span>
                    <input
                      type="text"
                      className="bus-dashboard-search-input"
                      placeholder="Search trips, conductors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <span className="professional-icon icon-close-circle"></span>
                      </button>
                    )}
                  </div>

                  {filteredTrips.length === 0 && dashboardData.salesByEmployee.length === 0 ? (
                    <div className="bus-dashboard-empty-state">
                      <span className="professional-icon icon-time bus-dashboard-empty-icon"></span>
                      <div className="bus-dashboard-empty-state-text">No completed trips found</div>
                      <div className="bus-dashboard-empty-state-subtext">
                        {searchQuery ? "Try adjusting your search" : "Trips will appear here once completed"}
                      </div>
                    </div>
                  ) : (
                    <>
                      {filteredTrips.length === 0 && dashboardData.salesByEmployee.length > 0 && (
                        <div className="bus-dashboard-one-line-message">
                          No completed trips yet
                        </div>
                      )}

                      {filteredTrips.length > 0 && (
                        <div className="bus-dashboard-trips-list">
                          {filteredTrips.slice(0, 5).map((trip, index) => (
                            <TripListItem
                              key={trip.tripId}
                              trip={trip}
                              index={index}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* NEW: Sales Breakdown by Currency Section */}
            <CurrencyBreakdownCard />

            {/* Table - Below both columns */}
            <div className="bus-dashboard-daily-sales-card">
              <div className="bus-dashboard-section-header">
                <div className="bus-dashboard-section-title">Trip Data</div>
              </div>
              <div className="bus-dashboard-daily-sales-table-container">
                <table className="bus-dashboard-daily-sales-table">
                  <thead>
                    <tr>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Trip #</th>
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
                          <td>{trip.conductorName}</td>
                          <td>{trip.ticketCount}</td>
                          <td>{trip.majorRoute}</td>
                          <td>{trip.timeElapsed || getTripDuration(trip.startTime, trip.endTime)}</td>
                          <td>{formatCurrency(trip.totalSales)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="bus-dashboard-no-data">
                          No trip data available for the selected period
                        </td>
                      </tr>
                    )}
                    {filteredTrips.length > 0 && (
                      <tr className="bus-dashboard-total-row">
                        <td colSpan="4"><strong>TOTAL TRIP SALES</strong></td>
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
            fetchBusDashboardData(startDateTime, endDateTime);
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

export default BusDashboardScreen;