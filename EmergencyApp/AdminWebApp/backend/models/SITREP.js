// models/SITREP.js
const mongoose = require('mongoose');

const sitrepSchema = new mongoose.Schema({
  reportId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Report',
    required: true,
    unique: true
  },
  
  // HEADER INFORMATION
  sitrepNumber: { type: Number, default: 1 },
  dateTime: { type: Date, default: Date.now },
  directedTo: { type: String, default: 'DIR. ANTONIO B. SUGAROL, RDRRMC Chairperson/OCD 10' },
  ccList: { type: String, default: 'CITY MAYORS OFFICE, PDRRMD BUKIDNON, CHO, CSWD, DILG, DOH10' },
  subject: { type: String },
  
  // SITUATION OVERVIEW
  situationOverview: { type: String },
  floodedBarangays: [{ type: String }],
  
  // AFFECTED POPULATION
  affectedPopulation: [{
    location: { type: String },
    families: { type: Number, default: 0 },
    persons: { type: Number, default: 0 }
  }],
  
  // IDP CENTERS
  idpCenters: [{
    lgu: { type: String },
    families: { type: Number, default: 0 },
    individuals: { type: Number, default: 0 },
    evacuationCenter: { type: String },
    remarks: { type: String }
  }],
  
  // LIFELINES (SITREP2 detailed format)
  lifelines: {
    roadsAndBridges: {
      affectedArea: { type: String, default: '' },
      status: { type: String, default: '' },
      damageDescription: { type: String, default: '' },
      actionsTaken: { type: String, default: '' }
    },
    electricity: {
      affectedArea: { type: String, default: '' },
      status: { type: String, default: '' },
      damageDescription: { type: String, default: '' },
      actionsTaken: { type: String, default: '' }
    },
    waterSystem: {
      affectedArea: { type: String, default: '' },
      status: { type: String, default: '' },
      damageDescription: { type: String, default: '' },
      actionsTaken: { type: String, default: '' }
    },
    communication: {
      affectedArea: { type: String, default: '' },
      status: { type: String, default: '' },
      damageDescription: { type: String, default: '' },
      actionsTaken: { type: String, default: '' }
    }
  },
  
  // DAMAGE TO HOUSES
  houseDamage: [{
    location: { type: String },
    totallyNo: { type: Number, default: 0 },
    totallyValue: { type: Number, default: 0 }, // PHP
    partiallyNo: { type: Number, default: 0 },
    partiallyValue: { type: Number, default: 0 }, // PHP
    totalValue: { type: Number, default: 0 } // PHP
  }],
  
  // AGRICULTURE
  agriculture: {
    rice: [{
      lgu: { type: String },
      area: { type: Number, default: 0 }, // hectares
      farmers: { type: Number, default: 0 },
      expectedProduction: { type: Number, default: 0 }, // MT
      estimatedCost: { type: Number, default: 0 } // PHP
    }],
    corn: [{
      lgu: { type: String },
      area: { type: Number, default: 0 }, // hectares
      farmers: { type: Number, default: 0 },
      expectedProduction: { type: Number, default: 0 }, // MT
      estimatedCost: { type: Number, default: 0 } // PHP
    }],
    hvcc: [{
      lgu: { type: String },
      area: { type: Number, default: 0 }, // hectares
      farmers: { type: Number, default: 0 },
      expectedProduction: { type: Number, default: 0 }, // MT
      estimatedCost: { type: Number, default: 0 } // PHP
    }],
    livestock: [{
      location: { type: String },
      specie: { type: String },
      numberOfHeads: { type: Number, default: 0 },
      amount: { type: Number, default: 0 } // PHP
    }]
  },
  
  // ADMINISTRATIVE ACTIONS
  administrativeActions: {
    suspensionOfClasses: { type: Boolean, default: false },
    suspensionOfClassesDetails: { type: String, default: '' },
    suspensionOfWork: { type: Boolean, default: false },
    suspensionOfWorkDetails: { type: String, default: '' },
    declarationOfCalamity: { type: Boolean, default: false },
    declarationOfCalamityDetails: { type: String, default: '' }
  },
  
  // ACTIONS TAKEN
  actionsTaken: { type: String }, // Free text description
  
  // SIGN-OFF
  preparedBy: {
    name: { type: String },
    position: { type: String },
    agency: { type: String, default: 'CDRRMO Malaybalay' }
  },
  recommendingApproval: {
    name: { type: String },
    position: { type: String },
    agency: { type: String, default: 'CDRRMO Malaybalay' }
  },
  approvedBy: {
    name: { type: String },
    position: { type: String },
    agency: { type: String, default: 'CDRRMO Malaybalay' }
  },
  
  // TEMPLATE TYPE
  templateType: {
    type: String,
    enum: ['SITREP1', 'SITREP2'],
    default: 'SITREP1'
  },
  
  // STATUS
  status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Archived'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('SITREP', sitrepSchema);
