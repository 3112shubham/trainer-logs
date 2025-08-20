import { useState, useEffect } from 'react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

const EntryForm = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [campus, setCampus] = useState('');
  const [batch, setBatch] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [batchOptions, setBatchOptions] = useState([]);
  
  const { currentUser } = useAuth();
  
  const campuses = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune'];
  const topics = ['Aptitude', 'SoftSkills', 'Technical', 'PowerBi', 'Excel'];
  const batchMappings = {
    Mumbai: ['Batch A', 'Batch B', 'Batch C'],
    Delhi: ['Batch D', 'Batch E', 'Batch F'],
    Bangalore: ['Batch G', 'Batch H', 'Batch I'],
    Hyderabad: ['Batch J', 'Batch K', 'Batch L'],
    Pune: ['Batch M', 'Batch N', 'Batch O']
  };

  useEffect(() => {
    if (campus) {
      setBatchOptions(batchMappings[campus] || []);
      setBatch('');
    } else {
      setBatchOptions([]);
      setBatch('');
    }
  }, [campus]);

  const calculateHours = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diff = (end - start) / (1000 * 60 * 60); // Convert ms to hours
      return diff > 0 ? diff.toFixed(2) : 0;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const hours = calculateHours();
      
      await addDoc(collection(db, 'entries'), {
        date: new Date(date),
        campus,
        batch,
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
    <div className="entry-form-container">
      <h2>Add Work Entry</h2>
      {message && <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
      
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Campus</label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              required
            >
              <option value="">Select Campus</option>
              {campuses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Batch</label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              required
              disabled={!campus}
            >
              <option value="">Select Batch</option>
              {batchOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            >
              <option value="">Select Topic</option>
              {topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Subtopic</label>
          <input
            type="text"
            value={subtopic}
            onChange={(e) => setSubtopic(e.target.value)}
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Hours</label>
            <input
              type="text"
              value={calculateHours()}
              readOnly
              className="hours-display"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Student Count</label>
          <input
            type="number"
            min="1"
            value={studentCount}
            onChange={(e) => setStudentCount(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Submitting...' : 'Submit Entry'}
        </button>
      </form>
    </div>
  );
};

export default EntryForm;