Package.describe({
    name: 'mitre:patient-chart-starter',
    version: '0.6.0',
    summary: 'Q4 Moonshot',
    git: 'https://gitlab.mitre.org/awatson/patient-chart-starter',
    documentation: 'README.md'
});
  
Package.onUse(function(api) {
    api.versionsFrom('3.0');
    
    api.use('meteor');
    api.use('webapp');
    api.use('ecmascript');
    api.use('react-meteor-data');
    api.use('session');
    api.use('mongo');    
    api.use('http');    
    

    api.addFiles('lib/Helpers.js', 'client');

    api.addFiles('lib/collections.js');

    api.addFiles('server/methods.js', 'server');

    api.addFiles('assets/asclepius.png', "client", {isAsset: true});    
    api.addFiles('assets/knowledge-graph-sidebar.jpg', "client", {isAsset: true});    
    
    api.mainModule('index.jsx', 'client');
});


Npm.depends({
    "@langchain/core": "0.1.17",
    "@langchain/openai": "0.0.28",
    "gpt-tokens": "1.3.4"
})