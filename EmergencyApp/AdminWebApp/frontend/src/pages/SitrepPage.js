import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Save, Send, Download, Printer } from 'lucide-react';
import SitrepForm from '../components/SitrepForm';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const SitrepPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth token from localStorage for API calls
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/reports/${reportId}`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
        });
        const data = await response.json();
        
        if (data.report) {
          setReport(data.report);
        } else {
          setError('Report not found');
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Error loading report: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = async () => {
    try {
      // Fetch SITREP data
      const response = await fetch(`${API_BASE}/api/sitrep/${reportId}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
      const data = await response.json();
      
      if (data.sitrep) {
        // Create a simple HTML representation and convert to Word
        const html = generateSitrepHTML(data.sitrep, report);
        downloadAsWord(html, `SITREP_${reportId}.docx`);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting SITREP');
    }
  };

  const generateSitrepHTML = (sitrep, report) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>SITREP Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #1a1a1a; }
            h2 { color: #333; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; }
            .info-item { flex: 1; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>SITUATION REPORT (SITREP)</h1>
          
          <div class="header-info">
            <div class="info-item">
              <span class="label">Report ID:</span> ${report?._id || 'N/A'}
            </div>
            <div class="info-item">
              <span class="label">Date/Time:</span> ${new Date(sitrep.dateTime).toLocaleString()}
            </div>
            <div class="info-item">
              <span class="label">Status:</span> ${sitrep.status || 'Draft'}
            </div>
          </div>

          <h2>Situation Overview</h2>
          <p>${sitrep.situationOverview || 'No information provided'}</p>

          <h2>Affected Population</h2>
          <table>
            <tr>
              <th>Barangay</th>
              <th>Families</th>
              <th>Persons</th>
            </tr>
            ${sitrep.affectedPopulation?.map(pop => `
              <tr>
                <td>${pop.barangay}</td>
                <td>${pop.families}</td>
                <td>${pop.persons}</td>
              </tr>
            `).join('') || '<tr><td colspan="3">No data</td></tr>'}
          </table>

          <h2>Casualties</h2>
          <table>
            <tr>
              <th>Dead</th>
              <th>Injured</th>
              <th>Missing</th>
            </tr>
            <tr>
              <td>${sitrep.casualties?.dead || 0}</td>
              <td>${sitrep.casualties?.injured || 0}</td>
              <td>${sitrep.casualties?.missing || 0}</td>
            </tr>
          </table>

          <h2>Damage Assessment</h2>
          <table>
            <tr>
              <th>Category</th>
              <th>Details</th>
            </tr>
            <tr>
              <td>Houses</td>
              <td>${sitrep.damageAssessment?.houses || 'N/A'}</td>
            </tr>
            <tr>
              <td>Crops (hectares)</td>
              <td>${sitrep.damageAssessment?.crops || 'N/A'}</td>
            </tr>
            <tr>
              <td>Livestock</td>
              <td>${sitrep.damageAssessment?.livestock || 'N/A'}</td>
            </tr>
            <tr>
              <td>Infrastructure</td>
              <td>${sitrep.damageAssessment?.infrastructure || 'N/A'}</td>
            </tr>
          </table>

          <h2>Lifelines Status</h2>
          <table>
            <tr>
              <th>Lifeline</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
            <tr>
              <td>Roads</td>
              <td>${sitrep.lifelines?.roads?.status || 'No Report'}</td>
              <td>${sitrep.lifelines?.roads?.description || 'N/A'}</td>
            </tr>
            <tr>
              <td>Electricity</td>
              <td>${sitrep.lifelines?.electricity?.status || 'No Report'}</td>
              <td>${sitrep.lifelines?.electricity?.description || 'N/A'}</td>
            </tr>
            <tr>
              <td>Water</td>
              <td>${sitrep.lifelines?.water?.status || 'No Report'}</td>
              <td>${sitrep.lifelines?.water?.description || 'N/A'}</td>
            </tr>
            <tr>
              <td>Communication</td>
              <td>${sitrep.lifelines?.communication?.status || 'No Report'}</td>
              <td>${sitrep.lifelines?.communication?.description || 'N/A'}</td>
            </tr>
          </table>

          <h2>Relief Assistance</h2>
          <table>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
            </tr>
            <tr>
              <td>Food Packs</td>
              <td>${sitrep.reliefAssistance?.foodPacks || 0}</td>
            </tr>
            <tr>
              <td>Water Jugs</td>
              <td>${sitrep.reliefAssistance?.waterJugs || 0}</td>
            </tr>
            <tr>
              <td>Blankets</td>
              <td>${sitrep.reliefAssistance?.blankets || 0}</td>
            </tr>
            <tr>
              <td>Medicines</td>
              <td>${sitrep.reliefAssistance?.medicines || 'None'}</td>
            </tr>
          </table>
          ${sitrep.reliefAssistance?.remarks ? `<p><strong>Remarks:</strong> ${sitrep.reliefAssistance.remarks}</p>` : ''}

          <h2>Teams Deployed</h2>
          <table>
            <tr>
              <th>Team Name</th>
              <th>Members</th>
              <th>Deployment Time</th>
            </tr>
            ${sitrep.teamsDeployed?.map(team => `
              <tr>
                <td>${team.teamName}</td>
                <td>${team.numberOfMembers}</td>
                <td>${new Date(team.deploymentTime).toLocaleString()}</td>
              </tr>
            `).join('') || '<tr><td colspan="3">No teams deployed</td></tr>'}
          </table>

          <h2>Administrative Actions</h2>
          <ul>
            ${sitrep.administrativeActions?.suspensionOfClasses ? '<li>Suspension of Classes - YES</li>' : '<li>Suspension of Classes - NO</li>'}
            ${sitrep.administrativeActions?.suspensionOfWork ? '<li>Suspension of Work - YES</li>' : '<li>Suspension of Work - NO</li>'}
            ${sitrep.administrativeActions?.declarationOfCalamity ? '<li>Declaration of Calamity - YES</li>' : '<li>Declaration of Calamity - NO</li>'}
          </ul>

          <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
            <strong>Report Generated:</strong> ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;
  };

  const downloadAsWord = (html, filename) => {
    const wordHeader = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head><body>
    `;
    
    const wordFooter = `</body></html>`;
    const blob = new Blob([wordHeader + html + wordFooter], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 text-lg">Loading SITREP form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg border border-red-300 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SITREP Form</h1>
              <p className="text-sm text-slate-600 mt-1">Report ID: {reportId}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 print:hidden"
              title="Print this form"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExportWord}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 print:hidden"
              title="Export as Word document"
            >
              <Download className="w-4 h-4" />
              Export Word
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {report && <SitrepForm rescue={report} />}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .print\:hidden {
            display: none !important;
          }
          .bg-slate-50 {
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

export default SitrepPage;
