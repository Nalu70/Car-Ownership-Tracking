import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login({ setAuth }) {
  // Views: 'login', 'signup', 'forgot', 'reset'
  const [view, setView] = useState("login"); 
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "", 
    role: "Owner", 
    otp: "",
    newPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- 1. SIGNUP LOGIC (Approval Request) ---
      if (view === "signup") {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match!");
        }

        const res = await fetch('http://localhost:3000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: formData.role
          }),
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Registration failed");

        // Note the change in alert: we are now waiting for approval
        alert("Request Submitted! Please wait for a Regulator to approve your account.");
        setView("login");

      // --- 2. LOGIN LOGIC ---
      } else if (view === "login") {
        // Predefined Regulator Bypass
        if (formData.email === "regulator@gov.in" && formData.password === "regulator123") {
          const regulatorUser = {
            loggedIn: true,
            role: "Regulator",
            id: "regulator@gov.in",
            name: "Network Regulator"
          };
          setAuth(regulatorUser);
          localStorage.setItem("user", JSON.stringify(regulatorUser));
          navigate("/");
          return;
        }

        // Standard Blockchain Auth
        const res = await fetch('http://localhost:3000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });
        
        const data = await res.json();

        // Handle the "Pending Approval" state from backend
        if (res.status === 403) {
            throw new Error("Your account is still pending approval from a Regulator.");
        }
        
        if (!res.ok) throw new Error(data.error || "Login failed");

        const authData = {
          loggedIn: true,
          role: data.user.role,
          id: data.user.email,
          name: data.user.email.split('@')[0]
        };

        setAuth(authData);
        localStorage.setItem("user", JSON.stringify(authData));
        navigate("/");

      // --- 3. FORGOT PASSWORD (SEND OTP) ---
      } else if (view === "forgot") {
        const res = await fetch('http://localhost:3000/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        if (!res.ok) throw new Error("Could not send OTP. Ensure email is registered and approved.");
        
        alert("OTP sent to your email!");
        setView("reset");

      // --- 4. RESET PASSWORD (VERIFY OTP) ---
      } else if (view === "reset") {
        const res = await fetch('http://localhost:3000/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            otp: formData.otp, 
            newPassword: formData.newPassword 
          }),
        });
        if (!res.ok) throw new Error("Invalid OTP or expired.");

        alert("Password updated on Blockchain! Please login.");
        setView("login");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginBg}>
      <div style={loginCard}>
        <div style={logoCircle}>⛓️</div>
        <h2 style={titleStyle}>
          {view === "signup" ? "Network Signup" : view === "forgot" ? "Request OTP" : view === "reset" ? "Reset Password" : "Identity Portal"}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email Address</label>
          <input 
            type="email" 
            name="email"
            style={inputStyle} 
            placeholder="email@example.com" 
            onChange={handleChange} 
            required 
          />

          {(view === "login" || view === "signup") && (
            <>
              <label style={labelStyle}>Password</label>
              <input 
                type="password" 
                name="password"
                style={inputStyle} 
                placeholder="••••••••" 
                onChange={handleChange} 
                required 
              />
            </>
          )}

          {view === "signup" && (
            <>
              <label style={labelStyle}>Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                style={inputStyle} 
                placeholder="••••••••" 
                onChange={handleChange} 
                required 
              />
              <label style={labelStyle}>Requested Role</label>
              <select 
                name="role"
                style={inputStyle} 
                value={formData.role} 
                onChange={handleChange}
              >
                <option value="Dealer">Authorized Dealer (Manufacturer)</option>
                <option value="Owner">Private Owner</option>
              </select>
            </>
          )}

          {view === "reset" && (
            <>
              <label style={labelStyle}>6-Digit OTP</label>
              <input 
                type="text" 
                name="otp"
                style={inputStyle} 
                placeholder="123456" 
                onChange={handleChange} 
                required 
              />
              <label style={labelStyle}>New Password</label>
              <input 
                type="password" 
                name="newPassword"
                style={inputStyle} 
                placeholder="New Password" 
                onChange={handleChange} 
                required 
              />
            </>
          )}

          <button type="submit" style={loginBtn} disabled={loading}>
            {loading ? "Processing..." : 
             view === "signup" ? "Request Access" : 
             view === "forgot" ? "Send OTP" : 
             view === "reset" ? "Update Password" : "Authenticate"}
          </button>
        </form>

        <div style={linkContainer}>
          <p onClick={() => setView(view === "signup" ? "login" : "signup")} style={toggleLink}>
            {view === "signup" ? "Already requested? Login" : "New participant? Register here"}
          </p>
          
          {view === "login" && (
            <p onClick={() => setView("forgot")} style={forgotLink}>
              Forgot Password?
            </p>
          )}

          {(view === "forgot" || view === "reset") && (
            <p onClick={() => setView("login")} style={toggleLink}>
              Back to Login
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const loginBg = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc", fontFamily: "'Inter', sans-serif" };
const loginCard = { padding: "40px", background: "white", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", width: "380px" };
const logoCircle = { width: "50px", height: "50px", background: "#0f172a", borderRadius: "50%", margin: "0 auto 20px auto", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "24px" };
const titleStyle = { margin: "0 0 25px 0", fontSize: "22px", textAlign: "center", fontWeight: "800", color: "#1e293b" };
const labelStyle = { display: "block", fontSize: "11px", fontWeight: "800", marginBottom: "5px", color: "#64748b", textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "15px", boxSizing: "border-box", fontSize: "14px" };
const loginBtn = { width: "100%", padding: "14px", background: "#2563eb", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", marginTop: "10px" };
const linkContainer = { marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" };
const toggleLink = { fontSize: "13px", color: "#2563eb", cursor: "pointer", fontWeight: "600", margin: 0 };
const forgotLink = { fontSize: "12px", color: "#64748b", cursor: "pointer", fontWeight: "500", margin: 0 };

export default Login;