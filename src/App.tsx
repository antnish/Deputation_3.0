/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Deputation from './pages/Deputation';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {activePage === 'dashboard' && <Dashboard />}
      {activePage === 'deputation' && <Deputation />}
      {activePage !== 'dashboard' && activePage !== 'deputation' && (
        <div className="flex items-center justify-center h-full text-slate-500">
          <p>This module is under construction.</p>
        </div>
      )}
    </Layout>
  );
}
