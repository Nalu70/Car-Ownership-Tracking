import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function QueryAll({ user }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCars = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/cars");
      const data = await response.json();
      // Ensure we handle both empty results and different property casing from the ledger
      setCars(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={headerSection}>
        <div>
          <h2 style={titleStyle}>🌐 Global Vehicle Registry</h2>
          <p style={subtitleStyle}>
            Authorized View: <b>{user.role}</b> | Real-time World State sync
          </p>
        </div>
        <button onClick={fetchCars} style={refreshBtn}>Refresh Ledger</button>
      </div>
      
      {loading ? (
        <div style={loadingBox}>
          <div style={spinner} />
          <p>Synchronizing with Hyperledger Fabric...</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {cars.length === 0 ? (
            <div style={emptyState}>No assets currently registered on the ledger.</div>
          ) : (
            cars.map((car, index) => {
              // Handle potential casing differences from Chaincode (Go vs JS)
              const carId = car.id || car.ID;
              const carMake = car.make || car.Make;
              const carModel = car.model || car.Model;
              const carColor = car.color || car.Color || "#cbd5e0";
              const carOwner = car.ownerName || car.OwnerName || car.Owner;

              return (
                <div key={index} style={carCard}>
                  <div style={{ height: '8px', backgroundColor: carColor }} />
                  <div style={cardContent}>
                    <span style={badgeStyle}>VIN: {carId}</span>
                    <h3 style={carNameStyle}>{carMake} {carModel}</h3>
                    
                    <div style={infoRow}>
                      <span style={label}>Finish</span>
                      <span style={value}>{carColor}</span>
                    </div>
                    <div style={infoRow}>
                      <span style={label}>Registered Owner</span>
                      <span style={value}>{carOwner}</span>
                    </div>

                    {/* Regulators and Dealers can inspect provenance; Private Owners only for their own cars */}
                    {(user.role === "Regulator") && (
                      <button 
                        onClick={() => navigate(`/history/${carId}`)} 
                        style={viewBtnStyle}
                      >
                        Inspect Provenance
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const containerStyle = { padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
const headerSection = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" };
const titleStyle = { margin: 0, color: "#0f172a", fontSize: "28px", fontWeight: "800" };
const subtitleStyle = { color: "#64748b", margin: "5px 0 0 0", fontSize: "14px" };
const refreshBtn = { padding: "8px 16px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px" };

const loadingBox = { textAlign: "center", padding: "100px 0", color: "#64748b" };
const spinner = { width: "30px", height: "30px", border: "3px solid #f3f3f3", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto 15px auto", animation: "spin 1s linear infinite" };

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" };
const carCard = { background: "#fff", borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", overflow: 'hidden', transition: "transform 0.2s" };
const cardContent = { padding: "24px" };
const badgeStyle = { fontSize: "10px", fontWeight: "800", color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.5px" };
const carNameStyle = { margin: '16px 0 12px', fontSize: '20px', fontWeight: '800', color: "#1e293b" };
const infoRow = { display: "flex", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #f8fafc" };
const label = { fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" };
const value = { fontSize: "13px", color: "#334155", fontWeight: "600" };
const viewBtnStyle = { width: "100%", marginTop: "15px", padding: "12px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", transition: "background 0.2s" };
const emptyState = { gridColumn: "1 / -1", textAlign: "center", padding: "50px", background: "#f8fafc", borderRadius: "16px", color: "#64748b", border: "2px dashed #e2e8f0" };

export default QueryAll;