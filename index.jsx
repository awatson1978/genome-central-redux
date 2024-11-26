import React from 'react';

// import GenomeChart from './client/GenomeChart';
import IdeogramPage from './client/IdeogramPage';


import { 
  GenomeChartButtons
} from './client/FooterButtons';

// let FooterButtons = [{
//   pathname: '/patient-chart',
//   element: <GenomeChartButtons />
// }];

var DynamicRoutes = [{
  'name': 'Ideogram Page',
  'path': '/ideogram-page',
  'element': <IdeogramPage />
}];

var SidebarElements = [];

let SidebarWorkflows = [{ 
  'primaryText': 'International Patient Summary',
  'to': '/patient-chart',
  'href': '/patient-chart'
}];



const MainPage = {
  'name': 'Patient Chart',
  'path': '/',
  'element': <GenomeChart />
};

export { 
  MainPage, 
  // FooterButtons, 
  SidebarWorkflows, 
  SidebarElements, 
  DynamicRoutes
};
