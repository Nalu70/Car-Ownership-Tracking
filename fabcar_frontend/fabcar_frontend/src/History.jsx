import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function History({ user }) {
  const { vin } = useParams(); 
  const [id, setId] = useState(vin || "");
  const [history, setHistory] = useState([]);
  const [assetDetails, setAssetDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const getHistory = async (searchId) => {
  const targetId = searchId || id;
  if (!targetId) return;
  setLoading(true);

  try {
    // 1. Fetch Current Asset Status (World State)
    const assetRes = await fetch(`http://localhost:3000/api/cars`);
    if (!assetRes.ok) throw new Error("Could not connect to Ledger.");
    
    const allCars = await assetRes.json();
    const details = allCars.find(c => c.id.toUpperCase() === targetId.toUpperCase());
    
    if (!details) throw new Error("Asset not found on Ledger registry.");

    // 2. Access Control Check
    if (user.role === "Private Owner" && details.ownerId.toLowerCase() !== user.id.toLowerCase()) {
      throw new Error("Access Denied: You do not have permission to audit this asset's history.");
    }

    setAssetDetails(details);

    // 3. Fetch Immutable History (Blockchain Provenance)
    const res = await fetch(`http://localhost:3000/api/cars/${targetId}/history`);
    const data = await res.json();

    // ✅ KEEP ORIGINAL ORDER (Genesis → Latest)
    setHistory(Array.isArray(data) ? data : []);

  } catch (err) {
    alert(err.message);
    setAssetDetails(null);
    setHistory([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { 
    if (vin) {
      setId(vin);
      getHistory(vin); 
    } 
  }, [vin]);

  return (
    <div style={auditContainer}>
      {/* Search Header - Only visible when no VIN is passed or for high-role users */}
      {(!vin || user.role !== "Private Owner") && (
        <div style={searchSection}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <div style={pulseIcon} />
            <h2 style={{margin: 0, fontSize: "24px", fontWeight: "900"}}>Provenance Explorer</h2>
          </div>
          <p style={{color: "#64748b", fontSize: "14px", margin: 0}}>Verify the immutable chain of custody for any asset registered on the network.</p>
          <div style={searchBar}>
            <input 
                style={auditInput} 
                placeholder="Enter VIN (e.g. CAR101)" 
                value={id} 
                onChange={(e) => setId(e.target.value.toUpperCase())} 
                onKeyPress={(e) => e.key === 'Enter' && getHistory()}
            />
            <button onClick={() => getHistory()} style={auditBtn}>
                {loading ? "Verifying..." : "Audit Ledger"}
            </button>
          </div>
        </div>
      )}

      {assetDetails && (
        <div style={auditMain}>
          <div style={stateHeader}>
            <div>
              <span style={liveLabel}>WORLD STATE: ACTIVE</span>
              <h1 style={assetTitle}>{assetDetails.make} {assetDetails.model}</h1>
              <div style={colorBadge}>
                <div style={colorDot(assetDetails.color)}></div>
                <span>FACTORY FINISH: {assetDetails.color}</span>
              </div>
            </div>
            <div style={idBadge}>
                <div style={{fontSize: "9px", color: "#64748b", marginBottom: "4px"}}>ASSET IDENTIFIER</div>
                {assetDetails.id}
            </div>
          </div>

          <div style={timeline}>
             <h4 style={panelTitle}>Provenance Trail</h4>
            {history.map((h, idx) => {
  // 🔥 Reverse the meaning (NOT the array)
  const isLatest = idx === 0; // Top
  const isGenesis = idx === history.length - 1; // Bottom

  return (
    <div key={idx} style={timeEntry}>
      <div style={timeLineMark}>
        <div style={isGenesis ? genesisDot : dot} />
        {idx !== history.length - 1 && <div style={line} />}
      </div>

      <div style={timeCard}>
        <div style={cardMeta}>
          <span style={timeTag}>{new Date(h.timestamp).toLocaleString()}</span>
          <span style={txId}>TXID: {h.txId?.substring(0, 16)}</span>
        </div>

        <div style={cardData}>
          <div style={dataCol}>
            <label style={dLabel}>
              {isGenesis
                ? "Original Owner (Genesis)"
                : isLatest
                ? "Latest Registered Owner"
                : "Intermediate Owner"}
            </label>

            <div style={dValue}>
              {h.record.ownerName || "Authorized Participant"}
            </div>

            <div style={dId}>
              {h.record.ownerId || h.record.OwnerID}
            </div>
          </div>

          <div style={dataCol} className="ms-auto">
            <label style={dLabel}>Block Type</label>
            <div style={eventBadge(isGenesis)}>
              {isGenesis ? "GENESIS" : "STATE_UPDATE"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
})}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles (Matches the high-end dark theme of CarsOwned) ---
const auditContainer = { maxWidth: "900px", margin: "40px auto", padding: "0 20px", fontFamily: "'Inter', sans-serif", minHeight: "80vh" };
const searchSection = { background: "#fff", padding: "35px", borderRadius: "24px", border: "1px solid #e2e8f0", marginBottom: "40px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" };
const pulseIcon = { width: "12px", height: "12px", background: "#2563eb", borderRadius: "50%", boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.1)" };
const searchBar = { display: "flex", gap: "10px", marginTop: "25px" };
const auditInput = { flex: 1, padding: "16px", borderRadius: "14px", border: "1px solid #cbd5e1", fontSize: "16px", outline: "none" };
const auditBtn = { padding: "0 35px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "14px", fontWeight: "700", cursor: "pointer" };
const auditMain = { background: "#0f172a", borderRadius: "32px", padding: "50px", color: "#fff", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" };
const stateHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e293b", paddingBottom: "35px", marginBottom: "45px" };
const liveLabel = { fontSize: "9px", fontWeight: "900", color: "#10b981", letterSpacing: "2.5px" };
const assetTitle = { fontSize: "36px", margin: "10px 0 0 0", fontWeight: "900" };
const colorBadge = { display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", fontSize: "11px", color: "#94a3b8", fontWeight: "bold" };
const colorDot = (c) => ({ width: "10px", height: "10px", borderRadius: "50%", background: c || "#ccc", border: "1px solid #fff" });
const idBadge = { background: "#1e293b", padding: "15px 25px", borderRadius: "16px", fontSize: "15px", fontWeight: "700", fontFamily: "monospace", color: "#fff", border: "1px solid #334155", textAlign: "right" };
const timeline = { display: "flex", flexDirection: "column" };
const panelTitle = { fontSize: "10px", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "25px", textAlign: "center" };
const timeEntry = { display: "flex", gap: "35px" };
const timeLineMark = { display: "flex", flexDirection: "column", alignItems: "center" };
const line = { width: "1px", flex: 1, background: "#1e293b", margin: "5px 0" };
const dot = { width: "14px", height: "14px", background: "#3b82f6", borderRadius: "50%", border: "4px solid #0f172a", zIndex: 2 };
const genesisDot = { ...dot, background: "#10b981", boxShadow: "0 0 0 2px #10b981" };
const timeCard = { flex: 1, background: "#1e293b", padding: "25px", borderRadius: "20px", marginBottom: "35px", border: "1px solid #334155" };
const cardMeta = { display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", opacity: 0.7 };
const timeTag = { fontSize: "13px", fontWeight: "600" };
const txId = { fontSize: "11px", color: "#475569", fontFamily: "monospace" };
const cardData = { display: "flex", justifyContent: "space-between", alignItems: "flex-end" };
const dataCol = { display: "flex", flexDirection: "column", gap: "4px" };
const dLabel = { fontSize: "10px", color: "#64748b", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px" };
const dValue = { fontSize: "18px", fontWeight: "700", color: "#f8fafc" };
const dId = { fontSize: "12px", color: "#3b82f6", fontFamily: "monospace" };
const eventBadge = (isMint) => ({ fontSize: "11px", fontWeight: "800", color: isMint ? "#10b981" : "#3b82f6", background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "8px" });

export default History;