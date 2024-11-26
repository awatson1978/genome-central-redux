Package.describe({
    name: 'awatson:genome-central-redux',
    version: '0.7.0',
    summary: 'Q4 Moonshot',
    git: 'https://github.com/awatson/genome-central-redux',
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
    // UChicago MSBI
    "bedjs": "1.0.3",
    "biojs-alg-seqregion": "0.1.1",
    "bionode-sam": "1.0.1",
    "blastjs": "1.6.7",
    "d3": "7.9.0",
    "object-path": "0.11.8",
    "onecolor": "4.1.0",
    "xml2js": "0.6.2",

    // Fillbot AI
    "@langchain/core": "0.1.17",
    "@langchain/openai": "0.0.28",
    "gpt-tokens": "1.3.4",

    // Protein LLMs
    "transformersjs": "1.1.0",
    "js-pytorch": "0.7.2",
    "ndarray-js": "1.0.3",
    "jpandas": "2.0.0",

    // for using numpy, sklearn, etc
    "pymport": "1.5.1",

})