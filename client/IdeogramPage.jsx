// packages/genome-central-redux/client/IdeogramPage.jsx
import React, { useState, useMemo } from 'react';
import {
  Alert, AlertTitle, Box, Card, CardHeader, CardContent, Grid,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  ToggleButton, ToggleButtonGroup, Tooltip,
  Typography
} from '@mui/material';
import { get } from 'lodash';
import { useTracker } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';
import { Karyotype } from './IdeogramComponent';
import { resolveChromosomalSex } from '../lib/resolveChromosomalSex';

let useAppTheme;
let MolecularSequences;
let BiologicallyDerivedProducts;

Meteor.startup(async function() {
  useAppTheme = Meteor.useTheme;
  MolecularSequences = await global.Collections.MolecularSequences;
  BiologicallyDerivedProducts = await global.Collections.BiologicallyDerivedProducts;
});

export function KaryotypePage() {
  const appTheme = useAppTheme ? useAppTheme() : { theme: 'light' };
  const isDark = appTheme.theme === 'dark';

  const cardBgColor = isDark ? '#1e1e1e' : '#ffffff';
  const cardTextColor = isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)';

  // null = auto (from patient), 'male' or 'female' = manual override
  const [sexOverride, setSexOverride] = useState(null);

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

  // Fetch all BiologicallyDerivedProduct resources
  const samples = useTracker(function() {
    if (BiologicallyDerivedProducts) {
      return BiologicallyDerivedProducts.find({}).fetch();
    }
    return [];
  }, []);

  return (
    <div id="IdeogramPage" style={{ padding: '20px' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
            <Card sx={{
              bgcolor: cardBgColor,
              color: cardTextColor,
              '& .MuiCardHeader-title': { color: cardTextColor }
            }}>
              <CardHeader title="Genetic Sequence Baseline" />
              <CardContent>
                {sequenceBaseline ? (
                  <Alert severity="info" sx={{
                    bgcolor: isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
                    color: cardTextColor,
                    '& .MuiAlert-icon': { color: isDark ? '#90caf9' : '#1976d2' },
                    '& .MuiAlertTitle-root': { color: cardTextColor }
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {get(sequenceBaseline, 'type', 'Unknown').toUpperCase()} Sequence
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {get(sequenceBaseline, 'referenceSeq.referenceSeqId.text',
                        get(sequenceBaseline, 'referenceSeq.referenceSeqId.coding.0.display', 'No reference sequence'))}
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{
                    bgcolor: isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
                    color: cardTextColor,
                    '& .MuiAlert-icon': { color: isDark ? '#90caf9' : '#1976d2' },
                    '& .MuiAlertTitle-root': { color: cardTextColor }
                  }}>
                    <AlertTitle>No sequence baseline</AlertTitle>
                    Import a MolecularSequence resource to establish a genetic baseline for comparison.
                  </Alert>
                )}
              </CardContent>
            </Card>
            <Card sx={{
              flex: 1,
              bgcolor: cardBgColor,
              color: cardTextColor,
              '& .MuiCardHeader-title': { color: cardTextColor },
              '& .MuiTableCell-root': {
                color: cardTextColor,
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
              }
            }}>
              <CardHeader title="AVATAR Samples" />
              <CardContent>
                {samples.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product Category</TableCell>
                          <TableCell>Product Code</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Collection Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {samples.map(function(sample) {
                          return (
                            <TableRow
                              key={get(sample, '_id')}
                              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                            >
                              <TableCell>{get(sample, 'productCategory', '')}</TableCell>
                              <TableCell>
                                {get(sample, 'productCode.text',
                                  get(sample, 'productCode.coding.0.display', ''))}
                              </TableCell>
                              <TableCell>{get(sample, 'status', '')}</TableCell>
                              <TableCell>
                                {get(sample, 'collection.collectedDateTime', '')}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: cardTextColor, opacity: 0.7 }}>
                    No samples available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiCardHeader-title': { color: cardTextColor }
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
                      color: cardTextColor,
                      borderColor: isDark ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)',
                      textTransform: 'none',
                      px: 1.5,
                      py: 0.25,
                      fontSize: '0.75rem'
                    },
                    '& .Mui-selected': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      color: cardTextColor
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
            <CardContent sx={{ bgcolor: isDark ? '#1e1e1e' : '#ffffff', minHeight: '600px' }}>
              {sequenceBaseline ? (
                <Karyotype isDark={isDark} sex={effectiveSex} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '600px' }}>
                  <Alert severity="warning" sx={{
                    bgcolor: isDark ? 'rgba(237, 108, 2, 0.15)' : 'rgba(237, 108, 2, 0.1)',
                    color: cardTextColor,
                    '& .MuiAlert-icon': { color: isDark ? '#ff9800' : '#ed6c02' },
                    '& .MuiAlertTitle-root': { color: cardTextColor }
                  }}>
                    <AlertTitle>No Genetic Baseline Available</AlertTitle>
                    Import a MolecularSequence resource with type "dna" to display the patient's karyotype.
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}

export default KaryotypePage;
