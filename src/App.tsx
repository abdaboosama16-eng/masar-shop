import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Employees from './pages/Employees';
import Workshops from './pages/Workshops';
import Sales from './pages/Sales';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import DynamicCustomPage from './pages/DynamicCustomPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/sales" replace />} />
            <Route path="sales" element={<Sales />} />
            <Route path="workshops" element={<Workshops />} />
            <Route path="employees" element={<Employees />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<Settings />} />
            <Route path="page/:pageId" element={<DynamicCustomPage />} />
            <Route path="custom/:pageId" element={<DynamicCustomPage />} />
            <Route path="*" element={<Navigate to="/sales" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

