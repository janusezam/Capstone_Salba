import { jsPDF } from 'jspdf';

export const generateIncidentReportPDF = (reports, filterType = 'all') => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Get date range based on filter
  const now = new Date();
  const dateRange = getDateRange(filterType);
  
  // Filter reports by date
  const filteredReports = reports.filter(r => {
    const reportDate = new Date(r.createdAt);
    return reportDate >= dateRange.start && reportDate <= dateRange.end;
  });

  // Header
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Title and Date Info
  doc.setFontSize(18);
  doc.setTextColor(200, 16, 46); // Red color
  doc.text('Incident Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Report Type: ${getFilterLabel(filterType)}`, 15, 30);
  doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 15, 36);
  doc.text(`Period: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`, 15, 42);
  doc.text(`Total Incidents: ${filteredReports.length}`, 15, 48);

  // Summary Statistics
  const critical = filteredReports.filter(r => r.severity === 'critical').length;
  const high = filteredReports.filter(r => r.severity === 'high').length;
  const moderate = filteredReports.filter(r => r.severity === 'moderate').length;
  const low = filteredReports.filter(r => r.severity === 'low').length;
  
  const resolved = filteredReports.filter(r => r.status === 'Resolved' || r.status === 'resolved').length;
  const ongoing = filteredReports.filter(r => r.status === 'Ongoing' || r.status === 'in_progress').length;
  const pending = filteredReports.filter(r => r.status === 'Pending').length;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Summary Statistics', 15, 56);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const summaryY = 62;
  doc.setTextColor(153, 27, 27); // Red
  doc.text(`Critical: ${critical}`, 15, summaryY);
  doc.setTextColor(217, 119, 6); // Orange
  doc.text(`High: ${high}`, 50, summaryY);
  doc.setTextColor(202, 138, 4); // Yellow
  doc.text(`Moderate: ${moderate}`, 85, summaryY);
  doc.setTextColor(34, 197, 94); // Green
  doc.text(`Low: ${low}`, 125, summaryY);
  
  doc.setTextColor(34, 197, 94); // Green
  doc.text(`Resolved: ${resolved}`, 160, summaryY);
  doc.setTextColor(234, 179, 8); // Amber
  doc.text(`Ongoing: ${ongoing}`, 200, summaryY);
  doc.setTextColor(99, 102, 241); // Indigo
  doc.text(`Pending: ${pending}`, 240, summaryY);

  // Table
  const tableColumns = [
    { header: 'Reporter', dataKey: 'reporter', width: 25 },
    { header: 'Contact', dataKey: 'contact', width: 30 },
    { header: 'Type', dataKey: 'type', width: 25 },
    { header: 'Severity', dataKey: 'severity', width: 20 },
    { header: 'Status', dataKey: 'status', width: 20 },
    { header: 'Date & Time', dataKey: 'datetime', width: 40 },
    { header: 'Location', dataKey: 'location', width: 35 },
    { header: 'Description', dataKey: 'description', width: 50 }
  ];

  const tableRows = filteredReports.map(r => ({
    reporter: `${r.userId?.name || r.sender_name || 'N/A'}`,
    contact: `${r.userId?.email || r.contact_info || 'N/A'}`,
    type: `${r.incidentType || 'Unknown'}`,
    severity: `${(r.severity || 'Low').toUpperCase()}`,
    status: `${r.status || 'Pending'}`,
    datetime: new Date(r.createdAt).toLocaleString(),
    location: `${r.location?.name || r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4) || 'N/A'}`,
    description: `${(r.description || 'N/A').substring(0, 50)}...`
  }));

  // Draw table data manually
  let yPosition = 75;
  const columnPositions = [10, 40, 75, 105, 130, 155, 200, 240];
  const columnWidths = [30, 35, 30, 25, 25, 45, 40, 55];
  
  // Draw header
  doc.setFillColor(200, 16, 46);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  
  const headers = ['Reporter', 'Contact', 'Type', 'Severity', 'Status', 'Date & Time', 'Location', 'Description'];
  headers.forEach((header, index) => {
    doc.text(header, columnPositions[index], yPosition, { maxWidth: columnWidths[index] - 2 });
  });
  
  yPosition += 8;
  
  // Draw rows
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  
  tableRows.forEach((row, rowIndex) => {
    // Alternate row background
    if (rowIndex % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, yPosition - 5, pageWidth - 20, 6, 'F');
    }
    
    const rowData = [row.reporter, row.contact, row.type, row.severity, row.status, row.datetime, row.location, row.description];
    
    let maxHeight = 0;
    rowData.forEach((data, colIndex) => {
      const splitText = doc.splitTextToSize(data, columnWidths[colIndex] - 2);
      const textHeight = splitText.length * 3;
      maxHeight = Math.max(maxHeight, textHeight);
    });
    
    maxHeight = Math.max(maxHeight, 6);
    
    rowData.forEach((data, colIndex) => {
      const splitText = doc.splitTextToSize(data, columnWidths[colIndex] - 2);
      doc.text(splitText, columnPositions[colIndex], yPosition, { maxWidth: columnWidths[colIndex] - 2 });
    });
    
    yPosition += maxHeight + 2;
    
    // Add new page if needed
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      
      // Redraw header on new page
      doc.setFillColor(200, 16, 46);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      headers.forEach((header, index) => {
        doc.text(header, columnPositions[index], yPosition, { maxWidth: columnWidths[index] - 2 });
      });
      yPosition += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    'SALBA Emergency Response System - Confidential',
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  // Generate filename
  const filename = `SALBA_Incident_Report_${filterType}_${now.getTime()}.pdf`;
  
  // Download PDF
  doc.save(filename);
};

