// extensions/genome-central-redux/server/methods.genomics.js
//
// Genomics import pipeline (ServerMethods registry / JSON-RPC).
//
//   genomics.uploadAndImport23andMe  - base64 txt upload -> GridFS + deferred
//                                      600K-row batch parse into MyGenotype +
//                                      precomputed ideogram annotation tracks
//   genomics.getImportStatus         - poll progress of a deferred import
//   genomics.getAnnotationSets       - latest notable/density tracks for a
//                                      patient (merges variant Observations
//                                      from PDF genomics reports read-side)
//
// Provenance contract (imports/api/importRuns): the minted importRunId stamps
// every MyGenotype row, both GenomeAnnotationSets docs, the MolecularSequence,
// the DocumentReference, and the GridFS file metadata — the whole run is
// inspectable via importRuns.census and flushable via importRuns.flush.
// All host-scheme access is null-safe (pdf-parser precedent): on a deployment
// without Meteor.ImportRunTags / ImportRuns the import still works, untagged.

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { get } from 'lodash';

import GenomicsGridFSManager from './GenomicsGridFSManager.js';
import { MyGenotype, GenomeAnnotationSets } from '../lib/GenomicsCollections.js';
import parse23andMe from '../lib/parse23andMe.js';
import notableMarkers from '../lib/notableMarkers.js';
import annotationBuilders from '../lib/buildAnnotationSets.js';
import fastqStats from '../lib/fastqStats.js';

// Node core modules via the established real-require pattern
const realRequire = (typeof Npm !== 'undefined' && Npm && typeof Npm.require === 'function')
  ? Npm.require
  : require;
const nodeFs = realRequire('fs');
const nodeZlib = realRequire('zlib');
const nodeReadline = realRequire('readline');
const nodeCrypto = realRequire('crypto');

const log = (Meteor.Logger ? Meteor.Logger.for('genome-central') : console);

const GENOMICS_IMPORT_TYPE = 'genomics';
const GENOMICS_IMPORT_ORIGIN = 'genome-central';
const DENSITY_BIN_SIZE_BP = 5000000;
const INSERT_BATCH_SIZE = 10000;

// Amber, to distinguish report-derived variant markers (PDF pipeline) from
// the curated notable list (red) on the same ideogram track.
const REPORT_VARIANT_COLOR = '#f57c00';

// LOINC codes shared with pdf-parser's GenomicsReportSkill (loose read-side
// coupling — no cross-extension import).
const LOINC_VARIANT_ASSESSMENT = '69548-6';
const LOINC_GENE_STUDIED = '48018-6';
const LOINC_DISCRETE_VARIANT = '81252-9';

function truncateErrorMessage(message, maxLength) {
  const max = maxLength || 500;
  const text = String(message || 'Unknown error');
  return text.length > max ? text.slice(0, max) + '… [truncated]' : text;
}

// Idempotently merge import-run tags onto a resource. Null-safe.
function applyGenomicsRunTags(resource, importRunId) {
  const ImportRunTags = Meteor.ImportRunTags;
  if (!ImportRunTags || typeof ImportRunTags.applyImportRunTags !== 'function') {
    return resource;
  }
  return ImportRunTags.applyImportRunTags(resource, {
    importRunId: importRunId,
    importType: GENOMICS_IMPORT_TYPE
  });
}

// The run tag alone (no type tag) — stamped onto each of ~600K MyGenotype
// rows, so keep it minimal; the shared object is safe because insertMany
// serializes it per document.
function buildRowRunTag(importRunId) {
  const ImportRunTags = Meteor.ImportRunTags;
  if (!ImportRunTags || typeof ImportRunTags.buildImportRunTags !== 'function') {
    return [];
  }
  return ImportRunTags.buildImportRunTags({ importRunId: importRunId });
}

async function upsertGenomicsImportRun(importRunId, fields) {
  const ImportRuns = get(global, 'Collections.ImportRuns');
  if (!ImportRuns || typeof ImportRuns.upsertAsync !== 'function') {
    log.warn && log.warn('ImportRuns collection unavailable; skipping registry upsert', { importRunId: importRunId });
    return;
  }
  try {
    await ImportRuns.upsertAsync({ _id: importRunId }, { $set: fields });
  } catch (error) {
    log.warn && log.warn('ImportRuns upsert failed', { importRunId: importRunId, error: error.message });
  }
}

