// ✅ FULL UPDATED Dashboard.jsx WITH HEADER NAVIGATION (Notes replaced with Appointment Schedule) AND TREATMENT PLAN SUMMARY

import React, { useState, useEffect, useCallback } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { logMedicationChange, logPatientDataChange, logSystemAction } from "./auditLogger";
import Header from "./components/Header";
import RiskFilter from "./components/RiskFilter";
import { DoctorReportsOverview, DoctorReportTableView } from "./components/Reports";
import Pagination from "./components/Pagination";
import AppointmentManagementSection from "./components/AppointmentManagementSection";
import PatientDetailView from "./components/PatientDetailView";
import "./Dashboard.css";
import logo from '/picture/logo.png'; // Make sure this path is correct
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Import Chart.js components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler);

// Helper function to convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (time24h) => {
  if (!time24h) return 'N/A';
  const [hours, minutes] = time24h.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Converts 0 (midnight) to 12 AM, 13 to 1 PM etc.
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper function to format date for charts (MMM DD, YYYY)
const formatDateForChart = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'N/A';
  }
};

// Helper function to format date to "Month Day, Year" format
const formatDateToReadable = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'N/A';
  }
};

// Helper function to determine lab status
const getLabStatus = (latestLabResult) => {
  if (!latestLabResult) {
    return 'Awaiting';
  }

  const requiredLabFields = [
    'Hba1c', 'ucr', 'got_ast', 'gpt_alt',
    'cholesterol', 'triglycerides', 'hdl_cholesterol', 'ldl_cholesterol',
    'urea', 'bun', 'uric', 'egfr'
  ];

  let allFieldsFilled = true;
  let hasAnyField = false;

  for (const field of requiredLabFields) {
    const value = latestLabResult[field];
    if (value === null || value === undefined || value === '') {
      allFieldsFilled = false;
    } else {
      hasAnyField = true;
    }
  }

  // If no fields have any value, status is Awaiting
  if (!hasAnyField) {
    return 'Awaiting';
  }
  
  // If all fields are filled, status is Submitted
  if (allFieldsFilled) {
    return 'Submitted';
  }
  
  // If some fields are filled but not all, status is Awaiting
  return 'Awaiting';
};

// Helper function to get classification display with colored indicator and phase
const getClassificationDisplay = (patient) => {
  const phase = patient.phase || 'Pre-Operative';
  const labStatus = getLabStatus(patient.latest_lab_result);
  const riskClassification = (patient.risk_classification || '').toLowerCase();
  
  // Shorten phase names
  const phaseDisplay = phase === 'Pre-Operative' ? 'Pre-Op' : phase === 'Post-Operative' ? 'Post-Op' : phase;
  
  // If lab status is Awaiting, show ⛔ with phase
  if (labStatus === 'Awaiting') {
    return `⛔${phaseDisplay}`;
  }
  
  // Otherwise, show color based on risk classification (for Submitted status)
  if (riskClassification === 'low' || riskClassification === 'low risk') {
    return `🟢${phaseDisplay}`;
  } else if (riskClassification === 'moderate' || riskClassification === 'moderate risk') {
    return `🟡${phaseDisplay}`;
  } else if (riskClassification === 'high' || riskClassification === 'high risk') {
    return `🔴${phaseDisplay}`;
  } else if (riskClassification === 'ppd') {
    return `⚪${phaseDisplay}`;
  } else if (riskClassification === 'n/a' || !riskClassification) {
    return `⚫${phaseDisplay}`;
  }
  
  // Default case (no risk classification available)
  return `⚫${phaseDisplay}`;
};

// Helper function to determine profile status
const getProfileStatus = (patient) => {
  if (
    patient &&
    patient.first_name && patient.first_name.trim() !== '' &&
    patient.last_name && patient.last_name.trim() !== '' &&
    patient.email && patient.email.trim() !== '' &&
    patient.date_of_birth && patient.date_of_birth.trim() !== '' &&
    patient.contact_info && patient.contact_info.trim() !== '' &&
    patient.gender && patient.gender.trim() !== '' &&
    patient.address && patient.address.trim() !== '' &&
    patient.allergies && patient.allergies.trim() !== '' &&
    patient.diabetes_type && patient.diabetes_type.trim() !== '' &&
    patient.smoking_status && patient.smoking_status.trim() !== ''
  ) {
    return '🟢Finalized';
  } else {
    return '🟡Pending';
  }
};

// Helper function to check patient compliance status for reports
const getPatientComplianceStatus = (patient) => {
  // Check if patient has submitted blood pressure, blood glucose, and wound photo
  let submittedItems = 0;
  
  // Check for blood pressure
  if (patient.has_blood_pressure) {
    submittedItems++;
  }
  
  // Check for blood glucose
  if (patient.has_blood_glucose) {
    submittedItems++;
  }
  
  // Check for wound photo
  if (patient.has_wound_photo) {
    submittedItems++;
  }
  
  return {
    submittedCount: submittedItems,
    isFullCompliance: submittedItems === 3,
    isMissingLogs: submittedItems < 3, // Any patient missing at least one metric
    isNonCompliant: submittedItems === 0
  };
};

// PatientSummaryWidget component for dashboard stats and charts
const PatientSummaryWidget = ({ totalPatients, pendingLabResults, preOp, postOp, lowRisk, moderateRisk, highRisk, patientCountHistory, pendingLabHistory }) => {

  // Debug logging to see what data we're working with
  console.log("PatientSummaryWidget - pendingLabResults:", pendingLabResults);
  console.log("PatientSummaryWidget - pendingLabHistory:", pendingLabHistory);
  console.log("PatientSummaryWidget - pendingLabHistory data length:", pendingLabHistory?.data?.length);
  console.log("PatientSummaryWidget - pendingLabHistory labels length:", pendingLabHistory?.labels?.length);

  // Calculate percentages for Patient Categories
  const totalPatientCategories = preOp + postOp;
  const preOpPercentage = totalPatientCategories > 0 ? (preOp / totalPatientCategories) * 100 : 0;
  const postOpPercentage = totalPatientCategories > 0 ? (postOp / totalPatientCategories) * 100 : 0;

  // Calculate percentages for Pre-Op Risk Classes
  const totalRiskClasses = lowRisk + moderateRisk + highRisk;
  const lowRiskPercentage = totalRiskClasses > 0 ? (lowRisk / totalRiskClasses) * 100 : 0;
  const moderateRiskPercentage = totalRiskClasses > 0 ? (moderateRisk / totalRiskClasses) * 100 : 0;
  const highRiskPercentage = totalRiskClasses > 0 ? (highRisk / totalRiskClasses) * 100 : 0;

  // Prepare data for the area chart
  const areaChartData = {
    labels: patientCountHistory?.labels || [],
    datasets: [
      {
        label: 'Total Patients',
        data: patientCountHistory?.data || [],
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return null;
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(31, 170, 237, 0.6)');
          gradient.addColorStop(0.5, 'rgba(31, 170, 237, 0.3)');
          gradient.addColorStop(1, 'rgba(31, 170, 237, 0.1)');
          return gradient;
        },
        borderColor: '#1FAAED', // Visible blue line
        borderWidth: 2, // Line thickness
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        pointBorderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0, // No points on hover
        pointHoverBackgroundColor: '#1FAAED',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
        tension: 0.4, // Smooth curves
        hoverBackgroundColor: 'rgba(31, 170, 237, 0.7)', // Slightly darker on hover
      },
    ],
  };

  // Prepare data for the submitted lab results area chart
  // This chart displays how many patients submitted their lab results each month
  const pendingLabChartData = {
    labels: pendingLabHistory?.labels?.length > 0 ? pendingLabHistory.labels : ['Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025'],
    datasets: [
      {
        label: 'Submitted Lab Results',
        data: pendingLabHistory?.data?.length > 0 ? pendingLabHistory.data : [0, 0, 0, 0, 0, 0],
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return null;
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(217, 19, 65, 0.6)');
          gradient.addColorStop(0.5, 'rgba(217, 19, 65, 0.3)');
          gradient.addColorStop(1, 'rgba(217, 19, 65, 0.1)');
          return gradient;
        },
        borderColor: '#D91341', // Visible red line
        borderWidth: 2, // Line thickness
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent',
        pointBorderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0, // No points on hover
        pointHoverBackgroundColor: '#D91341',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
        tension: 0.5, // Smooth curves (same as total patients chart)
        hoverBackgroundColor: 'rgba(217, 19, 65, 0.7)', // Slightly darker on hover
      },
    ],
  };

  const pendingLabChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 2,
        right: 2
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true, // Ensure tooltips are enabled
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#D91341',
        borderWidth: 1,
        cornerRadius: 4,
        displayColors: false, // Remove color box in tooltip
        callbacks: {
          title: function(context) {
            return `Month: ${context[0].label}`;
          },
          label: function(context) {
            return `Submitted Labs: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        display: false, // Hide y-axis
        beginAtZero: true,
        grid: {
          display: false
        }
      },
      x: {
        display: false, // Hide x-axis
        grid: {
          display: false
        }
      },
    },
    elements: {
      point: {
        radius: 0, // Hide points normally
        hoverRadius: 0, // No hover points
      },
      line: {
        borderWidth: 2, // Line thickness
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 5,
        bottom: 5,
        left: 2,
        right: 2
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true, // Ensure tooltips are enabled
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1FAAED',
        borderWidth: 1,
        cornerRadius: 4,
        displayColors: false, // Remove color box in tooltip
        callbacks: {
          title: function(context) {
            return `Month: ${context[0].label}`;
          },
          label: function(context) {
            return `Total Patients: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        display: false, // Hide y-axis
        beginAtZero: true,
        grid: {
          display: false
        }
      },
      x: {
        display: false, // Hide x-axis
        grid: {
          display: false
        }
      },
    },
    elements: {
      point: {
        radius: 0, // Hide points normally
        hoverRadius: 0, // No hover points
      },
      line: {
        borderWidth: 2, // Line thickness
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

   return (
    <>
      <div className="summary-widget-grid">
        <div className="summary-widget total-patients">
          <div className="summary-widget-header">
            <img src="/picture/total.png" alt="Total Patients" className="summary-widget-image" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/1FAAED/ffffff?text=🩺"; }}/>
            <h4>Total Patients</h4>
          </div>
          <div className="summary-widget-content">
            <div className="summary-widget-left">
              <p className="summary-number">{totalPatients}</p>
            </div>
            <div className="summary-widget-right">
              <p className="summary-subtitle">Patients who have been registered to the system</p>
            </div>
          </div>
          {/* Mini Area Chart for Patient Count History */}
          <div className="mini-chart-container">
            {patientCountHistory?.labels?.length > 0 ? (
              <Line 
                key={`patient-count-chart-${patientCountHistory?.data?.join('-') || 'empty'}`}
                data={areaChartData} 
                options={areaChartOptions} 
              />
            ) : (
              <div className="no-chart-data">
                <p>No patient data available</p>
              </div>
            )}
          </div>
        </div>
        <div className="summary-widget pending-lab-results">
          <div className="summary-widget-header">
            <img src="/picture/pending.png" alt="Pending Lab Results" className="summary-widget-image" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/40x40/ff9800/ffffff?text=🟡"; }}/>
            <h4>Pending Lab Results</h4>
          </div>
          <div className="summary-widget-content">
            <div className="summary-widget-left">
              <p className="summary-number">{pendingLabResults}</p>
            </div>
            <div className="summary-widget-right">
              <p className="summary-subtitle">Patients who have consulted the doctor, but still haven't turned over test results</p>
            </div>
          </div>
          {/* Mini Area Chart for Submitted Lab Results History */}
          <div className="mini-chart-container">
            {pendingLabHistory?.labels?.length > 0 ? (
              <Line 
                key={`pending-lab-chart-${pendingLabHistory?.data?.join('-') || 'empty'}`}
                data={pendingLabChartData} 
                options={pendingLabChartOptions} 
              />
            ) : (
              <div className="no-chart-data">
                <p>No lab submission data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="widget-side-by-side-container">
        <div className="patient-categories-widget small-widget">
          <h3>
            <img src="/picture/patients.svg" alt="Patients" className="widget-icon" /> Patient Categories
          </h3>
          <div className="progress-bars-container">
            <div className="progress-bar-row">
              <span className="progress-count">{preOp}</span>
              <div className="progress-bar-background">
                <div className="progress-bar-fill progress-bar-pre-op" style={{ width: `${preOpPercentage}%` }}></div>
              </div>
            </div>
            <div className="progress-bar-row">
              <span className="progress-count">{postOp}</span>
              <div className="progress-bar-background">
                <div className="progress-bar-fill progress-bar-post-op" style={{ width: `${postOpPercentage}%` }}></div>
              </div>
            </div>
          </div>
          <div className="legend-container">
            <div className="legend-item">
              <span className="legend-color-box legend-color-pre-op"></span>
              Pre-Op
            </div>
            <div className="legend-item">
              <span className="legend-color-box legend-color-post-op"></span>
              Post-Op
            </div>
          </div>
        </div>

        <div className="risk-classes-widget small-widget">
          <h3>
            <img src="/picture/preop.svg" alt="Pre-Op Risk" className="widget-icon" /> Pre-Op Risk Classes
          </h3>
          <div className="progress-bars-container">
            <div className="progress-bar-row">
              <span className="progress-count">{lowRisk}</span>
              <div className="progress-bar-background">
                <div className="progress-bar-fill progress-bar-low-risk" style={{ width: `${lowRiskPercentage}%` }}></div>
              </div>
            </div>
            <div className="progress-bar-row">
              <span className="progress-count">{moderateRisk}</span>
              <div className="progress-bar-background">
                <div className="progress-bar-fill progress-bar-moderate-risk" style={{ width: `${moderateRiskPercentage}%` }}></div>
              </div>
            </div>
            <div className="progress-bar-row">
              <span className="progress-count">{highRisk}</span>
              <div className="progress-bar-background">
                <div className="progress-bar-fill progress-bar-high-risk" style={{ width: `${highRiskPercentage}%` }}></div>
              </div>
            </div>
          </div>
          <div className="legend-container">
            <div className="legend-item">
              <span className="legend-color-box legend-color-low-risk"></span>
              Low Risk
            </div>
            <div className="legend-item">
              <span className="legend-color-box legend-color-moderate-risk"></span>
              Moderate Risk
            </div>
            <div className="legend-item">
              <span className="legend-color-box legend-color-high-risk"></span>
              High Risk
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


const Dashboard = ({ user, onLogout }) => {
  const convex = useConvex();
  const updateDoctorStatusMut = useMutation(api.doctors.updateStatus);
  const removePatientMut = useMutation(api.patients.remove);
  const updatePhaseMut = useMutation(api.patients.updatePhase);
  const incrementVisitsMut = useMutation(api.patients.incrementVisits);
  const createAppointmentMut = useMutation(api.appointments.create);
  const updateAppointmentMut = useMutation(api.appointments.update);
  const updateAppointmentStateMut = useMutation(api.appointments.updateState);
  const createMedicationMut = useMutation(api.medications.create);
  const updateMedicationMut = useMutation(api.medications.update);
  const removeMedicationMut = useMutation(api.medications.remove);
  const updateHealthMetricsMut = useMutation(api.healthMetrics.update);
  const updateLabMut = useMutation(api.patientLabs.update);

  const [activePage, setActivePage] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]); // Doctor's appointments
  const [patientAppointments, setPatientAppointments] = useState([]); // Patient-specific appointments
  const [allDoctors, setAllDoctors] = useState([]); // All registered doctors
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // Corrected: Initialized with useState
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientMetrics, setPatientMetrics] = useState([]);
  const [patientLabs, setPatientLabs] = useState([]); // New state for patient lab results
  const [woundPhotos, setWoundPhotos] = useState([]); // New state for wound photos
  const [patientDetailTab, setPatientDetailTab] = useState("profile"); // 'profile' or 'charts'

  // NEW: States for popup messages
  const [showUsersPopup, setShowUsersPopup] = useState(false);
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [showThreePhotoModal, setShowThreePhotoModal] = useState(false);
  
  // States for wound analysis API results
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [analysisSaved, setAnalysisSaved] = useState(false);

  // States for DiaSight DR detection
  const [isRunningDiaSight, setIsRunningDiaSight] = useState(false);
  const [diaSightRunningPatientId, setDiaSightRunningPatientId] = useState(null);
  const [diaSightResults, setDiaSightResults] = useState(null);
  const [showDiaSightModal, setShowDiaSightModal] = useState(false);
  const [diaSightError, setDiaSightError] = useState(null);

  // Dashboard analytics states
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [pendingLabResultsCount, setPendingLabResultsCount] = useState(0);
  const [preOpCount, setPreOpCount] = useState(0);
  const [postOpCount, setPostOpCount] = useState(0);
  const [lowRiskCount, setLowRiskCount] = useState(0);
  const [moderateRiskCount, setModerateRiskCount] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);

  // Chart data states for dashboard widgets
  const [appointmentChartData, setAppointmentChartData] = useState({
    labels: [],
    data: [],
  });
  const [labSubmissionChartData, setLabSubmissionChartData] = useState({
    labels: [],
    data: [],
  });
  const [fullComplianceChartData, setFullComplianceChartData] = useState({
    labels: [],
    data: [],
  });
  const [missingLogsChartData, setMissingLogsChartData] = useState({
    labels: [],
    data: [],
  });
  const [nonCompliantChartData, setNonCompliantChartData] = useState({
    labels: [],
    data: [],
  });

  // Patient list filtering and pagination states
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('all');
  const [selectedLabStatusFilter, setSelectedLabStatusFilter] = useState('all');
  const [showReportTable, setShowReportTable] = useState(false);
  const [reportTableType, setReportTableType] = useState(null);
  const [reportTableTitle, setReportTableTitle] = useState('');
  const [selectedProfileStatusFilter, setSelectedProfileStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // Sort by created_at: 'desc' = newest first, 'asc' = oldest first
  const [currentPagePatients, setCurrentPagePatients] = useState(1);
  const PATIENTS_PER_PAGE = 10;
  
  // DiaSight pagination states
  const [currentPageDiaSight, setCurrentPageDiaSight] = useState(1);
  const DIASIGHT_PATIENTS_PER_PAGE = 7;
  
  // Health metrics submission tracking
  const [healthMetricsSubmissions, setHealthMetricsSubmissions] = useState({});

  // Health metrics pagination states
  const [currentPageHealthMetrics, setCurrentPageHealthMetrics] = useState(1);
  const HEALTH_METRICS_PER_PAGE = 7;

  // Appointment management states
  const [appointmentForm, setAppointmentForm] = useState({
    doctorId: "",
    patientId: "",
    date: "",
    time: "",
    notes: ""
  });
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [message, setMessage] = useState("");
  const [appointmentsToday, setAppointmentsToday] = useState([]);
  const [currentPageAppointments, setCurrentPageAppointments] = useState(1);
  const APPOINTMENTS_PER_PAGE = 5;

  // New states for medication management (from previous iterations, for patient profile)
  const [patientMedications, setPatientMedications] = useState([]); // State for medications
  const [newMedication, setNewMedication] = useState({ name: '', dosage: '' }); // State for new medication input
  // Changed timeOfDay from string to array for checkboxes
  const [newMedicationFrequency, setNewMedicationFrequency] = useState({ timeOfDay: [], startDate: '' }); // State for new medication frequency input

  // New states for editing medication
  const [editingMedicationId, setEditingMedicationId] = useState(null);
  const [editMedicationData, setEditMedicationData] = useState({ name: '', dosage: '' });
  const [editMedicationFrequencyData, setEditMedicationFrequencyData] = useState({ timeOfDay: [], startDate: '' });

  // NEW: State for Treatment Plan forms (Step 1) - NOW ARRAYS FOR MULTIPLE ENTRIES
  const [diagnosisDetails, setDiagnosisDetails] = useState([{ id: Date.now(), text: '' }]); // Array of objects
  const [woundCareDetails, setWoundCareDetails] = useState([{ id: Date.now() + 1, text: '' }]);
  const [dressingDetails, setDressingDetails] = useState([{ id: Date.now() + 2, text: '' }]);

  // NEW: State for Treatment Plan forms (Step 2) - NOW ARRAYS FOR MULTIPLE ENTRIES
  const [medicationTreatmentPlan, setMedicationTreatmentPlan] = useState([{ id: Date.now() + 3, text: '' }]);
  const [importantNotes, setImportantNotes] = useState([{ id: Date.now() + 4, text: '' }]);
  const [followUpDetails, setFollowUpDetails] = useState([{ id: Date.now() + 5, text: '' }]);

  // NEW: State for enhanced patient profile features
  const [allPatientHealthMetrics, setAllPatientHealthMetrics] = useState([]); // For charts
  const [allWoundPhotos, setAllWoundPhotos] = useState([]); // For wound gallery
  const [woundPhotosLoading, setWoundPhotosLoading] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null); // For photo expansion
  const [selectedWoundPhoto, setSelectedWoundPhoto] = useState(null); // For treatment plan specific photo
  const [calendarDate, setCalendarDate] = useState(new Date()); // For calendar
  const [currentPatientSpecialists, setCurrentPatientSpecialists] = useState([]); // For specialist assignments
  const [fetchingPatientDetails, setFetchingPatientDetails] = useState(false); // To prevent multiple fetches
  const [selectedMetricsFilter, setSelectedMetricsFilter] = useState('all'); // For filtering health metrics charts by risk
  
  // Individual time period filters for each chart
  const [glucoseTimeFilter, setGlucoseTimeFilter] = useState('week'); // 'day', 'week', 'month'
  const [bpTimeFilter, setBpTimeFilter] = useState('week');
  const [riskTimeFilter, setRiskTimeFilter] = useState('week');
  const [riskScoreTimeFilter, setRiskScoreTimeFilter] = useState('week');

  // Doctor status state
  const [doctorIsIn, setDoctorIsIn] = useState(false);


  // Filter patient metrics based on selected risk filter
  const filteredPatientMetrics = React.useMemo(() => {
    if (selectedMetricsFilter === 'all') {
      return allPatientHealthMetrics;
    }
    return allPatientHealthMetrics.filter(metric => {
      const riskLevel = metric.risk_classification?.toLowerCase();
      return riskLevel === selectedMetricsFilter;
    });
  }, [allPatientHealthMetrics, selectedMetricsFilter]);

  // Helper function to filter metrics by time period
  const filterMetricsByTimePeriod = React.useCallback((metrics, timePeriod) => {
    console.log(`[filterMetricsByTimePeriod] Filtering ${metrics?.length || 0} metrics for period: ${timePeriod}`);
    
    if (!metrics || metrics.length === 0) {
      console.log('[filterMetricsByTimePeriod] No metrics to filter');
      return [];
    }
    
    const now = new Date();
    let filtered = [];
    
    if (timePeriod === 'day') {
      // For 'day' filter, show the 5 latest submitted dates regardless of actual date
      filtered = metrics
        .sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date)) // Sort by newest first
        .slice(0, 5) // Take the 5 latest submissions
        .reverse(); // Reverse to show oldest to newest for chart display
    } else {
      // For week and month filters, use the existing time-based logic
      filtered = metrics.filter(metric => {
        const metricDate = new Date(metric.submission_date);
        const diffTime = Math.abs(now - metricDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch(timePeriod) {
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          default:
            return true;
        }
      });
      
      // Sort by date ascending (oldest first) for time-based filters
      filtered = filtered.sort((a, b) => new Date(a.submission_date) - new Date(b.submission_date));
    }
    
    return filtered;
  }, []);

  // Filtered metrics for each chart based on their individual time filters
  const glucoseFilteredMetrics = React.useMemo(() => {
    console.log(`[glucoseFilteredMetrics] allPatientHealthMetrics length: ${allPatientHealthMetrics?.length || 0}`);
    console.log(`[glucoseFilteredMetrics] filteredPatientMetrics length: ${filteredPatientMetrics?.length || 0}`);
    const result = filterMetricsByTimePeriod(filteredPatientMetrics, glucoseTimeFilter);
    console.log(`[glucoseFilteredMetrics] Result length: ${result?.length || 0}`);
    return result;
  }, [filteredPatientMetrics, glucoseTimeFilter, filterMetricsByTimePeriod]);

  const bpFilteredMetrics = React.useMemo(() => {
    console.log(`[bpFilteredMetrics] Filtering ${filteredPatientMetrics?.length || 0} metrics`);
    const result = filterMetricsByTimePeriod(filteredPatientMetrics, bpTimeFilter);
    console.log(`[bpFilteredMetrics] Result length: ${result?.length || 0}`);
    return result;
  }, [filteredPatientMetrics, bpTimeFilter, filterMetricsByTimePeriod]);

  const riskFilteredMetrics = React.useMemo(() => {
    console.log(`[riskFilteredMetrics] Filtering ${filteredPatientMetrics?.length || 0} metrics`);
    const result = filterMetricsByTimePeriod(filteredPatientMetrics, riskTimeFilter);
    console.log(`[riskFilteredMetrics] Result length: ${result?.length || 0}`);
    return result;
  }, [filteredPatientMetrics, riskTimeFilter, filterMetricsByTimePeriod]);

  const riskScoreFilteredMetrics = React.useMemo(() => 
    filterMetricsByTimePeriod(filteredPatientMetrics, riskScoreTimeFilter),
    [filteredPatientMetrics, riskScoreTimeFilter, filterMetricsByTimePeriod]
  );

  // Fetch doctor status from database
  const fetchDoctorStatus = async () => {
    try {
      const data = await convex.query(api.doctors.getStatus, { id: user.doctor_id });
      if (data !== undefined) {
        setDoctorIsIn(data || false);
      }
    } catch (err) {
      console.error("Error fetching doctor status:", err);
    }
  };

  // Toggle doctor status in database
  const toggleDoctorStatus = async () => {
    const newStatus = !doctorIsIn;
    try {
      await updateDoctorStatusMut({ id: user.doctor_id, doctor_is_in: newStatus });
      setDoctorIsIn(newStatus);
      console.log(`Doctor status updated to: ${newStatus ? 'In' : 'Out'}`);
    } catch (err) {
      console.error("Error updating doctor status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Fetch doctor status on component mount
  useEffect(() => {
    fetchDoctorStatus();
  }, [user.doctor_id]);

  useEffect(() => {
    console.log("useEffect triggered - activePage:", activePage, "selectedPatient?.patient_id:", selectedPatient?.patient_id);
    
    if (activePage === "dashboard" || activePage === "patient-list" || activePage === "diasight") {
      fetchPatients();
    }
    if (activePage === "dashboard" || activePage === "appointments" || activePage === "reports") { // Added 'reports' here
        fetchAppointments();
        fetchAllDoctors(); // Fetch all doctors when viewing appointments
        fetchHealthMetricsSubmissions(); // Fetch health metrics submissions for reports
    }
    if (activePage === "patient-profile" && selectedPatient?.patient_id) {
      console.log("Calling fetchPatientDetails for patient:", selectedPatient.patient_id);
      fetchPatientDetails(selectedPatient.patient_id);
    }
  }, [activePage, user.doctor_id, selectedPatient?.patient_id]); // Only depend on patient_id, not the full object

  // Reset report table when changing pages
  useEffect(() => {
    if (activePage !== 'reports') {
      setShowReportTable(false);
      setReportTableType(null);
      setReportTableTitle('');
    }
  }, [activePage]);

  // Clear analysis results when navigating away from treatment plan
  useEffect(() => {
    if (activePage !== "treatment-plan") {
      setAnalysisResults(null);
      setAnalysisError(null);
      setAnalysisSaved(false);
      setIsLoadingAnalysis(false);
    }
  }, [activePage]);

  const fetchPatients = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch patients where this doctor is the preferred doctor + specialist patients
      const patientData = await convex.query(api.patients.listForDoctor, { doctorId: user.doctor_id });
      const preferredPatients = patientData.filter(p => p.relationship_type === 'preferred');
      const allPatients = patientData;

      if (allPatients.length === 0) {
        setPatients([]);
        setTotalPatientsCount(0);
        setPreOpCount(0);
        setPostOpCount(0);
        setLowRiskCount(0);
        setModerateRiskCount(0);
        setHighRiskCount(0);
        setLoading(false);
        return;
      }

      // Fetch latest risk classification for each patient from health_metrics
      const patientsWithRisk = await Promise.all(
        allPatients.map(async (patient) => {
          // Fetch ALL health metrics from ALL time for compliance checking
          let allHealthData = [];
          try {
            allHealthData = await convex.query(api.healthMetrics.listByPatient, { patientId: patient.patient_id });
          } catch (e) {
            console.error(`Error fetching health metrics for patient ${patient.patient_id}:`, e.message);
          }

          let riskClassification = null;
          let hasBloodGlucose = false;
          let hasBloodPressure = false;
          let hasWoundPhoto = false;

          if (allHealthData && allHealthData.length > 0) {
            const latestRisk = allHealthData.find(metric => metric.risk_classification !== null && metric.risk_classification !== undefined);
            if (latestRisk) {
              riskClassification = latestRisk.risk_classification;
            }
            
            allHealthData.forEach(metric => {
              if (!hasBloodGlucose && metric.blood_glucose !== null && metric.blood_glucose !== undefined && metric.blood_glucose !== '') {
                hasBloodGlucose = true;
              }
              if (!hasBloodPressure && ((metric.bp_systolic !== null && metric.bp_systolic !== undefined && metric.bp_systolic !== '') ||
                                       (metric.bp_diastolic !== null && metric.bp_diastolic !== undefined && metric.bp_diastolic !== ''))) {
                hasBloodPressure = true;
              }
              if (!hasWoundPhoto && metric.wound_photo_url !== null && metric.wound_photo_url !== undefined && metric.wound_photo_url !== '') {
                hasWoundPhoto = true;
              }
            });
          }

          // Fetch latest lab result
          let latestLabResult = null;
          try {
            latestLabResult = await convex.query(api.patientLabs.getLatestByPatient, { patientId: patient.patient_id });
          } catch (e) {
            console.error(`Error fetching lab results for patient ${patient.patient_id}:`, e.message);
          }

          return {
            ...patient,
            risk_classification: riskClassification,
            has_blood_glucose: hasBloodGlucose,
            has_blood_pressure: hasBloodPressure,
            has_wound_photo: hasWoundPhoto,
            latest_lab_result: latestLabResult
          };
        })
      );

      setPatients(patientsWithRisk);
      
      // Calculate dashboard metrics
      setTotalPatientsCount(patientsWithRisk.length);
      
      // Calculate counts for charts based on the new data
      let preOp = 0;
      let postOp = 0;
      let lowRisk = 0;
      let moderateRisk = 0;
      let highRisk = 0;
      let pendingLabs = 0;
      
      patientsWithRisk.forEach(patient => {
        // Patient Categories
        if (patient.phase === 'Pre-Operative') {
          preOp++;
        } else if (patient.phase === 'Post-Operative') {
          postOp++;
        }
        
        // Risk Classification  
        const risk = (patient.risk_classification || '').toLowerCase();
        console.log(`Patient ${patient.patient_id} (${patient.first_name} ${patient.last_name}) - Risk: "${patient.risk_classification}" -> Lowercase: "${risk}"`);
        
        if (risk === 'low' || risk === 'low risk') {
          lowRisk++;
          console.log(`✅ Counted as LOW risk. Total low: ${lowRisk}`);
        } else if (risk === 'moderate' || risk === 'moderate risk') {
          moderateRisk++;
          console.log(`✅ Counted as MODERATE risk. Total moderate: ${moderateRisk}`);
        } else if (risk === 'high' || risk === 'high risk') {
          highRisk++;
          console.log(`✅ Counted as HIGH risk. Total high: ${highRisk}`);
        } else {
          console.log(`✅ Not counted in any risk category (risk value: "${risk}")`);
        }
        
        // Pending Lab Results (patients with "Awaiting" lab status)
        // Count patients whose lab status is specifically "Awaiting"
        if (getLabStatus(patient.latest_lab_result) === 'Awaiting') {
          pendingLabs++;
        }
      });
      
      console.log('=== FINAL RISK COUNTS ===');
      console.log(`Low Risk: ${lowRisk}`);
      console.log(`Moderate Risk: ${moderateRisk}`);
      console.log(`High Risk: ${highRisk}`);
      console.log(`Total Risk Patients: ${lowRisk + moderateRisk + highRisk}`);
      console.log('========================');
      
      setPreOpCount(preOp);
      setPostOpCount(postOp);
      setLowRiskCount(lowRisk);
      setModerateRiskCount(moderateRisk);
      setHighRiskCount(highRisk);
      setPendingLabResultsCount(pendingLabs);

      // Generate chart data based on actual database records
      await generateChartData(patientsWithRisk);
    } catch (err) {
      setError("Error fetching patients: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate real chart data based on actual database records
  const generateChartData = async (patientsWithRiskData) => {
    // Generate last 6 months of data
    const months = [];
    const monthKeys = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    
    try {
      // Use the already-fetched patient data
      const allPatients = patientsWithRiskData.map(p => ({
        patient_id: p.patient_id,
        created_at: p.created_at,
      }));
      const specialistAssignments = await convex.query(api.patientSpecialists.listByDoctor, { doctorId: user.doctor_id });

      // Count patients registered per month (NOT cumulative)
      const patientData = monthKeys.map((monthKey) => {
        const [year, month] = monthKey.split('-');
        return allPatients.filter(p => {
          const createdDate = new Date(p.created_at);
          return createdDate.getFullYear() === parseInt(year) && 
                 (createdDate.getMonth() + 1) === parseInt(month);
        }).length;
      });

      // Fetch all lab submissions with their dates
      let allLabs = [];
      for (const p of allPatients) {
        try {
          const labs = await convex.query(api.patientLabs.listByPatient, { patientId: p.patient_id });
          allLabs.push(...(labs || []));
        } catch (e) { /* skip */ }
      }

      // Count lab submissions per month
      const labData = monthKeys.map((monthKey) => {
        const [year, month] = monthKey.split('-');
        return allLabs.filter(lab => {
          const labDate = new Date(lab.date_submitted);
          return labDate.getFullYear() === parseInt(year) && 
                 (labDate.getMonth() + 1) === parseInt(month);
        }).length;
      });

      setAppointmentChartData({
        labels: months,
        data: patientData,
      });
      
      setLabSubmissionChartData({
        labels: months,
        data: labData,
      });

      // Calculate full compliance per month (patients registered in THAT specific month with full compliance)
      const fullComplianceData = await Promise.all(monthKeys.map(async (monthKey) => {
        const [year, month] = monthKey.split('-');
        
        // Filter patients who were created in this specific month only
        const patientsInMonth = allPatients.filter(p => {
          const createdDate = new Date(p.created_at);
          return createdDate.getFullYear() === parseInt(year) && 
                 (createdDate.getMonth() + 1) === parseInt(month);
        });

        console.log(`Patients registered in ${monthKey}:`, patientsInMonth.length);

        // For each patient registered in this month, check if they have full compliance
        const fullComplianceCount = await Promise.all(patientsInMonth.map(async (patient) => {
          let allMetrics = [];
          try {
            allMetrics = await convex.query(api.healthMetrics.listByPatient, { patientId: patient.patient_id });
          } catch (e) {
            return false;
          }

          let hasBloodGlucose = false;
          let hasBloodPressure = false;
          let hasWoundPhoto = false;

          if (allMetrics && allMetrics.length > 0) {
            allMetrics.forEach(metric => {
              if (!hasBloodGlucose && metric.blood_glucose) hasBloodGlucose = true;
              if (!hasBloodPressure && (metric.bp_systolic || metric.bp_diastolic)) hasBloodPressure = true;
              if (!hasWoundPhoto && metric.wound_photo_url) hasWoundPhoto = true;
            });
          }

          // Patient is fully compliant if they have all 3 metrics from any time
          return hasBloodGlucose && hasBloodPressure && hasWoundPhoto;
        }));

        const count = fullComplianceCount.filter(Boolean).length;
        console.log(`Full compliance for ${monthKey}:`, count);
        return count;
      }));

      setFullComplianceChartData({
        labels: months,
        data: fullComplianceData,
      });

      // Calculate missing logs per month (patients registered in THAT specific month with missing logs)
      const missingLogsData = await Promise.all(monthKeys.map(async (monthKey) => {
        const [year, month] = monthKey.split('-');
        
        // Filter patients who were created in this specific month only
        const patientsInMonth = allPatients.filter(p => {
          const createdDate = new Date(p.created_at);
          return createdDate.getFullYear() === parseInt(year) && 
                 (createdDate.getMonth() + 1) === parseInt(month);
        });

        console.log(`Patients registered in ${monthKey}:`, patientsInMonth.length);

        // For each patient registered in this month, check if they have missing logs
        const missingLogsCount = await Promise.all(patientsInMonth.map(async (patient) => {
          let allMetrics = [];
          try {
            allMetrics = await convex.query(api.healthMetrics.listByPatient, { patientId: patient.patient_id });
          } catch (e) {
            return true;
          }

          let hasBloodGlucose = false;
          let hasBloodPressure = false;
          let hasWoundPhoto = false;

          if (allMetrics && allMetrics.length > 0) {
            allMetrics.forEach(metric => {
              if (!hasBloodGlucose && metric.blood_glucose) hasBloodGlucose = true;
              if (!hasBloodPressure && (metric.bp_systolic || metric.bp_diastolic)) hasBloodPressure = true;
              if (!hasWoundPhoto && metric.wound_photo_url) hasWoundPhoto = true;
            });
          }

          const submittedCount = (hasBloodGlucose ? 1 : 0) + (hasBloodPressure ? 1 : 0) + (hasWoundPhoto ? 1 : 0);
          // Patient has missing logs if they have less than 3 metrics (missing at least one)
          return submittedCount < 3;
        }));

        const count = missingLogsCount.filter(Boolean).length;
        console.log(`Missing logs for ${monthKey}:`, count);
        return count;
      }));

      console.log('Missing Logs Chart Data:', { labels: months, data: missingLogsData });

      setMissingLogsChartData({
        labels: months,
        data: missingLogsData,
      });

      // Calculate non-compliant per month (high risk patients with all 3 metrics missing from ALL TIME)
      const nonCompliantData = await Promise.all(monthKeys.map(async (monthKey) => {
        // Get high risk patients
        const highRiskPatients = allPatients.filter(p => {
          const patient = patientsWithRiskData.find(pat => pat.patient_id === p.patient_id);
          return patient && (patient.risk_classification || '').toLowerCase() === 'high';
        });

        console.log(`High risk patients for ${monthKey}:`, highRiskPatients.length);

        if (highRiskPatients.length === 0) return 0;

        // For each high-risk patient, check if they have NEVER submitted any of the 3 metrics
        const nonCompliantCount = await Promise.all(highRiskPatients.map(async (patient) => {
          let allMetrics = [];
          try {
            allMetrics = await convex.query(api.healthMetrics.listByPatient, { patientId: patient.patient_id });
          } catch (e) {
            return true;
          }

          let hasBloodGlucose = false;
          let hasBloodPressure = false;
          let hasWoundPhoto = false;

          if (allMetrics && allMetrics.length > 0) {
            allMetrics.forEach(metric => {
              if (!hasBloodGlucose && metric.blood_glucose) hasBloodGlucose = true;
              if (!hasBloodPressure && (metric.bp_systolic || metric.bp_diastolic)) hasBloodPressure = true;
              if (!hasWoundPhoto && metric.wound_photo_url) hasWoundPhoto = true;
            });
          }

          const submittedCount = (hasBloodGlucose ? 1 : 0) + (hasBloodPressure ? 1 : 0) + (hasWoundPhoto ? 1 : 0);
          // Non-compliant = 0 metrics submitted (all 3 missing from entire history)
          return submittedCount === 0;
        }));

        const count = nonCompliantCount.filter(Boolean).length;
        console.log(`Non-compliant for ${monthKey}:`, count);
        return count;
      }));

      console.log('Non-Compliant Chart Data:', { labels: months, data: nonCompliantData });

      setNonCompliantChartData({
        labels: months,
        data: nonCompliantData,
      });

    } catch (error) {
      console.error('Error generating chart data:', error);
      // Fallback to empty data
      setAppointmentChartData({
        labels: months,
        data: new Array(6).fill(0),
      });
      
      setLabSubmissionChartData({
        labels: months,
        data: new Array(6).fill(0),
      });

      setFullComplianceChartData({
        labels: months,
        data: new Array(6).fill(0),
      });

      setMissingLogsChartData({
        labels: months,
        data: new Array(6).fill(0),
      });

      setNonCompliantChartData({
        labels: months,
        data: new Array(6).fill(0),
      });
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await convex.query(api.appointments.listByDoctor, { doctorId: user.doctor_id });
      // Filter to only future appointments
      const now = new Date().toISOString();
      const futureAppts = (data || []).filter(a => a.appointment_datetime >= now);
      futureAppts.sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));
      setAppointments(futureAppts);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const fetchAllDoctors = async () => {
    try {
      const data = await convex.query(api.doctors.list);
      setAllDoctors(data || []);
    } catch (err) {
      console.error("Error fetching all doctors:", err);
      setAllDoctors([]);
    }
  };

  const fetchHealthMetricsSubmissions = async () => {
    try {
      const data = await convex.query(api.healthMetrics.getSubmissions);

      // Create a map to store the most recent updated_at timestamp for each patient
      const lastSubmissions = new Map();
      (data || []).forEach((metric) => {
        if (!lastSubmissions.has(metric.patient_id)) {
          lastSubmissions.set(metric.patient_id, metric.updated_at);
        }
      });

      setHealthMetricsSubmissions(Object.fromEntries(lastSubmissions));
    } catch (error) {
      console.error("Error fetching health metrics submissions:", error);
      setHealthMetricsSubmissions({});
    }
  };

  const fetchPatientDetails = async (patientId) => {
    // Prevent multiple simultaneous fetches for the same patient
    if (fetchingPatientDetails) {
      console.log("Already fetching patient details, skipping...");
      return;
    }
    
    console.log(`Fetching details for patient ID: ${patientId}`);
    setFetchingPatientDetails(true);
    setLoading(true);
    setError("");
    try {
      // Fetch the patient with their assigned doctor information
      const patientData = await convex.query(api.patients.getById, { id: patientId });
      if (!patientData) throw new Error("Patient not found");
      setSelectedPatient(patientData);

      const metrics = await convex.query(api.healthMetrics.listByPatient, { patientId: patientId });
      console.log(`Fetched ${metrics?.length || 0} health metrics`);
      setPatientMetrics(metrics || []);
      setAllPatientHealthMetrics(metrics || []);

      // Filter for wound photos and set the state
      const photos = (metrics || []).filter(metric => metric.wound_photo_url).map(metric => ({
        metric_id: metric.metric_id || metric._id,
        url: metric.wound_photo_url,
        date: metric.submission_date,
        notes: metric.notes,
      }));
      setWoundPhotos(photos);
      setAllWoundPhotos(photos);

      // Fetch lab results for the patient
      const labs = await convex.query(api.patientLabs.listByPatient, { patientId: patientId });
      setPatientLabs(labs || []);

      // Fetch medications for the patient, including their frequencies
      const meds = await convex.query(api.medications.listByPatient, { patientId: patientId });

      // Fetch ALL medication schedules for this patient's medications
      const medIds = (meds || []).map(m => m.id || m._id);
      let schedules = [];
      if (medIds.length > 0) {
        schedules = await convex.query(api.medicationSchedules.listByMedications, { medicationIds: medIds });
      }

      // Process to determine status for each medication based on its LATEST schedule
      const medicationsWithStatus = (meds || []).map(med => {
        const medId = med.id || med._id;
        const relevantSchedules = schedules ? schedules.filter(s => s.medication_id === medId) : [];

        let status = "N/A";

        if (relevantSchedules.length > 0) {
          const latestSchedule = relevantSchedules[0];
          status = latestSchedule.taken ? "Taken" : "Not Yet";
        }

        return {
          ...med,
          overall_status: status
        };
      });

      setPatientMedications(medicationsWithStatus);

      // Fetch appointments for the selected patient
      const patientAppts = await convex.query(api.appointments.listByPatient, { patientId: patientId });
      setPatientAppointments(patientAppts || []);

      // Fetch specialist assignments for the selected patient
      const specialists = await convex.query(api.patientSpecialists.listByPatient, { patientId: patientId });
      setCurrentPatientSpecialists(specialists || []);

    } catch (err) {
      console.error("Error in fetchPatientDetails:", err);
      setError("Error fetching patient details: " + err.message);
    } finally {
      console.log("fetchPatientDetails completed, setting loading to false");
      setLoading(false);
      setFetchingPatientDetails(false);
    }
  };

  // Helper function to handle photo expansion
  const handleExpandPhoto = (photo) => {
    setExpandedPhoto(photo);
  };

  // Helper function to close expanded photo
  const handleCloseExpandedPhoto = () => {
    setExpandedPhoto(null);
  };

  // Helper function to check if date has appointments for calendar
  const getAppointmentsForDate = (date) => {
    return patientAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_datetime).toDateString();
      return appointmentDate === date.toDateString();
    });
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleViewClick = useCallback((patient) => {
    // Reset loading states when selecting a new patient
    setLoading(false);
    setFetchingPatientDetails(false);
    setError("");
    // Reset pagination when selecting new patient
    setCurrentPageHealthMetrics(1);
    setSelectedPatient(patient);
    setActivePage("patient-profile");
  }, []);

  const handleDeleteClick = async (patient) => {
    if (window.confirm(`Are you sure you want to delete patient ${patient.first_name} ${patient.last_name}?`)) {
      setLoading(true);
      setError("");
      try {
        await removePatientMut({ id: patient.patient_id });

        alert("Patient deleted successfully!");
        fetchPatients();
      } catch (err) {
        setError("Error deleting patient: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePhaseToggle = async (patient) => {
    const newPhase = patient.phase === 'Pre-Operative' ? 'Post-Operative' : 'Pre-Operative';
    
    if (window.confirm(`Are you sure you want to change ${patient.first_name} ${patient.last_name}'s phase from ${patient.phase} to ${newPhase}?`)) {
      setLoading(true);
      setError("");
      try {
        await updatePhaseMut({ id: patient.patient_id, phase: newPhase });

        // Log the phase change
        await logPatientDataChange(
          'doctor',
          user.doctor_id,
          `${user.first_name} ${user.last_name}`,
          patient.patient_id,
          'phase_update',
          'edit',
          `Phase changed from ${patient.phase} to ${newPhase}`,
          `Updated phase for ${patient.first_name} ${patient.last_name}`,
          'Doctor Dashboard - Patient Phase Management'
        );
        
        alert(`Patient phase updated to ${newPhase} successfully!`);
        fetchPatients(); // Refresh the patient list to show the updated phase
      } catch (err) {
        setError("Error updating patient phase: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // DiaSight DR Detection API call
  const handleRunDiaSight = async (patient) => {
    setIsRunningDiaSight(true);
    setDiaSightRunningPatientId(patient.patient_id);
    setDiaSightError(null);
    setDiaSightResults(null);
    
    try {
      // Fetch patient's latest lab results
      const latestLab = await convex.query(api.patientLabs.getLatestByPatient, { patientId: patient.patient_id });

      if (!latestLab) {
        throw new Error('No lab results found for this patient');
      }

      // Calculate age from date_of_birth
      let age = 0;
      if (patient.date_of_birth) {
        const birthDate = new Date(patient.date_of_birth);
        const today = new Date();
        age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      }

      // Fetch latest health metrics for blood pressure
      const latestMetrics = await convex.query(api.healthMetrics.listByPatient, { patientId: patient.patient_id });

      let sbp = 0, dbp = 0;
      if (latestMetrics && latestMetrics.length > 0) {
        sbp = latestMetrics[0].bp_systolic || 0;
        dbp = latestMetrics[0].bp_diastolic || 0;
      }

      // Prepare the request body for the ML model
      const requestBody = {
        age: age,
        hb1ac: latestLab.Hba1c || 0,
        duration: patient.diabetes_duration || 0,
        egfr: latestLab.egfr || 0,
        ldl: latestLab.ldl_cholesterol || 0,
        hdl: latestLab.hdl_cholesterol || 0,
        chol: latestLab.cholesterol || 0,
        sbp: sbp,
        dbp: dbp,
        hbp: patient.hypertensive ? 1 : 0,
        sex: patient.gender?.toLowerCase() === 'male' ? 1 : 0,
        uric: latestLab.uric || 0,
        bun: latestLab.bun || 0,
        urea: latestLab.urea || 0,
        trig: latestLab.triglycerides || 0,
        ucr: latestLab.ucr || 0,
        alt: latestLab.gpt_alt || 0,
        ast: latestLab.got_ast || 0,
        additionalProp1: {}
      };

      console.log('DiaSight API Request:', requestBody);

      // Call the DiaSight ML API
      const response = await fetch('https://yongnotgio12-diatrack.hf.space/api/v1/diasight/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('DiaSight API Response:', result);

      // Derive prediction from probabilities to ensure frontend matches actual classification
      let prediction = result.prediction;
      let confidence = result.confidence;
      if (result.probabilities) {
        const [topClass, topProb] = Object.entries(result.probabilities).reduce(
          (max, entry) => entry[1] > max[1] ? entry : max
        );
        prediction = topClass;
        confidence = topProb;
      }

      // Create the result object to store (optimized - only essential fields)
      const drResult = {
        timestamp: new Date().toISOString(),
        prediction,
        confidence,
        risk_score: result.risk_score
      };

      // Fetch current dr_class array and diasight_time array
      const currentLab = await convex.query(api.patientLabs.getLatestByPatient, { patientId: patient.patient_id });

      if (!currentLab) {
        throw new Error('Failed to fetch current lab data');
      }

      // Append new result to existing arrays
      const updatedDrClass = currentLab.dr_class ? [...currentLab.dr_class, drResult] : [drResult];
      const updatedDiasightTime = currentLab.diasight_time ? [...currentLab.diasight_time, new Date().toISOString()] : [new Date().toISOString()];

      // Update the patient_labs table
      await updateLabMut({ id: currentLab.lab_id, updates: { dr_class: updatedDrClass, diasight_time: updatedDiasightTime } });

      // Set the results for display
      setDiaSightResults({
        patient: patient,
        result: drResult,
        probabilities: result.probabilities, // Keep for modal display
        allResults: updatedDrClass
      });
      setShowDiaSightModal(true);

      // Log the action
      await logPatientDataChange(
        'doctor',
        user.doctor_id,
        `${user.first_name} ${user.last_name}`,
        patient.patient_id,
        'diasight_analysis',
        'create',
        null,
        `DiaSight DR detection run - Prediction: ${result.prediction}, Confidence: ${(result.confidence * 100).toFixed(1)}%`,
        'DiaSight - Patient Analysis'
      );

      // Refresh patient data
      fetchPatients();

    } catch (err) {
      console.error('DiaSight Error:', err);
      setDiaSightError(err.message);
      alert(`DiaSight Analysis Error: ${err.message}`);
    } finally {
      setIsRunningDiaSight(false);
      setDiaSightRunningPatientId(null);
    }
  };

  const handleNewMedicationInputChange = (e) => {
    const { name, value } = e.target;
    setNewMedication({ ...newMedication, [name]: value });
  };

  // Modified to handle checkboxes for timeOfDay
  const handleNewMedicationFrequencyChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "timeOfDay") {
      // If it's a checkbox for timeOfDay
      let updatedTimeOfDay = [...newMedicationFrequency.timeOfDay];
      if (checked) {
        updatedTimeOfDay.push(value);
      } else {
        updatedTimeOfDay = updatedTimeOfDay.filter((time) => time !== value);
      }
      setNewMedicationFrequency({ ...newMedicationFrequency, timeOfDay: updatedTimeOfDay });
    } else {
      // For other inputs like startDate
      setNewMedicationFrequency({ ...newMedicationFrequency, [name]: value });
    }
  };

  const handleAddMedication = async () => {
    // Check if medication name, dosage, and at least one time of day and start date are provided
    if (!newMedication.name || !newMedication.dosage || newMedicationFrequency.timeOfDay.length === 0 || !newMedicationFrequency.startDate) {
      alert("All medication fields (name, dosage, time, start date) must be filled, and at least one time must be selected.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Insert into medications table (also creates frequency)
      const medication = await createMedicationMut({
        user_id: selectedPatient.patient_id,
        name: newMedication.name,
        dosage: newMedication.dosage,
        prescribed_by: user.doctor_id,
        timeOfDay: newMedicationFrequency.timeOfDay,
        startDate: newMedicationFrequency.startDate,
      });

      // Log medication addition
      await logMedicationChange(
        'doctor',
        user.doctor_id,
        `${user.first_name} ${user.last_name}`,
        selectedPatient.patient_id,
        'create',
        '',
        JSON.stringify({
          medication: medication,
          frequency: {
            time_of_day: newMedicationFrequency.timeOfDay,
            start_date: newMedicationFrequency.startDate
          }
        }),
        'Patient Profile - Doctor Dashboard'
      );

      // Re-fetch patient details to get the newly added medication and its frequency details
      await fetchPatientDetails(selectedPatient.patient_id);
      setNewMedication({ name: '', dosage: '' }); // Clear medication input fields
      setNewMedicationFrequency({ timeOfDay: [], startDate: '' }); // Clear frequency input fields
      alert("Medication and frequency added successfully!");
    } catch (err) {
      console.error("Error adding medication:", err);
      setError("Error adding medication: "    + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMedication = async (medId) => {
    if (window.confirm("Are you sure you want to remove this medication? This will also remove its associated frequencies.")) {
      setLoading(true);
      setError("");
      try {
        // Get medication data before deletion for audit log
        const medicationData = await convex.query(api.medications.getById, { id: medId });

        // Remove medication and associated frequencies
        await removeMedicationMut({ id: medId });

        // Log medication removal
        await logMedicationChange(
          'doctor',
          user.doctor_id,
          `${user.first_name} ${user.last_name}`,
          selectedPatient.patient_id,
          'delete',
          JSON.stringify(medicationData),
          'Medication removed',
          'Patient Profile - Doctor Dashboard'
        );

        // Re-fetch to update the UI
        await fetchPatientDetails(selectedPatient.patient_id);
        alert("Medication and its frequencies removed successfully!");
      } catch (err) {
        setError("Error removing medication: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditClick = (medication) => {
    setEditingMedicationId(medication.id);
    setEditMedicationData({
      name: medication.name,
      dosage: medication.dosage,
    });
    // Set edit frequency data, handling cases where frequency might not exist or is empty
    setEditMedicationFrequencyData({
      timeOfDay: medication.medication_frequencies && medication.medication_frequencies.length > 0
        ? medication.medication_frequencies[0].time_of_day
        : [],
      startDate: medication.medication_frequencies && medication.medication_frequencies.length > 0
        ? medication.medication_frequencies[0].start_date
        : ''
    });
  };

  const handleEditMedicationInputChange = (e) => {
    const { name, value } = e.target;
    setEditMedicationData({ ...editMedicationData, [name]: value });
  };

  const handleEditMedicationFrequencyChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "timeOfDay") {
      let updatedTimeOfDay = [...editMedicationFrequencyData.timeOfDay];
      if (checked) {
        updatedTimeOfDay.push(value);
      } else {
        updatedTimeOfDay = updatedTimeOfDay.filter((time) => time !== value);
      }
      setEditMedicationFrequencyData({ ...editMedicationFrequencyData, timeOfDay: updatedTimeOfDay });
    } else {
      setEditMedicationFrequencyData({ ...editMedicationFrequencyData, [name]: value });
    }
  };

  const handleSaveMedication = async (medId) => {
    if (!editMedicationData.name || !editMedicationData.dosage || editMedicationFrequencyData.timeOfDay.length === 0 || !editMedicationFrequencyData.startDate) {
      alert("All medication fields (name, dosage, time, start date) must be filled, and at least one time must be selected.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Get current medication data for audit log
      const currentData = await convex.query(api.medications.getById, { id: medId });

      // Update medication and frequency
      await updateMedicationMut({
        id: medId,
        name: editMedicationData.name,
        dosage: editMedicationData.dosage,
        timeOfDay: editMedicationFrequencyData.timeOfDay,
        startDate: editMedicationFrequencyData.startDate,
      });

      // Get updated data for audit log
      const updatedData = await convex.query(api.medications.getById, { id: medId });

      // Log medication update
      await logMedicationChange(
        'doctor',
        user.doctor_id,
        `${user.first_name} ${user.last_name}`,
        selectedPatient.patient_id,
        'edit',
        JSON.stringify(currentData),
        JSON.stringify(updatedData),
        'Patient Profile - Doctor Dashboard'
      );

      await fetchPatientDetails(selectedPatient.patient_id); // Re-fetch to update the UI
      setEditingMedicationId(null); // Exit edit mode
      alert("Medication updated successfully!");
    } catch (err) {
      console.error("Error updating medication:", err);
      setError("Error updating medication: "    + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMedicationId(null);
    setEditMedicationData({ name: '', dosage: '' });
    setEditMedicationFrequencyData({ timeOfDay: [], startDate: '' });
  };

  // Appointment handling functions
  const handleAppointmentChange = (field, value) => {
    setAppointmentForm({ ...appointmentForm, [field]: value });
  };

  const createAppointment = async () => {
    if (!appointmentForm.doctorId || !appointmentForm.patientId || !appointmentForm.date || !appointmentForm.time) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setMessage("");
    
    try {
      const appointmentDateTime = `${appointmentForm.date}T${appointmentForm.time}:00`;
      
      if (editingAppointmentId) {
        // Update existing appointment
        await updateAppointmentMut({
          id: editingAppointmentId,
          doctor_id: appointmentForm.doctorId,
          patient_id: appointmentForm.patientId,
          appointment_datetime: new Date(appointmentDateTime).getTime(),
          notes: appointmentForm.notes,
        });

        setMessage("Appointment updated successfully!");
        setEditingAppointmentId(null);
      } else {
        // Create new appointment
        await createAppointmentMut({
          doctor_id: appointmentForm.doctorId,
          patient_id: appointmentForm.patientId,
          appointment_datetime: new Date(appointmentDateTime).getTime(),
          notes: appointmentForm.notes,
          appointment_state: "pending",
        });

        setMessage("Appointment scheduled successfully!");
      }

      // Reset form
      setAppointmentForm({ doctorId: "", patientId: "", date: "", time: "", notes: "" });
      
      // Refresh appointments
      fetchAppointments();
      
    } catch (err) {
      setMessage("Error with appointment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await updateAppointmentStateMut({ id: appointmentId, appointment_state: "cancelled" });
        
        setMessage("Appointment cancelled successfully!");
        fetchAppointments();
      } catch (err) {
        setMessage("Error cancelling appointment: " + err.message);
      }
    }
  };

  const handleInQueueAppointment = async (appointmentId) => {
    try {
      await updateAppointmentStateMut({ id: appointmentId, appointment_state: "in queue" });
      
      setMessage("Appointment moved to queue!");
      fetchAppointments();
    } catch (err) {
      setMessage("Error updating appointment: " + err.message);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Patient filtering and pagination functions
  const handleRiskFilterChange = (riskLevel) => {
    setSelectedRiskFilter(riskLevel);
    setCurrentPagePatients(1); // Reset to first page when filter changes
  };

  const handleLabStatusFilterChange = (status) => {
    setSelectedLabStatusFilter(status);
    setCurrentPagePatients(1); // Reset to first page when filter changes
  };

  const handleProfileStatusFilterChange = (status) => {
    setSelectedProfileStatusFilter(status);
    setCurrentPagePatients(1); // Reset to first page when filter changes
  };

  const handleSortOrderChange = (order) => {
    setSortOrder(order);
    setCurrentPagePatients(1); // Reset to first page when sort changes
  };

  // Handle report widget clicks
  const handleReportWidgetClick = (type, title) => {
    setReportTableType(type);
    setReportTableTitle(title);
    setShowReportTable(true);
    
    // Reset pagination when opening report table
    setCurrentPagePatients(1);
    
    // Clear existing filters first
    setSelectedRiskFilter('all');
    setSelectedLabStatusFilter('all');
    setSelectedProfileStatusFilter('all');
    setSearchTerm('');
    
    // Set appropriate filters based on report type
    switch (type) {
      case 'low-risk':
        setSelectedRiskFilter('low');
        break;
      case 'moderate-risk':
        setSelectedRiskFilter('moderate');
        break;
      case 'high-risk':
        setSelectedRiskFilter('high');
        break;
      case 'full-compliance':
        // Will be handled by getFilteredPatients with custom logic
        break;
      case 'missing-logs':
        // Will be handled by getFilteredPatients with custom logic
        break;
      case 'non-compliant':
        // Will be handled by getFilteredPatients with custom logic
        setSelectedRiskFilter('high');
        break;
      case 'pre-operative':
        // Will be handled by getFilteredPatients with custom logic
        break;
      case 'post-operative':
        // Will be handled by getFilteredPatients with custom logic
        break;
      case 'total':
      default:
        // Show all patients
        break;
    }
  };

  // Handle view patient from report table
  const handleViewPatient = (patientId) => {
    const patient = patients.find(p => p.patient_id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setActivePage("patient-profile");
    }
  };

  // Filter patients based on search term and risk filter
  const getFilteredPatients = () => {
    let filtered = patients.filter((patient) =>
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply specific report table filtering when report table is shown
    if (showReportTable) {
      switch (reportTableType) {
        case 'full-compliance':
          // Patients with complete lab results and finalized profile
          filtered = filtered.filter(patient => 
            getLabStatus(patient.latest_lab_result) === 'Submitted' && 
            getProfileStatus(patient) === '✅Finalized'
          );
          break;
        case 'missing-logs':
          // Patients with pending profile compliance
          filtered = filtered.filter(patient => 
            getProfileStatus(patient) === '🟡Pending'
          );
          break;
        case 'non-compliant':
          // High risk patients with lab or profile issues
          filtered = filtered.filter(patient => {
            const risk = (patient.risk_classification || '').toLowerCase();
            return risk === 'high' &&
              (getLabStatus(patient.latest_lab_result) === 'Awaiting' || getProfileStatus(patient) === '🟡Pending');
          });
          break;
        case 'pre-operative':
          // Patients in Pre-Operative phase
          filtered = filtered.filter(patient => 
            (patient.phase || 'Pre-Operative') === 'Pre-Operative'
          );
          break;
        case 'post-operative':
          // Patients in Post-Operative phase
          filtered = filtered.filter(patient => 
            patient.phase === 'Post-Operative'
          );
          break;
        default:
          // For risk-based filters and total, let the existing logic handle it
          break;
      }
    }

    // Apply risk filter (only if not in specific report mode or for risk-based reports)
    if (selectedRiskFilter !== 'all' && (!showReportTable || ['low-risk', 'moderate-risk', 'high-risk', 'non-compliant'].includes(reportTableType))) {
      filtered = filtered.filter(patient => {
        const risk = (patient.risk_classification || '').toLowerCase();
        return risk === selectedRiskFilter;
      });
    }

    // Apply lab status filter
    if (selectedLabStatusFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const labStatus = getLabStatus(patient.latest_lab_result);
        if (selectedLabStatusFilter === 'awaiting') {
          return labStatus === 'Awaiting';
        } else if (selectedLabStatusFilter === 'submitted') {
          return labStatus === 'Submitted' || labStatus === '✅Submitted';
        }
        return true;
      });
    }

    // Apply profile status filter
    if (selectedProfileStatusFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const profileStatus = getProfileStatus(patient);
        if (selectedProfileStatusFilter === 'pending') {
          return profileStatus === '🟡Pending';
        } else if (selectedProfileStatusFilter === 'finalized') {
          return profileStatus === '🟢Finalized';
        }
        return true;
      });
    }

    // Apply sorting by created_at
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Get patients for current page
  const getPaginatedPatients = () => {
    const filtered = getFilteredPatients();
    const startIndex = (currentPagePatients - 1) * PATIENTS_PER_PAGE;
    const endIndex = startIndex + PATIENTS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  // Calculate risk counts for filter display
  const getPatientRiskCounts = () => {
    const filtered = patients.filter((patient) =>
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const counts = {
      all: filtered.length,
      low: 0,
      moderate: 0,
      high: 0,
      ppd: 0
    };

    filtered.forEach(patient => {
      const risk = (patient.risk_classification || '').toLowerCase();
      // Handle both "moderate" and "moderate risk" variations
      if (risk === 'low' || risk === 'low risk') {
        counts.low++;
      } else if (risk === 'moderate' || risk === 'moderate risk') {
        counts.moderate++;
      } else if (risk === 'high' || risk === 'high risk') {
        counts.high++;
      } else if (risk === 'ppd') {
        counts.ppd++;
      }
    });

    return counts;
  };

  // Calculate lab status counts for filter display
  const getPatientLabStatusCounts = () => {
    const filtered = patients.filter((patient) =>
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const counts = {
      all: filtered.length,
      awaiting: 0,
      submitted: 0
    };

    filtered.forEach(patient => {
      const labStatus = getLabStatus(patient.latest_lab_result);
      if (labStatus === 'Awaiting') {
        counts.awaiting++;
      } else if (labStatus === 'Submitted' || labStatus === '✅Submitted') {
        counts.submitted++;
      }
    });

    return counts;
  };

  // Calculate profile status counts for filter display
  const getPatientProfileStatusCounts = () => {
    const filtered = patients.filter((patient) =>
      `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const counts = {
      all: filtered.length,
      pending: 0,
      finalized: 0
    };

    filtered.forEach(patient => {
      const profileStatus = getProfileStatus(patient);
      if (profileStatus === '🟡Pending') {
        counts.pending++;
      } else if (profileStatus === '🟢Finalized') {
        counts.finalized++;
      }
    });

    return counts;
  };

  // Calculate total pages
  const getTotalPatientPages = () => {
    const filtered = getFilteredPatients();
    return Math.ceil(filtered.length / PATIENTS_PER_PAGE);
  };

  // Health metrics pagination functions
  const getPaginatedHealthMetrics = () => {
    const startIndex = (currentPageHealthMetrics - 1) * HEALTH_METRICS_PER_PAGE;
    const endIndex = startIndex + HEALTH_METRICS_PER_PAGE;
    return allPatientHealthMetrics.slice(startIndex, endIndex);
  };

  const getTotalHealthMetricsPages = () => {
    return Math.ceil(allPatientHealthMetrics.length / HEALTH_METRICS_PER_PAGE);
  };

  // Render DiaSight Patient List
  const renderDiaSight = () => {
    // Get filtered and paginated patients for DiaSight
    const getFilteredDiaSightPatients = () => {
      return patients.filter((patient) =>
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };

    const getPaginatedDiaSightPatients = () => {
      const filtered = getFilteredDiaSightPatients();
      const startIndex = (currentPageDiaSight - 1) * DIASIGHT_PATIENTS_PER_PAGE;
      const endIndex = startIndex + DIASIGHT_PATIENTS_PER_PAGE;
      return filtered.slice(startIndex, endIndex);
    };

    const getTotalDiaSightPages = () => {
      const filtered = getFilteredDiaSightPatients();
      return Math.ceil(filtered.length / DIASIGHT_PATIENTS_PER_PAGE);
    };

    const paginatedPatients = getPaginatedDiaSightPatients();
    const totalPages = getTotalDiaSightPages();

    return (
      <div className="patient-list-section">
        <h2>DiaSight - Patient Analysis</h2>
        <div className="search-and-filter-row">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search patients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="patient-search-input"
            />
            <img src="/picture/search.svg" alt="Search" className="search-icon" />
          </div>
        </div>
        
        <div className="diasight-table-wrapper">
          <div className="diasight-content-container">
            <table className="diasight-patient-table">
            <thead>
              <tr>
                <th className="diasight-patient-name-header">Patient Name</th>
                <th>Lab Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient) => {
                  const labStatus = getLabStatus(patient.latest_lab_result);
                  const isAwaiting = labStatus === 'Awaiting';
                  
                  return (
                    <tr key={patient.patient_id}>
                      <td className="diasight-patient-name-cell">
                        <div className="diasight-patient-name-container">
                          <img 
                            src={patient.patient_picture || "/picture/secretary.png"} 
                            alt="Patient Avatar" 
                            className="patient-avatar-table"
                            onError={(e) => e.target.src = "/picture/secretary.png"}
                          />
                          <span className="patient-name-text">{patient.first_name} {patient.last_name}</span>
                        </div>
                      </td>
                      <td 
                        className={
                          labStatus === 'Submitted' ? 'lab-status-complete' :
                          labStatus === 'Awaiting' ? 'lab-status-awaiting' : 
                          'lab-status-awaiting'
                        }
                      >
                        {labStatus === 'Awaiting' ? '⏳Awaiting' : 
                         labStatus === 'Submitted' ? '✅Submitted' : 
                         labStatus}
                      </td>
                      <td className="patient-actions-cell">
                        <button 
                          className="view-button" 
                          onClick={() => handleViewClick(patient)}
                          style={{ marginRight: '8px' }}
                        >
                          👁️ View
                        </button>
                        <button 
                          className="toggle-phase-button diasight-run-button"
                          onClick={() => {
                            if (!isAwaiting && !isRunningDiaSight) {
                              handleRunDiaSight(patient);
                            }
                          }}
                          disabled={isAwaiting || (isRunningDiaSight && diaSightRunningPatientId === patient.patient_id)}
                          style={{
                            opacity: isAwaiting || (isRunningDiaSight && diaSightRunningPatientId === patient.patient_id) ? 0.5 : 1,
                            cursor: isAwaiting || (isRunningDiaSight && diaSightRunningPatientId === patient.patient_id) ? 'not-allowed' : 'pointer'
                          }}
                          title={isAwaiting ? 'Lab results must be submitted before running DiaSight analysis' : 'Run DiaSight DR detection analysis'}
                        >
                          {isRunningDiaSight && diaSightRunningPatientId === patient.patient_id ? '🟡 Running...' : '🟢 Run'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="diasight-pagination">
              <Pagination
                currentPage={currentPageDiaSight}
                totalPages={totalPages}
                onPageChange={setCurrentPageDiaSight}
                itemsPerPage={DIASIGHT_PATIENTS_PER_PAGE}
                totalItems={getFilteredDiaSightPatients().length}
                showPageInfo={true}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  const renderPatientList = () => {
    const paginatedPatients = getPaginatedPatients();
    const patientRiskCounts = getPatientRiskCounts();
    const patientLabStatusCounts = getPatientLabStatusCounts();
    const patientProfileStatusCounts = getPatientProfileStatusCounts();
    const totalPatientPages = getTotalPatientPages();

    return (
      <div className="patient-list-section">
        <h2>My Patients</h2>
        <div className="search-and-filter-row">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search patients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="patient-search-input"
            />
            <img src="/picture/search.svg" alt="Search" className="search-icon" />
          </div>
          
          {/* Risk Classification Filter */}
          <RiskFilter
            selectedRisk={selectedRiskFilter}
            onRiskChange={handleRiskFilterChange}
            selectedLabStatus={selectedLabStatusFilter}
            onLabStatusChange={handleLabStatusFilterChange}
            selectedProfileStatus={selectedProfileStatusFilter}
            onProfileStatusChange={handleProfileStatusFilterChange}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            showCounts={true}
            counts={patientRiskCounts}
            labStatusCounts={patientLabStatusCounts}
            profileStatusCounts={patientProfileStatusCounts}
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
                        onError={(e) => e.target.src = "/picture/secretary.png"}
                      />
                      <span className="patient-name-text">{patient.first_name} {patient.last_name}</span>
                    </div>
                  </td>
                  <td>{patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'}</td>
                  <td>{patient.gender || 'N/A'}</td>
                  <td className={`doctor-classification-cell ${
                    getLabStatus(patient.latest_lab_result) === 'Awaiting' ? 'doctor-classification-awaiting' :
                    (() => {
                      const risk = (patient.risk_classification || '').toLowerCase();
                      if (risk === 'low' || risk === 'low risk') return 'doctor-classification-low';
                      if (risk === 'moderate' || risk === 'moderate risk') return 'doctor-classification-moderate';
                      if (risk === 'high' || risk === 'high risk') return 'doctor-classification-high';
                      if (risk === 'ppd') return 'doctor-classification-ppd';
                      return 'doctor-classification-default';
                    })()
                  }`}>
                    {getClassificationDisplay(patient)}
                  </td>
                  <td className={
                    getLabStatus(patient.latest_lab_result) === 'Submitted' ? 'lab-status-complete' :
                    getLabStatus(patient.latest_lab_result) === 'Awaiting' ? 'lab-status-awaiting' : 
                    'lab-status-awaiting'
                  }>
                    {getLabStatus(patient.latest_lab_result) === 'Awaiting' ? '⏳Awaiting' : getLabStatus(patient.latest_lab_result) === 'Submitted' ? '✅Submitted' : getLabStatus(patient.latest_lab_result)}
                  </td>
                  <td className={getProfileStatus(patient) === '✅Finalized' ? 'status-complete' : 'status-incomplete'}>
                    {getProfileStatus(patient)}
                  </td>
                  <td className="patient-actions-cell">
                    <button className="view-button" onClick={() => handleViewClick(patient)}>👁️ View</button>
                    <button className="toggle-phase-button" onClick={() => handlePhaseToggle(patient)} style={{ marginLeft: '8px' }}>
                      {patient.phase === 'Pre-Operative' ? '🔄 Post-Op' : '🔄 Pre-Op'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPatientPages > 1 && (
          <Pagination
            currentPage={currentPagePatients}
            totalPages={totalPatientPages}
            onPageChange={setCurrentPagePatients}
            itemsPerPage={PATIENTS_PER_PAGE}
            totalItems={getFilteredPatients().length}
            showPageInfo={true}
          />
        )}
      </div>
    );
  };

  const renderAppointmentsSection = () => (
    <AppointmentManagementSection
      editingAppointmentId={editingAppointmentId}
      appointmentForm={appointmentForm}
      onAppointmentChange={handleAppointmentChange}
      onSubmitAppointment={createAppointment}
      onCancelEdit={() => {
              setEditingAppointmentId(null);
              setAppointmentForm({ doctorId: "", patientId: "", date: "", time: "", notes: "" });
              setActivePage("appointments");
            }}
      message={message}
      doctors={allDoctors.map((doctor) => ({
        id: doctor.doctor_id,
        label: `${doctor.first_name} ${doctor.last_name}${doctor.specialization ? ` (${doctor.specialization})` : ""}`,
      }))}
      patients={patients}
      showDoctorUnavailabilityWarning={false}
      unavailableDatesForSelectedDoctor={[]}
    />
  );


const handleCancelAppointmentClick = async (appointment) => {
  if (window.confirm("Are you sure you want to cancel this appointment?")) {
    try {
      await updateAppointmentStateMut({ id: appointment.appointment_id, appointment_state: "cancelled" });
      alert("Appointment cancelled successfully!");
      fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error.message);
      alert("Failed to cancel appointment.");
    }
  }
};

const handleDoneAppointmentClick = async (appointment) => {
  if (window.confirm("Are you sure you want to mark this appointment as done?")) {
    try {
      await updateAppointmentStateMut({ id: appointment.appointment_id, appointment_state: "Done" });
      await incrementVisitsMut({ id: appointment.patient_id });

      alert("Appointment completed successfully!");
      fetchAppointments();
    } catch (error) {
      console.error("Error completing appointment:", error.message);
      alert("Failed to complete appointment.");
    }
  }
};
  const renderAppointments = () => (
    <div className="card3 appointments-card3">
        <h2>Upcoming Appointments</h2>
        <div className="table-responsive3">
            <table className="appointment-list-table3">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Notes</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan="4">No upcoming appointments.</td></tr>
                ) : (
                  appointments
                    .filter(appt => appt.appointment_state !== 'Done' && appt.appointment_state !== 'cancelled')
                    .map((appt) => (
                    <tr key={appt.appointment_id}>
                      <td>{appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "Unknown"}</td>
                      <td>{new Date(appt.appointment_datetime).toLocaleDateString()}</td>
                      <td>{new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{appt.notes || "N/A"}</td>
                      <td>{appt.appointment_state || "N/A"}</td> {/* NEW: Added appointment state data */}
                      <td>
                        <button onClick={() => handleCancelAppointmentClick(appt)}>Cancel</button>
                        <button onClick={() => handleDoneAppointmentClick(appt)}>Done</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>
  );

  const renderDashboardContent = () => {
    return (
      <div className="dashboard-columns-container">
        <div className="dashboard-left-column">
          <div className="quick-links">
            <h3>Quick links</h3>
            <div className="quick-links-grid">
              <div className="quick-link-item" onClick={() => setActivePage("diasight")}>
                <div className="quick-link-icon patient-list">
                  <img src="/picture/diasight.svg" alt="DiaSight" className="quick-link-image" style={{ width: '70px', height: '70px' }} />
                </div>
                <span>DiaSight</span>
              </div>
              <div className="quick-link-item" onClick={() => setActivePage("appointments")}>
                <div className="quick-link-icon set-appointment">
                  <img src="/picture/appointment.png" alt="Appointment" className="quick-link-image" />
                </div>
                <span>Appointments</span>
              </div>
            </div>
          </div>

          <div className="widgets">
            <h3>Widgets</h3>
            <PatientSummaryWidget
              totalPatients={totalPatientsCount}
              pendingLabResults={pendingLabResultsCount}
              preOp={preOpCount}
              postOp={postOpCount}
              lowRisk={lowRiskCount}
              moderateRisk={moderateRiskCount}
              highRisk={highRiskCount}
              patientCountHistory={appointmentChartData}
              pendingLabHistory={labSubmissionChartData}
            />
          </div>
        </div>

        <div className="dashboard-right-column">
          <div className="appointments-today">
            <h3>Upcoming Appointments</h3>
            <div className="appointment-list-container">
              <table className="appointment-list-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No upcoming appointments.
                      </td>
                    </tr>
                  ) : (
                    appointments
                      .filter(appt => appt.appointment_state !== 'Done' && appt.appointment_state !== 'cancelled')
                      .slice(0, 5) // Show only first 5 appointments
                      .map((appt) => (
                        <tr key={appt.appointment_id}>
                          <td>{new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "Unknown"}</td>
                          <td className="appointment-status">
                            <span className={`status-${(appt.appointment_state || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                              {(() => {
                                const state = appt.appointment_state || 'pending';
                                if (state === 'in queue') return 'In Queue';
                                if (state === 'cancelled') return 'Cancelled';
                                if (state === 'pending') return 'Pending';
                                return state.charAt(0).toUpperCase() + state.slice(1);
                              })()}
                            </span>
                          </td>
                          <td className="appointment-actions">
                            <button onClick={() => handleCancelAppointmentClick(appt)} className="action-btn5 cancel-btn5">
                              Cancel
                            </button>
                            <button onClick={() => handleDoneAppointmentClick(appt)} className="action-btn5 done-btn5">
                              Done
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="dashboard-calendar-section" style={{ marginTop: '20px' }}>
            <h3>Calendar</h3>
            <div className="dashboard-appointment-schedule-container">
              <div className="dashboard-appointment-calendar-container">
                <Calendar
                  value={calendarDate}
                  onChange={setCalendarDate}
                  tileDisabled={({ date, view }) => {
                    // Disable weekends (Saturday = 6, Sunday = 0)
                    if (view === 'month') {
                      const day = date.getDay();
                      return day === 0 || day === 6;
                    }
                    return false;
                  }}
                  tileClassName={({ date, view }) => {
                    if (view === 'month') {
                      // Check if this date has an appointment
                      const hasAppointment = appointments.some(appointment => {
                        // Parse the appointment date string (YYYY-MM-DD format from substring)
                        const appointmentDateStr = appointment.appointment_datetime.substring(0, 10);
                        const [year, month, day] = appointmentDateStr.split('-').map(Number);
                        
                        // Compare with calendar tile date
                        const matches = (
                          date.getDate() === day &&
                          date.getMonth() === (month - 1) && // Month is 0-indexed in JS
                          date.getFullYear() === year
                        );
                        return matches;
                      });
                      return hasAppointment ? 'dashboard-appointment-date' : null;
                    }
                  }}
                  tileContent={({ date, view }) => {
                    if (view === 'month') {
                      const dayAppointments = appointments.filter(appointment => {
                        // Parse the appointment date string (YYYY-MM-DD format from substring)
                        const appointmentDateStr = appointment.appointment_datetime.substring(0, 10);
                        const [year, month, day] = appointmentDateStr.split('-').map(Number);
                        
                        // Compare with calendar tile date
                        return (
                          date.getDate() === day &&
                          date.getMonth() === (month - 1) && // Month is 0-indexed in JS
                          date.getFullYear() === year
                        );
                      });
                      if (dayAppointments.length > 0) {
                        return (
                          <div className="appointment-indicator">
                            <span className="appointment-count">{dayAppointments.length}</span>
                          </div>
                        );
                      }
                    }
                  }}
                />
              </div>
              
              {/* Appointment Details List */}
              <div className="dashboard-appointment-details-list">
                <h4>
                  {(() => {
                    const now = new Date();
                    const futureAppointments = appointments.filter(appointment => 
                      new Date(appointment.appointment_datetime) > now
                    );
                    return futureAppointments.length > 0 ? 'Upcoming Appointments' : 'Recent Appointments';
                  })()}
                </h4>
                {(() => {
                  const now = new Date();
                  const futureAppointments = appointments.filter(appointment => 
                    new Date(appointment.appointment_datetime) > now
                  );
                  
                  let appointmentsToShow = [];
                  if (futureAppointments.length > 0) {
                    appointmentsToShow = futureAppointments.slice(0, 3);
                  } else {
                    // Show 3 most recent appointments
                    appointmentsToShow = appointments
                      .sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime))
                      .slice(0, 3);
                  }
                  
                  if (appointmentsToShow.length > 0) {
                    return (
                      <ul className="dashboard-appointment-list">
                        {appointmentsToShow.map((appointment, idx) => (
                          <li key={idx} className="dashboard-appointment-item">
                            <div className="dashboard-appointment-date-time">
                              <strong>{formatDateToReadable(appointment.appointment_datetime.split('T')[0])}</strong>
                              <span className="dashboard-appointment-time">{formatTimeTo12Hour(appointment.appointment_datetime.substring(11, 16))}</span>
                            </div>
                            <div className="dashboard-appointment-patient">
                              <strong>Patient:</strong> {appointment.patients ? `${appointment.patients.first_name} ${appointment.patients.last_name}` : "Unknown"}
                            </div>
                            <div className="dashboard-appointment-notes">
                              {appointment.notes || 'No notes'}
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  } else {
                    return <p className="no-appointments">No appointments scheduled.</p>;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Helper function to get patient phase counts
const getPatientPhaseCounts = () => {
  const counts = { 'Pre-Operative': 0, 'Post-Operative': 0 };
  patients.forEach(patient => {
    if (counts.hasOwnProperty(patient.phase)) {
      counts[patient.phase]++;
    }
  });
  return counts;
};


  
  // NEW: Render Reports Content
const renderReportsContent = () => {
  const riskCounts = getPatientRiskCounts();
  const maxRiskCount = Math.max(riskCounts.low, riskCounts.moderate, riskCounts.high); // Fixed: use lowercase property names

  const phaseCounts = getPatientPhaseCounts(); // Get phase counts inside the function
  const maxPhaseCount = Math.max(phaseCounts['Pre-Operative'], phaseCounts['Post-Operative']); // Define maxPhaseCount here

  return (
    <div className="reports-grid3">
      <div className="card3 report-widget-card3">
        <div className="summary-widget-icon3">
          <i className="fas fa-users"></i>
        </div>
        <h3>Total Patients</h3>
        <p className="report-value3">{patients.length}</p>
      </div>
      <div className="card3 report-widget-card3">
        <div className="summary-widget-icon3">
          <i className="fas fa-calendar-alt"></i>
        </div>
        <h3>Upcoming Appointments</h3>
        <p className="report-value3">{appointments.length}</p>
      </div>

      {/* NEW: Risk Classification Bar Chart */}
      <div className="card3 risk-chart-card3">
        <h3>Patient Risk Classification</h3>
        <div className="bar-chart-container3">
          {Object.entries(riskCounts).map(([risk, count]) => (
            <div className="bar-chart-item3" key={risk}>
              <div className="bar-chart-label3">{risk}</div>
              <div className="bar-chart-bar-wrapper3">
                <div
                  className={`bar-chart-bar3 ${risk.toLowerCase()}-risk-bar3`}
                  style={{ height: `${(count / (maxRiskCount || 1)) * 100}%` }} // Use maxRiskCount
                  title={`${risk}: ${count} patients`}
                ></div>
              </div>
              <div className="bar-chart-value3">{count}</div>
            </div>
          ))}
        </div>
      </div>

       {/* NEW: Patient Phase Classification Bar Chart */}
    <div className="card3 phase-chart-card3"> {/* Added new class for specific styling */}
      <h3>Patient Phase Classification</h3>
      <div className="bar-chart-container3">
        {Object.entries(phaseCounts).map(([phase, count]) => (
          <div className="bar-chart-item3" key={phase}>
            <div className="bar-chart-label3">{phase}</div>
            <div className="bar-chart-bar-wrapper3">
              <div className={`bar-chart-bar3 ${phase.toLowerCase().replace('-', '')}-phase-bar3`} style={{ height: `${(count / (maxPhaseCount || 1)) * 100}%` }} title={`${phase}: ${count} patients`} ></div>
            </div>
            <div className="bar-chart-value3">{count}</div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
};

    // NEW: Function to reset treatment plan forms
    const resetTreatmentPlanForms = () => {
        setDiagnosisDetails([{ id: Date.now(), text: '' }]);
        setWoundCareDetails([{ id: Date.now(), text: '' }]);
        setDressingDetails([{ id: Date.now(), text: '' }]);
        setMedicationTreatmentPlan([{ id: Date.now(), text: '' }]);
        setImportantNotes([{ id: Date.now(), text: '' }]);
        setFollowUpDetails([{ id: Date.now(), text: '' }]);
        setSelectedWoundPhoto(null);
    };

    // NEW: Function to handle "Create Treatment Plan" button click
    const handleCreateTreatmentPlan = () => {
        // Reset forms before starting a new treatment plan
        resetTreatmentPlanForms();
        
        // Find the latest wound photo if available
        const latestWoundPhoto = woundPhotos.length > 0 ? woundPhotos[0] : null;
        if (latestWoundPhoto) {
            // Set the selected wound photo
            setSelectedWoundPhoto(latestWoundPhoto);
            // Set active page to 'treatment-plan' to render the new content
            setActivePage("treatment-plan");
        } else {
            alert("No wound photos available for this patient to create a treatment plan.");
        }
    };

    // NEW: Function to handle "Create Treatment Plan" for a specific wound photo
    const handleCreateTreatmentPlanForPhoto = (photo) => {
        if (photo) {
            // Reset forms before starting a new treatment plan
            resetTreatmentPlanForms();
            
            // Set the selected wound photo for the treatment plan
            setSelectedWoundPhoto(photo);
            // Navigate to treatment plan page
            setActivePage("treatment-plan");
        } else {
            alert("No wound photo selected to create a treatment plan.");
        }
    };

    // NEW: Function to handle wound analysis API call
    const handleViewAnalysis = async () => {
        // Get the wound photo - use selected or latest from woundPhotos
        const woundPhotoToAnalyze = selectedWoundPhoto || (woundPhotos.length > 0 ? woundPhotos[0] : null);
        
        if (!woundPhotoToAnalyze || !woundPhotoToAnalyze.url) {
            setAnalysisError("No wound photo available for analysis");
            return;
        }

        setIsLoadingAnalysis(true);
        setAnalysisError(null);
        setAnalysisResults(null);

        try {
            let imageUrl = woundPhotoToAnalyze.url;
            
            // If the URL is not a complete URL (doesn't start with http), use it as-is
            // (Supabase storage URLs have been migrated; relative paths kept as-is)
            if (!imageUrl.startsWith('http')) {
                // URL is a relative path, keep as-is
            }

            // Validate the URL
            if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
                throw new Error('Invalid wound photo URL');
            }

            // Fetch the image as a blob
            const imageResponse = await fetch(imageUrl);
            
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            
            const imageBlob = await imageResponse.blob();

            // Create FormData to send the image
            const formData = new FormData();
            formData.append('file', imageBlob, 'wound_image.jpg');

            // Call the API
            const response = await fetch('https://yongnotgio12-diatrack.hf.space/api/v1/dfu/predict', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Store the results from API response
            setAnalysisResults({
                gradcam: data.gradcam_overlay || null,
                segmentation: data.segmentation_mask || null,
                className: data.class_name || 'Unknown',
                probability: data.probability || 0,
                ulcerArea: data.ulcer_area_percentage || 0,
                prediction: data.prediction
            });

            // Don't show modal - results will display inline
        } catch (error) {
            console.error('Error calling analysis API:', error);
            setAnalysisError(error.message || 'Failed to analyze image. Please ensure the API is running.');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    // NEW: Function to handle retry analysis
    const handleRetryAnalysis = () => {
        setAnalysisResults(null);
        setAnalysisError(null);
        setAnalysisSaved(false);
        handleViewAnalysis();
    };

    // NEW: Function to save analysis images to database
    const handleSaveAnalysis = async () => {
        // Get the wound photo - use selected or latest from woundPhotos
        const woundPhotoToSave = selectedWoundPhoto || (woundPhotos.length > 0 ? woundPhotos[0] : null);
        
        if (!analysisResults || !selectedPatient || !woundPhotoToSave) {
            alert('No analysis results to save');
            return;
        }

        setIsSavingAnalysis(true);

        try {
            // Helper function to convert base64 to blob
            const base64ToBlob = (base64String) => {
                // Remove data URL prefix if present
                const base64Data = base64String.includes('base64,') 
                    ? base64String.split('base64,')[1] 
                    : base64String;
                
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: 'image/jpeg' });
            };

            // TODO: Implement Convex file storage for DFU analysis images
            throw new Error('File storage upload not yet implemented for Convex migration. Analysis results are still displayed but cannot be persisted.');

            // Log the action
            await logSystemAction(
                selectedPatient.patient_id,
                'Analysis Saved',
                `Saved Grad-CAM and Segmentation Mask for patient ${selectedPatient.first_name} ${selectedPatient.last_name}`
            );

            setAnalysisSaved(true);
            alert('Analysis images saved successfully!');

        } catch (error) {
            console.error('Error saving analysis:', error);
            alert(`Failed to save analysis: ${error.message}`);
        } finally {
            setIsSavingAnalysis(false);
        }
    };

    // NEW: Handlers for dynamic Diagnosis fields
    const handleAddDiagnosis = () => {
      setDiagnosisDetails([...diagnosisDetails, { id: Date.now(), text: '' }]);
    };

    const handleRemoveDiagnosis = (idToRemove) => {
      setDiagnosisDetails(diagnosisDetails.filter(diag => diag.id !== idToRemove));
    };

    const handleDiagnosisChange = (id, newText) => {
      setDiagnosisDetails(diagnosisDetails.map(diag =>
        diag.id === id ? { ...diag, text: newText } : diag
      ));
    };

    // (Add similar handlers for WoundCare, Dressing, MedicationTreatmentPlan, ImportantNotes, FollowUpDetails)
    const handleAddWoundCare = () => {
      setWoundCareDetails([...woundCareDetails, { id: Date.now(), text: '' }]);
    };
    const handleRemoveWoundCare = (idToRemove) => {
      setWoundCareDetails(woundCareDetails.filter(wc => wc.id !== idToRemove));
    };
    const handleWoundCareChange = (id, newText) => {
      setWoundCareDetails(woundCareDetails.map(wc =>
        wc.id === id ? { ...wc, text: newText } : wc
      ));
    };

    const handleAddDressing = () => {
      setDressingDetails([...dressingDetails, { id: Date.now(), text: '' }]);
    };
    const handleRemoveDressing = (idToRemove) => {
      setDressingDetails(dressingDetails.filter(d => d.id !== idToRemove));
    };
    const handleDressingChange = (id, newText) => {
      setDressingDetails(dressingDetails.map(d =>
        d.id === id ? { ...d, text: newText } : d
      ));
    };

    const handleAddMedicationTreatmentPlan = () => {
      setMedicationTreatmentPlan([...medicationTreatmentPlan, { id: Date.now(), text: '' }]);
    };
    const handleRemoveMedicationTreatmentPlan = (idToRemove) => {
      setMedicationTreatmentPlan(medicationTreatmentPlan.filter(mtp => mtp.id !== idToRemove));
    };
    const handleMedicationTreatmentPlanChange = (id, newText) => {
      setMedicationTreatmentPlan(medicationTreatmentPlan.map(mtp =>
        mtp.id === id ? { ...mtp, text: newText } : mtp
      ));
    };

    const handleAddImportantNotes = () => {
      setImportantNotes([...importantNotes, { id: Date.now(), text: '' }]);
    };
    const handleRemoveImportantNotes = (idToRemove) => {
      setImportantNotes(importantNotes.filter(notes => notes.id !== idToRemove));
    };
    const handleImportantNotesChange = (id, newText) => {
      setImportantNotes(importantNotes.map(notes =>
        notes.id === id ? { ...notes, text: newText } : notes
      ));
    };

    const handleAddFollowUpDetails = () => {
      setFollowUpDetails([...followUpDetails, { id: Date.now(), text: '' }]);
    };
    const handleRemoveFollowUpDetails = (idToRemove) => {
      setFollowUpDetails(followUpDetails.filter(fud => fud.id !== idToRemove));
    };
    const handleFollowUpDetailsChange = (id, newText) => {
      setFollowUpDetails(followUpDetails.map(fud =>
        fud.id === id ? { ...fud, text: newText } : fud
      ));
    };


    // NEW: Render Treatment Plan Content (Step 1)
    const renderTreatmentPlan = () => {
      // Use the selected wound photo if available, otherwise use the latest one
      const latestWoundPhoto = selectedWoundPhoto || (woundPhotos.length > 0 ? woundPhotos[0] : null);
      // Get the latest metric for risk classification display
      const latestMetric = patientMetrics.length > 0 ? patientMetrics[0] : null;

      if (!selectedPatient) return <p>No patient selected for treatment plan.</p>;

      return (
          <div className="treatment-plan-wrapper3">
              <h2>Treatment Plan for {selectedPatient.first_name} {selectedPatient.last_name}</h2>
                {/* Overall 2-column flexbox layout for patient info block and wound photo */}
                <div className="card3 patient-details-card3" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="patient-info-column"> {/* This is the main column for all patient info */}
                    <h3 className="patientinfo3">Patient Information</h3>
                    <div className="patient-info-two-column-layout"> {/* NEW: Inner div for 2-column patient details */}
                      <div className="patient-details-col-1"> {/* First sub-column for patient details */}
                        <p><strong>Name:</strong> {selectedPatient.first_name} {selectedPatient.last_name}</p>
                        <p><strong>Date of Birth:</strong> {selectedPatient.date_of_birth}</p>
                        <p><strong>Contact Info:</strong> {selectedPatient.contact_info}</p>
                        <p><strong>Gender:</strong> {selectedPatient.gender}</p>
                         <p><strong>Phase:</strong> <span className={`phase3 ${selectedPatient.phase}`}>{selectedPatient.phase}</span></p>
                      </div>
                      <div className="patient-details-col-2"> {/* Second sub-column for patient details */}
                        <p><strong>Diabetes Type:</strong> {selectedPatient.diabetes_type}</p>
                        <p><strong>Duration of Diabetes:</strong> {selectedPatient.diabetes_duration ? `${selectedPatient.diabetes_duration} years` : 'N/A'}</p>
                        <p><strong>Smoking Status:</strong> {selectedPatient.smoking_status}</p>
                        <p><strong>Last Doctor Visit:</strong> {selectedPatient.last_doctor_visit}</p>
                        <p><strong>Risk Classification:</strong> 
                          <span className={`risk-classification3 ${(latestMetric?.risk_classification || selectedPatient.risk_classification || 'n-a').toLowerCase()}`}>
                            {latestMetric?.risk_classification || selectedPatient.risk_classification || 'N/A'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {latestWoundPhoto ? (
                      <div className="wound-photo-column" style={{ maxWidth: '300px', marginLeft: '20px', flexShrink: 0, textAlign: 'center' }}> {/* Wound photo column */}
                          <h3 className="latestwound3">Latest Wound Photo</h3>
                          <img src={latestWoundPhoto.url} alt="Latest Wound" className="latest-wound-image3" />
                          <p><strong>Date:</strong> {new Date(latestWoundPhoto.date).toLocaleDateString()}</p>
                          <p><strong>Notes:</strong> {latestWoundPhoto.notes || 'N/A'}</p>
                          <button 
                            className="view-analysis-button3" 
                            onClick={handleViewAnalysis}
                            disabled={isLoadingAnalysis}
                          >
                            {isLoadingAnalysis ? 'Analyzing...' : 'View Analysis'}
                          </button>
                          {analysisError && (
                            <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                              {analysisError}
                            </p>
                          )}
                      </div>
                  ) : (
                      <div className="wound-photo-column" style={{ maxWidth: '300px', marginLeft: '20px', flexShrink: 0 }}>
                          <p>No wound photos available for this patient.</p>
                      </div>
                  )}
                </div>

              {/* Analysis Results Section - Shows above diagnosis when available */}
              {analysisResults && (
                <div className="card3" style={{ marginBottom: '20px' }}>
                  <h3>Wound Analysis Results</h3>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '15px', flexWrap: 'wrap' }}>
                    {/* Original Image */}
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Original Image</h4>
                      {latestWoundPhoto && (
                        <img 
                          src={latestWoundPhoto.url} 
                          alt="Original" 
                          style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                      )}
                    </div>
                    
                    {/* Grad-CAM Heatmap */}
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Grad-CAM Heatmap</h4>
                      {analysisResults.gradcam ? (
                        <img 
                          src={analysisResults.gradcam.startsWith('data:') ? analysisResults.gradcam : `data:image/png;base64,${analysisResults.gradcam}`}
                          alt="Grad-CAM Heatmap" 
                          style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                      ) : (
                        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                          Not available
                        </div>
                      )}
                    </div>
                    
                    {/* Segmentation Mask */}
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Segmentation Mask</h4>
                      {analysisResults.segmentation ? (
                        <img 
                          src={analysisResults.segmentation.startsWith('data:') ? analysisResults.segmentation : `data:image/png;base64,${analysisResults.segmentation}`}
                          alt="Segmentation Mask" 
                          style={{ width: '100%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                      ) : (
                        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                          Not available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Diagnosis Results */}
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>AI Diagnosis</h4>
                    <p><strong>Classification:</strong> {analysisResults.className}</p>
                    <p><strong>Confidence:</strong> {(analysisResults.probability * 100).toFixed(2)}%</p>
                    {analysisResults.prediction === 0 && (
                      <p><strong>Ulcer Area:</strong> {analysisResults.ulcerArea.toFixed(2)}% of total area</p>
                    )}
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      {analysisResults.prediction === 0 
                        ? 'Diabetic foot ulcer detected. The green overlay shows the affected region.'
                        : 'No ulcer detected. The skin appears healthy.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                      className="retry-analysis-button"
                      onClick={handleRetryAnalysis}
                      disabled={isLoadingAnalysis || isSavingAnalysis}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isLoadingAnalysis || isSavingAnalysis ? 'not-allowed' : 'pointer',
                        opacity: isLoadingAnalysis || isSavingAnalysis ? 0.6 : 1
                      }}
                    >
                      {isLoadingAnalysis ? 'Analyzing...' : 'Retry Analysis'}
                    </button>
                    <button 
                      className="save-analysis-button"
                      onClick={handleSaveAnalysis}
                      disabled={isSavingAnalysis || analysisSaved || isLoadingAnalysis}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: analysisSaved ? '#28a745' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isSavingAnalysis || analysisSaved || isLoadingAnalysis ? 'not-allowed' : 'pointer',
                        opacity: isSavingAnalysis || analysisSaved || isLoadingAnalysis ? 0.6 : 1
                      }}
                    >
                      {isSavingAnalysis ? 'Saving...' : analysisSaved ? '✅ Saved' : 'Save Analysis'}
                    </button>
                  </div>
                </div>
              )}

              <div className="forms-container3"> {/* New container for two-column forms */}
                  <div className="card3 diagnosis-form3"> {/* NEW: Diagnosis Form */}
                      <h3>Diagnosis</h3>
                      {diagnosisDetails.map((entry, index) => (
                        <div key={entry.id} className="dynamic-textarea-group3">
                          <textarea
                              placeholder="Enter diagnosis details..."
                              rows="4" // Reduced rows to accommodate buttons
                              value={entry.text}
                              onChange={(e) => handleDiagnosisChange(entry.id, e.target.value)}
                          ></textarea>
                        </div>
                      ))}
                  </div>
                  {/* NEW CONTAINER for Wound Care and Dressing to keep them side-by-side */}
                  <div className="wound-dressing-section3">
                      <div className="card3 wound-care-form3">
                          <h3>Wound Care</h3>
                          {woundCareDetails.map((entry, index) => (
                            <div key={entry.id} className="dynamic-textarea-group3">
                              <textarea
                                  placeholder="Enter wound care details..."
                                  rows="4"
                                  value={entry.text}
                                  onChange={(e) => handleWoundCareChange(entry.id, e.target.value)}
                              ></textarea>
                              <div className="dynamic-buttons3">
                                <button onClick={handleAddWoundCare} className="add-button3">+</button>
                                {woundCareDetails.length > 1 && (
                                  <button onClick={() => handleRemoveWoundCare(entry.id)} className="remove-button3">-</button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="card3 dressing-form3">
                          <h3>Dressing</h3>
                          {dressingDetails.map((entry, index) => (
                            <div key={entry.id} className="dynamic-textarea-group3">
                              <textarea
                                  placeholder="Enter dressing details..."
                                  rows="4"
                                  value={entry.text}
                                  onChange={(e) => handleDressingChange(entry.id, e.target.value)}
                              ></textarea>
                              <div className="dynamic-buttons3">
                                <button onClick={handleAddDressing} className="add-button3">+</button>
                                {dressingDetails.length > 1 && (
                                  <button onClick={() => handleRemoveDressing(entry.id)} className="remove-button3">-</button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="treatment-plan-actions3">
                  <button className="cancel-button3" onClick={() => setActivePage("patient-profile")}>Cancel</button>
                  <button className="next-step-button3" onClick={() => setActivePage("treatment-plan-next-step")}>Next Step</button>
              </div>
          </div>
      );
  };

    // NEW: Render Next Step Forms (Medication, Important Notes, Follow-up)
    const renderNextStepForms = () => {
        if (!selectedPatient) return <p>No patient selected for treatment plan.</p>;

        const handleSaveTreatmentPlan = () => {
            // Here you would typically save the data to your backend
            // For now, we'll just navigate to the summary page
            setActivePage("treatment-plan-summary");
        };

        return (
            <div className="treatment-plan-wrapper3">
               
                <h2>Additional Treatment Plan Details for {selectedPatient.first_name} {selectedPatient.last_name}</h2>

                <div className="three-column-forms3"> {/* Changed from forms-container3 to three-column-forms3 */}
                    <div className="card3 medication-treatment-form3">
                        <h3>Medication</h3>
                        {medicationTreatmentPlan.map((entry, index) => (
                          <div key={entry.id} className="dynamic-textarea-group3">
                            <textarea
                                placeholder="Enter medication details specific to this treatment plan..."
                                rows="4"
                                value={entry.text}
                                onChange={(e) => handleMedicationTreatmentPlanChange(entry.id, e.target.value)}
                            ></textarea>
                            <div className="dynamic-buttons3">
                              <button onClick={handleAddMedicationTreatmentPlan} className="add-button3">+</button>
                              {medicationTreatmentPlan.length > 1 && (
                                <button onClick={() => handleRemoveMedicationTreatmentPlan(entry.id)} className="remove-button3">-</button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="card3 important-notes-form3">
                        <h3>Important Notes</h3>
                        {importantNotes.map((entry, index) => (
                          <div key={entry.id} className="dynamic-textarea-group3">
                            <textarea
                                placeholder="Enter any important notes..."
                                rows="4"
                                value={entry.text}
                                onChange={(e) => handleImportantNotesChange(entry.id, e.target.value)}
                            ></textarea>
                          </div>
                        ))}
                    </div>
                    <div className="card3 follow-up-form3">
                        <h3>Follow-up</h3>
                        {followUpDetails.map((entry, index) => (
                          <div key={entry.id} className="dynamic-textarea-group3">
                            <textarea
                                placeholder="Enter follow-up instructions or schedule..."
                                rows="4"
                                value={entry.text}
                                onChange={(e) => handleFollowUpDetailsChange(entry.id, e.target.value)}
                            ></textarea>
                            <div className="dynamic-buttons3">
                              <button onClick={handleAddFollowUpDetails} className="add-button3">+</button>
                              {followUpDetails.length > 1 && (
                                <button onClick={() => handleRemoveFollowUpDetails(entry.id)} className="remove-button3">-</button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                </div>

                <div className="treatment-plan-actions3">
                    <button className="cancel-button3" onClick={() => setActivePage("treatment-plan")}>Back</button> {/* Back button */}
                    <button className="next-step-button3" onClick={handleSaveTreatmentPlan}>Save Treatment Plan</button> {/* Final save button */}
                </div>
            </div>
        );
    };

    // NEW: Render Treatment Plan Summary
    const renderTreatmentPlanSummary = () => {
        if (!selectedPatient) return <p>No patient selected for treatment plan summary.</p>;

        const latestWoundPhoto = woundPhotos.length > 0 ? woundPhotos[0] : null;

        const handlePrint = () => {
            window.print();
        };

        const handleSend = async () => {
            try {
                // Get the metric_id from the wound photo being used for the treatment plan
                const treatmentMetricId = latestWoundPhoto?.metric_id;
                
                if (!treatmentMetricId) {
                    alert("No wound photo record found to attach treatment plan.");
                    return;
                }

                // Diagnosis and Important Notes should be text, others are arrays
                const diagnosisText = diagnosisDetails.map(entry => entry.text).filter(Boolean).join('\n');
                const woundCareArray = woundCareDetails.map(entry => entry.text).filter(Boolean);
                const dressingArray = dressingDetails.map(entry => entry.text).filter(Boolean);
                const importantNotesText = importantNotes.map(entry => entry.text).filter(Boolean).join('\n');
                const followUpArray = followUpDetails.map(entry => entry.text).filter(Boolean);
                const medicationArray = medicationTreatmentPlan.map(entry => entry.text).filter(Boolean);

                console.log('Diagnosis text:', diagnosisText);
                console.log('Wound care array:', woundCareArray);
                console.log('Dressing array:', dressingArray);
                console.log('Medication array:', medicationArray);
                console.log('Important notes text:', importantNotesText);
                console.log('Follow-up array:', followUpArray);
                console.log('Updating metric_id:', treatmentMetricId);

                // Get current timestamp
                const now = new Date().toISOString();

                console.log('Sending treatment plan data');

                // Update the existing row in health_metrics table
                await updateHealthMetricsMut({
                    id: treatmentMetricId,
                    updates: {
                        wound_diagnosis: diagnosisText || null,
                        wound_care: woundCareArray.length > 0 ? woundCareArray : [],
                        wound_dressing: dressingArray.length > 0 ? dressingArray : [],
                        wound_medication: medicationArray.length > 0 ? medicationArray : [],
                        wound_important_notes: importantNotesText || null,
                        wound_follow_up: followUpArray.length > 0 ? followUpArray : [],
                        updated_at: now
                    }
                });

                alert("Treatment Plan saved successfully!");
                
                // Reset all form fields
                setDiagnosisDetails([{ id: Date.now(), text: '' }]);
                setWoundCareDetails([{ id: Date.now(), text: '' }]);
                setDressingDetails([{ id: Date.now(), text: '' }]);
                setMedicationTreatmentPlan([{ id: Date.now(), text: '' }]);
                setImportantNotes([{ id: Date.now(), text: '' }]);
                setFollowUpDetails([{ id: Date.now(), text: '' }]);
                setSelectedWoundPhoto(null);
                
                // Navigate back to patient list
                setActivePage("patient-list");
                
            } catch (err) {
                console.error('Unexpected error:', err);
                alert(`An unexpected error occurred: ${err.message}`);
            }
        };

        return (
            <div className="treatment-plan-wrapper3">
                <div className="patient-profile-header3">
                    <button className="back-button3" onClick={() => setActivePage("treatment-plan-next-step")}>Back to Edit Treatment Plan</button>
                </div>
                <h2>Treatment Plan Summary for {selectedPatient.first_name} {selectedPatient.last_name}</h2>

                {latestWoundPhoto && (
                    <div className="card3 latest-wound-photo-card3">
                        <h3>Latest Wound Photo</h3>
                        <img src={latestWoundPhoto.url} alt="Latest Wound" className="latest-wound-image3" />
                        <p><strong>Date:</strong> {new Date(latestWoundPhoto.date).toLocaleDateString()}</p>
                        <p><strong>Notes:</strong> {latestWoundPhoto.notes || 'N/A'}</p>
                    </div>
                )}

                <div className="forms-container3">
                    <div className="card3 diagnosis-form3"> {/* NEW: Diagnosis Summary */}
                        <h3>Diagnosis</h3>
                        {diagnosisDetails.length > 0 ? (
                            diagnosisDetails.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                    <div className="card3 wound-care-form3">
                        <h3>Wound Care</h3>
                        {woundCareDetails.length > 0 ? (
                            woundCareDetails.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                    <div className="card3 dressing-form3">
                        <h3>Dressing</h3>
                        {dressingDetails.length > 0 ? (
                            dressingDetails.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                    <div className="card3 medication-treatment-form3">
                        <h3>Medication</h3>
                        {medicationTreatmentPlan.length > 0 ? (
                            medicationTreatmentPlan.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                    <div className="card3 important-notes-form3">
                        <h3>Important Notes</h3>
                        {importantNotes.length > 0 ? (
                            importantNotes.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                    <div className="card3 follow-up-form3">
                        <h3>Follow-up</h3>
                        {followUpDetails.length > 0 ? (
                            followUpDetails.map((entry, index) => (
                                <p key={entry.id}>{entry.text || 'N/A'}</p>
                            ))
                        ) : (
                            <p>N/A</p>
                        )}
                    </div>
                </div>

                <div className="treatment-plan-actions3">
                    <button className="send-button3" onClick={handleSend}>📤 Send</button>
                    <button className="print-button3" onClick={handlePrint}>🖨️ Print</button>
                </div>
            </div>
        );
    };


  const renderPatientProfile = () => {
    console.log("Rendering patient profile - loading:", loading, "error:", error, "selectedPatient:", selectedPatient?.patient_id);
    
    if (loading) return <div className="loading-message3">Loading patient details...</div>;
    if (error) return <div className="error-message3">{error}</div>;
    if (!selectedPatient?.patient_id) return <div className="error-message3">No patient selected</div>;

    const latestMetric = patientMetrics.length > 0 ? patientMetrics[0] : null;
    const latestLab = patientLabs.length > 0 ? patientLabs[0] : null; // Get the latest lab result

    return (
      <div key={selectedPatient.patient_id} className="patient-detail-view-section">
        <div className="detail-view-header">
          <button className="back-to-list-button" onClick={() => setActivePage("dashboard")}>
            <img src="/picture/back.png" alt="Back" className="button-icon back-icon" /> Back to Dashboard
          </button>
          <div className="patient-details-header-row">
            <h2>Patient Details</h2>
          </div>
          <div className="patient-detail-nav-buttons">
            <button 
              className={`patient-nav-button ${patientDetailTab === "profile" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("profile")}
            >
              Patient Profile
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "charts" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("charts")}
            >
              History Charts
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "medication" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("medication")}
            >
              Medication
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "teamcare" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("teamcare")}
            >
              Team Care
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "woundgallery" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("woundgallery")}
            >
              Wound Gallery
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "appointment" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("appointment")}
            >
              Appointment
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "tables" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("tables")}
            >
              Tables
            </button>
            <button 
              className={`patient-nav-button ${patientDetailTab === "diasight" ? "active" : ""}`}
              onClick={() => setPatientDetailTab("diasight")}
            >
              DiaSight
            </button>
          </div>
        </div>
        <div className="patient-details-content-container">
          <div className="patient-details-left-column">
            {/* Patient Profile Tab Content */}
            {patientDetailTab === "profile" && (
            <>
            {/* Basic Patient Information Section */}
            <div className="patient-basic-info-section">
              <div className="patient-info-container">
                <div className="patient-avatar-container">
                  <img 
                    src={selectedPatient?.patient_picture || "/picture/secretary.png"} 
                    alt="Patient Avatar" 
                    className="patient-avatar-large"
                    onError={(e) => e.target.src = "/picture/secretary.png"}
                  />
                  <div className={`patient-phase-badge ${
                    selectedPatient.phase === 'Post-Op' || selectedPatient.phase === 'Post-Operative' ? 'post-operative' :
                    selectedPatient.phase === 'Pre-Op' || selectedPatient.phase === 'Pre-Operative' ? 'pre-operative' :
                    'default'
                  }`}>
                    {selectedPatient.phase === 'Post-Op' || selectedPatient.phase === 'Post-Operative' ? 'Post-operative' : 
                     selectedPatient.phase === 'Pre-Op' || selectedPatient.phase === 'Pre-Operative' ? 'Pre-operative' : 
                     selectedPatient.phase || 'N/A'}
                  </div>
                </div>
                <div className="patient-info-details">
                  <div className="patient-name-section">
                    <h2 className="patient-name-display">
                      {selectedPatient.first_name} {selectedPatient.middle_name ? selectedPatient.middle_name + ' ' : ''}{selectedPatient.last_name}
                    </h2>
                  </div>
                  <div className="patient-details-grid">
                    <div className="patient-detail-item">
                      <span className="detail-label">Diabetes Type:</span>
                      <span className="detail-value">{selectedPatient.diabetes_type || 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Duration of Diabetes:</span>
                      <span className="detail-value">{selectedPatient.diabetes_duration ? `${selectedPatient.diabetes_duration} years` : 'N/A'} years</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedPatient.contact_info || 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Gender:</span>
                      <span className="detail-value">{selectedPatient.gender || 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Age:</span>
                      <span className="detail-value">
                        {selectedPatient.date_of_birth 
                          ? new Date().getFullYear() - new Date(selectedPatient.date_of_birth).getFullYear() 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Height:</span>
                      <span className="detail-value">{selectedPatient.patient_height ? `${selectedPatient.patient_height} cm` : 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Weight:</span>
                      <span className="detail-value">{selectedPatient.patient_weight ? `${selectedPatient.patient_weight} kg` : 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">BMI:</span>
                      <span className="detail-value">{selectedPatient.BMI || 'N/A'}</span>
                    </div>
                    <div className="patient-detail-item">
                      <span className="detail-label">Hypertensive:</span>
                      <span className="detail-value">{selectedPatient.complication_history?.includes("Hypertensive") ? "Yes" : "No"}</span>
                    </div>
                    <div className="patient-detail-item full-width">
                      <span className="detail-label">Heart Disease:</span>
                      <span className="detail-value">{selectedPatient.complication_history?.includes("Heart Attack") ? "Yes" : "None"}</span>
                    </div>
                    <div className="patient-detail-item full-width">
                      <span className="detail-label">Smoking History:</span>
                      <span className="detail-value">{selectedPatient.smoking_status || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Latest Health Metrics Section */}
            <div className="latest-health-metrics-section">
              <h3>Latest Health Metrics</h3>
              {latestMetric ? (
                <>
                  <p><strong>Blood Glucose Level:</strong> {latestMetric.blood_glucose || 'N/A'} {latestMetric.blood_glucose ? 'mg/dL' : ''}</p>
                  <p><strong>Blood Pressure:</strong> {
                    (latestMetric.bp_systolic && latestMetric.bp_diastolic) 
                      ? `${latestMetric.bp_systolic}/${latestMetric.bp_diastolic} mmHg` 
                      : 'N/A'
                  }</p>
                  <p><strong>Risk Classification:</strong> 
                    <span className={`risk-classification-${(latestMetric.risk_classification || 'n-a').toLowerCase()}`}>
                      {latestMetric.risk_classification || 'N/A'}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p><strong>Blood Glucose Level:</strong> N/A</p>
                  <p><strong>Blood Pressure:</strong> N/A</p>
                  <p><strong>Risk Classification:</strong> 
                    <span className={`risk-classification-${(selectedPatient.risk_classification || 'n-a').toLowerCase()}`}>
                      {selectedPatient.risk_classification || 'N/A'}
                    </span>
                  </p>
                </>
              )}
            </div>
            </>
            )}

            {/* Charts Tab Content */}
            {patientDetailTab === "charts" && (
            <>
            {/* History Charts Section */}
            <div className="history-charts-section">
              
              {/* Blood Glucose Chart */}
              <div className="blood-glucose-chart-container">
                <div className="chart-header">
                  <h4>Blood Glucose Level History</h4>
                  <div className="time-filter-buttons">
                    <button 
                      className={`time-filter-btn ${glucoseTimeFilter === 'day' ? 'active' : ''}`}
                      onClick={() => setGlucoseTimeFilter('day')}
                    >
                      Day
                    </button>
                    <button 
                      className={`time-filter-btn ${glucoseTimeFilter === 'week' ? 'active' : ''}`}
                      onClick={() => setGlucoseTimeFilter('week')}
                    >
                      Week
                    </button>
                    <button 
                      className={`time-filter-btn ${glucoseTimeFilter === 'month' ? 'active' : ''}`}
                      onClick={() => setGlucoseTimeFilter('month')}
                    >
                      Month
                    </button>
                  </div>
                </div>
                <div className="chart-wrapper">
                  {(() => {
                    console.log('[Blood Glucose Chart] glucoseFilteredMetrics:', glucoseFilteredMetrics);
                    console.log('[Blood Glucose Chart] Length:', glucoseFilteredMetrics?.length || 0);
                    if (glucoseFilteredMetrics?.length > 0) {
                      console.log('[Blood Glucose Chart] Sample data:', glucoseFilteredMetrics[0]);
                      console.log('[Blood Glucose Chart] Blood glucose values:', glucoseFilteredMetrics.map(e => e.blood_glucose));
                    }
                    return null;
                  })()}
                  {glucoseFilteredMetrics.length > 0 ? (
                    <Line
                      data={{
                        labels: glucoseFilteredMetrics.map(entry => formatDateForChart(entry.submission_date)),
                        datasets: [{
                          label: 'Blood Glucose',
                          data: glucoseFilteredMetrics.map(entry => parseFloat(entry.blood_glucose) || 0),
                        fill: true,
                        backgroundColor: (context) => {
                          const chart = context.chart;
                          const {ctx, chartArea} = chart;
                          if (!chartArea) {
                            return null;
                          }
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
                          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');
                          return gradient;
                        },
                        borderColor: '#22c55e',
                        borderWidth: 2,
                        pointBackgroundColor: '#22c55e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.4,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `Glucose: ${context.raw} mg/dL`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Blood Glucose (mg/dL)',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          min: 0,
                          max: 300,
                          ticks: {
                            display: true,
                          },
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                          }
                        },
                        x: {
                          grid: {
                            display: false
                          },
                          title: {
                            display: true,
                            text: 'Date',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            display: true,
                            maxRotation: 45,
                            minRotation: 45
                          }
                        }
                      }
                    }}
                  />
                  ) : (
                    <div className="no-chart-data">
                      <p>No blood glucose data available for selected time period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Blood Pressure Chart */}
              <div className="blood-pressure-chart-container">
                <div className="chart-header">
                  <h4>Blood Pressure History</h4>
                  <div className="time-filter-buttons">
                    <button 
                      className={`time-filter-btn ${bpTimeFilter === 'day' ? 'active' : ''}`}
                      onClick={() => setBpTimeFilter('day')}
                    >
                      Day
                    </button>
                    <button 
                      className={`time-filter-btn ${bpTimeFilter === 'week' ? 'active' : ''}`}
                      onClick={() => setBpTimeFilter('week')}
                    >
                      Week
                    </button>
                    <button 
                      className={`time-filter-btn ${bpTimeFilter === 'month' ? 'active' : ''}`}
                      onClick={() => setBpTimeFilter('month')}
                    >
                      Month
                    </button>
                  </div>
                </div>
                <div className="chart-wrapper">
                  {bpFilteredMetrics.length > 0 ? (
                  <Bar
                    data={{
                      labels: bpFilteredMetrics.map(entry => formatDateForChart(entry.submission_date)),
                      datasets: [
                        {
                          label: 'Diastolic',
                          data: bpFilteredMetrics.map(entry => parseFloat(entry.bp_diastolic) || 0),
                          backgroundColor: 'rgba(134, 239, 172, 0.8)',
                          borderColor: 'rgba(134, 239, 172, 1)',
                          borderWidth: 1,
                          barThickness: 15,
                          borderRadius: {
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: 15,
                            bottomRight: 15
                          },
                          borderSkipped: false,
                        },
                        {
                          label: 'Systolic',
                          data: bpFilteredMetrics.map(entry => parseFloat(entry.bp_systolic) || 0),
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 1,
                          barThickness: 15,
                          borderRadius: {
                            topLeft: 15,
                            topRight: 15,
                            bottomLeft: 0,
                            bottomRight: 0
                          },
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        intersect: false,
                        mode: 'index',
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.raw} mmHg`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          stacked: true,
                          grid: {
                            display: false
                          },
                          title: {
                            display: true,
                            text: 'Date',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            display: true,
                            maxRotation: 45,
                            minRotation: 45
                          },
                          categoryPercentage: 0.95,
                          barPercentage: 0.95,
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Blood Pressure (mmHg)',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          min: 0,
                          max: 350,
                          ticks: {
                            display: true,
                          },
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                          }
                        }
                      }
                    }}
                  />
                  ) : (
                    <div className="no-chart-data">
                      <p>No blood pressure data available for selected time period</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            )}
          </div>

          <div className="patient-details-right-column">
            {/* Charts Tab - Right Column Content */}
            {patientDetailTab === "charts" && (
            <>
              {/* Risk Classification History Chart */}
              <div className="risk-classification-chart-container">
                <div className="chart-header">
                  <h4>Risk Classification History</h4>
                  <div className="time-filter-buttons">
                    <button 
                      className={`time-filter-btn ${riskTimeFilter === 'day' ? 'active' : ''}`}
                      onClick={() => setRiskTimeFilter('day')}
                    >
                      Day
                    </button>
                    <button 
                      className={`time-filter-btn ${riskTimeFilter === 'week' ? 'active' : ''}`}
                      onClick={() => setRiskTimeFilter('week')}
                    >
                      Week
                    </button>
                    <button 
                      className={`time-filter-btn ${riskTimeFilter === 'month' ? 'active' : ''}`}
                      onClick={() => setRiskTimeFilter('month')}
                    >
                      Month
                    </button>
                  </div>
                </div>
                
                <div className="risk-legend-container">
                  <div className="risk-legend-item">
                    <div className="risk-legend-color low-risk"></div>
                    <span>Low Risk</span>
                  </div>
                  <div className="risk-legend-item">
                    <div className="risk-legend-color moderate-risk"></div>
                    <span>Moderate Risk</span>
                  </div>
                  <div className="risk-legend-item">
                    <div className="risk-legend-color high-risk"></div>
                    <span>High Risk</span>
                  </div>
                  <div className="risk-legend-item">
                    <div className="risk-legend-color ppd-risk"></div>
                    <span>PPD</span>
                  </div>
                </div>

                <div className="chart-wrapper">
                  {riskFilteredMetrics.length > 0 ? (
                  <Bar
                    data={{
                      labels: riskFilteredMetrics.map(entry => formatDateForChart(entry.submission_date)),
                      datasets: [
                        {
                          label: 'Risk Classification',
                          data: riskFilteredMetrics.map(entry => {
                            const risk = entry.risk_classification?.toLowerCase();
                            if (risk === 'low' || risk === 'low risk') return 2;
                            if (risk === 'moderate' || risk === 'moderate risk') return 3;
                            if (risk === 'high' || risk === 'high risk') return 4;
                            if (risk === 'ppd') return 1;
                            return 0;
                          }),
                          backgroundColor: riskFilteredMetrics.map(entry => {
                            const risk = entry.risk_classification?.toLowerCase();
                            if (risk === 'low' || risk === 'low risk') return 'rgba(34, 197, 94, 0.8)';
                            if (risk === 'moderate' || risk === 'moderate risk') return 'rgba(255, 193, 7, 0.8)';
                            if (risk === 'high' || risk === 'high risk') return 'rgba(244, 67, 54, 0.8)';
                            if (risk === 'ppd') return 'rgba(103, 101, 105, 0.8)';
                            return 'rgba(156, 163, 175, 0.8)';
                          }),
                          borderColor: riskFilteredMetrics.map(entry => {
                            const risk = entry.risk_classification?.toLowerCase();
                            if (risk === 'low' || risk === 'low risk') return 'rgba(34, 197, 94, 1)';
                            if (risk === 'moderate' || risk === 'moderate risk') return 'rgba(255, 193, 7, 1)';
                            if (risk === 'high' || risk === 'high risk') return 'rgba(244, 67, 54, 1)';
                            if (risk === 'ppd') return 'rgba(103, 101, 105, 1)';
                            return 'rgba(156, 163, 175, 1)';
                          }),
                          borderWidth: 1,
                          barThickness: 15,
                          borderRadius: {
                            topLeft: 8,
                            topRight: 8,
                            bottomLeft: 8,
                            bottomRight: 8
                          },
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        intersect: false,
                        mode: 'index',
                      },
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const entry = riskFilteredMetrics[context.dataIndex];
                              return `Risk: ${entry.risk_classification || 'Unknown'}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false
                          },
                          title: {
                            display: true,
                            text: 'Date',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            display: true,
                            maxRotation: 45,
                            minRotation: 45
                          },
                          categoryPercentage: 0.95,
                          barPercentage: 0.95,
                        },
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Risk Level',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          min: 0,
                          max: 4,
                          ticks: {
                            display: true,
                            stepSize: 1,
                            callback: function(value) {
                              const labels = ['', 'PPD', 'Low', 'Moderate', 'High'];
                              return labels[value] || '';
                            }
                          },
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)',
                          }
                        }
                      }
                    }}
                  />
                  ) : (
                    <div className="no-chart-data">
                      <p>No risk classification data available for selected time period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Score Over Time Chart */}
              <div className="blood-glucose-chart-container">
                <div className="chart-header">
                  <h4>Risk Score Over Time</h4>
                  <div className="time-filter-buttons">
                    <button 
                      className={`time-filter-btn ${riskScoreTimeFilter === 'day' ? 'active' : ''}`}
                      onClick={() => setRiskScoreTimeFilter('day')}
                    >
                      Day
                    </button>
                    <button 
                      className={`time-filter-btn ${riskScoreTimeFilter === 'week' ? 'active' : ''}`}
                      onClick={() => setRiskScoreTimeFilter('week')}
                    >
                      Week
                    </button>
                    <button 
                      className={`time-filter-btn ${riskScoreTimeFilter === 'month' ? 'active' : ''}`}
                      onClick={() => setRiskScoreTimeFilter('month')}
                    >
                      Month
                    </button>
                  </div>
                </div>
                <div className="chart-wrapper">
                  {riskScoreFilteredMetrics.length > 0 ? (
                    <Line
                      data={{
                        labels: riskScoreFilteredMetrics.map(entry => formatDateForChart(entry.submission_date)),
                        datasets: [{
                          label: 'Risk Score',
                          data: riskScoreFilteredMetrics.map(entry => parseFloat(entry.risk_score) || 0),
                          fill: true,
                          backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) {
                              return null;
                            }
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
                            gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');
                            return gradient;
                          },
                          borderColor: '#22c55e',
                          borderWidth: 2,
                          pointBackgroundColor: '#22c55e',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          tension: 0.4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `Risk Score: ${context.raw}/100`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Risk Score',
                              font: {
                                size: 12,
                                weight: 'bold'
                              }
                            },
                            min: 0,
                            max: 100,
                            ticks: {
                              display: true,
                            },
                            grid: {
                              display: true,
                              color: 'rgba(0, 0, 0, 0.1)',
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            },
                            title: {
                              display: true,
                              text: 'Date',
                              font: {
                                size: 12,
                                weight: 'bold'
                              }
                            },
                            ticks: {
                              display: true,
                              maxRotation: 45,
                              minRotation: 45
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="no-chart-data">
                      <p>No risk score data available for selected time period</p>
                    </div>
                  )}
                </div>
              </div>
            </>
            )}

            {/* Patient Profile Tab - Right Column Content */}
            {patientDetailTab === "profile" && (
            <>
            {/* Laboratory Result Section */}
            <div className="laboratory-results-section">
              <h3>Laboratory Results (Latest)</h3>
              {latestLab ? (
                <>
                  <div className="lab-date-submitted">
                    <strong>Date Submitted:</strong> {new Date(latestLab.date_submitted).toLocaleDateString()}
                  </div>
                  <div className="lab-results-grid">
                    <div className="lab-result-item">
                      <span className="lab-label">Hba1c:</span>
                      <span className="lab-value">{latestLab.Hba1c || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">UCR:</span>
                      <span className="lab-value">{latestLab.ucr || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">GOT (AST):</span>
                      <span className="lab-value">{latestLab.got_ast || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">GPT (ALT):</span>
                      <span className="lab-value">{latestLab.gpt_alt || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">Cholesterol:</span>
                      <span className="lab-value">{latestLab.cholesterol || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">Triglycerides:</span>
                      <span className="lab-value">{latestLab.triglycerides || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">HDL:</span>
                      <span className="lab-value">{latestLab.hdl_cholesterol || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">LDL:</span>
                      <span className="lab-value">{latestLab.ldl_cholesterol || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">UREA:</span>
                      <span className="lab-value">{latestLab.urea || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">BUN:</span>
                      <span className="lab-value">{latestLab.bun || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">URIC:</span>
                      <span className="lab-value">{latestLab.uric || 'N/A'}</span>
                    </div>
                    <div className="lab-result-item">
                      <span className="lab-label">EGFR:</span>
                      <span className="lab-value">{latestLab.egfr || 'N/A'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p>No lab results available for this patient.</p>
              )}
            </div>
            </>
            )}
          </div>
        </div>

        {/* Medication Tab - Full Width */}
        {patientDetailTab === "medication" && (
        <div className="current-medications-section" style={{gridColumn: '1 / -1'}}>
          <div className="medications-table-container">
            <label>Current Medications:</label>
            <table className="medications-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Prescribed by</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patientMedications.length > 0 ? (
                  patientMedications.map((med, idx) => (
                    <tr key={med.id || idx}>
                      {editingMedicationId === med.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              name="name"
                              value={editMedicationData.name}
                              onChange={handleEditMedicationInputChange}
                              className="med-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              name="dosage"
                              value={editMedicationData.dosage}
                              onChange={handleEditMedicationInputChange}
                              className="med-input"
                            />
                          </td>
                          <td>
                            <div className="medication-checkbox-group-edit3">
                              <label>
                                <input
                                  type="checkbox"
                                  name="timeOfDay"
                                  value="morning"
                                  checked={editMedicationFrequencyData.timeOfDay.includes('morning')}
                                  onChange={handleEditMedicationFrequencyChange}
                                /> M
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  name="timeOfDay"
                                  value="noon"
                                  checked={editMedicationFrequencyData.timeOfDay.includes('noon')}
                                  onChange={handleEditMedicationFrequencyChange}
                                /> N
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  name="timeOfDay"
                                  value="dinner"
                                  checked={editMedicationFrequencyData.timeOfDay.includes('dinner')}
                                  onChange={handleEditMedicationFrequencyChange}
                                /> D
                              </label>
                            </div>
                          </td>
                          <td>
                            <input
                              type="date"
                              name="startDate"
                              value={editMedicationFrequencyData.startDate}
                              onChange={handleEditMedicationFrequencyChange}
                              className="med-input"
                            />
                          </td>
                          <td className="med-actions">
                            <button
                              className="action-button3 save-button3"
                              onClick={() => handleSaveMedication(med.id)}
                            >
                              Save
                            </button>
                            <button
                              className="action-button3 cancel-button3"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><input type="text" className="med-input" value={med.name || ''} readOnly /></td>
                          <td><input type="text" className="med-input" value={med.dosage || ''} readOnly /></td>
                          <td><input type="text" className="med-input" value={
                            med.medication_frequencies && med.medication_frequencies.length > 0 ?
                              med.medication_frequencies.map((freq) => freq.time_of_day.join(', ')).join('; ')
                              : 'N/A'
                          } readOnly /></td>
                          <td><input type="text" className="med-input" value={
                            (med.doctors && med.doctors.first_name) ? 
                              `${med.doctors.first_name} ${med.doctors.last_name}` : 
                              'Doctor'
                          } readOnly /></td>
                          <td className="med-actions">
                            <button
                              type="button"
                              className="edit-medication-button3"
                              onClick={() => handleEditClick(med)}
                              title="Edit medication"
                            >
                              <img src="/picture/edit.png" alt="Edit" className="button-icon" />
                            </button>
                            <button
                              type="button"
                              className="remove-medication-button3"
                              onClick={() => handleRemoveMedication(med.id)}
                              title="Remove medication"
                            >
                              <img src="/picture/minus.svg" alt="Remove" className="button-icon" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td><input type="text" className="med-input" placeholder="No medications" readOnly /></td>
                    <td><input type="text" className="med-input" placeholder="N/A" readOnly /></td>
                    <td><input type="text" className="med-input" placeholder="N/A" readOnly /></td>
                    <td><input type="text" className="med-input" placeholder="N/A" readOnly /></td>
                    <td className="med-actions">
                      <button type="button" className="add-med-button" title="Add medication">
                        <img src="/picture/add.svg" alt="Add" />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Add New Medication Form */}
          <div className="medication-input-group3">
            <input
              type="text"
              name="name"
              placeholder="Medication Name"
              value={newMedication.name}
              onChange={handleNewMedicationInputChange}
              className="medication-input3"
            />
            <input
              type="text"
              name="dosage"
              placeholder="Dosage"
              value={newMedication.dosage}
              onChange={handleNewMedicationInputChange}
              className="medication-input3"
            />
            <div className="medication-checkbox-group3">
              <label>
                <input
                  type="checkbox"
                  name="timeOfDay"
                  value="morning"
                  checked={newMedicationFrequency.timeOfDay.includes('morning')}
                  onChange={handleNewMedicationFrequencyChange}
                /> Morning
              </label>
              <label>
                <input
                  type="checkbox"
                  name="timeOfDay"
                  value="noon"
                  checked={newMedicationFrequency.timeOfDay.includes('noon')}
                  onChange={handleNewMedicationFrequencyChange}
                /> Noon
              </label>
              <label>
                <input
                  type="checkbox"
                  name="timeOfDay"
                  value="dinner"
                  checked={newMedicationFrequency.timeOfDay.includes('dinner')}
                  onChange={handleNewMedicationFrequencyChange}
                /> Dinner
              </label>
            </div>
            <input
              type="date"
              name="startDate"
              value={newMedicationFrequency.startDate}
              onChange={handleNewMedicationFrequencyChange}
              className="medication-input3"
            />
            <button onClick={handleAddMedication} className="add-medication-button3">Add Medication</button>
          </div>
        </div>
        )}

        {/* Team Care Tab - Full Width */}
        {patientDetailTab === "teamcare" && (
        <div className="doctor-assigned-section" style={{gridColumn: '1 / -1'}}>
          <h3>Team Care</h3>
          <div className="doctors-grid">
            {/* Assigned Doctor Card */}
            <div className="doctor-card">
              <div className="doctor-avatar">
                <img 
                  src="/picture/secretary.png" 
                  alt="Doctor Avatar"
                />
              </div>
              <div className="doctor-info">
                <span className="doctor-label">Assigned Doctor:</span>
                <h4 className="doctor-name">
                  {loading ? 'Loading...' : 
                    selectedPatient?.doctors 
                      ? `${selectedPatient.doctors.first_name} ${selectedPatient.doctors.last_name}` 
                      : user ? `${user.first_name} ${user.last_name}` : 'Dr. Name'}
                </h4>
                <p className="doctor-specialty">
                  {loading ? 'Loading...' : 
                    selectedPatient?.doctors?.specialization || user?.specialization || 'General Surgeon'}
                </p>
              </div>
            </div>

            {/* Assigned Specialists Cards */}
            {loading ? (
              <div className="doctor-card specialist-card">
                <div className="doctor-info">
                  <span className="doctor-label">Loading Specialists...</span>
                </div>
              </div>
            ) : currentPatientSpecialists.length > 0 ? (
              currentPatientSpecialists.map((specialist, index) => (
                <div key={specialist.id || index} className="doctor-card specialist-card">
                  <div className="doctor-avatar">
                    <img 
                      src="/picture/secretary.png" 
                      alt="Specialist Avatar"
                    />
                  </div>
                  <div className="doctor-info">
                    <span className="doctor-label">Specialist Doctor</span>
                    <h4 className="doctor-name">
                      {specialist.doctors 
                        ? `${specialist.doctors.first_name} ${specialist.doctors.last_name}` 
                        : 'Unknown Doctor'}
                    </h4>
                    <p className="doctor-specialty">
                      {specialist.doctors?.specialization || 'General'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="doctor-card specialist-card placeholder-card">
                <div className="doctor-avatar">
                  <img 
                    src="/picture/secretary.png" 
                    alt="No Specialist"
                  />
                </div>
                <div className="doctor-info">
                  <span className="doctor-label">Specialist Doctor</span>
                  <h4 className="doctor-name">No Specialist Assigned</h4>
                  <p className="doctor-specialty">-</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Appointment Tab - Full Width */}
        {patientDetailTab === "appointment" && (
        <div className="appointment-schedule-section" style={{gridColumn: '1 / -1'}}>
          <h3>Appointment Schedule</h3>
          <div className="patient-appointment-two-column-layout">
            {/* Left Column: Calendar with Appointment Details */}
            <div className="patient-appointment-left-column">
              <div className="patient-appointment-schedule-container">
                <div className="patient-appointment-calendar-container">
                  <Calendar
                    value={calendarDate}
                    onChange={setCalendarDate}
                    tileClassName={({ date, view }) => {
                      if (view === 'month') {
                        // Check if this date has an appointment
                        const hasAppointment = patientAppointments.some(appointment => {
                          const appointmentDate = new Date(appointment.appointment_datetime);
                          return (
                            appointmentDate.getDate() === date.getDate() &&
                            appointmentDate.getMonth() === date.getMonth() &&
                            appointmentDate.getFullYear() === date.getFullYear()
                          );
                        });
                        return hasAppointment ? 'patient-appointment-date' : null;
                      }
                    }}
                    tileContent={({ date, view }) => {
                      if (view === 'month') {
                        const dayAppointments = patientAppointments.filter(appointment => {
                          const appointmentDate = new Date(appointment.appointment_datetime);
                          return (
                            appointmentDate.getDate() === date.getDate() &&
                            appointmentDate.getMonth() === date.getMonth() &&
                            appointmentDate.getFullYear() === date.getFullYear()
                          );
                        });
                      }
                    }}
                  />
                </div>
                
                <div className="patient-appointment-details-list">
                  <h4>Upcoming Appointments</h4>
                  {(() => {
                    const now = new Date();
                    const upcomingAppointments = patientAppointments
                      .filter(appointment => new Date(appointment.appointment_datetime) >= now)
                      .sort((a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime));
                    
                    return upcomingAppointments.length > 0 ? (
                      <ul className="patient-appointment-list">
                        {upcomingAppointments.map((appointment, idx) => (
                          <li key={idx} className="patient-appointment-item">
                            <div className="patient-appointment-date-time">
                              <strong>{formatDateToReadable(appointment.appointment_datetime.split('T')[0])}</strong>
                              <span className="patient-appointment-time">
                                {formatTimeTo12Hour(appointment.appointment_datetime.substring(11, 16))}
                              </span>
                            </div>
                            {appointment.notes && (
                              <p className="patient-appointment-notes">{appointment.notes}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-appointments">No upcoming appointments.</p>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Right Column: Appointment Status Table */}
            <div className="patient-appointment-right-column">
              <div className="patient-appointment-table-container">
                <h4>Appointment Status</h4>
                {patientAppointments.length > 0 ? (
                  <>
                    <div className="appointment-table-wrapper">
                      <table className="patient-appointment-status-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const sortedAppointments = [...patientAppointments].sort((a, b) => 
                              new Date(b.appointment_datetime) - new Date(a.appointment_datetime)
                            );
                            const startIndex = (currentPageAppointments - 1) * APPOINTMENTS_PER_PAGE;
                            const endIndex = startIndex + APPOINTMENTS_PER_PAGE;
                            const paginatedAppointments = sortedAppointments.slice(startIndex, endIndex);
                            
                            return paginatedAppointments.map((appointment, idx) => (
                              <tr key={idx}>
                                <td>{formatDateToReadable(appointment.appointment_datetime.split('T')[0])}</td>
                                <td>{formatTimeTo12Hour(appointment.appointment_datetime.substring(11, 16))}</td>
                                <td>
                                  <span className={`appointment-status-badge ${appointment.appointment_state ? appointment.appointment_state.toLowerCase().replace(/\s+/g, '-') : 'pending'}`}>
                                    {appointment.appointment_state || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={currentPageAppointments}
                      totalPages={Math.ceil(patientAppointments.length / APPOINTMENTS_PER_PAGE)}
                      onPageChange={setCurrentPageAppointments}
                      itemsPerPage={APPOINTMENTS_PER_PAGE}
                      totalItems={patientAppointments.length}
                    />
                  </>
                ) : (
                  <p className="no-appointments">No appointments scheduled for this patient.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Tables Tab - Full Width */}
        {patientDetailTab === "tables" && (
        <div className="health-metrics-history-section" style={{gridColumn: '1 / -1'}}>
          <h3>Health Metrics History</h3>
          <div className="health-metrics-table-container">
            {allPatientHealthMetrics.length > 0 ? (
              <>
                <table className="health-metrics-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Blood Glucose (mg/dL)</th>
                      <th>Blood Pressure (mmHg)</th>
                      <th>Risk Score</th>
                      <th>Risk Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedHealthMetrics().map((metric, index) => (
                      <tr key={index}>
                        <td>{new Date(metric.submission_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="metric-value">
                          {metric.blood_glucose || 'N/A'}
                        </td>
                        <td className="metric-value">
                          {(metric.bp_systolic && metric.bp_diastolic) 
                            ? `${metric.bp_systolic}/${metric.bp_diastolic}` 
                            : metric.blood_pressure || 'N/A'}
                        </td>
                        <td className="metric-value">
                          {metric.risk_score ? `${metric.risk_score}/100` : 'N/A'}
                        </td>
                        <td className={`risk-classification-${(metric.risk_classification || 'N/A').toLowerCase()}`}>
                          {metric.risk_classification || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Health Metrics Pagination */}
                {getTotalHealthMetricsPages() > 1 && (
                  <div className="health-metrics-pagination">
                    <Pagination
                      currentPage={currentPageHealthMetrics}
                      totalPages={getTotalHealthMetricsPages()}
                      onPageChange={setCurrentPageHealthMetrics}
                      itemsPerPage={HEALTH_METRICS_PER_PAGE}
                      totalItems={allPatientHealthMetrics.length}
                      showPageInfo={true}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="no-metrics-message">
                <p>No health metrics available for this patient.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* DiaSight Tab - Full Width */}
        {patientDetailTab === "diasight" && (
        <div className="diasight-results-section" style={{gridColumn: '1 / -1'}}>
          <div className="diasight-results-header">
            <h3>DiaSight - Diabetic Retinopathy Detection</h3>
            <button 
              className="run-diasight-button"
              onClick={() => handleRunDiaSight(selectedPatient)}
              disabled={isRunningDiaSight || !patientLabs[0] || getLabStatus(patientLabs[0]) === 'Awaiting'}
              style={{
                opacity: isRunningDiaSight || !patientLabs[0] || getLabStatus(patientLabs[0]) === 'Awaiting' ? 0.5 : 1,
                cursor: isRunningDiaSight || !patientLabs[0] || getLabStatus(patientLabs[0]) === 'Awaiting' ? 'not-allowed' : 'pointer'
              }}
            >
              {isRunningDiaSight ? '🔍 Running Analysis...' : '🟢 Run New Analysis'}
            </button>
          </div>
          
          {/* Latest Result Card */}
          {(() => {
            // Parse DR results - handle both JSON strings and objects from database
            const rawDrClass = patientLabs[0]?.dr_class || [];
            const drResults = rawDrClass.map(item => {
              // If it's a string, parse it as JSON
              if (typeof item === 'string') {
                try {
                  return JSON.parse(item);
                } catch (e) {
                  console.error('Failed to parse DR result:', e);
                  return null;
                }
              }
              // If it's already an object, return it
              return item;
            }).filter(item => item && item.prediction && item.timestamp);
            
            if (drResults.length > 0) {
              const latestResult = drResults[drResults.length - 1];
              
              // Helper function to get color based on prediction
              const getPredictionColor = (prediction) => {
                if (!prediction) return '#9c27b0';
                const pred = prediction.toLowerCase();
                if (pred.includes('no dr') || pred === 'no dr') return '#22c55e';
                if (pred.includes('mild')) return '#ffc107';
                if (pred.includes('moderate')) return '#ff9800';
                if (pred.includes('severe') || pred.includes('proliferative')) return '#f44336';
                return '#9c27b0';
              };
              
              const getPredictionBgColor = (prediction) => {
                const color = getPredictionColor(prediction);
                return color.replace(')', ', 0.1)').replace('rgb', 'rgba').replace('#', '');
              };
              
              return (
                <>
                  <div className="diasight-latest-result">
                    <h4>Latest Analysis Result</h4>
                    <div className="diasight-result-card">
                      <div className="diasight-metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="diasight-metric-item" style={{
                          backgroundColor: `${getPredictionColor(latestResult.prediction)}15`,
                          borderColor: getPredictionColor(latestResult.prediction),
                          borderWidth: '2px',
                          borderStyle: 'solid'
                        }}>
                          <span className="metric-label">Prediction</span>
                          <span className="metric-value" style={{
                            color: getPredictionColor(latestResult.prediction),
                            fontWeight: 'bold'
                          }}>
                            {latestResult.prediction || 'N/A'}
                          </span>
                        </div>
                        <div className="diasight-metric-item">
                          <span className="metric-label">Confidence</span>
                          <span className="metric-value">
                            {latestResult.confidence != null && !isNaN(latestResult.confidence) 
                              ? `${(latestResult.confidence * 100).toFixed(1)}%` 
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="diasight-metric-item">
                          <span className="metric-label">Risk Score</span>
                          <span className="metric-value">
                            {latestResult.risk_score != null && !isNaN(latestResult.risk_score) 
                              ? latestResult.risk_score.toFixed(1)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="diasight-metric-item">
                          <span className="metric-label">Analysis Date</span>
                          <span className="metric-value">
                            {latestResult.timestamp 
                              ? new Date(latestResult.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progression Chart */}
                  {drResults.length > 1 && (
                    <div className="diasight-progression-section">
                      <h4>DR Progression Over Time</h4>
                      <div className="chart-wrapper" style={{ height: '300px' }}>
                        <Line
                          data={{
                            labels: drResults.map(result => 
                              result.timestamp 
                                ? new Date(result.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'N/A'
                            ),
                            datasets: [
                              {
                                label: 'Risk Score',
                                data: drResults.map(result => 
                                  result.risk_score != null ? result.risk_score : 0
                                ),
                                borderColor: 'rgba(59, 130, 246, 1)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: drResults.map(result => getPredictionColor(result.prediction)),
                                pointRadius: 8,
                                pointHoverRadius: 10,
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const result = drResults[context.dataIndex];
                                    return [
                                      `Prediction: ${result.prediction || 'N/A'}`,
                                      `Risk Score: ${result.risk_score != null ? result.risk_score.toFixed(1) : 'N/A'}`,
                                      `Confidence: ${result.confidence != null ? (result.confidence * 100).toFixed(1) + '%' : 'N/A'}`
                                    ];
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                  display: true,
                                  text: 'Risk Score'
                                }
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Date'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* History Table */}
                  <div className="diasight-history-section">
                    <h4>Analysis History ({drResults.length} records)</h4>
                    <table className="diasight-history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Prediction</th>
                          <th>Confidence</th>
                          <th>Risk Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...drResults].reverse().map((result, index) => (
                          <tr key={index}>
                            <td>
                              {result.timestamp 
                                ? new Date(result.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'N/A'}
                            </td>
                            <td>
                              <span className="dr-prediction-badge" style={{
                                backgroundColor: `${getPredictionColor(result.prediction)}20`,
                                color: getPredictionColor(result.prediction)
                              }}>
                                {result.prediction || 'N/A'}
                              </span>
                            </td>
                            <td>
                              {result.confidence != null && !isNaN(result.confidence) 
                                ? `${(result.confidence * 100).toFixed(1)}%` 
                                : 'N/A'}
                            </td>
                            <td>
                              {result.risk_score != null && !isNaN(result.risk_score) 
                                ? result.risk_score.toFixed(1)
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            } else {
              return (
                <div className="no-diasight-results">
                  <div className="no-results-icon">🔍</div>
                  <p>No DiaSight analysis has been run for this patient yet.</p>
                  <p className="no-results-hint">Click "Run New Analysis" to perform a diabetic retinopathy detection.</p>
                </div>
              );
            }
          })()}
        </div>
        )}
        
        {/* Wound Gallery Tab - Full Width */}
        {patientDetailTab === "woundgallery" && (
        <div className="wound-gallery-section" style={{gridColumn: '1 / -1'}}>
          <h3>Wound Gallery</h3>
          <div className="wound-gallery-grid">
            {woundPhotosLoading ? (
              <div className="loading-message">
                <p>Loading wound photos...</p>
              </div>
            ) : allWoundPhotos.length > 0 ? (
              allWoundPhotos.map((photo, index) => (
                <div key={index} className="wound-gallery-card">
                  <div className="wound-photo-container">
                    <img
                      src={photo.url}
                      alt={`Wound Photo - ${photo.date}`}
                      className="wound-photo-image"
                      onLoad={() => console.log(`Wound photo ${index} loaded successfully`)}
                      onError={(e) => {
                        console.error(`Failed to load wound photo ${index}:`, photo.url);
                        e.target.style.display = 'none';
                      }}
                    />
                    <button 
                      className="photo-expand-btn"
                      onClick={() => handleExpandPhoto(photo)}
                    >
                      <img src="/picture/expand.svg" alt="Expand" className="button-icon" />
                    </button>
                  </div>
                  
                  <div className="photo-info">
                    <div className="photo-timestamp">
                      <span className="photo-date">{formatDateToReadable(photo.date)}</span>
                      <span className="photo-time">| {new Date(photo.date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })}</span>
                    </div>
                    
                    <div className="photo-submitter">
                      <img 
                        src="/picture/secretary.png" 
                        alt="Submitter Avatar" 
                        className="submitter-avatar"
                      />
                      <span className="submitter-info">
                        <span className="submitter-text">by</span> {selectedPatient.first_name} {selectedPatient.last_name}
                      </span>
                    </div>
                    
                    <div className="photo-actions">
                      <button className="entry-btn">Entry ID: 00{allWoundPhotos.length - index}</button>
                      <button 
                        className="treatment-plan-btn"
                        onClick={() => handleCreateTreatmentPlanForPhoto(photo)}
                      >
                        Treatment Plan
                      </button>
                    </div>
                    
                    {photo.notes && (
                      <div className="photo-notes">
                        <strong>Notes:</strong> {photo.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-photos-message">
                <p>No wound photos available for this patient.</p>
              </div>
            )}
          </div>
          
          {/* Treatment Plan Button */}
        </div>
        )}

        {/* Photo Expansion Modal */}
        {expandedPhoto && (
          <div className="photo-modal-overlay" onClick={handleCloseExpandedPhoto}>
            <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="photo-modal-close" onClick={handleCloseExpandedPhoto}>
                <i className="fas fa-times"></i>
              </button>
              <img
                src={expandedPhoto.url}
                alt={`Expanded Wound Photo - ${expandedPhoto.date}`}
                className="expanded-photo-image"
              />
              <div className="expanded-photo-info">
                <h4>Wound Photo Details</h4>
                <p><strong>Date:</strong> {formatDateToReadable(expandedPhoto.date)}</p>
                <p><strong>Time:</strong> {new Date(expandedPhoto.date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}</p>
                {expandedPhoto.notes && (
                  <p><strong>Notes:</strong> {expandedPhoto.notes}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container-header-only3">
      <Header 
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={onLogout}
        showUsersPopup={showUsersPopup}
        setShowUsersPopup={setShowUsersPopup}
        showMessagePopup={showMessagePopup}
        setShowMessagePopup={setShowMessagePopup}
        userRole="Doctor"
      />

      <main className="content-area-full-width3">
        {activePage === "dashboard" && (
          <div className="dashboard-header-row">
            <h1 className="welcomeh1">Welcome, Dr. {user.first_name} 🩺</h1>
          </div>
        )}
        {activePage === "dashboard" && renderDashboardContent()}
        {activePage === "patient-profile" && selectedPatient?.patient_id && (
          <PatientDetailView
            patient={selectedPatient}
            userRole="Doctor"
            user={user}
            onClose={() => setActivePage("dashboard")}
            onWoundPhotoAction={handleCreateTreatmentPlanForPhoto}
            woundPhotoActionLabel="Treatment Plan"
            onRunDiaSight={handleRunDiaSight}
          />
        )}
        {activePage === "patient-list" && renderPatientList()}
        {activePage === "diasight" && renderDiaSight()}
        {activePage === "appointments" && renderAppointmentsSection()}
        {activePage === "reports" && !showReportTable && (
          <DoctorReportsOverview
            patients={patients}
            getPatientComplianceStatus={getPatientComplianceStatus}
            appointmentChartData={appointmentChartData}
            fullComplianceChartData={fullComplianceChartData}
            missingLogsChartData={missingLogsChartData}
            nonCompliantChartData={nonCompliantChartData}
            onWidgetClick={handleReportWidgetClick}
          />
        )}
        {activePage === "reports" && showReportTable && (
          <DoctorReportTableView
            reportTableTitle={reportTableTitle}
            reportTableType={reportTableType}
            patients={patients}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedRiskFilter={selectedRiskFilter}
            onRiskFilterChange={handleRiskFilterChange}
            selectedLabStatusFilter={selectedLabStatusFilter}
            onLabStatusChange={handleLabStatusFilterChange}
            selectedProfileStatusFilter={selectedProfileStatusFilter}
            onProfileStatusChange={handleProfileStatusFilterChange}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            currentPage={currentPagePatients}
            itemsPerPage={PATIENTS_PER_PAGE}
            onPageChange={setCurrentPagePatients}
            getLabStatus={getLabStatus}
            getProfileStatus={getProfileStatus}
            getClassificationDisplay={getClassificationDisplay}
            getPatientComplianceStatus={getPatientComplianceStatus}
            healthMetricsSubmissions={healthMetricsSubmissions}
            onBackClick={() => setShowReportTable(false)}
            onViewPatient={(patient) => {
              setSelectedPatient(patient);
              setActivePage("patient-profile");
            }}
            onPhaseToggle={handlePhaseToggle}
          />
        )}
        {activePage === "treatment-plan" && selectedPatient && renderTreatmentPlan()} {/* Render the first step of treatment plan */}
        {activePage === "treatment-plan-next-step" && selectedPatient && renderNextStepForms()} {/* Render the next step of treatment plan */}
        {activePage === "treatment-plan-summary" && selectedPatient && renderTreatmentPlanSummary()} {/* NEW: Render the summary page */}
      </main>

        {showThreePhotoModal && (
  <div className="three-photo-modal-overlay" onClick={() => setShowThreePhotoModal(false)}>
    <div className="three-photo-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="three-photo-modal-header">
        <h3>Wound Analysis</h3>
        <button className="close-button3" onClick={() => setShowThreePhotoModal(false)}>
          &times;
        </button>
      </div>
      <div className="three-photo-container">
        <div className="photo-analysis-item">
          <h4>Original Image</h4>
          <div className="photo-placeholder">
            {(selectedWoundPhoto || woundPhotos[0]) ? (
              <img src={(selectedWoundPhoto || woundPhotos[0]).url} alt="Original" />
            ) : (
              <div className="no-photo">No image available</div>
            )}
          </div>
        </div>
        <div className="photo-analysis-item">
          <h4>Grad-Cam Heatmap</h4>
          <div className="photo-placeholder">
            {analysisResults && analysisResults.gradcam ? (
              <img src={analysisResults.gradcam.startsWith('data:') ? analysisResults.gradcam : `data:image/png;base64,${analysisResults.gradcam}`} alt="Grad-Cam Heatmap" />
            ) : (
              <div className="analysis-placeholder">
                {isLoadingAnalysis ? 'Loading...' : 'Analysis not available'}
              </div>
            )}
          </div>
        </div>
        <div className="photo-analysis-item">
          <h4>Segmentation Mask</h4>
          <div className="photo-placeholder">
            {analysisResults && analysisResults.segmentation ? (
              <img src={analysisResults.segmentation.startsWith('data:') ? analysisResults.segmentation : `data:image/png;base64,${analysisResults.segmentation}`} alt="Segmentation Mask" />
            ) : (
              <div className="analysis-placeholder">
                {isLoadingAnalysis ? 'Loading...' : 'Analysis not available'}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="diagnosis-section">
        <h4>Diagnosis Results</h4>
        <div className="diagnosis-placeholder">
          {analysisResults ? (
            <div>
              <p><strong>Classification:</strong> {analysisResults.className}</p>
              <p><strong>Confidence:</strong> {(analysisResults.probability * 100).toFixed(2)}%</p>
              {analysisResults.prediction === 0 && (
                <p><strong>Ulcer Area:</strong> {analysisResults.ulcerArea.toFixed(2)}% of total area</p>
              )}
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                {analysisResults.prediction === 0 
                  ? 'Diabetic foot ulcer detected. The green overlay shows the affected region.'
                  : 'No ulcer detected. The skin appears healthy.'}
              </p>
            </div>
          ) : (
            <p>{isLoadingAnalysis ? 'Analyzing...' : 'Diagnosis results will be displayed here...'}</p>
          )}
        </div>
      </div>
    </div>
  </div>
)}

{/* DiaSight Results Modal */}
{showDiaSightModal && diaSightResults && (
  <div className="diasight-modal-overlay" onClick={() => setShowDiaSightModal(false)}>
    <div className="diasight-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="diasight-modal-header">
        <h3>🔍 DiaSight Analysis Complete</h3>
        <button className="close-button3" onClick={() => setShowDiaSightModal(false)}>
          &times;
        </button>
      </div>
      <div className="diasight-modal-body">
        <div className="patient-info-banner">
          <img 
            src={diaSightResults.patient.patient_picture || "/picture/secretary.png"} 
            alt="Patient" 
            className="patient-avatar-modal"
            onError={(e) => e.target.src = "/picture/secretary.png"}
          />
          <div className="patient-modal-details">
            <h4>{diaSightResults.patient.first_name} {diaSightResults.patient.last_name}</h4>
            <span className="analysis-timestamp">
              Analysis performed on {new Date(diaSightResults.result.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="diasight-result-main">
          <div className="diasight-stats-grid">
            {(() => {
              const getPredColor = (prediction) => {
                if (!prediction) return '#9c27b0';
                const pred = prediction.toLowerCase();
                if (pred.includes('no dr') || pred === 'no dr') return '#22c55e';
                if (pred.includes('mild')) return '#ffc107';
                if (pred.includes('moderate')) return '#ff9800';
                if (pred.includes('severe') || pred.includes('proliferative')) return '#f44336';
                return '#9c27b0';
              };
              const color = getPredColor(diaSightResults.result.prediction);
              return (
                <div className="diasight-stat-card" style={{
                  backgroundColor: `${color}15`,
                  borderLeft: `3px solid ${color}`
                }}>
                  <div className="stat-icon" style={{ color }}>🔍</div>
                  <div className="stat-content">
                    <span className="stat-label">Prediction</span>
                    <span className="stat-value" style={{ color }}>
                      {diaSightResults.result.prediction}
                    </span>
                  </div>
                </div>
              );
            })()}
            <div className="diasight-stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{(diaSightResults.result.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div className="diasight-stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <span className="stat-label">Risk Score</span>
                <span className="stat-value">{diaSightResults.result.risk_score?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
            <div className="diasight-stat-card">
              <div className="stat-icon">🔍</div>
              <div className="stat-content">
                <span className="stat-label">Analysis Count</span>
                <span className="stat-value">{diaSightResults.allResults?.length || 1}</span>
              </div>
            </div>
          </div>

          {/* Probability Distribution */}
          {diaSightResults.probabilities && (
            <div className="probability-distribution">
              <h4>Classification Probabilities</h4>
              <div className="probability-bars">
                {Object.entries(diaSightResults.probabilities).map(([className, prob]) => {
                  const getColor = (name) => {
                    const n = name.toLowerCase();
                    if (n.includes('no dr') || n === 'no dr') return '#22c55e';
                    if (n.includes('mild')) return '#ffc107';
                    if (n.includes('moderate')) return '#ff9800';
                    if (n.includes('severe') || n.includes('proliferative')) return '#f44336';
                    return '#9c27b0';
                  };
                  return (
                    <div key={className} className="probability-item">
                      <span className="probability-label">{className}</span>
                      <div className="probability-bar-container">
                        <div 
                          className="probability-bar-fill"
                          style={{
                            width: `${prob * 100}%`,
                            backgroundColor: getColor(className)
                          }}
                        />
                      </div>
                      <span className="probability-value">{(prob * 100).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="diasight-modal-actions">
          <button 
            className="view-patient-button"
            onClick={() => {
              setShowDiaSightModal(false);
              handleViewClick(diaSightResults.patient);
              setPatientDetailTab("diasight");
            }}
          >
            View Patient DiaSight History
          </button>
          <button className="close-modal-button" onClick={() => setShowDiaSightModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Dashboard;
