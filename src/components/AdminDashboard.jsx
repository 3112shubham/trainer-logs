import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import EntryListForAdmin from './EntryListForAdmin';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('entries');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [campusName, setCampusName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const { logout, currentUser } = useAuth();

  // Registration link for QR code
  const registrationLink = `${window.location.origin}/trainer-registration`;

  // Load data from Firestore
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchCampuses(selectedProject);
    } else {
      setCampuses([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && selectedCampus) {
      fetchBatches(selectedProject, selectedCampus);
    } else {
      setBatches([]);
    }
  }, [selectedProject, selectedCampus]);

  const fetchProjects = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsData = [];
      querySnapshot.forEach((doc) => {
        projectsData.push({ id: doc.id, ...doc.data() });
      });
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCampuses = async (projectId) => {
    try {
      const q = query(collection(db, 'campuses'), where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      const campusesData = [];
      querySnapshot.forEach((doc) => {
        campusesData.push({ id: doc.id, ...doc.data() });
      });
      setCampuses(campusesData);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const fetchBatches = async (projectId, campusId) => {
    try {
      const q = query(collection(db, 'batches'), where('campusId', '==', campusId));
      const querySnapshot = await getDocs(q);
      const batchesData = [];
      querySnapshot.forEach((doc) => {
        batchesData.push({ id: doc.id, ...doc.data() });
      });
      setBatches(batchesData);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create auth user with a temporary password
      const password = Math.random().toString(36).slice(-8);
      const userCredential = await createUserWithEmailAndPassword(auth, trainerEmail, password);
      
      // Add to users collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: trainerEmail,
        name: trainerName,
        role: 'trainer',
        createdAt: new Date()
      });
      
      // Send password reset email
      await sendPasswordResetEmail(auth, trainerEmail);
      
      setMessage(`Trainer account created successfully! A password reset link has been sent to ${trainerEmail}`);
      
      // Reset form
      setTrainerEmail('');
      setTrainerName('');
    } catch (error) {
      setMessage('Error creating trainer: ' + error.message);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName) {
      setMessage('Please enter a project name');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: projectName,
        createdAt: new Date()
      });
      setMessage('Project created successfully!');
      setProjectName('');
      fetchProjects(); // Refresh the list
    } catch (error) {
      setMessage('Error creating project: ' + error.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateCampus = async (e) => {
    e.preventDefault();
    if (!selectedProject || !campusName) {
      setMessage('Please select a project and enter a campus name');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'campuses'), {
        name: campusName,
        projectId: selectedProject,
        projectName: projects.find(p => p.id === selectedProject)?.name || '',
        createdAt: new Date()
      });
      setMessage('Campus created successfully!');
      setCampusName('');
      fetchCampuses(selectedProject); // Refresh the list
    } catch (error) {
      setMessage('Error creating campus: ' + error.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!selectedProject || !batchName) {
      setMessage('Please select a project and enter a batch name');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // If no campus is selected but the project has exactly one campus, use that
    let campusIdToUse = selectedCampus;
    let campusNameToUse = campuses.find(c => c.id === selectedCampus)?.name || '';
    
    if (!selectedCampus && campuses.length === 1) {
      campusIdToUse = campuses[0].id;
      campusNameToUse = campuses[0].name;
    } else if (!selectedCampus) {
      setMessage('Please select a campus or create one first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'batches'), {
        name: batchName,
        projectId: selectedProject,
        projectName: projects.find(p => p.id === selectedProject)?.name || '',
        campusId: campusIdToUse,
        campusName: campusNameToUse,
        createdAt: new Date()
      });
      setMessage('Batch created successfully!');
      setBatchName('');
      if (campusIdToUse) {
        fetchBatches(selectedProject, campusIdToUse); // Refresh the list
      }
    } catch (error) {
      setMessage('Error creating batch: ' + error.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const copyRegistrationLink = () => {
    navigator.clipboard.writeText(registrationLink);
    setMessage('Registration link copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Simple QR code component using CSS
  const SimpleQRCode = ({ value, size = 200 }) => {
    // This is a simple representation - in a real app, you'd use a proper QR code library
    return (
      <div className="qr-code" style={{ 
        width: size, 
        height: size, 
        backgroundColor: '#fff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '2px solid #000',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          fontSize: '10px', 
          textAlign: 'center',
          wordBreak: 'break-all',
          padding: '10px'
        }}>
          {value}
        </div>
        {/* QR code pattern simulation */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          opacity: 0.3
        }}></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-700">
                  {currentUser?.displayName || currentUser?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-1 mb-8 border border-gray-200 w-max mx-auto">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('entries')}
              className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
                activeTab === 'entries'
                  ? 'bg-blue-100 text-blue-700 shadow-inner'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className={`w-5 h-5 mr-2 ${activeTab === 'entries' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              View All Entries
            </button>
            <button
              onClick={() => setActiveTab('addTrainer')}
              className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
                activeTab === 'addTrainer'
                  ? 'bg-blue-100 text-blue-700 shadow-inner'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className={`w-5 h-5 mr-2 ${activeTab === 'addTrainer' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Trainer
            </button>
            <button
              onClick={() => setActiveTab('manageProjects')}
              className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
                activeTab === 'manageProjects'
                  ? 'bg-blue-100 text-blue-700 shadow-inner'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className={`w-5 h-5 mr-2 ${activeTab === 'manageProjects' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              Manage Projects
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'entries' && <EntryListForAdmin />}
          
          {activeTab === 'addTrainer' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Add New Trainer</h2>
              {message && (
                <div className={`p-4 rounded-md text-sm ${
                  message.includes('Error') 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Manual Registration
                  </h3>
                  <form onSubmit={handleCreateTrainer} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Name</label>
                      <input
                        type="text"
                        value={trainerName}
                        onChange={(e) => setTrainerName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Email</label>
                      <input
                        type="email"
                        value={trainerEmail}
                        onChange={(e) => setTrainerEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Trainer Account'}
                    </button>
                  </form>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code Registration
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Share this QR code or registration link with trainers. When they scan it, they'll be able to register themselves.
                    </p>
                    
                    <div className="flex flex-col items-center space-y-4">
                      {showQRCode ? (
                        <>
                          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <SimpleQRCode value={registrationLink} size={200} />
                          </div>
                          <button
                            onClick={() => setShowQRCode(false)}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Hide QR Code
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Show QR Code
                        </button>
                      )}
                      
                      <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Link</label>
                        <div className="flex">
                          <input
                            type="text"
                            value={registrationLink}
                            readOnly
                            className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                          />
                          <button
                            onClick={copyRegistrationLink}
                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-r-lg hover:bg-gray-300 text-sm transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'manageProjects' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Manage Projects, Campuses, and Batches</h2>
              {message && (
                <div className={`p-4 rounded-md text-sm ${
                  message.includes('Error') 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Add Project
                  </h3>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Project'}
                    </button>
                  </form>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Add Campus
                  </h3>
                  <form onSubmit={handleCreateCampus} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      >
                        <option value="">Select Project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name</label>
                      <input
                        type="text"
                        value={campusName}
                        onChange={(e) => setCampusName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Campus'}
                    </button>
                  </form>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Add Batch
                  </h3>
                  <form onSubmit={handleCreateBatch} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      >
                        <option value="">Select Project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Campus</label>
                      <select
                        value={selectedCampus}
                        onChange={(e) => setSelectedCampus(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors"
                        required={campuses.length > 1}
                        disabled={!selectedProject || campuses.length <= 1}
                      >
                        <option value="">{campuses.length === 1 ? campuses[0].name : "Select Campus"}</option>
                        {campuses.length > 1 && campuses.map(campus => (
                          <option key={campus.id} value={campus.id}>{campus.name}</option>
                        ))}
                      </select>
                      {campuses.length <= 1 && selectedProject && (
                        <p className="text-xs text-gray-500 mt-1">
                          {campuses.length === 0 
                            ? "No campuses available. Create a campus first." 
                            : "Only one campus available. It will be used automatically."}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                      <input
                        type="text"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Batch'}
                    </button>
                  </form>
                </div>
              </div>
              
              {/* Display current hierarchy */}
              <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Current Hierarchy
                </h3>
                
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>No projects found. Create your first project to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {project.name}
                        </h4>
                        
                        <div className="mt-3 ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                          {campuses.filter(c => c.projectId === project.id).length === 0 ? (
                            <div className="text-gray-400 text-sm bg-gray-50 p-2 rounded">
                              No campuses added yet
                            </div>
                          ) : (
                            campuses.filter(c => c.projectId === project.id).map(campus => (
                              <div key={campus.id} className="border-l-2 border-green-200 pl-3">
                                <h5 className="font-medium text-gray-700 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  {campus.name}
                                </h5>
                                
                                <div className="mt-2 ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
                                  {batches.filter(b => b.campusId === campus.id).length === 0 ? (
                                    <div className="text-gray-400 text-sm bg-gray-50 p-2 rounded">
                                      No batches in this campus
                                    </div>
                                  ) : (
                                    batches.filter(b => b.campusId === campus.id).map(batch => (
                                      <div key={batch.id} className="text-gray-600 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {batch.name}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;