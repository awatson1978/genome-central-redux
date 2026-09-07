// extensions/genome-central-redux/client/GenomicsProfilePanel.jsx
//
// Embeddable genome panel for the host's /my-profile Genomics card. Mounted
// cross-package via Package['@orbital/genome-central'].GenomicsProfilePanel
// (same contract as GenomicsImportPanel ↔ data-importer), so all genomics
// logic stays in this extension.
//
// Renders the full karyotype ideogram whenever the patient's summary tracks
// (GenomeAnnotationSets) exist, with the MyGenotype single-occupancy cache
// surfaced as a status chip + CLEAR / LOAD controls:
//   CLEAR — unload the ~552K SNP rows; summaries, MolecularSequence /
//           DocumentReference records, and the raw GridFS file are kept.
//   LOAD  — re-parse the retained raw 23andMe txt from GridFS back into the
//           cache (polls genomics.getImportStatus while the worker runs).
// Renders nothing when the patient has no tracks — the host card's sequence
// rows / add-row remain the whole card.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { get } from 'lodash';
import { Meteor } from 'meteor/meteor';

import { Karyotype } from './IdeogramComponent';
import { resolveChromosomalSex } from '../lib/resolveChromosomalSex';
import annotationBuilders from '../lib/buildAnnotationSets';

const POLL_INTERVAL_MS = 1500;

function formatCount(value) {
  const number = Number(value) || 0;
  return number.toLocaleString();
}

export function GenomicsProfilePanel(props) {
  const patientIds = useMemo(function() {
    return (props.patientIds || []).filter(Boolean).filter(function(id, index, ids) {
      return ids.indexOf(id) === index;
    });
  }, [(props.patientIds || []).join(',')]);
  const patient = props.patient || null;
  const isDark = Boolean(props.isDark);

  const [annotationSets, setAnnotationSets] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingRun, setLoadingRun] = useState(null); // { importRunId, parsedLines }
  const [actionError, setActionError] = useState('');
  const pollTimerRef = useRef(null);

  useEffect(function() {
    return function() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // Annotation sets are stamped with whichever patient-id alias the upload
  // used, so try each alias sequentially (never $or — id-lookup rule).
  const fetchAnnotationSets = useCallback(async function() {
    for (let i = 0; i < patientIds.length; i++) {
      try {
        const result = await Meteor.rpc('genomics.getAnnotationSets', { patientId: patientIds[i] });
        if (get(result, 'notable') || get(result, 'density')) {
          setAnnotationSets(result);
          return;
        }
      } catch (error) {
        console.warn('[GenomicsProfilePanel] getAnnotationSets failed:', error.message);
      }
    }
    setAnnotationSets(null);
  }, [patientIds.join(',')]);

  const fetchCacheStatus = useCallback(async function() {
    if (!patientIds.length) {
      setCacheStatus(null);
      return;
    }
    try {
      const status = await Meteor.rpc('genomics.getCacheStatus', { patientIds: patientIds });
      setCacheStatus(status);
    } catch (error) {
      // Older server build without the cache methods — hide the controls.
      console.warn('[GenomicsProfilePanel] getCacheStatus failed:', error.message);
      setCacheStatus(null);
    }
  }, [patientIds.join(',')]);

  useEffect(function() {
    fetchAnnotationSets();
    fetchCacheStatus();
  }, [fetchAnnotationSets, fetchCacheStatus]);

  async function handleClearConfirmed() {
    setConfirmClearOpen(false);
    setClearing(true);
    setActionError('');
    try {
      await Meteor.rpc('genomics.clearGenotypeCache', {});
      await fetchCacheStatus();
    } catch (error) {
      setActionError(error.reason || error.message || 'Clear failed');
    } finally {
      setClearing(false);
    }
  }

  function pollLoadStatus(importRunId) {
    pollTimerRef.current = setInterval(async function() {
      try {
        const status = await Meteor.rpc('genomics.getImportStatus', { importRunId: importRunId });
        const phase = get(status, 'status');
        if (phase === 'completed' || phase === 'failed' || phase === 'not-found') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setLoadingRun(null);
          if (phase === 'failed') {
            setActionError(get(status, 'error') || 'Genome reload failed');
          }
          await fetchCacheStatus();
          await fetchAnnotationSets();
        } else {
          setLoadingRun({ importRunId: importRunId, parsedLines: get(status, 'progress.parsedLines', 0) });
        }
      } catch (pollError) {
        // Transient poll errors are non-fatal; keep polling
        console.warn('[GenomicsProfilePanel] Poll error:', pollError.message);
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleLoad() {
    setActionError('');
    try {
      const result = await Meteor.rpc('genomics.loadGenotypeCache', { patientIds: patientIds });
      const importRunId = get(result, 'importRunId');
      setLoadingRun({ importRunId: importRunId, parsedLines: 0 });
      pollLoadStatus(importRunId);
    } catch (error) {
      setActionError(error.reason || error.message || 'Load failed');
    }
  }

  // Merge both tracks into one raw-annots object (same shape IdeogramPage
  // feeds the karyotype). Memoized — these are Karyotype effect deps.
  const mergedAnnotations = useMemo(function() {
    if (!annotationSets) {
      return null;
    }
    const sets = [];
    if (get(annotationSets, 'notable')) {
      sets.push(annotationSets.notable);
    }
    if (get(annotationSets, 'density')) {
      sets.push(annotationSets.density);
    }
    return annotationBuilders.mergeAnnotationSets(sets);
  }, [annotationSets]);

  const annotationTracks = useMemo(function() {
    return [
      { id: 'notableTrack', displayName: 'Clinically notable markers', color: annotationBuilders.NOTABLE_COLOR, shape: 'triangle' },
      { id: 'densityTrack', displayName: 'SNP density (5Mb bins)', color: annotationBuilders.DENSITY_COLOR, shape: 'rect' }
    ];
  }, []);

  const assembly = mergedAnnotations
    ? get(annotationSets, 'notable.assembly', get(annotationSets, 'density.assembly', 'GRCh37'))
    : null;

  const sex = useMemo(function() {
    return resolveChromosomalSex(patient);
  }, [patient]);

  // No summary tracks → nothing to show; the host card stands alone.
  if (!mergedAnnotations) {
    return null;
  }

  const loadedForPatient = Boolean(get(cacheStatus, 'loadedForPatient'));
  const canReload = Boolean(get(cacheStatus, 'canReload'));
  const rowCount = get(cacheStatus, 'rowCount', 0);
  const snpCount = get(annotationSets, 'notable.totals.snpCount',
    get(annotationSets, 'density.totals.snpCount', 0));

  let statusLabel = 'Summary only';
  if (loadingRun) {
    statusLabel = 'Loading genome · ' + formatCount(get(loadingRun, 'parsedLines', 0)) + ' rows';
  } else if (loadedForPatient) {
    statusLabel = 'Full genome loaded · ' + formatCount(rowCount) + ' SNPs';
  } else if (rowCount > 0) {
    statusLabel = 'Cache holds another patient’s genome';
  }

  return (
    <Box id="genomicsProfilePanel" sx={{ px: '14px', pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '6px' }}>
        <Typography
          id="genomicsCacheStatusChip"
          sx={{
            fontSize: 11,
            color: loadedForPatient ? 'var(--pf-accent)' : 'var(--pf-ink-dim)',
            border: '1px solid var(--pf-line)',
            borderRadius: '999px',
            p: '2px 10px',
            whiteSpace: 'nowrap'
          }}
        >
          {statusLabel}
        </Typography>
        {loadingRun && (
          <CircularProgress size={14} sx={{ color: 'var(--pf-ink-dim)' }} />
        )}
        <Box sx={{ flex: 1 }} />
        {!loadingRun && canReload && !loadedForPatient && (
          <Button
            size="small"
            variant="outlined"
            id="genomicsLoadCacheButton"
            onClick={handleLoad}
            sx={{ fontSize: 11, p: '3px 8px', borderRadius: '8px', color: 'var(--pf-ink-mid)', borderColor: 'var(--pf-line)' }}
          >
            Load
          </Button>
        )}
        {!loadingRun && rowCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            id="genomicsClearCacheButton"
            disabled={clearing}
            onClick={function() { setConfirmClearOpen(true); }}
            sx={{ fontSize: 11, p: '3px 8px', borderRadius: '8px', color: 'var(--pf-ink-mid)', borderColor: 'var(--pf-line)' }}
          >
            {clearing ? 'Clearing…' : 'Clear'}
          </Button>
        )}
      </Box>

      {actionError && (
        <Typography sx={{ fontSize: 12, color: 'error.main', pb: '4px' }}>
          {actionError}
        </Typography>
      )}

      <Karyotype
        isDark={isDark}
        sex={sex}
        annotations={mergedAnnotations}
        annotationTracks={annotationTracks}
        annotationsLayout="tracks"
        assembly={assembly}
      />
      {snpCount > 0 && (
        <Typography sx={{ fontSize: 11, color: 'var(--pf-ink-dim)', pt: '2px' }}>
          {formatCount(snpCount)} variant calls · {assembly || 'GRCh37'} · 23andMe genotyping array
        </Typography>
      )}

      <Dialog open={confirmClearOpen} onClose={function() { setConfirmClearOpen(false); }}>
        <DialogTitle>Unload full genome?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14 }}>
            This removes the {formatCount(rowCount)} SNP rows from the local genome
            cache. Summaries, sequence records, and the raw genotype file are
            kept — you can reload the full genome later with the LOAD button.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button id="genomicsClearCancelButton" onClick={function() { setConfirmClearOpen(false); }}>
            Cancel
          </Button>
          <Button id="genomicsClearConfirmButton" color="error" onClick={handleClearConfirmed}>
            Clear cache
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GenomicsProfilePanel;
