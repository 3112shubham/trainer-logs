import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { exportToPDF, exportToExcel } from '../services/exportService';

const EntryList = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    campus: '',
    batch: ''
  });
  
  const campuses = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune'];
  const batches = ['Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E', 
                  'Batch F', 'Batch G', 'Batch H', 'Batch I', 'Batch J',
                  'Batch K', 'Batch L', 'Batch M', 'Batch N', 'Batch O'];

  useEffect(() => {
    fetchEntries();
  }, [filters]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'entries'), orderBy('date', 'desc'));
      
      if (filters.campus) {
        q = query(q, where('campus', '==', filters.campus));
      }
      
      if (filters.batch) {
        q = query(q, where('batch', '==', filters.batch));
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
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleExport = (format) => {
    if (format === 'pdf') {
      exportToPDF(entries, filters, 'Your Company Name');
    } else if (format === 'excel') {
      exportToExcel(entries, filters);
    }
  };

  if (loading) {
    return <div className="loading">Loading entries...</div>;
  }

  return (
    <div className="entry-list-container">
      <h2>Training Entries</h2>
      
      <div className="filters">
        <select
          value={filters.campus}
          onChange={(e) => handleFilterChange('campus', e.target.value)}
        >
          <option value="">All Campuses</option>
          {campuses.map(campus => (
            <option key={campus} value={campus}>{campus}</option>
          ))}
        </select>
        
        <select
          value={filters.batch}
          onChange={(e) => handleFilterChange('batch', e.target.value)}
        >
          <option value="">All Batches</option>
          {batches.map(batch => (
            <option key={batch} value={batch}>{batch}</option>
          ))}
        </select>
        
        <div className="export-buttons">
          <button onClick={() => handleExport('pdf')} className="export-btn pdf">
            Export PDF
          </button>
          <button onClick={() => handleExport('excel')} className="export-btn excel">
            Export Excel
          </button>
        </div>
      </div>
      
      <div className="entries-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Campus</th>
              <th>Batch</th>
              <th>Trainer</th>
              <th>Topic</th>
              <th>Subtopic</th>
              <th>Hours</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No entries found</td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.id}>
                  <td>{new Date(entry.date.seconds * 1000).toLocaleDateString()}</td>
                  <td>{entry.campus}</td>
                  <td>{entry.batch}</td>
                  <td>{entry.trainerName}</td>
                  <td>{entry.topic}</td>
                  <td>{entry.subtopic}</td>
                  <td>{entry.hours}</td>
                  <td>{entry.studentCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntryList;