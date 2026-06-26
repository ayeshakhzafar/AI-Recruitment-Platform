import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { HR_THEME, HR_CHART } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

const COLORS = {
  bar1: HR_CHART.forest,
  bar2: HR_CHART.deep,
  teal: HR_THEME.emerald,
  pink: HR_CHART.muted,
  orange: "#ca8a04",
  navy: HR_THEME.textHeading,
  emerald: HR_THEME.primary,
  amber: "#d97706",
  sky: HR_THEME.primarySoft,
  slate: HR_CHART.deep,
  dark: HR_THEME.textHeading,
  black: "#000000",
};

const CHART_COLORS = {
  applied: HR_CHART.forest,
  screened: HR_CHART.deep,
  interviewed: HR_THEME.primarySoft,
  offered: HR_THEME.emerald,
  hired: HR_CHART.mint,
  rejected: HR_CHART.muted,
};

const od = HR_THEME.overviewDensity;
const cardStyle = {
  background: HR_THEME.bgCard,
  borderRadius: od.cardRadius,
  boxShadow: HR_THEME.shadowCard,
  padding: od.cardPadding,
  border: HR_THEME.borderSubtle,
};

const tooltipStyle = {
  background: HR_THEME.forest,
  border: "1px solid rgba(167, 243, 208, 0.25)",
  borderRadius: 10,
  color: "#ecfdf5",
  fontSize: 12,
};

