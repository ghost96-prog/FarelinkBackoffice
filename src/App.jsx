import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DateRangeProvider } from "./context/DateRangeContext";
import AppNavigator from "./navigation/AppNavigator";

function App() {
  return (
    <AuthProvider>
      <DateRangeProvider>
        <Router>
          <div className="App">
            <AppNavigator />
          </div>
        </Router>
      </DateRangeProvider>
    </AuthProvider>
  );
}

export default App;