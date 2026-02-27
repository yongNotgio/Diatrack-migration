import React from "react";
import "./AppointmentManagementSection.css";

const AppointmentManagementSection = ({
  editingAppointmentId,
  appointmentForm,
  onAppointmentChange,
  onSubmitAppointment,
  onCancelEdit,
  message,
  doctors,
  patients,
  showDoctorUnavailabilityWarning,
  unavailableDatesForSelectedDoctor,
  availability,
}) => {
  return (
    <>
      <div className="appointment-mgmt-section">
        <h2>{editingAppointmentId ? "Edit Appointment" : "Schedule New Appointment"}</h2>

        <div className="appointment-mgmt-form-columns">
          <div className="form-group">
            <label>Select Doctor:</label>
            <select
              value={appointmentForm.doctorId}
              onChange={(e) => onAppointmentChange("doctorId", e.target.value)}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Patient:</label>
            <select
              value={appointmentForm.patientId}
              onChange={(e) => onAppointmentChange("patientId", e.target.value)}
            >
              <option value="">Select Patient</option>
              {patients.map((pat) => (
                <option key={pat.patient_id} value={pat.patient_id}>
                  {pat.first_name} {pat.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              value={appointmentForm.date}
              onChange={(e) => onAppointmentChange("date", e.target.value)}
            />
            {showDoctorUnavailabilityWarning && (
              <p className="appointment-mgmt-warning">Selected doctor is not available on this date</p>
            )}
          </div>

          <div className="form-group">
            <label>Time:</label>
            <input
              type="time"
              value={appointmentForm.time}
              onChange={(e) => onAppointmentChange("time", e.target.value)}
            />
          </div>
        </div>

        {unavailableDatesForSelectedDoctor.length > 0 && (
          <div className="appointment-mgmt-unavailable-dates-banner">
            <strong>Doctor Unavailable Dates:</strong>
            <ul>
              {unavailableDatesForSelectedDoctor.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {new Date(`${d.unavailable_date}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {d.reason ? ` - ${d.reason}` : ""}
                </li>
              ))}
              {unavailableDatesForSelectedDoctor.length > 5 && (
                <li className="appointment-mgmt-more-dates">
                  ...and {unavailableDatesForSelectedDoctor.length - 5} more
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="form-group full-width">
          <label>Notes:</label>
          <textarea
            placeholder="Notes"
            value={appointmentForm.notes}
            onChange={(e) => onAppointmentChange("notes", e.target.value)}
          />
        </div>

        <div className="button-group">
          <button className="appointment-mgmt-submit-btn" onClick={onSubmitAppointment}>
            {editingAppointmentId ? "Update Appointment" : "Schedule Appointment"}
          </button>
          {editingAppointmentId && (
            <button className="cancel-button" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>

        {message && <p className="form-message">{message}</p>}
      </div>

      {availability && (
        <div className="appointment-mgmt-availability-section">
          <div className="appointment-mgmt-availability-header">
            <h3>Doctor Availability Management</h3>
            <button
              className="appointment-mgmt-toggle-btn"
              onClick={availability.onToggleForm}
            >
              {availability.showForm ? "Cancel" : "+ Mark Date Unavailable"}
            </button>
          </div>

          {availability.showForm && (
            <div className="appointment-mgmt-unavailability-form">
              <div className="appointment-mgmt-form-columns three-columns">
                <div className="form-group">
                  <label>Select Doctor:</label>
                  <select
                    value={availability.form.doctorId}
                    onChange={(e) => availability.onFormChange({ doctorId: e.target.value })}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={availability.form.date}
                    onChange={(e) => availability.onFormChange({ date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="form-group">
                  <label>Reason (Optional):</label>
                  <input
                    type="text"
                    value={availability.form.reason}
                    onChange={(e) => availability.onFormChange({ reason: e.target.value })}
                    placeholder="e.g., Vacation, Conference..."
                  />
                </div>
              </div>
              <button className="appointment-mgmt-mark-unavailable-btn" onClick={availability.onAddDate}>
                Mark Unavailable
              </button>
            </div>
          )}

          <div className="appointment-mgmt-unavailable-dates-list">
            <h4>Upcoming Unavailable Dates</h4>
            {availability.dates.length === 0 ? (
              <p className="appointment-mgmt-empty-dates">No unavailable dates marked.</p>
            ) : (
              <div className="appointment-mgmt-unavailable-grid">
                {availability.dates.map((unavailable) => (
                  <div key={unavailable.id} className="appointment-mgmt-unavailable-card">
                    <div className="appointment-mgmt-unavailable-card-header">
                      <div>
                        <strong>
                          Dr. {unavailable.doctors?.first_name} {unavailable.doctors?.last_name}
                        </strong>
                        <p className="appointment-mgmt-unavailable-date">
                          {new Date(`${unavailable.unavailable_date}T00:00:00`).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {unavailable.reason && (
                          <p className="appointment-mgmt-unavailable-reason">Reason: {unavailable.reason}</p>
                        )}
                      </div>
                      <button
                        className="appointment-mgmt-remove-date-btn"
                        onClick={() => availability.onRemoveDate(unavailable.id)}
                        title="Remove unavailable date"
                      >
                        x
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentManagementSection;