// ---------------------------------------------------------------------------
// Deferred worker: parse the uploaded text, batch-insert MyGenotype rows,
// then build the derived artifacts. Runs outside the request so the 15 MB /
// 600K-row file never blocks the RPC response.
// ---------------------------------------------------------------------------
async function runSnpImport(options) {
  const importRunId = options.importRunId;
  const fileText = options.fileText;
  const filename = options.filename;
  const patientId = options.patientId;
  const patientDisplay = options.patientDisplay;
  const gridfsFileId = options.gridfsFileId;
  const userId = options.userId;

  try {
    const rowTag = buildRowRunTag(importRunId);
    const rawGenotypes = MyGenotype.rawCollection();

    const lines = fileText.split('\n');
    let batch = [];
    let insertedRows = 0;
    let skipped = 0;

    for (let i = 0; i < lines.length; i++) {
      const row = parse23andMe.parse23andMeLine(lines[i]);
      if (!row) {
        skipped++;
        continue;
      }
      row._id = Random.id();
      row.patientId = patientId;
      row.meta = { tag: rowTag };
      batch.push(row);

      if (batch.length >= INSERT_BATCH_SIZE) {
        await rawGenotypes.insertMany(batch, { ordered: false });
        insertedRows += batch.length;
        batch = [];
        await upsertGenomicsImportRun(importRunId, {
          'progress.parsedLines': insertedRows,
          'progress.phase': 'parsing'
        });
      }
    }
    if (batch.length > 0) {
      await rawGenotypes.insertMany(batch, { ordered: false });
      insertedRows += batch.length;
    }

    log.info && log.info('SNP parse complete', {
      importRunId: importRunId, insertedRows: insertedRows, skipped: skipped
    });
    await upsertGenomicsImportRun(importRunId, {
      'progress.parsedLines': insertedRows,
      'progress.phase': 'finalizing'
    });

    await finalizeSnpImport({
      importRunId: importRunId,
      filename: filename,
      patientId: patientId,
      patientDisplay: patientDisplay,
      gridfsFileId: gridfsFileId,
      userId: userId,
      insertedRows: insertedRows
    });
  } catch (error) {
    log.error && log.error('SNP import failed', { importRunId: importRunId, error: error.message });
    await upsertGenomicsImportRun(importRunId, {
      status: 'failed',
      completedAt: new Date(),
      error: truncateErrorMessage(error.message)
    });
  }
}