const getDateRange = (filterType) => {
  const now = new Date();
  const start = new Date();
  
  switch(filterType) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    
    case 'year':
      start.setFullYear(now.getFullYear());
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    
    default: // all
      return { start: new Date(0), end: now };
  }
};

const getFilterLabel = (filterType) => {
  switch(filterType) {
    case 'today': return 'Today';
    case 'week': return 'This Week';
    case 'month': return 'This Month';
    case 'quarter': return 'This Quarter';
    case 'year': return 'This Year';
    default: return 'All Time';
  }
};

export const generateSingleReportPDF = (report, aiVerification = null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(200, 16, 46);
  doc.text('Incident Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Report ID and Date
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Report ID: ${report._id}`, 15, yPosition);
  yPosition += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, yPosition);
  yPosition += 6;
  doc.text(`Incident Date: ${new Date(report.createdAt).toLocaleDateString()} ${new Date(report.createdAt).toLocaleTimeString()}`, 15, yPosition);
  yPosition += 10;

  // Reporter Information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(200, 16, 46);
  doc.text('Reporter Information', 15, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Name: ${report.userId?.name || report.sender_name || 'N/A'}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Email: ${report.userId?.email || report.contact_info || 'N/A'}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Contact: ${report.userId?.phone || 'N/A'}`, 15, yPosition);
  yPosition += 10;

  // Incident Details
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(200, 16, 46);
  doc.text('Incident Details', 15, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Type: ${report.incidentType || 'Unknown'}`, 15, yPosition);
  yPosition += 5;
  
  doc.setTextColor(report.severity === 'critical' ? [200, 16, 46] : report.severity === 'high' ? [217, 119, 6] : [34, 197, 94]);
  doc.text(`Severity: ${(report.severity || 'Low').toUpperCase()}`, 15, yPosition);
  yPosition += 5;
  
  doc.setTextColor(0, 0, 0);
  doc.text(`Status: ${report.status || 'Pending'}`, 15, yPosition);
  yPosition += 8;

  // Location Information
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(200, 16, 46);
  doc.text('Location Information', 15, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Location: ${report.location?.name || 'N/A'}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Latitude: ${report.latitude?.toFixed(4) || 'N/A'}`, 15, yPosition);
  yPosition += 5;
  doc.text(`Longitude: ${report.longitude?.toFixed(4) || 'N/A'}`, 15, yPosition);
  yPosition += 8;

  // Description
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(200, 16, 46);
  doc.text('Description', 15, yPosition);
  yPosition += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const descriptionLines = doc.splitTextToSize(report.description || 'No description provided', 180);
  yPosition = doc.text(descriptionLines, 15, yPosition).lastAutoTable?.finalY || yPosition;
  yPosition += 8;

  // AI Verification Information
  if (aiVerification) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(200, 16, 46);
    doc.text('AI Verification Results', 15, yPosition);
    yPosition += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Legitimacy: ${aiVerification.isLegitimate ? 'Legitimate' : 'Suspicious'}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Confidence: ${Math.round(aiVerification.confidence * 100)}%`, 15, yPosition);
    yPosition += 5;
    doc.text(`Severity Assessment: ${aiVerification.severity || 'Unknown'}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Duplicate Risk: ${Math.round(aiVerification.duplicateRisk * 100)}%`, 15, yPosition);
    yPosition += 5;
    doc.text(`False Alarm Risk: ${Math.round(aiVerification.falseAlarmRisk * 100)}%`, 15, yPosition);
    yPosition += 5;
    if (aiVerification.isCritical) {
      doc.setTextColor(200, 16, 46);
      doc.setFont(undefined, 'bold');
      doc.text('Status: CRITICAL - IMMEDIATE ACTION REQUIRED', 15, yPosition);
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    'SALBA Emergency Response System - Confidential',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Generate filename
  const reporterName = (report.userId?.name || report.sender_name || 'Unknown').replace(/\s+/g, '_');
  const filename = `SALBA_Report_${reporterName}_${new Date(report.createdAt).getTime()}.pdf`;
  
  // Download PDF
  doc.save(filename);
};
