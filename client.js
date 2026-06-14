// npmPackages/genome-central-redux/client.js
//
// Client entry — Genome Central (chromosome ideogram browser + AI genome chart).
// Migrated from packages/genome-central-redux (Atmosphere awatson:genome-central-redux)
// 2026-06-14. This is the former index.jsx plus a WorkflowRegistry default export.
//
// Note: the legacy v0.x material-ui + react-mixin/getMeteorData files
// (GenomePage.js, Karyotype.js, client/risk-assessments/*) are NOT in this
// import graph (nothing the entry reaches imports them), so Rspack does not
// bundle them — they remain in the package as dormant legacy code and do not
// need the v0.x→v5 port. The live graph is GenomeChart + IdeogramPage
// (→ IdeogramComponent / ideogram) + FooterButtons.

import React from 'react';

import GenomeChart from './client/GenomeChart';
import IdeogramPage from './client/IdeogramPage';

import {
  GenomeChartButtons
} from './client/FooterButtons';

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
  SidebarWorkflows,
  SidebarElements,
  DynamicRoutes
};

export default {
  name: 'genome-central-redux',
  routes: DynamicRoutes,
  sidebarItems: SidebarWorkflows
};