// Build the derived artifacts once all rows are in: the two annotation-set
// docs, the MolecularSequence, and the DocumentReference for the raw file.
async function finalizeSnpImport(options) {
  const importRunId = options.importRunId;
  const patientId = options.patientId;
  const patientDisplay = options.patientDisplay;
  const filename = options.filename;
  const gridfsFileId = options.gridfsFileId;
  const insertedRows = options.insertedRows;

  const runSelector = { 'meta.tag.code': importRunId };

  // --- Notable track: this run's rows intersected with the curated list ---
  const notableRows = await MyGenotype.find(
    Object.assign({ marker: { $in: notableMarkers.notableRsids() } }, runSelector)
  ).fetchAsync();
  const notableSet = annotationBuilders.buildNotableAnnots(notableRows, notableMarkers.NOTABLE_MARKERS);

  // --- Density track: server-side aggregation, run-scoped ---
  const binDocs = await MyGenotype.rawCollection().aggregate([
    { $match: runSelector },
    { $group: {
      _id: {
        chromosome: '$chromosome',
        bin: { $floor: { $divide: ['$position', DENSITY_BIN_SIZE_BP] } }
      },
      count: { $sum: 1 }
    } }
  ]).toArray();
  const binCounts = binDocs.map(function(doc) {
    return { chromosome: doc._id.chromosome, bin: doc._id.bin, count: doc.count };
  });
  const densitySet = annotationBuilders.buildDensityAnnots(binCounts, DENSITY_BIN_SIZE_BP);

  const now = new Date();
  const molecularSequenceId = Random.id();

  const notableSetDoc = applyGenomicsRunTags({
    _id: Random.id(),
    patientId: patientId,
    importRunId: importRunId,
    molecularSequenceId: molecularSequenceId,
    assembly: 'GRCh37',
    trackType: 'notable',
    keys: notableSet.keys,
    annots: notableSet.annots,
    totals: { snpCount: insertedRows, notableCount: notableSet.count },
    createdAt: now
  }, importRunId);

  const densitySetDoc = applyGenomicsRunTags({
    _id: Random.id(),
    patientId: patientId,
    importRunId: importRunId,
    molecularSequenceId: molecularSequenceId,
    assembly: 'GRCh37',
    trackType: 'density',
    keys: densitySet.keys,
    annots: densitySet.annots,
    binSizeBp: densitySet.binSizeBp,
    maxBinCount: densitySet.maxBinCount,
    totals: { snpCount: insertedRows, notableCount: notableSet.count },
    createdAt: now
  }, importRunId);

  await GenomeAnnotationSets.insertAsync(notableSetDoc);
  await GenomeAnnotationSets.insertAsync(densitySetDoc);

  // --- MolecularSequence for the SNP-array dataset ---
  let molecularSequenceCount = 0;
  const MolecularSequences = get(global, 'Collections.MolecularSequences');
  if (MolecularSequences) {
    const sequence = applyGenomicsRunTags({
      _id: molecularSequenceId,
      id: molecularSequenceId,
      resourceType: 'MolecularSequence',
      type: 'dna',
      coordinateSystem: 1,
      patient: { reference: 'Patient/' + patientId, display: patientDisplay || '' },
      device: { display: '23andMe v4 SNP genotyping array' },
      quantity: { value: insertedRows, unit: 'variant calls' },
      referenceSeq: {
        genomeBuild: 'GRCh37',
        referenceSeqId: { text: 'GRCh37 / 23andMe v4 genotyping array' }
      },
      extension: [
        { url: 'urn:honeycomb:genomics:annotation-sets', valueString: notableSetDoc._id + ',' + densitySetDoc._id },
        { url: 'urn:honeycomb:genomics:gridfs', valueString: gridfsFileId ? 'gridfs://genomics/' + gridfsFileId : '' }
      ]
    }, importRunId);
    try {
      await MolecularSequences.insertAsync(sequence);
      molecularSequenceCount = 1;
    } catch (sequenceError) {
      log.warn && log.warn('MolecularSequence insert failed', { importRunId: importRunId, error: sequenceError.message });
    }
  }

  // --- DocumentReference for the raw txt in GridFS ---
  let documentReferenceCount = 0;
  const DocumentReferences = get(global, 'Collections.DocumentReferences');
  if (DocumentReferences) {
    const docRefId = Random.id();
    const docRef = applyGenomicsRunTags({
      _id: docRefId,
      id: docRefId,
      resourceType: 'DocumentReference',
      status: 'current',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '51969-4',
          display: 'Genetic analysis summary report'
        }],
        text: '23andMe raw genotype export'
      },
      subject: { reference: 'Patient/' + patientId, display: patientDisplay || '' },
      date: now.toISOString(),
      description: filename,
      content: [{
        attachment: Object.assign({
          contentType: 'text/plain',
          title: filename
        }, gridfsFileId ? { url: 'gridfs://genomics/' + gridfsFileId } : {})
      }]
    }, importRunId);
    try {
      await DocumentReferences.insertAsync(docRef);
      documentReferenceCount = 1;
    } catch (docRefError) {
      log.warn && log.warn('DocumentReference insert failed', { importRunId: importRunId, error: docRefError.message });
    }
  }

  await upsertGenomicsImportRun(importRunId, {
    status: 'completed',
    completedAt: new Date(),
    'progress.phase': 'completed',
    resourceCounts: {
      MyGenotype: insertedRows,
      GenomeAnnotationSets: 2,
      MolecularSequences: molecularSequenceCount,
      DocumentReferences: documentReferenceCount
    }
  });

  log.info && log.info('SNP import finalized', {
    importRunId: importRunId,
    snpCount: insertedRows,
    notableCount: notableSet.count,
    densityBins: binCounts.length
  });
}

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

