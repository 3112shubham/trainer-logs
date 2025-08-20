import EntryForm from './EntryForm';
import { useAuth } from '../hooks/useAuth';

const TrainerDashboard = () => {
  const { logout, currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="trainer-dashboard">
      <div className="dashboard-header">
        <h1>Trainer Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {currentUser?.displayName || currentUser?.email}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
      
      <EntryForm />
    </div>
  );
};

export default TrainerDashboard;