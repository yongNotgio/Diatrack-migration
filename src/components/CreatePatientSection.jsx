import React from "react";
import "./CreatePatientSection.css";

const CreatePatientSection = ({
  editingPatientId,
  setActivePage,
  steps,
  currentPatientStep,
  patientForm,
  handleInputChange,
  medications,
  handleMedicationChange,
  handleRemoveMedication,
  handleAddMedication,
  selectedDoctorId,
  setSelectedDoctorId,
  linkedDoctors,
  user,
  profilePicture,
  handleProfilePictureChange,
  handlePreviousStep,
  handleNextStep,
  handleSavePatientWithConfirmation,
  message,
  showPatientConfirmationModal,
  setShowPatientConfirmationModal,
  confirmAndSavePatient,
}) => {
  return (
    <>
      <div className="create-patient-section">
        <div className="create-patient-header">
          <h2>{editingPatientId ? "Edit Patient Account" : "Create New Patient"}</h2>
          <button className="close-form-button" onClick={() => setActivePage("dashboard")}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="progress-indicator">
          <div className="steps-container">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className={`step ${index === currentPatientStep ? "active" : ""} ${index < currentPatientStep ? "completed" : ""}`}>
                  <div className="step-number">
                    <img
                      src={index <= currentPatientStep ? "/picture/progress.svg" : "/picture/notprogress.svg"}
                      alt={index <= currentPatientStep ? "Completed" : "Pending"}
                      style={{ width: "100%", height: "100%" }}
                      onError={(e) => {
                        console.log("Image failed to load:", e.target.src);
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="step-name">{step}</div>
                </div>
                {index < steps.length - 1 && <div className={`progress-line ${index < currentPatientStep ? "completed" : ""}`}></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="patient-form-content">
          {currentPatientStep === 0 && (
            <div className="form-step demographics-form-step">
              <h3>Demographics</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name:</label>
                  <input className="patient-input" placeholder="First Name" value={patientForm.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Middle Name (Optional):</label>
                  <input className="patient-input" placeholder="Middle Name" value={patientForm.middleName} onChange={(e) => handleInputChange("middleName", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input className="patient-input" placeholder="Last Name" value={patientForm.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email:</label>
                  <input className="patient-input" placeholder="Email" type="email" value={patientForm.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input className="patient-input" placeholder="Password" type="password" value={patientForm.password} onChange={(e) => handleInputChange("password", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Gender:</label>
                  <select className="patient-input" value={patientForm.gender} onChange={(e) => handleInputChange("gender", e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input className="patient-input" placeholder="Date of Birth" type="date" value={patientForm.dateOfBirth} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Contact Number:</label>
                  <input className="patient-input" placeholder="Contact Info" value={patientForm.contactInfo} onChange={(e) => handleInputChange("contactInfo", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Address:</label>
                  <input className="patient-input" placeholder="Address" value={patientForm.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Height (cm):</label>
                  <input
                    className="patient-input"
                    placeholder="Height in cm"
                    type="number"
                    step="1"
                    value={patientForm.patientHeight}
                    onChange={(e) => handleInputChange("patientHeight", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg):</label>
                  <input
                    className="patient-input"
                    placeholder="Weight in kg"
                    type="number"
                    step="0.1"
                    value={patientForm.patientWeight}
                    onChange={(e) => handleInputChange("patientWeight", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>BMI:</label>
                  <input
                    className="patient-input"
                    placeholder="BMI"
                    type="number"
                    step="0.1"
                    value={patientForm.bmi}
                    onChange={(e) => handleInputChange("bmi", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Emergency Contact Number:</label>
                  <input className="patient-input" placeholder="Emergency Contact Number" value={patientForm.emergencyContactNumber} onChange={(e) => handleInputChange("emergencyContactNumber", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {currentPatientStep === 1 && (
            <div className="form-step diabetes-history-form-step">
              <h3>Diabetes History</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Diabetes Type:</label>
                  <select className="patient-input" value={patientForm.diabetesType} onChange={(e) => handleInputChange("diabetesType", e.target.value)}>
                    <option value="">Select Type</option>
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                    <option value="Gestational">Gestational</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Allergies:</label>
                  <input className="patient-input" placeholder="Allergies" value={patientForm.allergies} onChange={(e) => handleInputChange("allergies", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Duration of Diabetes:</label>
                  <input className="patient-input" placeholder="e.g., 5 years" value={patientForm.diabetes_duration} onChange={(e) => handleInputChange("diabetes_duration", e.target.value)} />
                </div>
              </div>
              <div className="medications-table-container">
                <label>Current Medications:</label>
                <table className="medications-table">
                  <thead>
                    <tr>
                      <th>Drug Name</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Prescribed by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med, index) => (
                      <tr key={index}>
                        <td><input type="text" className="med-input" value={med.drugName} onChange={(e) => handleMedicationChange(index, "drugName", e.target.value)} /></td>
                        <td><input type="text" className="med-input" value={med.dosage} onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)} /></td>
                        <td><input type="text" className="med-input" value={med.frequency} onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)} /></td>
                        <td><input type="text" className="med-input" value={med.prescribed_by} onChange={(e) => handleMedicationChange(index, "prescribed_by", e.target.value)} /></td>
                        <td className="med-actions">
                          {medications.length > 1 && (
                            <button type="button" className="remove-med-button" onClick={() => handleRemoveMedication(index)}>
                              <img src="/picture/minus.svg" alt="Remove" className="icon-button-img" />
                            </button>
                          )}
                          {index === medications.length - 1 && (
                            <button type="button" className="add-med-button" onClick={handleAddMedication}>
                              <img src="/picture/add.svg" alt="Add" className="icon-button-img" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentPatientStep === 2 && (
            <div className="form-step complication-history-form-step">
              <h3>Complication History</h3>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="footUlcers" checked={patientForm.footUlcersAmputation} onChange={(e) => handleInputChange("footUlcersAmputation", e.target.checked)} />
                  <label htmlFor="footUlcers">Foot Ulcers/Amputation</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="eyeIssues" checked={patientForm.eyeIssues} onChange={(e) => handleInputChange("eyeIssues", e.target.checked)} />
                  <label htmlFor="eyeIssues">Eye Issues</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="kidneyIssues" checked={patientForm.kidneyIssues} onChange={(e) => handleInputChange("kidneyIssues", e.target.checked)} />
                  <label htmlFor="kidneyIssues">Kidney Issues</label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="stroke" checked={patientForm.stroke} onChange={(e) => handleInputChange("stroke", e.target.checked)} />
                  <label htmlFor="stroke">Stroke</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="heartAttack" checked={patientForm.heartAttack} onChange={(e) => handleInputChange("heartAttack", e.target.checked)} />
                  <label htmlFor="heartAttack">Heart Attack</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="hypertensive" checked={patientForm.hypertensive} onChange={(e) => handleInputChange("hypertensive", e.target.checked)} />
                  <label htmlFor="hypertensive">Hypertensive</label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="family_diabetes" checked={patientForm.family_diabetes} onChange={(e) => handleInputChange("family_diabetes", e.target.checked)} />
                  <label htmlFor="family_diabetes">Family Diabetes</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="family_hypertension" checked={patientForm.family_hypertension} onChange={(e) => handleInputChange("family_hypertension", e.target.checked)} />
                  <label htmlFor="family_hypertension">Family Hypertension</label>
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="cardiovascular" checked={patientForm.cardiovascular} onChange={(e) => handleInputChange("cardiovascular", e.target.checked)} />
                  <label htmlFor="cardiovascular">Cardiovascular</label>
                </div>
              </div>
            </div>
          )}

          {currentPatientStep === 3 && (
            <div className="form-step lifestyle-form-step">
              <h3>Lifestyle</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Smoking Status:</label>
                  <select className="patient-input" value={patientForm.smokingStatus} onChange={(e) => handleInputChange("smokingStatus", e.target.value)}>
                    <option value="">Select Status</option>
                    <option value="Never Smoked">Never Smoked</option>
                    <option value="Former Smoker">Former Smoker</option>
                    <option value="Current Smoker">Current Smoker</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Monitoring Frequency (Glucose):</label>
                  <input className="patient-input" placeholder="e.g., Daily, Weekly" value={patientForm.monitoringFrequencyGlucose} onChange={(e) => handleInputChange("monitoringFrequencyGlucose", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Last Doctor Visit:</label>
                  <input className="patient-input" type="date" value={patientForm.lastDoctorVisit} onChange={(e) => handleInputChange("lastDoctorVisit", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Eye Exam:</label>
                  <input className="patient-input" type="date" value={patientForm.lastEyeExam} onChange={(e) => handleInputChange("lastEyeExam", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {currentPatientStep === 4 && (
            <div className="form-step assignment-form-step">
              <h3>Assignment</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign Doctor:</label>
                  <select className="doctor-select" value={selectedDoctorId} onChange={(e) => setSelectedDoctorId(e.target.value)}>
                    <option value="">Select Doctor</option>
                    {linkedDoctors.map((doc) => (
                      <option key={doc.doctor_id} value={doc.doctor_id}>{doc.doctor_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prepared By:</label>
                  <input className="patient-input" type="text" value={user ? `${user.first_name} ${user.last_name}` : ""} readOnly />
                </div>
              </div>

              <div className="profile-picture-section">
                <h4>Optional Profile Picture</h4>
                <div className="profile-picture-upload">
                  <div className="upload-area">
                    {profilePicture ? (
                      <div className="preview-container">
                        <img
                          src={profilePicture}
                          alt="Profile Preview"
                          className="profile-preview"
                          onError={(e) => (e.target.src = "/picture/secretary.png")}
                        />
                        <button className="change-photo-btn" onClick={() => document.getElementById("profile-picture-input").click()}>
                          Change Photo
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="upload-icon">
                          <i className="fas fa-camera"></i>
                        </div>
                        <p className="upload-text">
                          Drop your file here, or <span className="upload-link" onClick={() => document.getElementById("profile-picture-input").click()}>Browse</span>
                        </p>
                        <p className="upload-subtext">Max size 10MB</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="file-input-hidden"
                      id="profile-picture-input"
                      onChange={handleProfilePictureChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-navigation-buttons">
          {currentPatientStep === 0 ? (
            <button className="cancel-button" onClick={() => setActivePage("dashboard")}>Cancel</button>
          ) : (
            <button className="previous-step-button" onClick={handlePreviousStep}>Previous</button>
          )}
          {currentPatientStep < steps.length - 1 && (
            <button className="next-step-button" onClick={handleNextStep}>Next</button>
          )}
          {currentPatientStep === steps.length - 1 && (
            <button className="next-step-button" onClick={handleSavePatientWithConfirmation}>
              {editingPatientId ? "Update Patient" : "Create Patient"}
            </button>
          )}
        </div>
        {message && <p className="form-message">{message}</p>}
      </div>

      {showPatientConfirmationModal && (
        <div className="modal-backdrop">
          <div className="modal-content confirmation-modal">
            <img src="/picture/confirm.png" alt="Confirmation Image" className="confirmation-icon" />
            <div className="modal-text-content">
              <h2 className="modal-title"> Finalize Patient Profile?</h2>
              <p className="modal-subtext">
                The laboratory data has been securely stored and is now locked for editing to ensure accuracy and audit compliance.
                You may now proceed to finalize the patient profile with the attending doctor..
                <br /><br />
                This action will {editingPatientId ? "update the existing" : "create a new"} patient record.
              </p>
              <div className="modal-buttons">
                <button className="cancel-button" onClick={() => setShowPatientConfirmationModal(false)}>
                  Go Back to Edit
                </button>
                <button className="modal-green-button" onClick={confirmAndSavePatient}>
                  Yes, Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePatientSection;