Meteor.ServerMethods.define('genomics.uploadAndImport23andMe', {
  description: 'Upload a base64 23andMe raw genotype txt, store it in GridFS, and import SNPs + ideogram annotation tracks in the background.',
  requireAuth: true,
  phi: true,
  schemaObject: {
    type: 'object',
    properties: {
      fileBase64: { type: 'string' },
      filename: { type: 'string' },
      patientId: { type: 'string' },
      patientDisplay: { type: 'string' }
    },
    required: ['fileBase64', 'filename', 'patientId']
  }
}, async function(params, context) {
  const fileBase64 = get(params, 'fileBase64');
  const filename = get(params, 'filename', 'genome.txt');
  const patientId = get(params, 'patientId');
  const patientDisplay = get(params, 'patientDisplay', '');

  const fileBuffer = Buffer.from(fileBase64, 'base64');

  const maxSizeMB = get(Meteor, 'settings.private.genomics.maxFileSizeMB', 50);
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    throw new Meteor.Error('file-too-large', 'Genotype file exceeds maximum size of ' + maxSizeMB + 'MB');
  }

  const fileText = fileBuffer.toString('utf8');
  if (!parse23andMe.sniff23andMeHeader(fileText.slice(0, 2048))) {
    throw new Meteor.Error('not-23andme-format',
      'File does not look like a 23andMe raw genotype export (missing header banner / rsid column line)');
  }

  // Mint the run id up front — it stamps the GridFS file, every row, and
  // every derived resource.
  const importRunId = Random.id();

  log.info && log.info('23andMe upload received', {
    importRunId: importRunId, filename: filename, sizeMB: fileSizeMB.toFixed(1)
  });

  let gridfsFileId = null;
  try {
    if (GenomicsGridFSManager.isInitialized()) {
      gridfsFileId = await GenomicsGridFSManager.uploadBuffer(fileBuffer, filename, {
        patientId: patientId,
        uploadedBy: context.userId,
        contentType: 'text/plain',
        importRunId: importRunId
      });
    } else {
      log.warn && log.warn('Genomics GridFS not initialized; raw file will not be retained', { importRunId: importRunId });
    }
  } catch (gridfsError) {
    log.warn && log.warn('Genomics GridFS upload failed', { importRunId: importRunId, error: gridfsError.message });
  }

  await upsertGenomicsImportRun(importRunId, {
    _id: importRunId,
    status: 'active',
    importType: GENOMICS_IMPORT_TYPE,
    origin: GENOMICS_IMPORT_ORIGIN,
    filenames: [filename],
    userId: context.userId || null,
    patientId: patientId || null,
    resourceCounts: {},
    gridfsFileIds: gridfsFileId ? [gridfsFileId] : [],
    progress: { totalBytes: fileBuffer.length, parsedLines: 0, phase: 'parsing' },
    createdAt: new Date()
  });

  // Background parse — the RPC returns immediately; the client polls
  // genomics.getImportStatus.
  Meteor.defer(function() {
    runSnpImport({
      importRunId: importRunId,
      fileText: fileText,
      filename: filename,
      patientId: patientId,
      patientDisplay: patientDisplay,
      gridfsFileId: gridfsFileId,
      userId: context.userId
    });
  });

  return { importRunId: importRunId };
});

Meteor.ServerMethods.define('genomics.getImportStatus', {
  description: 'Poll the progress of a deferred genomics import run.',
  requireAuth: true,
  phi: false,
  schemaObject: {
    type: 'object',
    properties: {
      importRunId: { type: 'string' }
    },
    required: ['importRunId']
  }
}, async function(params) {
  const importRunId = get(params, 'importRunId');
  const ImportRuns = get(global, 'Collections.ImportRuns');
  if (!ImportRuns) {
    return { status: 'unknown', progress: null, resourceCounts: null };
  }
  const run = await ImportRuns.findOneAsync({ _id: importRunId });
  if (!run) {
    return { status: 'not-found', progress: null, resourceCounts: null };
  }
  return {
    status: get(run, 'status', 'unknown'),
    progress: get(run, 'progress', null),
    resourceCounts: get(run, 'resourceCounts', null),
    error: get(run, 'error', null)
  };
});

Meteor.ServerMethods.define('genomics.getAnnotationSets', {
  description: 'Fetch the latest notable + density ideogram annotation sets for a patient, merged with variant Observations from genomics report PDFs.',
  requireAuth: true,
  phi: true,
  schemaObject: {
    type: 'object',
    properties: {
      patientId: { type: 'string' }
    },
    required: ['patientId']
  }
}, async function(params) {
  const patientId = get(params, 'patientId');

  // Read-side clamp to GRCh37 chromosome bounds — covers sets stored before
  // build-time clamping existed (ideogram throws "Base pair out of range"
  // when an annotation runs past the chromosome end).
  const notable = annotationBuilders.clampAnnotationSet(await GenomeAnnotationSets.findOneAsync(
    { patientId: patientId, trackType: 'notable' },
    { sort: { createdAt: -1 } }
  ));
  const density = annotationBuilders.clampAnnotationSet(await GenomeAnnotationSets.findOneAsync(
    { patientId: patientId, trackType: 'density' },
    { sort: { createdAt: -1 } }
  ));

  // Read-side merge of variant Observations (LOINC 69548-6) created by the
  // pdf-parser GenomicsReportSkill: place each reported variant at the
  // position of the matching imported genotype row, if we have one.
  let reportAnnotsAdded = 0;
  const Observations = get(global, 'Collections.Observations');
  if (notable && Observations) {
    try {
      const variantObservations = await Observations.find({
        'subject.reference': 'Patient/' + patientId,
        'code.coding.code': LOINC_VARIANT_ASSESSMENT
      }).fetchAsync();

      for (const observation of variantObservations) {
        const components = get(observation, 'component', []);
        let gene = '';
        let rsid = '';
        components.forEach(function(component) {
          const componentCode = get(component, 'code.coding.0.code');
          const value = get(component, 'valueCodeableConcept.text', get(component, 'valueString', ''));
          if (componentCode === LOINC_GENE_STUDIED) {
            gene = value;
          }
          if (componentCode === LOINC_DISCRETE_VARIANT) {
            rsid = value;
          }
        });
        if (!rsid) {
          continue;
        }
        const genotypeRow = await MyGenotype.findOneAsync({ patientId: patientId, marker: rsid });
        if (!genotypeRow) {
          continue;
        }
        const alreadyPresent = (notable.annots || []).some(function(chrEntry) {
          return chrEntry.annots.some(function(annot) {
            return annot[0].indexOf(rsid) !== -1;
          });
        });
        const label = (gene || genotypeRow.marker) + ' ' + rsid + ' (report)';
        if (!alreadyPresent) {
          let chrEntry = (notable.annots || []).find(function(entry) {
            return entry.chr === genotypeRow.chromosome;
          });
          if (!chrEntry) {
            chrEntry = { chr: genotypeRow.chromosome, annots: [] };
            notable.annots.push(chrEntry);
          }
          chrEntry.annots.push([
            label, genotypeRow.position, 1,
            annotationBuilders.NOTABLE_TRACK_INDEX, REPORT_VARIANT_COLOR
          ]);
          reportAnnotsAdded++;
        }
      }
    } catch (observationError) {
      log.warn && log.warn('Variant Observation merge failed', { patientId: patientId, error: observationError.message });
    }
  }

  return {
    notable: notable || null,
    density: density || null,
    reportAnnotsAdded: reportAnnotsAdded
  };
});

// ---------------------------------------------------------------------------
// FASTQ reference-only import (Phase 3). The ~123GB WGS files are never
// copied: fs.stat + a streamed sample of the first reads + a partial sha256
// of the first 64MB produce a MolecularSequence per R1/R2 pair plus a
// DocumentReference per file with a file:// attachment url.
// ---------------------------------------------------------------------------

const FASTQ_SAMPLE_READS = 10000;
const FASTQ_HASH_BYTES = 64 * 1024 * 1024;

function isLocalFileReferenceAllowed() {
  return get(Meteor, 'settings.private.genomics.allowLocalFileReference', false) === true;
}

