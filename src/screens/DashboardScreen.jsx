import React, { useState, useRef, useEffect, useCallback } from "react";
import "../css/DashboardScreen.css";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import { DateRangePicker, defaultStaticRanges } from "react-date-range";
import DateRangeModal from "../components/DateRangeModal";
import CustomRangeModal from "../components/CustomRangeModal";
import {
  startOfToday, endOfToday, startOfYesterday, endOfYesterday,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, addDays, subWeeks, addWeeks,
  subMonths, addMonths, subYears, addYears, format, parseISO, isToday,
} from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useAuth } from "../context/AuthContext";
import { useDateRange } from "../context/DateRangeContext";
import Apilink from "../baseUrl/baseUrl";
import { useNavigate } from "react-router-dom";

const DashboardScreen = () => {
  const authContext = useAuth();
  const { user } = authContext;
  const navigate = useNavigate();

  // Use shared date range context
  const {
    selectedDateRange, setSelectedDateRange,
    dateRangeState, setDateRangeState,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    customStartTime, setCustomStartTime,
    customEndTime, setCustomEndTime,
    selectedDate, setSelectedDate,
  } = useDateRange();

  const [allBuses, setAllBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showBusDropdown, setShowBusDropdown] = useState(false);
  const [buses, setBuses] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0, totalPassengers: 0, totalTrips: 0,
    busPerformance: [], dailySales: [],
  });
  const [showDateModal, setShowDateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const customStaticRanges = [
    ...defaultStaticRanges,
    {
      label: "This Year",
      range: () => ({ startDate: startOfYear(new Date()), endDate: endOfYear(new Date()) }),
      isSelected: () => selectedDateRange === "This Year",
    },
  ];

  // Load data on mount using persisted date range from context
  useEffect(() => {
    fetchAllBuses();
    const { startDate, endDate } = dateRangeState[0];
    fetchDashboardData(startDate, endDate);
  }, []);

  const fetchAllBuses = async () => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();
      if (!token) { setAllBuses([]); return; }
      let response = await fetch(`${apiLink}/buses`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.buses) {
        const transformedBuses = data.buses.map(bus => ({
          id: bus.id, name: bus.busname || "Unknown Bus",
          plate: bus.numberplate || "N/A", route: bus.route || "No route assigned",
          totalSales: 0, totalPassengers: 0, trips: 0,
          conductor: bus.conductorname || "Not assigned"
        }));
        setAllBuses(transformedBuses);
      } else {
        setAllBuses([]);
      }
    } catch (error) {
      console.error("Error fetching all buses:", error);
      setAllBuses([]);
    }
  };

  const fetchDashboardData = async (startDate, endDate) => {
    try {
      setLoading(true);
      const token = user?.token;
      const apiLink = Apilink.getLink();
      if (!token) { setDashboardData(getDefaultDashboardData()); setBuses([]); return; }
      const requestBody = {
        start_date: startDate?.toISOString() || new Date().toISOString(),
        end_date: endDate?.toISOString() || new Date().toISOString(),
      };
      let response = await fetch(`${apiLink}/dashboardsummary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const dashData = await response.json();
      if (dashData?.baseCurrency) { setBaseCurrency(dashData.baseCurrency); } else { setBaseCurrency("USD"); }
      const busesFromApi = dashData?.generalPerfomance || [];
      let tripsData = [];
      try { tripsData = await fetchTripsData(startDate, endDate, busesFromApi); } catch (e) { tripsData = []; }
      const transformedData = {
        totalSales: dashData?.amountPaidSum || 0,
        totalPassengers: dashData?.totalTickets || 0,
        totalTrips: dashData?.completedTrips || 0,
        busPerformance: transformBusPerformance(busesFromApi, tripsData),
        dailySales: transformDailySales(dashData?.dailySales || [], startDate, endDate),
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

  const getDefaultDashboardData = () => ({
    totalSales: 0, totalPassengers: 0, totalTrips: 0, busPerformance: [], dailySales: [],
  });

  const fetchTripsData = async (startDate, endDate, buses) => {
    try {
      const token = user?.token;
      const apiLink = Apilink.getLink();
      if (!token || !buses || !Array.isArray(buses) || buses.length === 0) return [];
      let allTrips = [];
      for (const bus of buses) {
        try {
          const requestBody = {
            start_date: startDate?.toISOString() || new Date().toISOString(),
            end_date: endDate?.toISOString() || new Date().toISOString(),
            busId: bus?.busId || bus?.id,
          };
          if (!requestBody.busId) continue;
          let response = await fetch(`${apiLink}/bussummary`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(requestBody),
          });
          if (!response.ok) continue;
          const data = await response.json();
          if (data.trips && Array.isArray(data.trips)) {
            const transformedTrips = data.trips.map((trip) => ({
              tripId: trip.id,
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
        } catch (busError) { continue; }
      }
      return allTrips;
    } catch (error) { return []; }
  };

  const transformBusPerformance = (apiBusData, tripsData = []) => {
    if (!apiBusData || !Array.isArray(apiBusData)) return [];
    return apiBusData.map((bus) => {
      const busId = bus?.busId?.toString() || bus?.id?.toString() || 'unknown';
      const busTrips = tripsData.filter((trip) => trip.busId === busId).length;
      return {
        id: busId, name: bus?.busName || bus?.busname || "Unknown Bus",
        plate: bus?.numberplate || "Unknown Plate", route: "Multiple Routes",
        totalSales: Number(bus?.totalRevenue) || 0,
        totalPassengers: Number(bus?.ticketsSold) || 0,
        conductor: "Not Assigned", trips: busTrips,
      };
    });
  };

  const transformDailySales = (dailySales, startDate, endDate) => {
    if (!dailySales || !Array.isArray(dailySales)) return [];
    return dailySales.map((day) => ({
      date: day?.date || '', busName: day?.busName || "All Buses",
      passengers: Number(day?.passengers) || 0, trips: Number(day?.trips) || 0,
      totalSales: Number(day?.totalSales) || 0,
    }));
  };

  const calculateDateRange = (range, baseDate = new Date()) => {
    let startDate, endDate;
    switch (range) {
      case "Today": startDate = startOfToday(); endDate = endOfToday(); break;
      case "Yesterday": startDate = startOfYesterday(); endDate = endOfYesterday(); break;
      case "This Week": startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); endDate = endOfWeek(baseDate, { weekStartsOn: 1 }); break;
      case "Last Week": const lw = subWeeks(baseDate, 1); startDate = startOfWeek(lw, { weekStartsOn: 1 }); endDate = endOfWeek(lw, { weekStartsOn: 1 }); break;
      case "This Month": startDate = startOfMonth(baseDate); endDate = endOfMonth(baseDate); break;
      case "Last Month": const lm = subMonths(baseDate, 1); startDate = startOfMonth(lm); endDate = endOfMonth(lm); break;
      case "This Year": startDate = startOfYear(baseDate); endDate = endOfYear(baseDate); break;
      default: startDate = startOfToday(); endDate = endOfToday();
    }
    return { startDate, endDate };
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
      fetchDashboardData(startDateTime, endDateTime);
    } else if (range !== "Custom") {
      setSelectedDateRange(range); setShowDateModal(false);
      let startDate, endDate, newSelectedDate = new Date();
      switch (range) {
        case "Today": startDate = startOfToday(); endDate = endOfToday(); break;
        case "Yesterday": startDate = startOfYesterday(); endDate = endOfYesterday(); newSelectedDate = subDays(new Date(), 1); break;
        case "This Week": startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); endDate = endOfWeek(new Date(), { weekStartsOn: 1 }); break;
        case "Last Week": const lw = subWeeks(new Date(), 1); startDate = startOfWeek(lw, { weekStartsOn: 1 }); endDate = endOfWeek(lw, { weekStartsOn: 1 }); newSelectedDate = lw; break;
        case "This Month": startDate = startOfMonth(new Date()); endDate = endOfMonth(new Date()); break;
        case "Last Month": const lm = subMonths(new Date(), 1); startDate = startOfMonth(lm); endDate = endOfMonth(lm); newSelectedDate = lm; break;
        case "This Year": startDate = startOfYear(new Date()); endDate = endOfYear(new Date()); break;
        default: startDate = startOfToday(); endDate = endOfToday();
      }
      setDateRangeState([{ startDate, endDate, key: "selection" }]);
      setSelectedDate(newSelectedDate);
      fetchDashboardData(startDate, endDate);
    } else {
      setShowDateModal(false); setShowCustomRangeModal(true);
    }
  };

  const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
  const endOfDay = (date) => { const d = new Date(date); d.setHours(23,59,59,999); return d; };
  const combineDateAndTime = (date, time) => {
    const [hours, minutes] = time.split(":");
    const d = new Date(date); d.setHours(parseInt(hours), parseInt(minutes), 0, 0); return d;
  };

  const handleBackClick = () => {
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];
    switch (selectedDateRange) {
      case "Today": case "Yesterday":
        const prevDay = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(prevDay); newEndDate = endOfDay(prevDay); setSelectedDate(prevDay); break;
      case "This Week": case "Last Week":
        const prevWeek = subWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(prevWeek, { weekStartsOn: 1 }); newEndDate = endOfWeek(prevWeek, { weekStartsOn: 1 }); setSelectedDate(prevWeek); break;
      case "This Month": case "Last Month":
        const prevMonth = subMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(prevMonth); newEndDate = endOfMonth(prevMonth); setSelectedDate(prevMonth); break;
      case "This Year":
        const prevYear = subYears(currentRange.startDate, 1);
        newStartDate = startOfYear(prevYear); newEndDate = endOfYear(prevYear); setSelectedDate(prevYear); break;
      case "Custom":
        const diff = Math.round((currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24));
        newStartDate = subDays(currentRange.startDate, diff + 1); newEndDate = subDays(currentRange.endDate, diff + 1);
        setSelectedDate(newStartDate); setCustomStartDate(newStartDate); setCustomEndDate(newEndDate); break;
      default:
        const pd = subDays(currentRange.startDate, 1);
        newStartDate = startOfDay(pd); newEndDate = endOfDay(pd); setSelectedDate(pd);
    }
    setDateRangeState([{ startDate: newStartDate, endDate: newEndDate, key: "selection" }]);
    fetchDashboardData(newStartDate, newEndDate);
  };

  const handleForwardClick = () => {
    if (isNextDisabled()) return;
    let newStartDate, newEndDate;
    const currentRange = dateRangeState[0];
    const today = new Date();
    switch (selectedDateRange) {
      case "Today": case "Yesterday":
        const nextDay = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(nextDay); newEndDate = endOfDay(nextDay); setSelectedDate(nextDay); break;
      case "This Week": case "Last Week":
        const nextWeek = addWeeks(currentRange.startDate, 1);
        newStartDate = startOfWeek(nextWeek, { weekStartsOn: 1 }); newEndDate = endOfWeek(nextWeek, { weekStartsOn: 1 });
        if (newEndDate > today) newEndDate = today; setSelectedDate(nextWeek); break;
      case "This Month": case "Last Month":
        const nextMonth = addMonths(currentRange.startDate, 1);
        newStartDate = startOfMonth(nextMonth); newEndDate = endOfMonth(nextMonth);
        if (newEndDate > today) newEndDate = today; setSelectedDate(nextMonth); break;
      case "This Year":
        const nextYear = addYears(currentRange.startDate, 1);
        newStartDate = startOfYear(nextYear); newEndDate = endOfYear(nextYear);
        if (newEndDate > today) newEndDate = today; setSelectedDate(nextYear); break;
      case "Custom":
        const diff = Math.round((currentRange.endDate - currentRange.startDate) / (1000 * 60 * 60 * 24));
        newStartDate = addDays(currentRange.startDate, diff + 1); newEndDate = addDays(currentRange.endDate, diff + 1);
        if (newEndDate > today) { newEndDate = today; newStartDate = subDays(today, diff); }
        setSelectedDate(newStartDate); setCustomStartDate(newStartDate); setCustomEndDate(newEndDate); break;
      default:
        const nd = addDays(currentRange.startDate, 1);
        newStartDate = startOfDay(nd); newEndDate = endOfDay(nd); setSelectedDate(nd);
    }
    setDateRangeState([{ startDate: newStartDate, endDate: newEndDate, key: "selection" }]);
    fetchDashboardData(newStartDate, newEndDate);
  };

  const isNextDisabled = () => {
    const { endDate } = dateRangeState[0];
    const today = new Date();
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") return isToday(endDate);
    return endDate >= endOfDay(today);
  };


  const formatDateDisplay = () => {
    const { startDate, endDate } = dateRangeState[0];
    if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") return format(startDate, "EEE, MMM dd, yyyy");
    if (selectedDateRange === "Custom") {
      const s = combineDateAndTime(customStartDate, customStartTime);
      const e = combineDateAndTime(customEndDate, customEndTime);
      return `${format(s, "MMM dd, yyyy HH:mm")} - ${format(e, "MMM dd, yyyy HH:mm")}`;
    }
    return `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  };

  const formatCurrency = (amount) => {
    const safeAmount = Number(amount) || 0;
    const symbol = baseCurrency?.symbol || "$";
    return `${symbol}${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToCSV = () => {
    setExportLoading(true);
    try {
      const headers = "Date,Bus Name,Passengers,Trips,Total Sales\n";
      const startDate = dateRangeState[0].startDate;
      const endDate = dateRangeState[0].endDate;
      let fileName;
      if (selectedDateRange === "Today" || selectedDateRange === "Yesterday") {
        fileName = `bus-sales-${format(startDate, 'yyyy-MM-dd')}.csv`;
      } else {
        fileName = `bus-sales-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
      }
      const csvData = dashboardData?.busPerformance.filter(bus => bus.totalSales > 0)
        .map(bus => `"${formatDateDisplay()}","${bus.name}",${bus.totalPassengers},${bus.trips},${bus.totalSales}`).join('\n');
      const blob = new Blob([headers + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = fileName;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (error) { console.error('Error exporting to CSV:', error); }
    finally { setExportLoading(false); }
  };

  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const printWindow = window.open('', '_blank');
      const busesWithSales = dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0) || [];
      const startDate = dateRangeState[0].startDate;
      const endDate = dateRangeState[0].endDate;
      const dateRangeTitle = selectedDateRange === "Today" || selectedDateRange === "Yesterday"
        ? format(startDate, 'yyyy-MM-dd') : `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`;
      const printContent = `<!DOCTYPE html><html><head><title>Bus Sales Report - ${dateRangeTitle}</title>
        <style>body{font-family:Arial,sans-serif;margin:20px}h1{color:#1a5b7b;text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background-color:#1a5b7b;color:white}tr:nth-child(even){background-color:#f2f2f2}
        .summary{margin-bottom:20px;padding:15px;background-color:#f8f9fa;border-radius:5px}
        .total-row{font-weight:bold;background-color:#e9ecef}</style></head><body>
        <h1>Bus Sales Report - ${user?.company_name || 'Company'}</h1>
        <div class="summary"><p><strong>Period:</strong> ${formatDateDisplay()}</p>
        <p><strong>Total Sales:</strong> ${formatCurrency(dashboardData?.totalSales)}</p>
        <p><strong>Total Passengers:</strong> ${dashboardData?.totalPassengers}</p>
        <p><strong>Total Trips:</strong> ${dashboardData?.totalTrips}</p></div>
        <table><thead><tr><th>Date</th><th>Bus Name</th><th>Passengers</th><th>Trips</th><th>Total Sales</th></tr></thead>
        <tbody>${busesWithSales.map(bus => `<tr><td>${formatDateDisplay()}</td><td>${bus.name}</td>
        <td>${bus.totalPassengers}</td><td>${bus.trips}</td><td>${formatCurrency(bus.totalSales)}</td></tr>`).join('')}
        ${busesWithSales.length > 0 ? `<tr class="total-row"><td colspan="2"><strong>TOTAL</strong></td>
        <td><strong>${dashboardData?.totalPassengers}</strong></td><td><strong>${dashboardData?.totalTrips}</strong></td>
        <td><strong>${formatCurrency(dashboardData?.totalSales)}</strong></td></tr>` : ''}
        </tbody></table><p style="margin-top:20px;text-align:center;color:#666">Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
        </body></html>`;
      printWindow.document.write(printContent); printWindow.document.close(); printWindow.print();
    } catch (error) { console.error('Error exporting to PDF:', error); }
    finally { setExportLoading(false); }
  };

  const CircularMetricCard = ({ value, subtitle, iconClass, colors, onPress }) => (
    <div className="circular-metric-card" onClick={onPress}>
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

  const BusPerformanceItem = ({ bus }) => (
    <div className="bus-item" onClick={() => navigate('/bus-dashboard', { state: { bus } })}>
      <div className="bus-item-content">
        <div className="bus-item-header">
          <div className="bus-icon"><span className="professional-icon icon-bus"></span></div>
          <div className="bus-info">
            <div className="bus-name">{bus.name}</div>
            <div className="bus-plate">Plate: {bus.plate}</div>
          </div>
          <div className="bus-amount">{formatCurrency(bus.totalSales)}</div>
        </div>
        <div className="bus-stats">
          <div className="bus-stat"><span className="professional-icon icon-passengers"></span> {bus.totalPassengers} passengers</div>
          <div className="bus-stat"><span className="professional-icon icon-trips"></span> {bus.trips} trips</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar title="Overall Bus Sales Summary" subtitle="Bus Performance Overview"
        companyName={user?.company_name || "Company"} onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={loading || exportLoading} />
      <SideNav activeScreen={activeScreen} onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="dashboard-container">
          <div className="dashboard-content">
            <div className="control-bar">
              <div className="control-group">
                <div className="date-controls">
                  <div className="date-navigation">
                    <button className="date-nav-button" onClick={handleBackClick}>‹</button>
                    <button className="date-display" onClick={() => setShowDateModal(true)}>
                      {formatDateDisplay()}
                      <span className="calendar-icon"><span className="professional-icon icon-calendar"></span></span>
                    </button>
                    <button className="date-nav-button" onClick={handleForwardClick}
                      disabled={isNextDisabled()} style={{ opacity: isNextDisabled() ? 0.5 : 1 }}>›</button>
                  </div>
                </div>
                <div className="bus-selector-wrapper">
                  <div className="bus-selector" onClick={() => setShowBusDropdown(!showBusDropdown)}>
                    <span className="bus-selector-text">{selectedBus?.name || "All Buses"}</span>
                    <span className="dropdown-arrow"><span className="professional-icon icon-arrow-down"></span></span>
                  </div>
                  {showBusDropdown && (
                    <div className="bus-dropdown">
                      <div className="bus-dropdown-item" onClick={() => { setSelectedBus(null); setShowBusDropdown(false); }}>All Buses</div>
                      {allBuses.map((bus) => (
                        <div key={bus.id} className="bus-dropdown-item" onClick={() => { navigate('/bus-dashboard', { state: { bus } }); setShowBusDropdown(false); }}>
                          {bus.name} ({bus.plate})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="dashboard-layout">
              <div className="dashboard-card1">
                <h2 className="section-title">Sales Summary</h2>
                <div className="circular-metrics-container">
                  <div className="metric-column">
                    <div className="metric-title">Passengers</div>
                    <CircularMetricCard value={(dashboardData?.totalPassengers || 0).toLocaleString()} subtitle="Total carried" iconClass="icon-users" colors={["#17a2b8", "#6f42c1"]} />
                  </div>
                  <div className="metric-column">
                    <div className="metric-title">Total Sales</div>
                    <CircularMetricCard value={formatCurrency(dashboardData?.totalSales)} subtitle="All buses" iconClass="icon-dollar" colors={["#28a745", "#20c997"]} />
                  </div>
                  <div className="metric-column">
                    <div className="metric-title">Trips</div>
                    <CircularMetricCard value={(dashboardData?.totalTrips || 0).toString()} subtitle="Completed" iconClass="icon-route" colors={["#0798ff", "#1427fd"]} />
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="performance-section">
                  <div className="section-header">
                    <h2 className="section-title">{dashboardData?.busPerformance?.filter(b => b.totalSales > 0).length > 0 ? "Top Performing Buses" : "Bus Performance"}</h2>
                  </div>
                  <div className="busdashboad-list-container">
                    {dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0).length > 0 ? (
                      <div className="busdashboad-list">
                        {dashboardData.busPerformance.filter(b => b.totalSales > 0).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5)
                          .map((bus, index) => <BusPerformanceItem key={bus.id} bus={bus} index={index} />)}
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
                        <p className="no-buses-message">Performance metrics will appear here once sales are recorded.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card daily-sales-card">
              <div className="section-header">
                <h2 className="section-title">Bus Sales Data</h2>
                <div className="export-controls">
                  <button className="export-button csv-button" onClick={exportToCSV} disabled={exportLoading}>
                    <span className="professional-icon icon-download"></span>{exportLoading ? "Exporting..." : "Export CSV"}
                  </button>
                  <button className="export-button pdf-button" onClick={exportToPDF} disabled={exportLoading}>
                    <span className="professional-icon icon-file-pdf"></span>{exportLoading ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>
              <div className="daily-sales-table-container">
                <table className="daily-sales-table">
                  <thead>
                    <tr><th>Date</th><th>Bus Name</th><th>Passengers</th><th>Trips</th><th>Total Sales</th></tr>
                  </thead>
                  <tbody>
                    {dashboardData?.busPerformance?.filter(bus => bus.totalSales > 0).length > 0 ? (
                      dashboardData.busPerformance.filter(b => b.totalSales > 0).sort((a, b) => b.totalSales - a.totalSales)
                        .map((bus) => (
                          <tr key={bus.id}>
                            <td>{formatDateDisplay().split(' - ')[0]}</td>
                            <td>{bus.name}</td><td>{bus.totalPassengers}</td>
                            <td>{bus.trips}</td><td>{formatCurrency(bus.totalSales)}</td>
                          </tr>
                        ))
                    ) : (
                      <tr><td colSpan="5" className="no-data">No bus sales data available for the selected period</td></tr>
                    )}
                    {dashboardData?.busPerformance?.filter(b => b.totalSales > 0).length > 0 && (
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

        <DateRangeModal visible={showDateModal} onClose={() => setShowDateModal(false)}
          selectedDateRange={selectedDateRange} onDateRangeSelect={handleDateRangeSelect}
          dateRangeState={dateRangeState} onDateRangeStateChange={setDateRangeState}
          customStaticRanges={customStaticRanges}
          onCustomPeriodClick={() => { setShowDateModal(false); setShowCustomRangeModal(true); }} />

        <CustomRangeModal visible={showCustomRangeModal} onClose={() => setShowCustomRangeModal(false)}
          onApply={(startDateTime, endDateTime, startTime, endTime) => {
            setCustomStartDate(startDateTime); setCustomEndDate(endDateTime);
            setCustomStartTime(startTime); setCustomEndTime(endTime);
            setSelectedDateRange("Custom"); setSelectedDate(startDateTime);
            setDateRangeState([{ startDate: startDateTime, endDate: endDateTime, key: "selection" }]);
            setShowCustomRangeModal(false); fetchDashboardData(startDateTime, endDateTime);
          }}
          initialStartDate={customStartDate} initialEndDate={customEndDate}
          initialStartTime={customStartTime} initialEndTime={customEndTime} />
      </div>
    </div>
  );
};

export default DashboardScreen;