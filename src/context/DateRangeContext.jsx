// DateRangeContext.js - Fixed version
import React, { createContext, useContext, useState, useEffect } from "react";
import { startOfToday, endOfToday, parseISO } from "date-fns";

const DateRangeContext = createContext();

// Helper to load from localStorage
// Helper to load from localStorage
const loadFromStorage = () => {
  try {
    const savedRange = localStorage.getItem('dashboard_date_range');
    const savedStartDate = localStorage.getItem('dashboard_start_date');
    const savedEndDate = localStorage.getItem('dashboard_end_date');
    const savedStartTime = localStorage.getItem('dashboard_custom_start_time');
    const savedEndTime = localStorage.getItem('dashboard_custom_end_time');
    const savedRangeState = localStorage.getItem('dashboard_range_state');
    
    // Parse the date range state - convert ISO strings back to Date objects
    let parsedRangeState = [{ startDate: startOfToday(), endDate: endOfToday(), key: "selection" }];
    if (savedRangeState) {
      const parsed = JSON.parse(savedRangeState);
      parsedRangeState = parsed.map(item => ({
        ...item,
        startDate: item.startDate ? new Date(item.startDate) : startOfToday(),
        endDate: item.endDate ? new Date(item.endDate) : endOfToday(),
        key: item.key || "selection"
      }));
    }
    
    return {
      selectedDateRange: savedRange || "Today",
      selectedDate: savedStartDate ? new Date(savedStartDate) : new Date(),
      dateRangeState: parsedRangeState,
      customStartDate: savedStartDate ? new Date(savedStartDate) : new Date(),
      customEndDate: savedEndDate ? new Date(savedEndDate) : new Date(),
      customStartTime: savedStartTime || "00:00",
      customEndTime: savedEndTime || "23:59",
    };
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return {
      selectedDateRange: "Today",
      selectedDate: new Date(),
      dateRangeState: [{ startDate: startOfToday(), endDate: endOfToday(), key: "selection" }],
      customStartDate: new Date(),
      customEndDate: new Date(),
      customStartTime: "00:00",
      customEndTime: "23:59",
    };
  }
};

// Helper to save to localStorage
// Helper to save to localStorage
const saveToStorage = (range, rangeState, startDate, endDate, startTime, endTime) => {
  try {
    // Convert rangeState Date objects to ISO strings for storage
    const rangeStateToStore = rangeState.map(item => ({
      ...item,
      startDate: item.startDate?.toISOString ? item.startDate.toISOString() : item.startDate,
      endDate: item.endDate?.toISOString ? item.endDate.toISOString() : item.endDate,
    }));
    
    localStorage.setItem('dashboard_date_range', range);
    localStorage.setItem('dashboard_range_state', JSON.stringify(rangeStateToStore));
    localStorage.setItem('dashboard_start_date', startDate?.toISOString ? startDate.toISOString() : startDate);
    localStorage.setItem('dashboard_end_date', endDate?.toISOString ? endDate.toISOString() : endDate);
    localStorage.setItem('dashboard_custom_start_time', startTime);
    localStorage.setItem('dashboard_custom_end_time', endTime);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

export const DateRangeProvider = ({ children }) => {
  // Load initial state from localStorage
  const savedData = loadFromStorage();
  
  const [selectedDateRange, setSelectedDateRange] = useState(savedData.selectedDateRange);
  const [dateRangeState, setDateRangeState] = useState(savedData.dateRangeState);
  const [customStartDate, setCustomStartDate] = useState(savedData.customStartDate);
  const [customEndDate, setCustomEndDate] = useState(savedData.customEndDate);
  const [customStartTime, setCustomStartTime] = useState(savedData.customStartTime);
  const [customEndTime, setCustomEndTime] = useState(savedData.customEndTime);
  const [selectedDate, setSelectedDate] = useState(savedData.selectedDate);

  // Save to localStorage whenever values change
  useEffect(() => {
    saveToStorage(
      selectedDateRange, 
      dateRangeState, 
      dateRangeState[0]?.startDate || customStartDate,
      dateRangeState[0]?.endDate || customEndDate,
      customStartTime, 
      customEndTime
    );
  }, [selectedDateRange, dateRangeState, customStartDate, customEndDate, customStartTime, customEndTime]);

  const value = {
    selectedDateRange,
    setSelectedDateRange,
    dateRangeState,
    setDateRangeState,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    customStartTime,
    setCustomStartTime,
    customEndTime,
    setCustomEndTime,
    selectedDate,
    setSelectedDate,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
};