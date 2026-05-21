import React, { useState, useEffect, useCallback } from "react";
import "../css/ReceiptsScreen.css";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import DateRangeModal from "../components/DateRangeModal";
import CustomRangeModal from "../components/CustomRangeModal";
import { defaultStaticRanges } from "react-date-range";
import {
  startOfToday, endOfToday, startOfYesterday, endOfYesterday,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, addDays, subWeeks, addWeeks,
  subMonths, addMonths, subYears, addYears, format, isToday,
} from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useAuth } from "../context/AuthContext";
import { useDateRange } from "../context/DateRangeContext";
import Apilink from "../baseUrl/baseUrl";

const ITEMS_PER_PAGE = 10;

// Helper: treat refundedStatus = 0 or "active" as active, 1 or "refunded" as refunded
const isRefunded = (status) =>
  status === "refunded" || status === 1 || status === "1" || status === true;

const ReceiptsScreen = () => {
  const { user } = useAuth();

  const {
    selectedDateRange, setSelectedDateRange,
    dateRangeState, setDateRangeState,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    customStartTime, setCustomStartTime,
    customEndTime, setCustomEndTime,
    selectedDate, setSelectedDate,
  } = useDateRange();

  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [salesByCurrency, setSalesByCurrency] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState(null);



  const [selectedBusFilter, setSelectedBusFilter] = useState("all");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState("all");
  const [selectedTripFilter, setSelectedTripFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState("receipts");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showBusDropdown, setShowBusDropdown] = useState(false);
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const [showTripDropdown, setShowTripDropdown] = useState(false);

  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
const [filteredTotals, setFilteredTotals] = useState({
  totalRevenue: 0,
  totalCount: 0,
  activeCount: 0,
  refundedCount: 0,
  totalRevenueBaseCurrency: 0,
});
  const customStaticRanges = [
    ...defaultStaticRanges,
    {
      label: "This Year",
      range: () => ({ startDate: startOfYear(new Date()), endDate: endOfYear(new Date()) }),
      isSelected: () => selectedDateRange === "This Year",
    },
  ];

  const startOfDay = (d) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
  const endOfDay = (d) => { const n = new Date(d); n.setHours(23, 59, 59, 999); return n; };
  const combineDateAndTime = (date, time) => {
    const [h, m] = time.split(":");
    const d = new Date(date); d.setHours(parseInt(h), parseInt(m), 0, 0); return d;
  };

  const formatCurrency = (amount, symbol) => {
    const sym = symbol ?? (baseCurrency?.symbol || "$");
    return `${sym}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (ds) => {
    if (!ds) return "—";
    return format(new Date(ds), "MMM dd, yyyy HH:mm:ss");
  };

  const formatListDate = (ds) => {
    if (!ds) return "—";
    return format(new Date(ds), "EEE, MMM dd, yyyy HH:mm");
  };

  const formatDateDisplay = () => {
    const { startDate, endDate } = dateRangeState[0];
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday")
      return format(startDate, "EEE, MMM dd, yyyy");
    if (selectedDateRange === "Custom") {
      const s = combineDateAndTime(customStartDate, customStartTime);
      const e = combineDateAndTime(customEndDate, customEndTime);
      return `${format(s, "MMM dd, yyyy HH:mm")} - ${format(e, "MMM dd, yyyy HH:mm")}`;
    }
    return `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  };

  // ─── KEY FIX ────────────────────────────────────────────────────────────────
  // totalRevenueBaseCurrency = SUM(amountPaidBaseCurrency)  ← already converted
  // salesByCurrency groups by currency code with original totals AND base totals
const updateFilteredTotals = useCallback((filteredData) => {
  // Separate active and refunded tickets
  const activeTickets = filteredData.filter(r => r.refundedStatus !== "refunded");
  const refundedTickets = filteredData.filter(r => r.refundedStatus === "refunded");
  
  // Total counts (including refunded)
  const totalCount = filteredData.length;
  const refundedCount = refundedTickets.length;
  const activeCount = activeTickets.length;
  
  // Revenue from active tickets only (exclude refunded)
  const totalRevenueBaseCurrency = activeTickets.reduce(
    (sum, r) => sum + (Number(r.amountPaidBaseCurrency) || 0),
    0
  );

  const totalRevenue = activeTickets.reduce(
    (sum, r) => sum + (Number(r.amountPaid) || 0),
    0
  );

  setFilteredTotals({ 
    totalRevenue, 
    totalCount,           // includes refunded
    activeCount,          // active only
    refundedCount,        // refunded count
    totalRevenueBaseCurrency 
  });

  // Per-currency breakdown (exclude refunded tickets from revenue)
  const map = {};
  activeTickets.forEach((r) => {
    const code = r.currencyCode || "UNKNOWN";
    if (!map[code]) {
      map[code] = {
        currencyCode: code,
        currencyName: r.currencyName,
        currencySymbol: r.currencySymbol,
        totalSales: 0,
        totalSalesBaseCurrency: 0,
        ticketCount: 0,
      };
    }
    map[code].totalSales += Number(r.amountPaid) || 0;
    map[code].totalSalesBaseCurrency += Number(r.amountPaidBaseCurrency) || 0;
    map[code].ticketCount += 1;
  });

  setSalesByCurrency(
    Object.values(map).sort((a, b) => b.totalSalesBaseCurrency - a.totalSalesBaseCurrency)
  );
}, []);
  // ────────────────────────────────────────────────────────────────────────────

  const fetchBuses = useCallback(async () => {
    try {
      const apiLink = Apilink.getLink();
      const res = await fetch(`${apiLink}/buses`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (data.buses) {
        setBuses(data.buses.map((b) => ({ id: b.id, name: b.busname || "Unknown", plate: b.numberplate || "" })));
      }
    } catch (e) { console.error("fetchBuses:", e); }
  }, [user]);

  const fetchRoutes = useCallback(async (busId = null) => {
    try {
      setLoadingRoutes(true);
      const apiLink = Apilink.getLink();
      const response = await fetch(`${apiLink}/routes`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch routes");
      const data = await response.json();
      const routesData = data.routes || [];
      let filteredRoutesData = routesData;
      if (busId && busId !== "all") {
        filteredRoutesData = routesData.filter(
          (route) => route.buses && route.buses.some((bus) => String(bus.id) === String(busId))
        );
      }
      const transformedRoutes = filteredRoutesData.map((route) => ({
        id: route.route_id?.toString() || route.id?.toString(),
        name: route.majourRouteName || route.routename || route.name || `${route.from} → ${route.to}`,
        majorRouteId: route.major_route_id || route.majorRouteId,
        from: route.from,
        to: route.to,
      }));
      setRoutes(transformedRoutes);
    } catch (error) {
      console.error("Error loading routes:", error);
      setRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  }, [user]);

  const fetchTrips = useCallback(async (startDate, endDate, busId) => {
    if (!busId || busId === "all") { setTrips([]); return; }
    try {
      setLoadingTrips(true);
      const apiLink = Apilink.getLink();
      const res = await fetch(`${apiLink}/tripsdata`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          bus_id: busId,
        }),
      });
      const data = await res.json();
      if (data.trips) {
        setTrips(data.trips.map((t) => ({
          id: t.id || t.tripId,
          tripId: t.tripId,
          tripNumber: t.tripNumber || t.trip_number,
          busName: t.busName || t.bus_name || "",
          routeName: t.routeName || t.route_name,
          routeId: t.majorRouteId,
        })));
      } else {
        setTrips([]);
      }
    } catch (e) {
      console.error("fetchTrips:", e);
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }, [user]);

  const fetchBaseCurrency = useCallback(async () => {
    try {
      const apiLink = Apilink.getLink();
      const response = await fetch(`${apiLink}/currencies`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const base = data.find((c) => c.isBase === true || c.isBase === 1);
        setBaseCurrency(base || data[0] || null);
      }
    } catch (error) {
      console.error("Error fetching base currency:", error);
    }
  }, [user]);

const fetchTickets = useCallback(async (startDate, endDate) => {
  try {
    setLoading(true);
    const apiLink = Apilink.getLink();
    
    // Send only the date part, no time
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");
    
    const res = await fetch(`${apiLink}/ticketsdata`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
      body: JSON.stringify({
        start_date: startDateStr,
        end_date: endDateStr,
      }),
    });
      const data = await res.json();

      if (!res.ok) {
        setReceipts([]);
        setFilteredReceipts([]);
        setFilteredTotals({ totalRevenue: 0, totalCount: 0, totalRevenueBaseCurrency: 0 });
        setSalesByCurrency([]);
        setLoading(false);
        return;
      }

      const transformed = (data.tickets || []).map((r) => ({
        id: r.id,
        ticketNumber: r.ticketNumber || r.ticket_number || "",
        tripNumber: r.tripNumber || r.trip_number || "",
        tripId: r.tripId || r.trip_id,
        busId: r.busId || r.bus_id || "",
        busName: r.busName || r.bus_name || "Unknown Bus",
        routeName: r.routeName || r.route_name || "",
        routeId: r.routeId || r.route_id,
        majorRouteId: r.majorRouteId,
        conductorName: r.conductorName || r.conductor_name || "",
        customerName: r.customerName || r.customer_name || "Unknown",
        customerPhone: r.customerPhone || r.customer_phone || "",
        from: r.from || "",
        to: r.to || "",
        passengerCount: r.passengerCount || r.passenger_count || 1,
        passengerType: r.passengerType || r.passenger_type || "passenger",
        farePerPerson: r.farePerPerson || r.fare_per_person || 0,
        amountPaid: r.amountPaid || r.amount_paid || 0,
        // FIX: use server-provided base-currency amount directly
        amountPaidBaseCurrency: r.amountPaidBaseCurrency || r.amount_paid_base_currency || 0,
        discount: r.discount || 0,
        currencyCode: r.currencyCode || r.currency_code || "USD",
        currencyName: r.currencyName || r.currency_name || "",
        currencySymbol: r.currencySymbol || r.currency_symbol || "$",
        // FIX: server returns 0/1 integers, normalise to string for consistent checks
        refundedStatus: isRefunded(r.refundedStatus ?? r.refunded_status) ? "refunded" : "active",
        timestamp: r.timestamp || r.created_at || "",
        exchangeRate: r.exchangeRate || r.exchange_rate || 1,
      }));

      setReceipts(transformed);

      let filtered = [...transformed];
      if (selectedBusFilter !== "all") filtered = filtered.filter((r) => String(r.busId) === String(selectedBusFilter));
      if (selectedRouteId && selectedRouteId !== "all") filtered = filtered.filter((r) => String(r.majorRouteId) === String(selectedRouteId));
      if (selectedTripFilter !== "all") filtered = filtered.filter((r) => String(r.tripNumber) === String(selectedTripFilter));
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.customerPhone || "").includes(q) ||
          (r.ticketNumber || "").toString().includes(q) ||
          (r.from || "").toLowerCase().includes(q) ||
          (r.to || "").toLowerCase().includes(q) ||
          (r.busName || "").toLowerCase().includes(q)
        );
      }
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setFilteredReceipts(filtered);
      updateFilteredTotals(filtered);
      setCurrentPage(1);
    } catch (e) {
      console.error("fetchTickets:", e);
      setReceipts([]);
      setFilteredReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBusFilter, selectedRouteId, selectedTripFilter, searchQuery, updateFilteredTotals]);
  const fetchTicketsold = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      console.log(startDate,endDate);
      
      const apiLink = Apilink.getLink();
      const res = await fetch(`${apiLink}/ticketsdata`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setReceipts([]);
        setFilteredReceipts([]);
        setFilteredTotals({ totalRevenue: 0, totalCount: 0, totalRevenueBaseCurrency: 0 });
        setSalesByCurrency([]);
        setLoading(false);
        return;
      }

      const transformed = (data.tickets || []).map((r) => ({
        id: r.id,
        ticketNumber: r.ticketNumber || r.ticket_number || "",
        tripNumber: r.tripNumber || r.trip_number || "",
        tripId: r.tripId || r.trip_id,
        busId: r.busId || r.bus_id || "",
        busName: r.busName || r.bus_name || "Unknown Bus",
        routeName: r.routeName || r.route_name || "",
        routeId: r.routeId || r.route_id,
        majorRouteId: r.majorRouteId,
        conductorName: r.conductorName || r.conductor_name || "",
        customerName: r.customerName || r.customer_name || "Unknown",
        customerPhone: r.customerPhone || r.customer_phone || "",
        from: r.from || "",
        to: r.to || "",
        passengerCount: r.passengerCount || r.passenger_count || 1,
        passengerType: r.passengerType || r.passenger_type || "passenger",
        farePerPerson: r.farePerPerson || r.fare_per_person || 0,
        amountPaid: r.amountPaid || r.amount_paid || 0,
        // FIX: use server-provided base-currency amount directly
        amountPaidBaseCurrency: r.amountPaidBaseCurrency || r.amount_paid_base_currency || 0,
        discount: r.discount || 0,
        currencyCode: r.currencyCode || r.currency_code || "USD",
        currencyName: r.currencyName || r.currency_name || "",
        currencySymbol: r.currencySymbol || r.currency_symbol || "$",
        // FIX: server returns 0/1 integers, normalise to string for consistent checks
        refundedStatus: isRefunded(r.refundedStatus ?? r.refunded_status) ? "refunded" : "active",
        timestamp: r.timestamp || r.created_at || "",
        exchangeRate: r.exchangeRate || r.exchange_rate || 1,
      }));

      setReceipts(transformed);

      let filtered = [...transformed];
      if (selectedBusFilter !== "all") filtered = filtered.filter((r) => String(r.busId) === String(selectedBusFilter));
      if (selectedRouteId && selectedRouteId !== "all") filtered = filtered.filter((r) => String(r.majorRouteId) === String(selectedRouteId));
      if (selectedTripFilter !== "all") filtered = filtered.filter((r) => String(r.tripNumber) === String(selectedTripFilter));
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.customerPhone || "").includes(q) ||
          (r.ticketNumber || "").toString().includes(q) ||
          (r.from || "").toLowerCase().includes(q) ||
          (r.to || "").toLowerCase().includes(q) ||
          (r.busName || "").toLowerCase().includes(q)
        );
      }
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setFilteredReceipts(filtered);
      updateFilteredTotals(filtered);
      setCurrentPage(1);
    } catch (e) {
      console.error("fetchTickets:", e);
      setReceipts([]);
      setFilteredReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedBusFilter, selectedRouteId, selectedTripFilter, searchQuery, updateFilteredTotals]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) return;
    fetchBaseCurrency();
    fetchBuses();
    fetchRoutes();
    const { startDate, endDate } = dateRangeState[0];
    fetchTickets(startDate, endDate);
  }, [user?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.token) return;
    const { startDate, endDate } = dateRangeState[0];
    fetchTickets(startDate, endDate);
    if (selectedBusFilter && selectedBusFilter !== "all") {
      fetchTrips(startDate, endDate, selectedBusFilter);
    }
  }, [dateRangeState[0].startDate, dateRangeState[0].endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBusFilter === "all") {
      setTrips([]);
      setSelectedRouteFilter("all");
      setSelectedRouteId(null);
      setSelectedTripFilter("all");
      fetchRoutes();
      const { startDate, endDate } = dateRangeState[0];
      fetchTickets(startDate, endDate);
      return;
    }
    const { startDate, endDate } = dateRangeState[0];
    fetchRoutes(selectedBusFilter);
    fetchTrips(startDate, endDate, selectedBusFilter);
    setSelectedRouteFilter("all");
    setSelectedRouteId(null);
    setSelectedTripFilter("all");
    fetchTickets(startDate, endDate);
  }, [selectedBusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedRouteId && selectedRouteId !== "all" && trips.length > 0) {
      const filtered = trips.filter((t) => String(t.routeId) === String(selectedRouteId));
      setTrips(filtered);
    } else if ((!selectedRouteId || selectedRouteFilter === "all") && selectedBusFilter !== "all") {
      const { startDate, endDate } = dateRangeState[0];
      fetchTrips(startDate, endDate, selectedBusFilter);
    }
  }, [selectedRouteId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let filtered = [...receipts];
    if (selectedBusFilter !== "all") filtered = filtered.filter((r) => String(r.busId) === String(selectedBusFilter));
    if (selectedRouteId && selectedRouteId !== "all") filtered = filtered.filter((r) => String(r.majorRouteId) === String(selectedRouteId));
    if (selectedTripFilter !== "all") filtered = filtered.filter((r) => String(r.tripNumber) === String(selectedTripFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.customerPhone || "").includes(q) ||
        (r.ticketNumber || "").toString().includes(q) ||
        (r.from || "").toLowerCase().includes(q) ||
        (r.to || "").toLowerCase().includes(q) ||
        (r.busName || "").toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setFilteredReceipts(filtered);
    updateFilteredTotals(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedBusFilter, selectedRouteId, selectedTripFilter, receipts, updateFilteredTotals]);

  // ── Date navigation ──────────────────────────────────────────────────────────
  const isNextDisabled = () => {
    const { endDate } = dateRangeState[0];
    const today = new Date();
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") return isToday(endDate);
    return endDate >= endOfDay(today);
  };

  const handleDateRangeSelect = (range, custStart, custEnd) => {
    if (range === "Custom" && custStart && custEnd) {
      const startDateTime = combineDateAndTime(custStart, "00:00");
      const endDateTime = combineDateAndTime(custEnd, "23:59");
      setCustomStartDate(custStart); setCustomEndDate(custEnd);
      setCustomStartTime("00:00"); setCustomEndTime("23:59");
      setSelectedDateRange("Custom"); setSelectedDate(custStart);
      setDateRangeState([{ startDate: startDateTime, endDate: endDateTime, key: "selection" }]);
      setShowDateModal(false);
      fetchTickets(startDateTime, endDateTime);
    } else if (range !== "Custom") {
      setSelectedDateRange(range); setShowDateModal(false);
      let startDate, endDate, newSelectedDate = new Date();
      switch (range) {
        case "Today": startDate = startOfToday(); endDate = endOfToday(); break;
        case "Yesterday": startDate = startOfYesterday(); endDate = endOfYesterday(); newSelectedDate = subDays(new Date(), 1); break;
        case "This Week": startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); endDate = endOfWeek(new Date(), { weekStartsOn: 1 }); break;
        case "Last Week": { const lw = subWeeks(new Date(), 1); startDate = startOfWeek(lw, { weekStartsOn: 1 }); endDate = endOfWeek(lw, { weekStartsOn: 1 }); newSelectedDate = lw; break; }
        case "This Month": startDate = startOfMonth(new Date()); endDate = endOfMonth(new Date()); break;
        case "Last Month": { const lm = subMonths(new Date(), 1); startDate = startOfMonth(lm); endDate = endOfMonth(lm); newSelectedDate = lm; break; }
        case "This Year": startDate = startOfYear(new Date()); endDate = endOfYear(new Date()); break;
        default: startDate = startOfToday(); endDate = endOfToday();
      }
      setDateRangeState([{ startDate, endDate, key: "selection" }]);
      setSelectedDate(newSelectedDate);
      fetchTickets(startDate, endDate);
    } else {
      setShowDateModal(false); setShowCustomRangeModal(true);
    }
  };

