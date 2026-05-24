import React, { useState, useEffect, useRef } from 'react';
import { Save, Send, Download, Plus, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const SitrepForm = ({ rescue }) => {
  const [activeTab, setActiveTab] = useState('situation');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Draft');
  const [toasts, setToasts] = useState([]);
  const textRefs = useRef({});
  const [textFormat, setTextFormat] = useState({
    situationOverview: { fontFamily: 'Arial Narrow', fontSize: 12, textAlign: 'left' },
    actionsTaken: { fontFamily: 'Arial Narrow', fontSize: 12, textAlign: 'left' }
  });

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Complete SITREP data structure
  const defaultSitrep = {
    reportId: rescue._id,
    templateType: 'SITREP2',
    // I. SITUATION OVERVIEW
    situationOverview: '',
    // II. EFFECTS
    // a. Affected Population
    affectedPopulation: [],
    // b. IDP Center Profile
    idpCenters: [],
    // c. Lifelines
    lifelines: {
      roadsAndBridges: { affectedArea: '', status: '', damageDescription: '', actionsTaken: '' },
      electricity: { affectedArea: '', status: '', damageDescription: '', actionsTaken: '' },
      waterSystem: { affectedArea: '', status: '', damageDescription: '', actionsTaken: '' },
      communication: { affectedArea: '', status: '', damageDescription: '', actionsTaken: '' }
    },
    // d. Damage to Houses
    houseDamage: [],
    // e. Agriculture & Livestock
    agriculture: {
      rice: [],
      corn: [],
      hvcc: [],
      livestock: []
    },
    // Administrative Actions  
    administrativeActions: {
      suspensionOfClasses: false,
      suspensionOfClassesDetails: '',
      suspensionOfWork: false,
      suspensionOfWorkDetails: '',
      declarationOfCalamity: false,
      declarationOfCalamityDetails: ''
    },
    // III. Actions Taken
    actionsTaken: ''
  };

  const mergeSitrepDefaults = (apiData) => {
    return {
      ...defaultSitrep,
      ...apiData,
      affectedPopulation: Array.isArray(apiData.affectedPopulation) ? apiData.affectedPopulation : [],
      idpCenters: Array.isArray(apiData.idpCenters) ? apiData.idpCenters : [],
      houseDamage: Array.isArray(apiData.houseDamage) ? apiData.houseDamage : [],
      agriculture: {
        rice: Array.isArray(apiData.agriculture?.rice) ? apiData.agriculture.rice : [],
        corn: Array.isArray(apiData.agriculture?.corn) ? apiData.agriculture.corn : [],
        hvcc: Array.isArray(apiData.agriculture?.hvcc) ? apiData.agriculture.hvcc : [],
        livestock: Array.isArray(apiData.agriculture?.livestock) 
          ? apiData.agriculture.livestock.map(item => ({
              location: item.location || '',
              specie: item.specie || '',
              numberOfHeads: item.numberOfHeads || 0,
              amount: item.amount || 0
            }))
          : []
      },
      lifelines: { ...defaultSitrep.lifelines, ...(apiData.lifelines || {}) },
      administrativeActions: { ...defaultSitrep.administrativeActions, ...(apiData.administrativeActions || {}) }
    };
  };

  const [sitrep, setSitrep] = useState(defaultSitrep);

  useEffect(() => {
    const fetchSitrep = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/sitrep/${rescue._id}`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
        const data = await response.json();
        
        if (data.sitrep) {
          setSitrep(mergeSitrepDefaults(data.sitrep));
          setStatus(data.sitrep.status || 'Draft');
        } else {
          setSitrep(defaultSitrep);
        }
      } catch (error) {
        console.error('Error fetching SITREP:', error);
        showToast('Error fetching SITREP', 'error');
        setSitrep(defaultSitrep);
      } finally {
        setLoading(false);
      }
    };

    if (rescue._id) {
      fetchSitrep();
    }
  }, [rescue._id]);



  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const payload = { ...sitrep, status: 'Draft', templateType: 'SITREP2' };
      
      const response = await fetch(`${API_BASE}/api/sitrep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setStatus('Draft');
        showToast('SITREP saved as draft', 'success');
      } else {
        showToast('Error saving SITREP', 'error');
      }
    } catch (error) {
      console.error('Error saving SITREP:', error);
      showToast('Error saving SITREP: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit SITREP for approval? This cannot be undone.')) return;

    try {
      setSaving(true);
      
      // First, save the SITREP data
      console.log('💾 Saving SITREP before submission...');
      const payload = { ...sitrep, status: 'Draft', templateType: 'SITREP2' };
      const saveResponse = await fetch(`${API_BASE}/api/sitrep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });

      if (!saveResponse.ok) {
        showToast('Error saving SITREP before submission', 'error');
        return;
      }

      // Then submit
      console.log('📤 Submitting SITREP...');
      const response = await fetch(`${API_BASE}/api/sitrep/${rescue._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });

      if (response.ok) {
        setStatus('Submitted');
        showToast('SITREP submitted for approval', 'success');
      } else {
        const errorData = await response.json();
        showToast('Error submitting SITREP: ' + (errorData.message || response.statusText), 'error');
      }
    } catch (error) {
      console.error('Error submitting SITREP:', error);
      showToast('Error submitting SITREP: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportWord = async () => {
    try {
      setSaving(true);
      
      const payload = { ...sitrep, status, templateType: 'SITREP2' };
      await fetch(`${API_BASE}/api/sitrep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      
      const response = await fetch(`${API_BASE}/api/sitrep/${rescue._id}/export-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ templateType: 'SITREP2' })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SITREP_${rescue._id}_${new Date().toISOString().slice(0, 10)}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('SITREP exported successfully', 'success');
      } else {
        showToast('Error exporting SITREP', 'error');
      }
    } catch (error) {
      console.error('Error exporting SITREP:', error);
      showToast('Error exporting SITREP: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for adding/removing items
  const addPopulation = () => {
    setSitrep(prev => ({
      ...prev,
      affectedPopulation: [...prev.affectedPopulation, { location: '', families: null, persons: null }]
    }));
  };

  const removePopulation = (idx) => {
    setSitrep(prev => ({
      ...prev,
      affectedPopulation: prev.affectedPopulation.filter((_, i) => i !== idx)
    }));
  };

  const addIdpCenter = () => {
    setSitrep(prev => ({
      ...prev,
      idpCenters: [...prev.idpCenters, { lgu: '', families: null, individuals: null, evacuationCenter: '', remarks: '' }]
    }));
  };

  const removeIdpCenter = (idx) => {
    setSitrep(prev => ({
      ...prev,
      idpCenters: prev.idpCenters.filter((_, i) => i !== idx)
    }));
  };

  const addHouseDamage = () => {
    setSitrep(prev => ({
      ...prev,
      houseDamage: [...prev.houseDamage, { location: '', totallyNo: null, totallyValue: null, partiallyNo: null, partiallyValue: null, totalValue: null }]
    }));
  };

  const removeHouseDamage = (idx) => {
    setSitrep(prev => ({
      ...prev,
      houseDamage: prev.houseDamage.filter((_, i) => i !== idx)
    }));
  };

  const addAgriculture = (type) => {
    setSitrep(prev => {
      if (type === 'livestock') {
        // Livestock has different field structure
        return {
          ...prev,
          agriculture: {
            ...prev.agriculture,
            [type]: [...prev.agriculture[type], { location: '', specie: '', numberOfHeads: null, amount: null }]
          }
        };
      }
      // Crops (rice, corn, hvcc) have the same field structure
      return {
        ...prev,
        agriculture: {
          ...prev.agriculture,
          [type]: [...prev.agriculture[type], { lgu: '', area: null, farmers: null, expectedProduction: null, estimatedCost: null }]
        }
      };
    });
  };

  const removeAgriculture = (type, idx) => {
    setSitrep(prev => ({
      ...prev,
      agriculture: {
        ...prev.agriculture,
        [type]: prev.agriculture[type].filter((_, i) => i !== idx)
      }
    }));
  };

  const updateTextFormat = (field, key, value) => {
    setTextFormat(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value
      }
    }));
  };

  const applyListFormat = (field, type) => {
    const textarea = textRefs.current[field];
    if (!textarea) return;

    const source = sitrep[field] || '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selected = source.slice(start, end) || source;
    const lines = selected.split('\n');

    const formatted = lines.map((line, idx) => {
      const clean = line.replace(/^\s*(?:[-*]|\d+\.)\s*/, '');
      if (type === 'bullet') return clean ? `• ${clean}` : '• ';
      return clean ? `${idx + 1}. ${clean}` : `${idx + 1}. `;
    }).join('\n');

    let nextValue = source;
    if (start === end) {
      nextValue = formatted;
    } else {
      nextValue = `${source.slice(0, start)}${formatted}${source.slice(end)}`;
    }

    setSitrep(prev => ({ ...prev, [field]: nextValue }));
  };

  const renderTextToolbar = (field) => (
    <div className="flex flex-wrap items-center gap-2 mb-2 p-2 border border-slate-200 rounded bg-slate-50">
      <select
        value={textFormat[field].fontFamily}
        onChange={(e) => updateTextFormat(field, 'fontFamily', e.target.value)}
        className="px-2 py-1 border border-slate-300 rounded text-xs"
      >
        <option value="Arial Narrow">Arial Narrow</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Calibri">Calibri</option>
      </select>

      <select
        value={textFormat[field].fontSize}
        onChange={(e) => updateTextFormat(field, 'fontSize', Number(e.target.value))}
        className="px-2 py-1 border border-slate-300 rounded text-xs w-16"
      >
        <option value={10}>10</option>
        <option value={11}>11</option>
        <option value={12}>12</option>
        <option value={14}>14</option>
        <option value={16}>16</option>
      </select>

      <button type="button" onClick={() => updateTextFormat(field, 'textAlign', 'left')} className="px-2 py-1 border border-slate-300 rounded text-xs">Left</button>
      <button type="button" onClick={() => updateTextFormat(field, 'textAlign', 'center')} className="px-2 py-1 border border-slate-300 rounded text-xs">Center</button>
      <button type="button" onClick={() => updateTextFormat(field, 'textAlign', 'right')} className="px-2 py-1 border border-slate-300 rounded text-xs">Right</button>

      <button type="button" onClick={() => applyListFormat(field, 'bullet')} className="px-2 py-1 border border-slate-300 rounded text-xs">Bullet</button>
      <button type="button" onClick={() => applyListFormat(field, 'number')} className="px-2 py-1 border border-slate-300 rounded text-xs">Number</button>
    </div>
  );

  // Determine which tabs to show based on template
  const getTabs = () => {
    const baseTabs = [
      { id: 'situation', label: 'I. Situation Overview' },
      { id: 'population', label: 'II.a. Affected Population' },
      { id: 'idp', label: 'II.b. IDP Center Profile' },
      { id: 'lifelines', label: 'II.c. Lifelines' },
      { id: 'houses', label: 'II.d. Damage to Houses' },
      { id: 'agriculture', label: 'II.e. Agriculture' },
      { id: 'admin', label: 'II.f. Admin Actions' },
      { id: 'actions', label: 'III. Actions Taken' }
    ];
    return baseTabs;
  };

  const tabs = getTabs();

  return (
    <>
      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 space-y-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto ${
              toast.type === 'success' ? 'bg-green-100 border border-green-300 text-green-800' :
              toast.type === 'error' ? 'bg-red-100 border border-red-300 text-red-800' :
              toast.type === 'warning' ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' :
              'bg-blue-100 border border-blue-300 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'warning' && <AlertCircle size={18} className="flex-shrink-0" />}
            {toast.type === 'info' && <Clock size={18} className="flex-shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 text-[12px]" style={{ fontFamily: '"Arial Narrow", Arial, sans-serif' }}>
        <style>{`
          input[type='number']::-webkit-outer-spin-button,
          input[type='number']::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          input[type='number'] {
            -moz-appearance: textfield;
            appearance: textfield;
          }
        `}</style>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-900">📋 SITREP FORM</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
          status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700'
        }`}>
          {status}
        </span>
      </div>

      <p className="text-xs text-slate-500 mb-6">Fill form below and click "Export as Word" to generate and download your report.</p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-600">Loading SITREP...</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {/* I. Situation Overview */}
            {activeTab === 'situation' && (
              <div className="space-y-4">
                {renderTextToolbar('situationOverview')}
                <textarea
                  ref={(el) => { textRefs.current.situationOverview = el; }}
                  value={sitrep.situationOverview}
                  onChange={(e) => setSitrep(prev => ({ ...prev, situationOverview: e.target.value }))}
                  placeholder="Describe the current disaster situation, weather, and conditions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    fontFamily: textFormat.situationOverview.fontFamily,
                    fontSize: `${textFormat.situationOverview.fontSize}px`,
                    textAlign: textFormat.situationOverview.textAlign
                  }}
                  rows="6"
                />
              </div>
            )}

            {/* II.a. Affected Population */}
            {activeTab === 'population' && (
              <div className="space-y-4">
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-blue-200">
                      <th className="border border-slate-300 p-2 text-left">Location</th>
                      <th className="border border-slate-300 p-2 text-left">Families</th>
                      <th className="border border-slate-300 p-2 text-left">Persons</th>
                      <th className="border border-slate-300 p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitrep.affectedPopulation.map((pop, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2">
                          <input
                            type="text"
                            value={pop.location}
                            onChange={(e) => {
                              const updated = [...sitrep.affectedPopulation];
                              updated[idx].location = e.target.value;
                              setSitrep(prev => ({ ...prev, affectedPopulation: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="border border-slate-300 p-2">
                          <input
                            type="number"
                            value={pop.families}
                            onChange={(e) => {
                              const updated = [...sitrep.affectedPopulation];
                              updated[idx].families = parseInt(e.target.value) || 0;
                              setSitrep(prev => ({ ...prev, affectedPopulation: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="border border-slate-300 p-2">
                          <input
                            type="number"
                            value={pop.persons}
                            onChange={(e) => {
                              const updated = [...sitrep.affectedPopulation];
                              updated[idx].persons = parseInt(e.target.value) || 0;
                              setSitrep(prev => ({ ...prev, affectedPopulation: updated }));
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <button
                            onClick={() => removePopulation(idx)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addPopulation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>
            )}

            {/* II.b. IDP Center Profile */}
            {activeTab === 'idp' && (
              <div className="space-y-4">
                <table className="w-full border-collapse border border-slate-300 text-sm">
                  <thead>
                    <tr className="bg-yellow-200">
                      <th className="border border-slate-300 p-2 text-left">LGU</th>
                      <th className="border border-slate-300 p-2 text-left">Families</th>
                      <th className="border border-slate-300 p-2 text-left">Individuals</th>
                      <th className="border border-slate-300 p-2 text-left">Evacuation Center</th>
                      <th className="border border-slate-300 p-2 text-left">Remarks</th>
                      <th className="border border-slate-300 p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitrep.idpCenters.map((center, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2"><input type="text" value={center.lgu} onChange={(e) => { const updated = [...sitrep.idpCenters]; updated[idx].lgu = e.target.value; setSitrep(prev => ({ ...prev, idpCenters: updated })); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                        <td className="border border-slate-300 p-2"><input type="number" value={center.families} onChange={(e) => { const updated = [...sitrep.idpCenters]; updated[idx].families = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, idpCenters: updated })); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                        <td className="border border-slate-300 p-2"><input type="number" value={center.individuals} onChange={(e) => { const updated = [...sitrep.idpCenters]; updated[idx].individuals = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, idpCenters: updated })); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                        <td className="border border-slate-300 p-2"><input type="text" value={center.evacuationCenter} onChange={(e) => { const updated = [...sitrep.idpCenters]; updated[idx].evacuationCenter = e.target.value; setSitrep(prev => ({ ...prev, idpCenters: updated })); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                        <td className="border border-slate-300 p-2"><input type="text" value={center.remarks} onChange={(e) => { const updated = [...sitrep.idpCenters]; updated[idx].remarks = e.target.value; setSitrep(prev => ({ ...prev, idpCenters: updated })); }} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
                        <td className="border border-slate-300 p-2 text-center"><button onClick={() => removeIdpCenter(idx)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addIdpCenter} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add IDP Center</button>
              </div>
            )}

            {/* II.c. Lifelines */}
            {activeTab === 'lifelines' && (
              <div className="space-y-4">
                {['roadsAndBridges', 'electricity', 'waterSystem', 'communication'].map(lifeline => (
                      <div key={lifeline} className="border border-slate-300 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3 capitalize">{lifeline.replace(/([A-Z])/g, ' $1')}</h4>
                        <div className="space-y-3 text-sm">
                          <input
                            type="text"
                            placeholder="Affected Area"
                            value={sitrep.lifelines[lifeline].affectedArea}
                            onChange={(e) => setSitrep(prev => ({ ...prev, lifelines: { ...prev.lifelines, [lifeline]: { ...prev.lifelines[lifeline], affectedArea: e.target.value } } }))}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                          <select
                            value={sitrep.lifelines[lifeline].status}
                            onChange={(e) => setSitrep(prev => ({ ...prev, lifelines: { ...prev.lifelines, [lifeline]: { ...prev.lifelines[lifeline], status: e.target.value } } }))}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          >
                            <option value="">-- Select Status --</option>
                            <option value="Operational">Operational</option>
                            <option value="Partially Operational">Partially Operational</option>
                            <option value="Non-Operational">Non-Operational</option>
                            <option value="Accessible">Accessible</option>
                            <option value="Partially Accessible">Partially Accessible</option>
                            <option value="Inaccessible">Inaccessible</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Description of Damage"
                            value={sitrep.lifelines[lifeline].damageDescription}
                            onChange={(e) => setSitrep(prev => ({ ...prev, lifelines: { ...prev.lifelines, [lifeline]: { ...prev.lifelines[lifeline], damageDescription: e.target.value } } }))}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                          <input
                            type="text"
                            placeholder="Actions Taken"
                            value={sitrep.lifelines[lifeline].actionsTaken}
                            onChange={(e) => setSitrep(prev => ({ ...prev, lifelines: { ...prev.lifelines, [lifeline]: { ...prev.lifelines[lifeline], actionsTaken: e.target.value } } }))}
                            className="w-full px-2 py-1 border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                    ))}
              </div>
            )}

            {/* II.d. Damage to Houses */}
            {activeTab === 'houses' && (
              <div className="space-y-4">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-blue-200">
                        <th className="border border-slate-300 p-2">Location</th>
                        <th className="border border-slate-300 p-2">Totally (No)</th>
                        <th className="border border-slate-300 p-2">Totally (Value)</th>
                        <th className="border border-slate-300 p-2">Partially (No)</th>
                        <th className="border border-slate-300 p-2">Partially (Value)</th>
                        <th className="border border-slate-300 p-2">Total Value</th>
                        <th className="border border-slate-300 p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sitrep.houseDamage.map((house, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2"><input type="text" value={house.location} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].location = e.target.value; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2"><input type="number" value={house.totallyNo} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].totallyNo = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2"><input type="number" value={house.totallyValue} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].totallyValue = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2"><input type="number" value={house.partiallyNo} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].partiallyNo = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2"><input type="number" value={house.partiallyValue} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].partiallyValue = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2"><input type="number" value={house.totalValue} onChange={(e) => { const updated = [...sitrep.houseDamage]; updated[idx].totalValue = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, houseDamage: updated })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                          <td className="border border-slate-300 p-2 text-center"><button onClick={() => removeHouseDamage(idx)} className="text-red-600"><Trash2 className="w-3 h-3" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                <button onClick={addHouseDamage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Row</button>
              </div>
            )}

            {/* II.e. Agriculture */}
            {activeTab === 'agriculture' && (
              <div className="space-y-6">
                {/* SITREP2 - Detailed agriculture with separate sections */}
                    {['rice', 'corn', 'hvcc'].map(cropType => (
                      <div key={cropType}>
                        <h4 className="font-semibold mb-2 capitalize">{cropType === 'hvcc' ? 'HVCC (Fruit, Vegetables, etc)' : cropType.toUpperCase()}</h4>
                        <table className="w-full border-collapse border border-slate-300 text-xs mb-3">
                          <thead>
                            <tr className="bg-blue-100">
                              <th className="border border-slate-300 p-2">LGU</th>
                              <th className="border border-slate-300 p-2">Area (has)</th>
                              <th className="border border-slate-300 p-2">Farmers Affected</th>
                              <th className="border border-slate-300 p-2">Expected Production</th>
                              <th className="border border-slate-300 p-2">Estimated Cost</th>
                              <th className="border border-slate-300 p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sitrep.agriculture[cropType].map((crop, idx) => (
                              <tr key={idx}>
                                <td className="border border-slate-300 p-2"><input type="text" value={crop.lgu} onChange={(e) => { const updated = [...sitrep.agriculture[cropType]]; updated[idx].lgu = e.target.value; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, [cropType]: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                                <td className="border border-slate-300 p-2"><input type="number" value={crop.area} onChange={(e) => { const updated = [...sitrep.agriculture[cropType]]; updated[idx].area = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, [cropType]: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                                <td className="border border-slate-300 p-2"><input type="number" value={crop.farmers} onChange={(e) => { const updated = [...sitrep.agriculture[cropType]]; updated[idx].farmers = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, [cropType]: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                                <td className="border border-slate-300 p-2"><input type="number" value={crop.expectedProduction} onChange={(e) => { const updated = [...sitrep.agriculture[cropType]]; updated[idx].expectedProduction = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, [cropType]: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                                <td className="border border-slate-300 p-2"><input type="number" value={crop.estimatedCost} onChange={(e) => { const updated = [...sitrep.agriculture[cropType]]; updated[idx].estimatedCost = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, [cropType]: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                                <td className="border border-slate-300 p-2 text-center"><button onClick={() => removeAgriculture(cropType, idx)} className="text-red-600"><Trash2 className="w-3 h-3" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button onClick={() => addAgriculture(cropType)} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 inline-flex items-center gap-1 mb-3"><Plus className="w-3 h-3" /> Add</button>
                      </div>
                    ))}
                    
                    {/* Livestock section */}
                    <div>
                      <h4 className="font-semibold mb-2">1.2 LIVESTOCK</h4>
                      <table className="w-full border-collapse border border-slate-300 text-xs">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="border border-slate-300 p-2">Location</th>
                            <th className="border border-slate-300 p-2">Specie</th>
                            <th className="border border-slate-300 p-2">No. of Heads</th>
                            <th className="border border-slate-300 p-2">Amount</th>
                            <th className="border border-slate-300 p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sitrep.agriculture.livestock.map((item, idx) => (
                            <tr key={idx}>
                              <td className="border border-slate-300 p-2"><input type="text" value={item.location} onChange={(e) => { const updated = [...sitrep.agriculture.livestock]; updated[idx].location = e.target.value; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, livestock: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                              <td className="border border-slate-300 p-2"><input type="text" value={item.specie} onChange={(e) => { const updated = [...sitrep.agriculture.livestock]; updated[idx].specie = e.target.value; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, livestock: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" placeholder="e.g. Carabao" /></td>
                              <td className="border border-slate-300 p-2"><input type="number" value={item.numberOfHeads} onChange={(e) => { const updated = [...sitrep.agriculture.livestock]; updated[idx].numberOfHeads = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, livestock: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                              <td className="border border-slate-300 p-2"><input type="number" value={item.amount} onChange={(e) => { const updated = [...sitrep.agriculture.livestock]; updated[idx].amount = parseInt(e.target.value) || 0; setSitrep(prev => ({ ...prev, agriculture: { ...prev.agriculture, livestock: updated } })); }} className="w-full px-1 py-0.5 border border-slate-300 rounded" /></td>
                              <td className="border border-slate-300 p-2 text-center"><button onClick={() => removeAgriculture('livestock', idx)} className="text-red-600"><Trash2 className="w-3 h-3" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button onClick={() => addAgriculture('livestock')} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 inline-flex items-center gap-1 mt-2"><Plus className="w-3 h-3" /> Add Livestock</button>
                    </div>
              </div>
            )}

            {/* II.f. Administrative Actions */}
            {activeTab === 'admin' && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sitrep.administrativeActions.suspensionOfClasses}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, suspensionOfClasses: e.target.checked } }))}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">Suspension of Classes</span>
                </label>
                {sitrep.administrativeActions.suspensionOfClasses && (
                  <textarea
                    value={sitrep.administrativeActions.suspensionOfClassesDetails || ''}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, suspensionOfClassesDetails: e.target.value } }))}
                    placeholder="Details for Suspension of Classes"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows="2"
                  />
                )}
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sitrep.administrativeActions.suspensionOfWork}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, suspensionOfWork: e.target.checked } }))}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">Suspension of Work in all Government Office</span>
                </label>
                {sitrep.administrativeActions.suspensionOfWork && (
                  <textarea
                    value={sitrep.administrativeActions.suspensionOfWorkDetails || ''}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, suspensionOfWorkDetails: e.target.value } }))}
                    placeholder="Details for Suspension of Work"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows="2"
                  />
                )}
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sitrep.administrativeActions.declarationOfCalamity}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, declarationOfCalamity: e.target.checked } }))}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">Declaration of State of Calamity</span>
                </label>
                {sitrep.administrativeActions.declarationOfCalamity && (
                  <textarea
                    value={sitrep.administrativeActions.declarationOfCalamityDetails || ''}
                    onChange={(e) => setSitrep(prev => ({ ...prev, administrativeActions: { ...prev.administrativeActions, declarationOfCalamityDetails: e.target.value } }))}
                    placeholder="Details for Declaration of State of Calamity"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows="2"
                  />
                )}
              </div>
            )}

            {/* III. Actions Taken */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                {renderTextToolbar('actionsTaken')}
                <textarea
                  ref={(el) => { textRefs.current.actionsTaken = el; }}
                  value={sitrep.actionsTaken}
                  onChange={(e) => setSitrep(prev => ({ ...prev, actionsTaken: e.target.value }))}
                  placeholder="List the actions taken by LGU Malaybalay..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    fontFamily: textFormat.actionsTaken.fontFamily,
                    fontSize: `${textFormat.actionsTaken.fontSize}px`,
                    textAlign: textFormat.actionsTaken.textAlign
                  }}
                  rows="6"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 border-t border-slate-200 pt-4">
            <button
              onClick={handleExportWord}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Download className="w-4 h-4" />}
              📥 Export as Word
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || status === 'Approved'}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
              Save as Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || status === 'Submitted' || status === 'Approved'}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
              Submit for Approval
            </button>
          </div>
        </>
      )}
      </div>
    </>
  );
};

export default SitrepForm;
