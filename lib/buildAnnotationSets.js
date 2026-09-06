// extensions/genome-central-redux/lib/buildAnnotationSets.js
//
// Build ideogram raw-annotation documents from imported genotype data.
// Dependency-free CommonJS (node --test friendly).
//
// Output matches the ideogram library's raw annots contract so the client
// can pass a stored document straight into `new Ideogram({ annotations })`:
//   { keys: ['name','start','length','trackIndex','color'],
//     annots: [ { chr: '1', annots: [ [name, start, length, trackIndex, color], ... ] }, ... ] }
//
// Two tracks: 0 = clinically notable markers (red), 1 = SNP density bins.
// All positions are the SNP's own coordinates (GRCh37 for a 23andMe v4
// export) — never sourced from the GRCh38 gene reference file.

'use strict';

var ANNOTATION_KEYS = ['name', 'start', 'length', 'trackIndex', 'color'];

var NOTABLE_TRACK_INDEX = 0;
var DENSITY_TRACK_INDEX = 1;

var NOTABLE_COLOR = '#d32f2f';
var DENSITY_COLOR = '#5c6bc0';

// Ideogram's human karyotype has no mitochondrial chromosome.
var DISPLAYABLE_CHROMOSOMES = ['1','2','3','4','5','6','7','8','9','10','11',
  '12','13','14','15','16','17','18','19','20','21','22','X','Y'];

// Canonical GRCh37 (hg19) chromosome lengths. Ideogram throws
// "Base pair out of range" for any annotation whose start+length exceeds the
// chromosome end, so density bins (and defensively, markers) are clamped.
var CHR_LENGTHS_GRCH37 = {
  '1': 249250621, '2': 243199373, '3': 198022430, '4': 191154276,
  '5': 180915260, '6': 171115067, '7': 159138663, '8': 146364022,
  '9': 141213431, '10': 135534747, '11': 135006516, '12': 133851895,
  '13': 115169878, '14': 107349540, '15': 102531392, '16': 90354753,
  '17': 81195210, '18': 78077248, '19': 59128983, '20': 63025520,
  '21': 48129895, '22': 51304566, 'X': 155270560, 'Y': 59373566
};

function emptyChromosomeBuckets() {
  var buckets = {};
  DISPLAYABLE_CHROMOSOMES.forEach(function(chr) { buckets[chr] = []; });
  return buckets;
}

function bucketsToAnnots(buckets) {
  var annots = [];
  DISPLAYABLE_CHROMOSOMES.forEach(function(chr) {
    if (buckets[chr].length > 0) {
      annots.push({ chr: chr, annots: buckets[chr] });
    }
  });
  return annots;
}

/**
 * Build the notable-marker track from genotype rows matched against the
 * curated list.
 * @param {Array} genotypeRows - [{marker, chromosome, position, genotype}]
 * @param {Array} notableList - NOTABLE_MARKERS shape [{rsid, gene, label, condition}]
 * @returns {Object} { keys, annots, count }
 */
function buildNotableAnnots(genotypeRows, notableList) {
  var byRsid = {};
  (notableList || []).forEach(function(marker) { byRsid[marker.rsid] = marker; });

  var buckets = emptyChromosomeBuckets();
  var count = 0;
  (genotypeRows || []).forEach(function(row) {
    var notable = byRsid[row.marker];
    if (!notable || !buckets[row.chromosome]) {
      return;
    }
    var name = notable.gene + ' ' + row.marker + ' ' + row.genotype +
      (notable.label ? ' (' + notable.label + ')' : '');
    buckets[row.chromosome].push([name, row.position, 1, NOTABLE_TRACK_INDEX, NOTABLE_COLOR]);
    count++;
  });

  return { keys: ANNOTATION_KEYS.slice(), annots: bucketsToAnnots(buckets), count: count };
}

/**
 * Build the density track from per-bin SNP counts (the server aggregates
 * 600K rows down to these bins; the client never sees the rows).
 * @param {Array} binCounts - [{chromosome, bin, count}] where bin is
 *   floor(position / binSizeBp)
 * @param {number} binSizeBp - bin width in base pairs (e.g. 5000000)
 * @returns {Object} { keys, annots, maxBinCount, binSizeBp }
 */
