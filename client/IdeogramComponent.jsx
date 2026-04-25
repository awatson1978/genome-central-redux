// packages/genome-central-redux/client/IdeogramComponent.jsx
import React, { useEffect, useRef } from 'react';
import Ideogram from 'ideogram';

var DARK_MODE_CSS = [
  '#ideogram .gneg { fill: #2a2a2a !important; }',
  '#ideogram .gpos25 { fill: #555 !important; }',
  '#ideogram .gpos33 { fill: #666 !important; }',
  '#ideogram .gpos50 { fill: #888 !important; }',
  '#ideogram .gpos66 { fill: #AAA !important; }',
  '#ideogram .gpos75 { fill: #BBB !important; }',
  '#ideogram .gpos100 { fill: #EEE !important; }',
  '#ideogram .acen { fill: rgba(180,60,60,0.6) !important; }',
  '#ideogram .stalk { fill: rgba(80,80,120,0.6) !important; }',
  '#ideogram .gvar { fill: rgba(70,70,130,0.6) !important; }',
  '#ideogram text { fill: #FFF !important; }',
  '#ideogram path, #ideogram rect { stroke: #888 !important; }'
].join('\n');

export function Karyotype(props) {
  var isDark = props.isDark;
  var sex = props.sex || 'female';
  var ideogramRef = useRef(null);
  var styleRef = useRef(null);

  useEffect(function() {
    // Remove any previously injected style
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }

    ideogramRef.current = new Ideogram({
      organism: 'human',
      sex: sex,
      container: '#ideogram',
      onLoad: function() {
        if (isDark) {
          var styleEl = document.createElement('style');
          styleEl.setAttribute('data-ideogram-dark', 'true');
          styleEl.textContent = DARK_MODE_CSS;
          document.head.appendChild(styleEl);
          styleRef.current = styleEl;
        }
      }
    });

    return function() {
      var container = document.querySelector('#ideogram');
      if (container) {
        container.innerHTML = '';
      }
      ideogramRef.current = null;
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [isDark, sex]);

  return <div id='ideogram' style={{ minHeight: '600px', display: 'flex', justifyContent: 'center' }} />;
}
