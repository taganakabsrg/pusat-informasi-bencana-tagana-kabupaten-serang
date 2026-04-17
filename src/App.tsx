/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MapDashboard from './components/MapDashboard';
import ReportForm from './components/ReportForm';
import ReportsList from './components/ReportsList';
import ReportDetail from './components/ReportDetail';
import CitizenForm from './components/CitizenForm';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<MapDashboard />} />
          <Route path="/reports" element={<ReportsList />} />
          <Route path="/report/:id" element={<ReportDetail />} />
          
          <Route 
            path="/input-report" 
            element={
              <ProtectedRoute>
                <ReportForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report/:id/add-citizen" 
            element={
              <ProtectedRoute>
                <CitizenForm />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