// Stream the first sampleReads FASTQ records (gunzipping when needed) and
// summarize read lengths. Resolves early by destroying the source stream.
function sampleFastqFile(path, sampleReads) {
  return new Promise(function(resolve, reject) {
    const maxLines = sampleReads * 4;
    const lines = [];
    const source = nodeFs.createReadStream(path);
    const input = /\.gz$/i.test(path) ? source.pipe(nodeZlib.createGunzip()) : source;
    const reader = nodeReadline.createInterface({ input: input, crlfDelay: Infinity });
    let settled = false;

    function finish() {
      if (settled) { return; }
      settled = true;
      reader.close();
      source.destroy();
      resolve(fastqStats.summarizeReads(lines));
    }

    reader.on('line', function(line) {
      lines.push(line);
      if (lines.length >= maxLines) {
        finish();
      }
    });
    reader.on('close', finish);
    source.on('error', function(error) {
      if (settled) { return; }
      settled = true;
      reject(error);
    });
    input.on('error', function(error) {
      // Truncated gzip streams error when we destroy the source mid-file —
      // if we already have sample lines, that is expected, not a failure.
      if (settled) { return; }
      if (lines.length > 0) {
        finish();
      } else {
        settled = true;
        reject(error);
      }
    });
  });
}

// sha256 of the first FASTQ_HASH_BYTES raw bytes — a stable content
// fingerprint that never requires reading the whole 123GB file.
function partialSha256(path, byteCount) {
  return new Promise(function(resolve, reject) {
    const hash = nodeCrypto.createHash('sha256');
    const stream = nodeFs.createReadStream(path, { start: 0, end: byteCount - 1 });
    stream.on('data', function(chunk) { hash.update(chunk); });
    stream.on('end', function() { resolve(hash.digest('hex')); });
    stream.on('error', reject);
  });
}

function fastqContentType(path) {
  return /\.gz$/i.test(path) ? 'application/gzip' : 'text/x-fastq';
}

Meteor.ServerMethods.define('genomics.checkLocalFileReferenceSetting', {
  description: 'Check whether reference-only import of local genomics files is enabled on this deployment.',
  requireAuth: true,
  phi: false,
  schemaObject: { type: 'object', properties: {} }
}, async function() {
  return { allowLocalFileReference: isLocalFileReferenceAllowed() };
});

