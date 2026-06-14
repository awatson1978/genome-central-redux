// npmPackages/genome-central-redux/server.js
//
// Server entry — re-exports the genome-central-redux server module (collections
// + methods). No discoverable Package-registry symbols (ProfileSet etc.);
// registers as Package['@node-on-fhir/genome-central-redux'] = {} — harmless.

export * from './server/index.js';
