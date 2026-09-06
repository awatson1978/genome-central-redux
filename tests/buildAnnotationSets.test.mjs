// extensions/genome-central-redux/tests/buildAnnotationSets.test.mjs
//
// Pure unit tests for the ideogram annotation-set builders. Run: node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import builders from '../lib/buildAnnotationSets.js';
import notables from '../lib/notableMarkers.js';

const SAMPLE_ROWS = [
  { marker: 'rs28929474', chromosome: '14', position: 94844947, genotype: 'CT' },
  { marker: 'rs17580',    chromosome: '14', position: 94847262, genotype: 'TT' },
  { marker: 'rs3131972',  chromosome: '1',  position: 752721,   genotype: 'GG' }, // not notable
  { marker: 'rs7654321',  chromosome: 'MT', position: 4917,     genotype: 'CC' }  // MT not displayable
];

test('buildNotableAnnots matches only curated rsids and keeps SNP-side positions', function() {
  const set = builders.buildNotableAnnots(SAMPLE_ROWS, notables.NOTABLE_MARKERS);
  assert.deepEqual(set.keys, ['name', 'start', 'length', 'trackIndex', 'color']);
  assert.equal(set.count, 2);
  assert.equal(set.annots.length, 1);
  assert.equal(set.annots[0].chr, '14');
  const first = set.annots[0].annots[0];
  assert.match(first[0], /SERPINA1 rs28929474 CT/);
  assert.equal(first[1], 94844947, 'position comes from the genotype row, never the gene reference');
  assert.equal(first[2], 1);
  assert.equal(first[3], builders.NOTABLE_TRACK_INDEX);
  assert.equal(first[4], builders.NOTABLE_COLOR);
});

test('buildNotableAnnots drops non-displayable chromosomes (MT)', function() {
  const rows = [{ marker: 'rs28929474', chromosome: 'MT', position: 100, genotype: 'CT' }];
  const set = builders.buildNotableAnnots(rows, notables.NOTABLE_MARKERS);
  assert.equal(set.count, 0);
  assert.equal(set.annots.length, 0);
});

test('buildDensityAnnots bins math and maxBinCount', function() {
  const binSize = 5000000;
  const bins = [
    { chromosome: '1', bin: 0, count: 120 },
    { chromosome: '1', bin: 2, count: 400 },
    { chromosome: 'X', bin: 1, count: 40 },
    { chromosome: 'MT', bin: 0, count: 9 },  // dropped
    { chromosome: '2', bin: 3, count: 0 }    // dropped (empty bin)
  ];
  const set = builders.buildDensityAnnots(bins, binSize);
  assert.equal(set.maxBinCount, 400);
  assert.equal(set.binSizeBp, binSize);
  assert.equal(set.annots.length, 2);
  const chr1 = set.annots.find(function(entry) { return entry.chr === '1'; });
  assert.equal(chr1.annots.length, 2);
  const secondBin = chr1.annots[1];
  assert.equal(secondBin[0], '400 SNPs');
  assert.equal(secondBin[1], 2 * binSize, 'start = bin * binSizeBp');
  assert.equal(secondBin[2], binSize, 'length = binSizeBp');
  assert.equal(secondBin[3], builders.DENSITY_TRACK_INDEX);
});

test('mergeAnnotationSets combines tracks per chromosome in display order', function() {
  const notable = builders.buildNotableAnnots(SAMPLE_ROWS, notables.NOTABLE_MARKERS);
  const density = builders.buildDensityAnnots([
    { chromosome: '1', bin: 0, count: 3 },
    { chromosome: '14', bin: 18, count: 7 }
  ], 5000000);
  const merged = builders.mergeAnnotationSets([notable, density]);
  assert.deepEqual(merged.keys, builders.ANNOTATION_KEYS);
  const chrs = merged.annots.map(function(entry) { return entry.chr; });
  assert.deepEqual(chrs, ['1', '14'], 'display order follows chromosome order');
  const chr14 = merged.annots.find(function(entry) { return entry.chr === '14'; });
  assert.equal(chr14.annots.length, 3, 'two notable markers + one density bin');
});

test('mergeAnnotationSets returns null with no input sets', function() {
  assert.equal(builders.mergeAnnotationSets([]), null);
  assert.equal(builders.mergeAnnotationSets([null, undefined]), null);
});
