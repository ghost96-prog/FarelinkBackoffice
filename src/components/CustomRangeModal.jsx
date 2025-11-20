import React, { useState, useEffect } from "react";
import { format } from "date-fns";

const CustomRangeModal = ({
  visible = false,
  onClose,
  onApply,
  initialStartDate = new Date(),
  initialEndDate = new Date(),
  initialStartTime = "00:00",
  initialEndTime = "23:59",
}) => {
  const [tempStartDate, setTempStartDate] = useState(initialStartDate);
  const [tempEndDate, setTempEndDate] = useState(initialEndDate);
  const [tempStartTime, setTempStartTime] = useState(initialStartTime);
  const [tempEndTime, setTempEndTime] = useState(initialEndTime);

  useEffect(() => {
    if (visible) {
      setTempStartDate(initialStartDate);
      setTempEndDate(initialEndDate);
      setTempStartTime(initialStartTime);
      setTempEndTime(initialEndTime);
    }
  }, [
    visible,
    initialStartDate,
    initialEndDate,
    initialStartTime,
    initialEndTime,
  ]);

  const formatDateForInput = (date) => {
    return format(date, "yyyy-MM-dd");
  };

  const formatDateDisplay = (date) => {
    return format(date, "MMM dd, yyyy");
  };

  const formatTimeForDisplay = (time24) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const handleStartDateChange = (e) => {
    const newDate = e.target.value ? new Date(e.target.value) : new Date();
    setTempStartDate(newDate);
  };

  const handleEndDateChange = (e) => {
    const newDate = e.target.value ? new Date(e.target.value) : new Date();
    setTempEndDate(newDate);
  };

  const handleStartTimeChange = (e) => {
    setTempStartTime(e.target.value);
  };

  const handleEndTimeChange = (e) => {
    setTempEndTime(e.target.value);
  };

  const handleApplyCustomRange = () => {
    // Combine date and time
    const startDateTime = new Date(tempStartDate);
    const [startHours, startMinutes] = tempStartTime.split(":");
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDateTime = new Date(tempEndDate);
    const [endHours, endMinutes] = tempEndTime.split(":");
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

    onApply(startDateTime, endDateTime, tempStartTime, tempEndTime);
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const displayTime = `${displayHour}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;

        times.push({
          value: timeString,
          display: displayTime,
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container custom-range-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Custom Date & Time Range</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="date-time-inputs">
            {/* Start Date & Time */}
            <div className="date-time-group">
              <label className="date-time-label">Start Date & Time</label>
              <div className="date-picker-container">
                <input
                  type="date"
                  className="date-time-input"
                  value={formatDateForInput(tempStartDate)}
                  onChange={handleStartDateChange}
                />
              </div>
              <div className="time-input-group">
                <select
                  className="time-input"
                  value={tempStartTime}
                  onChange={handleStartTimeChange}
                >
                  {timeOptions.map((time) => (
                    <option key={`start-${time.value}`} value={time.value}>
                      {time.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* End Date & Time */}
            <div className="date-time-group">
              <label className="date-time-label">End Date & Time</label>
              <div className="date-picker-container">
                <input
                  type="date"
                  className="date-time-input"
                  value={formatDateForInput(tempEndDate)}
                  onChange={handleEndDateChange}
                />
              </div>
              <div className="time-input-group">
                <select
                  className="time-input"
                  value={tempEndTime}
                  onChange={handleEndTimeChange}
                >
                  {timeOptions.map((time) => (
                    <option key={`end-${time.value}`} value={time.value}>
                      {time.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="range-summary">
            <strong>Selected Range:</strong>
            <p>
              {formatDateDisplay(tempStartDate)}{" "}
              {formatTimeForDisplay(tempStartTime)} to{" "}
              {formatDateDisplay(tempEndDate)}{" "}
              {formatTimeForDisplay(tempEndTime)}
            </p>
          </div>

          <button className="apply-button" onClick={handleApplyCustomRange}>
            Apply Custom Range
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomRangeModal;
