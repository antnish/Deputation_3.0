import React, { useState, useEffect, useCallback } from 'react';
import { jsonpRequest, postRequest } from '../lib/api';
import { Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const BRANCHES = [
  "DAMOH", "DINDORI", "SEONI", "ANUPPUR", "BALAGHAT",
  "KATNI", "JABALPUR BHL", "MANDLA", "NARSINGHPUR", "JABALPUR HL"
];

const NON_DEPUTATION_WORK_TYPES = ["Free", "Leave", "Absent"];

interface DeputationRow {
  id: string;
  engineerName: string;
  workshopOnsite: string;
  machineNo: string;
  customerName: string;
  contactNumber: string;
  complaint: string;
  hmr: string;
  callType: string;
  primarySecondary: string;
  breakdownStatus: string;
  siteLocation: string;
  siteDistance: string;
  callId: string;
  labourCharge: string;
  totalAllowances: string;
  isAdditional: boolean;
  isMissing?: boolean;
  saveStatus?: 'success' | 'updated' | 'duplicate' | 'error' | null;
  customerLoading?: boolean;
}

export default function Deputation() {
  const [branch, setBranch] = useState('');
  const [engineers, setEngineers] = useState<string[]>([]);
  const [rows, setRows] = useState<DeputationRow[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSummary, setShowSummary] = useState<{ saved: number, duplicates: number, skipped: number } | null>(null);

  const loadBranch = async (selectedBranch: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }

    setBranch(selectedBranch);
    if (!selectedBranch) {
      setRows([]);
      return;
    }

    setLoading(true);
    setLoadingMessage("Checking branch status...");

    try {
      const statusRes = await jsonpRequest({ action: "isFinalized", location: selectedBranch });
      const locked = statusRes.finalized === true;
      setIsFinalized(locked);

      setLoadingMessage("Loading engineers...");
      const engs = await jsonpRequest({ action: "getEngineers", location: selectedBranch });
      setEngineers(engs || []);

      setLoadingMessage("Loading today's data...");
      const data = await jsonpRequest({ action: "getTodayData", location: selectedBranch });
      
      const initialRows: DeputationRow[] = [];
      const processedEngineers = new Set<string>();

      (engs || []).forEach((eng: string) => {
        const engData = (Array.isArray(data) ? data : []).filter((d: any) => d.engineerName === eng);
        if (engData.length > 0) {
          engData.forEach((d: any, idx: number) => {
            initialRows.push({
              id: crypto.randomUUID(),
              engineerName: String(d.engineerName || ''),
              workshopOnsite: String(d.workshopOnsite || ''),
              machineNo: String(d.machineNo || ''),
              customerName: String(d.customerName || ''),
              contactNumber: String(d.contactNumber || ''),
              complaint: String(d.complaint || ''),
              hmr: String(d.hmr || ''),
              callType: String(d.callType || ''),
              primarySecondary: String(d.primarySecondary || ''),
              breakdownStatus: String(d.breakdownStatus || ''),
              siteLocation: String(d.siteLocation || ''),
              siteDistance: String(d.siteDistance || ''),
              callId: String(d.callId || ''),
              labourCharge: String(d.labourCharge || ''),
              totalAllowances: String(d.totalAllowances || ''),
              isAdditional: idx > 0,
            });
          });
        } else {
          initialRows.push({
            id: crypto.randomUUID(),
            engineerName: eng,
            workshopOnsite: '',
            machineNo: '',
            customerName: '',
            contactNumber: '',
            complaint: '',
            hmr: '',
            callType: '',
            primarySecondary: '',
            breakdownStatus: '',
            siteLocation: '',
            siteDistance: '',
            callId: '',
            labourCharge: '',
            totalAllowances: '',
            isAdditional: false,
          });
        }
        processedEngineers.add(eng);
      });

      // Add any data rows whose engineer wasn't in the engs list
      (Array.isArray(data) ? data : []).forEach((d: any) => {
        if (!processedEngineers.has(d.engineerName)) {
          initialRows.push({
            id: crypto.randomUUID(),
            engineerName: String(d.engineerName || ''),
            workshopOnsite: String(d.workshopOnsite || ''),
            machineNo: String(d.machineNo || ''),
            customerName: String(d.customerName || ''),
            contactNumber: String(d.contactNumber || ''),
            complaint: String(d.complaint || ''),
            hmr: String(d.hmr || ''),
            callType: String(d.callType || ''),
            primarySecondary: String(d.primarySecondary || ''),
            breakdownStatus: String(d.breakdownStatus || ''),
            siteLocation: String(d.siteLocation || ''),
            siteDistance: String(d.siteDistance || ''),
            callId: String(d.callId || ''),
            labourCharge: String(d.labourCharge || ''),
            totalAllowances: String(d.totalAllowances || ''),
            isAdditional: true,
          });
        }
      });

      setRows(initialRows);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(error);
      alert("Failed to load branch data.");
    } finally {
      setLoading(false);
    }
  };

  const recalculateTADA = useCallback((currentRows: DeputationRow[]) => {
    const newRows = [...currentRows];
    const machineGroups: Record<string, number[]> = {};

    newRows.forEach((row, index) => {
      if (row.workshopOnsite !== "Onsite" || !row.machineNo.trim()) {
        newRows[index] = { ...row, totalAllowances: '' };
        return;
      }
      if (!machineGroups[row.machineNo]) {
        machineGroups[row.machineNo] = [];
      }
      machineGroups[row.machineNo].push(index);
    });

    Object.keys(machineGroups).forEach(machineNo => {
      const group = machineGroups[machineNo];
      const engineerCount = group.length;
      let highLabourCount = 0;
      let maxKM = 0;

      group.forEach(index => {
        const labour = Number(newRows[index].labourCharge) || 0;
        const km = Number(newRows[index].siteDistance) || 0;
        if (labour >= 2360) highLabourCount++;
        if (km > maxKM) maxKM = km;
      });

      if (highLabourCount > 0) {
        if (highLabourCount === engineerCount) {
          group.forEach(index => { newRows[index].totalAllowances = '1000'; });
        } else {
          const divided = Math.floor(1000 / engineerCount);
          group.forEach(index => { newRows[index].totalAllowances = divided.toString(); });
        }
        return;
      }

      let slabAmount = 0;
      if (maxKM >= 150) slabAmount = 750;
      else if (maxKM > 50) slabAmount = 500;
      else slabAmount = 250;

      const divided = Math.floor(slabAmount / engineerCount);
      group.forEach(index => { newRows[index].totalAllowances = divided.toString(); });
    });

    return newRows;
  }, []);

  const updateRow = (id: string, field: keyof DeputationRow, value: any) => {
    if (isFinalized) return;
    setHasUnsavedChanges(true);
    
    setRows(prev => {
      let newRows = prev.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === 'workshopOnsite' && NON_DEPUTATION_WORK_TYPES.includes(value)) {
            // Clear fields if non-deputation
            return {
              ...updated,
              machineNo: '', customerName: '', contactNumber: '', hmr: '',
              callType: '', primarySecondary: '', breakdownStatus: '',
              siteLocation: '', siteDistance: '', callId: '', labourCharge: '', totalAllowances: ''
            };
          }
          return updated;
        }
        return row;
      });

      if (['workshopOnsite', 'machineNo', 'labourCharge', 'siteDistance'].includes(field)) {
        newRows = recalculateTADA(newRows);
      }
      
      return newRows;
    });
  };

  const handleMachineBlur = async (id: string, machineNo: string) => {
    if (!machineNo.trim() || isFinalized) return;
    
    setRows(prev => prev.map(r => r.id === id ? { ...r, customerLoading: true } : r));
    try {
      const res = await jsonpRequest({ action: "getMachineDetails", machineNo });
      if (res.customer) {
        setRows(prev => prev.map(r => r.id === id ? { ...r, customerName: res.customer } : r));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRows(prev => prev.map(r => r.id === id ? { ...r, customerLoading: false } : r));
    }
  };

  const addRow = () => {
    if (isFinalized) return;
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      engineerName: '',
      workshopOnsite: '',
      machineNo: '',
      customerName: '',
      contactNumber: '',
      complaint: '',
      hmr: '',
      callType: '',
      primarySecondary: '',
      breakdownStatus: '',
      siteLocation: '',
      siteDistance: '',
      callId: '',
      labourCharge: '',
      totalAllowances: '',
      isAdditional: true,
    }]);
  };

  const removeRow = (id: string) => {
    if (isFinalized) return;
    setRows(prev => {
      const newRows = prev.filter(r => r.id !== id);
      return recalculateTADA(newRows);
    });
  };

  const saveAll = async (hideSummary = false): Promise<boolean> => {
    if (rows.length === 0) return false;
    setLoading(true);
    setLoadingMessage("Saving data...");

    let skippedCount = 0;
    let successCount = 0;
    let duplicateCount = 0;
    const newRows = [...rows];

    const promises = newRows.map(async (row, index) => {
      row.isMissing = false;
      row.saveStatus = null;

      if (!row.engineerName) {
        row.isMissing = true;
        skippedCount++;
        return;
      }

      const isNonDeputation = NON_DEPUTATION_WORK_TYPES.includes(row.workshopOnsite);
      if (!row.complaint.trim() || (!row.machineNo.trim() && !isNonDeputation)) {
        row.isMissing = true;
        skippedCount++;
        return;
      }

      const payload = {
        officeLocation: branch,
        engineerName: row.engineerName,
        workshopOnsite: row.workshopOnsite,
        callType: row.callType,
        primarySecondary: row.primarySecondary,
        complaint: row.complaint,
        customerName: row.customerName,
        contactNumber: row.contactNumber,
        machineNo: row.machineNo,
        hmr: row.hmr,
        breakdownStatus: row.breakdownStatus,
        siteLocation: row.siteLocation,
        callId: row.callId,
        labourCharge: row.labourCharge,
        siteDistance: row.siteDistance,
        totalAllowances: row.totalAllowances
      };

      try {
        const res = await postRequest(payload);
        if (res.status === 'success') {
          successCount++;
          row.saveStatus = 'success';
        } else if (res.status === 'updated') {
          successCount++;
          row.saveStatus = 'updated';
        } else if (res.status === 'duplicate') {
          duplicateCount++;
          row.saveStatus = 'duplicate';
        } else if (res.status === 'locked') {
          throw new Error("Branch finalized");
        }
      } catch (e) {
        row.saveStatus = 'error';
        throw e;
      }
    });

    try {
      await Promise.all(promises);
      setRows(newRows);
      if (!hideSummary) {
        setShowSummary({ saved: successCount, duplicates: duplicateCount, skipped: skippedCount });
      }
      setHasUnsavedChanges(false);
      return true;
    } catch (e) {
      alert("Save failed or branch is locked.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    const today = new Date().toLocaleDateString();
    const printTime = new Date().toLocaleString();

    let onsite = 0, workshop = 0, absent = 0, leave = 0, free = 0;
    let tableRows = "";

    rows.forEach((row) => {
      const wo = row.workshopOnsite;
      if (!row.engineerName || !wo) return;

      if (wo === "Onsite") onsite++;
      if (wo === "Workshop") workshop++;
      if (wo === "Absent") absent++;
      if (wo === "Leave") leave++;
      if (wo === "Free") free++;

      tableRows += `
        <tr>
          <td>${row.engineerName}</td>
          <td>${wo}</td>
          <td>${row.machineNo}</td>
          <td>${row.customerName}</td>
          <td>${row.contactNumber}</td>
          <td>${row.complaint}</td>
          <td>${row.hmr}</td>
          <td>${row.callType}</td>
          <td>${row.primarySecondary}</td>
          <td>${row.breakdownStatus}</td>
          <td>${row.siteLocation}</td>
          <td>${row.siteDistance}</td>
          <td>${row.callId}</td>
          <td>${row.labourCharge}</td>
          <td>${row.totalAllowances}</td>
        </tr>
      `;
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
      <head>
        <title>Deputation Report - ${branch}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; font-size: 10px; }
          h2 { text-align: center; margin-bottom: 15px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 9px; }
          th { background: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 10px; }
          .summary { font-weight: 600; }
        </style>
      </head>
      <body>
        <h2>
          SERVICE ENGINEER DEPUTATION CHART & DAILY REPORT FOR ${branch}  
          <br>
          DATE: ${today}
        </h2>
        <table>
          <thead>
            <tr>
              <th>Engineer</th>
              <th>W/O</th>
              <th>Machine No</th>
              <th>Customer</th>
              <th>Contact No</th>
              <th>Complaint</th>
              <th>HMR</th>
              <th>Call Type</th>
              <th>P/S</th>
              <th>Status</th>
              <th>M/C Location</th>
              <th>KM</th>
              <th>Call ID</th>
              <th>Labour</th>
              <th>TA DA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <div class="summary">
            <strong>Deputation Summary:</strong>
            Onsite: ${onsite} | Workshop: ${workshop} | Absent: ${absent} | Leave: ${leave} | Free: ${free}
          </div>
          <div>
            <strong>Report Print Date & Time:</strong><br>
            ${printTime}
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const finalizeAndPrint = async () => {
    if (isFinalized) {
      printReport();
      return;
    }

    if (hasUnsavedChanges) {
      const saved = await saveAll(true);
      if (!saved) return;
    }

    if (!window.confirm("Are you sure you want to finalize? This will lock the branch for today.")) return;

    setLoading(true);
    setLoadingMessage("Finalizing branch...");
    try {
      const res = await postRequest({ action: "finalizeBranch", branch });
      if (res.status === 'success' || res.status === 'locked') {
        setIsFinalized(true);
        printReport();
      } else {
        alert("Finalization failed.");
      }
    } catch (e) {
      alert("Server error during finalization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <select 
            className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={branch}
            onChange={(e) => loadBranch(e.target.value)}
          >
            <option value="">Select Branch</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {branch && (
            <span className="text-sm font-medium text-slate-600">
              {isFinalized ? <span className="text-red-600 flex items-center gap-1"><AlertCircle size={16}/> Finalized (Locked)</span> : <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> Open for Edits</span>}
            </span>
          )}
        </div>
        {branch && !isFinalized && (
          <button 
            onClick={addRow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Add Call
          </button>
        )}
      </div>

      {branch && !loading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col print-area print:shadow-none print:rounded-none">
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-sm font-bold m-0">SERVICE ENGINEER DEPUTATION CHART & DAILY REPORT FOR {branch}</h2>
            <p className="text-xs font-semibold m-0 mt-1">DATE: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap print:border-collapse print:border print:border-black">
              <thead className="bg-slate-900 text-white print:bg-slate-100 print:text-black">
                <tr>
                  <th className="px-3 py-2.5 font-medium min-w-[150px] print:border print:border-black print:p-1">Engineer</th>
                  <th className="px-3 py-2.5 font-medium w-[100px] print:border print:border-black print:p-1">W/O</th>
                  <th className="px-3 py-2.5 font-medium w-[120px] print:border print:border-black print:p-1">Machine No *</th>
                  <th className="px-3 py-2.5 font-medium min-w-[150px] print:border print:border-black print:p-1">Customer</th>
                  <th className="px-3 py-2.5 font-medium w-[120px] print:border print:border-black print:p-1">Contact No</th>
                  <th className="px-3 py-2.5 font-medium min-w-[200px] print:border print:border-black print:p-1">Complaint *</th>
                  <th className="px-3 py-2.5 font-medium w-[80px] print:border print:border-black print:p-1">HMR</th>
                  <th className="px-3 py-2.5 font-medium w-[100px] print:border print:border-black print:p-1">Call Type</th>
                  <th className="px-3 py-2.5 font-medium w-[100px] print:border print:border-black print:p-1">P/S</th>
                  <th className="px-3 py-2.5 font-medium w-[150px] print:border print:border-black print:p-1">Status</th>
                  <th className="px-3 py-2.5 font-medium min-w-[150px] print:border print:border-black print:p-1">M/C Location</th>
                  <th className="px-3 py-2.5 font-medium w-[80px] print:border print:border-black print:p-1">KM</th>
                  <th className="px-3 py-2.5 font-medium w-[120px] print:border print:border-black print:p-1">Call ID</th>
                  <th className="px-3 py-2.5 font-medium w-[100px] print:border print:border-black print:p-1">Labour</th>
                  <th className="px-3 py-2.5 font-medium w-[100px] print:border print:border-black print:p-1">TA DA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-black">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-8 text-center text-slate-500">
                      No engineers found for this branch. Click "+ Add Call" to add one.
                    </td>
                  </tr>
                ) : rows.map((row) => {
                  const isNonDep = NON_DEPUTATION_WORK_TYPES.includes(row.workshopOnsite);
                  const isComplete = row.machineNo && row.complaint && !isNonDep;
                  
                  // Real-time missing info check: if they have selected a W/O but missing required fields
                  const hasAnyData = !!row.workshopOnsite;
                  const isMissingCritical = hasAnyData && (!row.engineerName || !row.complaint.trim() || (!row.machineNo.trim() && !isNonDep));
                  
                  const rowClass = (row.isMissing || isMissingCritical) ? 'bg-red-50 outline outline-2 outline-red-400 print:outline-none' : 
                                   isNonDep ? 'bg-pink-50 print:bg-transparent' : 
                                   isComplete ? 'bg-green-50 print:bg-transparent' : 'bg-white print:bg-transparent';
                  
                  const inputClass = "w-full border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 print:border-none print:p-0 print:bg-transparent print:text-black";
                  const errorInputClass = "border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50";

                  return (
                    <tr key={row.id} className={`${rowClass} hover:bg-slate-50 transition-colors ${row.saveStatus === 'success' ? 'opacity-60 print:opacity-100' : ''}`}>
                      <td className="px-3 py-2 flex items-center gap-2 print:border print:border-black print:p-1">
                        {row.isAdditional ? (
                          <select 
                            className={`${inputClass} ${(!row.engineerName && hasAnyData) ? errorInputClass : ''}`}
                            value={row.engineerName}
                            onChange={e => updateRow(row.id, 'engineerName', e.target.value)}
                            disabled={isFinalized}
                          >
                            <option value=""></option>
                            {engineers.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : (
                          <span className={`font-medium ${(!row.engineerName && hasAnyData) ? 'text-red-600' : ''}`}>{row.engineerName || 'Unknown'}</span>
                        )}
                        {row.isAdditional && !isFinalized && (
                          <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 p-1 print:hidden">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <select className={inputClass} value={row.workshopOnsite} onChange={e => updateRow(row.id, 'workshopOnsite', e.target.value)} disabled={isFinalized}>
                          <option value=""></option>
                          <option>Workshop</option><option>Onsite</option><option>Free</option><option>Leave</option><option>Absent</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={`${inputClass} ${(!row.machineNo.trim() && hasAnyData && !isNonDep) ? errorInputClass : ''}`} value={row.machineNo} onChange={e => updateRow(row.id, 'machineNo', e.target.value)} onBlur={e => handleMachineBlur(row.id, e.target.value)} disabled={isFinalized || isNonDep} placeholder={hasAnyData && !isNonDep ? "Required" : ""} />
                      </td>
                      <td className="px-3 py-2 relative print:border print:border-black print:p-1">
                        <input className={inputClass} value={row.customerName} onChange={e => updateRow(row.id, 'customerName', e.target.value)} disabled={isFinalized || isNonDep} />
                        {row.customerLoading && <Loader2 size={14} className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-slate-400 print:hidden" />}
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} type="tel" maxLength={10} value={row.contactNumber} onChange={e => updateRow(row.id, 'contactNumber', e.target.value.replace(/\D/g, ''))} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={`${inputClass} ${(!row.complaint.trim() && hasAnyData) ? errorInputClass : ''}`} value={row.complaint} onChange={e => updateRow(row.id, 'complaint', e.target.value)} disabled={isFinalized} placeholder={hasAnyData ? "Required" : ""} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} type="number" min="0" value={row.hmr} onChange={e => updateRow(row.id, 'hmr', e.target.value)} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <select className={inputClass} value={row.callType} onChange={e => updateRow(row.id, 'callType', e.target.value)} disabled={isFinalized || isNonDep}>
                          <option value=""></option>
                          <option>U/W</option><option>B/W</option><option>P/T</option><option>P/W</option><option>JCB CARE</option><option>ASC</option><option>Goodwill</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <select className={inputClass} value={row.primarySecondary} onChange={e => updateRow(row.id, 'primarySecondary', e.target.value)} disabled={isFinalized || isNonDep}>
                          <option value=""></option>
                          <option>Primary</option><option>Secondary</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <select className={inputClass} value={row.breakdownStatus} onChange={e => updateRow(row.id, 'breakdownStatus', e.target.value)} disabled={isFinalized || isNonDep}>
                          <option value=""></option>
                          <option>Running With Problem</option><option>Breakdown</option><option>PDI</option><option>Service</option><option>Installation</option><option>Visit</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} value={row.siteLocation} onChange={e => updateRow(row.id, 'siteLocation', e.target.value)} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} type="number" min="0" value={row.siteDistance} onChange={e => updateRow(row.id, 'siteDistance', e.target.value)} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} value={row.callId} onChange={e => updateRow(row.id, 'callId', e.target.value)} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={inputClass} type="number" min="0" value={row.labourCharge} onChange={e => updateRow(row.id, 'labourCharge', e.target.value)} disabled={isFinalized || isNonDep} />
                      </td>
                      <td className="px-3 py-2 print:border print:border-black print:p-1">
                        <input className={`${inputClass} bg-slate-100 print:bg-transparent`} value={row.totalAllowances} readOnly />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="hidden print:flex justify-between mt-4 text-[10px] font-semibold">
            <div>
              <strong>Deputation Summary:</strong> Onsite: {rows.filter(r => r.workshopOnsite === 'Onsite').length} | Workshop: {rows.filter(r => r.workshopOnsite === 'Workshop').length} | Absent: {rows.filter(r => r.workshopOnsite === 'Absent').length} | Leave: {rows.filter(r => r.workshopOnsite === 'Leave').length} | Free: {rows.filter(r => r.workshopOnsite === 'Free').length}
            </div>
            <div>
              <strong>Report Print Date & Time:</strong><br/>
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {branch && rows.length > 0 && (
        <div className="fixed bottom-6 right-6 flex gap-3 z-50 print:hidden">
          <button 
            onClick={finalizeAndPrint}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-transform hover:-translate-y-1"
          >
            {isFinalized ? "Print Report" : "Finalize & Print"}
          </button>
          {!isFinalized && (
            <button 
              onClick={() => saveAll()}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-transform hover:-translate-y-1"
            >
              Save Changes
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-700">{loadingMessage}</p>
          </div>
        </div>
      )}

      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl shadow-xl min-w-[300px] text-center">
            <h3 className="text-lg font-semibold mb-4">Save Summary</h3>
            <div className="space-y-2 text-sm text-slate-600 mb-6">
              <p>Saved: <span className="font-semibold text-green-600">{showSummary.saved}</span></p>
              <p>Duplicates: <span className="font-semibold text-orange-600">{showSummary.duplicates}</span></p>
              <p>Incomplete: <span className="font-semibold text-red-600">{showSummary.skipped}</span></p>
            </div>
            <button 
              onClick={() => setShowSummary(null)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 w-full"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
