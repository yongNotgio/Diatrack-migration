import React, { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import Pagination from "./Pagination";
import RiskFilter from "./RiskFilter";
import "./Reports.css";

// ============================
// Helper: Build mini area chart config
// ============================
const buildMiniChartConfig = (label, historyData, color) => {
  const rgbaFrom = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return {
    data: {
      labels: historyData?.labels || [],
      datasets: [
        {
          label,
          data: historyData?.data || [],
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, rgbaFrom(color, 0.6));
            gradient.addColorStop(0.5, rgbaFrom(color, 0.3));
            gradient.addColorStop(1, rgbaFrom(color, 0.1));
            return gradient;
          },
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: "transparent",
          pointBorderColor: "transparent",
          pointBorderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 3,
          tension: 0.4,
          hoverBackgroundColor: rgbaFrom(color, 0.7),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 5, bottom: 5, left: 2, right: 2 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: color,
          borderWidth: 1,
          cornerRadius: 4,
          displayColors: false,
          callbacks: {
            title: (context) => `Month: ${context[0].label}`,
            label: (context) => `${label}: ${context.raw}`,
          },
        },
      },
      scales: {
        y: { display: false, beginAtZero: true, grid: { display: false } },
        x: { display: false, grid: { display: false } },
      },
      elements: {
        point: { radius: 0, hoverRadius: 0 },
        line: { borderWidth: 2 },
      },
      interaction: { intersect: false, mode: "index" },
    },
  };
};

