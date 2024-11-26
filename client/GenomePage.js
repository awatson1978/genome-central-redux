import React  from 'react';
import ReactMixin  from 'react-mixin';
import { ReactMeteorData } from 'meteor/react-meteor-data';

import { Tabs, Tab } from 'material-ui/Tabs';
import { GlassCard } from '/imports/ui/components/GlassCard';
import { DynamicSpacer }  from '/imports/ui/components/DynamicSpacer';
import { VerticalCanvas } from '/imports/ui/components/VerticalCanvas';
import { Table } from 'react-bootstrap';
import FloatingActionButton from 'material-ui/FloatingActionButton';

import { Meteor } from 'meteor/meteor';
import Glass from '/imports/ui/Glass';
import Spacer from '/imports/ui/components/Spacer';

import { DataDropzone } from '/imports/ui/components/DataDropzone';
import { browserHistory } from 'react-router';
import { CardTitle } from 'material-ui/Card';

import { Karyotype } from '/imports/ui/components/IdeogramComponent';

Session.setDefault('snipPageTabIndex', 1);
Session.setDefault('snipSearchFilter', '');
Session.setDefault('selectedSnip', false);
Session.setDefault('selectedChromosome', '');

export class GenomePage extends React.Component {
  getMeteorData() {
    let data = {
      style: {
        opacity: Session.get('globalOpacity'),
        tab: {
          borderBottom: '1px solid lightgray',
          borderRight: 'none'
        },
        chromosomeButton: {
          color: 'white',
          marginRight: '5px',
          height: '30px',
          width: '30px',
          backgroundColor: 'gray'
        },
        selectedChromosome: {
          position: 'absolute',
          color: 'white',
          top: '80px',
          left: '-80px',
          height: '64px',
          width: '64px',
          fontSize: '36px',
          backgroundColor: 'gray'          
        },
        selectedChromosomeIcon: {
          color: 'white',
          width: '64px',
          fontSize: '36px',
          backgroundColor: 'gray'          
        }
      },
      state: {
        isLoggedIn: false
      },
      genotype: [],
      tabIndex: Session.get('snipPageTabIndex'),
      selectedChromosome: Session.get('selectedChromosome'),
      snipSearchFilter: Session.get('snipSearchFilter'),
      currentSnip: Session.get('selectedSnip'),
      hasData: true
    };

    if (MyGenotype.find({chromosome: parseInt(Session.get('selectedChromosome'))}).count() > 0) {
      data.genotype = MyGenotype.find().fetch();
      data.hasData = true;
    } else {
      data.hasData = false;      
    }

    if (Meteor.user()) {
      data.state.isLoggedIn = true;
    }

    data.style = Glass.blur(data.style);
    data.style.appbar = Glass.darkroom(data.style.appbar);
    data.style.tab = Glass.darkroom(data.style.tab);

    if(process.env.NODE_ENV === "test") console.log("GenomePage[data]", data);
    return data;
  }

  // this could be a mixin
  handleTabChange(index){
    Session.set('snipPageTabIndex', index); }

  // this could be a mixin
  onNewTab(){
    console.log("onNewTab; we should clear things...");

    Session.set('selectedSnip', false);
    Session.set('snipDetailState', false);
  }

  onRowClick(marker){
    // console.log(marker);
    // location.assign('https://www.ncbi.nlm.nih.gov/SNP/snp_ref.cgi?rs=' + marker);
    Session.set('iFrameLocation', 'https://www.ncbi.nlm.nih.gov/SNP/snp_ref.cgi?rs=' + marker);
  }
  clickChromosome(selectedChromosome){
    console.log('selectedChromosome', selectedChromosome);
    Session.set('selectedChromosome', selectedChromosome);
  }

  renderHeader(hasData){
    if(hasData){
      return (
        <div>
          <GlassCard>
            <CardTitle
              title='My Karyotype'
            />
          </GlassCard>
          <Spacer />          

          <GlassCard>
            <Karyotype />
          </GlassCard>
        </div>
      );
    } else {
      return (
        <DataDropzone />
      );
    }
  }

  render() {
    let geneRows = [];
    for (var i = 0; i < this.data.genotype.length; i++) {
      geneRows.push(
        <tr key={i} className='geneRow' onClick={this.onRowClick.bind('this', this.data.genotype[i].marker )} style={{cursor: 'pointer'}}>
          <td className="marker">{this.data.genotype[i].marker}</td>
          <td className="chromosome">{this.data.genotype[i].chromosome}</td>
          <td className="position">{this.data.genotype[i].position}</td>
          <td className="genotype">{this.data.genotype[i].genotype}</td>
        </tr>
      );
    }

    return (
      <div id="genomePage">
      <VerticalCanvas>
          <FloatingActionButton secondary={true} mini={true} iconStyle={this.data.style.selectedChromosomeIcon} style={this.data.style.selectedChromosome}>{this.data.selectedChromosome}</FloatingActionButton>
          { this.renderHeader(this.data.hasData)}
          <Spacer />          

          <GlassCard>
            <CardTitle
              title="My Genome"
            />
            <CardTitle>
              <div style={{textAlign: 'center'}}>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '1')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>1</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '2')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>2</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '3')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>3</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '4')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>4</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '5')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>5</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '6')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>6</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '7')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>7</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '8')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>8</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '9')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>9</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '10')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>10</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '11')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>11</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '12')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>12</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '13')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>13</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '14')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>14</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '15')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>15</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '16')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>16</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '17')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>17</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '18')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>18</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '19')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>19</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '20')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>20</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '21')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>21</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, '22')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>22</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, 'X')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>X</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, 'Y')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>Y</FloatingActionButton>
                <FloatingActionButton onClick={this.clickChromosome.bind(this, 'MT')} secondary={true} mini={true} iconStyle={this.data.style.chromosomeButton} style={this.data.style.chromosomeButton}>MT</FloatingActionButton>
              </div>
              <br />
              <br />
              <Table id="medicationsTable" responses hover >
                <thead>
                  <tr>
                    <th className="marker">marker</th>
                    <th className="chromosome">chromosome</th>
                    <th className="position">position</th>
                    <th className="genotype">genotype</th>
                  </tr>
                </thead>
                <tbody>
                  { geneRows }
                </tbody>
              </Table>

            </CardTitle>
          </GlassCard>
        </VerticalCanvas>
      </div>
    );
  }
}



ReactMixin(GenomePage.prototype, ReactMeteorData);
