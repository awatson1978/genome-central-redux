
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import moment from 'moment';
import { get } from 'lodash';



let QuestionnaireResponses;
Meteor.startup(async function(){
  QuestionnaireResponses = await global.Collections.QuestionnaireResponses;

  if(Meteor.isClient){
    Meteor.subscribe('Observations');  
  }
  
  if(Meteor.isServer){  
    let defaultQuery = {};
    let defaultOptions = {limit: 5000}
  
    Meteor.publish('Observations', function(){
      return Observations.find(defaultQuery, defaultOptions);
    });    
  }
  
  QuestionnaireResponses.allow({
    insert: function(userId, doc){
      return true;
    }
  });  
})