function StatCard({ title, value, sub, accent, icon, featured }) {
  if (featured) {
    return (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(145deg, ${HR_THEME.primaryStrong} 0%, ${HR_THEME.primary} 52%, #1e3a8a 100%)`,
          borderRadius: od.cardRadius,
          boxShadow: "0 8px 24px rgba(37, 99, 235, 0.28)",
          padding: od.cardPadding,
          border: "1px solid rgba(147, 197, 253, 0.22)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: "rgba(255,255,255,0.82)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{value}</span>
            {icon && <span style={{ fontSize: 18, opacity: 0.95 }}>{icon}</span>}
          </div>
          {sub && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>{sub}</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 72,
          height: 72,
          background: `linear-gradient(135deg, ${accent}26, transparent)`,
          borderRadius: "0 14px 0 100%",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            color: HR_THEME.textMuted,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: HR_THEME.textHeading, letterSpacing: "-0.02em" }}>
            {value}
          </span>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        </div>
        {sub && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: HR_THEME.textMuted, fontWeight: 500 }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default function HRDashboardOverview({
  candidates,
  approvedCandidates,
  assessments,
  testResults,
  passingThreshold,
  userName = "there",
  onGoToModule,
}) {
  const [timeRange, setTimeRange] = useState(6);
  const passedCount = useMemo(
    () =>
      testResults.filter(
        (r) => (r.score_percentage || r.score || 0) >= passingThreshold
      ).length,
    [testResults, passingThreshold]
  );
  const failedCount = testResults.length - passedCount;
  const candidatesWithScore = testResults.filter(r => (r.score_percentage || r.score || 0) >= passingThreshold);
  
  const funnelData = useMemo(() => [
    { name: "Applied", value: candidates.length, fill: CHART_COLORS.applied },
    { name: "Screened", value: Math.floor(candidates.length * 0.6), fill: CHART_COLORS.screened },
    { name: "Interviewed", value: approvedCandidates.length, fill: CHART_COLORS.interviewed },
    { name: "Offered", value: Math.floor(approvedCandidates.length * 0.4), fill: CHART_COLORS.offered },
    { name: "Hired", value: candidatesWithScore.length, fill: CHART_COLORS.hired },
  ], [candidates.length, approvedCandidates.length, candidatesWithScore.length]);

  const skillsData = useMemo(() => {
    const skillMap = {};
    candidates.forEach(c => {
      if (c.skills && Array.isArray(c.skills)) {
        c.skills.forEach(s => {
          const key = s.toLowerCase().trim();
          skillMap[key] = (skillMap[key] || 0) + 1;
        });
      }
    });
    return Object.entries(skillMap)
      .map(([skill, count]) => ({ skill: skill.slice(0, 12), count, fullMark: 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [candidates]);

  const weeklyTrend = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const added = candidates.filter(c => {
        if (!c.created_at) return false;
        const dt = new Date(c.created_at);
        return dt >= weekStart && dt <= weekEnd;
      }).length;
      
      const processed = testResults.filter(r => {
        if (!r.end_time) return false;
        const dt = new Date(r.end_time);
        return dt >= weekStart && dt <= weekEnd;
      }).length;
      
      weeks.push({
        week: `W${Math.ceil((now - weekStart) / (7 * 24 * 60 * 60 * 1000))}`,
        added,
        processed,
      });
    }
    return weeks;
  }, [candidates, testResults, timeRange]);

  const conversionRates = useMemo(() => {
    const total = candidates.length || 1;
    const screened = Math.floor(total * 0.6);
    const interviewed = approvedCandidates.length;
    const offered = Math.floor(interviewed * 0.4);
    const hired = candidatesWithScore.length;
    
    return [
      { stage: "Applied → Screen", rate: ((screened / total) * 100).toFixed(1) },
      { stage: "Screen → Interview", rate: ((interviewed / screened) * 100).toFixed(1) },
      { stage: "Interview → Offer", rate: ((offered / interviewed) * 100).toFixed(1) },
      { stage: "Offer → Hired", rate: ((hired / offered) * 100).toFixed(1) },
    ];
  }, [candidates.length, approvedCandidates.length, candidatesWithScore.length]);

  const scoreDistribution = useMemo(() => {
    const bins = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    testResults.forEach(r => {
      const score = r.score_percentage || r.score || 0;
      const bin = bins.find(b => score >= b.min && score <= b.max);
      if (bin) bin.count++;
    });
    return bins.map(b => ({ range: b.range, count: b.count }));
  }, [testResults]);

  const pipelineData = useMemo(
    () => [
      { name: "CV pool", count: candidates.length },
      { name: "Approved", count: approvedCandidates.length },
      { name: "Assessments", count: assessments.length },
      { name: "Completed", count: testResults.length },
    ],
    [candidates.length, approvedCandidates.length, assessments.length, testResults.length]
  );

  const monthlyData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]}`;
      const y = d.getFullYear();
      const m = d.getMonth();
      const completed = testResults.filter((r) => {
        if (!r.end_time) return false;
        const t = new Date(r.end_time);
        return t.getFullYear() === y && t.getMonth() === m;
      }).length;
      out.push({ month: label, completed });
    }
    return out;
  }, [testResults]);

  const pieData = useMemo(() => {
    if (testResults.length === 0) {
      const rows = [
        { name: "Awaiting tests", value: Math.max(0, approvedCandidates.length), color: COLORS.bar1 },
        { name: "CV pool", value: Math.max(0, candidates.length), color: "#cbd5e1" },
      ].filter((x) => x.value > 0);
      if (rows.length === 0) {
        return [{ name: "No data yet", value: 1, color: "#e2e8f0" }];
      }
      return rows;
    }
    const rows = [
      { name: "Passed", value: passedCount, color: COLORS.teal },
      { name: "Below threshold", value: failedCount, color: COLORS.pink },
    ].filter((x) => x.value > 0);
    return rows.length ? rows : [{ name: "No scores", value: 1, color: "#e2e8f0" }];
  }, [testResults.length, passedCount, failedCount, approvedCandidates.length, candidates.length]);

  const roleMix = useMemo(() => {
    const map = {};
    testResults.forEach((r) => {
      const role = r.role || "General";
      map[role] = (map[role] || 0) + 1;
    });
    const rows = Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 18 ? `${name.slice(0, 16)}…` : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    if (rows.length === 0) {
      return [
        { name: "CV intake", value: candidates.length },
        { name: "Pipeline", value: approvedCandidates.length },
      ];
    }
    return rows;
  }, [testResults, candidates.length, approvedCandidates.length]);

  const recentActivity = useMemo(() => {
    return [...testResults]
      .sort((a, b) => new Date(b.end_time || 0) - new Date(a.end_time || 0))
      .slice(0, 6);
  }, [testResults]);

  const avgScore =
    testResults.length > 0
      ? (
          testResults.reduce(
            (s, r) => s + (r.score_percentage || r.score || 0),
            0
          ) / testResults.length
        ).toFixed(1)
      : "—";

  return (
    <div className="hr-dash-overview hr-professional-page" style={{ fontFamily: HR_THEME.fontFamily }}>
      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${od.kpiMin}px, 1fr))`,
          gap: od.kpiGap,
          marginBottom: od.kpiRowMb,
        }}
      >
        <StatCard
          title="Total Candidates"
          value={candidates.length}
          sub="In CV pool"
          accent={COLORS.bar1}
          icon="📋"
          featured
        />
        <StatCard
          title="In Pipeline"
          value={approvedCandidates.length}
          sub="Ready for assessments"
          accent={COLORS.teal}
          icon="🎯"
        />
        <StatCard
          title="Assessments"
          value={assessments.length}
          sub="Active assessment links"
          accent={COLORS.pink}
          icon="📝"
        />
        <StatCard
          title="Avg. Score"
          value={`${avgScore}${avgScore === "—" ? "" : "%"}`}
          sub={`${passedCount} passed / ${testResults.length} total`}
          accent={COLORS.orange}
          icon="📊"
        />
      </div>

      {/* Charts row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${od.chartMin}px, 1fr))`,
          gap: od.chartGap,
          marginBottom: od.chartRowMb,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Recruitment pipeline
            </h3>
            <span style={{ fontSize: 10, color: HR_THEME.textMuted, fontWeight: 600 }}>VOLUME</span>
          </div>
          <div style={{ width: "100%", height: od.chartHBar }}>
            <ResponsiveContainer>
              <BarChart data={pipelineData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {pipelineData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index % 2 === 0 ? COLORS.bar1 : COLORS.bar2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: HR_THEME.textMuted }}>
            Stages from CV upload through completed MCQ attempts.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Outcomes mix
            </h3>
            <span style={{ fontSize: 10, color: HR_THEME.textMuted, fontWeight: 600 }}>PASS / FAIL</span>
          </div>
          <div style={{ width: "100%", height: od.chartHBar }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${od.chartMin}px, 1fr))`,
          gap: od.chartGap,
          marginBottom: od.chartRowMb,
        }}
      >
        <div style={{ ...cardStyle, gridColumn: "span 1" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
            Activity trend (6 months)
          </h3>
          <div style={{ width: "100%", height: od.chartHStd }}>
            <ResponsiveContainer>
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="completed" name="Tests completed" stroke={COLORS.bar2} strokeWidth={2} dot={{ fill: COLORS.bar2, r: 3 }} activeDot={{ r: 5 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
            Results by role
          </h3>
          <div style={{ width: "100%", height: od.chartHStd }}>
            <ResponsiveContainer>
              <BarChart data={roleMix} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART.grid} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Count" radius={[0, 8, 8, 0]} fill={COLORS.teal} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Enterprise Charts Row - Funnel & Skills */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${od.chartMinLg}px, 1fr))`,
          gap: od.chartGap,
          marginBottom: od.chartRowMb,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Recruiting Funnel
            </h3>
            <span style={{ fontSize: 10, padding: "4px 8px", background: HR_THEME.bgMuted, borderRadius: 4, color: HR_THEME.textMuted, fontWeight: 600 }}>
              STAGES
            </span>
          </div>
          <div style={{ width: "100%", height: od.chartHFunnel }}>
            <ResponsiveContainer>
              <FunnelChart margin={{ top: 6, right: 32, bottom: 6, left: 32 }}>
                <Tooltip contentStyle={tooltipStyle} />
                <Funnel data={funnelData} dataKey="value" nameKey="name" isAnimationActive>
                  <LabelList position="right" fill={HR_THEME.textHeading} stroke="none" fontSize={11} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Top Skills Demand
            </h3>
            <span style={{ fontSize: 10, padding: "4px 8px", background: HR_THEME.bgMuted, borderRadius: 4, color: HR_THEME.textMuted, fontWeight: 600 }}>
              SKILLS
            </span>
          </div>
          <div style={{ width: "100%", height: od.chartHStd }}>
            <ResponsiveContainer>
              <RadarChart data={skillsData}>
                <PolarGrid stroke={HR_CHART.grid} />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: HR_THEME.textMuted }} />
                <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fontSize: 10 }} axisLine={false} />
                <Radar name="Demand" dataKey="count" stroke={COLORS.bar1} fill={COLORS.bar1} fillOpacity={0.4} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Enterprise Charts Row - Weekly Trend & Score Distribution */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${od.chartMinLg}px, 1fr))`,
          gap: od.chartGap,
          marginBottom: od.chartRowMb,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Weekly Inflow vs Processing
            </h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: 6, border: HR_THEME.borderSubtle, fontSize: 12 }}
            >
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
            </select>
          </div>
          <div style={{ width: "100%", height: od.chartHStd }}>
            <ResponsiveContainer>
              <AreaChart data={weeklyTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART.grid} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="added" stroke={COLORS.sky} fill="url(#colorAdded)" strokeWidth={2} name="CVs Added" />
                <Area type="monotone" dataKey="processed" stroke={COLORS.emerald} fill="url(#colorProcessed)" strokeWidth={2} name="Processed" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
              Score Distribution
            </h3>
            <span style={{ fontSize: 10, padding: "4px 8px", background: HR_THEME.bgMuted, borderRadius: 4, color: HR_THEME.textMuted, fontWeight: 600 }}>
              ASSESSMENT
            </span>
          </div>
          <div style={{ width: "100%", height: od.chartHStd }}>
            <ResponsiveContainer>
              <BarChart data={scoreDistribution} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART.grid} vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: HR_THEME.textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={index} fill={index < 2 ? "#ef4444" : index < 3 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Rates Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(od.kpiMin - 8, 132)}px, 1fr))`,
          gap: od.kpiGap,
          marginBottom: od.kpiRowMb,
        }}
      >
        {conversionRates.map((cr, idx) => (
          <div
            key={idx}
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: od.cardPadding,
              background: idx === 0 ? `linear-gradient(135deg, ${COLORS.bar1}08, ${COLORS.bar2}08)` : idx === conversionRates.length - 1 ? `linear-gradient(135deg, ${COLORS.emerald}08, ${COLORS.teal}08)` : cardStyle.background,
            }}
          >
            <div style={{ fontSize: 10, color: HR_THEME.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {cr.stage}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: idx < 2 ? COLORS.bar1 : idx === conversionRates.length - 1 ? COLORS.emerald : COLORS.slate }}>
              {cr.rate}%
            </div>
          </div>
        ))}
      </div>

      {/* Recent + quick links */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${od.chartMin}px, 1fr))`, gap: od.chartGap }}>
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
            Recent assessments
          </h3>
          {recentActivity.length === 0 ? (
            <p style={{ color: HR_THEME.textMuted, fontSize: 12 }}>No completed tests yet. Send assessments from the Technical Assessment module.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recentActivity.map((r, i) => {
                const score = r.score_percentage || r.score || 0;
                const ok = score >= passingThreshold;
                return (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: i < recentActivity.length - 1 ? `1px solid ${HR_CHART.grid}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: HR_THEME.textHeading, fontSize: 13 }}>
                        {r.candidate_email || r.email || "Candidate"}
                      </div>
                      <div style={{ fontSize: 12, color: HR_THEME.textMuted }}>
                        {r.role || "—"} · {r.end_time ? new Date(r.end_time).toLocaleString() : "—"}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: ok ? "rgba(20, 184, 166, 0.15)" : "rgba(244, 114, 182, 0.15)",
                        color: ok ? "#0d9488" : "#db2777",
                      }}
                    >
                      {score.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: HR_THEME.textHeading }}>
            Quick modules
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { id: "cv", label: "CV processing", desc: "Upload & shortlist", emoji: "📄" },
              { id: "assessments", label: "Technical assessments", desc: "Email MCQ links", emoji: "📝" },
              { id: "coding", label: "Coding challenges", desc: "Manage code tests", emoji: "💻" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onGoToModule(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: od.cardRadius,
                  border: HR_THEME.borderSubtle,
                  background: "#fafafa",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, color: HR_THEME.textHeading, fontSize: 14 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: HR_THEME.textMuted }}>{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
