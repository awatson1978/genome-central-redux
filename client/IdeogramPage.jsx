// packages/genome-central-redux/client/IdeogramPage.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Alert, AlertTitle, Box, Card, CardHeader, CardContent, Grid,
  ToggleButton, ToggleButtonGroup, Tooltip,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CircleIcon from '@mui/icons-material/Circle';
import { get } from 'lodash';
import { useTracker } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';
import { Karyotype } from './IdeogramComponent';
import { GenomicsImportPanel } from './GenomicsImportPanel';
import { resolveChromosomalSex } from '../lib/resolveChromosomalSex';
import annotationBuilders from '../lib/buildAnnotationSets';
let useAppTheme;
let FhirUtilities;
let SpecimensTable;
let MolecularSequences;
let Specimens;

Meteor.startup(async function() {
  useAppTheme = Meteor.useTheme;
  FhirUtilities = Meteor.FhirUtilities;
  SpecimensTable = Meteor.SpecimensTable;
  // `global.Collections` is undefined on the client — the collection registry
  // lives at Meteor.Collections (populated by imports/startup/client/collections.js).
  MolecularSequences = Meteor.Collections?.MolecularSequences;
  Specimens = Meteor.Collections?.Specimens;
});

export function KaryotypePage() {
  const theme = useTheme();
  const appTheme = useAppTheme ? useAppTheme() : { theme: 'light' };
  const isDark = appTheme.theme === 'dark';

  // null = auto (from patient), 'male' or 'female' = manual override
  const [sexOverride, setSexOverride] = useState(null);
  const [specimensPage, setSpecimensPage] = useState(0);

  // Precomputed annotation tracks for the selected patient (server-side
  // aggregates — the client never touches the 600K genotype rows).
  const [annotationSets, setAnnotationSets] = useState(null);
  // 'both' | 'notable' | 'density' — also the fallback path if per-annot
  // colors misbehave in tracks layout.
  const [trackVisibility, setTrackVisibility] = useState('both');

  // Read selected patient from Session
  const patient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

  const fetchAnnotationSets = useCallback(async function() {
    const patientFhirId = get(Session.get('selectedPatient'), 'id');
    if (!patientFhirId) {
      setAnnotationSets(null);
      return;
    }
    try {
      const result = await Meteor.rpc('genomics.getAnnotationSets', { patientId: patientFhirId });
      setAnnotationSets(result);
    } catch (error) {
      console.warn('[IdeogramPage] getAnnotationSets failed:', error.message);
      setAnnotationSets(null);
    }
  }, []);

  const patientFhirId = get(patient, 'id');
  useEffect(function() {
    fetchAnnotationSets();
  }, [patientFhirId, fetchAnnotationSets]);

  // Merge the visible tracks into one raw-annots object for the ideogram.
  const mergedAnnotations = useMemo(function() {
    if (!annotationSets) {
      return null;
    }
    const sets = [];
    if (trackVisibility !== 'density' && get(annotationSets, 'notable')) {
      sets.push(annotationSets.notable);
    }
    if (trackVisibility !== 'notable' && get(annotationSets, 'density')) {
      sets.push(annotationSets.density);
    }
    return annotationBuilders.mergeAnnotationSets(sets);
  }, [annotationSets, trackVisibility]);

  const annotationTracks = useMemo(function() {
    return [
      { id: 'notableTrack', displayName: 'Clinically notable markers', color: annotationBuilders.NOTABLE_COLOR, shape: 'triangle' },
      { id: 'densityTrack', displayName: 'SNP density (5Mb bins)', color: annotationBuilders.DENSITY_COLOR, shape: 'rect' }
    ];
  }, []);

  // Positions in the imported 23andMe v4 data are GRCh37; only pin the
  // assembly when we actually have annotations to place.
  const annotationAssembly = mergedAnnotations
    ? get(annotationSets, 'notable.assembly', get(annotationSets, 'density.assembly', 'GRCh37'))
    : null;

  // Resolve chromosomal sex from patient data
  const resolvedSex = useMemo(function() {
    return resolveChromosomalSex(patient);
  }, [patient]);

  // Effective sex: override wins, otherwise use resolved value
  const effectiveSex = sexOverride || resolvedSex;

  function handleSexToggle(event, newValue) {
    // newValue is null when clicking the already-selected button (deselect)
    // 'auto' means use patient data
    if (newValue === 'auto') {
      setSexOverride(null);
    } else {
      setSexOverride(newValue);
    }
  }

  // Fetch the selected patient's MolecularSequence, falling back to any DNA
  // sequence when no patient-scoped record exists.
  const sequenceBaseline = useTracker(function() {
    if (MolecularSequences) {
      const fhirId = get(Session.get('selectedPatient'), 'id');
      if (fhirId) {
        const patientSequence = MolecularSequences.findOne({
          type: 'dna',
          'patient.reference': 'Patient/' + fhirId
        });
        if (patientSequence) {
          return patientSequence;
        }
      }
      return MolecularSequences.findOne({ type: 'dna' });
    }
    return null;
  }, []);

  // Fetch Specimen resources for the selected patient
  const specimens = useTracker(function() {
    if (Specimens) {
      const selectedPatient = Session.get('selectedPatient');
      const fhirId = get(selectedPatient, 'id');
      if (fhirId) {
        return Specimens.find(FhirUtilities.addPatientFilterToQuery(fhirId)).fetch();
      }
      return Specimens.find({}).fetch();
    }
    return [];
  }, []);

  return (
    <Box id="IdeogramPage" sx={{ p: 2.5 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3} sx={{ display: 'flex' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
            <GenomicsImportPanel onImportComplete={fetchAnnotationSets} />
            <Card sx={{
              bgcolor: 'background.paper',
              color: 'text.primary'
            }}>
              <CardHeader title="Genetic Sequence Baseline" />
              <CardContent>
                {sequenceBaseline ? (
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {get(sequenceBaseline, 'type', 'Unknown').toUpperCase()} Sequence
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {get(sequenceBaseline, 'referenceSeq.referenceSeqId.text',
                        get(sequenceBaseline, 'referenceSeq.referenceSeqId.coding.0.display', 'No reference sequence'))}
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="info">
                    <AlertTitle>No sequence baseline</AlertTitle>
                    Import a MolecularSequence resource to establish a genetic baseline for comparison.
                  </Alert>
                )}
              </CardContent>
            </Card>
            <Card sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              color: 'text.primary',
              '& .MuiTableCell-root': {
                borderColor: 'divider'
              }
            }}>
              <CardHeader title="AVATAR Samples" />
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                {specimens.length > 0 ? (
                  <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <SpecimensTable
                      specimens={specimens}
                      hideCheckbox={true}
                      hidePatientName={true}
                      hidePatientReference={true}
                      hideBarcode={true}
                      count={specimens.length}
                      page={specimensPage}
                      rowsPerPage={5}
                      tableRowSize="small"
                      onSetPage={function(newPage) {
                        setSpecimensPage(newPage);
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No samples available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
            <Card sx={{
              bgcolor: 'background.paper',
              color: 'text.primary'
            }}>
              <CardHeader title="Sequence Detail" />
              <CardContent>
                {sequenceBaseline ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'type', 'Unknown').toUpperCase()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Coordinate System</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'coordinateSystem', 'N/A')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Reference Sequence ID</Typography>
                      <Typography variant="body2">
                        {get(sequenceBaseline, 'referenceSeq.referenceSeqId.coding.0.code',
                          get(sequenceBaseline, 'referenceSeq.referenceSeqId.text', 'N/A'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Reference Sequence</Typography>
                      <Typography variant="body2">
                        {get(sequenceBaseline, 'referenceSeq.referenceSeqId.text',
                          get(sequenceBaseline, 'referenceSeq.referenceSeqId.coding.0.display', 'N/A'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Read Coverage</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'readCoverage', 'N/A')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Patient Reference</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'patient.reference', 'N/A')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Specimen Reference</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'specimen.reference', 'N/A')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Device Reference</Typography>
                      <Typography variant="body2">{get(sequenceBaseline, 'device.reference', 'N/A')}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No MolecularSequence data available.
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Card sx={{
              flex: 1,
              bgcolor: 'background.paper',
              color: 'text.primary'
            }}>
              <CardHeader title="Specimen Detail" />
              <CardContent>
                {specimens.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Typography variant="body2">{get(specimens, '0.status', 'N/A')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">
                        {get(specimens, '0.type.text',
                          get(specimens, '0.type.coding.0.display', 'N/A'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Accession ID</Typography>
                      <Typography variant="body2">
                        {get(specimens, '0.accessionIdentifier.value', 'N/A')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Collection Date</Typography>
                      <Typography variant="body2">
                        {get(specimens, '0.collection.collectedDateTime', 'N/A')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Collection Method</Typography>
                      <Typography variant="body2">
                        {get(specimens, '0.collection.method.text',
                          get(specimens, '0.collection.method.coding.0.display', 'N/A'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Body Site</Typography>
                      <Typography variant="body2">
                        {get(specimens, '0.collection.bodySite.text',
                          get(specimens, '0.collection.bodySite.coding.0.display', 'N/A'))}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Patient Reference</Typography>
                      <Typography variant="body2">{get(specimens, '0.subject.reference', 'N/A')}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No specimen data available.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card sx={{
            bgcolor: 'background.paper',
            color: 'text.primary'
          }}>
            <CardHeader
              title="Human Karyotype"
              action={
                <ToggleButtonGroup
                  value={sexOverride === null ? 'auto' : sexOverride}
                  exclusive
                  onChange={handleSexToggle}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      color: 'text.secondary',
                      borderColor: 'divider',
                      textTransform: 'none',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '0.75rem',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12)
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }
                  }}
                >
                  <Tooltip title={patient ? 'Resolved from patient: ' + resolvedSex : 'No patient selected (default: female)'}>
                    <ToggleButton value="auto">
                      Auto {sexOverride === null ? '(' + resolvedSex + ')' : ''}
                    </ToggleButton>
                  </Tooltip>
                  <ToggleButton value="female">XX</ToggleButton>
                  <ToggleButton value="male">XY</ToggleButton>
                </ToggleButtonGroup>
              }
            />
            <CardContent sx={{ bgcolor: 'background.paper', minHeight: '600px' }}>
              <Karyotype
                isDark={isDark}
                sex={effectiveSex}
                annotations={mergedAnnotations}
                annotationTracks={annotationTracks}
                assembly={annotationAssembly}
              />
            </CardContent>
          </Card>
          {annotationSets && (get(annotationSets, 'notable') || get(annotationSets, 'density')) && (
            <Card sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
              <CardHeader
                title="Annotation Tracks"
                action={
                  <ToggleButtonGroup
                    value={trackVisibility}
                    exclusive
                    size="small"
                    onChange={function(event, newValue) {
                      if (newValue) {
                        setTrackVisibility(newValue);
                      }
                    }}
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: 'text.secondary',
                        borderColor: 'divider',
                        textTransform: 'none',
                        px: 1.5,
                        py: 0.25,
                        fontSize: '0.75rem'
                      }
                    }}
                  >
                    <ToggleButton value="both">Both</ToggleButton>
                    <ToggleButton value="notable">Markers</ToggleButton>
                    <ToggleButton value="density">Density</ToggleButton>
                  </ToggleButtonGroup>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircleIcon sx={{ fontSize: 12, color: annotationBuilders.NOTABLE_COLOR }} />
                    <Typography variant="body2">
                      Clinically notable markers
                      {get(annotationSets, 'notable.totals.notableCount') !== undefined
                        ? ' (' + get(annotationSets, 'notable.totals.notableCount') + ')' : ''}
                    </Typography>
                  </Box>
                  {get(annotationSets, 'reportAnnotsAdded', 0) > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircleIcon sx={{ fontSize: 12, color: '#f57c00' }} />
                      <Typography variant="body2">
                        Report-derived variants ({get(annotationSets, 'reportAnnotsAdded')})
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircleIcon sx={{ fontSize: 12, color: annotationBuilders.DENSITY_COLOR }} />
                    <Typography variant="body2">
                      SNP density, 5Mb bins
                      {get(annotationSets, 'density.totals.snpCount') !== undefined
                        ? ' (' + Number(get(annotationSets, 'density.totals.snpCount')).toLocaleString() + ' SNPs)' : ''}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Assembly {annotationAssembly || 'GRCh38 (default)'} · positions from the
                    imported genotype file
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default KaryotypePage;