function buildDensityAnnots(binCounts, binSizeBp) {
  var buckets = emptyChromosomeBuckets();
  var maxBinCount = 0;
  (binCounts || []).forEach(function(entry) {
    if (!buckets[entry.chromosome] || !(entry.count > 0)) {
      return;
    }
    var chrLength = CHR_LENGTHS_GRCH37[entry.chromosome];
    var start = entry.bin * binSizeBp;
    if (chrLength && start >= chrLength) {
      return;
    }
    // Clamp the final bin so start+length never runs past the chromosome end.
    var length = chrLength ? Math.min(binSizeBp, chrLength - start) : binSizeBp;
    if (entry.count > maxBinCount) {
      maxBinCount = entry.count;
    }
    var name = entry.count + ' SNPs';
    buckets[entry.chromosome].push([name, start, length, DENSITY_TRACK_INDEX, DENSITY_COLOR]);
  });

  return {
    keys: ANNOTATION_KEYS.slice(),
    annots: bucketsToAnnots(buckets),
    maxBinCount: maxBinCount,
    binSizeBp: binSizeBp
  };
}

/**
 * Clamp a stored annotation-set doc's entries to GRCh37 chromosome bounds
 * (read-side safety net for sets built before clamping existed, and for any
 * malformed positions). Mutates and returns the set. Annot layout is
 * [name, start, length, ...] per ANNOTATION_KEYS.
 * @param {Object|null} set - { keys, annots } doc
 * @returns {Object|null} the set
 */
function clampAnnotationSet(set) {
  if (!set || !Array.isArray(set.annots)) {
    return set;
  }
  set.annots.forEach(function(chrEntry) {
    var chrLength = CHR_LENGTHS_GRCH37[chrEntry.chr];
    if (!chrLength || !Array.isArray(chrEntry.annots)) {
      return;
    }
    chrEntry.annots = chrEntry.annots.filter(function(annot) {
      return annot[1] < chrLength;
    });
    chrEntry.annots.forEach(function(annot) {
      if (annot[1] + annot[2] > chrLength) {
        annot[2] = chrLength - annot[1];
      }
    });
  });
  set.annots = set.annots.filter(function(chrEntry) {
    return Array.isArray(chrEntry.annots) && chrEntry.annots.length > 0;
  });
  return set;
}

/**
 * Merge multiple {keys, annots} sets into one raw-annots object for the
 * ideogram `annotations` config (client-side helper; sets must share keys).
 * @param {Array} sets - [{keys, annots}]
 * @returns {Object|null} merged { keys, annots } or null when nothing to show
 */
function mergeAnnotationSets(sets) {
  var merged = {};
  var keys = null;
  (sets || []).forEach(function(set) {
    if (!set || !Array.isArray(set.annots)) {
      return;
    }
    keys = keys || set.keys;
    set.annots.forEach(function(chrEntry) {
      if (!merged[chrEntry.chr]) {
        merged[chrEntry.chr] = [];
      }
      merged[chrEntry.chr] = merged[chrEntry.chr].concat(chrEntry.annots);
    });
  });
  if (!keys) {
    return null;
  }
  var annots = [];
  DISPLAYABLE_CHROMOSOMES.forEach(function(chr) {
    if (merged[chr] && merged[chr].length > 0) {
      annots.push({ chr: chr, annots: merged[chr] });
    }
  });
  return { keys: keys, annots: annots };
}

module.exports = {
  ANNOTATION_KEYS: ANNOTATION_KEYS,
  NOTABLE_TRACK_INDEX: NOTABLE_TRACK_INDEX,
  DENSITY_TRACK_INDEX: DENSITY_TRACK_INDEX,
  NOTABLE_COLOR: NOTABLE_COLOR,
  DENSITY_COLOR: DENSITY_COLOR,
  DISPLAYABLE_CHROMOSOMES: DISPLAYABLE_CHROMOSOMES,
  CHR_LENGTHS_GRCH37: CHR_LENGTHS_GRCH37,
  buildNotableAnnots: buildNotableAnnots,
  buildDensityAnnots: buildDensityAnnots,
  clampAnnotationSet: clampAnnotationSet,
  mergeAnnotationSets: mergeAnnotationSets
};
