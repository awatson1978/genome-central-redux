import React from 'react';

import PatientChart from './client/PatientChart';

import { 
  PatientChartButtons
} from './client/FooterButtons';

let FooterButtons = [{
  pathname: '/moonshot-patient-chart',
  element: <PatientChartButtons />
}];

var DynamicRoutes = [{
  'name': 'Patient Chart',
  'path': '/moonshot-patient-chart',
  'element': <PatientChart />
}];

var SidebarElements = [];

let SidebarWorkflows = [{ 
  'primaryText': 'International Patient Summary',
  'to': '/moonshot-patient-chart',
  'href': '/moonshot-patient-chart'
}];



const MainPage = {
  'name': 'Patient Chart',
  'path': '/',
  'element': <PatientChart />
};

export { 
  MainPage, 
  FooterButtons, 
  SidebarWorkflows, 
  SidebarElements, 
  DynamicRoutes
};
