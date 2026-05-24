// routes/sitrepDocRoutes.js
const express = require('express');
const router = express.Router();
const SITREPDoc = require('../models/SITREPDoc');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

// Default SITREP1 documentation
const DEFAULT_SITREP1_DOC = `# SITREP1 - Standard Situation Report (Comprehensive Format)

## Overview
Standard disaster situation report for flood, landslide, and other hazard assessments.

## Required Sections

### 1. SITUATION OVERVIEW
Brief narrative describing:
- Current weather conditions
- Disaster development status
- Areas affected
- Ongoing threats

### 2. AFFECTED POPULATION
Organized by barangay with families and persons count

### 3. IDP CENTERS
Internal Displacement Person centers with capacity and status

### 4. CASUALTIES
- Dead
- Injured
- Missing

### 5. DAMAGE ASSESSMENT
- Houses destroyed/damaged
- Agricultural damage
- Infrastructure damage

### 6. LIFELINES STATUS
- Roads & Transportation
- Electricity Supply
- Water Supply
- Communication

### 7. ADMINISTRATIVE ACTIONS
- Suspension of Classes
- Suspension of Work
- Declaration of Calamity

### 8. ACTIONS TAKEN
Timeline of response actions taken

### 9. RELIEF ASSISTANCE
Items distributed to affected population`;

// Default SITREP2 documentation
const DEFAULT_SITREP2_DOC = `# SITREP2 - Detailed Lifelines Status Report

## Overview
Comprehensive infrastructure assessment for detailed lifeline status reporting.

## Infrastructure Categories

### 1. ROADS & TRANSPORTATION
- Status: Passable | Partially Passable | Impassable | No Report
- Detail specific damage, detours, and repair timelines

### 2. ELECTRICITY SUPPLY
- Status: Functional | Partially Functional | Non-Functional | No Report
- Report outage locations, affected facilities, restoration progress

### 3. WATER SUPPLY
- Status: Available | Limited | Unavailable | No Report
- Report supply locations, capacity levels, affected areas

### 4. COMMUNICATION SYSTEMS
- Status: Functional | Limited | Non-Functional | No Report
- Report coverage, equipment status, backup systems activated

## Documentation Tips
- Provide specific locations and affected areas
- Include timeline for repairs/restoration
- Note alternate routes or temporary solutions
- Report on backup systems or emergency measures`;

// GET /api/sitrep-docs/:templateType - Get documentation for a template type
router.get('/:templateType', authMiddleware, async (req, res) => {
  try {
    const { templateType } = req.params;
    
    if (!['SITREP1', 'SITREP2'].includes(templateType)) {
      return res.status(400).json({ message: 'Invalid template type' });
    }
    
    console.log('📖 [SITREP-DOC] Fetching documentation for:', templateType);
    
    let doc = await SITREPDoc.findOne({ templateType })
      .populate('lastEditedBy', 'name email');
    
    if (!doc) {
      console.log('ℹ️ [SITREP-DOC] No documentation found, creating default...');
      
      // Create default documentation
      const defaultContent = templateType === 'SITREP1' ? DEFAULT_SITREP1_DOC : DEFAULT_SITREP2_DOC;
      doc = new SITREPDoc({
        templateType,
        content: defaultContent
      });
      await doc.save();
      
      console.log('✓ [SITREP-DOC] Default documentation created');
    }
    
    res.json({
      success: true,
      doc
    });
  } catch (err) {
    console.error('❌ [SITREP-DOC] Error fetching documentation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/sitrep-docs/:templateType - Update documentation (admin only)
router.put('/:templateType', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { templateType } = req.params;
    const { content } = req.body;
    
    if (!['SITREP1', 'SITREP2'].includes(templateType)) {
      return res.status(400).json({ message: 'Invalid template type' });
    }
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Content cannot be empty' });
    }
    
    console.log('✏️ [SITREP-DOC] Updating documentation for:', templateType);
    
    let doc = await SITREPDoc.findOne({ templateType });
    
    if (!doc) {
      // Create new documentation
      doc = new SITREPDoc({
        templateType,
        content,
        lastEditedBy: req.user.id
      });
      console.log('✅ [SITREP-DOC] Created new documentation');
    } else {
      // Update existing
      doc.content = content;
      doc.lastEditedBy = req.user.id;
      console.log('✓ [SITREP-DOC] Updated existing documentation');
    }
    
    await doc.save();
    
    const populated = await doc.populate('lastEditedBy', 'name email');
    
    res.json({
      success: true,
      message: 'Documentation updated successfully',
      doc: populated
    });
  } catch (err) {
    console.error('❌ [SITREP-DOC] Error updating documentation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/sitrep-docs/init - Initialize default documentation for both templates
router.post('/init', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 [SITREP-DOC] Initializing default documentation');
    
    const templates = [
      { templateType: 'SITREP1', content: DEFAULT_SITREP1_DOC },
      { templateType: 'SITREP2', content: DEFAULT_SITREP2_DOC }
    ];
    
    const results = [];
    
    for (const template of templates) {
      let doc = await SITREPDoc.findOne({ templateType: template.templateType });
      
      if (!doc) {
        doc = new SITREPDoc({
          ...template,
          lastEditedBy: req.user.id
        });
        await doc.save();
        results.push({ templateType: template.templateType, status: 'created' });
        console.log(`✓ [SITREP-DOC] Created ${template.templateType}`);
      } else {
        results.push({ templateType: template.templateType, status: 'exists' });
        console.log(`ℹ️ [SITREP-DOC] ${template.templateType} already exists`);
      }
    }
    
    res.json({
      success: true,
      message: 'Documentation initialized',
      results
    });
  } catch (err) {
    console.error('❌ [SITREP-DOC] Error initializing documentation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
