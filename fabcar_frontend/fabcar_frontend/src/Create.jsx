import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Create({ user }) {
  const navigate = useNavigate();
  const [car, setCar] = useState({
    id: "",
    make: "",
    model: "",
    color: "",
    ownerId: "",
  });
  const [resolvedUser, setResolvedUser] = useState(null); // Changed to store full user object
  const [errorMessage, setErrorMessage] = useState(""); // Track specific backend errors
  const [isResolving, setIsResolving] = useState(false);
  const [loading, setLoading] = useState(false);

  // SESSION & ROLE CHECK
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (user.role !== "Dealer") {
      alert(
        "⚠️ Access Denied: Asset minting is restricted to authorized Dealers.",
      );
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // LIVE LEDGER VERIFICATION
  useEffect(() => {
    const resolveRecipient = async () => {
      const recipientId = car.ownerId.trim();

      if (recipientId.length < 5) {
        setResolvedUser(null);
        setErrorMessage("");
        return;
      }

      setIsResolving(true);
      setErrorMessage("");
      try {
        // Query the backend (this triggers the new /api/users/:email route)
        const response = await fetch(
          `http://localhost:3000/api/users/${recipientId}`,
        );
        const data = await response.json();

        if (response.ok) {
          // Success: User is Approved AND is an Owner
          setResolvedUser(data);
          setErrorMessage("");
        } else {
          // Failure: Backend returned 403 (Wrong role) or 404 (Not found)
          setResolvedUser(null);
          setErrorMessage(data.error || "Recipient not valid for minting.");
        }
      } catch (err) {
        setResolvedUser(null);
        setErrorMessage("Connection to blockchain bridge failed.");
      } finally {
        setIsResolving(false);
      }
    };

    const debounce = setTimeout(resolveRecipient, 600);
    return () => clearTimeout(debounce);
  }, [car.ownerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resolvedUser) {
      alert("❌ Error: Cannot proceed without a verified Owner recipient.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // In Create.jsx handleSubmit
        body: JSON.stringify({
          ...car,
          ownerName: resolvedUser.email,
          ownerId: car.ownerId.toLowerCase(),
          // Ensure this points to the email address exactly as it appears in the wallet
          currentUserEmail: user.email || user.id,
        }),
      });

      if (response.ok) {
        alert(
          `✅ Asset ${car.id} successfully minted to ${resolvedUser.email}`,
        );
        navigate("/my-cars");
      } else {
        const errorData = await response.json();
        alert(
          "❌ Blockchain Error: " + (errorData.error || "Transaction Rejected"),
        );
      }
    } catch (error) {
      alert("⚠️ Backend Server Error: Connection lost.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <span style={badge}>GENESIS MINT</span>
          <h2 style={{ margin: "10px 0 5px 0" }}>Register Asset</h2>
          <p style={{ fontSize: "13px", opacity: 0.8 }}>
            Authorized Dealer: {user.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroup}>
            <label style={labelStyle}>
              Vehicle Identification Number (VIN)
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. VIN-7890-XX"
              value={car.id}
              onChange={(e) =>
                setCar({ ...car, id: e.target.value.toUpperCase() })
              }
              required
            />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Manufacturer</label>
              <input
                style={inputStyle}
                placeholder="Tesla"
                onChange={(e) => setCar({ ...car, make: e.target.value })}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Model</label>
              <input
                style={inputStyle}
                placeholder="Model 3"
                onChange={(e) => setCar({ ...car, model: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Recipient Owner Blockchain ID</label>
            <input
              style={inputStyle}
              placeholder="recipient@email.com"
              value={car.ownerId}
              onChange={(e) =>
                setCar({ ...car, ownerId: e.target.value.trim() })
              }
              required
            />

            {isResolving && (
              <div style={statusText}>Verifying Role on Ledger...</div>
            )}

            {resolvedUser && (
              <div style={verifyBox}>
                <div style={{ fontWeight: "800", fontSize: "10px" }}>
                  NETWORK VERIFIED ✅
                </div>
                <div style={{ fontSize: "14px", marginTop: "2px" }}>
                  {resolvedUser.email}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>
                  Role: {resolvedUser.role}
                </div>
              </div>
            )}

            {errorMessage && !isResolving && (
              <div style={errorBox}>
                <div style={{ fontWeight: "800", fontSize: "10px" }}>
                  VERIFICATION FAILED ❌
                </div>
                <div>{errorMessage}</div>
              </div>
            )}
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Exterior Finish (Color)</label>
            <input
              style={inputStyle}
              placeholder="Midnight Silver"
              onChange={(e) => setCar({ ...car, color: e.target.value })}
              required
            />
          </div>

          <div style={infoBanner}>
            ℹ️ Only identities with the "Owner" role can hold car assets on this
            network.
          </div>

          <button
            type="submit"
            disabled={loading || !resolvedUser}
            style={!resolvedUser || loading ? disabledBtn : btnStyle}
          >
            {loading ? "⚙️ Committing to Block..." : "Authorize Genesis Mint"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Styles (Existing styles kept but errorBox updated slightly) ---
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px 20px",
  fontFamily: "'Inter', sans-serif",
  minHeight: "calc(100vh - 80px)",
  backgroundColor: "#f1f5f9",
};
const cardStyle = {
  width: "100%",
  maxWidth: "480px",
  background: "white",
  borderRadius: "24px",
  boxShadow:
    "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
  overflow: "hidden",
};
const headerStyle = {
  background: "#0f172a",
  color: "white",
  padding: "40px 30px",
  textAlign: "center",
};
const badge = {
  background: "#10b981",
  color: "white",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "1px",
};
const formStyle = {
  padding: "30px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};
const inputGroup = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};
const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontSize: "15px",
  backgroundColor: "#f8fafc",
  transition: "border 0.2s",
};
const btnStyle = {
  padding: "16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontWeight: "700",
  cursor: "pointer",
  fontSize: "16px",
  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.4)",
};
const disabledBtn = {
  ...btnStyle,
  background: "#94a3b8",
  cursor: "not-allowed",
  boxShadow: "none",
};
const verifyBox = {
  marginTop: "5px",
  padding: "12px",
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
  borderRadius: "10px",
  fontSize: "13px",
};
const errorBox = {
  marginTop: "5px",
  padding: "12px",
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  fontSize: "13px",
};
const infoBanner = {
  padding: "12px",
  background: "#eff6ff",
  color: "#1e40af",
  borderRadius: "10px",
  fontSize: "12px",
  border: "1px solid #dbeafe",
};
const statusText = { fontSize: "11px", color: "#3b82f6", fontStyle: "italic" };

export default Create;
