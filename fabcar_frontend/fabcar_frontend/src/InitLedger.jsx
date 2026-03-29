import { useState } from "react";
import { useNavigate } from "react-router-dom";

function InitLedgerPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInit = async () => {
    setLoading(true);
    
    try {
        // 1. Send the request to your Node.js Gateway
        const response = await fetch('http://localhost:4000/init-ledger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // 2. Wait for the Blockchain to confirm (submitTransaction)
        const data = await response.json();

        if (response.ok) {
            alert("Success: " + data.message);
            // 3. Navigate back to dashboard only after successful ledger update
            navigate("/");
        } else {
            alert("Blockchain Error: " + data.error);
        }
    } catch (err) {
        // This catches network errors (e.g., if your Node.js server is off)
        console.error("Connection Refused:", err);
        alert("Failed to connect to the Gateway Server. Is it running on port 4000?");
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="form-container" style={{ textAlign: "center" }}>
      <h2>Ledger Initialization</h2>
      <p style={{ color: "#666" }}>
        This will populate the blockchain with 10 default sample vehicles. Use
        this only for first-time setup or testing.
      </p>
      <button
        onClick={handleInit}
        disabled={loading}
        style={{
          backgroundColor: "#fe4545ff",
          color: "white",
          fontSize: "20px",
          padding: "15px 30px",
        }}
      >
        {loading ? "Initializing..." : "Run InitLedger"}
      </button>
      <br />
      <button
        onClick={() => navigate("/")}
        className="cancel-btn"
        style={{
          marginTop: "20px",
          background: "none",
          border: "1px solid #ccc",
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default InitLedgerPage;
