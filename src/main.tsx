import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Perform zero-data clean slate initialization on startup
function initializeFreshClientStorage() {
  const CLIENT_SETUP_KEY = 'masar_clean_setup_v5';
  if (!localStorage.getItem(CLIENT_SETUP_KEY)) {
    // Purge all old demo and mock records from localStorage
    localStorage.removeItem('masar_orders');
    localStorage.removeItem('masar_inventory');
    localStorage.removeItem('masar_expenses');
    localStorage.removeItem('masar_employees');
    localStorage.removeItem('masar_sync_queue');
    localStorage.removeItem('masar_last_sync_time');
    localStorage.removeItem('masar_current_user');
    localStorage.removeItem('masar_settings');

    // Initialize clean empty data structures
    localStorage.setItem('masar_orders', JSON.stringify([]));
    localStorage.setItem('masar_inventory', JSON.stringify([]));
    localStorage.setItem('masar_expenses', JSON.stringify([]));
    localStorage.setItem('masar_sync_queue', JSON.stringify([]));

    const defaultCleanAdmin = [
      {
        id: '1',
        name: 'المدير العام',
        role: 'مدير',
        salary: 0,
        phone: '',
        nationalId: '',
        joinedDate: new Date().toISOString(),
        emergencyContact: '',
        status: 'نشط'
      }
    ];

    localStorage.setItem('masar_employees', JSON.stringify(defaultCleanAdmin));
    localStorage.setItem('masar_current_user', JSON.stringify(defaultCleanAdmin[0]));
    localStorage.setItem(CLIENT_SETUP_KEY, 'true');
  }
}

initializeFreshClientStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

