export default function RecommendationsPage() {
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
        padding: "60px",
        borderRadius: "24px",
        color: "white",
        textAlign: "center",
        marginBottom: "40px"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>⭐</div>
        <h1 style={{ fontSize: "48px", margin: "0 0 16px 0" }}>Candidate Recommendation</h1>
        <p style={{ fontSize: "20px", opacity: 0.9 }}>AI-powered candidate matching</p>
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
          <li>Get AI-powered candidate rankings</li>
          <li>Match skills to job requirements</li>
          <li>View compatibility scores</li>
          <li>Export recommendations</li>
        </ul>
      </div>
    </div>
  );
}