// packages/genome-central-redux/client/IdeogramPage.jsx
import React, { useState, useMemo } from 'react';
import {
  Alert, AlertTitle, Box, Card, CardHeader, CardContent, Grid,
  ToggleButton, ToggleButtonGroup, Tooltip,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { get } from 'lodash';
import { useTracker } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';
import { Karyotype } from './IdeogramComponent';
import { resolveChromosomalSex } from '../lib/resolveChromosomalSex';
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

  // Read selected patient from Session
  const patient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

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

  // Fetch first MolecularSequence (no patient filter for now)
  const sequenceBaseline = useTracker(function() {
    if (MolecularSequences) {
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
              <Karyotype isDark={isDark} sex={effectiveSex} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default KaryotypePage;