// ============================
// ReportWidget Component
// ============================
const ReportWidget = ({ title, count, subtitle, icon, fallbackIcon, color, historyData, chartLabel, onViewClick, chartKey }) => {
  const chartConfig = buildMiniChartConfig(chartLabel || title, historyData, color);
  const hasData = historyData?.labels?.length > 0;

  return (
    <div className={`report-widget`}>
      <div className="report-widget-header">
        <img
          src={icon}
          alt={title}
          className="report-widget-image"
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackIcon; }}
        />
        <h4>{title}</h4>
        {onViewClick && (
          <button className="report-widget-view-button" onClick={onViewClick}>👁️ View</button>
        )}
      </div>
      <div className="report-widget-content">
        <div className="report-widget-left">
          <p className="report-number">{count}</p>
        </div>
        <div className="report-widget-right">
          <p className="report-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="mini-chart-container">
        {hasData ? (
          <Line key={chartKey} data={chartConfig.data} options={chartConfig.options} />
        ) : (
          <div className="no-chart-data">
            <p>No historical data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================
// Secretary Reports Overview (Widgets + Appointment & Lab Charts)
// ============================
export const SecretaryReportsOverview = ({
  // Widget data
  totalPatientsCount,
  fullComplianceCount,
  missingLogsCount,
  nonCompliantCount,
  // History data for mini charts
  patientCountHistory,
  fullComplianceHistory,
  missingLogsHistory,
  nonCompliantHistory,
  // Widget click handlers
  onWidgetClick,
  // Appointment chart
  appointmentChartData,
  loadingAppointments,
  appointmentError,
  // Lab submission chart
  labSubmissionChartData,
  loadingLabSubmissionData,
  labSubmissionError,
}) => {
  return (
    <div className="reports-section">
      <h2>Reports Overview</h2>

      {/* Reports Widgets Grid */}
      <div className="reports-widgets-grid">
        <ReportWidget
          title="Total Patients"
          count={totalPatientsCount}
          subtitle="Patients registered in the system"
          icon="/picture/total.png"
          fallbackIcon="https://placehold.co/40x40/1FAAED/ffffff?text=👥"
          color="#1FAAED"
          historyData={patientCountHistory}
          chartLabel="Total Patients"
          chartKey={`report-patient-count-chart-${patientCountHistory?.data?.join("-") || "empty"}`}
          onViewClick={() => onWidgetClick("total-patients")}
        />
        <ReportWidget
          title="Full Compliance"
          count={fullComplianceCount}
          subtitle="Patients with complete metrics (Blood Glucose, Blood Pressure, Wound Photos)"
          icon="/picture/full.svg"
          fallbackIcon="https://placehold.co/40x40/28a745/ffffff?text=✓"
          color="#28a745"
          historyData={fullComplianceHistory}
          chartLabel="Full Compliance"
          onViewClick={() => onWidgetClick("full-compliance")}
        />
        <ReportWidget
          title="Missing Logs"
          count={missingLogsCount}
          subtitle="Patients with at least 1 missing metric (Blood Glucose, Blood Pressure, Wound Photos)"
          icon="/picture/missinglogs.svg"
          fallbackIcon="https://placehold.co/40x40/ffc107/ffffff?text=⚠"
          color="#ffc107"
          historyData={missingLogsHistory}
          chartLabel="Missing Logs"
          onViewClick={() => onWidgetClick("missing-logs")}
        />
        <ReportWidget
          title="Non-Compliant Cases"
          count={nonCompliantCount}
          subtitle="High-risk patients with 3 missing metrics (Blood Glucose, Blood Pressure, Wound Photos)"
          icon="/picture/noncompliant.svg"
          fallbackIcon="https://placehold.co/40x40/dc3545/ffffff?text=✗"
          color="#dc3545"
          historyData={nonCompliantHistory}
          chartLabel="Non-Compliant Cases"
          onViewClick={() => onWidgetClick("non-compliant")}
        />
      </div>

      {/* Secretary: Appointment History + Lab Submission Report */}
      <div className="reports-content-row">
        {/* Appointment History Chart */}
        <div className="chart-container-reports">
          <h3>Appointment History</h3>
          {loadingAppointments && <p>Loading appointment data...</p>}
          {appointmentError && <p className="error-message">Error: {appointmentError}</p>}
          {!loadingAppointments && !appointmentError && appointmentChartData.labels.length > 0 && (
            <Bar
              data={appointmentChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                  title: { display: false },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    title: { display: true, text: "Week Period" },
                    categoryPercentage: 0.9,
                    barPercentage: 0.8,
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: "Number of Appointments" },
                  },
                },
              }}
            />
          )}
          {!loadingAppointments && !appointmentError && appointmentChartData.labels.length === 0 && (
            <p>No appointment data available for the last two weeks.</p>
          )}
        </div>

        {/* Lab Submission Report Chart */}
        <div className="chart-container-reports">
          <h3>Lab Submission Report</h3>
          {loadingLabSubmissionData && <p>Loading lab submission data...</p>}
          {labSubmissionError && <p className="error-message">Error: {labSubmissionError}</p>}
          {!loadingLabSubmissionData && !labSubmissionError && labSubmissionChartData.labels.length > 0 && (
            <Bar
              data={labSubmissionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (context) => context[0].label,
                      label: (context) => `Count: ${context.raw}`,
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    title: { display: true, text: "Lab Status Categories" },
                    categoryPercentage: 0.9,
                    barPercentage: 0.8,
                    ticks: { maxRotation: 45, minRotation: 45 },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: "Number of Patients" },
                  },
                },
              }}
            />
          )}
          {!loadingLabSubmissionData && !labSubmissionError && labSubmissionChartData.labels.length === 0 && (
            <p>No lab submission data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================
// Doctor Reports Overview (Widgets + Risk Classification & Phase Charts)
// ============================
export const DoctorReportsOverview = ({
  // Patients array for counts
  patients,
  // Compliance status helper
  getPatientComplianceStatus,
  // History data for mini charts
  appointmentChartData,
  fullComplianceChartData,
  missingLogsChartData,
  nonCompliantChartData,
  // Widget click handler
  onWidgetClick,
}) => {
  // Calculate counts
  const totalCount = patients.length;
  const fullComplianceCount = patients.filter((pat) => {
    const compliance = getPatientComplianceStatus(pat);
    return compliance.isFullCompliance;
  }).length;
  const missingLogsCount = patients.filter((pat) => {
    const compliance = getPatientComplianceStatus(pat);
    return compliance.isMissingLogs;
  }).length;
  const nonCompliantCount = patients.filter((pat) => {
    const compliance = getPatientComplianceStatus(pat);
    const isHighRisk = (pat.risk_classification || "").toLowerCase() === "high";
    return compliance.isNonCompliant && isHighRisk;
  }).length;

  // Risk counts for bar chart
  const lowRiskCount = patients.filter((p) => {
    const risk = (p.risk_classification || "").toLowerCase();
    return risk === "low" || risk === "low risk";
  }).length;
  const moderateRiskCount = patients.filter((p) => {
    const risk = (p.risk_classification || "").toLowerCase();
    return risk === "moderate" || risk === "moderate risk";
  }).length;
  const highRiskCount = patients.filter((p) => {
    const risk = (p.risk_classification || "").toLowerCase();
    return risk === "high" || risk === "high risk";
  }).length;

  // Phase counts for bar chart
  const preOpCount = patients.filter((p) => p.phase === "Pre-Operative").length;
  const postOpCount = patients.filter((p) => p.phase === "Post-Operative").length;

  return (
    <div className="reports-section">
      <h2>Reports Overview</h2>

      {/* Reports Widgets Grid */}
      <div className="reports-widgets-grid">
        <ReportWidget
          title="Total Patients"
          count={totalCount}
          subtitle="Patients registered in the system"
          icon="/picture/total.png"
          fallbackIcon="https://placehold.co/40x40/1FAAED/ffffff?text=👥"
          color="#1FAAED"
          historyData={appointmentChartData}
          chartLabel="Total Patients"
          chartKey={`report-patient-count-chart-${totalCount}`}
          onViewClick={() => onWidgetClick("total", "Total Patients")}
        />
        <ReportWidget
          title="Full Compliance"
          count={fullComplianceCount}
          subtitle="Patients with complete metrics (Blood Glucose, Blood Pressure, Wound Photos)"
          icon="/picture/full.svg"
          fallbackIcon="https://placehold.co/40x40/28a745/ffffff?text=✓"
          color="#28a745"
          historyData={fullComplianceChartData}
          chartLabel="Full Compliance"
          onViewClick={() => onWidgetClick("full-compliance", "Full Compliance Patients")}
        />
        <ReportWidget
          title="Missing Logs"
          count={missingLogsCount}
          subtitle="Patients missing at least one metric (Blood Glucose, Blood Pressure, or Wound Photos)"
          icon="/picture/missinglogs.svg"
          fallbackIcon="https://placehold.co/40x40/ffc107/ffffff?text=⚠"
          color="#ffc107"
          historyData={missingLogsChartData}
          chartLabel="Missing Logs"
          onViewClick={() => onWidgetClick("missing-logs", "Missing Logs Patients")}
        />
        <ReportWidget
          title="Non-Compliant"
          count={nonCompliantCount}
          subtitle="High risk patients with all 3 missing metrics (Blood Glucose, Blood Pressure, Wound Photos)"
          icon="/picture/noncompliant.svg"
          fallbackIcon="https://placehold.co/40x40/dc3545/ffffff?text=✗"
          color="#dc3545"
          historyData={nonCompliantChartData}
          chartLabel="Non-Compliant"
          onViewClick={() => onWidgetClick("non-compliant", "Non-Compliant Patients")}
        />
      </div>

      {/* Doctor: Risk Classification + Phase Bar Charts */}
      <div className="reports-content-row">
        {/* Risk Classification Bar Chart */}
        <div className="chart-container-reports">
          <h3>Patients by Risk Classification</h3>
          <Bar
            data={{
              labels: ["Low Risk", "Moderate Risk", "High Risk"],
              datasets: [
                {
                  label: "Number of Patients",
                  data: [lowRiskCount, moderateRiskCount, highRiskCount],
                  backgroundColor: [
                    "rgba(40, 167, 69, 0.7)",
                    "rgba(255, 193, 7, 0.7)",
                    "rgba(220, 53, 69, 0.7)",
                  ],
                  borderColor: ["#28a745", "#ffc107", "#dc3545"],
                  borderWidth: 2,
                  borderRadius: 8,
                  barThickness: 60,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 10, bottom: 30, left: 10, right: 10 } },
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const riskLevels = ["low-risk", "moderate-risk", "high-risk"];
                  const titles = ["Low Risk Patients", "Moderate Risk Patients", "High Risk Patients"];
                  onWidgetClick(riskLevels[index], titles[index]);
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  titleColor: "#fff",
                  bodyColor: "#fff",
                  borderColor: "#1FAAED",
                  borderWidth: 1,
                  cornerRadius: 8,
                  padding: 12,
                  displayColors: false,
                  callbacks: {
                    label: (context) => `Patients: ${context.raw}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, font: { size: 12, family: "Poppins" }, color: "#6c757d" },
                  grid: { color: "rgba(0, 0, 0, 0.05)", drawBorder: false },
                },
                x: {
                  ticks: { font: { size: 13, family: "Poppins", weight: "500" }, color: "#495057" },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>

        {/* Phase Bar Chart */}
        <div className="chart-container-reports">
          <h3>Patients by Phase</h3>
          <Bar
            data={{
              labels: ["Pre-Operative", "Post-Operative"],
              datasets: [
                {
                  label: "Number of Patients",
                  data: [preOpCount, postOpCount],
                  backgroundColor: ["rgba(141, 73, 247, 0.7)", "rgba(73, 247, 141, 0.7)"],
                  borderColor: ["#8D49F7", "#49F78D"],
                  borderWidth: 2,
                  borderRadius: 8,
                  barThickness: 80,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 10, bottom: 30, left: 10, right: 10 } },
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const phase = index === 0 ? "pre-operative" : "post-operative";
                  const title = index === 0 ? "Pre-Operative Patients" : "Post-Operative Patients";
                  onWidgetClick(phase, title);
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  titleColor: "#fff",
                  bodyColor: "#fff",
                  borderColor: "#1FAAED",
                  borderWidth: 1,
                  cornerRadius: 8,
                  padding: 12,
                  displayColors: false,
                  callbacks: {
                    label: (context) => `Patients: ${context.raw}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, font: { size: 12, family: "Poppins" }, color: "#6c757d" },
                  grid: { color: "rgba(0, 0, 0, 0.05)", drawBorder: false },
                },
                x: {
                  ticks: { font: { size: 13, family: "Poppins", weight: "500" }, color: "#495057" },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================
// Secretary Report Detail View (separate page for each widget category)
// ============================
export const SecretaryReportDetailView = ({
  reportDetailView,
  reportDetailPatients,
  currentPage,
  itemsPerPage,
  onPageChange,
  onBackClick,
  onEnterLabs,
  onViewPatient,
  onFlagPatient,
  getClassificationDisplay,
  healthMetricsSubmissions,
  message,
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = reportDetailPatients.slice(startIndex, endIndex);
  const totalPages = Math.ceil(reportDetailPatients.length / itemsPerPage);

  const titleMap = {
    "total-patients": "Total Patients",
    "full-compliance": "Full Compliance - Patients with Complete Metrics",
    "missing-logs": "Missing Logs - Patients with Missing Metrics",
    "non-compliant": "Non-Compliant Cases - High-Risk Patients with All Missing Metrics",
  };

  const emptyMessageMap = {
    "total-patients": "No patients found.",
    "full-compliance": "No patients with full compliance found.",
    "missing-logs": "No patients with missing logs found.",
    "non-compliant": "No non-compliant cases found.",
  };

  const showDaysSinceColumn = reportDetailView === "missing-logs";
  const showFlagAction = reportDetailView === "missing-logs";
  const colSpan = showDaysSinceColumn ? 8 : 7;

  return (
    <div className="report-detail-section">
      <div className="detail-view-header">
        <button className="back-to-list-button" onClick={onBackClick}>
          <img src="/picture/back.png" alt="Back" className="button-icon back-icon" /> Back to Reports
        </button>
        <h2>{titleMap[reportDetailView] || "Report Detail"}</h2>
      </div>

      {/* Message display for flag notifications (missing-logs view) */}
      {showFlagAction && message && (
        <div
          className="message-display"
          style={{
            padding: "10px",
            margin: "10px 0",
            borderRadius: "5px",
            backgroundColor: message.includes("✅") ? "#d4edda" : message.includes("⚠️") ? "#fff3cd" : message.includes("❌") ? "#f8d7da" : "#cce7ff",
            color: message.includes("✅") ? "#155724" : message.includes("⚠️") ? "#856404" : message.includes("❌") ? "#721c24" : "#004085",
            border: `1px solid ${message.includes("✅") ? "#c3e6cb" : message.includes("⚠️") ? "#ffeaa7" : message.includes("❌") ? "#f5c6cb" : "#bee5eb"}`,
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {message}
        </div>
      )}

      <table className="patient-table">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Age</th>
            <th>Sex</th>
            <th>Classification</th>
            <th>Lab Status</th>
            <th>Profile Status</th>
            {showDaysSinceColumn && <th>Days Since Last Submission</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((pat) => (
              <tr key={pat.patient_id}>
                <td className="patient-name-cell">
                  <div className="patient-name-container">
                    <img
                      src={pat.patient_picture || "/picture/secretary.png"}
                      alt="Patient Avatar"
                      className="patient-avatar-table"
                      onError={(e) => (e.target.src = "/picture/secretary.png")}
                    />
                    <span className="patient-name-text">{pat.first_name} {pat.last_name}</span>
                  </div>
                </td>
                <td>{pat.date_of_birth ? Math.floor((new Date() - new Date(pat.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"}</td>
                <td>{pat.gender || "N/A"}</td>
                <td
                  className={`classification-cell ${
                    pat.lab_status === "❌Awaiting"
                      ? "classification-awaiting"
                      : (pat.risk_classification || "").toLowerCase() === "low"
                      ? "classification-low"
                      : (pat.risk_classification || "").toLowerCase() === "moderate"
                      ? "classification-moderate"
                      : (pat.risk_classification || "").toLowerCase() === "high"
                      ? "classification-high"
                      : (pat.risk_classification || "").toLowerCase() === "ppd"
                      ? "classification-ppd"
                      : ""
                  }`}
                >
                  {getClassificationDisplay(pat)}
                </td>
                <td className={pat.lab_status === "✅Submitted" ? "lab-status-complete" : pat.lab_status === "❌Awaiting" ? "lab-status-awaiting" : ""}>
                  {pat.lab_status || "❌Awaiting"}
                </td>
                <td className={pat.profile_status === "Finalized" ? "status-complete" : "status-incomplete"}>
                  {pat.profile_status}
                </td>
                {showDaysSinceColumn && (
                  <td>
                    {(() => {
                      const lastSubmissionDate = healthMetricsSubmissions?.[pat.patient_id];
                      const daysPassed = lastSubmissionDate
                        ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(lastSubmissionDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
                        : "No Submission";
                      return (
                        <span className={`compliance-status ${daysPassed === "No Submission" ? "no-submission" : daysPassed > 7 ? "overdue" : daysPassed > 3 ? "warning" : "good"}`}>
                          {daysPassed}
                        </span>
                      );
                    })()}
                  </td>
                )}
                <td className="patient-actions-cell">
                  {showFlagAction ? (
                    <button className="action-btn flag-button" onClick={() => onFlagPatient(pat)} title="Flag patient for missing metrics and send notifications">
                      🚩 Flag
                    </button>
                  ) : (
                    <>
                      <button className="enter-labs-button" onClick={() => onEnterLabs(pat)}>🧪 Enter Labs</button>
                      <button className="view-button" onClick={() => onViewPatient(pat)}>👁️ View</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={colSpan}>{emptyMessageMap[reportDetailView] || "No patients found."}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {reportDetailPatients.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          totalItems={reportDetailPatients.length}
        />
      )}
    </div>
  );
};

// ============================
// Doctor Report Table View (separate page for each widget category)
// ============================
export const DoctorReportTableView = ({
  reportTableTitle,
  reportTableType,
  patients,
  searchTerm,
  onSearchChange,
  // Filters
  selectedRiskFilter,
  onRiskFilterChange,
  selectedLabStatusFilter,
  onLabStatusChange,
  selectedProfileStatusFilter,
  onProfileStatusChange,
  sortOrder,
  onSortOrderChange,
  // Pagination
  currentPage,
  itemsPerPage,
  onPageChange,
  // Helpers
  getLabStatus,
  getProfileStatus,
  getClassificationDisplay,
  getPatientComplianceStatus,
  healthMetricsSubmissions,
  // Actions
  onBackClick,
  onViewPatient,
  onPhaseToggle,
}) => {
  // Get filtered patients based on report type
  const getReportFilteredPatients = () => {
    switch (reportTableType) {
      case "total":
        return patients;
      case "full-compliance":
        return patients.filter((pat) => {
          const compliance = getPatientComplianceStatus(pat);
          return compliance.isFullCompliance;
        });
      case "missing-logs":
        return patients.filter((pat) => {
          const compliance = getPatientComplianceStatus(pat);
          return compliance.isMissingLogs;
        });
      case "non-compliant":
        return patients.filter((pat) => {
          const compliance = getPatientComplianceStatus(pat);
          const isHighRisk = (pat.risk_classification || "").toLowerCase() === "high";
          return compliance.isNonCompliant && isHighRisk;
        });
      case "low-risk":
        return patients.filter((p) => {
          const risk = (p.risk_classification || "").toLowerCase();
          return risk === "low" || risk === "low risk";
        });
      case "moderate-risk":
        return patients.filter((p) => {
          const risk = (p.risk_classification || "").toLowerCase();
          return risk === "moderate" || risk === "moderate risk";
        });
      case "high-risk":
        return patients.filter((p) => {
          const risk = (p.risk_classification || "").toLowerCase();
          return risk === "high" || risk === "high risk";
        });
      case "pre-operative":
        return patients.filter((p) => p.phase === "Pre-Operative");
      case "post-operative":
        return patients.filter((p) => p.phase === "Post-Operative");
      default:
        return patients;
    }
  };

  const filteredPatients = getReportFilteredPatients();

  // Apply search
  let displayPatients = filteredPatients.filter((patient) =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  // Apply additional filters
  if (selectedRiskFilter !== "all") {
    displayPatients = displayPatients.filter((patient) => {
      const risk = (patient.risk_classification || "").toLowerCase();
      return risk === selectedRiskFilter;
    });
  }

  if (selectedLabStatusFilter !== "all") {
    displayPatients = displayPatients.filter((patient) => {
      const labStatus = getLabStatus(patient.latest_lab_result);
      if (selectedLabStatusFilter === "awaiting") return labStatus === "Awaiting";
      if (selectedLabStatusFilter === "submitted") return labStatus === "Submitted";
      return true;
    });
  }

  if (selectedProfileStatusFilter !== "all") {
    displayPatients = displayPatients.filter((patient) => {
      const profileStatus = getProfileStatus(patient);
      if (selectedProfileStatusFilter === "pending") return profileStatus === "🟡Pending";
      if (selectedProfileStatusFilter === "finalized") return profileStatus === "🟢Finalized";
      return true;
    });
  }

  // Compute filter counts from the search-filtered patients (before risk/lab/profile filters)
  const searchFilteredPatients = filteredPatients.filter((patient) =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  const riskCounts = { all: searchFilteredPatients.length, low: 0, moderate: 0, high: 0, ppd: 0 };
  const labStatusCounts = { all: searchFilteredPatients.length, awaiting: 0, submitted: 0 };
  const profileStatusCounts = { all: searchFilteredPatients.length, pending: 0, finalized: 0 };

  searchFilteredPatients.forEach((patient) => {
    const risk = (patient.risk_classification || "").toLowerCase();
    if (risk === "low" || risk === "low risk") riskCounts.low++;
    else if (risk === "moderate" || risk === "moderate risk") riskCounts.moderate++;
    else if (risk === "high" || risk === "high risk") riskCounts.high++;
    else if (risk === "ppd") riskCounts.ppd++;

    const labStatus = getLabStatus(patient.latest_lab_result);
    if (labStatus === "Awaiting") labStatusCounts.awaiting++;
    else if (labStatus === "Submitted") labStatusCounts.submitted++;

    const profileStatus = getProfileStatus(patient);
    if (profileStatus === "🟡Pending") profileStatusCounts.pending++;
    else if (profileStatus === "🟢Finalized") profileStatusCounts.finalized++;
  });

  const totalPages = Math.ceil(displayPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = displayPatients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="patient-list-section">
      <button className="back-button3" onClick={onBackClick}>
        <img src="/picture/back.png" alt="Back" className="button-icon back-icon" />
        Back to Reports
      </button>
      <h2>{reportTableTitle}</h2>

      <div className="search-and-filter-row">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search patients by name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="patient-search-input"
          />
          <img src="/picture/search.svg" alt="Search" className="search-icon" />
        </div>

        <RiskFilter
          selectedRisk={selectedRiskFilter}
          onRiskChange={onRiskFilterChange}
          selectedLabStatus={selectedLabStatusFilter}
          onLabStatusChange={onLabStatusChange}
          selectedProfileStatus={selectedProfileStatusFilter}
          onProfileStatusChange={onProfileStatusChange}
          sortOrder={sortOrder}
          onSortOrderChange={onSortOrderChange}
          showCounts={true}
          counts={riskCounts}
          labStatusCounts={labStatusCounts}
          profileStatusCounts={profileStatusCounts}
        />
      </div>

      <table className="patient-table3">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Age</th>
            <th>Sex</th>
            <th>Classification</th>
            <th>Lab Status</th>
            <th>Profile Status</th>
            {reportTableType === "missing-logs" && <th>Days Since Last Submission</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPatients.length > 0 ? (
            paginatedPatients.map((patient) => (
              <tr key={patient.patient_id}>
                <td className="patient-name-cell">
                  <div className="patient-name-container">
                    <img
                      src={patient.patient_picture || "/picture/secretary.png"}
                      alt="Patient Avatar"
                      className="patient-avatar-table"
                      onError={(e) => (e.target.src = "/picture/secretary.png")}
                    />
                    <span className="patient-name-text">{patient.first_name} {patient.last_name}</span>
                  </div>
                </td>
                <td>{patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"}</td>
                <td>{patient.gender || "N/A"}</td>
                <td
                  className={`doctor-classification-cell ${
                    getLabStatus(patient.latest_lab_result) === "Awaiting"
                      ? "doctor-classification-awaiting"
                      : (() => {
                          const risk = (patient.risk_classification || "").toLowerCase();
                          if (risk === "low" || risk === "low risk") return "doctor-classification-low";
                          if (risk === "moderate" || risk === "moderate risk") return "doctor-classification-moderate";
                          if (risk === "high" || risk === "high risk") return "doctor-classification-high";
                          if (risk === "ppd") return "doctor-classification-ppd";
                          return "doctor-classification-default";
                        })()
                  }`}
                >
                  {getClassificationDisplay(patient)}
                </td>
                <td
                  className={
                    getLabStatus(patient.latest_lab_result) === "Submitted"
                      ? "lab-status-complete"
                      : getLabStatus(patient.latest_lab_result) === "Awaiting"
                      ? "lab-status-awaiting"
                      : "lab-status-awaiting"
                  }
                >
                  {getLabStatus(patient.latest_lab_result) === "Awaiting"
                    ? "❌Awaiting"
                    : getLabStatus(patient.latest_lab_result) === "Submitted"
                    ? "✅Submitted"
                    : getLabStatus(patient.latest_lab_result)}
                </td>
                <td className={getProfileStatus(patient) === "🟢Finalized" ? "status-complete" : "status-incomplete"}>
                  {getProfileStatus(patient)}
                </td>
                {reportTableType === "missing-logs" && (
                  <td>
                    {(() => {
                      const lastSubmissionDate = healthMetricsSubmissions?.[patient.patient_id];
                      const daysPassed = lastSubmissionDate
                        ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(lastSubmissionDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
                        : "No Submission";
                      return (
                        <span className={`compliance-status ${daysPassed === "No Submission" ? "no-submission" : daysPassed > 7 ? "overdue" : daysPassed > 3 ? "warning" : "good"}`}>
                          {daysPassed}
                        </span>
                      );
                    })()}
                  </td>
                )}
                <td className="patient-actions-cell">
                  <button className="view-button" onClick={() => onViewPatient(patient)}>👁️ View</button>
                  <button className="toggle-phase-button" onClick={() => onPhaseToggle(patient)} style={{ marginLeft: "8px" }}>
                    {patient.phase === "Pre-Operative" ? "🔄 Post-Op" : "🔄 Pre-Op"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={reportTableType === "missing-logs" ? "8" : "7"}>No patients found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemsPerPage={itemsPerPage}
          totalItems={displayPatients.length}
          showPageInfo={true}
        />
      )}
    </div>
  );
};

export default {
  SecretaryReportsOverview,
  DoctorReportsOverview,
  SecretaryReportDetailView,
  DoctorReportTableView,
};
