import { useNavigate } from "react-router-dom";

function Dashboard({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all local storage and session data
    localStorage.removeItem("user");
    localStorage.clear(); 
    
    // Using window.location.href ensures a full clean state reload
    window.location.href = "/login"; 
  };

  return (
    <div style={container}>
      <div style={welcomeSection}>
        <div style={headerRow}>
          <div style={roleBadge}>{user.role} Identity</div>
          <button onClick={handleLogout} style={logoutBtn}>Logout</button>
        </div>
        <h1 style={greeting}>Welcome back, {user.name}</h1>
        <p style={subText}>
          Network Node ID: <code style={idCode}>{user.id}</code>
        </p>
        
        <p style={statusNotice}>
          Channel: <span style={{ color: "#2563eb", fontWeight: "700" }}>mychannel</span> | 
          Status: <span style={{ color: "#10b981", fontWeight: "700" }}> ● Synchronized</span>
        </p>
      </div>

      <div style={cardGrid}>
        
        {/* --- GLOBAL REGISTRY (Dealer & Regulator) --- */}
        {["Dealer", "Regulator"].includes(user.role) && (
          <div style={primaryCard} onClick={() => navigate("/queryall")}>
            <div style={iconBox}>🌐</div>
            <h3 style={cardTitle}>Global Registry</h3>
            <p style={primaryCardDesc}>
                Access the full World State. View every vehicle asset currently validated on the distributed ledger.
            </p>
            <span style={actionLink}>Explore Ledger →</span>
          </div>
        )}

        {/* --- GOVERNANCE & APPROVALS (Regulator Only) --- */}
        {user.role === "Regulator" && (
          <div style={approvalCard} onClick={() => navigate("/pending-approvals")}>
            <div style={iconBox}>⚖️</div>
            <h3 style={cardTitle}>Governance & Approvals</h3>
            <p style={primaryCardDesc}>
                Review pending registration requests. Approve identities to grant X.509 certificates and ledger access.
            </p>
            <span style={actionLinkGold}>Review Requests →</span>
          </div>
        )}

        {/* --- MINT ASSET (Dealer Only) --- */}
        {user.role === "Dealer" && (
          <div style={whiteCard} onClick={() => navigate("/create")}>
            <div>
              <div style={iconBoxSmall}>🏗️</div>
              <h3 style={cardTitle}>Mint New Asset</h3>
              <p style={cardDesc}>
                  Initialize a new vehicle VIN. This creates the 'Genesis Block' for a new asset lifecycle.
              </p>
            </div>
            <span style={actionLinkBlue}>Create Asset →</span>
          </div>
        )}

        {/* --- OWNER SECTIONS (Updated to match 'Owner' role) --- */}
        {user.role === "Owner" && (
          <>
            <div style={primaryCard} onClick={() => navigate(`/my-cars`)}>
              <div style={iconBox}>🏠</div>
              <h3 style={cardTitle}>My Garage</h3>
              <p style={primaryCardDesc}>
                  View your registered vehicles, audit their history, and export digital certificates.
              </p>
              <span style={actionLink}>Open Garage →</span>
            </div>
            <div style={whiteCard} onClick={() => navigate("/changeowner")}>
              <div>
                <div style={iconBoxSmall}>🤝</div>
                <h3 style={cardTitle}>Transfer Ownership</h3>
                <p style={cardDesc}>
                    Execute a smart contract to transfer your vehicle title to another verified blockchain identity.
                </p>
              </div>
              <span style={actionLinkBlue}>Start Transfer →</span>
            </div>
          </>
        )}

        {/* --- REGULATOR ONLY: AUDIT --- */}
        {user.role === "Regulator" && (
          <>
            <div style={whiteCard} onClick={() => navigate("/history")}>
              <div>
                <div style={iconBoxSmall}>📜</div>
                <h3 style={cardTitle}>Provenance Audit</h3>
                <p style={cardDesc}>
                    Perform deep-packet audits on vehicle lifecycles to ensure regulatory compliance.
                </p>
              </div>
              <span style={actionLinkBlue}>View History →</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const container = { maxWidth: "1100px", margin: "0 auto", padding: "60px 20px", fontFamily: "'Inter', sans-serif" };
const welcomeSection = { marginBottom: "50px" };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" };
const roleBadge = { display: "inline-block", background: "#eff6ff", color: "#2563eb", padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" };
const logoutBtn = { background: "#fff", border: "1px solid #e2e8f0", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "700", color: "#ef4444", transition: "0.2s" };
const greeting = { fontSize: "42px", fontWeight: "900", color: "#0f172a", margin: "0 0 10px 0", letterSpacing: "-1px" };
const subText = { color: "#64748b", fontSize: "16px", margin: "0 0 10px 0" };
const statusNotice = { fontSize: "13px", color: "#64748b", margin: 0, background: "#f8fafc", display: "inline-block", padding: "5px 12px", borderRadius: "8px" };
const idCode = { background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", color: "#334155", fontFamily: "monospace", fontSize: "14px" };
const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "30px" };

const primaryCard = { 
  background: "#0f172a", padding: "45px", borderRadius: "32px", color: "#fff", cursor: "pointer", 
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", transition: "transform 0.2s ease", border: "1px solid #1e293b"
};

const approvalCard = {
  ...primaryCard,
  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
  border: "1px solid #334155"
};

const whiteCard = { 
  background: "#fff", padding: "40px", borderRadius: "32px", border: "1px solid #e2e8f0", cursor: "pointer",
  display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.2s ease", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
};

const iconBox = { fontSize: "48px", marginBottom: "25px" };
const iconBoxSmall = { fontSize: "36px", marginBottom: "20px" };
const cardTitle = { margin: "0 0 12px 0", fontSize: "22px", fontWeight: "800" };
const cardDesc = { margin: 0, fontSize: "15px", color: "#64748b", lineHeight: "1.6" };
const primaryCardDesc = { ...cardDesc, color: "#94a3b8" };
const actionLink = { marginTop: "30px", display: "block", fontSize: "14px", fontWeight: "800", color: "#60a5fa" };
const actionLinkBlue = { marginTop: "30px", display: "block", fontSize: "14px", fontWeight: "800", color: "#2563eb" };
const actionLinkGold = { marginTop: "30px", display: "block", fontSize: "14px", fontWeight: "800", color: "#fbbf24" };

export default Dashboard;