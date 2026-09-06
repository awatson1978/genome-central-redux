// extensions/genome-central-redux/tests/fastqStats.test.mjs
//
// Pure unit tests for FASTQ sampling helpers. Run: node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import fastqStats from '../lib/fastqStats.js';

function makeRecord(id, sequence) {
  return ['@' + id, sequence, '+', 'I'.repeat(sequence.length)];
}

test('summarizeReads computes read count and length stats', function() {
  const lines = [
    ...makeRecord('read1', 'ACGT'.repeat(37) + 'AC'),  // 150
    ...makeRecord('read2', 'ACGT'.repeat(25)),          // 100
    ...makeRecord('read3', 'ACGT'.repeat(50))           // 200
  ];
  const stats = fastqStats.summarizeReads(lines);
  assert.equal(stats.reads, 3);
  assert.equal(stats.minLen, 100);
  assert.equal(stats.maxLen, 200);
  assert.equal(stats.meanLen, 150);
});

test('summarizeReads ignores truncated trailing records and junk', function() {
  const lines = [
    ...makeRecord('read1', 'ACGTACGT'),
    'not-a-header', 'ACGT', '+', 'IIII',
    '@truncated'
  ];
  const stats = fastqStats.summarizeReads(lines);
  assert.equal(stats.reads, 1);
  assert.deepEqual(fastqStats.summarizeReads([]), { reads: 0, meanLen: 0, minLen: 0, maxLen: 0 });
  assert.deepEqual(fastqStats.summarizeReads(null), { reads: 0, meanLen: 0, minLen: 0, maxLen: 0 });
});

test('estimateReadCount scales with file size', function() {
  const stats = { reads: 100, meanLen: 150, minLen: 150, maxLen: 150 };
  // 360 bytes/read → 3.6e9 bytes ≈ 1e7 reads
  assert.equal(fastqStats.estimateReadCount(stats, 360 * 1e7), 1e7);
  assert.equal(fastqStats.estimateReadCount(stats, 0), 0);
  assert.equal(fastqStats.estimateReadCount(null, 100), 0);
});

test('pairFastqPaths pairs R1/R2 by naming convention', function() {
  const pairs = fastqStats.pairFastqPaths([
    '/data/Sample-WGS-11-25-25.1.fq.gz',
    '/data/Sample-WGS-11-25-25.2.fq.gz',
    '/data/other.fastq',
    '/data/solo.1.fq'
  ]);
  assert.equal(pairs.length, 3);
  const wgs = pairs.find(function(pair) { return pair.r1 && pair.r1.indexOf('WGS') !== -1; });
  assert.equal(wgs.r1, '/data/Sample-WGS-11-25-25.1.fq.gz');
  assert.equal(wgs.r2, '/data/Sample-WGS-11-25-25.2.fq.gz');
  const solo = pairs.find(function(pair) { return pair.r1 === '/data/solo.1.fq'; });
  assert.equal(solo.r2, undefined);
  const nonPaired = pairs.find(function(pair) { return pair.r1 === '/data/other.fastq'; });
  assert.ok(nonPaired, 'non-numbered file passes through as a singleton');
});
