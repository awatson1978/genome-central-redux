// extensions/genome-central-redux/tests/parse23andMe.test.mjs
//
// Pure unit tests for the 23andMe parser. Run: node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import parser from '../lib/parse23andMe.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = readFileSync(join(fixtureDir, 'synthetic_23andme_v4.txt'), 'utf8');

test('sniff23andMeHeader recognizes the generator banner', function() {
  assert.equal(parser.sniff23andMeHeader(fixture.slice(0, 2048)), true);
  assert.equal(parser.sniff23andMeHeader('# rsid\tchromosome\tposition\tgenotype\n'), true);
  assert.equal(parser.sniff23andMeHeader('col1,col2,col3\n1,2,3\n'), false);
  assert.equal(parser.sniff23andMeHeader(''), false);
  assert.equal(parser.sniff23andMeHeader(null), false);
});

test('parse23andMeLine parses a normal autosomal row', function() {
  const row = parser.parse23andMeLine('rs28929474\t14\t94844947\tCT');
  assert.deepEqual(row, { marker: 'rs28929474', chromosome: '14', position: 94844947, genotype: 'CT' });
});

test('chromosome stays a STRING for X, Y, MT (legacy parseInt bug regression)', function() {
  assert.equal(parser.parse23andMeLine('rs1234567\tX\t2699898\tAG').chromosome, 'X');
  assert.equal(parser.parse23andMeLine('rs2032651\tY\t14832620\tA').chromosome, 'Y');
  assert.equal(parser.parse23andMeLine('rs7654321\tMT\t4917\tCC').chromosome, 'MT');
});

test('no-calls (--) are kept as rows', function() {
  const row = parser.parse23andMeLine('rs115093905\t1\t787173\t--');
  assert.equal(row.genotype, '--');
});

test('internal i-prefixed ids, comments, and malformed lines return null', function() {
  assert.equal(parser.parse23andMeLine('i713426\t1\t891659\tCC'), null);
  assert.equal(parser.parse23andMeLine('# comment'), null);
  assert.equal(parser.parse23andMeLine(''), null);
  assert.equal(parser.parse23andMeLine('badline_no_tabs'), null);
  assert.equal(parser.parse23andMeLine('rs99\t23\t1234\tAA'), null, 'chromosome 23 is invalid');
  assert.equal(parser.parse23andMeLine('rs98\t1\tnotanumber\tAA'), null);
  assert.equal(parser.parse23andMeLine('rs97\t1\t1234\tZZ'), null, 'ZZ is not a genotype');
});

test('indel calls (D/I alleles) are accepted', function() {
  assert.equal(parser.parse23andMeLine('rs113993960\t7\t117199644\tII').genotype, 'II');
  assert.equal(parser.parse23andMeLine('rs113993960\t7\t117199644\tDI').genotype, 'DI');
});

test('parse23andMeLines over the fixture: counts and skips', function() {
  const result = parser.parse23andMeLines(fixture);
  assert.equal(result.isValidHeader, true);
  // 19 valid rs rows; skipped = i-id, badline, chr23, bad position, bad genotype
  assert.equal(result.rows.length, 19);
  assert.equal(result.skipped, 5);
  const markers = result.rows.map(function(row) { return row.marker; });
  assert.ok(markers.includes('rs28929474'));
  assert.ok(!markers.includes('i713426'));
});
