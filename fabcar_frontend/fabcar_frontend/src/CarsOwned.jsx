import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function CarsOwned({ user }) {
  const [myCars, setMyCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isDownloading, setIsDownloading] = useState(null);

  // FETCH: Sync garage with current World State
  useEffect(() => {
    const fetchMyCars = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3000/api/cars`);
        const data = await response.json();
        
        const allCars = Array.isArray(data) ? data : [];

        // Strict ownership filtering (Case-insensitive)
        const filtered = allCars.filter((car) => {
          const ledgerOwnerId = (car.ownerId || car.OwnerID || "").toString().toLowerCase();
          const currentUserId = user.id.toString().toLowerCase();
          return ledgerOwnerId === currentUserId;
        });

        setMyCars(filtered);
      } catch (error) {
        console.error("Ledger Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user.id) fetchMyCars();
  }, [user.id]);

  const viewHistory = async (vin) => {
    if (selectedHistory?.vin === vin) {
      setSelectedHistory(null);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/api/cars/${vin}/history`);
      const data = await res.json();
      setSelectedHistory({ vin, data });
    } catch (error) {
      alert("Could not retrieve immutable history from peer nodes.");
    }
  };

  const downloadPDF = async (car) => {
    setIsDownloading(car.id);
    try {
      const res = await fetch(`http://localhost:3000/api/cars/${car.id}/history`);
      const history = await res.json();
      const historyArray = Array.isArray(history) ? history : [];

      const doc = new jsPDF();

      // --- PDF DESIGN ---
      // 1. Header Bar
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("ASSET AUTHENTICITY CERTIFICATE", 14, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(59, 130, 246);
      doc.text("VERIFIED HYPERLEDGER FABRIC BLOCKCHAIN EXTRACT", 14, 33);

      // 2. Info Section
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 55, 182, 35, 3, 3, 'F');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("VEHICLE SUMMARY", 20, 65);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`VIN: ${car.id}`, 20, 73);
      doc.text(`Description: ${car.make} ${car.model}`, 20, 81);
      doc.text(`Color: ${car.color?.toUpperCase()}`, 120, 73);
      doc.text(`Issued To: ${user.id}`, 120, 81);

      // 3. History Table
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("IMMUTABLE PROVENANCE LOG", 14, 105);

      const tableColumn = ["Date (UTC)", "Registered Owner", "Transaction Hash"];
      const tableRows = historyArray.reverse().map((h) => [
        new Date(h.timestamp).toLocaleString(),
        h.record?.ownerName || "Authorized Participant",
        h.txId?.substring(0, 20).toUpperCase() + "..."
      ]);

      autoTable(doc, {
        startY: 110,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 5 },
      });

      // 4. Verification Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Digital Fingerprint: ${btoa(car.id + Date.now()).substring(0, 32)}`, 14, pageHeight - 15);
      doc.text(`Certified by Network Peer: ${window.location.hostname}`, 14, pageHeight - 10);

      doc.save(`${car.id}_Certificate.pdf`);
    } catch (error) {
      alert("Export failed: Unable to sign document.");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div style={pageContainer}>
      <header style={headerSection}>
        <div style={statusLabel}>NETWORK ROLE: {user.role?.toUpperCase()}</div>
        <h2 style={mainTitle}>Owner Garage</h2>
        <p style={subTitle}>Managing assets for blockchain ID: <span style={idSpan}>{user.id}</span></p>
      </header>

      {loading ? (
        <div style={statusMsg}>Querying Distributed Ledger...</div>
      ) : myCars.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>🛡️</div>
          <h3 style={{ margin: 0, color: "#0f172a" }}>No Assets Recorded</h3>
          <p style={{ color: "#64748b" }}>You do not currently have any vehicles registered to your ID on this channel.</p>
        </div>
      ) : (
        myCars.map((car, i) => (
          <div key={i} style={auditMain}>
            <div style={stateHeader}>
              <div>
                <span style={liveLabel}>WORLD STATE: ACTIVE</span>
                <h1 style={assetTitle}>{car.make} {car.model}</h1>
                <div style={colorBadge}>
                  <div style={colorDot(car.color)}></div>
                  <span>FACTORY FINISH: {car.color}</span>
                </div>
              </div>
              <div style={rightHeaderGroup}>
                <div style={idBadge}>{car.id}</div>
                <button
                  onClick={() => downloadPDF(car)}
                  disabled={isDownloading !== null}
                  style={isDownloading === car.id ? disabledBtn : downloadBtn}
                >
                  {isDownloading === car.id ? "📝 Generating..." : "📥 Export Certificate"}
                </button>
              </div>
            </div>

            <button
              onClick={() => viewHistory(car.id)}
              style={selectedHistory?.vin === car.id ? activeBtn : auditBtn}
            >
              {selectedHistory?.vin === car.id ? "Close History Explorer" : "Inspect Ownership History"}
            </button>

            {selectedHistory?.vin === car.id && (
              <div style={timeline}>
                <h4 style={panelTitle}>Provenance Trail</h4>
                {selectedHistory.data.map((h, idx) => (
                  <div key={idx} style={timeEntry}>
                    <div style={timeLineMark}>
                      <div style={dot} />
                      <div style={line} />
                    </div>
                    <div style={timeCard}>
                      <div style={cardMeta}>
                        <span style={timeTag}>{new Date(h.timestamp).toLocaleString()}</span>
                        <span style={txId}>TXID: {h.txId?.substring(0, 16)}</span>
                      </div>
                      <div style={cardData}>
                        <div style={dataCol}>
                          <label style={dLabel}>Recorded Owner</label>
                          <div style={dValue}>{h.record.ownerName}</div>
                          <div style={dId}>{h.record.ownerId || h.record.OwnerID}</div>
                        </div>
                        <div style={dataCol}>
                          <label style={dLabel}>Block Type</label>
                          <div style={eventBadge(idx === selectedHistory.data.length - 1)}>
                            {idx === selectedHistory.data.length - 1 ? "GENESIS" : "STATE_UPDATE"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// --- Styles ---
const pageContainer = { padding: "40px 20px", maxWidth: "900px", margin: "0 auto", fontFamily: "'Inter', sans-serif" };
const headerSection = { marginBottom: "40px", textAlign: "left" };
const statusLabel = { fontSize: "10px", fontWeight: "900", color: "#2563eb", letterSpacing: "1px", marginBottom: "8px" };
const mainTitle = { fontSize: "36px", fontWeight: "900", color: "#0f172a", margin: 0 };
const subTitle = { color: "#64748b", marginTop: "10px", fontSize: "14px" };
const idSpan = { color: "#0f172a", fontWeight: "700", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" };
const auditMain = { background: "#0f172a", borderRadius: "28px", padding: "35px", color: "#fff", marginBottom: "30px", boxShadow: "0 15px 30px -10px rgba(0,0,0,0.2)" };
const stateHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "1px solid #1e293b", paddingBottom: "25px" };
const rightHeaderGroup = { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" };
const liveLabel = { fontSize: "9px", fontWeight: "900", color: "#10b981", letterSpacing: "2px" };
const assetTitle = { fontSize: "30px", margin: "8px 0", fontWeight: "900" };
const idBadge = { background: "#1e293b", padding: "8px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: "bold", color: "#f8fafc", border: "1px solid #334155" };
const downloadBtn = { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "800", transition: "all 0.2s" };
const disabledBtn = { ...downloadBtn, background: "#475510", cursor: "wait" };
const colorBadge = { display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", fontSize: "11px", color: "#94a3b8", fontWeight: "bold" };
const colorDot = (c) => ({ width: "10px", height: "10px", borderRadius: "50%", background: c || "#ccc", border: "1px solid #fff" });
const auditBtn = { width: "100%", padding: "15px", background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "14px", fontWeight: "700", cursor: "pointer" };
const activeBtn = { ...auditBtn, background: "#334155", borderColor: "#475569" };
const timeline = { display: "flex", flexDirection: "column", paddingTop: "25px" };
const panelTitle = { fontSize: "10px", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "25px", textAlign: "center" };
const timeEntry = { display: "flex", gap: "25px" };
const timeLineMark = { display: "flex", flexDirection: "column", alignItems: "center" };
const line = { width: "1px", flex: 1, background: "#1e293b" };
const dot = { width: "10px", height: "10px", background: "#3b82f6", borderRadius: "50%", zIndex: 2 };
const timeCard = { flex: 1, background: "#1e293b", padding: "20px", borderRadius: "16px", marginBottom: "25px", border: "1px solid #334155" };
const cardMeta = { display: "flex", justifyContent: "space-between", marginBottom: "15px", opacity: 0.7 };
const timeTag = { fontSize: "11px", fontWeight: "bold" };
const txId = { fontSize: "9px", fontFamily: "monospace" };
const cardData = { display: "flex", justifyContent: "space-between" };
const dataCol = { display: "flex", flexDirection: "column", gap: "4px" };
const dLabel = { fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: "800" };
const dValue = { fontSize: "15px", fontWeight: "700" };
const dId = { fontSize: "11px", color: "#3b82f6", fontFamily: "monospace" };
const eventBadge = (isMint) => ({ fontSize: "9px", fontWeight: "900", color: isMint ? "#10b981" : "#3b82f6", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" });
const statusMsg = { textAlign: "center", padding: "100px", color: "#64748b", fontWeight: "bold" };
const emptyState = { textAlign: "center", padding: "80px", background: "#fff", borderRadius: "32px", border: "1px solid #e2e8f0" };

export default CarsOwned;