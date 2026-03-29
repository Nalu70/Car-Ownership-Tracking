import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState } from "react";
import Dashboard from "./Dashboard.jsx";
import Create from "./Create.jsx";
import QueryAll from "./QueryAll.jsx";
import ChangeOwner from "./ChangeOwner.jsx";
import History from "./History.jsx";
import Login from "./Login.jsx";
import Approval from "./Approval.jsx";
import CarsOwned from "./CarsOwned.jsx"; 
import "./App.css";

function App() {
  const [user, setUser] = useState({
    loggedIn: false,
    role: "",
    id: "",
    name: "",
  });

  const handleLogout = () => {
    setUser({ loggedIn: false, role: "", id: "", name: "" });
    localStorage.removeItem("user");
    localStorage.clear();
  };

  return (
    <Router>
      {user.loggedIn && (
        <header style={navbarStyle}>
          <div style={navContainer}>
            <div 
              onClick={() => window.location.href = "/"} 
              style={{ cursor: 'pointer', ...logoContainer }}
            >
              <span style={logoIcon}>🏎️</span>
              <span style={logoTextStyle}>
                FAB<span style={{ color: "#2563eb" }}>CAR</span>
              </span>
            </div>
            <div style={navRightSection}>
              <div style={badgeStyle}>
                <span style={pulseDot}></span>
                mychannel
              </div>
              <div style={userBadge}>{user.role}</div>
              <button
                onClick={handleLogout}
                style={logoutBtn}
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      <main style={{ paddingTop: user.loggedIn ? "100px" : "0px", minHeight: "100vh" }}>
        <Routes>
          <Route
            path="/login"
            element={
              !user.loggedIn ? <Login setAuth={setUser} /> : <Navigate to="/" />
            }
          />

          <Route
            path="/"
            element={
              user.loggedIn ? (
                <Dashboard user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* SHARED ROUTES */}
          <Route
            path="/queryall"
            element={
              user.loggedIn && ["Dealer", "Regulator"].includes(user.role) ? (
                <QueryAll user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* OWNER ROUTES (Updated from 'Private Owner' to 'Owner') */}
          <Route
            path="/my-cars"
            element={
              user.loggedIn && user.role === "Owner" ? (
                <CarsOwned user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/changeowner"
            element={
              user.loggedIn && user.role === "Owner" ? (
                <ChangeOwner user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* DEALER ROUTES */}
          <Route
            path="/create"
            element={
              user.loggedIn && user.role === "Dealer" ? (
                <Create user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* REGULATOR ROUTES */}
          <Route
            path="/history"
            element={
              user.loggedIn && user.role === "Regulator" ? (
                <History user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/history/:vin"
            element={
              user.loggedIn && user.role === "Regulator" ? (
                <History user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* GOVERNANCE ROUTES */}
          <Route
            path="/pending-approvals"
            element={
              user.loggedIn && user.role === "Regulator" ? (
                <Approval user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          
          <Route
            path="/approval"
            element={<Navigate to="/pending-approvals" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </Router>
  );
}

// --- STYLES ---
const navbarStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0,
  height: "70px",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  zIndex: 1000,
};

const navContainer = {
  maxWidth: "1200px",
  width: "100%",
  margin: "0 auto",
  padding: "0 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logoContainer = { display: "flex", alignItems: "center", gap: "10px" };
const logoIcon = { fontSize: "24px" };
const logoTextStyle = { fontSize: "22px", fontWeight: "900", color: "#0f172a", letterSpacing: "-0.5px" };
const navRightSection = { display: "flex", gap: "15px", alignItems: "center" };
const badgeStyle = {
  display: "flex", alignItems: "center", gap: "8px",
  backgroundColor: "#f1f5f9", padding: "6px 14px", borderRadius: "20px",
  fontSize: "12px", fontWeight: "700", color: "#475569",
};
const userBadge = {
  backgroundColor: "#2563eb", color: "white", padding: "6px 14px",
  borderRadius: "10px", fontSize: "11px", fontWeight: "800",
  textTransform: "uppercase", letterSpacing: "0.5px"
};
const pulseDot = {
  width: "8px", height: "8px", backgroundColor: "#10b981",
  borderRadius: "50%", boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)"
};
const logoutBtn = {
  padding: "7px 16px", backgroundColor: "#fff", color: "#dc2626",
  border: "1px solid #fee2e2", borderRadius: "8px", cursor: "pointer",
  fontSize: "12px", fontWeight: "700", transition: "all 0.2s ease",
};

export default App;