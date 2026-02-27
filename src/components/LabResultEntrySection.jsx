import React from "react";
import Pagination from "./Pagination";
import RiskFilter from "./RiskFilter";
import "./LabResultEntrySection.css";

const LabResultEntrySection = ({
  labEntryStep,
  setLabEntryStep,
  searchTerm,
  setSearchTerm,
  selectedLabRiskFilter,
  onLabRiskFilterChange,
  selectedLabEntryLabStatusFilter,
  onLabEntryLabStatusFilterChange,
  selectedLabEntryProfileStatusFilter,
  onLabEntryProfileStatusFilterChange,
  labEntrySortOrder,
  onLabEntrySortOrderChange,
  labSearchRiskCounts,
  labSearchLabStatusCounts,
  labSearchProfileStatusCounts,
  paginatedLabSearchPatients,
  getClassificationDisplay,
  onSelectPatientForLab,
  onViewPatientLabDetails,
  filteredLabSearchPatients,
  labSearchPatientsPerPage,
  currentPageLabSearchPatients,
  setCurrentPageLabSearchPatients,
  totalLabSearchPatientPages,
  labResults,
  onLabInputChange,
  onFinalizeLabSubmission,
  message,
  showSuccessModal,
  setShowSuccessModal,
  setActivePage,
}) => {
  return (
    <>
      <div className="lab-result-entry-section">
        <h2>Enter Patient Lab Results</h2>
        <p>Input the patient's baseline laboratory values to support risk classification and care planning.</p>
        <p>Once submitted, values will be locked for data integrity.</p>

        <div className="lab-stepper">
          <div className={`step ${labEntryStep >= 1 ? "completed" : ""} ${labEntryStep === 1 ? "active" : ""}`}>
            <div className="step-number">
              <img
                src={labEntryStep >= 1 ? "/picture/progress.svg" : "/picture/notprogress.svg"}
                alt={labEntryStep >= 1 ? "Completed" : "Pending"}
                style={{ width: "100%", height: "100%" }}
                onError={(e) => {
                  console.log("Lab stepper image failed to load:", e.target.src);
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div className="step-label">Search Patient</div>
          </div>
          <div className="divider"></div>
          <div className={`step ${labEntryStep >= 2 ? "completed" : ""} ${labEntryStep === 2 ? "active" : ""}`}>
            <div className="step-number">
              <img
                src={labEntryStep >= 2 ? "/picture/progress.svg" : "/picture/notprogress.svg"}
                alt={labEntryStep >= 2 ? "Completed" : "Pending"}
                style={{ width: "100%", height: "100%" }}
                onError={(e) => {
                  console.log("Lab stepper image failed to load:", e.target.src);
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div className="step-label">Lab Input Form</div>
          </div>
          <div className="divider"></div>
          <div className={`step ${labEntryStep >= 3 ? "completed" : ""} ${labEntryStep === 3 ? "active" : ""}`}>
            <div className="step-number">
              <img
                src={labEntryStep >= 3 ? "/picture/progress.svg" : "/picture/notprogress.svg"}
                alt={labEntryStep >= 3 ? "Completed" : "Pending"}
                style={{ width: "100%", height: "100%" }}
                onError={(e) => {
                  console.log("Lab stepper image failed to load:", e.target.src);
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div className="step-label">Lock-in Data</div>
          </div>
        </div>

        {labEntryStep === 1 && (
          <div className="lab-step-content">
            <div className="lab-patient-search-header">
              <h3>Patient List</h3>
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

                <RiskFilter
                  selectedRisk={selectedLabRiskFilter}
                  onRiskChange={onLabRiskFilterChange}
                  selectedLabStatus={selectedLabEntryLabStatusFilter}
                  onLabStatusChange={onLabEntryLabStatusFilterChange}
                  selectedProfileStatus={selectedLabEntryProfileStatusFilter}
                  onProfileStatusChange={onLabEntryProfileStatusFilterChange}
                  sortOrder={labEntrySortOrder}
                  onSortOrderChange={onLabEntrySortOrderChange}
                  showCounts={true}
                  counts={labSearchRiskCounts}
                  labStatusCounts={labSearchLabStatusCounts}
                  profileStatusCounts={labSearchProfileStatusCounts}
                />
              </div>
            </div>

            <table className="patient-table">
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
                {paginatedLabSearchPatients.length > 0 ? (
                  paginatedLabSearchPatients.map((pat) => (
                    <tr key={pat.patient_id}>
                      <td className="patient-name-cell">
                        <div className="patient-name-container">
                          <img
                            src={pat.patient_picture || "/picture/secretary.png"}
                            alt="Patient Avatar"
                            className="patient-avatar-table"
                            onError={(e) => {
                              e.target.src = "/picture/secretary.png";
                            }}
                          />
                          <span className="patient-name-text">
                            {pat.first_name} {pat.last_name}
                          </span>
                        </div>
                      </td>
                      <td>{pat.date_of_birth ? Math.floor((new Date() - new Date(pat.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"}</td>
                      <td>{pat.gender || "N/A"}</td>
                      <td
                        className={`classification-cell ${
                          pat.lab_status === "?Awaiting"
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
                      <td
                        className={
                          pat.lab_status === "?Submitted"
                            ? "lab-status-submitted"
                            : pat.lab_status === "Pending"
                              ? "lab-status-pending"
                              : pat.lab_status === "N/A"
                                ? "lab-status-na"
                                : ""
                        }
                      >
                        {pat.lab_status === "❌ Awaiting" ? "❌ Awaiting" : pat.lab_status || "N/A"}
                      </td>
                      <td className={pat.profile_status === "Finalized" ? "status-finalized" : "status-pending"}>{pat.profile_status}</td>
                      <td>
                        <div className="lab-actions-buttons">
                          <button className="enter-labs-button" onClick={() => onSelectPatientForLab(pat)}>
                            {pat.lab_status === "✅ Submitted" ? "🔄 Update" : "🧪 Enter Labs"}
                          </button>
                          <button className="view-labs-button" onClick={() => onViewPatientLabDetails(pat)}>
                            👁️ View
                          </button>
                        </div>
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

            {filteredLabSearchPatients.length > labSearchPatientsPerPage && (
              <Pagination
                currentPage={currentPageLabSearchPatients}
                totalPages={totalLabSearchPatientPages}
                onPageChange={setCurrentPageLabSearchPatients}
                itemsPerPage={labSearchPatientsPerPage}
                totalItems={filteredLabSearchPatients.length}
              />
            )}
          </div>
        )}

        {labEntryStep === 2 && (
          <div className="lab-step-content">
            <h3>
              Enter Lab Results for {labResults.selectedPatientForLab?.first_name} {labResults.selectedPatientForLab?.last_name}
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label>Date Submitted:</label>
                <input type="date" value={labResults.dateSubmitted} onChange={(e) => onLabInputChange("dateSubmitted", e.target.value)} />
              </div>
              <div className="form-group">
                <label>HbA1c (%):</label>
                <input type="number" step="0.1" placeholder="e.g., 7.0" value={labResults.Hba1c} onChange={(e) => onLabInputChange("Hba1c", e.target.value)} />
              </div>
              <div className="form-group">
                <label>UCR:</label>
                <input type="number" step="0.1" placeholder="e.g., 0.8" value={labResults.UCR} onChange={(e) => onLabInputChange("UCR", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>GOT (AST) (U/L):</label>
                <input type="number" placeholder="e.g., 25" value={labResults.gotAst} onChange={(e) => onLabInputChange("gotAst", e.target.value)} />
              </div>
              <div className="form-group">
                <label>GPT (ALT) (U/L):</label>
                <input type="number" placeholder="e.g., 30" value={labResults.gptAlt} onChange={(e) => onLabInputChange("gptAlt", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Cholesterol:</label>
                <input type="number" placeholder="e.g., 200" value={labResults.cholesterol} onChange={(e) => onLabInputChange("cholesterol", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Triglycerides:</label>
                <input type="number" placeholder="e.g., 150" value={labResults.triglycerides} onChange={(e) => onLabInputChange("triglycerides", e.target.value)} />
              </div>
              <div className="form-group">
                <label>HDL Cholesterol:</label>
                <input type="number" placeholder="e.g., 50" value={labResults.hdlCholesterol} onChange={(e) => onLabInputChange("hdlCholesterol", e.target.value)} />
              </div>
              <div className="form-group">
                <label>LDL Cholesterol:</label>
                <input type="number" placeholder="e.g., 100" value={labResults.ldlCholesterol} onChange={(e) => onLabInputChange("ldlCholesterol", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>UREA:</label>
                <input type="number" step="0.1" placeholder="e.g., 20" value={labResults.UREA} onChange={(e) => onLabInputChange("UREA", e.target.value)} />
              </div>
              <div className="form-group">
                <label>BUN:</label>
                <input type="number" step="0.1" placeholder="e.g., 15" value={labResults.BUN} onChange={(e) => onLabInputChange("BUN", e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>URIC:</label>
                <input type="number" step="0.1" placeholder="e.g., 5" value={labResults.URIC} onChange={(e) => onLabInputChange("URIC", e.target.value)} />
              </div>
              <div className="form-group">
                <label>EGFR (mL/min/1.73m²):</label>
                <input type="number" step="0.1" placeholder="e.g., 90" value={labResults.EGFR} onChange={(e) => onLabInputChange("EGFR", e.target.value)} />
              </div>
            </div>
            <div className="lab-navigation-buttons">
              <button className="previous-step-button" onClick={() => setLabEntryStep(1)}>
                Back
              </button>
              <button className="next-step-button" onClick={() => setLabEntryStep(3)}>
                Review & Finalize
              </button>
            </div>
          </div>
        )}

        {labEntryStep === 3 && (
          <div className="lab-step-content review-step">
            <h3>
              Review Lab Results for {labResults.selectedPatientForLab?.first_name} {labResults.selectedPatientForLab?.last_name}
            </h3>
            <div className="review-details">
              <p><strong>Date Submitted:</strong> {labResults.dateSubmitted}</p>
              <p><strong>HbA1c:</strong> {labResults.Hba1c} %</p>
              <p><strong>UCR:</strong> {labResults.UCR} mg/dL</p>
              <p><strong>GOT (AST):</strong> {labResults.gotAst} U/L</p>
              <p><strong>GPT (ALT):</strong> {labResults.gptAlt} U/L</p>
              <p><strong>Cholesterol:</strong> {labResults.cholesterol} mg/dL</p>
              <p><strong>Triglycerides:</strong> {labResults.triglycerides} mg/dL</p>
              <p><strong>HDL Cholesterol:</strong> {labResults.hdlCholesterol} mg/dL</p>
              <p><strong>LDL Cholesterol:</strong> {labResults.ldlCholesterol} mg/dL</p>
              <p><strong>UREA:</strong> {labResults.UREA} mg/dL</p>
              <p><strong>BUN:</strong> {labResults.BUN} mg/dL</p>
              <p><strong>URIC:</strong> {labResults.URIC} mg/dL</p>
              <p><strong>EGFR:</strong> {labResults.EGFR} mL/min/1.73m�</p>
            </div>
            <p className="final-warning">
              <img src="/picture/caution.png" alt="caution" /> Once finalized, these lab results cannot be edited. Please ensure all data is accurate.
            </p>
            <div className="lab-navigation-buttons">
              <button className="previous-step-button" onClick={() => setLabEntryStep(2)}>
                Go Back to Edit
              </button>
              <button className="next-step-button" onClick={onFinalizeLabSubmission}>
                Finalize Submission
              </button>
            </div>
          </div>
        )}

        {message && <p className="form-message">{message}</p>}
      </div>

      {showSuccessModal && (
        <div className="modal-backdrop">
          <div className="modal-content success-modal">
            <img src="/picture/labentry.png" alt="Lab Entry Success" className="success-icon" />
            <div className="modal-text-content">
              <h2 className="modal-title">Lab Results Successfully Submitted & Locked</h2>
              <p className="modal-subtext">
                The laboratory data has been securely stored and is now locked for editing to ensure accuracy and audit compliance.
              </p>
              <p className="modal-subtext">You may now proceed to finalize the patient profile with the attending doctor.</p>
              <button
                className="modal-green-button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setLabEntryStep(1);
                  setActivePage("dashboard");
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LabResultEntrySection;
