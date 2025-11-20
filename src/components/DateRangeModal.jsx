import React, { useState, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
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
  subWeeks,
  subMonths,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const DateRangeModal = ({
  visible = false,
  onClose,
  selectedDateRange,
  onDateRangeSelect,
  dateRangeState,
  onDateRangeStateChange,
  customStaticRanges = [],
  onCustomPeriodClick,
}) => {
  const [tempDateRange, setTempDateRange] = useState(dateRangeState);
  const dateRangePickerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTempDateRange(dateRangeState);
    }
  }, [visible, dateRangeState]);

  const handleStaticRangeSelect = (rangeLabel) => {
    let startDate, endDate;

    switch (rangeLabel) {
      case "Today":
        startDate = startOfToday();
        endDate = endOfToday();
        break;
      case "Yesterday":
        startDate = startOfYesterday();
        endDate = endOfYesterday();
        break;
      case "This Week":
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case "Last Week":
        const lastWeekDate = subWeeks(new Date(), 1);
        startDate = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
        endDate = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
        break;
      case "This Month":
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case "Last Month":
        const lastMonthDate = subMonths(new Date(), 1);
        startDate = startOfMonth(lastMonthDate);
        endDate = endOfMonth(lastMonthDate);
        break;
      case "This Year":
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        break;
      default:
        startDate = startOfToday();
        endDate = endOfToday();
    }

    // Use the callback functions passed from parent
    const newDateRange = [{ startDate, endDate, key: "selection" }];

    if (onDateRangeStateChange) {
      onDateRangeStateChange(newDateRange);
    }

    if (onDateRangeSelect) {
      onDateRangeSelect(rangeLabel);
    }

    if (onClose) {
      onClose();
    }
  };

  const handleCalendarSelect = (ranges) => {
    setTempDateRange([ranges.selection]);
  };

  const handleApply = () => {
    const { startDate, endDate } = tempDateRange[0];

    // Check if it's a predefined range
    const isPredefinedRange = customStaticRanges.some((range) => {
      const rangeDates = range.range();
      return (
        rangeDates.startDate.getTime() === startDate.getTime() &&
        rangeDates.endDate.getTime() === endDate.getTime()
      );
    });

    let rangeLabel = "Custom";
    if (isPredefinedRange) {
      const matchedRange = customStaticRanges.find((range) => {
        const rangeDates = range.range();
        return (
          rangeDates.startDate.getTime() === startDate.getTime() &&
          rangeDates.endDate.getTime() === endDate.getTime()
        );
      });
      rangeLabel = matchedRange?.label || "Custom";
    }

    // Use the callback functions passed from parent
    if (onDateRangeStateChange) {
      onDateRangeStateChange(tempDateRange);
    }

    if (onDateRangeSelect) {
      onDateRangeSelect(rangeLabel);
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dateRangePickerRef.current &&
        !dateRangePickerRef.current.contains(event.target)
      ) {
        if (onClose) {
          onClose();
        }
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container date-range-modal"
        onClick={(e) => e.stopPropagation()}
        ref={dateRangePickerRef}
      >
        <div className="modal-header">
          <h3 className="modal-title">Select Date Range</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content date-range-content">
          {/* Custom Static Range Buttons */}
          <div className="custom-static-ranges">
            {customStaticRanges.map((range) => (
              <button
                key={range.label}
                className={`static-range-button ${
                  selectedDateRange === range.label ? "selected" : ""
                }`}
                onClick={() => handleStaticRangeSelect(range.label)}
              >
                {range.label}
              </button>
            ))}
            {/* Custom Period Button */}
            <button
              className="custom-period-button"
              onClick={onCustomPeriodClick}
            >
              <span className="professional-icon icon-calendar"></span>
              Custom Period
            </button>
          </div>

          <DateRangePicker
            ranges={tempDateRange}
            onChange={handleCalendarSelect}
            moveRangeOnFirstSelection={false}
            showPreview={true}
            months={2}
            direction="horizontal"
            locale={enUS}
            dragSelectionEnabled={true}
            staticRanges={[]}
            inputRanges={[]}
          />

          <div className="date-range-actions">
            <button
              className="apply-button date-range-apply"
              onClick={handleApply}
            >
              Apply Range
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;
