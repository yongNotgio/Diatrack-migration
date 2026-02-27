// ✅ FULL AdminDashboard.jsx WITH SIDEBAR LAYOUT

import React, { useState, useEffect } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Pagination from "./components/Pagination";
import "./AdminDashboard.css";
import logo from "/picture/logo.png"; // Import the logo image
import AuditLogs from "./AuditLogs"; // Import the AuditLogs component
import { logSystemAction, logPatientDataChange } from "./auditLogger"; // Import audit logging functions
import Header from "./components/Header";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdminDashboard = ({ onLogout, user }) => {
  const [secretaries, setSecretaries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [links, setLinks] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard"); // Default to dashboard tab
  const [message, setMessage] = useState("");
  const [adminName, setAdminName] = useState("Admin"); // State for admin name

  const [filteredDoctors, setFilteredDoctors] = useState([]);

  // New state for selected list type in the "List" dropdown
  const [selectedListType, setSelectedListType] = useState("patients"); // Default to showing patients

  // New state for account creation type in the accounts tab
  const [accountCreationType, setAccountCreationType] = useState(null);

   // New state to manage the multi-step form for doctor creation
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [modalContent, setModalContent] = useState({}); // New state for modal content

  
  // New state to control the dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showUsersPopup, setShowUsersPopup] = useState(false);
  const [showMessagePopup, setShowMessagePopup] = useState(false);

   // Updated doctorForm state to include new fields for the multi-step form
  const [doctorForm, setDoctorForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    specialization: "",
    medicalLicense: "", // New field for step 2
    licenseExpiration: "", // New field for step 2
    affiliation: "", // New field for step 3
    clinicHours: "", // New field for step 3
    clinicAddress: "", // New field for step 3
    secretaryId: "",
  });

  const [currentSecretaryStep, setCurrentSecretaryStep] = useState(1);
  const [secretaryForm, setSecretaryForm] = useState({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  doctorId: "", // This will be used in the final step
  affiliation: "", // New field for step 2
  clinicHours: "", // New field for step 2
  });

  const handleNextSecretaryStep = () => {
  if (currentSecretaryStep < 3) {
    setCurrentSecretaryStep(currentSecretaryStep + 1);
  }
};

const handlePrevSecretaryStep = () => {
  if (currentSecretaryStep > 1) {
    setCurrentSecretaryStep(currentSecretaryStep - 1);
  }
};

  const [newLinkSecretary, setNewLinkSecretary] = useState("");
  const [newLinkDoctor, setNewLinkDoctor] = useState("");

  // New states for pagination
  const [currentPagePatients, setCurrentPagePatients] = useState(1);
  const [patientsPerPage] = useState(6); // Max 6 items per page

  const [currentPageDoctors, setCurrentPageDoctors] = useState(1);
  const [doctorsPerPage] = useState(6); // Max 6 items per page

  const [healthMetrics, setHealthMetrics] = useState([]);
  const [chartData, setChartData] = useState({
    patients: [],
    doctors: [],
    secretaries: [],
    labels: []
  });

  const convex = useConvex();
  const createDoctorMut = useMutation(api.doctors.create);
  const updateDoctorMut = useMutation(api.doctors.update);
  const removeDoctorMut = useMutation(api.doctors.remove);
  const createSecretaryMut = useMutation(api.secretaries.create);
  const updateSecretaryMut = useMutation(api.secretaries.update);
  const removeSecretaryMut = useMutation(api.secretaries.remove);
  const createPatientMut = useMutation(api.patients.create);
  const updatePatientMut = useMutation(api.patients.update);
  const removePatientMut = useMutation(api.patients.remove);
  const createLinkMut = useMutation(api.secretaryDoctorLinks.create);
  const removeLinkMut = useMutation(api.secretaryDoctorLinks.remove);

  const fetchLastSubmissions = async () => {
    try {
      const data = await convex.query(api.healthMetrics.getSubmissions, {});

      // Create a map to store the most recent updated_at timestamp for each patient
      const lastSubmissions = new Map();
      data.forEach((metric) => {
        if (!lastSubmissions.has(metric.patient_id)) {
          lastSubmissions.set(metric.patient_id, metric.updated_at);
        }
      });

      // Convert the Map to an object for state
      setHealthMetrics(Object.fromEntries(lastSubmissions));
    } catch (err) {
      setMessage(`Error fetching health metrics: ${err.message}`);
    }
  };

  // Function to generate last 6 months chart data with actual database data
  const generateChartData = async () => {
    try {
      // Fetch all data once
      const allPatients = await convex.query(api.patients.listAll, {});
      const allDoctors = await convex.query(api.doctors.list, {});
      const allSecretaries = await convex.query(api.secretaries.list, {});

      const now = new Date();
      const months = [];
      const patientData = [];
      const doctorData = [];
      const secretaryData = [];
      
      // Generate last 6 months labels and data
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(now.getMonth() - i);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthYear);
        
        // Calculate start and end of the month as timestamps
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        
        patientData.push(allPatients.filter(p => p.created_at >= startOfMonth && p.created_at <= endOfMonth).length);
        doctorData.push(allDoctors.filter(d => d.created_at >= startOfMonth && d.created_at <= endOfMonth).length);
        secretaryData.push(allSecretaries.filter(s => s.created_at >= startOfMonth && s.created_at <= endOfMonth).length);
      }

      setChartData({
        patients: patientData,
        doctors: doctorData,
        secretaries: secretaryData,
        labels: months
      });

    } catch (error) {
      console.error("Error generating chart data:", error);
      // Fallback to empty data if there's an error
      setChartData({
        patients: [0, 0, 0, 0, 0, 0],
        doctors: [0, 0, 0, 0, 0, 0],
        secretaries: [0, 0, 0, 0, 0, 0],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      });
    }
  };

  // New states for secretary pagination
  const [currentPageSecretaries, setCurrentPageSecretaries] = useState(1);
  const [secretariesPerPage] = useState(6); // Max 6 items per page

  // New states for compliance pagination
  const [currentPageCompliance, setCurrentPageCompliance] = useState(1);
  const [compliancePerPage] = useState(10); // Max 10 items per page

  // New states for patient editing
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editPatientForm, setEditPatientForm] = useState({
    first_name: "",
    last_name: "",
    password: "",
    date_of_birth: "",
    contact_info: "",
  });

  // New states for doctor editing
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [editDoctorForm, setEditDoctorForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "", // Password for doctors too
    specialization: "",
  });

  // New states for secretary editing
  const [editingSecretaryId, setEditingSecretaryId] = useState(null);
  const [editSecretaryForm, setEditSecretaryForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  // New state for search queries
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [secretarySearchQuery, setSecretarySearchQuery] = useState('');


  useEffect(() => {
    const initializeData = async () => {
      await fetchSecretaries();
      await fetchDoctors();
      await fetchLinks();
      await fetchLastSubmissions();
      await generateChartData();
    };
    
    initializeData();
  }, []);

  // Effect to update adminName when the user prop changes
  useEffect(() => {
    if (user && user.first_name && user.last_name) {
      setAdminName(`${user.first_name} ${user.last_name}`);
    } else {
      setAdminName("Admin"); // Fallback if user data isn't complete
    }
  }, [user]);


  // Effect for fetching patients
  useEffect(() => {
    fetchPatients();
  }, [currentPagePatients]); // Re-fetch patients when page changes

  // Effect for fetching doctors with secretary info
  useEffect(() => {
    fetchDoctorsWithSecretaryInfo(); // Call the new function
  }, [currentPageDoctors]); // Re-fetch doctors when page changes

  // Effect for fetching secretaries (for the new table)
  useEffect(() => {
    fetchSecretaries(); // Already fetching all, pagination will slice
  }, [currentPageSecretaries]); // Re-fetch secretaries when page changes


  const fetchSecretaries = async () => {
    try {
      const data = await convex.query(api.secretaries.list, {});
      setSecretaries(data);
    } catch (err) {
      setMessage(`Error fetching secretaries: ${err.message}`);
    }
  };

  const fetchDoctors = async () => {
    try {
      const data = await convex.query(api.doctors.list, {});
      setDoctors(data);
    } catch (err) {
      setMessage(`Error fetching doctors: ${err.message}`);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await convex.query(api.patients.listAll, {});
      setPatients(data);
    } catch (err) {
      setMessage(`Error fetching patients: ${err.message}`);
    }
  };

  
  const fetchLinks = async () => {
    try {
      const data = await convex.query(api.secretaryDoctorLinks.listAll, {});
      setLinks(data);
    } catch (err) {
      setMessage(`Error fetching links: ${err.message}`);
    }
  };

  // Renamed and modified from fetchDoctorsBySecretary
  const fetchDoctorsWithSecretaryInfo = async () => {
    try {
      const data = await convex.query(api.doctors.listWithSecretaryInfo, {});
      setFilteredDoctors(data);
    } catch (err) {
      setMessage(`Error fetching doctors with secretary info: ${err.message}`);
      setFilteredDoctors([]);
    }
  };

  // New function to handle moving to the next step
  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // New function to handle moving to the previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createDoctor = async () => {
    const confirm = window.confirm("Are you sure you want to create this doctor?");
    if (!confirm) {
      setMessage("Doctor creation canceled.");
      return;
    }

    let doctorId;
    try {
      doctorId = await createDoctorMut({
        first_name: doctorForm.firstName,
        last_name: doctorForm.lastName,
        email: doctorForm.email,
        password: doctorForm.password,
        affiliation: doctorForm.affiliation || undefined,
        specialization: doctorForm.specialization || undefined,
      });
    } catch (err) {
      setMessage(`Error creating doctor: ${err.message}`);
      return;
    }

    if (doctorForm.secretaryId) {
      await createLinkMut({
        secretary_id: doctorForm.secretaryId,
        doctor_id: doctorId,
      });
      
      // Log the linking action
      await logSystemAction(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        'user_management',
        'create',
        `Linked doctor ${doctorForm.firstName} ${doctorForm.lastName} to secretary`,
        'Admin Dashboard'
      );
    }

    // Log doctor creation
    await logSystemAction(
      'admin',
      user?.admin_id || 'unknown-admin',
      adminName,
      'user_management',
      'create',
      `Created doctor account: ${doctorForm.firstName} ${doctorForm.lastName} (${doctorForm.email})`,
      'Admin Dashboard'
    );

    setMessage("Doctor created and linked successfully!");
    fetchDoctors();
    fetchLinks();
    fetchDoctorsWithSecretaryInfo(); // Re-fetch doctors with secretary info to update the list
    setDoctorForm({ firstName: "", lastName: "", email: "", password: "", specialization: "", secretaryId: "" }); // Clear form
  };

  const createSecretary = async () => {
    const confirm = window.confirm("Are you sure you want to create this secretary?");
    if (!confirm) {
      setMessage("Secretary creation canceled.");
      return;
    }

    let secretaryId;
    try {
      secretaryId = await createSecretaryMut({
        first_name: secretaryForm.firstName,
        last_name: secretaryForm.lastName,
        email: secretaryForm.email,
        password: secretaryForm.password,
      });
    } catch (err) {
      setMessage(`Error creating secretary: ${err.message}`);
      return;
    }

    if (secretaryForm.doctorId) {
      await createLinkMut({
        secretary_id: secretaryId,
        doctor_id: secretaryForm.doctorId,
      });
      
      // Log the linking action
      await logSystemAction(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        'user_management',
        'create',
        `Linked secretary ${secretaryForm.firstName} ${secretaryForm.lastName} to doctor`,
        'Admin Dashboard'
      );
    }

    // Log secretary creation
    await logSystemAction(
      'admin',
      user?.admin_id || 'unknown-admin',
      adminName,
      'user_management',
      'create',
      `Created secretary account: ${secretaryForm.firstName} ${secretaryForm.lastName} (${secretaryForm.email})`,
      'Admin Dashboard'
    );

    setMessage("Secretary created and linked successfully!");
    fetchSecretaries();
    fetchLinks();
    setSecretaryForm({ firstName: "", lastName: "", email: "", password: "", doctorId: "" }); // Clear form
  };

  const unlinkPair = async (linkId) => {
    const confirm = window.confirm("Are you sure you want to unlink this secretary-doctor pair?");
    if (!confirm) {
      setMessage("Unlinking canceled.");
      return;
    }

    try {
      // removeLinkMut returns the link data with secretary/doctor names
      const linkData = await removeLinkMut({ id: linkId });

      // Log the unlinking action
      if (linkData) {
        await logSystemAction(
          'admin',
          user?.admin_id || 'unknown-admin',
          adminName,
          'user_management',
          'delete',
          `Unlinked secretary ${linkData.secretaries?.first_name} ${linkData.secretaries?.last_name} from doctor ${linkData.doctors?.first_name} ${linkData.doctors?.last_name}`,
          'Admin Dashboard'
        );
      }
      
      setMessage("Link removed successfully!");
      fetchLinks();
      fetchDoctorsWithSecretaryInfo();
    } catch (err) {
      setMessage(`Error unlinking: ${err.message}`);
    }
  };

  const linkNewPair = async (secretaryId, doctorId) => {
    if (!secretaryId || !doctorId) {
      setMessage("Please select both a secretary and a doctor.");
      return;
    }

    const confirm = window.confirm("Are you sure you want to link this secretary to this doctor?");
    if (!confirm) {
      setMessage("Linking canceled.");
      return;
    }

    try {
      await createLinkMut({
        secretary_id: secretaryId,
        doctor_id: doctorId,
      });

      // Use already-fetched lists for audit log names
      const secretaryData = secretaries.find(s => s.secretary_id === secretaryId);
      const doctorData = doctors.find(d => d.doctor_id === doctorId);

      // Log the linking action
      await logSystemAction(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        'user_management',
        'create',
        `Linked secretary ${secretaryData?.first_name} ${secretaryData?.last_name} to doctor ${doctorData?.first_name} ${doctorData?.last_name}`,
        'Admin Dashboard'
      );

      setMessage("Link added successfully!");
      setNewLinkSecretary("");
      setNewLinkDoctor("");
      fetchLinks();
      fetchDoctorsWithSecretaryInfo();
    } catch (err) {
      setMessage(`Error linking: ${err.message}`);
    }
  };

  // Patient editing functions
  const handleEditPatient = (patient) => {
    setEditingPatientId(patient.patient_id);
    setEditPatientForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      password: "",
      date_of_birth: patient.date_of_birth,
      contact_info: patient.contact_info,
    });
  };

  const handleEditPatientChange = (e) => {
    const { name, value } = e.target;
    setEditPatientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const savePatientChanges = async () => {
    if (!editingPatientId) return;

    const confirmSave = window.confirm("Are you sure you want to save these changes?");
    if (!confirmSave) {
      setMessage("Patient changes canceled.");
      return;
    }

    const originalPatient = await convex.query(api.patients.getById, { id: editingPatientId });

    const updates = {
      first_name: editPatientForm.first_name,
      last_name: editPatientForm.last_name,
      date_of_birth: editPatientForm.date_of_birth,
      contact_info: editPatientForm.contact_info,
    };

    if (editPatientForm.password) {
      updates.password = editPatientForm.password;
    }

    try {
      await updatePatientMut({ id: editingPatientId, updates });
    } catch (err) {
      setMessage(`Error updating patient: ${err.message}`);
      return;
    }

    {
      const changes = [];
      if (originalPatient?.first_name !== editPatientForm.first_name) {
        changes.push(`Name: ${originalPatient?.first_name} → ${editPatientForm.first_name}`);
      }
      if (originalPatient?.last_name !== editPatientForm.last_name) {
        changes.push(`Last Name: ${originalPatient?.last_name} → ${editPatientForm.last_name}`);
      }
      if (originalPatient?.date_of_birth !== editPatientForm.date_of_birth) {
        changes.push(`DOB: ${originalPatient?.date_of_birth} → ${editPatientForm.date_of_birth}`);
      }
      if (originalPatient?.contact_info !== editPatientForm.contact_info) {
        changes.push(`Contact: ${originalPatient?.contact_info} → ${editPatientForm.contact_info}`);
      }
      if (editPatientForm.password) {
        changes.push("Password updated");
      }

      if (changes.length > 0) {
        await logPatientDataChange(
          'admin',
          user?.admin_id || 'unknown-admin',
          adminName,
          editingPatientId,
          'profile',
          'edit',
          changes.join(', '),
          `Updated patient: ${editPatientForm.first_name} ${editPatientForm.last_name}`,
          'Admin Dashboard'
        );
      }

      setMessage("Patient updated successfully!");
      setEditingPatientId(null);
      setEditPatientForm({
        first_name: "",
        last_name: "",
        password: "",
        date_of_birth: "",
        contact_info: "",
      });
      fetchPatients();
    }
  };

  const cancelEdit = () => {
    setEditingPatientId(null);
    setEditPatientForm({
      first_name: "",
      last_name: "",
      password: "",
      date_of_birth: "",
      contact_info: "",
    });
    setMessage("Patient editing canceled.");
  };

  const handleViewPatient = (patient) => {
    alert(`Patient Details:\nName: ${patient.first_name} ${patient.last_name}\nEmail: ${patient.email}\nDate of Birth: ${patient.date_of_birth}\nContact: ${patient.contact_info}`);
  };

  const handleDeletePatient = async (patientId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this patient? This action cannot be undone.");
    if (!confirmDelete) {
      setMessage("Patient deletion canceled.");
      return;
    }

    const patientData = await convex.query(api.patients.getById, { id: patientId });

    try {
      await removePatientMut({ id: patientId });
    } catch (err) {
      setMessage(`Error deleting patient: ${err.message}`);
      return;
    }

    {
      await logPatientDataChange(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        patientId,
        'profile',
        'delete',
        `Patient: ${patientData?.first_name} ${patientData?.last_name} (${patientData?.email})`,
        'Account deleted',
        'Admin Dashboard'
      );

      setMessage("Patient deleted successfully!");
      fetchPatients();
    }
  };

  // Doctor editing functions
  const handleEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.doctor_id);
    setEditDoctorForm({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      email: doctor.email,
      password: "",
      specialization: doctor.specialization,
    });
  };

  const handleEditDoctorChange = (e) => {
    const { name, value } = e.target;
    setEditDoctorForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveDoctorChanges = async () => {
    if (!editingDoctorId) return;

    const confirmSave = window.confirm("Are you sure you want to save these doctor changes?");
    if (!confirmSave) {
      setMessage("Doctor changes canceled.");
      return;
    }

    const originalDoctor = await convex.query(api.doctors.getById, { id: editingDoctorId });

    const updates = {
      first_name: editDoctorForm.first_name,
      last_name: editDoctorForm.last_name,
      email: editDoctorForm.email,
      specialization: editDoctorForm.specialization,
    };

    if (editDoctorForm.password) {
      updates.password = editDoctorForm.password;
    }

    try {
      await updateDoctorMut({ id: editingDoctorId, ...updates });
    } catch (err) {
      setMessage(`Error updating doctor: ${err.message}`);
      return;
    }

    {
      const changes = [];
      if (originalDoctor?.first_name !== editDoctorForm.first_name) {
        changes.push(`Name: ${originalDoctor?.first_name} → ${editDoctorForm.first_name}`);
      }
      if (originalDoctor?.last_name !== editDoctorForm.last_name) {
        changes.push(`Last Name: ${originalDoctor?.last_name} → ${editDoctorForm.last_name}`);
      }
      if (originalDoctor?.email !== editDoctorForm.email) {
        changes.push(`Email: ${originalDoctor?.email} → ${editDoctorForm.email}`);
      }
      if (originalDoctor?.specialization !== editDoctorForm.specialization) {
        changes.push(`Specialization: ${originalDoctor?.specialization} → ${editDoctorForm.specialization}`);
      }
      if (editDoctorForm.password) {
        changes.push("Password updated");
      }

      if (changes.length > 0) {
        await logSystemAction(
          'admin',
          user?.admin_id || 'unknown-admin',
          adminName,
          'user_management',
          'edit',
          `Updated doctor: ${editDoctorForm.first_name} ${editDoctorForm.last_name} - ${changes.join(', ')}`,
          'Admin Dashboard'
        );
      }

      setMessage("Doctor updated successfully!");
      setEditingDoctorId(null);
      setEditDoctorForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        specialization: "",
      });
      fetchDoctorsWithSecretaryInfo();
      fetchDoctors();
    }
  };

  const cancelDoctorEdit = () => {
    setEditingDoctorId(null);
    setEditDoctorForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      specialization: "",
    });
    setMessage("Doctor editing canceled.");
  };

  const handleViewDoctor = (doctor) => {
    alert(`Doctor Details:\nName: ${doctor.first_name} ${doctor.last_name}\nEmail: ${doctor.email}\nSpecialization: ${doctor.specialization}`);
  };

  const handleDeleteDoctor = async (doctorId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this doctor? This action cannot be undone.");
    if (!confirmDelete) {
      setMessage("Doctor deletion canceled.");
      return;
    }

    const doctorData = await convex.query(api.doctors.getById, { id: doctorId });

    try {
      await removeDoctorMut({ id: doctorId });
    } catch (err) {
      setMessage(`Error deleting doctor: ${err.message}`);
      return;
    }

    {
      await logSystemAction(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        'user_management',
        'delete',
        `Deleted doctor: ${doctorData?.first_name} ${doctorData?.last_name} (${doctorData?.email}) - ${doctorData?.specialization}`,
        'Admin Dashboard'
      );

      setMessage("Doctor deleted successfully!");
      fetchDoctorsWithSecretaryInfo();
      fetchDoctors();
      fetchLinks();
    }
  };

  // Secretary editing functions
  const handleEditSecretary = (secretary) => {
    setEditingSecretaryId(secretary.secretary_id);
    setEditSecretaryForm({
      first_name: secretary.first_name,
      last_name: secretary.last_name,
      email: secretary.email,
      password: "",
    });
  };

  const handleEditSecretaryChange = (e) => {
    const { name, value } = e.target;
    setEditSecretaryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveSecretaryChanges = async () => {
    if (!editingSecretaryId) return;

    const confirmSave = window.confirm("Are you sure you want to save these secretary changes?");
    if (!confirmSave) {
      setMessage("Secretary changes canceled.");
      return;
    }

    const originalSecretary = await convex.query(api.secretaries.getById, { id: editingSecretaryId });

    const updates = {
      first_name: editSecretaryForm.first_name,
      last_name: editSecretaryForm.last_name,
      email: editSecretaryForm.email,
    };

    if (editSecretaryForm.password) {
      updates.password = editSecretaryForm.password;
    }

    try {
      await updateSecretaryMut({ id: editingSecretaryId, ...updates });
    } catch (err) {
      setMessage(`Error updating secretary: ${err.message}`);
      return;
    }

    {
      const changes = [];
      if (originalSecretary?.first_name !== editSecretaryForm.first_name) {
        changes.push(`Name: ${originalSecretary?.first_name} → ${editSecretaryForm.first_name}`);
      }
      if (originalSecretary?.last_name !== editSecretaryForm.last_name) {
        changes.push(`Last Name: ${originalSecretary?.last_name} → ${editSecretaryForm.last_name}`);
      }
      if (originalSecretary?.email !== editSecretaryForm.email) {
        changes.push(`Email: ${originalSecretary?.email} → ${editSecretaryForm.email}`);
      }
      if (editSecretaryForm.password) {
        changes.push("Password updated");
      }

      if (changes.length > 0) {
        await logSystemAction(
          'admin',
          user?.admin_id || 'unknown-admin',
          adminName,
          'user_management',
          'edit',
          `Updated secretary: ${editSecretaryForm.first_name} ${editSecretaryForm.last_name} - ${changes.join(', ')}`,
          'Admin Dashboard'
        );
      }

      setMessage("Secretary updated successfully!");
      setEditingSecretaryId(null);
      setEditSecretaryForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
      });
      fetchSecretaries();
      fetchLinks();
    }
  };

  const cancelSecretaryEdit = () => {
    setEditingSecretaryId(null);
    setEditSecretaryForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
    });
    setMessage("Secretary editing canceled.");
  };

  const handleViewSecretary = (secretary) => {
    alert(`Secretary Details:\nName: ${secretary.first_name} ${secretary.last_name}\nEmail: ${secretary.email}`);
  };

  const handleDeleteSecretary = async (secretaryId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this secretary? This action cannot be undone.");
    if (!confirmDelete) {
      setMessage("Secretary deletion canceled.");
      return;
    }

    const secretaryData = await convex.query(api.secretaries.getById, { id: secretaryId });

    try {
      await removeSecretaryMut({ id: secretaryId });
    } catch (err) {
      setMessage(`Error deleting secretary: ${err.message}`);
      return;
    }

    {
      await logSystemAction(
        'admin',
        user?.admin_id || 'unknown-admin',
        adminName,
        'user_management',
        'delete',
        `Deleted secretary: ${secretaryData?.first_name} ${secretaryData?.last_name} (${secretaryData?.email})`,
        'Admin Dashboard'
      );

      setMessage("Secretary deleted successfully!");
      fetchSecretaries();
      fetchLinks();
    }
  };

  // Filtering logic for patients
  const filteredPatients = patients.filter(patient => {
    const query = patientSearchQuery.toLowerCase();
    const doctorName = patient.doctors
      ? `${patient.doctors.first_name} ${patient.doctors.last_name}`.toLowerCase()
      : "n/a";
    return (
      patient.first_name.toLowerCase().includes(query) ||
      patient.last_name.toLowerCase().includes(query) ||
      patient.email.toLowerCase().includes(query) ||
      (patient.date_of_birth && patient.date_of_birth.toLowerCase().includes(query)) ||
      (patient.contact_info && patient.contact_info.toLowerCase().includes(query)) ||
      doctorName.includes(query)
    );
  });

  // Filtering logic for doctors
  const filteredDoctorsForSearch = filteredDoctors.filter(doctor => {
    const query = doctorSearchQuery.toLowerCase();
    const secretaryName = doctor.secretary_doctor_links?.[0]?.secretaries
      ? `${doctor.secretary_doctor_links[0].secretaries.first_name} ${doctor.secretary_doctor_links[0].secretaries.last_name}`.toLowerCase()
      : "n/a";
    return (
      doctor.first_name.toLowerCase().includes(query) ||
      doctor.last_name.toLowerCase().includes(query) ||
      doctor.email.toLowerCase().includes(query) ||
      doctor.specialization.toLowerCase().includes(query) ||
      secretaryName.includes(query)
    );
  });

  // Filtering logic for secretaries
  const filteredSecretaries = secretaries.filter(secretary => {
    const query = secretarySearchQuery.toLowerCase();
    return (
      secretary.first_name.toLowerCase().includes(query) ||
      secretary.last_name.toLowerCase().includes(query) ||
      secretary.email.toLowerCase().includes(query)
    );
  });

  // Pagination for patients
  const indexOfLastPatient = currentPagePatients * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);

  // Pagination for doctors
  const indexOfLastDoctor = currentPageDoctors * doctorsPerPage;
  const indexOfFirstDoctor = indexOfLastDoctor - doctorsPerPage;
  const currentDoctors = filteredDoctorsForSearch.slice(indexOfFirstDoctor, indexOfLastDoctor);

  // Pagination for secretaries
  const indexOfLastSecretary = currentPageSecretaries * secretariesPerPage;
  const indexOfFirstSecretary = indexOfLastSecretary - secretariesPerPage;
  const currentSecretaries = filteredSecretaries.slice(indexOfFirstSecretary, indexOfLastSecretary);

  // Pagination for compliance
  const indexOfLastCompliance = currentPageCompliance * compliancePerPage;
  const indexOfFirstCompliance = indexOfLastCompliance - compliancePerPage;
  const currentCompliancePatients = patients.slice(indexOfFirstCompliance, indexOfLastCompliance);

   return (
    <>
      <div className="dashboard-container">
        <Header 
          user={user}
          activePage={activeTab}
          setActivePage={setActiveTab}
          onLogout={onLogout}
          showUsersPopup={showUsersPopup}
          setShowUsersPopup={setShowUsersPopup}
          showMessagePopup={showMessagePopup}
          setShowMessagePopup={setShowMessagePopup}
          userRole="Admin"
        />

        <div className="dashboard-layout">
          {/* Sidebar Navigation */}
          <div className="sidebar">
            <nav className="sidebar-nav">
              <ul className="nav-menu">
                <li
                  className={activeTab === "dashboard" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <span>Dashboard</span>
                </li>
                <li
                  className={activeTab === "manage" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("manage")}
                >
                  <span>Manage</span>
                </li>
                <li className="nav-item dropdown-menu">
                  <div
                    className={`nav-item-header ${activeTab === "list" ? "active" : ""}`}
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setActiveTab("list");
                    }}
                  >
                    <span>Masterlist</span>
                    <img
                      src="/picture/down.png"
                      alt="Dropdown"
                      className={`dropdown-arrow-img ${
                        isDropdownOpen ? "open" : ""
                      }`}
                    />
                  </div>
                  <ul className={`dropdown-submenu ${isDropdownOpen ? "show" : ""}`}>
                    <li
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedListType("patients");
                        setActiveTab("list");
                      }}
                    >
                      Patients
                    </li>
                    <li
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedListType("doctors");
                        setActiveTab("list");
                      }}
                    >
                      Doctors
                    </li>
                    <li
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedListType("secretaries");
                        setActiveTab("list");
                      }}
                    >
                      Secretaries
                    </li>
                  </ul>
                </li>
                <li
                  className={activeTab === "accounts" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("accounts")}
                >
                  <span>Accounts</span>
                </li>
                <li
                  className={activeTab === "audit" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("audit")}
                >
                  <span>Audit Logs</span>
                </li>
                <li
                  className={activeTab === "compliance" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("compliance")}
                >
                  <span>Compliance</span>
                </li>
                <li
                  className={activeTab === "ml" ? "nav-item active" : "nav-item"}
                  onClick={() => setActiveTab("ml")}
                >
                  <span>ML Settings</span>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="main-content">
            {/* Content Header */}
            {activeTab !== "audit" && (
              <div className="content-header">
                <h1 className="page-title">
                  {activeTab === "dashboard" && "Welcome, System Admin! 👋"}
                  {activeTab === "manage"}
                  {activeTab === "list"}
                  {activeTab === "accounts"}
                  {activeTab === "compliance"}
                  {activeTab === "ml"}
                </h1>
              </div>
            )}

            {/* Content Body */}
            <div className="content-body">
              {activeTab === "dashboard" && (
              <>
                <div className="admin-widgets-grid">
                  <div className="admin-widget admin-total-patients">
                    <div className="admin-widget-header">
                      <img src="/picture/total.png" alt="Total Patients" className="admin-widget-image" onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/40x40/1FAAED/ffffff?text=👥";
                      }}/>
                      <h4>Total Patients</h4>
                    </div>
                    <div className="admin-widget-content">
                      <div className="admin-widget-left">
                        <p className="admin-number">{patients.length}</p>
                      </div>
                      <div className="admin-widget-right">
                        <p className="admin-subtitle">Patients registered in the system</p>
                      </div>
                    </div>
                    <div className="admin-chart-container">
                      <Line
                        data={{
                          labels: chartData.labels,
                          datasets: [{
                            label: 'Patient Registrations',
                            data: chartData.patients,
                            borderColor: '#1FAAED',
                            backgroundColor: 'rgba(31, 170, 237, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: { display: false },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              titleColor: '#ffffff',
                              bodyColor: '#ffffff',
                              borderColor: '#1FAAED',
                              borderWidth: 1,
                              callbacks: {
                                title: (context) => `${context[0].label}`,
                                label: (context) => `Patients Registered: ${context.parsed.y}`
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { display: false }
                          },
                          elements: {
                            point: { radius: 0 }
                          },
                          interaction: {
                            intersect: false
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-widget admin-total-doctors">
                    <div className="admin-widget-header">
                      <img src="/picture/total.png" alt="Total Doctors" className="admin-widget-image" onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/40x40/f59e0b/ffffff?text=👨‍⚕️";
                      }}/>
                      <h4>Total Doctors</h4>
                    </div>
                    <div className="admin-widget-content">
                      <div className="admin-widget-left">
                        <p className="admin-number">{doctors.length}</p>
                      </div>
                      <div className="admin-widget-right">
                        <p className="admin-subtitle">Doctors registered in the system</p>
                      </div>
                    </div>
                    <div className="admin-chart-container">
                      <Line
                        data={{
                          labels: chartData.labels,
                          datasets: [{
                            label: 'Doctor Registrations',
                            data: chartData.doctors,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: { display: false },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              titleColor: '#ffffff',
                              bodyColor: '#ffffff',
                              borderColor: '#f59e0b',
                              borderWidth: 1,
                              callbacks: {
                                title: (context) => `${context[0].label}`,
                                label: (context) => `Doctors Registered: ${context.parsed.y}`
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { display: false }
                          },
                          elements: {
                            point: { radius: 0 }
                          },
                          interaction: {
                            intersect: false
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-widget admin-total-secretaries">
                    <div className="admin-widget-header">
                      <img src="/picture/total.png" alt="Total Secretaries" className="admin-widget-image" onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/40x40/10b981/ffffff?text=👤";
                      }}/>
                      <h4>Total Secretaries</h4>
                    </div>
                    <div className="admin-widget-content">
                      <div className="admin-widget-left">
                        <p className="admin-number">{secretaries.length}</p>
                      </div>
                      <div className="admin-widget-right">
                        <p className="admin-subtitle">Secretaries registered in the system</p>
                      </div>
                    </div>
                    <div className="admin-chart-container">
                      <Line
                        data={{
                          labels: chartData.labels,
                          datasets: [{
                            label: 'Secretary Registrations',
                            data: chartData.secretaries,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            title: { display: false },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              titleColor: '#ffffff',
                              bodyColor: '#ffffff',
                              borderColor: '#10b981',
                              borderWidth: 1,
                              callbacks: {
                                title: (context) => `${context[0].label}`,
                                label: (context) => `Secretaries Registered: ${context.parsed.y}`
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { display: false }
                          },
                          elements: {
                            point: { radius: 0 }
                          },
                          interaction: {
                            intersect: false
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "manage" && (
              <>
                <h2>Existing Secretary-Doctor Links</h2>
                <table className="master-list">
                  <thead>
                    <tr>
                      <th>Secretary Name</th>
                      <th>Doctor Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.length > 0 ? (
                      links.map((link) => (
                        <tr key={link.link_id}>
                          <td>{link.secretaries?.first_name} {link.secretaries?.last_name}</td>
                          <td>{link.doctors?.first_name} {link.doctors?.last_name}</td>
                          <td>
                            <button onClick={() => unlinkPair(link.link_id)}>Unlink</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3">No secretary-doctor links found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h2>Create New Link</h2>
                <div className="link-creation-section">
                  <select value={newLinkSecretary} onChange={(e) => setNewLinkSecretary(e.target.value)}>
                    <option value="">Select Secretary</option>
                    {secretaries.map((sec) => (
                      <option key={sec.secretary_id} value={sec.secretary_id}>
                        {sec.first_name} {sec.last_name}
                      </option>
                    ))}
                  </select>

                  <select value={newLinkDoctor} onChange={(e) => setNewLinkDoctor(e.target.value)}>
                    <option value="">Select Doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc.doctor_id} value={doc.doctor_id}>
                        {doc.first_name} {doc.last_name}
                      </option>
                    ))}
                  </select>

                  <button className="action-button" onClick={() => linkNewPair(newLinkSecretary, newLinkDoctor)}>
                    Link Secretary to Doctor
                  </button>
                </div>
              </>
            )}

            {activeTab === "list" && (
              <>
                {selectedListType === "patients" && (
                  <>
                    <h2>Master List of All Patients</h2>
                    <input
                      type="text"
                      placeholder="Search patients..."
                      className="search-input"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                    />
                    <table className="master-list">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Assigned Doctor</th>
                          <th>Email</th>
                          <th>Date of Birth</th>
                          <th>Contact Info</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPatients.length > 0 ? (
                          currentPatients.map((pat) => (
                            <tr key={pat.patient_id}>
                              <td>{pat.first_name} {pat.last_name}</td>
                              <td>
                                {pat.doctors ? `${pat.doctors.first_name} ${pat.doctors.last_name}` : "N/A"}
                              </td>
                              <td>{pat.email}</td>
                              <td>{pat.date_of_birth}</td>
                              <td>{pat.contact_info}</td>
                              <td>
                                <button className="edit-btn" onClick={() => handleEditPatient(pat)}>Edit</button>
                                <button className="view-btn" onClick={() => handleViewPatient(pat)}>View</button>
                                <button className="delete-btn" onClick={() => handleDeletePatient(pat.patient_id)}>Delete</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6">No patients found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filteredPatients.length > patientsPerPage && (
                      <Pagination
                        currentPage={currentPagePatients}
                        totalPages={Math.ceil(filteredPatients.length / patientsPerPage)}
                        onPageChange={setCurrentPagePatients}
                        itemsPerPage={patientsPerPage}
                        totalItems={filteredPatients.length}
                      />
                    )}
                  </>
                )}

                {selectedListType === "doctors" && (
                  <>
                    <h2>Master List of All Doctors</h2>
                    <input
                      type="text"
                      placeholder="Search doctors..."
                      className="search-input"
                      value={doctorSearchQuery}
                      onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    />
                    <table className="master-list">
                      <thead>
                        <tr>
                          <th>Doctor Name</th>
                          <th>Specialization</th>
                          <th>Secretary</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentDoctors.length > 0 ? (
                          currentDoctors.map((doctor) => (
                            <tr key={doctor.doctor_id}>
                              <td>{doctor.first_name} {doctor.last_name}</td>
                              <td>{doctor.specialization}</td>
                              <td>
                                {doctor.secretary_doctor_links?.[0]?.secretaries
                                  ? `${doctor.secretary_doctor_links[0].secretaries.first_name} ${doctor.secretary_doctor_links[0].secretaries.last_name}`
                                  : "N/A"}
                              </td>
                              <td>{doctor.email}</td>
                              <td>
                                <button className="edit-btn" onClick={() => handleEditDoctor(doctor)}>Edit</button>
                                <button className="view-btn" onClick={() => handleViewDoctor(doctor)}>View</button>
                                <button className="delete-btn" onClick={() => handleDeleteDoctor(doctor.doctor_id)}>Delete</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5">No doctors found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filteredDoctorsForSearch.length > doctorsPerPage && (
                      <Pagination
                        currentPage={currentPageDoctors}
                        totalPages={Math.ceil(filteredDoctorsForSearch.length / doctorsPerPage)}
                        onPageChange={setCurrentPageDoctors}
                        itemsPerPage={doctorsPerPage}
                        totalItems={filteredDoctorsForSearch.length}
                      />
                    )}
                  </>
                )}

                {selectedListType === "secretaries" && (
                  <>
                    <h2>Master List of All Secretaries</h2>
                    <input
                      type="text"
                      placeholder="Search secretaries..."
                      className="search-input"
                      value={secretarySearchQuery}
                      onChange={(e) => setSecretarySearchQuery(e.target.value)}
                    />
                    <table className="master-list">
                      <thead>
                        <tr>
                          <th>Secretary Name</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSecretaries.length > 0 ? (
                          currentSecretaries.map((sec) => (
                            <tr key={sec.secretary_id}>
                              <td>{sec.first_name} {sec.last_name}</td>
                              <td>{sec.email}</td>
                              <td>
                                <button className="edit-btn" onClick={() => handleEditSecretary(sec)}>Edit</button>
                                <button className="view-btn" onClick={() => handleViewSecretary(sec)}>View</button>
                                <button className="delete-btn" onClick={() => handleDeleteSecretary(sec.secretary_id)}>Delete</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3">No secretaries found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {filteredSecretaries.length > secretariesPerPage && (
                      <Pagination
                        currentPage={currentPageSecretaries}
                        totalPages={Math.ceil(filteredSecretaries.length / secretariesPerPage)}
                        onPageChange={setCurrentPageSecretaries}
                        itemsPerPage={secretariesPerPage}
                        totalItems={filteredSecretaries.length}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === "audit" && (
              <AuditLogs onLogout={onLogout} user={user} />
            )}


              {activeTab === "accounts" && (
                <div>
                  <h3>Create New Account</h3>
                  {!accountCreationType && (
                    <div className="account-creation-buttons">
                      <button className="action-button" onClick={() => setAccountCreationType('doctor')}>
                        <div className="button-content">
                          <span className="button-icon-large">🩺</span>
                          <span className="button-text">Create Doctor</span>
                        </div>
                      </button>
                      <button className="action-button" onClick={() => setAccountCreationType('secretary')}>
                        <div className="button-content">
                          <span className="button-icon-large">👤</span>
                          <span className="button-text">Create Secretary</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {accountCreationType === 'doctor' && (
                  <div className="form-section">
                    <h4>Create Doctor Account - Step {currentStep} of 4</h4>
                    {/* Step 1: Demographics */}
                    {currentStep === 1 && (
                      <div className="form-container">
                        <div className="form-group">
                          <label>First Name</label>
                          <input
                            type="text"
                            value={doctorForm.firstName}
                            onChange={(e) => setDoctorForm({ ...doctorForm, firstName: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Last Name</label>
                          <input
                            type="text"
                            value={doctorForm.lastName}
                            onChange={(e) => setDoctorForm({ ...doctorForm, lastName: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            value={doctorForm.email}
                            onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Password</label>
                          <input
                            type="password"
                            value={doctorForm.password}
                            onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                          />
                        </div>
                        <div className="button-group">
                          <button className="action-button" onClick={() => setAccountCreationType(null)}>Back</button>
                          <button className="action-button" onClick={handleNextStep}>Next</button>
                        </div>
                      </div>
                    )}
                    {/* Step 2: Specialization & License */}
                    {currentStep === 2 && (
                      <div className="form-container">
                        <div className="form-group">
                          <label>Specialization</label>
                          <input
                            type="text"
                            value={doctorForm.specialization}
                            onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Medical License</label>
                          <input
                            type="text"
                            value={doctorForm.medicalLicense}
                            onChange={(e) => setDoctorForm({ ...doctorForm, medicalLicense: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>License Expiration</label>
                          <input
                            type="date"
                            value={doctorForm.licenseExpiration}
                            onChange={(e) => setDoctorForm({ ...doctorForm, licenseExpiration: e.target.value })}
                          />
                        </div>
                        <div className="button-group">
                          <button className="action-button" onClick={handlePrevStep}>Previous</button>
                          <button className="action-button" onClick={handleNextStep}>Next</button>
                        </div>
                      </div>
                    )}
                    {currentStep === 3 && (
                    <div className="form-container">
                      <div className="form-group">
                        <label>Hospital/Clinic Affiliation</label>
                        <select
                          value={doctorForm.affiliation}
                          onChange={(e) => setDoctorForm({ ...doctorForm, affiliation: e.target.value })}
                        >
                          <option value="">-- Select Affiliation --</option>
                          <option value="Mission">Mission</option>
                          <option value="Don Benito">Don Benito</option>
                          <option value="The Medical City">The Medical City</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Clinic Hours/Availability</label>
                        <input
                          type="text"
                          value={doctorForm.clinicHours}
                          onChange={(e) => setDoctorForm({ ...doctorForm, clinicHours: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Clinic Address</label>
                        <input
                          type="text"
                          value={doctorForm.clinicAddress}
                          onChange={(e) => setDoctorForm({ ...doctorForm, clinicAddress: e.target.value })}
                        />
                      </div>
                      <div className="button-group">
                        <button className="action-button" onClick={handlePrevStep}>Previous</button>
                        <button className="action-button" onClick={handleNextStep}>Next</button>
                      </div>
                    </div>
                  )}
                    {/* Step 4: Assign Secretary */}
                    {currentStep === 4 && (
                      <div className="form-container">
                        <div className="form-group">
                          <label>Assign Secretary (Optional)</label>
                          <select
                            value={doctorForm.secretaryId}
                            onChange={(e) => setDoctorForm({ ...doctorForm, secretaryId: e.target.value })}
                          >
                            <option value="">-- Select a Secretary --</option>
                            {secretaries.map((sec) => (
                              <option key={sec.secretary_id} value={sec.secretary_id}>
                                {sec.first_name} {sec.last_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="button-group">
                          <button className="action-button" onClick={handlePrevStep}>Previous</button>
                          <button className="action-button" onClick={createDoctor}>Create Doctor</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  {/* Secretary Creation Form (now matches doctor form style) */}
                  {accountCreationType === 'secretary' && (
                    <div className="form-section">
                      <h4>Create Secretary Account - Step {currentSecretaryStep} of 3</h4>
                      {/* Step 1: Demographics */}
                      {currentSecretaryStep === 1 && (
                        <div className="form-container">
                          <div className="form-group">
                            <label>First Name</label>
                            <input
                              type="text"
                              value={secretaryForm.firstName}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, firstName: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Last Name</label>
                            <input
                              type="text"
                              value={secretaryForm.lastName}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, lastName: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Email</label>
                            <input
                              type="email"
                              value={secretaryForm.email}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, email: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Password</label>
                            <input
                              type="password"
                              value={secretaryForm.password}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, password: e.target.value })}
                            />
                          </div>
                          <div className="button-group">
                            <button className="action-button" onClick={() => setAccountCreationType(null)}>Back</button>
                            <button className="action-button" onClick={handleNextSecretaryStep}>Next</button>
                          </div>
                        </div>
                      )}
                      {/* Step 2: Affiliation and Clinic Hours */}
                      {currentSecretaryStep === 2 && (
                        <div className="form-container">
                          <div className="form-group">
                            <label>Current Hospital/Clinic Affiliation</label>
                            <input
                              type="text"
                              value={secretaryForm.affiliation}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, affiliation: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Clinic Hours/Availability</label>
                            <input
                              type="text"
                              value={secretaryForm.clinicHours}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, clinicHours: e.target.value })}
                            />
                          </div>
                          <div className="button-group">
                            <button className="action-button" onClick={handlePrevSecretaryStep}>Previous</button>
                            <button className="action-button" onClick={handleNextSecretaryStep}>Next</button>
                          </div>
                        </div>
                      )}
                      {/* Step 3: Assign to Doctor */}
                      {currentSecretaryStep === 3 && (
                        <div className="form-container">
                          <div className="form-group">
                            <label>Link to Doctor (Optional)</label>
                            <select
                              value={secretaryForm.doctorId}
                              onChange={(e) => setSecretaryForm({ ...secretaryForm, doctorId: e.target.value })}
                            >
                              <option value="">-- Select a Doctor --</option>
                              {doctors.map((doc) => (
                                <option key={doc.doctor_id} value={doc.doctor_id}>
                                  {doc.first_name} {doc.last_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="button-group">
                            <button className="action-button" onClick={handlePrevSecretaryStep}>Previous</button>
                            <button className="action-button" onClick={createSecretary}>Create Secretary</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {activeTab === "compliance" && (
                <div className="compliance-container">
                  <h2>Compliance Management</h2>
                  <div className="table-responsive">
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Assigned Doctor</th>
                          <th>Days Since Last Submission</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCompliancePatients.length > 0 ? (
                          currentCompliancePatients.map((patient) => {
                            const lastSubmissionDate = healthMetrics[patient.patient_id];
                            
                            // Calculate days passed, handling cases where there is no submission or it's today
                            const daysPassed = lastSubmissionDate
                              ? Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(lastSubmissionDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
                              : "No Submission";
                              
                            return (
                              <tr key={patient.patient_id}>
                                <td>{patient.first_name} {patient.last_name}</td>
                                <td>
                                  {patient.doctors
                                    ? `${patient.doctors.first_name} ${patient.doctors.last_name}`
                                    : "N/A"}
                                </td>
                                <td>
                                  <span className={`compliance-status ${daysPassed === "No Submission" ? "no-submission" : daysPassed > 7 ? "overdue" : daysPassed > 3 ? "warning" : "good"}`}>
                                    {daysPassed}
                                  </span>
                                </td>
                                <td className="action-buttons">  
                                  <button className="action-btn reviewed-btn">Reviewed</button>
                                  <button className="action-btn notify-btn">Notify</button>
                                  <button className="action-btn flag-btn">Flag</button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="no-data">No patients found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination for Compliance */}
                  <div className="pagination-container">
                    <Pagination
                      currentPage={currentPageCompliance}
                      totalPages={Math.ceil(patients.length / compliancePerPage)}
                      onPageChange={setCurrentPageCompliance}
                      itemsPerPage={compliancePerPage}
                      totalItems={patients.length}
                    />
                  </div>
                </div>
              )}

            {activeTab === "ml" && (
              <div>
                <p>Machine Learning settings coming soon...</p>
              </div>
            )}

              {message && <p className="message">{message}</p>}
            </div>
          </div>
        </div>
      </div>

      {showMessagePopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Messages</h3>
            <p>You have new messages!</p>
            <button onClick={() => setShowMessagePopup(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
