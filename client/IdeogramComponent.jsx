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
  // Optional annotation support (ideogram raw-annots format from
  // lib/buildAnnotationSets.js). Parent should memoize `annotations` /
  // `annotationTracks` — they are effect dependencies.
  var annotations = props.annotations || null;
  var annotationTracks = props.annotationTracks || null;
  var annotationsLayout = props.annotationsLayout || 'tracks';
  var assembly = props.assembly || null;
  var ideogramRef = useRef(null);
  var styleRef = useRef(null);
  var containerRef = useRef(null);

  // Ideogram attaches a click handler to every annotation but only assigns
  // onClickAnnotCallback when the config provides onClickAnnot — clicking a
  // marker without one throws "this.onClickAnnotCallback is not a function".
  // Ride the prop through a ref so handler-identity changes never re-init
  // the whole karyotype.
  var onAnnotClickRef = useRef(null);
  onAnnotClickRef.current = props.onAnnotClick || null;

  useEffect(function() {
    var cancelled = false;
    var rafId = null;

    // Remove any previously injected style
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }

    // The ideogram library resolves its container with
    // document.querySelector('#ideogram') synchronously in its constructor.
    // If this effect fires while the div is not (yet) attached to the document
    // — route transitions, suspense retries, HMR remounts — the constructor
    // dies with "Cannot read properties of null (reading 'getBoundingClientRect')".
    // Defer construction until the container is genuinely connected.
    function initIdeogram() {
      if (cancelled) { return; }
      var containerEl = containerRef.current;
      if (!containerEl || !containerEl.isConnected) {
        rafId = requestAnimationFrame(initIdeogram);
        return;
      }
      constructIdeogram();
    }

    function constructIdeogram() {
      var config = {
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

          // Scale karyotype to fill container width
          var container = containerRef.current;
          if (container) {
            var innerWrap = document.getElementById('_ideogramInnerWrap');
            if (innerWrap) {
              innerWrap.style.maxWidth = 'none';
              innerWrap.style.position = 'relative';

              var contentWidth = innerWrap.scrollWidth;
              var containerWidth = container.clientWidth;

              if (contentWidth > 0 && containerWidth > contentWidth) {
                var scaleX = Math.min(2.5, containerWidth / contentWidth);
                if (scaleX > 1.05) {
                  innerWrap.style.transform = 'scaleX(' + scaleX.toFixed(3) + ')';
                  innerWrap.style.transformOrigin = 'left top';
                }
              }
            }
          }
        },
        onLoadError: function(error) {
          console.error('[IdeogramComponent] Failed to load ideogram:', error);
        }
      };

      if (assembly) {
        config.assembly = assembly;
      }
      if (annotations && Array.isArray(annotations.annots) && annotations.annots.length > 0) {
        config.annotations = annotations;
        config.annotationsLayout = annotationsLayout;
        config.annotationHeight = 3;
        if (annotationsLayout === 'tracks' && Array.isArray(annotationTracks)) {
          config.annotationTracks = annotationTracks;
        }
        config.onClickAnnot = function(annot) {
          if (onAnnotClickRef.current) {
            onAnnotClickRef.current(annot);
          }
        };
      }

      ideogramRef.current = new Ideogram(config);
    }

    initIdeogram();

    return function() {
      cancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      var container = document.querySelector('#ideogram');
      if (container) {
        container.replaceChildren();
      }
      ideogramRef.current = null;
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [isDark, sex, annotations, annotationTracks, annotationsLayout, assembly]);

  return <div id='ideogram' ref={containerRef} style={{ minHeight: '600px', width: '100%' }} />;
}
