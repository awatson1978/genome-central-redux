
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';

import moment from 'moment';
import { get } from 'lodash';


let Observations;
let FhirUtilities;
let QuestionnaireResponses;

Meteor.startup(async function(){
  // Defensive: this workflow's startup may run before the host app populates
  // global.Collections, so don't assume it exists (the Atmosphere load order
  // guaranteed it; the NPM workflow load order does not).
  QuestionnaireResponses = get(global, 'Collections.QuestionnaireResponses');

  if(Meteor.isServer){
    Observations = get(Meteor, 'Collections.Observations');
    FhirUtilities = get(Meteor, 'FhirUtilities');
  }

  if(Meteor.isClient){
    Tracker.autorun(function(){
      let selectedPatientId = Session.get('selectedPatientId');
      if(selectedPatientId){
        console.log('genome-central-redux: Observations cursor subscription', selectedPatientId);
        Meteor.subscribe('Observations', selectedPatientId);
      }
    });
  }

  if(Meteor.isServer){
    if(get(Meteor, 'settings.private.autoPublishResources') && Observations && FhirUtilities){
      Meteor.publish('Observations', function(patientId){
        let observationsQuery = FhirUtilities.addPatientFilterToQuery(patientId);
        process.env.TRACE && console.log('genome-central-redux: Observations.observationsQuery', observationsQuery);
        return Observations.find(observationsQuery);
      });
    }
  }

  if (QuestionnaireResponses && typeof QuestionnaireResponses.allow === 'function') {
    QuestionnaireResponses.allow({
      insert: function(userId, doc){
        return true;
      }
    });
  }
})



