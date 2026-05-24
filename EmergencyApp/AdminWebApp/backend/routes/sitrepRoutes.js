// routes/sitrepRoutes.js
const express = require('express');
const router = express.Router();
const SITREP = require('../models/SITREP');
const Report = require('../models/Report');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { generateSitrepWord } = require('../utils/sitrepWordGenerator');

// Helper middleware for requiring admin
const requireAdminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// POST /api/sitrep - Create or update a SITREP
router.post('/', authMiddleware, requireAdminMiddleware, async (req, res) => {
  try {
    const { reportId, ...sitrepData } = req.body;
    
    if (!reportId) {
      return res.status(400).json({ message: 'reportId is required' });
    }
    
    // Verify report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Find or create SITREP
    let sitrep = await SITREP.findOne({ reportId });
    
    if (sitrep) {
      // Update existing
      sitrep = Object.assign(sitrep, sitrepData);
    } else {
      // Create new
      sitrep = new SITREP({
        reportId,
        ...sitrepData
      });
    }
    
    await sitrep.save();
    res.status(201).json({
      success: true,
      message: 'SITREP saved successfully',
      sitrep
    });
  } catch (err) {
    console.error('❌ [SITREP] Error saving SITREP:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/sitrep/:reportId - Get SITREP for a report
router.get('/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;

    const sitrep = await SITREP.findOne({ reportId });
    
    if (!sitrep) {
      return res.json({ 
        sitrep: null,
        template: getEmptySitrepTemplate()
      });
    }

    res.json({ sitrep });
  } catch (err) {
    console.error('❌ [SITREP] Error fetching SITREP:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/sitrep/:reportId/submit - Submit SITREP for approval
router.post('/:reportId/submit', authMiddleware, requireAdminMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;

    const sitrep = await SITREP.findOne({ reportId });
    
    if (!sitrep) {
      return res.status(404).json({ message: 'SITREP not found' });
    }
    
    sitrep.status = 'Submitted';
    await sitrep.save();
    
    res.json({
      success: true,
      message: 'SITREP submitted successfully',
      sitrep
    });
  } catch (err) {
    console.error('❌ [SITREP] Error submitting SITREP:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper function to get empty SITREP template
const getEmptySitrepTemplate = () => {
  return {
    affectedPopulation: [{ barangay: '', families: 0, persons: 0 }],
    idpCenters: [{ location: '', barangay: '', families: 0, individuals: 0, status: 'Open', remarks: '' }],
    casualties: { dead: 0, injured: 0, missing: 0 },
    damageAssessment: {
      houses: 'On-going assessment',
      crops: 'On-going assessment',
      livestock: 'On-going assessment',
      infrastructure: 'On-going assessment'
    },
    lifelines: {
      roads: { status: 'No Report', description: '' },
      electricity: { status: 'No Report', description: '' },
      water: { status: 'No Report', description: '' },
      communication: { status: 'No Report', description: '' }
    },
    administrativeActions: {
      suspensionOfClasses: false,
      suspensionOfClassesDetails: '',
      suspensionOfWork: false,
      suspensionOfWorkDetails: '',
      declarationOfCalamity: false,
      declarationOfCalamityDetails: ''
    },
    actionsTaken: [],
    reliefAssistance: {
      foodPacks: 0,
      waterJugs: 0,
      blankets: 0,
      medicines: 'None',
      remarks: ''
    },
    teamsDeployed: []
  };
};

// POST /api/sitrep/:reportId/export-word - Generate Word document from SITREP data
router.post('/:reportId/export-word', authMiddleware, requireAdminMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { templateType } = req.body;

    if (!templateType || !['SITREP1', 'SITREP2'].includes(templateType)) {
      return res.status(400).json({ message: 'Valid templateType (SITREP1 or SITREP2) is required' });
    }
    
    // Fetch SITREP data
    const sitrep = await SITREP.findOne({ reportId });
    
    if (!sitrep) {
      return res.status(404).json({ message: 'SITREP not found' });
    }
    
    // Generate Word document
    const wordBuffer = await generateSitrepWord(sitrep, templateType, reportId);
    
    // Send as file download
    const fileName = `SITREP_${reportId}_${new Date().toISOString().slice(0, 10)}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(wordBuffer);

    console.log('✓ [SITREP-WORD] Generated:', fileName);
  } catch (err) {
    console.error('❌ [SITREP-WORD] Error generating Word:', err.message);
    res.status(500).json({ message: 'Error generating Word document', error: err.message });
  }
});

module.exports = router;
