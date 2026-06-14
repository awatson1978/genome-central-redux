// npmPackages/genome-central-redux/server/index.js
//
// Server entry — loads the collections registration + Meteor methods as
// side-effect imports (were api.addFiles in the Atmosphere package.js).
// Re-exported through ../server.js so the generated server-loader can
// namespace-import it (Package registry).

import '../lib/collections.js';
import './methods.js';

console.log('[genome-central-redux] Server methods registered');
