import React, { useState, useRef, useEffect, useCallback } from "react";
import "../css/DashboardScreen.css";
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
import { useNavigate } from "react-router-dom";

const DashboardScreen = () => {
  const authContext = useAuth();
  const { user } = authContext;
  const navigate = useNavigate();
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
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [customStartTime, setCustomStartTime] = useState("00:00");
  const [customEndTime, setCustomEndTime] = useState("23:59");
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Date range picker state
  const [dateRangeState, setDateRangeState] = useState([
    {
      startDate: startOfToday(),
      endDate: endOfToday(),
      key: "selection",
    },
  ]);

  // Load data on component mount
  useEffect(() => {
    fetchAllBuses();
    const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
    setDateRangeState([{ startDate, endDate, key: "selection" }]);
    fetchDashboardData(startDate, endDate);
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

  // Fetch all buses
  const fetchAllBuses = async () => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();

      if (!token) {
        console.error("No authentication token available");
        setAllBuses([]);
        return;
      }

      let response = await fetch(`${apiLink}/buses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Check response status before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok && data.buses) {
        const transformedBuses = data.buses.map(bus => ({
          id: bus.id,
          name: bus.busname || "Unknown Bus",
          plate: bus.numberplate || "N/A",
          route: bus.route || "No route assigned",
          totalSales: 0,
          totalPassengers: 0,
          trips: 0,
          conductor: bus.conductorname || "Not assigned"
        }));
        setAllBuses(transformedBuses);
      } else {
        console.error("Failed to fetch all buses:", data);
        setAllBuses([]);
      }
    } catch (error) {
      console.error("Error fetching all buses:", error);
      setAllBuses([]);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async (startDate, endDate) => {
    try {
      setLoading(true);
      const token = user?.token;
      const apiLink = Apilink.getLink();

      if (!token) {
        console.error("No authentication token available");
        setDashboardData(getDefaultDashboardData());
        setBuses([]);
        return;
      }

      const requestBody = {
        start_date: startDate?.toISOString() || new Date().toISOString(),
        end_date: endDate?.toISOString() || new Date().toISOString(),
      };

      console.log("Fetching dashboard data with:", requestBody);

      // Fetch dashboard summary
      let response = await fetch(`${apiLink}/dashboardsummary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Check response status before parsing JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const dashboardData = await response.json();

      console.log("Dashboard data received:", dashboardData);

      // Set base currency with fallback
      if (dashboardData?.baseCurrency) {
        setBaseCurrency(dashboardData.baseCurrency);
      } else {
        setBaseCurrency("USD");
      }

      // Get buses and fetch trips data with safe fallbacks
      const busesFromApi = dashboardData?.generalPerfomance || [];
      let tripsData = [];
      
      try {
        tripsData = await fetchTripsData(startDate, endDate, busesFromApi);
      } catch (tripError) {
        console.error("Error fetching trips data:", tripError);
        tripsData = [];
      }

      console.log("Trips data for dashboard:", tripsData);

      // Transform API data with safe access
      const transformedData = {
        totalSales: dashboardData?.amountPaidSum || 0,
        totalPassengers: dashboardData?.totalTickets || 0,
        totalTrips: dashboardData?.completedTrips || 0,
        busPerformance: transformBusPerformance(busesFromApi, tripsData),
        dailySales: transformDailySales(dashboardData?.dailySales || [], startDate, endDate),
      };

      setDashboardData(transformedData);
      setBuses(transformedData.busPerformance);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData(getDefaultDashboardData());
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for default dashboard data
  const getDefaultDashboardData = () => ({
    totalSales: 0,
    totalPassengers: 0,
    totalTrips: 0,
    busPerformance: [],
    dailySales: [],
  });

  // Fetch trips data for each bus
  const fetchTripsData = async (startDate, endDate, buses) => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();
      
      if (!token) return [];

      let allTrips = [];

      // Check if buses is valid array
      if (!buses || !Array.isArray(buses) || buses.length === 0) {
        return [];
      }

      for (const bus of buses) {
        try {
          const requestBody = {
            start_date: startDate?.toISOString() || new Date().toISOString(),
            end_date: endDate?.toISOString() || new Date().toISOString(),
            busId: bus?.busId || bus?.id,
          };

          // Check if busId exists
          if (!requestBody.busId) {
            console.warn('Skipping bus without ID:', bus);
            continue;
          }

          let response = await fetch(`${apiLink}/bussummary`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          // Check response status before parsing
          if (!response.ok) {
            console.warn(`Failed to fetch trips for bus ${requestBody.busId}:`, response.status);
            continue;
          }

          const data = await response.json();
          
          if (data.trips && Array.isArray(data.trips)) {
            const transformedTrips = data.trips.map((trip) => ({
              tripId: trip.tripId || trip.id || `TRIP_${Date.now()}_${Math.random()}`,
              tripNumber: trip.tripNumber || 1,
              startTime: trip.startTime || new Date().toISOString(),
              endTime: trip.endTime || new Date().toISOString(),
              busId: trip.busId?.toString() || requestBody.busId.toString(),
              busName: trip.busName || bus.busname || "Unknown Bus",
              conductorId: trip.conductorId?.toString() || "unknown",
              conductorName: trip.conductorName || "Unknown Conductor",
              totalSales: trip.totalIncome || trip.totalSales || 0,
              ticketCount: trip.totalTickets || trip.ticketCount || 0,
              status: "completed",
            }));

            allTrips = [...allTrips, ...transformedTrips];
          }
        } catch (busError) {
          console.error(`Error processing bus ${bus?.id}:`, busError);
          continue;
        }
      }

      return allTrips;
    } catch (error) {
      console.error("Error fetching trips data:", error);
      return [];
    }
  };

  // Transform bus performance data
  const transformBusPerformance = (apiBusData, tripsData = []) => {
    if (!apiBusData || !Array.isArray(apiBusData)) return [];
    
    return apiBusData.map((bus) => {
      const busId = bus?.busId?.toString() || bus?.id?.toString() || 'unknown';
      const busTrips = tripsData.filter((trip) => trip.busId === busId).length;

      return {
        id: busId,
        name: bus?.busName || bus?.busname || "Unknown Bus",
        plate: bus?.numberplate || "Unknown Plate",
        route: "Multiple Routes",
        totalSales: Number(bus?.totalRevenue) || 0,
        totalPassengers: Number(bus?.ticketsSold) || 0,
        conductor: "Not Assigned",
        trips: busTrips,
      };
    });
  };

  // Transform daily sales data
  const transformDailySales = (dailySales, startDate, endDate) => {
    if (!dailySales || !Array.isArray(dailySales)) return [];
    
    return dailySales.map((day) => ({
      date: day?.date || '',
      busName: day?.busName || "All Buses",
      passengers: Number(day?.passengers) || 0,
      trips: Number(day?.trips) || 0,
      totalSales: Number(day?.totalSales) || 0,
    }));
  };

  // Calculate date range function
  const calculateDateRange = (range, baseDate = new Date()) => {
    let startDate, endDate;

    console.log("Calculating range:", range, "for base date:", baseDate);

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

    console.log("Calculated date range:", { startDate, endDate });
    return { startDate, endDate };
  };

  // Handle date range selection from modal
  const handleDateRangeSelect = (range) => {
    console.log("Date range selected:", range);
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

      console.log("Setting date range for", range, ":", { startDate, endDate });
      setDateRangeState([{ startDate, endDate, key: "selection" }]);
      setSelectedDate(newSelectedDate);
      
      // Fetch data for the selected range
      fetchDashboardData(startDate, endDate);
    } else {
      setShowCustomRangeModal(true);
    }
  };

  // Date navigation functions
  const handleBackClick = () => {
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];

    console.log("Navigating BACK from:", currentRange, "Range type:", selectedDateRange);

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
        // For custom range, maintain the same duration but shift backwards
        const dayDifference = Math.round(
          (currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24)
        );
        newStartDate = subDays(currentRange.startDate, dayDifference + 1);
        newEndDate = subDays(currentRange.endDate, dayDifference + 1);
        setSelectedDate(newStartDate);
        
        // Update custom date state
        setCustomStartDate(newStartDate);
        setCustomEndDate(newEndDate);
        break;
      default:
        const prevDay = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(prevDay);
        newEndDate = endOfDay(prevDay);
        setSelectedDate(prevDay);
    }

    console.log("New date range after BACK:", { newStartDate, newEndDate });

    // Update the date range state
    setDateRangeState([
      { startDate: newStartDate, endDate: newEndDate, key: "selection" },
    ]);

    // Fetch data with the new date range
    fetchDashboardData(newStartDate, newEndDate);
  };

  const handleForwardClick = () => {
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];
    const today = new Date();

    console.log("Navigating FORWARD from:", currentRange, "Range type:", selectedDateRange);

    // Check if we can navigate forward at all
    const canNavigateForward = () => {
      const { endDate } = currentRange;
      
      // For all ranges, if end date is today or later, we can't go forward
      return endDate < endOfDay(today);
    };

    if (!canNavigateForward()) {
      console.log("Cannot navigate forward - already at or beyond today");
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
        // Cap at today if needed
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
        // For custom range, maintain the same duration but shift forwards
        const dayDifference = Math.round(
          (currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24)
        );
        newStartDate = addDays(currentRange.startDate, dayDifference + 1);
        newEndDate = addDays(currentRange.endDate, dayDifference + 1);
        // Don't allow navigation beyond today
        if (newEndDate > today) {
          newEndDate = today;
          newStartDate = subDays(today, dayDifference);
        }
        setSelectedDate(newStartDate);
        
        // Update custom date state
        setCustomStartDate(newStartDate);
        setCustomEndDate(newEndDate);
        break;
      default:
        const nextDayDefault = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(nextDayDefault);
        newEndDate = endOfDay(nextDayDefault);
        setSelectedDate(nextDayDefault);
    }

    console.log("New date range after FORWARD:", { newStartDate, newEndDate });

    // Update the date range state
    setDateRangeState([
      { startDate: newStartDate, endDate: newEndDate, key: "selection" },
    ]);

    // Fetch data with the new date range
    fetchDashboardData(newStartDate, newEndDate);
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

  // Check if next button should be disabled
  const isNextDisabled = () => {
    const { endDate } = dateRangeState[0];
    const today = new Date();
    
    // For "Today" and "Yesterday", disable if we're already at today
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      return isToday(endDate);
    }
    
    // For other ranges, disable if end date is today or in the future
    return endDate >= endOfDay(today);
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

  // Format currency
  const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    const symbol = baseCurrency?.symbol || "$";
    return `${symbol}${safeAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export functions to use bus performance data
  const exportToCSV = () => {
    setExportLoading(true);
    try {
      const headers = "Date,Bus Name,Passengers,Trips,Total Sales\n";
      
      // Use bus performance data instead of dailySales
      const csvData = dashboardData?.busPerformance
        .filter(bus => bus.totalSales > 0) // Only buses with sales
        .map(bus => {
          const date = formatDateDisplay(); // Use the current selected date range
          return `"${date}","${bus.name}",${bus.totalPassengers},${bus.trips},${bus.totalSales}`;
        })
        .join('\n');
      
      const csvContent = headers + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bus-sales-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
      const busesWithSales = dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0) || [];
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bus Sales Report</title>
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
          <h1>Bus Sales Report - ${user?.company_name || 'Company'}</h1>
          <div class="summary">
            <p><strong>Period:</strong> ${formatDateDisplay()}</p>
            <p><strong>Total Sales:</strong> ${formatCurrency(dashboardData?.totalSales)}</p>
            <p><strong>Total Passengers:</strong> ${dashboardData?.totalPassengers}</p>
            <p><strong>Total Trips:</strong> ${dashboardData?.totalTrips}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bus Name</th>
                <th>Passengers</th>
                <th>Trips</th>
                <th>Total Sales</th>
              </tr>
            </thead>
            <tbody>
              ${busesWithSales.map(bus => `
                <tr>
                  <td>${formatDateDisplay().split(' - ')[0]}</td>
                  <td>${bus.name}</td>
                  <td>${bus.totalPassengers}</td>
                  <td>${bus.trips}</td>
                  <td>${formatCurrency(bus.totalSales)}</td>
                </tr>
              `).join('')}
              ${busesWithSales.length > 0 ? `
                <tr class="total-row">
                  <td colspan="2"><strong>TOTAL</strong></td>
                  <td><strong>${dashboardData?.totalPassengers}</strong></td>
                  <td><strong>${dashboardData?.totalTrips}</strong></td>
                  <td><strong>${formatCurrency(dashboardData?.totalSales)}</strong></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
          <p style="margin-top: 20px; text-align: center; color: #666;">
            Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}
          </p>
          ${busesWithSales.length === 0 ? `
            <p style="text-align: center; color: #999; font-style: italic; margin-top: 40px;">
              No bus sales data available for the selected period
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

  // Circular Metric Card Component
  const CircularMetricCard = ({
    value,
    subtitle,
    iconClass,
    colors,
    delay,
    onPress,
  }) => (
    <div className="circular-metric-card" onClick={onPress}>
      <div className="circular-metric-content">
        <div
          className="circular-metric-icon"
          style={{ backgroundColor: colors[0] }}
        >
          <span className={`professional-icon ${iconClass}`}></span>
        </div>
        <div className="circular-metric-text">
          <div className="circular-metric-value">{value}</div>
          <div className="circular-metric-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );

  // Bus Performance Item Component
  const BusPerformanceItem = ({ bus, index }) => {
    const handleBusClick = () => {
      console.log("Clicked bus data:", bus);
      console.log("Bus ID:", bus.id);
      console.log("Bus Name:", bus.name);
      
      // Navigate to BusDashboardScreen with bus data
      navigate('/bus-dashboard', { state: { bus } });
    };
    
    return (
      <div className="bus-item" onClick={handleBusClick}>
        <div className="bus-item-content">
          <div className="bus-item-header">
            <div className="bus-icon">
              <span className="professional-icon icon-bus"></span>
            </div>
            <div className="bus-info">
              <div className="bus-name">{bus.name}</div>
              <div className="bus-plate">Plate: {bus.plate}</div>
            </div>
            <div className="bus-amount">{formatCurrency(bus.totalSales)}</div>
          </div>
          <div className="bus-stats">
            <div className="bus-stat">
              <span className="professional-icon icon-passengers"></span>{" "}
              {bus.totalPassengers} passengers
            </div>
            <div className="bus-stat">
              <span className="professional-icon icon-trips"></span> {bus.trips}{" "}
              trips
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <TopToolbar
        title="Overall Bus Sales Summary"
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
      <div
        className={`main-content ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <div className="dashboard-container">
          <div className="dashboard-content">
            {/* Control Bar with Bus Selector and Date Picker */}
            <div className="control-bar">
              <div className="control-group">
                <div className="date-controls">
                  <div className="date-navigation">
                    <button
                      className="date-nav-button"
                      onClick={handleBackClick}
                    >
                      ‹
                    </button>
                    <button
                      className="date-display"
                      onClick={() => setShowDateModal(true)}
                    >
                      {formatDateDisplay()}
                      <span className="calendar-icon">
                        <span className="professional-icon icon-calendar"></span>
                      </span>
                    </button>
                    <button
                      className="date-nav-button"
                      onClick={handleForwardClick}
                      disabled={isNextDisabled()}
                      style={{ opacity: isNextDisabled() ? 0.5 : 1 }}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="bus-selector-wrapper">
                  <div
                    className="bus-selector"
                    onClick={() => setShowBusDropdown(!showBusDropdown)}
                  >
                    <span className="bus-selector-text">
                      {selectedBus?.name || "All Buses"}
                    </span>
                    <span className="dropdown-arrow">
                      <span className="professional-icon icon-arrow-down"></span>
                    </span>
                  </div>

                  {showBusDropdown && (
                    <div className="bus-dropdown">
                      <div
                        className="bus-dropdown-item"
                        onClick={() => {
                          setSelectedBus(null);
                          setShowBusDropdown(false);
                        }}
                      >
                        All Buses
                      </div>
                      {allBuses.map((bus) => (
                        <div
                          key={bus.id}
                          className="bus-dropdown-item"
                          onClick={() => {
                            navigate('/bus-dashboard', { state: { bus } });
                            setShowBusDropdown(false);
                          }}
                        >
                          {bus.name} ({bus.plate})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard Layout with two columns */}
            <div className="dashboard-layout">
              {/* Sales Summary Card */}
              <div className="dashboard-card1">
                <h2 className="section-title">Sales Summary</h2>
                <div className="circular-metrics-container">
                  <div className="metric-column">
                    <div className="metric-title">Passengers</div>
                    <CircularMetricCard
                      value={(dashboardData?.totalPassengers || 0).toLocaleString()}
                      subtitle="Total carried"
                      iconClass="icon-users"
                      colors={["#17a2b8", "#6f42c1"]}
                    />
                  </div>
                  <div className="metric-column">
                    <div className="metric-title">Total Sales</div>
                    <CircularMetricCard
                      value={formatCurrency(dashboardData?.totalSales)}
                      subtitle="All buses"
                      iconClass="icon-dollar"
                      colors={["#28a745", "#20c997"]}
                    />
                  </div>
                  <div className="metric-column">
                    <div className="metric-title">Trips</div>
                    <CircularMetricCard
                      value={(dashboardData?.totalTrips || 0).toString()}
                      subtitle="Completed"
                      iconClass="icon-route"
                      colors={["#0798ff", "#1427fd"]}
                    />
                  </div>
                </div>
              </div>

              {/* Top Performing Buses Card */}
           <div className="dashboard-card">
  <div className="performance-section">
    <div className="section-header">
      <h2 className="section-title">
        {dashboardData?.busPerformance?.filter(
          (bus) => bus.totalSales > 0
        ).length > 0
          ? "Top Performing Buses"
          : "Bus Performance"}
      </h2>
    </div>

    <div className="busdashboad-list-container">
      {dashboardData?.busPerformance?.filter((bus) => bus.totalSales > 0).length > 0 ? (
        <div className="busdashboad-list">
          {dashboardData.busPerformance
            .filter((bus) => bus.totalSales > 0)
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 5)
            .map((bus, index) => (
              <BusPerformanceItem
                key={bus.id}
                bus={bus}
                index={index}
              />
            ))}
        </div>
      ) : (
        <div className="no-buses-container">
          <div className="no-buses-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 3H2V16H16V3Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 3H18V11H22V3Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 19H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 19H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 16V19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 16V19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="no-buses-title">No Bus Data Available</h3>
          <p className="no-buses-message">
            There are currently no buses with sales data to display. 
            Performance metrics will appear here once sales are recorded.
          </p>
        </div>
      )}
    </div>
  </div>
</div>
            </div>

            {/* Daily Sales Table - Updated to show bus performance data */}
            <div className="dashboard-card daily-sales-card">
              <div className="section-header">
                <h2 className="section-title">Bus Sales Data</h2>
                {/* Export Buttons */}
                <div className="export-controls">
                  <button
                    className="export-button csv-button"
                    onClick={exportToCSV}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-download"></span>
                    {exportLoading ? "Exporting..." : "Export CSV"}
                  </button>
                  <button
                    className="export-button pdf-button"
                    onClick={exportToPDF}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-file-pdf"></span>
                    {exportLoading ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>
              <div className="daily-sales-table-container">
                <table className="daily-sales-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bus Name</th>
                      <th>Passengers</th>
                      <th>Trips</th>
                      <th>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0).length > 0 ? (
                      dashboardData?.busPerformance
                        .filter(bus => bus.totalSales > 0)
                        .sort((a, b) => b.totalSales - a.totalSales)
                        .map((bus, index) => (
                          <tr key={bus.id}>
                            <td>{formatDateDisplay().split(' - ')[0]}</td>
                            <td>{bus.name}</td>
                            <td>{bus.totalPassengers}</td>
                            <td>{bus.trips}</td>
                            <td>{formatCurrency(bus.totalSales)}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-data">
                          No bus sales data available for the selected period
                        </td>
                      </tr>
                    )}
                    {dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0).length > 0 && (
                      <tr className="total-row">
                        <td colSpan="2"><strong>TOTAL</strong></td>
                        <td><strong>{dashboardData?.totalPassengers}</strong></td>
                        <td><strong>{dashboardData?.totalTrips}</strong></td>
                        <td><strong>{formatCurrency(dashboardData?.totalSales)}</strong></td>
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
            
            // Fetch data with the custom date range
            fetchDashboardData(startDateTime, endDateTime);
          }}
          initialStartDate={customStartDate}
          initialEndDate={customEndDate}
          initialStartTime={customStartTime}
          initialEndTime={customEndTime}
        />
      </div>
    </div>
  );
};

export default DashboardScreen;