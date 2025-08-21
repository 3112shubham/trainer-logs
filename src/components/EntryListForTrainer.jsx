import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const EntryListForTrainer = () => {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    project: '',
    campus: '',
    batch: ''
  });
  const [projectHasCampuses, setProjectHasCampuses] = useState(true);
  
  const { currentUser } = useAuth();
  
  const fetchEntries = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      let q = query(
        collection(db, 'entries'), 
        where('trainerId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      
      const constraints = [where('trainerId', '==', currentUser.uid)];
      
      if (filters.project) {
        constraints.push(where('projectId', '==', filters.project));
      }
      
      if (filters.campus) {
        constraints.push(where('campusId', '==', filters.campus));
      }
      
      if (filters.batch) {
        constraints.push(where('batchId', '==', filters.batch));
      }
      
      if (constraints.length > 0) {
        q = query(collection(db, 'entries'), ...constraints, orderBy('date', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      const entriesData = [];
      querySnapshot.forEach((doc) => {
        entriesData.push({ id: doc.id, ...doc.data() });
      });
      
      setEntries(entriesData);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
    setLoading(false);
  }, [currentUser, filters]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEntries();
    }
  }, [fetchEntries, currentUser]);

  useEffect(() => {
    if (filters.project) {
      fetchCampuses(filters.project);
      fetchBatchesForProject(filters.project);
    } else {
      setCampuses([]);
      setBatches([]);
      setFilters(prev => ({ ...prev, campus: '', batch: '' }));
      setProjectHasCampuses(true);
    }
  }, [filters.project]);

  useEffect(() => {
    if (filters.campus && projectHasCampuses) {
      fetchBatchesForCampus(filters.campus);
    }
  }, [filters.campus, projectHasCampuses]);

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
      setProjectHasCampuses(campusesData.length > 0);
    } catch (error) {
      console.error('Error fetching campuses:', error);
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
      
      // Reset batch filter when batches change
      setFilters(prev => ({ ...prev, batch: '' }));
    } catch (error) {
      console.error('Error fetching batches for project:', error);
      setBatches([]);
      setFilters(prev => ({ ...prev, batch: '' }));
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
      
      // Reset batch filter when batches change
      setFilters(prev => ({ ...prev, batch: '' }));
    } catch (error) {
      console.error('Error fetching batches for campus:', error);
      setBatches([]);
      setFilters(prev => ({ ...prev, batch: '' }));
    }
  };

  const handleFilterChange = (filterName, value) => {
    // Reset dependent filters when parent filter changes
    if (filterName === 'project') {
      setFilters({
        project: value,
        campus: '',
        batch: ''
      });
    } else if (filterName === 'campus') {
      setFilters({
        ...filters,
        campus: value,
        batch: ''
      });
    } else {
      setFilters(prev => ({
        ...prev,
        [filterName]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading entries...</div>
      </div>
    );
  }

  return (
    <div >
      <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-6">My Training Entries</h2>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        
        {filters.project && projectHasCampuses && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              value={filters.campus}
              onChange={(e) => handleFilterChange('campus', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Campuses</option>
              {campuses.map(campus => (
                <option key={campus.id} value={campus.id}>{campus.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {filters.project && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={filters.batch}
              onChange={(e) => handleFilterChange('batch', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={projectHasCampuses && !filters.campus}
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 ">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                  No entries found
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entry.date.seconds * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.projectName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.campusName || 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.batchName}</td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="font-medium">{entry.topic}</div>
                    {entry.subtopic && (
                      <div className="text-gray-500 text-xs">{entry.subtopic}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.hours}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{entry.studentCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntryListForTrainer;