// extensions/genome-central-redux/client/GenomicsImportPanel.jsx
//
// Import card for 23andMe raw genotype exports. Sniffs the file header
// client-side, offers the shared de-identification controls (anonymous
// patient reassignment), uploads via Meteor.rpc, then polls the deferred
// import's progress until the annotation tracks are ready.

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, AlertTitle, Box, Button, Card, CardContent, CardHeader,
  Divider, LinearProgress, TextField, Typography
} from '@mui/material';
import BiotechIcon from '@mui/icons-material/Biotech';
import { get } from 'lodash';
import { useTracker } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';

import FhirDeidentifyControls from '/imports/ui/components/FhirDeidentifyControls';
import { DEFAULT_FHIR_DEID_CONTROLS } from '/imports/lib/FhirDeidentify';

import parse23andMe from '../lib/parse23andMe';

// name[0].text with a given+family fallback (Synthea patients sometimes
// carry only the structured parts).
function patientDisplayName(patient) {
  const text = get(patient, 'name.0.text', '');
  if (text) {
    return text;
  }
  const given = get(patient, 'name.0.given', []);
  const family = get(patient, 'name.0.family', '');
  return ((Array.isArray(given) ? given.join(' ') : '') + ' ' + family).trim();
}

const POLL_INTERVAL_MS = 2000;
// Rough bytes-per-line for a 23andMe export; drives the determinate progress
// estimate (parsedLines * BYTES_PER_LINE / totalBytes).
const APPROX_BYTES_PER_LINE = 24;

export function GenomicsImportPanel(props) {
  const onImportComplete = props.onImportComplete;
  // Optional: a File handed in by another surface (data-importer's /import-data
  // drop zone) — adopted as if chosen through the file input.
  const initialFile = props.initialFile;

  const [selectedFile, setSelectedFile] = useState(null);
  const [sniffResult, setSniffResult] = useState(null); // null | true | false
  const [deidControls, setDeidControls] = useState(DEFAULT_FHIR_DEID_CONTROLS);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [importError, setImportError] = useState('');
  const [completedCounts, setCompletedCounts] = useState(null);
  const pollTimerRef = useRef(null);

  // FASTQ reference-only section. Tri-state settings gate:
  // null = checking, true = enabled, false = disabled.
  const [localRefEnabled, setLocalRefEnabled] = useState(null);
  const [fastqPathsText, setFastqPathsText] = useState('');
  const [referencing, setReferencing] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const [referenceResult, setReferenceResult] = useState(null);

  const patient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

  useEffect(function() {
    return function() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Settings-gated feature check (tri-state prevents UI flicker)
  useEffect(function() {
    let mounted = true;
    Meteor.rpc('genomics.checkLocalFileReferenceSetting', {})
      .then(function(result) {
        if (mounted) {
          setLocalRefEnabled(get(result, 'allowLocalFileReference', false));
        }
      })
      .catch(function(error) {
        console.warn('[GenomicsImportPanel] Local-reference setting check failed:', error.message);
        if (mounted) {
          setLocalRefEnabled(false);
        }
      });
    return function() { mounted = false; };
  }, []);

  async function handleReferenceFiles() {
    setReferenceError('');
    setReferenceResult(null);
    const paths = fastqPathsText.split('\n')
      .map(function(line) { return line.trim(); })
      .filter(Boolean);
    if (paths.length === 0) {
      return;
    }
    const patientId = get(patient, 'id');
    if (!patientId) {
      setReferenceError('No patient selected.');
      return;
    }
    setReferencing(true);
    try {
      const result = await Meteor.rpc('genomics.referenceLocalGenomicsFiles', {
        paths: paths,
        patientId: patientId,
        patientDisplay: get(patient, 'name.0.text', '')
      });
      setReferenceResult(result);
    } catch (error) {
      setReferenceError(get(error, 'reason', error.message));
    } finally {
      setReferencing(false);
    }
  }

  async function adoptFile(file) {
    setImportError('');
    setCompletedCounts(null);
    if (!file) {
      setSelectedFile(null);
      setSniffResult(null);
      return;
    }
    const headText = await file.slice(0, 2048).text();
    setSelectedFile(file);
    setSniffResult(parse23andMe.sniff23andMeHeader(headText));
  }

  async function handleFileChange(event) {
    await adoptFile(get(event, 'target.files.0'));
  }

  useEffect(function() {
    if (initialFile) {
      adoptFile(initialFile);
    }
  }, [initialFile]);

  function readFileAsBase64(file) {
    return new Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function() {
        // Strip the data-url prefix ("data:text/plain;base64,")
        const result = String(reader.result);
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = function() { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function pollStatus(importRunId) {
    pollTimerRef.current = setInterval(async function() {
      try {
        const status = await Meteor.rpc('genomics.getImportStatus', { importRunId: importRunId });
        setProgress(get(status, 'progress', null));
        if (get(status, 'status') === 'completed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setImporting(false);
          setCompletedCounts(get(status, 'resourceCounts', null));
          if (onImportComplete) {
            onImportComplete(importRunId);
          }
        } else if (get(status, 'status') === 'failed') {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setImporting(false);
          setImportError(get(status, 'error', 'Import failed'));
        }
      } catch (pollError) {
        // Transient poll errors are non-fatal; keep polling
        console.warn('[GenomicsImportPanel] Poll error:', pollError.message);
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleImport() {
    if (!selectedFile) {
      return;
    }
    setImportError('');
    setImporting(true);
    setProgress(null);
    try {
      // Resolve the target patient: anonymous reassignment wins, else the
      // selected patient (same precedence as the other importers' panels).
      let patientId = get(patient, 'id');
      let patientDisplay = patientDisplayName(patient);
      if (get(deidControls, 'deidentifyEnabled') && get(deidControls, 'assignAnonymousPatient')) {
        const anonPatient = await Meteor.rpc('patients.findOrCreateAnonymous', {});
        patientId = get(anonPatient, 'id');
        patientDisplay = get(anonPatient, 'display', 'Anonymous Patient');
      }
      if (!patientId) {
        throw new Error('No patient selected. Select a patient from the sidebar (or enable anonymous assignment).');
      }

      const fileBase64 = await readFileAsBase64(selectedFile);
      const result = await Meteor.rpc('genomics.uploadAndImport23andMe', {
        fileBase64: fileBase64,
        filename: selectedFile.name,
        patientId: patientId,
        patientDisplay: patientDisplay
      });
      pollStatus(get(result, 'importRunId'));
    } catch (error) {
      setImporting(false);
      setImportError(get(error, 'reason', error.message));
    }
  }

  const totalBytes = get(progress, 'totalBytes', 0);
  const parsedLines = get(progress, 'parsedLines', 0);
  const progressPercent = totalBytes > 0
    ? Math.min(95, Math.round((parsedLines * APPROX_BYTES_PER_LINE / totalBytes) * 100))
    : 0;

  return (
    <Card id="genomicsImportPanel" sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      <CardHeader avatar={<BiotechIcon color="primary" />} title="Import Genotype Data" />
      <CardContent>
        {!patient && !get(deidControls, 'assignAnonymousPatient') && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No patient selected. Select a patient from the sidebar, or enable
            anonymous assignment below.
          </Alert>
        )}

        <Button variant="outlined" component="label" disabled={importing} fullWidth>
          Choose 23andMe raw data (.txt)
          <input type="file" accept=".txt" hidden onChange={handleFileChange} />
        </Button>

        {selectedFile && sniffResult === false && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {selectedFile.name} does not look like a 23andMe raw genotype
            export (missing header banner / rsid column line).
          </Alert>
        )}
        {selectedFile && sniffResult === true && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) —
            23andMe raw genotype format detected.
          </Alert>
        )}

        <FhirDeidentifyControls
          value={deidControls}
          onChange={setDeidControls}
          disabled={importing}
          selectedPatientDisplay={patientDisplayName(patient)}
        />
        <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Note: raw genotypes are inherently re-identifiable. Assigning an
          anonymous patient relabels the data; it does not de-identify it.
        </Typography>

        <Button
          id="genomicsImportButton"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          disabled={importing || !selectedFile || sniffResult !== true}
          onClick={handleImport}
        >
          {importing ? 'Importing…' : 'Import SNPs'}
        </Button>

        {importing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant={parsedLines > 0 ? 'determinate' : 'indeterminate'}
              value={progressPercent}
            />
            <Typography variant="caption" color="text.secondary">
              {get(progress, 'phase') === 'finalizing'
                ? 'Building annotation tracks…'
                : parsedLines > 0
                  ? parsedLines.toLocaleString() + ' SNPs imported…'
                  : 'Uploading…'}
            </Typography>
          </Box>
        )}

        {importError && (
          <Alert severity="error" sx={{ mt: 2 }}>{importError}</Alert>
        )}
        {completedCounts && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <AlertTitle>Import complete</AlertTitle>
            {get(completedCounts, 'MyGenotype', 0).toLocaleString()} SNPs imported;
            annotation tracks, MolecularSequence, and DocumentReference created.
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Reference local WGS files (FASTQ)
        </Typography>
        {localRefEnabled === false && (
          <Alert severity="info" sx={{ mb: 1 }}>
            <AlertTitle>Local file referencing disabled</AlertTitle>
            Large sequencing files are referenced in place, never copied.
            Contact your administrator to enable it in the server settings
            (Meteor.settings.private.genomics.allowLocalFileReference).
          </Alert>
        )}
        {localRefEnabled === true && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Absolute paths, one per line. Files are referenced in place
              (path, size, sampled read stats, partial checksum) — the
              multi-gigabyte files are never copied.
            </Typography>
            <TextField
              id="fastqPathsInput"
              fullWidth
              multiline
              minRows={2}
              placeholder={'/Volumes/.../sample.1.fq.gz\n/Volumes/.../sample.2.fq.gz'}
              value={fastqPathsText}
              onChange={function(event) { setFastqPathsText(event.target.value); }}
              disabled={referencing}
              size="small"
            />
            <Button
              id="fastqReferenceButton"
              variant="outlined"
              fullWidth
              sx={{ mt: 1 }}
              disabled={referencing || fastqPathsText.trim().length === 0}
              onClick={handleReferenceFiles}
            >
              {referencing ? 'Sampling files…' : 'Reference Files'}
            </Button>
            {referencing && <LinearProgress sx={{ mt: 1 }} />}
            {referenceError && (
              <Alert severity="error" sx={{ mt: 1 }}>{referenceError}</Alert>
            )}
            {referenceResult && (
              <Alert severity="success" sx={{ mt: 1 }}>
                <AlertTitle>Files referenced</AlertTitle>
                {get(referenceResult, 'files', []).map(function(file) {
                  return (
                    <Typography key={file.path} variant="caption" display="block">
                      {file.filename}: {(file.fileBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                      {file.sampledReads > 0
                        ? ', ~' + file.meanReadLen + 'bp reads'
                        : ''}
                      {file.estReadCount > 0
                        ? ', ~' + (file.estReadCount / 1e6).toFixed(0) + 'M reads (est.)'
                        : ''}
                    </Typography>
                  );
                })}
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default GenomicsImportPanel;
