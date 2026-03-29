import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Approval() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH PENDING USERS FROM LEDGER ---
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/pending-users");
      const data = await response.json();
      
      // Ensure data is an array (Handle potential null/empty responses)
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- 2. HANDLE APPROVAL (TRIGGERS CA ENROLLMENT) ---
  const handleAction = async (userEmail, userRole, action) => {
    if (action === "Approve") {
      try {
        const response = await fetch("http://localhost:3000/api/approve-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            role: userRole
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || "Approval failed");
        }
        
        alert(`✅ Success! Identity generated and wallet secured for ${userEmail}`);
        fetchRequests(); // Refresh the list from the ledger
        
      } catch (err) {
        alert(`Governance Error: ${err.message}`);
      }
    } else {
      // In a real blockchain, rejection would involve a 'DeleteRequest' transaction
      alert("Rejection logic should be handled by a chaincode delete transaction.");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={topNav}>
        <button onClick={() => navigate("/")} style={backBtn}>← Dashboard</button>
        <button onClick={fetchRequests} style={refreshBtn}>🔄 Refresh Ledger</button>
      </div>

      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>🛡️ Identity Governance</h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Review and issue cryptographic certificates for network participants
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>Querying Ledger...</div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={th}>Applicant Email</th>
                <th style={th}>Requested Role</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    No pending registration requests found on the ledger.
                  </td>
                </tr>
              ) : (
                requests.map((req, i) => (
                  <tr key={i} style={rowStyle}>
                    <td style={td}>
                      <div style={{ fontWeight: "700" }}>{req.email}</div>
                    </td>
                    <td style={td}>
                      <span style={roleBadge}>{req.role}</span>
                    </td>
                    <td style={td}>
                      <span style={statusPending}>Pending Approval</span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button 
                          onClick={() => handleAction(req.email, req.role, "Approve")} 
                          style={approveBtn}
                        >
                          Verify & Enroll
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const containerStyle = { maxWidth: "1100px", margin: "40px auto", padding: "0 20px", fontFamily: "'Inter', sans-serif" };
const topNav = { display: "flex", justifyContent: "space-between", marginBottom: "20px" };
const cardStyle = { background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", overflow: "hidden" };
const headerStyle = { padding: "30px", borderBottom: "1px solid #f1f5f9" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const headerRow = { textAlign: "left", backgroundColor: "#f8fafc" };
const th = { padding: "15px 20px", fontSize: "11px", color: "#64748b", textTransform: "uppercase" };
const td = { padding: "20px", borderBottom: "1px solid #f1f5f9" };
const rowStyle = { transition: "background 0.2s" };
const roleBadge = { fontSize: "12px", color: "#2563eb", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" };
const statusPending = { color: "#92400e", background: "#fef3c7", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" };
const approveBtn = { background: "#10b981", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" };
const backBtn = { background: "none", border: "none", color: "#0f172a", fontWeight: "700", cursor: "pointer" };
const refreshBtn = { background: "#f1f5f9", border: "none", padding: "8px 12px", borderRadius: "8px", color: "#64748b", cursor: "pointer", fontWeight: "600" };

export default Approval;