Meteor.ServerMethods.define('genomics.referenceLocalGenomicsFiles', {
  description: 'Reference local FASTQ/WGS files by absolute path (no copy): stat + sampled read stats + partial checksum into MolecularSequence + DocumentReference records.',
  requireAuth: true,
  phi: true,
  schemaObject: {
    type: 'object',
    properties: {
      paths: { type: 'array', items: { type: 'string' } },
      patientId: { type: 'string' },
      patientDisplay: { type: 'string' }
    },
    required: ['paths', 'patientId']
  }
}, async function(params, context) {
  if (!isLocalFileReferenceAllowed()) {
    throw new Meteor.Error('feature-disabled',
      'Local genomics file referencing is disabled. Set Meteor.settings.private.genomics.allowLocalFileReference to true.');
  }

  const paths = get(params, 'paths', []).filter(function(path) {
    return typeof path === 'string' && path.length > 0;
  });
  const patientId = get(params, 'patientId');
  const patientDisplay = get(params, 'patientDisplay', '');
  if (paths.length === 0) {
    throw new Meteor.Error('no-paths', 'No file paths provided');
  }

  const importRunId = Random.id();
  const now = new Date();

  await upsertGenomicsImportRun(importRunId, {
    _id: importRunId,
    status: 'active',
    importType: GENOMICS_IMPORT_TYPE,
    origin: 'genome-central-fastq',
    filenames: paths.map(function(path) { return path.split('/').pop(); }),
    userId: context.userId || null,
    patientId: patientId || null,
    resourceCounts: {},
    gridfsFileIds: [],
    createdAt: now
  });

  // Stat + sample + fingerprint each file (reference-only — no copying)
  const fileInfos = {};
  for (const path of paths) {
    const stat = await nodeFs.promises.stat(path);
    let stats = { reads: 0, meanLen: 0, minLen: 0, maxLen: 0 };
    try {
      stats = await sampleFastqFile(path, FASTQ_SAMPLE_READS);
    } catch (sampleError) {
      log.warn && log.warn('FASTQ sampling failed; referencing without read stats', { path: path, error: sampleError.message });
    }
    const sha256Prefix = await partialSha256(path, Math.min(FASTQ_HASH_BYTES, stat.size));
    const isGzip = /\.gz$/i.test(path);
    fileInfos[path] = {
      path: path,
      filename: path.split('/').pop(),
      fileBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sampledReads: stats.reads,
      meanReadLen: stats.meanLen,
      minReadLen: stats.minLen,
      maxReadLen: stats.maxLen,
      // Only estimable from uncompressed byte counts
      estReadCount: isGzip ? 0 : fastqStats.estimateReadCount(stats, stat.size),
      sha256First64MB: sha256Prefix
    };
  }

  const DocumentReferences = get(global, 'Collections.DocumentReferences');
  const MolecularSequences = get(global, 'Collections.MolecularSequences');
  const createdDocumentReferenceIds = [];
  const createdMolecularSequenceIds = [];

  // One DocumentReference per file
  for (const path of paths) {
    if (!DocumentReferences) { break; }
    const info = fileInfos[path];
    const docRefId = Random.id();
    const docRef = applyGenomicsRunTags({
      _id: docRefId,
      id: docRefId,
      resourceType: 'DocumentReference',
      status: 'current',
      type: {
        coding: [{ system: 'http://loinc.org', code: '51969-4', display: 'Genetic analysis summary report' }],
        text: 'Whole genome sequencing reads (FASTQ)'
      },
      subject: { reference: 'Patient/' + patientId, display: patientDisplay },
      date: now.toISOString(),
      description: info.filename,
      content: [{
        attachment: {
          contentType: fastqContentType(path),
          title: info.filename,
          size: info.fileBytes,
          url: 'file://' + path
        }
      }],
      extension: [
        { url: 'urn:honeycomb:genomics:partial-sha256', valueString: info.sha256First64MB },
        { url: 'urn:honeycomb:genomics:stream-stats', valueString: JSON.stringify(info) }
      ]
    }, importRunId);
    try {
      await DocumentReferences.insertAsync(docRef);
      createdDocumentReferenceIds.push(docRefId);
    } catch (docRefError) {
      log.warn && log.warn('FASTQ DocumentReference insert failed', { path: path, error: docRefError.message });
    }
  }

  // One MolecularSequence per R1/R2 pair (singletons get their own)
  const pairs = fastqStats.pairFastqPaths(paths);
  for (const pair of pairs) {
    if (!MolecularSequences) { break; }
    const members = [pair.r1, pair.r2].filter(Boolean);
    const sequenceId = Random.id();
    const repository = members.map(function(path, index) {
      return {
        type: 'directlink',
        url: 'file://' + path,
        name: 'FASTQ ' + (members.length > 1 ? 'R' + (index + 1) : 'reads'),
        datasetId: fileInfos[path].sha256First64MB.slice(0, 16)
      };
    });
    const combinedStats = members.map(function(path) { return fileInfos[path]; });
    const sequence = applyGenomicsRunTags({
      _id: sequenceId,
      id: sequenceId,
      resourceType: 'MolecularSequence',
      type: 'dna',
      coordinateSystem: 0,
      patient: { reference: 'Patient/' + patientId, display: patientDisplay },
      device: { display: 'Whole genome sequencing (30x WGS)' },
      readCoverage: 30,
      repository: repository,
      extension: [
        { url: 'urn:honeycomb:genomics:stream-stats', valueString: JSON.stringify(combinedStats) }
      ]
    }, importRunId);
    try {
      await MolecularSequences.insertAsync(sequence);
      createdMolecularSequenceIds.push(sequenceId);
    } catch (sequenceError) {
      log.warn && log.warn('FASTQ MolecularSequence insert failed', { importRunId: importRunId, error: sequenceError.message });
    }
  }

  await upsertGenomicsImportRun(importRunId, {
    status: 'completed',
    completedAt: new Date(),
    resourceCounts: {
      MolecularSequences: createdMolecularSequenceIds.length,
      DocumentReferences: createdDocumentReferenceIds.length
    }
  });

  log.info && log.info('Referenced local genomics files', {
    importRunId: importRunId,
    files: paths.length,
    sequences: createdMolecularSequenceIds.length
  });

  return {
    importRunId: importRunId,
    files: Object.values(fileInfos),
    molecularSequenceIds: createdMolecularSequenceIds,
    documentReferenceIds: createdDocumentReferenceIds
  };
});

Meteor.startup(function() {
  GenomicsGridFSManager.initialize();
});
