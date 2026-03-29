import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ChangeOwner({ user }) {
  const [myCars, setMyCars] = useState([]);
  const [formData, setFormData] = useState({ carId: "", newOwnerId: "" });
  const [resolvedName, setResolvedName] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 1. Fetch assets belonging to the logged-in user
  useEffect(() => {
  const fetchMyCars = async () => {
    try {
      // 1. Call the general cars route that we know works
      const response = await fetch(`http://localhost:3000/api/cars`);
      const data = await response.json();
      
      const allCars = Array.isArray(data) ? data : [];

      // 2. Filter the cars manually just like you did in the garage
      const filtered = allCars.filter((car) => {
        // Checking multiple possible field names (ownerId vs OwnerID) for safety
        const ledgerOwnerId = (car.ownerId || car.OwnerID || "").toString().toLowerCase();
        const currentUserId = user.id.toString().toLowerCase();
        return ledgerOwnerId === currentUserId;
      });

      setMyCars(filtered);
    } catch (error) {
      console.error("Failed to fetch garage assets for transfer:", error);
    }
  };

  if (user && user.id) {
    fetchMyCars();
  }
}, [user.id]);

  // 2. LIVE BLOCKCHAIN VERIFICATION: Resolve recipient name via Ledger
  useEffect(() => {
    const resolveRecipient = async () => {
      const recipientId = formData.newOwnerId.trim();
      
      if (recipientId.length < 5) {
        setResolvedName("");
        return;
      }

      setIsResolving(true);
      try {
        // Query the backend which queries GetUser on the chaincode
        const response = await fetch(`http://localhost:3000/api/users/${recipientId}`);
        const data = await response.json();
        
        if (response.ok && data.status === "Approved") {
          setResolvedName(data.name || data.email); // Use name or email as fallback
        } else {
          setResolvedName("");
        }
      } catch (err) {
        setResolvedName("");
      } finally {
        setIsResolving(false);
      }
    };

    const debounce = setTimeout(resolveRecipient, 600); // Prevent spamming ledger on every keystroke
    return () => clearTimeout(debounce);
  }, [formData.newOwnerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const recipientId = formData.newOwnerId.trim();

    if (recipientId.toLowerCase() === user.id.toLowerCase()) {
      alert("Invalid Action: You cannot transfer a vehicle to yourself.");
      return;
    }

    if (!resolvedName) {
      alert("❌ Recipient ID not found or not approved on the network.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/cars/change-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.carId,
          newOwnerId: recipientId,
          newOwnerName: resolvedName,
          requesterId: user.id
        }),
      });

      if (response.ok) {
        alert(`Successfully transferred title to ${resolvedName}. Block committed!`);
        navigate("/my-cars");
      } else {
        const err = await response.json();
        alert(`Blockchain Error: ${err.error || "Transfer rejected by peer."}`);
      }
    } catch (error) {
      alert("Network Error: Could not connect to Hyperledger Fabric node.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={auditMain}>
        <div style={stateHeader}>
          <div>
            <span style={liveLabel}>SECURE TITLE TRANSFER</span>
            <h1 style={assetTitle}>Change Owner</h1>
            <p style={subText}>Initiate a peer-to-peer asset transfer</p>
          </div>
        </div>

        {myCars.length === 0 ? (
          <div style={warningBox}>
            No assets found in your garage. You must own a car to initiate a transfer.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={dLabel}>Select Asset (VIN)</label>
            <select
              style={inputStyle}
              required
              value={formData.carId}
              onChange={(e) => setFormData({ ...formData, carId: e.target.value })}
            >
              <option value="">-- Choose Car --</option>
              {myCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.make} {car.model} — {car.id}
                </option>
              ))}
            </select>

            <label style={dLabel}>Recipient Identity (Blockchain ID)</label>
            <input
              style={inputStyle}
              placeholder="e.g., user@example.com"
              required
              value={formData.newOwnerId}
              onChange={(e) => setFormData({ ...formData, newOwnerId: e.target.value })}
            />

            {isResolving && <div style={resolvingText}>Searching ledger...</div>}

            {resolvedName && (
              <div style={darkVerifyBox}>
                <div style={{ fontSize: "18px" }}>🛡️</div>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "11px", opacity: 0.8 }}>RECIPIENT VERIFIED</div>
                  <div style={{ fontWeight: "600" }}>{resolvedName}</div>
                </div>
              </div>
            )}

            {!resolvedName && formData.newOwnerId.length > 5 && !isResolving && (
              <div style={errorBox}>⚠️ Recipient is not a verified network participant.</div>
            )}

            <button 
              type="submit" 
              style={auditBtn(loading || !resolvedName)} 
              disabled={loading || !resolvedName}
            >
              {loading ? "Committing to Ledger..." : "Sign & Transfer Title"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const containerStyle = { height: "calc(100vh - 80px)", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc" };
const auditMain = { background: "#0f172a", borderRadius: "32px", padding: "40px", color: "#fff", width: "450px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" };
const stateHeader = { borderBottom: "1px solid #1e293b", paddingBottom: "20px", marginBottom: "30px" };
const liveLabel = { fontSize: "10px", fontWeight: "900", color: "#10b981", letterSpacing: "2px" };
const assetTitle = { fontSize: "28px", margin: "5px 0", fontWeight: "900" };
const subText = { fontSize: "13px", color: "#64748b", margin: 0 };
const dLabel = { fontSize: "10px", color: "#94a3b8", fontWeight: "900", textTransform: "uppercase", marginBottom: "8px", display: "block" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "12px", background: "#1e293b", border: "1px solid #334155", color: "#fff", marginBottom: "20px", boxSizing: "border-box", fontSize: "14px" };
const auditBtn = (disabled) => ({ width: "100%", padding: "16px", background: disabled ? "#334155" : "#2563eb", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", marginTop: "10px" });
const darkVerifyBox = { marginBottom: "20px", padding: "15px", background: "#064e3b", borderRadius: "12px", fontSize: "14px", border: "1px solid #065f46", display: "flex", alignItems: "center", gap: "12px" };
const errorBox = { marginBottom: "20px", padding: "12px", background: "#450a0a", borderRadius: "10px", fontSize: "12px", color: "#fca5a5", border: "1px solid #7f1d1d" };
const warningBox = { background: "#1e293b", color: "#94a3b8", padding: "20px", borderRadius: "12px", textAlign: "center", fontSize: "14px", border: "1px dashed #334155" };
const resolvingText = { fontSize: "11px", color: "#3b82f6", marginBottom: "10px", fontStyle: "italic" };

export default ChangeOwner;