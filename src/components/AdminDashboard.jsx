import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import EntryListForAdmin from './EntryListForAdmin';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('entries');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
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
  const { logout, currentUser } = useAuth();


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
  // sort projects alphabetically by name
  projectsData.sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString()));
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
  // sort campuses alphabetically by name
  campusesData.sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString()));
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
  // sort batches alphabetically by name
  batchesData.sort((a, b) => (a.name || '').toString().localeCompare((b.name || '').toString()));
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

  // Edit and Delete handlers for projects, campuses and batches
  const handleEditProject = async (project) => {
    const newName = window.prompt('Enter new project name', project.name);
    if (!newName || newName.trim() === '' || newName === project.name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), { name: newName });
      // update projectName on campuses and batches
      const qCamp = query(collection(db, 'campuses'), where('projectId', '==', project.id));
      const camps = await getDocs(qCamp);
      for (const c of camps.docs) {
        await updateDoc(doc(db, 'campuses', c.id), { projectName: newName });
      }
      const qBatch = query(collection(db, 'batches'), where('projectId', '==', project.id));
      const bs = await getDocs(qBatch);
      for (const b of bs.docs) {
        await updateDoc(doc(db, 'batches', b.id), { projectName: newName });
      }
      setMessage('Project renamed successfully');
      fetchProjects();
      if (selectedProject === project.id) setSelectedProject(project.id); // trigger campus refetch
    } catch (error) {
      setMessage('Error renaming project: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteProject = async (project) => {
    const ok = window.confirm(`Delete project "${project.name}" and all its campuses and batches? This cannot be undone.`);
    if (!ok) return;
    setLoading(true);
    try {
      // delete batches under project
      const qBatch = query(collection(db, 'batches'), where('projectId', '==', project.id));
      const bs = await getDocs(qBatch);
      for (const b of bs.docs) {
        await deleteDoc(doc(db, 'batches', b.id));
      }
      // delete campuses under project
      const qCamp = query(collection(db, 'campuses'), where('projectId', '==', project.id));
      const camps = await getDocs(qCamp);
      for (const c of camps.docs) {
        await deleteDoc(doc(db, 'campuses', c.id));
      }
      // delete project
      await deleteDoc(doc(db, 'projects', project.id));
      setMessage('Project and its children deleted');
      fetchProjects();
      setSelectedProject('');
      setCampuses([]);
      setBatches([]);
    } catch (error) {
      setMessage('Error deleting project: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditCampus = async (campus) => {
    const newName = window.prompt('Enter new campus name', campus.name);
    if (!newName || newName.trim() === '' || newName === campus.name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'campuses', campus.id), { name: newName });
      // update campusName on batches
      const qBatch = query(collection(db, 'batches'), where('campusId', '==', campus.id));
      const bs = await getDocs(qBatch);
      for (const b of bs.docs) {
        await updateDoc(doc(db, 'batches', b.id), { campusName: newName });
      }
      setMessage('Campus renamed successfully');
      if (selectedProject) fetchCampuses(selectedProject);
      if (selectedCampus === campus.id) setSelectedCampus(campus.id);
    } catch (error) {
      setMessage('Error renaming campus: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteCampus = async (campus) => {
    const ok = window.confirm(`Delete campus "${campus.name}" and all its batches? This cannot be undone.`);
    if (!ok) return;
    setLoading(true);
    try {
      // delete batches under campus
      const qBatch = query(collection(db, 'batches'), where('campusId', '==', campus.id));
      const bs = await getDocs(qBatch);
      for (const b of bs.docs) {
        await deleteDoc(doc(db, 'batches', b.id));
      }
      // delete campus
      await deleteDoc(doc(db, 'campuses', campus.id));
      setMessage('Campus and its batches deleted');
      if (selectedProject) fetchCampuses(selectedProject);
      setSelectedCampus('');
      setBatches([]);
    } catch (error) {
      setMessage('Error deleting campus: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditBatch = async (batch) => {
    const newName = window.prompt('Enter new batch name', batch.name);
    if (!newName || newName.trim() === '' || newName === batch.name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'batches', batch.id), { name: newName });
      setMessage('Batch renamed successfully');
      if (selectedProject && selectedCampus) fetchBatches(selectedProject, selectedCampus);
    } catch (error) {
      setMessage('Error renaming batch: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteBatch = async (batch) => {
    const ok = window.confirm(`Delete batch "${batch.name}"? This cannot be undone.`);
    if (!ok) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'batches', batch.id));
      setMessage('Batch deleted');
      if (selectedProject && selectedCampus) fetchBatches(selectedProject, selectedCampus);
    } catch (error) {
      setMessage('Error deleting batch: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  // ...existing code...

  const handleSendPasswordReset = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!resetEmail) {
      setMessage('Please enter an email to send the reset link');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMessage(`Password reset link sent to ${resetEmail}`);
      setResetEmail('');
    } catch (error) {
      setMessage('Error sending reset email: ' + (error.message || error));
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="mr-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-800 via-indigo-700 to-blue-700 flex items-center justify-center overflow-hidden shadow-md ring-1 ring-blue-900/20">
                  <img
                    src="https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png"
                    alt="Bird logo"
                    className="h-7 w-7 object-contain"
                  />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* small avatar for mobile */}
              <div className="md:hidden flex items-center mr-2">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase()}
                </div>
              </div>
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
        <div className="bg-white rounded-xl shadow-sm p-1 mb-8 border border-gray-200 w-full">
          <nav className="flex space-x-2 px-2 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('entries')}
              className={`py-2 px-4 sm:py-3 sm:px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
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
              className={`py-2 px-4 sm:py-3 sm:px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
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
              className={`py-2 px-4 sm:py-3 sm:px-6 rounded-lg font-medium text-sm flex items-center transition-all duration-200 ${
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Email</label>
                      <input
                        type="email"
                        value={trainerEmail}
                        onChange={(e) => setTrainerEmail(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Creating...' : 'Create Trainer Account'}
                    </button>
                  </form>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM12 14v4" />
                    </svg>
                    Send Password Reset
                  </h3>

                  <p className="text-sm text-gray-600 mb-4">
                    Enter an existing trainer's email and send a password reset link. This will not create a new user.
                  </p>

                  <form onSubmit={handleSendPasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Email</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="trainer@example.com"
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="w-full px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
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
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-800 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {project.name}
                          </h4>
                          <div className="space-x-2">
                            <button onClick={() => handleEditProject(project)} className="text-sm text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteProject(project)} className="text-sm text-red-600 hover:underline">Delete</button>
                          </div>
                        </div>
                        
                        <div className="mt-3 ml-6 space-y-3 border-l-2 border-blue-200 pl-4">
                          {campuses.filter(c => c.projectId === project.id).length === 0 ? (
                            <div className="text-gray-400 text-sm bg-gray-50 p-2 rounded">
                              
                            </div>
                          ) : (
                            campuses.filter(c => c.projectId === project.id).map(campus => (
                              <div key={campus.id} className="border-l-2 border-green-200 pl-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium text-gray-700 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {campus.name}
                                  </h5>
                                  <div className="space-x-2">
                                    <button onClick={() => handleEditCampus(campus)} className="text-sm text-blue-600 hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteCampus(campus)} className="text-sm text-red-600 hover:underline">Delete</button>
                                  </div>
                                </div>
                                
                                <div className="mt-2 ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
                                  {batches.filter(b => b.campusId === campus.id).length === 0 ? (
                                    <div className="text-gray-400 text-sm bg-gray-50 p-2 rounded">
                                      
                                    </div>
                                  ) : (
                                    batches.filter(b => b.campusId === campus.id).map(batch => (
                                      <div key={batch.id} className="text-gray-600 flex items-center justify-between">
                                        <div className="flex items-center">
                                          <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                          {batch.name}
                                        </div>
                                        <div className="space-x-2">
                                          <button onClick={() => handleEditBatch(batch)} className="text-sm text-blue-600 hover:underline">Edit</button>
                                          <button onClick={() => handleDeleteBatch(batch)} className="text-sm text-red-600 hover:underline">Delete</button>
                                        </div>
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