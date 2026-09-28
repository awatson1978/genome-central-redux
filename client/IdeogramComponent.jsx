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
  // Arrange chromosomes into N rows (ideogram's `rows` config) — narrow hosts
  // like the Chronicle panel use 2 so the karyotype fits without heavy shrinking.
  var rows = props.rows || null;
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
    var resizeObserver = null;
    var fitRafId = null;

    // Remove any previously injected style
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }

    // Scale the karyotype to the container — DOWN uniformly when the content
    // overflows (narrow hosts like the Chronicle Genomics panel or the
    // /my-profile card), and up on X only (capped) to spread spacing in wide
    // hosts. Runs on load AND from a ResizeObserver, because a one-shot
    // measurement at onLoad can catch the host mid-flex-layout and fit to a
    // stale width.
    function fitKaryotype() {
      var container = containerRef.current;
      if (!container) { return; }
      var innerWrap = container.querySelector('#_ideogramInnerWrap');
      var middleWrap = container.querySelector('#_ideogramMiddleWrap');
      if (!innerWrap) { return; }

      innerWrap.style.maxWidth = 'none';
      innerWrap.style.position = 'relative';
      // Force single-line layout so scrollWidth reports the true karyotype
      // width even when the host is narrower than the content.
      innerWrap.style.width = 'max-content';
      innerWrap.style.whiteSpace = 'nowrap';

      var contentWidth = innerWrap.scrollWidth;
      var containerWidth = container.clientWidth;
      if (contentWidth <= 0 || containerWidth <= 0) { return; }

      var scale = Math.min(2.5, containerWidth / contentWidth);
      if (scale < 0.98) {
        // Shrink UNIFORMLY — scaleX-only here squishes the chromosomes
        // into each other.
        innerWrap.style.transform = 'scale(' + scale.toFixed(3) + ')';
        innerWrap.style.transformOrigin = 'left top';
      } else if (scale > 1.05) {
        // Grow on X only — spreads chromosome spacing to fill wide hosts
        // without ballooning the height.
        innerWrap.style.transform = 'scaleX(' + scale.toFixed(3) + ')';
        innerWrap.style.transformOrigin = 'left top';
      } else {
        innerWrap.style.transform = '';
      }

      // A transform doesn't shrink LAYOUT height — reclaim the dead space so
      // the host doesn't reserve/scroll the karyotype's unscaled height.
      if (middleWrap) {
        var rect = innerWrap.getBoundingClientRect();
        if (rect.height > 0) {
          middleWrap.style.height = Math.ceil(rect.height) + 'px';
        }
      }
    }

    function scheduleFit() {
      if (fitRafId) { cancelAnimationFrame(fitRafId); }
      fitRafId = requestAnimationFrame(function() {
        fitRafId = null;
        fitKaryotype();
      });
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
          if (cancelled) { return; }
          if (isDark) {
            var styleEl = document.createElement('style');
            styleEl.setAttribute('data-ideogram-dark', 'true');
            styleEl.textContent = DARK_MODE_CSS;
            document.head.appendChild(styleEl);
            styleRef.current = styleEl;
          }

          fitKaryotype();

          // Re-fit as the host settles/changes size (flex layout finishing,
          // panel toggles, window resizes). rAF-coalesced to avoid observer
          // feedback loops.
          if (typeof ResizeObserver !== 'undefined' && containerRef.current && !resizeObserver) {
            resizeObserver = new ResizeObserver(scheduleFit);
            resizeObserver.observe(containerRef.current);
          }
        },
        onLoadError: function(error) {
          console.error('[IdeogramComponent] Failed to load ideogram:', error);
        }
      };

      if (assembly) {
        config.assembly = assembly;
      }
      if (rows) {
        config.rows = rows;
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
      if (fitRafId) {
        cancelAnimationFrame(fitRafId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
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
  }, [isDark, sex, annotations, annotationTracks, annotationsLayout, assembly, rows]);

  // overflowX hidden: transform scale doesn't shrink LAYOUT width, so without
  // it a scaled-down karyotype still forces a horizontal scrollbar.
  // minHeight is a loading placeholder (prevents layout jump); hosts with a
  // small fixed region (Chronicle Genomics panel) pass a smaller value.
  var minHeight = props.minHeight != null ? props.minHeight : 600;
  return <div id='ideogram' ref={containerRef} style={{ minHeight: minHeight + 'px', width: '100%', overflowX: 'hidden' }} />;
}
