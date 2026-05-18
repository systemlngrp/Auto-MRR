import React, { useState, useEffect } from 'react';
import * as sheetSync from '../sheetSync';
import { pageStyles } from '../styles/pageStyles';

export default function DispatchMasterPage({ firm, currentUser, onBack }) {
  const [dispatches, setDispatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await sheetSync.fetchDispatchMaster(firm);
        setDispatches(data || []);
      } catch (err) {
        console.error('Failed to load dispatches:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [firm.firmKey]);

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={pageStyles.backButton}>←</button>
          <h2 style={pageStyles.title}>Dispatch Master</h2>
        </div>
      </div>

      <div style={pageStyles.card}>
        <table style={pageStyles.table}>
          <thead>
            <tr>
              <th style={pageStyles.th}>Loading Slip No</th>
              <th style={pageStyles.th}>Job No</th>
              <th style={pageStyles.th}>Company</th>
              <th style={pageStyles.th}>Item</th>
              <th style={pageStyles.th}>Qty</th>
              <th style={pageStyles.th}>Truck</th>
              <th style={pageStyles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>Loading...</td></tr>
            ) : dispatches.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>No dispatch records found.</td></tr>
            ) : (
              dispatches.map((d) => (
                <tr key={d.id}>
                  <td style={pageStyles.td}>{d.loading_slip_no}</td>
                  <td style={pageStyles.td}>{d.job_no}</td>
                  <td style={pageStyles.td}>{d.company_name}</td>
                  <td style={pageStyles.td}>{d.item}</td>
                  <td style={pageStyles.td}>{d.dispatch_qty}</td>
                  <td style={pageStyles.td}>{d.truck_number}</td>
                  <td style={pageStyles.td}>{new Date(d.dispatch_date).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
