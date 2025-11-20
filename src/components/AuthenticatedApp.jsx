// components/AuthenticatedApp.jsx
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import SideNav from './SideNav';
import DashboardScreen from '../screens/DashboardScreen';
import BusDashboardScreen from '../screens/BusDashboardScreen';
import AllTripsScreen from '../screens/AllTripsScreen';
import TripTicketsScreen from '../screens/TripTicketsScreen';
import BusListScreen from '../screens/BusListScreen';
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen';
import RoutesListScreen from '../screens/RouteListScreen';
import EditRouteScreen from '../screens/EditRouteScreen';
import SaveSubRoutesScreen from '../screens/SaveSubRoutesScreen';
import SubRoutesScreen from '../screens/SubRoutesScreen';
import BusSubscriptionListScreen from '../screens/BusSubscriptionScreen';
import SubscriptionPaymentScreen from '../screens/SubscriptionPaymentScreen';
import CreateCurrencyScreen from '../screens/CreateCurrencyScreen';
import SettingsScreen from '../screens/SettingsScreen';

const AuthenticatedApp = () => {

  return (
    <div className="app-container">
   
      
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/bus-dashboard" element={<BusDashboardScreen />} />
          <Route path="/all-trips" element={<AllTripsScreen />} />
          <Route path="/trip-tickets" element={<TripTicketsScreen />} />
          
          {/* Settings routes */}
        <Route path="/buses" element={<BusListScreen />} />
        <Route path="/employees" element={<EmployeeManagementScreen />} />
          <Route path="/routes" element={<RoutesListScreen />} />
          <Route path="/save-subroutes" element={<SaveSubRoutesScreen />} />
          <Route path="/edit-route" element={<EditRouteScreen />} />
          <Route path="/subroutes" element={<SubRoutesScreen />} />
          <Route path="/subscription_list" element={<BusSubscriptionListScreen />} />
          <Route path="/subscription" element={<SubscriptionPaymentScreen />} />
          <Route path="/currency" element={<CreateCurrencyScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          
          {/* Redirect to dashboard by default for any unmatched protected routes */}
          <Route path="*" element={<DashboardScreen />} />
        </Routes>
    </div>
  );
};

export default AuthenticatedApp;