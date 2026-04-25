
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
  QuestionnaireResponses = await global.Collections.QuestionnaireResponses;

  if(Meteor.isServer){
    Observations = Meteor.Collections.Observations;
    FhirUtilities = Meteor.FhirUtilities;
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
    if(get(Meteor, 'settings.private.autoPublishResources')){
      Meteor.publish('Observations', function(patientId){
        let observationsQuery = FhirUtilities.addPatientFilterToQuery(patientId);
        process.env.TRACE && console.log('genome-central-redux: Observations.observationsQuery', observationsQuery);
        return Observations.find(observationsQuery);
      });
    }
  }

  QuestionnaireResponses.allow({
    insert: function(userId, doc){
      return true;
    }
  });
})



