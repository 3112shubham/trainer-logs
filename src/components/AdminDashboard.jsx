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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <span className="text-gray-700">
                Welcome, {currentUser?.displayName || currentUser?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 md:space-x-8">
            <button
              onClick={() => setActiveTab('entries')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'entries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View All Entries
            </button>
            <button
              onClick={() => setActiveTab('addTrainer')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'addTrainer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Add Trainer
            </button>
            <button
              onClick={() => setActiveTab('manageProjects')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manageProjects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manage Projects
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'entries' && <EntryListForAdmin />}
          
          {activeTab === 'addTrainer' && (
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-6">Add New Trainer</h2>
              {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes('Error') 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {message}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Manual Registration</h3>
                  <form onSubmit={handleCreateTrainer} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Name</label>
                      <input
                        type="text"
                        value={trainerName}
                        onChange={(e) => setTrainerName(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Email</label>
                      <input
                        type="email"
                        value={trainerEmail}
                        onChange={(e) => setTrainerEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Creating...' : 'Create Trainer Account'}
                    </button>
                  </form>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">QR Code Registration</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Share this QR code or registration link with trainers. When they scan it, they'll be able to register themselves.
                    </p>
                    
                    <div className="flex flex-col items-center space-y-4">
                      {showQRCode ? (
                        <>
                          <SimpleQRCode value={registrationLink} size={200} />
                          <button
                            onClick={() => setShowQRCode(false)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Hide QR Code
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
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
                            className="flex-1 p-2 border border-gray-300 rounded-l-md bg-gray-100 text-sm"
                          />
                          <button
                            onClick={copyRegistrationLink}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 text-sm"
                          >
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
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-6">Manage Projects, Campuses, and Batches</h2>
                {message && (
                  <div className={`mb-4 p-3 rounded-md text-sm ${
                    message.includes('Error') 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {message}
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Add Project</h3>
                    <form onSubmit={handleCreateProject} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create Project'}
                      </button>
                    </form>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Add Campus</h3>
                    <form onSubmit={handleCreateCampus} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create Campus'}
                      </button>
                    </form>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Add Batch</h3>
                    <form onSubmit={handleCreateBatch} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                        <select
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
                              : "Only one campus available. Batch will be assigned to it automatically."}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                        <input
                          type="text"
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={loading || !selectedProject || (campuses.length > 1 && !selectedCampus)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Creating...' : 'Create Batch'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Hierarchy</h3>
                {projects.length === 0 ? (
                  <p className="text-gray-500">No projects found</p>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div key={project.id} className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-800">{project.name}</h4>
                        <div className="mt-2 ml-4 space-y-2">
                          {campuses.filter(c => c.projectId === project.id).map(campus => (
                            <div key={campus.id} className="border-l-2 border-gray-200 pl-4">
                              <h5 className="font-medium text-gray-700">{campus.name}</h5>
                              <div className="mt-1 ml-4 space-y-1">
                                {batches.filter(b => b.campusId === campus.id).map(batch => (
                                  <div key={batch.id} className="text-gray-600">
                                    {batch.name}
                                  </div>
                                ))}
                                {batches.filter(b => b.campusId === campus.id).length === 0 && (
                                  <div className="text-gray-400 text-sm">No batches</div>
                                )}
                              </div>
                            </div>
                          ))}
                          {campuses.filter(c => c.projectId === project.id).length === 0 && (
                            <div className="text-gray-400 text-sm">No campuses</div>
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