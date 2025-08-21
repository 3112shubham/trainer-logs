import { useState, useEffect } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const EntryForm = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [project, setProject] = useState('');
  const [campus, setCampus] = useState('');
  const [batch, setBatch] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [projectHasCampuses, setProjectHasCampuses] = useState(true);
  
  const { currentUser } = useAuth();
  
  const topics = ['Aptitude', 'SoftSkills', 'Technical', 'PowerBi', 'Excel'];

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (project) {
      fetchCampuses(project);
      fetchBatchesForProject(project);
    } else {
      setCampuses([]);
      setBatches([]);
      setCampus('');
      setBatch('');
      setProjectHasCampuses(true);
    }
  }, [project]);

  useEffect(() => {
    if (campus && projectHasCampuses) {
      fetchBatchesForCampus(campus);
    }
  }, [campus, projectHasCampuses]);

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
      setMessage('Error loading projects');
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
      setProjectHasCampuses(campusesData.length > 0);
      
      // Reset campus when campuses change
      setCampus('');
    } catch (error) {
      console.error('Error fetching campuses:', error);
      setMessage('Error loading campuses');
      setProjectHasCampuses(true);
    }
  };

  const fetchBatchesForProject = async (projectId) => {
    try {
      const q = query(collection(db, 'batches'), where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      const batchesData = [];
      querySnapshot.forEach((doc) => {
        batchesData.push({ id: doc.id, ...doc.data() });
      });
      
      // If project doesn't have campuses, set batches directly
      if (batchesData.length > 0) {
        setBatches(batchesData);
      } else {
        setBatches([]);
      }
      
      // Reset batch when batches change
      setBatch('');
    } catch (error) {
      console.error('Error fetching batches for project:', error);
      setBatches([]);
      setBatch('');
    }
  };

  const fetchBatchesForCampus = async (campusId) => {
    try {
      const q = query(collection(db, 'batches'), where('campusId', '==', campusId));
      const querySnapshot = await getDocs(q);
      const batchesData = [];
      querySnapshot.forEach((doc) => {
        batchesData.push({ id: doc.id, ...doc.data() });
      });
      setBatches(batchesData);
      
      // Reset batch when batches change
      setBatch('');
    } catch (error) {
      console.error('Error fetching batches for campus:', error);
      setMessage('Error loading batches');
      setBatches([]);
      setBatch('');
    }
  };

  const calculateHours = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diff = (end - start) / (1000 * 60 * 60);
      return diff > 0 ? diff.toFixed(2) : 0;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const hours = calculateHours();
      const selectedProjectData = projects.find(p => p.id === project);
      const selectedCampusData = campuses.find(c => c.id === campus);
      const selectedBatchData = batches.find(b => b.id === batch);
      
      await addDoc(collection(db, 'entries'), {
        date: new Date(date),
        projectId: project,
        projectName: selectedProjectData?.name || '',
        campusId: projectHasCampuses ? campus : null,
        campusName: projectHasCampuses ? (selectedCampusData?.name || '') : '',
        batchId: batch,
        batchName: selectedBatchData?.name || '',
        topic,
        subtopic,
        startTime,
        endTime,
        hours,
        studentCount: parseInt(studentCount),
        trainerId: currentUser.uid,
        trainerName: currentUser.displayName || currentUser.email,
        createdAt: new Date()
      });
      
      setMessage('Entry submitted successfully!');
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setProject('');
      setCampus('');
      setBatch('');
      setTopic('');
      setSubtopic('');
      setStartTime('');
      setEndTime('');
      setStudentCount('');
    } catch (error) {
      setMessage('Error submitting entry: ' + error.message);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mx-2 md:mx-0">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-6">Add Work Entry</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm md:text-base ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setCampus('');
                setBatch('');
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {projectHasCampuses && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
              <select
                value={campus}
                onChange={(e) => {
                  setCampus(e.target.value);
                  setBatch('');
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required={projectHasCampuses}
                disabled={!project}
              >
                <option value="">Select Campus</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required
                disabled={!campus}
              >
                <option value="">Select Batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {!projectHasCampuses && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required
                disabled={!project}
              >
                <option value="">Select Batch</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div></div> {/* Empty div for layout consistency */}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Topic</option>
              {topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="Enter subtopic details"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <input
              type="text"
              value={calculateHours()}
              readOnly
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Count</label>
            <input
              type="number"
              min="1"
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="Number of students"
            />
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-sm md:text-base"
          >
            {loading ? 'Submitting...' : 'Submit Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryForm;