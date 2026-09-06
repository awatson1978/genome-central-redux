// extensions/genome-central-redux/lib/fastqStats.js
//
// FASTQ read statistics from a sampled prefix. Dependency-free CommonJS
// (node --test friendly). The WGS files are ~123GB — the server streams the
// first ~10K reads through this summarizer and never reads further.
//
// FASTQ record = 4 lines: @id / sequence / + / quality.

'use strict';

/**
 * Summarize read lengths from sampled FASTQ lines.
 * @param {Array<string>} sampledLines - raw lines from the file prefix
 * @returns {Object} { reads, meanLen, minLen, maxLen }
 */
function summarizeReads(sampledLines) {
  var result = { reads: 0, meanLen: 0, minLen: 0, maxLen: 0 };
  if (!Array.isArray(sampledLines) || sampledLines.length === 0) {
    return result;
  }
  var totalLen = 0;
  // Sequence lines sit at offset 1 of each 4-line record. Walk records; a
  // truncated trailing record is ignored.
  for (var i = 0; i + 1 < sampledLines.length; i += 4) {
    var header = sampledLines[i];
    if (typeof header !== 'string' || header.charAt(0) !== '@') {
      continue;
    }
    var sequence = sampledLines[i + 1];
    if (typeof sequence !== 'string' || sequence.length === 0) {
      continue;
    }
    var len = sequence.trim().length;
    if (len === 0) {
      continue;
    }
    result.reads++;
    totalLen += len;
    if (result.minLen === 0 || len < result.minLen) {
      result.minLen = len;
    }
    if (len > result.maxLen) {
      result.maxLen = len;
    }
  }
  if (result.reads > 0) {
    result.meanLen = Math.round(totalLen / result.reads);
  }
  return result;
}

/**
 * Estimate the total read count of a FASTQ file from sampled stats.
 * bytesPerRead ≈ sequence + quality lines (meanLen each) plus header and
 * separator overhead, approximated as 60 bytes.
 * @param {Object} stats - output of summarizeReads
 * @param {number} fileBytes - uncompressed file size (0/unknown -> 0)
 * @returns {number} estimated read count (0 when not estimable)
 */
function estimateReadCount(stats, fileBytes) {
  if (!stats || !(stats.meanLen > 0) || !(fileBytes > 0)) {
    return 0;
  }
  var bytesPerRead = (stats.meanLen * 2) + 60;
  return Math.round(fileBytes / bytesPerRead);
}

/**
 * Pair FASTQ paths by the R1/R2 naming convention: identical names except a
 * '1'/'2' immediately before the .fq/.fastq(.gz) extension.
 * @param {Array<string>} paths
 * @returns {Array} [{ r1, r2 }] plus singletons as { r1 } or { r2 }
 */
function pairFastqPaths(paths) {
  var pairs = [];
  var byStem = {};
  (paths || []).forEach(function(path) {
    var match = /^(.*)([12])(\.f(?:ast)?q(?:\.gz)?)$/i.exec(path);
    if (!match) {
      pairs.push({ r1: path });
      return;
    }
    var stem = match[1] + '#' + match[3];
    if (!byStem[stem]) {
      byStem[stem] = {};
      pairs.push(byStem[stem]);
    }
    byStem[stem][match[2] === '1' ? 'r1' : 'r2'] = path;
  });
  return pairs;
}

module.exports = {
  summarizeReads: summarizeReads,
  estimateReadCount: estimateReadCount,
  pairFastqPaths: pairFastqPaths
};
