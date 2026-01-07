import React, { useState, useEffect, useCallback, useRef } from "react";
import "../css/TripTicketsScreen.css";
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

const TripTicketsScreen = () => {
  const authContext = useAuth();
  const { user } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get trip data from navigation state
  const { trip } = location.state || {};
  
  // State variables - similar to AllTripsScreen
  const [tickets, setTickets] = useState([]);
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
  const [activeScreen, setActiveScreen] = useState("trip-tickets");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailModal, setTicketDetailModal] = useState(false);
  
  // New state variables for missing functions
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiTotals, setApiTotals] = useState({
    totalTicketsRevenue: 0,
    totalTicketsCount: 0,
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
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTickets = filteredTickets.slice(startIndex, endIndex);

  // Load data on component mount
  useEffect(() => {
    const { startDate, endDate } = calculateDateRange(selectedDateRange, selectedDate);
    setDateRangeState([{ startDate, endDate, key: "selection" }]);
    fetchTicketsData(startDate, endDate);
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

  // Fetch tickets data
  const fetchTicketsData = async (startDate, endDate) => {
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
        busId: trip?.busId,
        tripId: trip?.tripId,
      };

      console.log("Fetching tickets data with:", requestBody);

      let response = await fetch(`${apiLink}/ticketssummary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch tickets data:", data);
        setTickets([]);
        setApiTotals({
          totalTicketsRevenue: 0,
          totalTicketsCount: 0,
        });
      } else {
        console.log("Tickets data received:", data);

        // Set base currency
        if (data.baseCurrency) {
          setBaseCurrency(data.baseCurrency);
        }

        // STORE API TOTALS
        setApiTotals({
          totalTicketsRevenue: data.totalTicketsRevenue || 0,
          totalTicketsCount: data.totalTicketsCount || 0,
        });

        // Transform API data
        const transformedTickets = (data.tickets || []).map((ticket) => ({
          id: ticket.id,
          ticketId: ticket.ticketId,
          ticketNumber: ticket.ticketNumber,
          amountPaid: ticket.amountPaid,
          busId: ticket.busId,
          busName: ticket.busName,
          conductorId: ticket.conductorId,
          conductorName: ticket.conductorName,
          currencyCode: ticket.currencyCode,
          currencyName: ticket.currencyName,
          currencySymbol: ticket.currencySymbol,
          customerId: ticket.customerId,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          date: ticket.date,
          discount: ticket.discount,
          farePerPerson: ticket.farePerPerson,
          from: ticket.from,
          passengerCount: ticket.passengerCount,
          passengerType: ticket.passengerType,
          refundedAt: ticket.refundedAt,
          refundedStatus: ticket.refundedStatus,
          routeName: ticket.routeName,
          routeNumber: ticket.routeNumber,
          timestamp: ticket.timestamp,
          to: ticket.to,
          totalAmount: ticket.totalAmount,
          tripId: ticket.tripId,
          tripNumber: ticket.tripNumber,
          majorRoute: ticket.majorRoute,
          majorRouteId: ticket.majorRouteId,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
        }));

        setTickets(transformedTickets);
        setFilteredTickets(transformedTickets);
      }
    } catch (error) {
      console.error("Error fetching tickets data:", error);
      setTickets([]);
      setApiTotals({
        totalTicketsRevenue: 0,
        totalTicketsCount: 0,
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
      fetchTicketsData(startDate, endDate);
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
    fetchTicketsData(newStartDate, newEndDate);
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
    fetchTicketsData(newStartDate, newEndDate);
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
  const formatCurrency = (amount, ticket = null) => {
    const symbol = ticket?.currencySymbol || baseCurrency?.symbol || "$";
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

  // Format list item date
  const formatListItemDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "EEE, MMM dd, yyyy HH:mm");
  };

  // Export functions
const exportToCSV = () => {
  setExportLoading(true);
  try {
    // Updated headers - added Trip # column
    const headers = "Date,Trip #,Ticket #,Customer,Phone,From,To,Passengers,Currency,Fare,Total Amount,Status\n";
    
    const csvData = tickets
      .map(ticket => {
        const date = formatDate(ticket.timestamp);
        const status = ticket.refundedStatus === "refunded" ? "REFUNDED" : "ACTIVE";
        const currency = ticket.currencyCode || baseCurrency?.code || "USD";
        
        // Remove currency symbol from fare and total amount - just export the numeric value
        const fare = Number(ticket.farePerPerson).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        
        const totalAmount = Number(ticket.amountPaid).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        
        return `"${date}","${ticket.tripNumber}","${ticket.ticketNumber}","${ticket.customerName}","${ticket.customerPhone}","${ticket.from}","${ticket.to}",${ticket.passengerCount},"${currency}",${fare},${totalAmount},"${status}"`;
      })
      .join('\n');
    
    const csvContent = headers + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename based on actual date range
    const startDate = dateRangeState[0].startDate;
    const endDate = dateRangeState[0].endDate;
    let fileName;

    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      // For single day ranges: tickets-YYYY-MM-DD.csv
      fileName = `tickets-${format(startDate, 'yyyy-MM-dd')}.csv`;
    } else if (selectedDateRange === "Custom") {
      // For custom ranges: tickets-YYYY-MM-DD-to-YYYY-MM-DD.csv
      const startFormatted = format(startDate, 'yyyy-MM-dd');
      const endFormatted = format(endDate, 'yyyy-MM-dd');
      fileName = `tickets-${startFormatted}-to-${endFormatted}.csv`;
    } else {
      // For other ranges: tickets-YYYY-MM-DD-to-YYYY-MM-DD.csv
      const startFormatted = format(startDate, 'yyyy-MM-dd');
      const endFormatted = format(endDate, 'yyyy-MM-dd');
      fileName = `tickets-${startFormatted}-to-${endFormatted}.csv`;
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

 const exportToPDF = () => {
  setExportLoading(true);
  try {
    const printWindow = window.open('', '_blank');
    
    // Generate date range for filename
    const startDate = dateRangeState[0].startDate;
    const endDate = dateRangeState[0].endDate;
    let dateRangeTitle;
    
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
      dateRangeTitle = format(startDate, 'yyyy-MM-dd');
    } else {
      dateRangeTitle = `${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tickets Report - ${dateRangeTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1a5b7b; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1a5b7b; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .total-row { font-weight: bold; background-color: #e9ecef; }
          .refunded { background-color: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>Tickets Report - ${user?.company_name || 'Company'}</h1>
        <div class="summary">
          <p><strong>Trip:</strong> #${trip?.tripNumber} - ${trip?.busName}</p>
          <p><strong>Conductor:</strong> ${trip?.conductorName}</p>
          <p><strong>Period:</strong> ${formatDateDisplay()}</p>
          <p><strong>Total Revenue:</strong> ${formatCurrency(apiTotals.totalTicketsRevenue)}</p>
          <p><strong>Total Tickets:</strong> ${apiTotals.totalTicketsCount}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Trip #</th>
              <th>Ticket #</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>From → To</th>
              <th>Passengers</th>
              <th>Currency</th>
              <th>Fare</th>
              <th>Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tickets.map(ticket => {
              const currency = ticket.currencyCode || baseCurrency?.code || "USD";
              const fare = Number(ticket.farePerPerson).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const totalAmount = Number(ticket.amountPaid).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              
              return `
                <tr class="${ticket.refundedStatus === 'refunded' ? 'refunded' : ''}">
                  <td>${formatDate(ticket.timestamp)}</td>
                  <td>${ticket.tripNumber}</td>
                  <td>${ticket.ticketNumber}</td>
                  <td>${ticket.customerName}</td>
                  <td>${ticket.customerPhone}</td>
                  <td>${ticket.from} → ${ticket.to}</td>
                  <td>${ticket.passengerCount}</td>
                  <td>${currency}</td>
                  <td>${fare}</td>
                  <td>${totalAmount}</td>
                  <td>${ticket.refundedStatus === 'refunded' ? 'REFUNDED' : 'ACTIVE'}</td>
                </tr>
              `;
            }).join('')}
            ${tickets.length > 0 ? `
              <tr class="total-row">
                <td colspan="8"><strong>TOTAL</strong></td>
                <td><strong>${Number(apiTotals.totalTicketsRevenue).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</strong></td>
                <td></td>
                <td><strong>${apiTotals.totalTicketsCount} tickets</strong></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        <p style="margin-top: 20px; text-align: center; color: #666;">
          Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}
        </p>
        ${tickets.length === 0 ? `
          <p style="text-align: center; color: #999; font-style: italic; margin-top: 40px;">
            No ticket data available for the selected period
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

  // Show ticket details
  const showTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailModal(true);
  };

  // Filter tickets based on search query
  useEffect(() => {
    let filtered = [...tickets];

    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.customerPhone?.includes(searchQuery) ||
          ticket.ticketNumber?.toString().includes(searchQuery) ||
          ticket.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.to?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredTickets(filtered);
  }, [searchQuery, tickets]);

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
    <div className="trip-tickets-circular-metric-card" onClick={onPress}>
      <div className="trip-tickets-circular-metric-content">
        <div
          className="trip-tickets-circular-metric-icon"
          style={{ backgroundColor: colors[0] }}
        >
          <span className={`professional-icon ${iconClass}`}></span>
        </div>
        <div className="trip-tickets-circular-metric-text">
          <div className="trip-tickets-circular-metric-value">{value}</div>
          <div className="trip-tickets-circular-metric-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );

  // Ticket List Item Component
  const TicketListItem = ({ ticket, index }) => {
    return (
      <div className="trip-tickets-ticket-item" onClick={() => showTicketDetails(ticket)}>
        <div className="trip-tickets-ticket-item-content">
          <div className="trip-tickets-ticket-item-header">
            <div className="trip-tickets-ticket-icon">
              <span className="fas fa-receipt"></span>
            </div>
            <div className="trip-tickets-ticket-info">
              <div className="trip-tickets-ticket-id">Ticket #{ticket.ticketNumber || "N/A"}</div>
              <div className="trip-tickets-ticket-details">
                Customer: {ticket.customerName || "Unknown Customer"}
              </div>
              <div className="trip-tickets-route-info">
                {ticket.from} → {ticket.to}
              </div>
              <div className="trip-tickets-passenger-info">
                {ticket.passengerCount} {ticket.passengerType || "passengers"}
              </div>
            </div>
            <div className={`trip-tickets-ticket-amount ${ticket.refundedStatus === 'refunded' ? 'trip-tickets-refunded-amount' : ''}`}>
              {formatCurrency(Number(ticket.amountPaid), ticket)}
            </div>
          </div>
          <div className="trip-tickets-ticket-stats">
            <div className="trip-tickets-ticket-stat">
              <span className="fas fa-user"></span>
              {ticket.customerPhone || "No phone"}
            </div>
            <div className="trip-tickets-ticket-stat">
              <span className="fas fa-clock"></span>
              {formatListItemDate(ticket.timestamp)}
            </div>
          </div>
          <div className="trip-tickets-currency-badge">
            <span className="fas fa-money-bill-wave"></span>
            {ticket.currencyCode || baseCurrency?.code || "USD"}
          </div>
          {ticket.refundedStatus === 'refunded' && (
            <div className="trip-tickets-refunded-badge">
              <span className="fas fa-undo"></span>
              REFUNDED
            </div>
          )}
        </div>
      </div>
    );
  };

  // Ticket Detail Modal Component
  const TicketDetailModal = () => {
    if (!selectedTicket) return null;

    return (
      <div className="trip-tickets-modal-overlay" onClick={() => setTicketDetailModal(false)}>
        <div className="trip-tickets-modal-container trip-tickets-ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="trip-tickets-modal-header">
            <div className="trip-tickets-modal-header-content">
              <div className="trip-tickets-modal-icon">
                <span className="professional-icon icon-receipt"></span>
              </div>
              <div className="trip-tickets-modal-title-container">
                <div className="trip-tickets-modal-title">Ticket Details</div>
                <div className="trip-tickets-modal-subtitle">
                  Ticket #{selectedTicket.ticketNumber} • {selectedTicket.from} → {selectedTicket.to}
                </div>
              </div>
            </div>
            
            <button className="trip-tickets-close-button" onClick={() => setTicketDetailModal(false)}>
              <span className="fas fa-close"></span>
            </button>
          </div>

          <div className="trip-tickets-modal-content">
            <div className="trip-tickets-detail-section">
              <div className="trip-tickets-section-header">
                <span className="professional-icon icon-person"></span>
                <div className="trip-tickets-section-label">CUSTOMER INFORMATION</div>
              </div>
              <div className="trip-tickets-info-card">
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-person"></span>
                    <div className="trip-tickets-info-label">Name:</div>
                  </div>
                  <div className="trip-tickets-info-value">{selectedTicket.customerName}</div>
                </div>
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-phone"></span>
                    <div className="trip-tickets-info-label">Phone:</div>
                  </div>
                  <div className="trip-tickets-info-value">{selectedTicket.customerPhone || "Not provided"}</div>
                </div>
              </div>
            </div>

            <div className="trip-tickets-detail-section">
              <div className="trip-tickets-section-header">
                <span className="professional-icon icon-route"></span>
                <div className="trip-tickets-section-label">TRIP INFORMATION</div>
              </div>
              <div className="trip-tickets-info-card">
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-bus"></span>
                    <div className="trip-tickets-info-label">Bus:</div>
                  </div>
                  <div className="trip-tickets-info-value">{selectedTicket.busName}</div>
                </div>
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-location"></span>
                    <div className="trip-tickets-info-label">Route:</div>
                  </div>
                  <div className="trip-tickets-info-value">{selectedTicket.from} → {selectedTicket.to}</div>
                </div>
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-people"></span>
                    <div className="trip-tickets-info-label">Passengers:</div>
                  </div>
                  <div className="trip-tickets-info-value">{selectedTicket.passengerCount} {selectedTicket.passengerType || "passengers"}</div>
                </div>
              </div>
            </div>

            <div className="trip-tickets-detail-section">
              <div className="trip-tickets-section-header">
                <span className="professional-icon icon-time"></span>
                <div className="trip-tickets-section-label">TIME INFORMATION</div>
              </div>
              <div className="trip-tickets-info-card">
                <div className="trip-tickets-info-row">
                  <div className="trip-tickets-label-container">
                    <span className="professional-icon icon-calendar"></span>
                    <div className="trip-tickets-info-label">Date & Time:</div>
                  </div>
                  <div className="trip-tickets-info-value">{formatListItemDate(selectedTicket.timestamp)}</div>
                </div>
              </div>
            </div>

            <div className="trip-tickets-detail-section">
              <div className="trip-tickets-section-header">
                <span className="professional-icon icon-cash"></span>
                <div className="trip-tickets-section-label">PAYMENT DETAILS</div>
              </div>
              <div className="trip-tickets-stats-grid">
                <div className="trip-tickets-stat-card">
                  <span className="professional-icon icon-receipt"></span>
                  <div className="trip-tickets-stat-card-value">{formatCurrency(selectedTicket.farePerPerson, selectedTicket)}</div>
                  <div className="trip-tickets-stat-card-label">Fare per Person</div>
                </div>
                <div className="trip-tickets-stat-card">
                  <span className="professional-icon icon-cash"></span>
                  <div className="trip-tickets-stat-card-value">{formatCurrency(selectedTicket.amountPaid, selectedTicket)}</div>
                  <div className="trip-tickets-stat-card-label">Total Paid</div>
                </div>
              </div>
              {selectedTicket.discount > 0 && (
                <div className="trip-tickets-info-card">
                  <div className="trip-tickets-info-row">
                    <div className="trip-tickets-label-container">
                      <span className="professional-icon icon-discount"></span>
                      <div className="trip-tickets-info-label">Discount:</div>
                    </div>
                    <div className="trip-tickets-info-value trip-tickets-discount-value">
                      -{formatCurrency(selectedTicket.discount, selectedTicket)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedTicket.refundedStatus === 'refunded' && (
              <div className="trip-tickets-detail-section">
                <div className="trip-tickets-section-header">
                  <span className="professional-icon icon-refund"></span>
                  <div className="trip-tickets-section-label trip-tickets-refunded-label">REFUND STATUS</div>
                </div>
                <div className="trip-tickets-info-card trip-tickets-refunded-card">
                  <div className="trip-tickets-info-row">
                    <div className="trip-tickets-label-container">
                      <span className="professional-icon icon-time"></span>
                      <div className="trip-tickets-info-label">Refunded At:</div>
                    </div>
                    <div className="trip-tickets-info-value">{formatListItemDate(selectedTicket.refundedAt)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="trip-tickets-modal-actions">
            <button 
              className="trip-tickets-close-modal-button"
              onClick={() => setTicketDetailModal(false)}
            >
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
        title={`Trip #${trip?.tripNumber} Tickets`}
        subtitle={`Ticket history for ${trip?.busName} - ${trip?.conductorName}`}
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
        <div className="trip-tickets-container">
          <div className="trip-tickets-content">
            {/* Header */}
            <div className="trip-tickets-header">
              <div className="trip-tickets-header-content">
                <button className="trip-tickets-back-button" onClick={() => navigate(-1)}>
                  <span className="professional-icon icon-arrow-back"></span>
                  Back
                </button>
                
                <div className="trip-tickets-trip-info">
                  <div className="trip-tickets-trip-subtitle">
                    {trip?.busName} • {trip?.conductorName}
                  </div>
                </div>
              </div>

              {/* Date Navigation */}
              <div className="trip-tickets-date-navigation">
                <button
                  className="trip-tickets-date-nav-button"
                  onClick={handleBackClick}
                >
                  ‹
                </button>
                <button
                  className="trip-tickets-date-display"
                  onClick={() => setShowDateModal(true)}
                >
                  {formatDateDisplay()}
                  <span className="trip-tickets-calendar-icon">
                    <span className="professional-icon icon-calendar"></span>
                  </span>
                </button>
                <button
                  className="trip-tickets-date-nav-button"
                  onClick={handleForwardClick}
                  disabled={!canNavigateForward()}
                >
                  ›
                </button>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="trip-tickets-main-content-area">
              {/* Left Column - Metrics and Export */}
              <div className="trip-tickets-left-column">
                {/* Metrics Section */}
                <div className="trip-tickets-metrics-section">
                  <div className="trip-tickets-section-title">Trip Summary</div>
                  <div className="trip-tickets-circular-metrics-container">
                    <div className="trip-tickets-metric-column">
                      <div className="trip-tickets-metric-title">Tickets</div>
                      <CircularMetricCard
                        value={apiTotals.totalTicketsCount.toLocaleString()}
                        subtitle="Total sold"
                        iconClass="icon-receipt"
                        colors={["#0798ff", "#1427fd"]}
                        delay={200}
                      />
                    </div>
                    <div className="trip-tickets-metric-column">
                      <div className="trip-tickets-metric-title">Total Sales</div>
                      <CircularMetricCard
                        value={formatCurrency(apiTotals.totalTicketsRevenue)}
                        subtitle="All tickets"
                        iconClass="icon-dollar"
                        colors={["#28a745", "#20c997"]}
                        delay={100}
                      />
                    </div>
                    <div className="trip-tickets-metric-column">
                      <div className="trip-tickets-metric-title">Currency</div>
                      <CircularMetricCard
                        value={baseCurrency?.code || "USD"}
                        subtitle="Used currency"
                        iconClass="icon-cash"
                        colors={["#17a2b8", "#6f42c1"]}
                        delay={300}
                      />
                    </div>
                  </div>
                </div>

                {/* Export Controls */}
                <div className="trip-tickets-export-controls">
                  <button
                    className="trip-tickets-export-button trip-tickets-csv-button"
                    onClick={exportToCSV}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-download"></span>
                    {exportLoading ? "Exporting..." : "Export CSV"}
                  </button>
                  <button
                    className="trip-tickets-export-button trip-tickets-pdf-button"
                    onClick={exportToPDF}
                    disabled={exportLoading}
                  >
                    <span className="professional-icon icon-file-pdf"></span>
                    {exportLoading ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>

              {/* Right Column - Tickets List */}
              <div className="trip-tickets-right-column">
                {/* Tickets Section */}
                <div className="trip-tickets-tickets-section">
                  <div className="trip-tickets-section-header">
                    <div className="trip-tickets-section-title">All Tickets ({filteredTickets.length})</div>
                  </div>

                  {/* Search Bar */}
                  <div className="trip-tickets-search-container">
                    <span className="professional-icon icon-search trip-tickets-search-icon"></span>
                    <input
                      type="text"
                      className="trip-tickets-search-input"
                      placeholder="Search tickets, customers, routes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <span className="professional-icon icon-close-circle"></span>
                      </button>
                    )}
                  </div>

                  {filteredTickets.length === 0 ? (
                    <div className="trip-tickets-empty-state">
                      <span className="professional-icon icon-receipt trip-tickets-empty-icon"></span>
                      <div className="trip-tickets-empty-state-text">No tickets found</div>
                      <div className="trip-tickets-empty-state-subtext">
                        {searchQuery ? "Try adjusting your search" : "Tickets will appear here once sold"}
                      </div>
                    </div>
                  ) : (
                    <div className="trip-tickets-tickets-list">
                      {currentTickets.map((ticket, index) => (
                        <TicketListItem
                          key={ticket.id}
                          ticket={ticket}
                          index={index}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredTickets.length > ITEMS_PER_PAGE && (
                    <div className="trip-tickets-pagination-container">
                      <button
                        className="trip-tickets-pagination-button"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <span className="professional-icon icon-arrow-back"></span>
                      </button>

                      <div className="trip-tickets-page-numbers">
                        {getPageNumbers().map((page) => (
                          <button
                            key={page}
                            className={`trip-tickets-page-number ${currentPage === page ? 'trip-tickets-current-page-number' : ''}`}
                            onClick={() => goToPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        className="trip-tickets-pagination-button"
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
            <div className="trip-tickets-daily-sales-card">
              <div className="trip-tickets-section-header">
                <div className="trip-tickets-section-title">All Tickets Data</div>
              </div>
              <div className="trip-tickets-daily-sales-table-container">
                <table className="trip-tickets-daily-sales-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Trip #</th>
                      <th>Ticket #</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>From → To</th>
                      <th>Passengers</th>
                      <th>Currency</th>
                      <th>Fare</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.length > 0 ? (
                      filteredTickets.map((ticket) => {
                        const currency = ticket.currencyCode || baseCurrency?.code || "USD";
                        return (
                          <tr key={ticket.id} className={ticket.refundedStatus === 'refunded' ? 'trip-tickets-refunded-row' : ''}>
                            <td>{formatDate(ticket.timestamp)}</td>
                            <td>{ticket.tripNumber}</td>
                            <td>{ticket.ticketNumber}</td>
                            <td>{ticket.customerName}</td>
                            <td>{ticket.customerPhone}</td>
                            <td>{ticket.from} → {ticket.to}</td>
                            <td>{ticket.passengerCount}</td>
                            <td>{currency}</td>
                            <td>{Number(ticket.farePerPerson).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}</td>
                            <td>{Number(ticket.amountPaid).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}</td>
                            <td>
                              <span className={`trip-tickets-status-badge ${ticket.refundedStatus === 'refunded' ? 'trip-tickets-status-refunded' : 'trip-tickets-status-active'}`}>
                                {ticket.refundedStatus === 'refunded' ? 'REFUNDED' : 'ACTIVE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="11" className="trip-tickets-no-data">
                          No ticket data available for the selected period
                        </td>
                      </tr>
                    )}
                    {filteredTickets.length > 0 && (
                      <tr className="trip-tickets-total-row">
                        <td colSpan="8"><strong>TOTAL</strong></td>
                        <td><strong>{Number(apiTotals.totalTicketsRevenue).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</strong></td>
                        <td></td>
                        <td><strong>{apiTotals.totalTicketsCount} tickets</strong></td>
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
            fetchTicketsData(startDateTime, endDateTime);
          }}
          initialStartDate={customStartDate}
          initialEndDate={customEndDate}
          initialStartTime={customStartTime}
          initialEndTime={customEndTime}
        />

        {/* Ticket Detail Modal */}
        {ticketDetailModal && <TicketDetailModal />}
      </div>
    </div>
  );
};

export default TripTicketsScreen;