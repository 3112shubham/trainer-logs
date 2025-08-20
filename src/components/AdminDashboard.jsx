import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import EntryList from './EntryList';
import { useAuth } from '../hooks/useAuth';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('entries');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { logout } = useAuth();

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create auth user
      const password = Math.random().toString(36).slice(-8); // Generate random password
      const userCredential = await createUserWithEmailAndPassword(auth, trainerEmail, password);
      
      // Add to users collection
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: trainerEmail,
        name: trainerName,
        role: 'trainer',
        createdAt: new Date()
      });
      
      // In a real app, you would send an email here with the credentials
      setMessage(`Trainer account created successfully! Email: ${trainerEmail}, Password: ${password}`);
      
      // Reset form
      setTrainerEmail('');
      setTrainerName('');
    } catch (error) {
      setMessage('Error creating trainer: ' + error.message);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'entries' ? 'active' : ''}
          onClick={() => setActiveTab('entries')}
        >
          View Entries
        </button>
        <button 
          className={activeTab === 'addTrainer' ? 'active' : ''}
          onClick={() => setActiveTab('addTrainer')}
        >
          Add Trainer
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'entries' && <EntryList />}
        
        {activeTab === 'addTrainer' && (
          <div className="add-trainer-form">
            <h2>Add New Trainer</h2>
            {message && (
              <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleCreateTrainer}>
              <div className="form-group">
                <label>Trainer Name</label>
                <input
                  type="text"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Trainer Email</label>
                <input
                  type="email"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Creating...' : 'Create Trainer Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;