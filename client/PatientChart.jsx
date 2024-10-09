import React, { useState, useEffect, StrictMode } from 'react';
import { useTracker } from 'meteor/react-meteor-data';

import { get, set, has, concat, pullAt } from 'lodash';

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';

import { Button, Grid, Box, MenuItem, Select, Card, CardMedia, CardHeader, CardContent, CardActions, Typography } from '@mui/material';
import { Alert, AlertTitle } from '@mui/lab';


import "ace-builds";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { GPTTokens } from 'gpt-tokens';

import { useLocation, useNavigate } from "react-router-dom";

import PatientCard from './PatientCard';



//====================================================================================
// Session Variables

Session.setDefault('foo', 'bar');


//====================================================================================
// Shared Components

let DynamicSpacer;
let useTheme;
let FhirUtilities;
let LayoutHelpers;

let AllergyIntolerancesTable;
let CarePlansTable;
let CareTeamsTable;
let ConditionsTable;
let ConsentsTable;
let DevicesTable;
let EncountersTable;
let ImmunizationsTable;
let LocationsTable;
let MedicationsTable;
let ObservationsTable;
let ProceduresTable;
let QuestionnairesTable;
let QuestionnaireResponsesTable;

Meteor.startup(function(){
  DynamicSpacer = Meteor.DynamicSpacer;
  FhirUtilities = Meteor.FhirUtilities;
  LayoutHelpers = Meteor.LayoutHelpers;
  useTheme = Meteor.useTheme;

  AllergyIntolerancesTable = Meteor.Tables.AllergyIntolerancesTable;
  CarePlansTable = Meteor.Tables.CarePlansTable;
  CareTeamsTable = Meteor.Tables.CareTeamsTable;
  ConditionsTable = Meteor.Tables.ConditionsTable;
  ConsentsTable = Meteor.Tables.ConsentsTable;
  DevicesTable = Meteor.Tables.DevicesTable;
  EncountersTable = Meteor.Tables.EncountersTable;
  ImmunizationsTable = Meteor.Tables.ImmunizationsTable;
  LocationsTable = Meteor.Tables.LocationsTable;
  MedicationsTable = Meteor.Tables.MedicationsTable;
  ObservationsTable = Meteor.Tables.ObservationsTable;
  ProceduresTable = Meteor.Tables.ProceduresTable;
  QuestionnairesTable = Meteor.Tables.QuestionnairesTable;
  QuestionnaireResponsesTable = Meteor.Tables.QuestionnaireResponsesTable;
})


//====================================================================================
// Data Cursors



let AllergyIntolerances;
let CarePlans;
let CareTeams;
let Consents;
let Compositions;
let Conditions;
let Devices;
let Encounters;
let Immunizations;
let Locations;
let Medications;
let MedicationRequests;
let Observations;
let Procedures;
let Patients;
let Questionnaires;
let QuestionnaireResponses;

Meteor.startup(async function(){
  AllergyIntolerances = Meteor.Collections.AllergyIntolerances;
  CarePlans = Meteor.Collections.CarePlans;
  CareTeams = Meteor.Collections.CareTeams;
  Consents = Meteor.Collections.Consents;
  Compositions = Meteor.Collections.Compositions;
  Conditions = Meteor.Collections.Conditions;
  Encounters = Meteor.Collections.Encounters;
  Immunizations = Meteor.Collections.Immunizations;
  Locations = Meteor.Collections.Locations;
  Medications = Meteor.Collections.Medications;
  MedicationRequests = Meteor.Collections.MedicationRequests;
  Observations = Meteor.Collections.Observations;
  Patients = Meteor.Collections.Patients;
  Procedures = Meteor.Collections.Procedures;
  Questionnaires = Meteor.Collections.Questionnaires;
  QuestionnaireResponses = Meteor.Collections.QuestionnaireResponses;
})

//====================================================================================
// Main Function  

