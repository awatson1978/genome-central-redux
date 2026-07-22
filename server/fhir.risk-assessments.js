// packages/genome-central-redux/server/fhir.risk-assessments.js

import { get } from 'lodash';

// rpc-migration: These methods historically had NO this.userId guard (they gate
// on NODE_ENV/INITIALIZE env vars instead). Migrating to ServerMethods.define
// applies the registry default requireAuth:true, which is a BEHAVIOR CHANGE:
// callers must now be authenticated. Documented in the migration report.

Meteor.ServerMethods.define('riskAssessments.create', {
  description: 'Insert a RiskAssessment resource (test environment only).',
  aliases: ['createRiskAssessment'],
  requireAuth: true,
  phi: true,
  positionalParams: ['deviceObject'],
  schemaObject: {
    type: 'object',
    properties: {
      deviceObject: { type: 'object' }
    },
    required: ['deviceObject']
  }
}, async function(params, context){
  const deviceObject = get(params, 'deviceObject');

  if (process.env.NODE_ENV === 'test') {
    console.log('Creating RiskAssessment...');
    try {
      const result = await RiskAssessments.insertAsync(deviceObject);
      console.log('RiskAssessment created: ' + result);
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log('This command can only be run in a test environment.');
    console.log('Try setting NODE_ENV=test');
  }
});

Meteor.ServerMethods.define('riskAssessments.initialize', {
  description: 'Seed the RiskAssessments collection with default examples when empty.',
  aliases: ['initializeRiskAssessment'],
  requireAuth: true,
  phi: true
}, async function(params, context){

  if (process.env.INITIALIZE) {

    if (await RiskAssessments.find().countAsync() === 0) {
      console.log('No records found in RiskAssessments collection.  Lets create some...');

      var defaultRiskAssessment = {
        resourceType: "RiskAssessment",
        subject: {
          display: "",
          reference: ""
        },
        text: "",
        date: null,
        "condition": {
          "reference": "",
          "display": ""
        },
        encounter: {},
        performer: {
          display: "",
          reference: ""
        },
        basis:[{
          display: "",
          reference: ""
        }],
        prediction: [{
          title: "",
          outcome: {
            text: ""
          },
          probabilityDecimal: 0,
          rational: ""
        }],
        mitigation: ""
      };

      Meteor.call('createRiskAssessment', defaultRiskAssessment);

      var canonicalExample = {
        resourceType: "RiskAssessment",
        subject: {
          display: "Jane Doe",
          reference: "12345"
        },
        text: "Moderate risk of multiple sclerosis.",
        date: new Date(),
        "condition": {
          "reference": "Condition/MultipleSclerosis",
          "display": "Multiple Sclerosis"
        },
        encounter: {},
        performer: {
          display: "Florence Nightingale",
          reference: "55555"
        },
        basis:[
          {
            display: "First Sclerosis",
            reference: "Observations/sclerosis-1"
          },
          {
            display: "Second Sclerosis",
            reference: "Observations/sclerosis-2"
          },
          {
            display: "Demylinization Risk Factor",
            reference: "Observations/mylinization-risk-factor"
          }
        ],
        prediction: [{
          title: "5 Year Risk",
          outcome: {
            text: "Multiple sclerosis"
          },
          probabilityDecimal: 0.0215,
          whenRange: {
            "low": {
              "value": 0,
              "unit": "years",
              "system": "http://unitsofmeasure.org",
              "code": "a"
            },
            "high": {
              "value": 10,
              "unit": "years",
              "system": "http://unitsofmeasure.org",
              "code": "a"
            }
          },
          rational: "This is the 5 year risk value for developing multiple sclerotic legions."
        }],
        mitigation: ""
      };
      Meteor.call('createRiskAssessment', canonicalExample);

    } else {
      console.log('RiskAssessments already exist.  Skipping.');
    }
  }
});

Meteor.ServerMethods.define('riskAssessments.dropAll', {
  description: 'Remove all RiskAssessment records (test environment only).',
  aliases: ['dropRiskAssessments'],
  requireAuth: true,
  phi: true
}, async function(params, context){
  if (process.env.NODE_ENV === 'test') {
    console.log('-----------------------------------------');
    console.log('Dropping devices... ');
    const assessments = await RiskAssessments.find().fetchAsync();
    for (const assessment of assessments) {
      await RiskAssessments.removeAsync({_id: assessment._id});
    }
  } else {
    console.log('This command can only be run in a test environment.');
    console.log('Try setting NODE_ENV=test');
  }
});
