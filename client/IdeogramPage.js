import React from 'react';
import ReactDom from 'react-dom';

import { GlassCard } from '/imports/ui/components/GlassCard';
import { VerticalCanvas } from '/imports/ui/components/VerticalCanvas';
import { CardTitle, CardText } from 'material-ui/Card';
import { Karyotype } from '/imports/ui/components/IdeogramComponent';


export class KaryotypePage extends React.Component {
  constructor(props) {
    super(props);
  }

  render(){
    return(
      <div id="IdeogramPage">
        <VerticalCanvas >
          <GlassCard>
            <CardText>
              <Karyotype />
            </CardText>
          </GlassCard>
        </VerticalCanvas>
      </div>
    );
  }
}