function PatientChart(props){
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();

  let searchParams = new URLSearchParams(window.location.search);

  let headerHeight = 84;
  if(get(Meteor, 'settings.public.defaults.prominantHeader')){
    headerHeight = 148;
  }  

  let data = {
    allergyIntolerances: [],
    careTeams: [],
    carePlans: [],
    conditions: [],
    consents: [],
    devices: [],
    encounters: [],
    immunizations: [],
    locations: [],
    medications: [],
    observations: [],
    procedures: [],
    selectedPatientId: '',
    selectedPatient: null,
    patients: [],
    questionnaires: [],
    questionnaireResponses: [],
    basicQuery: {}
  }

  data.selectedPatientId = useTracker(function(){
    return Session.get('selectedPatientId');
  }, []);
  data.selectedPatient = useTracker(function(){
      if(Session.get('selectedPatientId')){
          return Patients.findOne({id: Session.get('selectedPatientId')});
      } else if(get(Session.get('currentUser'), 'patientId')){
          return Patients.findOne({id: get(Session.get('currentUser'), 'patientId')});
      }   
  }, []);
  data.basicQuery = useTracker(function(){
    return FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'));
  }, []);

  let [allergyIntolerancesPage, setAllergyIntolerancesPage] = useState(0);
  let [careTeamsPage, setCareTeamsPage] = useState(0);
  let [carePlansPage, setCarePlansPage] = useState(0);
  let [conditionsPage, setConditionsPage] = useState(0);
  let [consentsPage,   setConsentsPage] = useState(0);
  let [devicesPage, setDevicesPage] = useState(0);
  let [encountersPage, setEncountersPage] = useState(0);
  let [immunizationsPage, setImmunizationsPage] = useState(0);
  let [locationsPage, setLocationsPage] = useState(0);
  let [medicationsPage, setMedicationsPage] = useState(0);  
  let [observationsPage, setObservationsPage] = useState(0);
  let [proceduresPage, setProceduresPage] = useState(0);
  let [patientsPage, setPatientsPage] = useState(0);
  let [questionnairesPage, setQuestionnairesPage] = useState(0);
  let [questionnaireResponsesPage, setQuestionnaireResponsesPage] = useState(0);

  let [includeAllergyIntolerances, setIncludeAllergyIntolerances] = useState(true);
  let [includeCareTeams, setIncludeCareTeams] = useState(true);
  let [includeCarePlans, setIncludeCarePlans] = useState(true);
  let [includeConditions, setIncludeConditions] = useState(true);
  let [includeConsents, setIncludeConsents] = useState(true);
  let [includeDevices, setIncludeDevices] = useState(true);
  let [includeEncounters, setIncludeEncounters] = useState(true);
  let [includeImmunizations, setIncludeImmunizations] = useState(true);
  let [includeLocations, setIncludeLocations] = useState(true);
  let [includeMedications, setIncludeMedications] = useState(true);
  let [includeObservations, setIncludeObservations] = useState(true);
  let [includeProcedures, setIncludeProcedures] = useState(true);
  let [includePatients, setIncludePatients] = useState(true);
  let [includeProblemsList, setIncludeProblemsList] = useState(true);
  let [includePastIllnessHistory, setIncludePastIllnessHistory] = useState(true);
  let [includeVitalSigns, setIncludeVitalSigns] = useState(true);
  let [includeExamResults, setIncludeExamResults] = useState(true);
  let [includeQuestionnaires, setIncludeQuestionnaires] = useState(true);
  let [includeQuestionnaireResponses, setIncludeQuestionnaireResponses] = useState(true);

  let [selectedPipeline, setSelectedPipeline] = useState(searchParams.get('pipeline') ? parseInt(searchParams.get('pipeline')) : 1);
  let [globalPrompt, setGlobalPrompt] = useState("You are a helpful assistant. Your task is to read a clinical summary, and then answer a question about it.  Instructions for answering clinical questions:  Be brief and concise when possible.  Full sentance answers are not necessary.  You do not need to mention the patient in the answer; presume the reader knows you are talking about the patient.  If there is any mention of death or a death certificate, that may override answers to other questions, so include that information when appropriate.");

  let [editorText, setEditorText] = useState("");
  let [textNormalForm, setTextNormalForm] = useState("");
  let [llfFriendlyNdjsonString, setLlfFriendlyNdjsonString] = useState("");
  let [patientNarrative, setPatientNarrative] = useState("");

  let [openAiApiKey, setOpenAiApiKey] = useState("");
  let [relayUrl, setRelayUrl] = useState(get(Meteor, 'settings.public.interfaces.fhirServer.channel.endpoint', ""));
  let [showApiError, setShowApiError] = useState(false);
  let [summaryWordWrap, setSummaryWordWrap] = useState(false);

  let [clinicalSummaryTokens, setClinicalSummaryTokens] = useState(0);


  let isMobile = false
  if(window.innerWidth < 920){
      isMobile = true;
  }

  function openLink(url){
    console.log("openLink", url);

    if(typeof Packages["symptomatic/data-importer"] === "object"){
      navigate(url, {replace: true});
    } else {
      // TODO:  load Daniel_Gaitan directly

    }
  }

  let selectedPatient = useTracker(function(){
    return Session.get('selectedPatient');
  }, [])

  let innerWidth = useTracker(function(){
    return Session.get('innerWidth');
  }, [])

  useTracker(function(){
    setTextNormalForm(Session.get('textNormalForm'))
  }, [])

  useTracker(function(){

    setTextNormalForm(Session.get('textNormalForm'));    

    const usageInfo = new GPTTokens({
      model   : 'gpt-4',
      messages: [
          { 'role' :'system', 'content': 'You are a helpful, pattern-following assistant that translates corporate jargon into plain English.' },
          { 'role' :'user',   'content': Session.get('textNormalForm') },
      ]
    })
    console.info('Used tokens: ', usageInfo.usedTokens)
    setClinicalSummaryTokens(usageInfo.usedTokens);

  }, [])

  useTracker(function(){
    setOpenAiApiKey(Session.get('openAiApiKey'))
  }, [])

  useEffect(function(){
    setOpenAiApiKey(Session.get('openAiApiKey'));

    Meteor.call('fetchOpenApiKeyForIps', function(error, result){
      if(result){
        setOpenAiApiKey(result)
      }
    })

    console.log('PatientChart.useEffect()', editorText)
    // QuestionnaireResponses._collection.insert(form8500Response, {filter: false, validate: false});

    gatherTextNormalForm();

    Session.set('QuestionnaireResponsesPage.onePageLayout', false);
  }, [])



  //------------------------------------------------------------------------------------------------------

  let basicChain; 
  let narrativeSummaryChain;
  let askQuestionChain;
  let askMultipleChoiceQuestionChain;
  let completeQuestionSentenceChain;


  if(openAiApiKey){
    
    const chatModel = new ChatOpenAI({
      modelName: "gpt-4",
      toolChoice: "auto",
      temperature: 1.05,
      maxRetries: 10,
      openAIApiKey: openAiApiKey, // In Node.js defaults to process.env.OPENAI_API_KEY
      maxTokens: 1000
    });
  
    let textNormalFormPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Given the following patient record in JSON format, please summarize in clinical text normal form.  Provide a narrative summary of the patient's health, no line breaks or lists.  Use neutral omniciant narrator tense; do not use third person."],
      ["user", "{jsonInput}"],
    ]);

    let narrativeSummaryPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Given the following patient clinical statements, please summarize as a coherent narrative summary.  Remove duplications and extraneous information and codings; keep it human readable; no lists."],
      ["user", "{jsonInput}"],
    ]);

    let askQuestionPrompt = ChatPromptTemplate.fromMessages([
      ["system", globalPrompt],
      ["user", "{jsonInput}"],
    ]);

    let completeQuestionSentencePrompt = ChatPromptTemplate.fromMessages([
      ["system", "Please convert the following string fragment into a complete sentence.  Use third person.  Assume the form is for a patient, and the label is referring to the patient.  If the type of question is 'choice', please include the answer choices in the response."],
      // ["system", "You are a helpful assistant who ensures that questions are written as complete sentences.  When text is sent to you, if it is a complete sentence, echo it back verbatim.  If a sentence fragment or label is provided, please convert it into a complete sentence and then return it. Use third person.  When unsure about the voice or tense or subject, assume that you are a clinician filling out the form on behalf of the patient."],
      ["user", "{jsonInput}"],
    ]);

    let askMultipleChoiceQuestionPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Given the following patient record, question, and possible answers, please select any of the following multiple choice answers that are indicated by the patient medical history.  Please respond with a JSON object, with an 'answerChoice' field that contains an array of the chosen answer options, and an 'explanation' field that contains a text description of why you chose that answer.  Be detailed in your explanation.  When building the array of choices, include the entire valueCoding."],
      ["user", "{jsonInput}"],
    ]);


    const outputParser = new StringOutputParser();
  
    basicChain = textNormalFormPrompt.pipe(chatModel).pipe(outputParser);

    narrativeSummaryChain = narrativeSummaryPrompt.pipe(chatModel).pipe(outputParser);

    askQuestionChain = askQuestionPrompt.pipe(chatModel).pipe(outputParser);
    
    askMultipleChoiceQuestionChain = askMultipleChoiceQuestionPrompt.pipe(chatModel).pipe(outputParser);

    completeQuestionSentenceChain = completeQuestionSentencePrompt.pipe(chatModel).pipe(outputParser);
  }
  
  
  //------------------------------------------------------------------------------------------------------
  
  
  if(AllergyIntolerances){
    data.allergyIntolerances = useTracker(function(){
      return AllergyIntolerances.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
    }, [])    
  }
  if(CareTeams){
    data.careTeams = useTracker(function(){
      return CareTeams.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
    }, [])    
  }
  if(CarePlans){
      data.carePlans = useTracker(function(){
        return CarePlans.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])    
  }
  if(Consents){
      data.consents = useTracker(function(){
        return Consents.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])    
  }
  if(Conditions){
      data.conditions = useTracker(function(){
        return Conditions.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])    
  }
  if(Devices){
    data.devices = useTracker(function(){
        return Devices.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
    }, [])    
  }
  if(Encounters){
      data.encounters = useTracker(function(){
          return Encounters.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])   
  }
  if(Immunizations){
      data.immunizations = useTracker(function(){
          return Immunizations.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])   
  }
  if(Locations){
      data.locations = useTracker(function(){
          return Locations.find().fetch()
      }, [])   
  }
  if(Medications){
    data.medications = useTracker(function(){
        return Medications.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
    }, [])    
  }
  if(Procedures){
      data.procedures = useTracker(function(){
          return Procedures.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])   
  }
  if(Observations){
      data.observations = useTracker(function(){
          return Observations.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])   
  }

  if(Questionnaires){
      data.questionnaires = useTracker(function(){
          return Questionnaires.find().fetch()
      }, [])   
  }
  if(QuestionnaireResponses){
      data.questionnaireResponses = useTracker(function(){
          return QuestionnaireResponses.find(FhirUtilities.addPatientFilterToQuery(Session.get('selectedPatientId'))).fetch()
      }, [])   
  }
  //----------------------------------------------------------------------

  let patientDemographicsContent = [];
  if(typeof data.selectedPatient === "object"){
    patientDemographicsContent.push(<PatientCard patient={data.selectedPatient} />)
    patientDemographicsContent.push(<DynamicSpacer />);
  }

  let allergyIntoleranceContent = [];
  if(data.allergyIntolerances.length > 0){
      allergyIntoleranceContent.push(<CardContent>
          <AllergyIntolerancesTable
              careTeams={data.allergyIntolerances}
              hideCategory={true}
              hideIdentifier={true}
              hideTextIcon={true}
              count={data.allergyIntolerances.length}
              page={allergyIntolerancesPage}   
              rowsPerPage={5}    
              onSetPage={function(newPage){
                  setAllergyIntolerancesPage(newPage);
              }}         
          />
      </CardContent>)
      allergyIntoleranceContent.push(<CardActions>
          <Button size="small" color={includeAllergyIntolerances ? "primary" : "inherit"} onClick={function(){
          setIncludeAllergyIntolerances(!includeAllergyIntolerances);
          // gatherTextNormalForm();
        }}>View Allergy Intolerances</Button>
      </CardActions>)
      
  }
    let careTeamContent = [];
  if(data.careTeams.length > 0){
      careTeamContent.push(<CardContent>
          <CareTeamsTable
              careTeams={data.careTeams}
              hideCategory={true}
              hideIdentifier={true}
              hideTextIcon={true}
              count={data.careTeams.length}
              page={careTeamsPage}   
              rowsPerPage={5}    
              onSetPage={function(newPage){
                  setCareTeamsPage(newPage);
              }}         
          />
      </CardContent>)
      careTeamContent.push(<CardActions>
        <Button size="small" color={includeCareTeams ? "primary" : "inherit"} onClick={function(){
          setIncludeCareTeams(!includeCareTeams);
          // gatherTextNormalForm();
        }}>Include: {includeCareTeams ? "YES" : "NO"} </Button> 
      </CardActions>)  
  }
  let carePlansContent = [];
  if(data.carePlans.length > 0){
      carePlansContent.push(<CardContent>
          <CarePlansTable
              locations={data.locations}
              count={data.locations.length}
              page={carePlansPage}
              rowsPerPage={5}
              hideTextIcon={true}
              onSetPage={function(newPage){
                  setCarePlansPage(newPage);
              }}
          />
      </CardContent>)  
      carePlansContent.push(<CardActions>
        <Button size="small" color={includeCarePlans ? "primary" : "inherit"} onClick={function(){
          setIncludeCarePlans(!includeCarePlans);
          // gatherTextNormalForm();
        }}>Include: {includeCarePlans ? "YES" : "NO"} </Button>
      </CardActions>)                 
  }

  let problemsListContent = [];
  if(data.conditions.length > 0){
      problemsListContent.push(<Card>
        <CardHeader title={"Problems List"} />
        <CardContent>
          <ConditionsTable
              conditions={data.conditions}
              hideCheckbox={true}
              hideActionIcons={true}
              hidePatientName={true}
              hidePatientReference={true}
              hideAsserterName={true}
              hideEvidence={true}
              hideBarcode={true}
              hideDates={false}
              hideTextIcon={true}
              count={data.conditions.length}
              page={conditionsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setConditionsPage(newPage);
              }}
          />                                        
        </CardContent>
        <CardActions>
          <Button size="small" color={includeConditions ? "primary" : "inherit"} onClick={function(){
            setIncludeConditions(!includeConditions);
            // gatherTextNormalForm();
          }}>Include: {includeConditions ? "YES" : "NO"} </Button>
          {/* <Button size="small" color="primary" onClick={function(){
            handleParseCollectionOfResources(Conditions.find().fetch())
          }}>Create text</Button> */}
        </CardActions>
      </Card>)   
      problemsListContent.push(<DynamicSpacer />);                
  }



  let pastIllnessHistoryContent = [];
  if(data.conditions.length > 0){
      pastIllnessHistoryContent.push(<Card>
        <CardHeader title={"Past Illness History"} />
        <CardContent>
          <ConditionsTable
              conditions={data.conditions}
              hideCheckbox={true}
              hideActionIcons={true}
              hidePatientName={true}
              hidePatientReference={true}
              hideAsserterName={true}
              hideEvidence={true}
              hideBarcode={true}
              hideDates={false}
              hideTextIcon={true}
              count={data.conditions.length}
              page={conditionsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setConditionsPage(newPage);
              }}
          />                                        
        </CardContent>
        <CardActions>
          <Button size="small" color={includePastIllnessHistory ? "primary" : "inherit"} onClick={function(){
            setIncludePastIllnessHistory(!includePastIllnessHistory);
          }}>Include: {includePastIllnessHistory ? "YES" : "NO"} </Button>
          {/* <Button size="small" color="primary" onClick={function(){
            handleParseCollectionOfResources(Conditions.find().fetch())
          }}>Create text</Button> */}
        </CardActions>
      </Card>)   
      pastIllnessHistoryContent.push(<DynamicSpacer />)              
  }


  let consentContent = [];
  if(data.consents.length > 0){
      consentContent.push(<Card>
        <CardHeader title={"Consents"} />
        <CardContent>
          <ConsentsTable
              hideDates={true}
              hidePeriodStart={true}
              hidePeriodEnd={true}
              hideOrganization={true}
              hideCategory={true}
              hidePatientName={isMobile}
              hideTextIcon={true}
              consents={data.consents}
              count={data.consents.length}
              page={consentsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setConsentsPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color="primary" onClick={function(){
            setIncludeConsents(!includeConsents);
            // gatherTextNormalForm();
        }}>Include: {includeConsents ? "YES" : "NO"} </Button> 
        </CardActions>
      </Card>) 
      consentContent.push(<DynamicSpacer />)              
  }


  let deviceContent = [];
  if(data.devices.length > 0){
      deviceContent.push(<Card>
        <CardHeader title={"Devices"} />
        <CardContent>
          <DevicesTable
              hideDates={true}
              hidePeriodStart={true}
              hidePeriodEnd={true}
              hideOrganization={true}
              hideCategory={true}
              hidePatientName={isMobile}
              hideTextIcon={true}
              consents={data.devices}
              count={data.devices.length}
              page={devicesPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setDevicesPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color={includeDevices ? "primary" : "inherit"} onClick={function(){
            setIncludeDevices(!includeDevices);
            // gatherTextNormalForm();
          }}>Include: {includeDevices ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)
      deviceContent.push(<DynamicSpacer />)              
  }

  let encountersContent = [];
  if(data.encounters.length > 0){
      encountersContent.push(<Card>
        <CardHeader title={"Encounters"} />
        <CardContent>
          <EncountersTable
              encounters={data.encounters}
              hideCheckboxes={true}
              hideActionIcons={true}
              hideSubjects={true}
              hideType={false}
              hideTypeCode={false}
              hideReason={isMobile}
              hideReasonCode={isMobile}
              hideHistory={true}
              hideEndDateTime={true}
              hideTextIcon={true}
              count={data.encounters.length}
              page={encountersPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setEncountersPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color={includeEncounters ? "primary" : "inherit"} onClick={function(){
            setIncludeEncounters(!includeEncounters);
            // gatherTextNormalForm();
          }}>Include: {includeEncounters ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)
      encountersContent.push(<DynamicSpacer />) 
  }



  let locationsContent = [];
  if(data.locations.length > 0){
      locationsContent.push(<Card>
        <CardHeader title={"Locations"} />
        <CardContent>
          <LocationsTable
              locations={data.locations}
              count={data.locations.length}
              page={locationsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setLocationsPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color={includeLocations ? "primary" : "inherit"} onClick={function(){
            setIncludeLocations(!includeLocations);
          }}>Include: {includeLocations ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)   
      locationsContent.push(<DynamicSpacer />)                  
  }
  let immunizationsContent = [];
  if(data.immunizations.length > 0){
      immunizationsContent.push(<Card>
        <CardHeader title={"Immunizations"} disabled={true} />
        <CardContent disabled={true}>
          <ImmunizationsTable
              immunizations={data.immunizations}
              hideCheckbox={true}
              hideIdentifier={true}
              hideActionIcons={true}
              hidePatient={true}
              hidePerformer={true}
              hideVaccineCode={false}
              hideVaccineCodeText={false}
              hideTextIcon={true}
              count={data.immunizations.length}
              page={immunizationsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setImmunizationsPage(newPage);
              }}
          />                                        
        </CardContent>
        <CardActions>
          <Button size="small" color={includeImmunizations ? "primary" : "inherit"} onClick={function(){
            setIncludeImmunizations(!includeImmunizations);
          }}>Include: {includeImmunizations ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)
      immunizationsContent.push(<DynamicSpacer />)
  }

  let medicationContent = [];
  if(data.medications.length > 0){
      medicationContent.push(<Card>
        <CardHeader title={"Medications"} disabled={true} />
        <CardContent>
          <MedicationsTable
              hideDates={true}
              hidePeriodStart={true}
              hidePeriodEnd={true}
              hideOrganization={true}
              hideCategory={true}
              hidePatientName={isMobile}
              hideTextIcon={true}
              consents={data.medications}
              count={data.medications.length}
              page={medicationsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setMedicationsPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color={includeMedications ? "primary" : "inherit"} onClick={function(){
            setIncludeMedications(!includeMedications);
          }}>Include: {includeMedications ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>) 
      medicationContent.push(<DynamicSpacer />)  
  }
  let examResultsContent = [];
  if(data.observations.length > 0){
      examResultsContent.push(<CardHeader title={"Exam & Lab Result"} />);
      examResultsContent.push(<Card>
        <CardContent>
          <ObservationsTable 
              observations={data.observations}
              hideCheckbox={true}
              hideActionIcons={true}
              hideSubject={true}
              hideDevices={true}
              hideValue={false}
              hideBarcode={true}
              hideDenominator={true}
              hideNumerator={true}
              hideTextIcon={true}
              multiline={true}
              multiComponentValues={true}
              hideSubjectReference={true}
              count={data.observations.length}
              page={observationsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setObservationsPage(newPage);
              }}
          />                                                                                                           
        </CardContent>
        <CardActions>
          <Button size="small" color={includeObservations ? "primary" : "inherit"} onClick={function(){
            setIncludeObservations(!includeObservations);
          }}>Include: {includeExamResults ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>) 
      examResultsContent.push(<DynamicSpacer />)                                   
  }

  let vitalSignsContent = [];
  if(data.observations.length > 0){
      vitalSignsContent.push(<Card>
        <CardHeader title={"Vital Signs"} />
        <CardContent>
          <ObservationsTable 
              observations={data.observations}
              hideCheckbox={true}
              hideActionIcons={true}
              hideSubject={true}
              hideDevices={true}
              hideValue={false}
              hideBarcode={true}
              hideDenominator={true}
              hideNumerator={true}
              hideTextIcon={true}
              multiline={true}
              multiComponentValues={true}
              hideSubjectReference={true}
              count={data.observations.length}
              page={observationsPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setObservationsPage(newPage);
              }}
          />                                                                                                           
        </CardContent>
        <CardActions>
          <Button size="small" color={includeObservations ? "primary" : "inherit"} onClick={function(){
            setIncludeObservations(!includeObservations);
          }}>Include: {includeVitalSigns ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>) 
      vitalSignsContent.push(<DynamicSpacer />)                                     
  }



  let proceduresContent = [];
  if(data.procedures.length > 0){
      proceduresContent.push(<Card>
        <CardHeader title={"Procedures History"} />
        <CardContent>
          <ProceduresTable 
              procedures={data.procedures}
              hideCheckbox={true}
              hideActionIcons={true}
              hideIdentifier={true}
              hideCategory={true}
              hideSubject={true}
              hideBodySite={true}
              hideCode={isMobile}
              hidePerformer={isMobile}
              hideNotes={isMobile}
              hidePerformedDateEnd={true}
              hideSubjectReference={true}
              hideTextIcon={true}
              hideBarcode={true}
              count={data.procedures.length}
              page={proceduresPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setProceduresPage(newPage);
              }}
          />                                                                                                           
        </CardContent>
        <CardActions>
          <Button size="small" color={includeProcedures ? "primary" : "inherit"} onClick={function(){
            setIncludeProcedures(!includeProcedures);
          }}>Include: {includeProcedures ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)  
      proceduresContent.push(<DynamicSpacer />);               
  }


  let questionnairesContent = [];
  if(data.questionnaires.length > 0){
      questionnairesContent.push(<Card>
        <CardHeader title={"Questionnaires"} />
        <CardContent>
          <QuestionnairesTable
              questionnaires={data.questionnaires}
              count={data.questionnaires.length}
              hideSubject={isMobile}
              hideSubjectReference={isMobile}
              hideIdentifier={true}
              page={questionnairesPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setQuestionnairesPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color={includeQuestionnaires ? "primary" : "inherit"} onClick={function(){
            setIncludeQuestionnaires(!includeQuestionnaires);
          }}>Include: {includeQuestionnaires ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)                    
      questionnairesContent.push(<DynamicSpacer />)  
  }

  let questionnaireResponsesContent = [];
  if(data.questionnaireResponses.length > 0){
      questionnaireResponsesContent.push(<Card>
        <CardHeader title={"Questionnaire Responses"} />
        <CardContent>
          <QuestionnaireResponsesTable
              questionnaireResponses={data.questionnaireResponses}
              count={data.questionnaireResponses.length}
              hideCheckbox={true}
              hideActionIcons={true}
              hideIdentifier={true}
              hideSourceReference={isMobile}
              page={questionnaireResponsesPage}
              rowsPerPage={5}
              onSetPage={function(newPage){
                  setQuestionnaireResponsesPage(newPage);
              }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" color="primary" style={{top: '-15px', left: '20px'}} onClick={function(){
            setIncludeQuestionnaireResponses(!includeQuestionnaireResponses);
          }}>Include: {includeQuestionnaireResponses ? "YES" : "NO"} </Button>
        </CardActions>
      </Card>)
      questionnaireResponsesContent.push(<DynamicSpacer />)
  }

  //----------------------------------------------------------------------
  // Helper Functions


  function onEditorChange(newValue){
    console.log('onEditorChange', newValue)
    setEditorText(newValue)

    Session.set('textNormalForm', newValue);
  }

  function handleChangePipeline(event){
    setSelectedPipeline(event.target.value);    
  }

  function gatherTextNormalForm(){
    let editorText = "";

    if(includeAllergyIntolerances){
      data.allergyIntolerances.forEach(function(allergy){
        if(get(allergy, 'text.div')){
          editorText = editorText + get(allergy, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(allergy) + "\n\n";
        }
      }) 
    }
    if(includeCareTeams){
      data.careTeams.forEach(function(careTeam){
        if(get(careTeam, 'text.div')){
          editorText = editorText + get(careTeam, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(careTeam) + "\n\n";
        }
      }) 
    }
    if(includeCarePlans){
      data.carePlans.forEach(function(carePlan){
        if(get(carePlan, 'text.div')){
          editorText = editorText + get(carePlan, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(carePlan) + "\n\n";
        }
      }) 
    }
    if(includeConditions){      
      data.conditions.forEach(function(condition){
        if(get(condition, 'text.div')){
          editorText = editorText + get(condition, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(condition) + "\n\n";
        }
      }) 
    }
    if(includeConsents){
      data.consents.forEach(function(consent){
        if(get(consent, 'text.div')){
          editorText = editorText + get(consent, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(consent) + "\n\n";
        }
      }) 
    }
    if(includeDevices){
      data.devices.forEach(function(device){
        if(get(device, 'text.div')){
          editorText = editorText + get(device, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(device) + "\n\n";
        }
      }) 
    }
    if(includeEncounters){
      data.encounters.forEach(function(encounter){
        if(get(encounter, 'text.div')){
          editorText = editorText + get(encounter, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(encounter) + "\n\n";
        }
      }) 
    }
    if(includeImmunizations){
      data.immunizations.forEach(function(immunization){
        if(get(immunization, 'text.div')){
          editorText = editorText + get(immunization, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(immunization) + "\n\n";
        }
      }) 
    }
    if(includeLocations){
      data.locations.forEach(function(location){
        if(get(location, 'text.div')){
          editorText = editorText + get(location, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(location) + "\n\n";
        }
      }) 
    }
    if(includeMedications){
      data.medications.forEach(function(medication){
        if(get(medication, 'text.div')){
          editorText = editorText + get(medication, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(medication) + "\n\n";
        }
      }) 
    }
    if(includeObservations){
      data.observations.forEach(function(observation){
        if(get(observation, 'text.div')){
          editorText = editorText + get(observation, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(observation) + "\n\n";
        }
      }) 
    }
    if(includeProcedures){
      data.procedures.forEach(function(procedure){
        if(get(procedure, 'text.div')){
          editorText = editorText + get(procedure, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(procedure) + "\n\n";
        }
      }) 
    }
    if(includePatients){
      data.patients.forEach(function(patient){
        if(get(patient, 'text.div')){
          editorText = editorText + get(patient, 'text.div') + "\n\n";
        } else {
          editorText = editorText + JSON.stringify(patient) + "\n\n";
        }
      }) 
    }
    // if(includeQuestionnaires){
    //   data.questionnaires.forEach(function(questionnaire){
    //     if(get(questionnaire, 'text.div')){
    //       editorText = editorText + get(questionnaire, 'text.div') + "\n\n";
    //     } else {
    //       editorText = editorText + JSON.stringify(questionnaire) + "\n\n";
    //     }
    //   })
    // }
    // if(includeQuestionnaireResponses){
    //   data.questionnaireResponses.forEach(function(questionnaireResponse){
    //     if(get(questionnaireResponse, 'text.div')){
    //       editorText = editorText + get(questionnaireResponse, 'text.div') + "\n\n";
    //     } else {
    //       editorText = editorText + JSON.stringify(questionnaireResponse) + "\n\n";
    //     }

    //   }) 
    // }
    
    setTextNormalForm(editorText);

    Session.set('textNormalForm', editorText)
  }

  function selectMedicalHistory(){
    console.log('selectMedicalHistory')

    let medicalHistory = {
      resourceType: "Bundle",
      type: "collection",
      entry: []
    }

    let conditions = Conditions.find().map(function(condition){
      delete condition._id;
      let entry = {
        resource: condition
      }
      return entry;
    });

    let procedures = Procedures.find().map(function(condition){
      delete condition._id;
      let entry = {
        resource: condition
      }
      return entry;
    });
    let medications = Medications.find().map(function(condition){
      delete condition._id;
      let entry = {
        resource: condition
      }
      return entry;
    });
    let patients = Patients.find().map(function(condition){
      delete condition._id;
      let entry = {
        resource: condition
      }
      return entry;
    });

    console.log('conditions.length', conditions.length)
    console.log('procedures.length', procedures.length)
    console.log('medications.length', medications.length)
    console.log('patients.length', patients.length)

    medicalHistory.entry = concat(medicalHistory.entry, patients);
    medicalHistory.entry = concat(medicalHistory.entry, conditions);
    medicalHistory.entry = concat(medicalHistory.entry, procedures);
    medicalHistory.entry = concat(medicalHistory.entry, medications);
    
    // kludgy, but it gets the job done

    console.log('medicalHistory', medicalHistory)
    console.log('medicalHistory.entry.length', medicalHistory.entry.length)
    Session.set('exportBuffer', medicalHistory);
  }
  
  function handleChangeDestination(event, value){
    console.log('handleChangeDestination', event.target.value)
    setRelayUrl(event.target.value);
    Session.set('relayUrl', event.target.value);
  }
  function handleCreateAndSaveIps(){
    console.log("Creating and saving the IPS document to Compositions collection....");

    setSummaryWordWrap(true);

    let newComposition = {
      resourceType: "Composition",
      type: {
        coding: [
          {
            system: "http://loinc.org",
            code: "11506-3",
            display: "Patient Summary"
          }
        ]
      },
      title: "International Patient Summary",
      status: "final",
      subject: {
        reference: "Patient/" + Session.get('selectedPatientId')
      },
      date: new Date(),
      text: {
        status: "generated",
        div: textNormalForm
      }
    }

    let existingIsp = Compositions.findOne({title: "International Patient Summary"});
    if(existingIsp){
      Compositions._collection.update({_id: existingIsp._id}, {$set: {"text.div": textNormalForm}}, function(error, result){
        if(error){
          console.error('error', error)
        }
        if(result){
          console.log('result', result)
        }
      });
    } else {
      Compositions._collection.insert(newComposition, function(error, result){
        if(error){
          console.error('error', error)
        }
        if(result){
          console.log('result', result)
        }
      });
    }
  }

  function handleClearTextSummary(){
    setTextNormalForm("");
  }
  function handleToggleWrap(){
    setSummaryWordWrap(!summaryWordWrap);
  }
  function createClinicalSummary(){
    console.log('Creating clinical summary....');

    let textToSend = "";

    if(typeof textNormalForm === "string"){
      textToSend = textNormalForm;
    } else if(typeof textNormalForm === "object"){
      textToSend = JSON.stringify(textNormalForm);
    }

    narrativeSummaryChain.invoke({
      jsonInput: textToSend,
    }).then((output) => {
      console.log(output);
      // setPatientNarrative(output);
      setSummaryWordWrap(true);
      setTextNormalForm(output);

      Session.set('textNormalForm', output);
    });
  }

  function handleParseAllCollectionOfResources(){
    console.log("handleParseAllCollectionOfResources")
    // await handleParseCollectionOfResources(AllergyIntolerances.find().fetch());
    
    if(includeCareTeams){
      handleParseCollectionOfResources(CareTeams.find().fetch());
    }
    if(includeCarePlans){
      handleParseCollectionOfResources(CarePlans.find().fetch());
    }
    if(includeConditions || includeProcedures){
      handleParseCollectionOfResources(Conditions.find().fetch());
    }
    // handleParseCollectionOfResources(Consents.find().fetch());
    // handleParseCollectionOfResources(Devices.find().fetch());    
    if(includeEncounters){
      handleParseCollectionOfResources(Encounters.find().fetch());
    }
    if(includeImmunizations){
      handleParseCollectionOfResources(Immunizations.find().fetch());
    }
    // handleParseCollectionOfResources(Locations.find().fetch());
    // handleParseCollectionOfResources(Medications.find().fetch());
    // handleParseCollectionOfResources(Observations.find().fetch());
    if(includeProcedures){
      handleParseCollectionOfResources(Procedures.find().fetch());
    }
    // if(includePastIllnessHistory){
    //   handleParseCollectionOfResources(Conditions.find().fetch());
    // }

    // handleParseCollectionOfResources(Patients.find().fetch());
    // handleParseCollectionOfResources(Questionnaires.find().fetch());
    // handleParseCollectionOfResources(QuestionnaireResponses.find().fetch());

  }
  async function handleParseCollectionOfResources(arrayOfResources){
    console.log('handleParseCollectionOfResources', arrayOfResources);

    switch (selectedPipeline) {
      case 0:
        initPythonPipeline(arrayOfResources);
        break;
      case 1:
        initLangchainPipeline(arrayOfResources);
        break;      
      default:
        break;
    } 
  }
  function handleGatherResourceDescriptions(){

    console.log("Gathering resource descriptions...")

    console.log('includeAllergyIntolerances    ' + includeAllergyIntolerances)
    console.log('includeCareTeams              ' + includeCareTeams)
    console.log('includeCarePlans              ' + includeCarePlans)
    console.log('includeConditions             ' + includeConditions)
    console.log('includeConsents               ' + includeConsents)
    console.log('includeDevices                ' + includeDevices)
    console.log('includeEncounters             ' + includeEncounters)
    console.log('includeImmunizations          ' + includeImmunizations)
    console.log('includeLocations              ' + includeLocations)
    console.log('includeMedications            ' + includeMedications)
    console.log('includeObservations           ' + includeObservations)
    console.log('includeProcedures             ' + includeProcedures)
    console.log('includePatients               ' + includePatients)
    console.log('includeQuestionnaires         ' + includeQuestionnaires)
    console.log('includeQuestionnaireResponses ' + includeQuestionnaireResponses)


    gatherTextNormalForm();
  }
  async function initLangchainPipeline(arrayOfResources){
    console.log('Initializing Langchain pipeline', arrayOfResources);
    // console.log('Received data type: ' + typeof arrayOfResources);
    console.log('Received data is Array: ' + Array.isArray(arrayOfResources));

    if(openAiApiKey === ""){
      setShowApiError(true);
      console.log('No API key provided.')
      
      Meteor.call('fetchOpenAiApiKey', function(error, result){
        if(error){
          console.error('error', error)
        }
        if(result){
          console.log('result', result)
          setOpenAiApiKey(result);
        }
      });
    } else {
      if(Array.isArray(arrayOfResources)){
        console.log('arrayOfResources.length (starting)', arrayOfResources.length)        
  
        parseFirstItem(arrayOfResources);
      }
    }
  }
  async function initPythonPipeline(arrayOfResources){

    let ndjsonString = arrayOfResources.map(function(resource){
      return JSON.stringify(resource) + "\n";
    }).join('');

    console.log('Initiating Python pipeline', ndjsonString);
    console.log("Relay URL: " + JSON.stringify(relayUrl))
    
    Meteor.call('proxyToString', relayUrl, ndjsonString, function(error, result){
      if(error){
        console.error('error', error)
      }
      if(result){
        console.log('result', result)

        if(get(result, 'data.text')){
          Session.set('textNormalForm', result.data.text);
        } else if(get(result, 'data.text.div')){
          Session.set('textNormalForm', result.data.text.div);
        }
      }
    }) 
  }

  async function parseFirstItem(arrayOfResources){
    console.log('arrayOfResources', arrayOfResources);

    let pulledRecords = pullAt(arrayOfResources, 0);
    console.log('pulledRecords', pulledRecords)
    console.log('pulledRecords.typeof', typeof pulledRecords)
    console.log('pulledRecords.isArray', Array.isArray(pulledRecords))

    console.log('pulledRecords[0]', pulledRecords[0])
    console.log('pulledRecords[0].typeof', typeof pulledRecords[0])
    
    console.log('arrayOfResources new length     ', arrayOfResources.length);
    // setDocs(arrayOfResources);

    if(pulledRecords[0]){
      let updatedRecord = pulledRecords[0];
      setTimeout(async function(){
        // let parsedpulledRecords[0];
        // if(typeof pulledRecords[0] == "string"){
        //   parsedpulledRecords[0] = JSON.parse(pulledRecords[0]);
        // } else if (typeof pulledRecords[0] == "object"){
        //   parsedpulledRecords[0] = pulledRecords[0];
        // }

        let textToSend = "";
        if(typeof updatedRecord === "string"){
          textToSend = updatedRecord;
        } else if(typeof updatedRecord === "object"){
          textToSend = JSON.stringify(updatedRecord);
        }

        console.log('textToSend', textToSend)
  
        let textNormalForm = "";

        textNormalForm = await basicChain.invoke({
          jsonInput: textToSend
        });

        // are we using this
        // looks like sample API code
        // 
        // try {
        //   // Your LangChain API call here
        //   textNormalForm = await basicChain.invoke({
        //     jsonInput: textToSend
        //   });
        // } catch (error) {
        //   if (error.isAxiosError && error.response && error.response.status) {
        //     console.error(`API request failed with status code ${error.response.status}`);
        //     // Handle the error based on the status code or error message
        //   } else {
        //     // This is not an axios error or the response status is not available
        //     console.error(error);
        //   }
        // }

        console.log('textNormalForm', textNormalForm);
        console.log('textNormalForm.typeof', typeof textNormalForm);
    
        if(textNormalForm){
          set(updatedRecord, 'text.div', textNormalForm)
        }
        console.log('updatedRecord', updatedRecord);

        let collectionName = FhirUtilities.pluralizeResourceName(get(updatedRecord, 'resourceType'));
        console.log('collectionName', collectionName)
        console.log('collectionName.find().count()', window[collectionName].find().count())
  
        if(window[collectionName]){
          console.log('updating', collectionName)
          window[collectionName]._collection.update({_id: get(updatedRecord, '_id')}, {$set: updatedRecord}, {filter: false, validate: false});
        }
          
        parseFirstItem(arrayOfResources); 
      }, 1000);  
    } else {
      console.log('No more records.')
    }

  }

  function handleGatherClinicalStatements(){
    console.log('handleGatherClinicalStatements', llfFriendlyNdjsonString);
    let llfFriendlyNdjsonArray = split(llfFriendlyNdjsonString, '\n');
    let clinicalStatements = "";

    split(llfFriendlyNdjsonString, '\n').forEach(function(doc){
      // console.log('doc', doc)
      if(doc){
        let parsedDoc = JSON.parse(doc);
        console.log('narrative', get(parsedDoc, 'text.div'))
  
        clinicalStatements = clinicalStatements + get(parsedDoc, 'text.div') + '\n\n';
        setTextNormalForm(clinicalStatements)  

        Session.set('textNormalForm', clinicalStatements);
      }
    });
  }

  //----------------------------------------------------------------------
  // Page Styling and Layout

  let containerStyle = {
    marginBottom: '84px', 
    paddingBottom: '84px'
  }

  let pageStyle = {};

  if(window.innerWidth < 800){
    pageStyle.padingLeft = '0px !important';
    pageStyle.paddingRight = '0px !important';
  } else {
    pageStyle.padingLeft = '100px';
    pageStyle.paddingRight = '100px';
  }

  let paddingWidth = LayoutHelpers.calcCanvasPaddingWidth();

  let tokensUsed = 0;

  let relayOptions = [];
  let preprocessElements;
  let cardWidth = 4;
  let interfacesObject = get(Meteor, 'settings.public.interfaces');
  if(interfacesObject){
    Object.keys(interfacesObject).forEach(function(key, index){
      let interfaceKey = interfacesObject[key];
      if(has(interfaceKey, 'channel.endpoint') && (get(interfaceKey, 'status') === "active")){
        relayOptions.push(<MenuItem value={get(interfaceKey, 'channel.endpoint')} id={"relay-menu-item-" + index} key={"relay-menu-item-" + index} >{get(interfaceKey, 'name')}</MenuItem>)
      }
    });  
  } else {
    console.log('WARNING:  No interfaces defined!')
  }
  let relaySelection;
  if(selectedPipeline == 0){    
    relaySelection = <Select value={ relayUrl} onChange={ handleChangeDestination } fullWidth style={{marginBottom: '20px'}}>
      { relayOptions }
    </Select>
  } else {
    // cardWidth = 3;
    
    // preprocessElements = <Grid item md={cardWidth}>
    //   <Card>
    //     <CardHeader title="Preprocessed NDJSON"></CardHeader>
    //     <CardContent>
    //       <AceEditor
    //         mode="text"
    //         theme="github"
    //         wrapEnabled={false}
    //         // onChange={onUpdateLlmFriendlyNdjsonString}
    //         name="synthesisEditor"
    //         editorProps={{ $blockScrolling: true }}
    //         value={typeof llfFriendlyNdjsonString === "string" ? llfFriendlyNdjsonString : JSON.stringify(llfFriendlyNdjsonString, null, 2)}
    //         style={{width: '100%', position: 'relative', height: '600px', minHeight: '200px', backgroundColor: '#f5f5f5', borderColor: '#ccc', borderRadius: '4px', lineHeight: '16px', marginTop: '20px'}}        
    //       /> 
    //       <br />
    //       <br />
    //       <Button fullWidth variant="contained" color="primary" onClick={handleGatherClinicalStatements} disabled={openAiApiKey ? false : true}>
    //         Translate to Text
    //       </Button>
        
    //     </CardContent>
    //   </Card>      
    //   <br/>
    // </Grid>
  }


  //----------------------------------------------------------------------
  // Page Content

  let patientChartContent;
  if(data.selectedPatient == undefined || data.selectedPatient == null || data.selectedPatient == ""){
    patientChartContent = <Card style={{marginBottom: '120px', width: '100%'}}>
      <CardHeader title="No Patient Data Found" />         
      <CardContent>
        <Button fullWidth variant="contained" color="primary" onClick={openLink.bind(this, '/import-data?next=moonshot-patient-chart')}>Select Patient File</Button>
      </CardContent>     
    </Card> 
  } else if(typeof data.selectedPatient == "object"){

    
    patientChartContent = <div style={{marginBottom: '120px'}}>    
      {patientDemographicsContent}  
      {problemsListContent}                
      {proceduresContent}                              
      {immunizationsContent}                   
      {examResultsContent}                        
      {vitalSignsContent}                        
      {pastIllnessHistoryContent}                
    </div>                
  }

  let missingTextWarning = [];


  let nextPageElements;

  let nextUrl =  get(Meteor, 'settings.public.defaults.dataExporterNextPageUrl', '');
  if(searchParams.get('next')){
    nextUrl = "/" + searchParams.get('next');
  }

  if(searchParams.get('next')){
    nextPageElements = <div>
      <DynamicSpacer />
      <Button
        color="primary"
        variant="contained" 
        fullWidth
        onClick={openLink.bind(this, nextUrl)}
      >Next</Button> 
    </div>
  }

  //----------------------------------------------------------------------
  // Main Render Method  

  return (
    <div id='PatientChart' style={{overflow: 'scroll', height: window.innerHeight, padding: '20px'}}>
        <Grid container spacing={3} justifyContent="center" style={{marginBottom: '80px'}}>
          <Grid item md={12} lg={8} style={{width: '100%'}}>
            
            <DynamicSpacer />
            { patientChartContent } 
          </Grid>
          { preprocessElements }   
        </Grid>
    </div>
  );
}

export default PatientChart;