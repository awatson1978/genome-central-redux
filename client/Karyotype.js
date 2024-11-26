// import React from 'react';
// import ReactMixin from 'react-mixin';
// import ReactDom from 'react-dom';
// import { ReactMeteorData } from 'meteor/react-meteor-data';

// import { Meteor } from 'meteor/meteor';

// // NOTE:  This component includes a Portal, which means that we're going to be doing DOM manipulation
// // with an external Javascript library.  This component does NOT follow the typical Meteor/React pattern
// //
// // https://github.com/ryanflorence/react-training/blob/gh-pages/lessons/05-wrapping-dom-libs.md

// //const Karyotype = React.createClass({
// export const Karyotype extends React.Component {
//   render () {
//     return(
//       <div id='#ideogram' />
//     );
//   }
//   getMeteorData() {
//     let data = {
//       genes: []
//     };

//     if (Session.get('bedFile')) {
//       data.genes = Session.get('bedFile');
//     }
//     return data;
//   }  
//   componentDidMount() {
//     // var node = this.getDOMNode();
//     var node = ReactDom.findDOMNode(this);

//     // var ideogram = new Karyotype({
//     //   organism: "human",
//     //   container: "#ideogram",
//       // annotations: [{
//       //   "name": "BRCA1",
//       //   "chr": "17",
//       //   "start": 43044294,
//       //   "stop": 43125482
//       // }]
//     // });

//     var config = {
//       organism: "human",
//       container: "#ideogram",
//       annotations: this.props.genes
//     };

//     // var ideogram;
//     // Tracker.autorun(function(){
//     //   if (Session.get('bedFile')){
//     //     var genes = Session.get('bedFile');
//     //     genes.forEach(function(gene){
//     //       config.annotations.push({
//     //         name: gene.name,
//     //         chr: gene.chrom,
//     //         start: parseInt(gene.chromStart),
//     //         stop: parseInt(gene.chromEnd)
//     //       });
//     //     });        

//     //     console.log('Karyotype', Session.get('bedFile'));
//     //     console.log('config', config);

//     //     ideogram = new Karyotype(config);
//     //   }
//     // });

//     // console.log('this.props.genes', this.props.genes);

//     // if(this.props.genes){
//     //   this.props.genes.forEach(function(gene){
//     //     config.annotations.push({
//     //       name: gene.name,
//     //       chr: gene.chrom,
//     //       start: parseInt(gene.chromStart),
//     //       stop: parseInt(gene.chromEnd)
//     //     });
//     //   });
//     // } else {
//     //   config.annotations = [{
//     //     "name": "BRCA1",
//     //     "chr": "17",
//     //     "start": 43044294,
//     //     "stop": 43125482
//     //   }]
//     // }

//     console.log('Karyotype', Session.get('bedFile'));
//     console.log('config', config);

//     ideogram = new Karyotype(config);


//     // start a new React render tree with our node and the children
//     // passed in from above, this is the other side of the portal.
//     ReactDOM.render(<div>{this.props.children}</div>, node);
//   }
// };


// ReactMixin(Karyotype.prototype, ReactMeteorData);


