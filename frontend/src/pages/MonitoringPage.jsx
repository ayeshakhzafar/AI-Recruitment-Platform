export default function MonitoringPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #84cc16 0%, #a3e635 100%)",
        padding: "60px",
        borderRadius: "24px",
        color: "white",
        textAlign: "center",
        marginBottom: "40px"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>👁️</div>
        <h1 style={{ fontSize: "48px", margin: "0 0 16px 0" }}>Candidate Monitoring</h1>
        <p style={{ fontSize: "20px", opacity: 0.9 }}>Track candidate progress and activities</p>
      </div>
      
      <div style={{
        background: "#f9fafb",
        padding: "40px",
        borderRadius: "16px",
        border: "2px solid #e5e7eb"
      }}>
        <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Coming Soon</h2>
        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1.6" }}>
          This module will allow you to:
        </p>
        <ul style={{ fontSize: "16px", color: "#6b7280", lineHeight: "2" }}>
          <li>Monitor candidate assessment progress</li>
          <li>Track suspicious activities</li>
          <li>View screen recordings</li>
          <li>Generate integrity reports</li>
        </ul>
      </div>
    </div>
  );
}