const handleBackClick = () => {
  let newStartDate, newEndDate;
  const currentRange = dateRangeState[0];
  
  // Calculate duration - for same day, duration should be 0
  let durationDays = Math.round((currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24));
  // Fix: if start and end are the same date (ignoring time), duration is 0
  if (currentRange.startDate.toDateString() === currentRange.endDate.toDateString()) {
    durationDays = 0;
  }
  
  switch (selectedDateRange) {
    case "Today":
    case "Yesterday": {
      const prevDay = subDays(currentRange.startDate, 1);
      newStartDate = startOfDay(prevDay);
      newEndDate = endOfDay(prevDay);
      setSelectedDate(prevDay);
      break;
    }
    case "This Week":
    case "Last Week": {
      const prevWeek = subWeeks(currentRange.startDate, 1);
      newStartDate = startOfWeek(prevWeek, { weekStartsOn: 1 });
      newEndDate = endOfWeek(prevWeek, { weekStartsOn: 1 });
      setSelectedDate(prevWeek);
      break;
    }
    case "This Month":
    case "Last Month": {
      const prevMonth = subMonths(currentRange.startDate, 1);
      newStartDate = startOfMonth(prevMonth);
      newEndDate = endOfMonth(prevMonth);
      setSelectedDate(prevMonth);
      break;
    }
    case "This Year": {
      const prevYear = subYears(currentRange.startDate, 1);
      newStartDate = startOfYear(prevYear);
      newEndDate = endOfYear(prevYear);
      setSelectedDate(prevYear);
      break;
    }
    case "Custom": {
      // For back: new range ends one day before old range starts
      const newEnd = startOfDay(subDays(currentRange.startDate, 1));
      const newStart = startOfDay(subDays(newEnd, durationDays));
      
      newStartDate = newStart;
      newEndDate = endOfDay(newEnd);
      
      setSelectedDate(newStartDate);
      setCustomStartDate(newStartDate);
      setCustomEndDate(newEndDate);
      break;
    }
    default: {
      const pd = subDays(currentRange.startDate, 1);
      newStartDate = startOfDay(pd);
      newEndDate = endOfDay(pd);
      setSelectedDate(pd);
      break;
    }
  }
  
  setDateRangeState([{ startDate: newStartDate, endDate: newEndDate, key: "selection" }]);
  fetchTickets(newStartDate, newEndDate);
};

