# mitre:q4-moonshot

![PatientChartScreencapture](https://gitlab.mitre.org/awatson/q4-moonshot/-/raw/main/PatientChartScreencapture.png?ref_type=heads')




#### Run Node on FHIR with your plugin  


```bash
# install the meteor compiler; this will take care of node, nvm, npm, yarn, etc.
# it will also set up debugging tools, a compiler build tool, etc
NODE_EXTRA_CA_CERTS=~/MITRE-chain.pem npm install -g meteor

# download the node-on-fhir application
git clone https://gitlab.mitre.org/awatson/honeycomb3
cd honeycomb3

# install dependencies
NODE_EXTRA_CA_CERTS=~/MITRE-chain.pem CAFILE=~/MITRE-chain.pem meteor npm install

# alternative, use yarn if you'd like a more modern package manager
meteor yarn install

# run the application in local development mode
# this will automatically launch a mongo instance
CAFILE=~/MITRE-chain.pem meteor run --settings configs/settings.honeycomb.localhost.json 

# can we get to the FHIR server yet?
open http://localhost:3000/metadata

# stop the application with Ctrl-C

# now try running it with some server configs
CAFILE=~/MITRE-chain.pem meteor run --settings configs/settings.fhir.server.json 

# does it run?  can we get to the FHIR server?  To the Patient route?
open http://localhost:3000/baseR4/metadata
open http://localhost:3000/baseR4/Patient

# stop the application with Ctrl-C

# download custom packages
cd packages
git clone https://gitlab.mitre.org/awatson/q4-moonshot
meteor add mitre:q4-moonshot

# optionally, you may also wish to add the following:  
git clone https://github.com/symptomatic/data-importer
meteor add symptomatic:data-importer

# after adding the plugin, you can simply run the following
cd ../..
CAFILE=~/MITRE-chain.pem meteor run --settings configs/settings.moonshot.json 

