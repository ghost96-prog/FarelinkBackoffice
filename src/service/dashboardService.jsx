// services/dashboardService.js
import Apilink from "../baseUrl/baseUrl";

export const fetchDashboardData = async (token, startDate, endDate, busId = null) => {
  try {
    const apiLink = Apilink.getLink();
    const requestBody = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      ...(busId && { busId })
    };

    const response = await fetch(`${apiLink}/dashboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

export const fetchBuses = async (token) => {
  try {
    const apiLink = Apilink.getLink();
    const response = await fetch(`${apiLink}/buses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.buses || [];
  } catch (error) {
    console.error("Error fetching buses:", error);
    throw error;
  }
};