import { useState } from "react";
import { useNavigate } from "react-router-dom";

function QueryCar() {
  const [id, setId] = useState("");
  const [car, setCar] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const findCar = async () => {
    if (!id) return;
    setLoading(true);
    setCar(null);
    setError(""); 

    try {
      // In Fabric, we usually fetch all or filter via backend. 
      // Assuming your backend has a specific GET /api/cars/:id route:
      const response = await fetch(`http://localhost:3000/api/cars`);
      if (!response.ok) throw new Error("Could not connect to the Ledger.");

      const allCars = await response.json();
      // Find car by ID (case insensitive)
      const foundCar = allCars.find(c => (c.id || c.ID).toUpperCase() === id.toUpperCase());

      if (!foundCar) {
        throw new Error(`Asset ${id} not found in the current World State.`);
      }

      setCar(foundCar);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        {/* Header Section */}
        <div style={headerStyle}>
          <div style={badge}>FABRIC NETWORK V2.5</div>
          <h2 style={{ margin: "10px 0 0 0", fontSize: "24px", fontWeight: "800" }}>Asset Explorer</h2>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
            Query World State for real-time asset validation
          </p>
        </div>

        {/* Search Form */}
        <div style={{ padding: "30px" }}>
          <label style={labelStyle}>Enter Vehicle Identification Number (VIN)</label>
          <div style={searchContainer}>
            <input
              placeholder="e.g. CAR101"
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && findCar()}
              style={inputStyle}
            />
            <button
              onClick={findCar}
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "..." : "Query"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          {/* Result Box */}
          {car && (
            <div style={resultBoxStyle}>
              <div style={resultHeader}>
                <span style={idBadge}>{car.id || car.ID}</span>
                <span style={statusTag}>● World State Active</span>
              </div>
              
              <div style={infoGrid}>
                <div style={infoItem}>
                  <label style={labelStyle}>Manufacturer</label>
                  <div style={valueStyle}>{car.make || car.Make}</div>
                </div>
                <div style={infoItem}>
                  <label style={labelStyle}>Model</label>
                  <div style={valueStyle}>{car.model || car.Model}</div>
                </div>
                <div style={infoItem}>
                  <label style={labelStyle}>Current Legal Owner</label>
                  <div style={ownerValueStyle}>{car.ownerName || car.OwnerName || "Unknown"}</div>
                </div>
                <div style={infoItem}>
                  <label style={labelStyle}>Finish Color</label>
                  <div style={valueStyle}>
                    <span style={{ 
                      display: "inline-block", 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%", 
                      backgroundColor: car.color || car.Color || "#ddd", 
                      marginRight: "8px",
                      border: "1px solid #cbd5e1"
                    }}></span>
                    {car.color || car.Color}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/history/${car.id || car.ID}`)}
                style={historyBtnStyle}
              >
                View Blockchain History (Audit)
              </button>
            </div>
          )}

          <button 
            onClick={() => navigate("/")} 
            style={backButtonStyle}
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODERN STYLES ---
const containerStyle = { display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px", fontFamily: "'Inter', sans-serif", minHeight: "calc(100vh - 80px)", backgroundColor: "#f8fafc" };
const cardStyle = { width: "100%", maxWidth: "480px", backgroundColor: "#ffffff", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", overflow: "hidden" };
const headerStyle = { backgroundColor: "#0f172a", color: "#ffffff", padding: "40px 30px", textAlign: "center" };
const badge = { display: "inline-block", backgroundColor: "#1e293b", color: "#3b82f6", padding: "4px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: "900", letterSpacing: "1px", border: "1px solid #334155" };
const searchContainer = { display: "flex", gap: "10px", marginBottom: "25px", marginTop: "8px" };
const inputStyle = { flex: 1, padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none", backgroundColor: "#f8fafc", transition: "border 0.2s" };
const buttonStyle = { padding: "0 24px", borderRadius: "12px", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" };
const errorStyle = { padding: "15px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "12px", fontSize: "13px", border: "1px solid #fee2e2", marginBottom: "20px", fontWeight: "500" };
const resultBoxStyle = { backgroundColor: "#ffffff", borderRadius: "18px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
const resultHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #f1f5f9" };
const idBadge = { backgroundColor: "#f1f5f9", color: "#0f172a", padding: "6px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "800", fontFamily: "monospace" };
const statusTag = { fontSize: "11px", fontWeight: "800", color: "#10b981", textTransform: "uppercase" };
const infoGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" };
const infoItem = { display: "flex", flexDirection: "column", gap: "4px" };
const labelStyle = { fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" };
const valueStyle = { fontSize: "15px", fontWeight: "600", color: "#1e293b" };
const ownerValueStyle = { fontSize: "15px", fontWeight: "700", color: "#2563eb" };
const historyBtnStyle = { width: "100%", marginTop: "20px", padding: "12px", background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "13px" };
const backButtonStyle = { width: "100%", padding: "12px", backgroundColor: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontWeight: "600", fontSize: "14px" };

export default QueryCar;