const handleForwardClick = () => {
  if (isNextDisabled()) return;
  
  let newStartDate, newEndDate;
  const currentRange = dateRangeState[0];
  const today = new Date();
  
  // Calculate duration - for same day, duration should be 0
  let durationDays = Math.round((currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24));
  // Fix: if start and end are the same date (ignoring time), duration is 0
  if (currentRange.startDate.toDateString() === currentRange.endDate.toDateString()) {
    durationDays = 0;
  }
  
  switch (selectedDateRange) {
    case "Today":
    case "Yesterday": {
      const nextDay = addDays(currentRange.startDate, 1);
      newStartDate = startOfDay(nextDay);
      newEndDate = endOfDay(nextDay);
      setSelectedDate(nextDay);
      break;
    }
    case "This Week":
    case "Last Week": {
      const nextWeek = addWeeks(currentRange.startDate, 1);
      newStartDate = startOfWeek(nextWeek, { weekStartsOn: 1 });
      newEndDate = endOfWeek(nextWeek, { weekStartsOn: 1 });
      if (newEndDate > today) newEndDate = today;
      setSelectedDate(nextWeek);
      break;
    }
    case "This Month":
    case "Last Month": {
      const nextMonth = addMonths(currentRange.startDate, 1);
      newStartDate = startOfMonth(nextMonth);
      newEndDate = endOfMonth(nextMonth);
      if (newEndDate > today) newEndDate = today;
      setSelectedDate(nextMonth);
      break;
    }
    case "This Year": {
      const nextYear = addYears(currentRange.startDate, 1);
      newStartDate = startOfYear(nextYear);
      newEndDate = endOfYear(nextYear);
      if (newEndDate > today) newEndDate = today;
      setSelectedDate(nextYear);
      break;
    }
    case "Custom": {
      // For forward: new range starts one day after old range ends
      const newStart = startOfDay(addDays(currentRange.endDate, 1));
      const newEnd = endOfDay(addDays(newStart, durationDays));
      
      newStartDate = newStart;
      newEndDate = newEnd;
      
      // Don't go past today
      if (newEndDate > today) {
        newEndDate = endOfDay(today);
        newStartDate = startOfDay(subDays(today, durationDays));
      }
      
      setSelectedDate(newStartDate);
      setCustomStartDate(newStartDate);
      setCustomEndDate(newEndDate);
      break;
    }
    default: {
      const nd = addDays(currentRange.startDate, 1);
      newStartDate = startOfDay(nd);
      newEndDate = endOfDay(nd);
      setSelectedDate(nd);
      break;
    }
  }
  
  setDateRangeState([{ startDate: newStartDate, endDate: newEndDate, key: "selection" }]);
  fetchTickets(newStartDate, newEndDate);
};

  const handleBusFilterChange = (busId) => { setSelectedBusFilter(busId); setShowBusDropdown(false); };
  const handleRouteFilterChange = (routeName, routeId, majorRouteId) => {
    setSelectedRouteFilter(routeName);
    setSelectedRouteId(majorRouteId || routeId);
    setShowRouteDropdown(false);
    setSelectedTripFilter("all");
  };
  const handleTripFilterChange = (tripNumber) => { setSelectedTripFilter(tripNumber); setShowTripDropdown(false); };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
  const currentItems = filteredReceipts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const getPageNums = () => {
    const max = 5, start = Math.max(1, currentPage - 2), end = Math.min(totalPages, start + max - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const baseCurrencyCode = baseCurrency?.code || "Base";
  const baseCurrencySymbol = baseCurrency?.symbol || "$";

  const exportToCSV = () => {
    setExportLoading(true);
    try {
      const headers = `Date,Ticket #,Trip #,Bus,Conductor,Customer,Phone,From,To,Passengers,Currency,Amount,Amount (${baseCurrencyCode}),Status\n`;
      const rows = filteredReceipts.map((r) =>
        `"${formatDate(r.timestamp)}","${r.ticketNumber}","${r.tripNumber}","${r.busName}","${r.conductorName}","${r.customerName}","${r.customerPhone}","${r.from}","${r.to}",${r.passengerCount},"${r.currencyCode}",${Number(r.amountPaid).toFixed(2)},${Number(r.amountPaidBaseCurrency).toFixed(2)},"${r.refundedStatus === "refunded" ? "REFUNDED" : "ACTIVE"}"`
      ).join("\n");

      const currencySection = salesByCurrency.length
        ? `\n\nSALES BY CURRENCY\nCode,Name,Tickets,Total (Original),Total (${baseCurrencyCode})\n` +
          salesByCurrency.map((c) =>
            `"${c.currencyCode}","${c.currencyName}",${c.ticketCount},${c.totalSales.toFixed(2)},${c.totalSalesBaseCurrency.toFixed(2)}`
          ).join("\n")
        : "";

      const summarySection =
        `\n\nSUMMARY\nTotal Tickets,${filteredTotals.totalCount}\nTotal Revenue (${baseCurrencyCode}),${filteredTotals.totalRevenueBaseCurrency.toFixed(2)}`;

      const blob = new Blob([headers + rows + currencySection + summarySection], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const { startDate, endDate } = dateRangeState[0];
      a.href = url;
      a.download = `receipts-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setExportLoading(false); }
  };

  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const printWindow = window.open("", "_blank");
      const { startDate, endDate } = dateRangeState[0];

      const printContent = `<!DOCTYPE html><html><head><title>Tickets Report</title>
        <style>
          body{font-family:Arial,sans-serif;margin:20px}
          h1{color:#1a5b7b;text-align:center}
          h2{color:#1a5b7b;margin-top:30px}
          table{width:100%;border-collapse:collapse;margin-top:20px}
          th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
          th{background-color:#1a5b7b;color:white}
          tr:nth-child(even){background-color:#f2f2f2}
          .summary{margin-bottom:20px;padding:15px;background-color:#f8f9fa;border-radius:5px}
          .total-row{font-weight:bold;background-color:#e9ecef}
          .refunded{background-color:#f8d7da;color:#721c24}
        </style></head><body>
        <h1>Tickets Report - ${user?.company_name || "Company"}</h1>
        <div class="summary">
          <p><strong>Period:</strong> ${formatDateDisplay()}</p>
          <p><strong>Total Tickets:</strong> ${filteredTotals.totalCount}</p>
          <p><strong>Total Revenue (${baseCurrencyCode}):</strong> ${formatCurrency(filteredTotals.totalRevenueBaseCurrency, baseCurrencySymbol)}</p>
          ${selectedBusFilter !== "all" ? `<p><strong>Bus Filter:</strong> ${buses.find((b) => String(b.id) === String(selectedBusFilter))?.name || selectedBusFilter}</p>` : ""}
          ${selectedRouteFilter !== "all" ? `<p><strong>Route Filter:</strong> ${selectedRouteFilter}</p>` : ""}
          ${selectedTripFilter !== "all" ? `<p><strong>Trip Filter:</strong> Trip #${selectedTripFilter}</p>` : ""}
        </div>
        <h2>Receipts</h2>
        <table><thead><tr>
          <th>Date</th><th>Ticket #</th><th>Trip #</th><th>Bus</th><th>Customer</th>
          <th>Phone</th><th>From → To</th><th>Pax</th><th>Currency</th><th>Amount</th><th>Amount (${baseCurrencyCode})</th><th>Status</th>
        </tr></thead><tbody>
        ${filteredReceipts.map((r) => `<tr class="${r.refundedStatus === "refunded" ? "refunded" : ""}">
            <td>${formatDate(r.timestamp)}</td>
            <td>${r.ticketNumber}</td>
            <td>${r.tripNumber}</td>
            <td>${r.busName}</td>
            <td>${r.customerName}</td>
            <td>${r.customerPhone}</td>
            <td>${r.from} → ${r.to}</td>
            <td>${r.passengerCount}</td>
            <td>${r.currencyCode}</td>
            <td>${Number(r.amountPaid).toFixed(2)}</td>
            <td>${Number(r.amountPaidBaseCurrency).toFixed(2)}</td>
            <td>${r.refundedStatus === "refunded" ? "REFUNDED" : "ACTIVE"}</td>
            </tr>`).join("")}
        ${filteredReceipts.length > 0 ? `<tr class="total-row">
          <td colspan="9"><strong>TOTAL</strong></td>
          <td></td>
          <td><strong>${baseCurrencySymbol}${filteredTotals.totalRevenueBaseCurrency.toFixed(2)} (${baseCurrencyCode})</strong></td>
          <td><strong>${filteredTotals.totalCount} receipts</strong></td>
          </tr>` : ""}
        </tbody></table>
        ${salesByCurrency.length > 0 ? `
          <h2>Sales Breakdown by Currency</h2>
          <table><thead><tr><th>Currency Code</th><th>Currency Name</th><th>Tickets</th><th>Total Sales (Original)</th><th>Total Sales (${baseCurrencyCode})</th></tr></thead>
          <tbody>${salesByCurrency.map((c) => `<tr>
            <td>${c.currencyCode}</td>
            <td>${c.currencyName}</td>
            <td>${c.ticketCount}</td>
            <td>${c.currencySymbol}${c.totalSales.toFixed(2)}</td>
            <td>${baseCurrencySymbol}${c.totalSalesBaseCurrency.toFixed(2)}</td>
            </tr>`).join("")}
          <tr class="total-row">
            <td colspan="3"><strong>GRAND TOTAL</strong></td>
            <td></td>
            <td><strong>${baseCurrencySymbol}${filteredTotals.totalRevenueBaseCurrency.toFixed(2)}</strong></td>
          </tr>
          </tbody></table>
        ` : ""}
        <p style="margin-top:20px;text-align:center;color:#666">Generated on ${format(new Date(), "yyyy-MM-dd HH:mm")}</p>
        </body></html>`;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    } catch (e) { console.error(e); } finally { setExportLoading(false); }
  };

  // ── Sub-components ───────────────────────────────────────────────────────────
  const CircularMetricCard = ({ value, subtitle, iconClass, colors }) => (
    <div className="circular-metric-card">
      <div className="circular-metric-content">
        <div className="circular-metric-icon" style={{ backgroundColor: colors[0] }}>
          <span className={`professional-icon ${iconClass}`}></span>
        </div>
        <div className="circular-metric-text">
          <div className="circular-metric-value">{value}</div>
          <div className="circular-metric-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  );

  const ReceiptListItem = ({ receipt }) => (
    <div
      className={`receipts-list-item ${receipt.refundedStatus === "refunded" ? "receipts-list-item-refunded" : ""}`}
      onClick={() => setSelectedReceipt(receipt)}
    >
      <div className="receipts-item-content">
        <div className="receipts-item-header">
          <div className="receipts-item-icon">
            <span className="professional-icon icon-receipt"></span>
          </div>
          <div className="receipts-item-info">
            <div className="receipts-item-title">Ticket #{receipt.ticketNumber || "N/A"}</div>
            <div className="receipts-item-detail">Customer: {receipt.customerName || "Unknown"}</div>
            <div className="receipts-item-route">{receipt.from} → {receipt.to}</div>
            <div className="receipts-item-meta">{receipt.passengerCount} {receipt.passengerType}</div>
          </div>
          <div className="receipts-item-amount-column">
            {/* Original charge in its own currency */}
            <div className={`receipts-item-amount ${receipt.refundedStatus === "refunded" ? "receipts-amount-refunded" : ""}`}>
              {formatCurrency(Number(receipt.amountPaid), receipt.currencySymbol)}
            </div>
            {/* Base-currency equivalent — only show if different currency */}
            {receipt.currencyCode !== baseCurrencyCode && (
              <div className="receipts-item-base-amount">
                ≈ {formatCurrency(Number(receipt.amountPaidBaseCurrency), baseCurrencySymbol)} {baseCurrencyCode}
              </div>
            )}
          </div>
        </div>
        <div className="receipts-item-stats">
          <div className="receipts-item-stat">
            <span className="professional-icon icon-bus"></span>
            {receipt.busName}
          </div>
          <div className="receipts-item-stat">
            <span className="professional-icon icon-clock"></span>
            {formatListDate(receipt.timestamp)}
          </div>
        </div>
        <div className="receipts-currency-badge">
          <span className="professional-icon icon-dollar"></span>
          {receipt.currencyCode || "USD"}
        </div>
        {receipt.refundedStatus === "refunded" && (
          <div className="receipts-refunded-badge">REFUNDED</div>
        )}
      </div>
    </div>
  );

  const ReceiptDetailModal = () => {
    if (!selectedReceipt) return null;
    const r = selectedReceipt;
    return (
      <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
        <div className="modal-container receipts-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Ticket #{r.ticketNumber}</h3>
            <button className="close-button" onClick={() => setSelectedReceipt(null)}>×</button>
          </div>
          <div className="modal-content">
            {[
              ["Customer", r.customerName],
              ["Phone", r.customerPhone || "—"],
              ["Bus", r.busName],
              ["Trip #", r.tripNumber],
              ["Conductor", r.conductorName || "—"],
              ["Route", r.routeName || "—"],
              ["From → To", `${r.from} → ${r.to}`],
              ["Passengers", `${r.passengerCount} ${r.passengerType}`],
              ["Fare / Person", formatCurrency(r.farePerPerson, r.currencySymbol)],
              ["Discount", r.discount > 0 ? formatCurrency(r.discount, r.currencySymbol) : "None"],
              ["Total Paid", formatCurrency(r.amountPaid, r.currencySymbol)],
              [`Total Paid (${baseCurrencyCode})`, formatCurrency(r.amountPaidBaseCurrency, baseCurrencySymbol)],
              ["Exchange Rate", `1 ${baseCurrencyCode} = ${r.exchangeRate} ${r.currencyCode}`],
              ["Currency", `${r.currencyCode} — ${r.currencyName}`],
              ["Date & Time", formatDate(r.timestamp)],
            ].map(([label, value]) => (
              <div key={label} className="receipts-modal-row">
                <span className="receipts-modal-label">{label}</span>
                <span className="receipts-modal-val">{value}</span>
              </div>
            ))}
            <div className="receipts-modal-row">
              <span className="receipts-modal-label">Status</span>
              <span className={`receipts-modal-val ${r.refundedStatus === "refunded" ? "receipts-status-refunded" : "receipts-status-active"}`}>
                {r.refundedStatus === "refunded" ? "REFUNDED" : "ACTIVE"}
              </span>
            </div>
          </div>
          <div className="receipts-modal-footer">
            <button className="apply-button" onClick={() => setSelectedReceipt(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  const isBusSelected = selectedBusFilter !== "all";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Tickets"
        subtitle="Filter, view and export ticket receipts"
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
        <div className="dashboard-container">
          <div className="dashboard-content">

            {/* ── Control bar ── */}
            <div className="control-bar">
              <div className="control-group">
                {/* Date navigation */}
                <div className="date-controls">
                  <div className="date-navigation">
                    <button className="date-nav-button" onClick={handleBackClick}>‹</button>
                    <button className="date-display" onClick={() => setShowDateModal(true)}>
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
                    >›</button>
                  </div>
                </div>

                {/* Bus filter */}
                <div className="bus-selector-wrapper">
                  <div className="bus-selector" onClick={() => { setShowBusDropdown(!showBusDropdown); setShowRouteDropdown(false); setShowTripDropdown(false); }}>
                    <span className="bus-selector-text">
                      {selectedBusFilter === "all" ? "All Buses" : buses.find((b) => String(b.id) === String(selectedBusFilter))?.name || "All Buses"}
                    </span>
                    <span className="dropdown-arrow"><span className="professional-icon icon-arrow-down"></span></span>
                  </div>
                  {showBusDropdown && (
                    <div className="bus-dropdown">
                      <div className="bus-dropdown-item" onClick={() => handleBusFilterChange("all")}>All Buses</div>
                      {buses.map((b) => (
                        <div key={b.id} className="bus-dropdown-item" onClick={() => handleBusFilterChange(b.id)}>
                          {b.name} ({b.plate})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Route filter */}
                <div className="bus-selector-wrapper">
                  <div
                    className={`bus-selector ${!isBusSelected ? "disabled-selector" : ""}`}
                    onClick={() => { if (!isBusSelected) return; setShowRouteDropdown(!showRouteDropdown); setShowBusDropdown(false); setShowTripDropdown(false); }}
                  >
                    <span className="bus-selector-text">
                      {!isBusSelected ? "Select Bus First" : loadingRoutes ? "Loading routes..." : selectedRouteFilter === "all" ? "All Routes" : selectedRouteFilter}
                    </span>
                    <span className="dropdown-arrow"><span className="professional-icon icon-arrow-down"></span></span>
                  </div>
                  {showRouteDropdown && isBusSelected && (
                    <div className="bus-dropdown">
                      <div className="bus-dropdown-item" onClick={() => handleRouteFilterChange("all", null, null)}>All Routes</div>
                      {routes.map((r) => (
                        <div key={r.id} className="bus-dropdown-item" onClick={() => handleRouteFilterChange(r.name, r.id, r.majorRouteId)}>
                          {r.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trip filter */}
                <div className="bus-selector-wrapper">
                  <div
                    className={`bus-selector ${!isBusSelected ? "disabled-selector" : ""}`}
                    onClick={() => { if (!isBusSelected) return; setShowTripDropdown(!showTripDropdown); setShowBusDropdown(false); setShowRouteDropdown(false); }}
                  >
                    <span className="bus-selector-text">
                      {!isBusSelected ? "Select Bus First" : loadingTrips ? "Loading trips..." : selectedTripFilter === "all" ? "All Trips" : `Trip #${selectedTripFilter}`}
                    </span>
                    <span className="dropdown-arrow"><span className="professional-icon icon-arrow-down"></span></span>
                  </div>
                  {showTripDropdown && isBusSelected && (
                    <div className="bus-dropdown">
                      <div className="bus-dropdown-item" onClick={() => handleTripFilterChange("all")}>All Trips</div>
                      {trips.map((t) => (
                        <div key={t.id} className="bus-dropdown-item" onClick={() => handleTripFilterChange(t.tripNumber)}>
                          Trip #{t.tripNumber} {t.routeName ? `- ${t.routeName}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="export-controls">
                <button className="export-button csv-button" onClick={exportToCSV} disabled={exportLoading}>
                  <span className="professional-icon icon-download"></span>
                  {exportLoading ? "Exporting..." : "Export CSV"}
                </button>
                <button className="export-button pdf-button" onClick={exportToPDF} disabled={exportLoading}>
                  <span className="professional-icon icon-file-pdf"></span>
                  {exportLoading ? "Exporting..." : "Export PDF"}
                </button>
              </div>
            </div>

            {/* ── Summary cards ── */}
            <div className="dashboard-layout">
              <div className="dashboard-card1">
                <h2 className="section-title">Tickets Summary</h2>
               <div className="circular-metrics-container">
  <div className="metric-column">
    <div className="metric-title">Total Tickets</div>
    <CircularMetricCard
      value={filteredTotals.totalCount.toLocaleString()}
      subtitle={`${filteredTotals.activeCount} active • ${filteredTotals.refundedCount} refunded`}
      iconClass="icon-ticket"
      colors={["#0798ff", "#1427fd"]}
    />
  </div>

  <div className="metric-column">
    <div className="metric-title">Total Revenue ({baseCurrencyCode})</div>
    <CircularMetricCard
      value={formatCurrency(filteredTotals.totalRevenueBaseCurrency, baseCurrencySymbol)}
      subtitle="From active tickets only"
      iconClass="icon-cash"
      colors={["#28a745", "#20c997"]}
    />
  </div>

                  <div className="metric-column">
                    <div className="metric-title">Currencies</div>
                    <CircularMetricCard
                      value={salesByCurrency.length.toString()}
                      subtitle="Payment currencies"
                      iconClass="icon-dollar"
                      colors={["#17a2b8", "#6f42c1"]}
                    />
                  </div>

                  <div className="metric-column">
                    <div className="metric-title">Filtered</div>
                    <CircularMetricCard
                      value={filteredReceipts.length.toLocaleString()}
                      subtitle="Results shown"
                      iconClass="icon-filter"
                      colors={["#fd7e14", "#e83e8c"]}
                    />
                  </div>
                </div>
              </div>

              {/* Per-currency breakdown — original amounts meaningful here */}
              {salesByCurrency.length > 0 && (
                <div className="dashboard-card">
                  <h2 className="section-title">Sales by Currency</h2>
                  <div className="busdashboad-list-container">
                    <table className="daily-sales-table">
                      <thead>
                        <tr>
                          <th>Currency</th>
                          <th>Code</th>
                          <th>Tickets</th>
                          <th>Total (Original)</th>
                          <th>Total ({baseCurrencyCode})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesByCurrency.map((c) => (
                          <tr key={c.currencyCode}>
                            <td>{c.currencyName}</td>
                            <td><strong>{c.currencyCode}</strong></td>
                            <td>{c.ticketCount}</td>
                            <td>{formatCurrency(c.totalSales, c.currencySymbol)}</td>
                            <td>{formatCurrency(c.totalSalesBaseCurrency, baseCurrencySymbol)}</td>
                          </tr>
                        ))}
                        {/* Grand total row in base currency */}
                        <tr className="receipts-total-row">
                          <td colSpan="3"><strong>TOTAL</strong></td>
                          <td>—</td>
                          <td>
                            <strong>
                              {formatCurrency(filteredTotals.totalRevenueBaseCurrency, baseCurrencySymbol)}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── Main receipts table ── */}
            <div className="receipts-body-layout">
              <div className="dashboard-card daily-sales-card receipts-table-card">
                <div className="section-header">
                  <h2 className="section-title">All Receipts Data</h2>
                </div>

                <div className="rct-search-wrap" style={{ marginBottom: "20px" }}>
                  <span className="professional-icon icon-search rct-search-icon"></span>
                  <input
                    className="rct-search"
                    placeholder="Search customer, phone, ticket, route…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="receipts-search-clear" onClick={() => setSearchQuery("")}>×</button>
                  )}
                </div>

                <div className="daily-sales-table-container">
                  <table className="daily-sales-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ticket #</th>
                        <th>Trip #</th>
                        <th>Bus</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>From → To</th>
                        <th>Pax</th>
                        <th>Currency</th>
                        <th>Amount</th>
                        <th>Amount ({baseCurrencyCode})</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="12" style={{ textAlign: "center", padding: "40px" }}>
                            Loading receipts...
                          </td>
                        </tr>
                      ) : currentItems.length > 0 ? (
                        currentItems.map((r) => (
                          <tr
                            key={r.id}
                            className={r.refundedStatus === "refunded" ? "receipts-table-refunded" : ""}
                            onClick={() => setSelectedReceipt(r)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{formatDate(r.timestamp)}</td>
                            <td>{r.ticketNumber}</td>
                            <td>{r.tripNumber}</td>
                            <td>{r.busName}</td>
                            <td>{r.customerName}</td>
                            <td>{r.customerPhone}</td>
                            <td>{r.from} → {r.to}</td>
                            <td>{r.passengerCount}</td>
                            <td>{r.currencyCode}</td>
                            <td>{r.currencySymbol}{Number(r.amountPaid).toFixed(2)}</td>
                            <td>{baseCurrencySymbol}{Number(r.amountPaidBaseCurrency).toFixed(2)}</td>
                            <td>
                              <span className={`receipts-status-badge ${r.refundedStatus === "refunded" ? "receipts-status-refunded" : "receipts-status-active"}`}>
                                {r.refundedStatus === "refunded" ? "REFUNDED" : "ACTIVE"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="12" className="no-data">
                            No receipt data available for the selected period
                          </td>
                        </tr>
                      )}

                      {/* Total row: only base-currency total is shown as a single figure */}
                      {filteredReceipts.length > 0 && (
                        <tr className="receipts-total-row">
                          <td colSpan="9"><strong>TOTAL ({filteredTotals.totalCount} receipts)</strong></td>
                          <td>—</td>
                          <td>
                            <strong>
                              {baseCurrencySymbol}{filteredTotals.totalRevenueBaseCurrency.toFixed(2)}
                            </strong>
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredReceipts.length > ITEMS_PER_PAGE && (
                  <div className="receipts-pagination">
                    <button className="date-nav-button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
                    {getPageNums().map((p) => (
                      <button
                        key={p}
                        className={`date-nav-button ${currentPage === p ? "receipts-page-active" : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >{p}</button>
                    ))}
                    <button className="date-nav-button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <DateRangeModal
          visible={showDateModal}
          onClose={() => setShowDateModal(false)}
          selectedDateRange={selectedDateRange}
          onDateRangeSelect={handleDateRangeSelect}
          dateRangeState={dateRangeState}
          onDateRangeStateChange={setDateRangeState}
          customStaticRanges={customStaticRanges}
          onCustomPeriodClick={() => { setShowDateModal(false); setShowCustomRangeModal(true); }}
        />

        <CustomRangeModal
          visible={showCustomRangeModal}
          onClose={() => setShowCustomRangeModal(false)}
          onApply={(startDateTime, endDateTime, startTime, endTime) => {
            setCustomStartDate(startDateTime); setCustomEndDate(endDateTime);
            setCustomStartTime(startTime); setCustomEndTime(endTime);
            setSelectedDateRange("Custom"); setSelectedDate(startDateTime);
            setDateRangeState([{ startDate: startDateTime, endDate: endDateTime, key: "selection" }]);
            setShowCustomRangeModal(false);
            fetchTickets(startDateTime, endDateTime);
          }}
          initialStartDate={customStartDate}
          initialEndDate={customEndDate}
          initialStartTime={customStartTime}
          initialEndTime={customEndTime}
        />

        {selectedReceipt && <ReceiptDetailModal />}
      </div>
    </div>
  );
};

export default ReceiptsScreen;