// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppNavigator />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;