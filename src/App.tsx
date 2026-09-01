import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import ProductionKanban from './pages/ProductionKanban';
import Audit from './pages/Audit';

import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Treasury from './pages/Treasury';
import SmartAnalysis from './pages/SmartAnalysis';


export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="sales" element={<Sales />} />
            <Route path="kanban" element={<ProductionKanban />} />
            <Route path="tasks" element={<ProductionKanban />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="expenses" element={<Expenses />} />

            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="treasury" element={<Treasury />} />
            <Route path="analysis" element={<SmartAnalysis />} />

            <Route path="employees" element={<Employees />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

