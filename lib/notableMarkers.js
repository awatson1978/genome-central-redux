// extensions/genome-central-redux/lib/notableMarkers.js
//
// Curated clinically-notable SNP list for the Ideogram "red marker" track.
// Dependency-free CommonJS (node --test friendly).
//
// IMPORTANT: this list deliberately carries NO genomic coordinates — marker
// positions come from the imported genotype rows themselves (GRCh37 in a
// 23andMe v4 export). data/annotations/all_human_genes.json is Ensembl 80
// (GRCh38) and must never supply positions for build-37 data; gene symbols
// here were cross-checked against it for spelling only.
//
// Selection: the variants named in the operator's 23andMe reports (SERPINA1
// alpha-1 antitrypsin, HLA-DQ celiac haplotype tags) plus a standard panel of
// well-characterized pharmacogenomic/carrier markers found on the v4 chip.
// Educational/informational use only — mirrors the caveat in the 23andMe
// file header; not for medical use.

'use strict';

var NOTABLE_MARKERS = [
  // Alpha-1 antitrypsin deficiency (SERPINA1, chr 14)
  { rsid: 'rs28929474', gene: 'SERPINA1', label: 'PiZ allele', riskAllele: 'T', condition: 'Alpha-1 antitrypsin deficiency' },
  { rsid: 'rs17580',    gene: 'SERPINA1', label: 'PiS allele', riskAllele: 'A', condition: 'Alpha-1 antitrypsin deficiency' },

  // Celiac disease HLA-DQ2.5 / DQ8 haplotype tag SNPs (chr 6)
  { rsid: 'rs2187668',  gene: 'HLA-DQA1', label: 'DQ2.5 haplotype tag', riskAllele: 'T', condition: 'Celiac disease' },
  { rsid: 'rs7454108',  gene: 'HLA-DQB1', label: 'DQ8 haplotype tag',   riskAllele: 'C', condition: 'Celiac disease' },

  // APOE alleles (chr 19) — e4 status requires both markers
  { rsid: 'rs429358',   gene: 'APOE', label: 'APOE e4 determinant', riskAllele: 'C', condition: 'Late-onset Alzheimer risk' },
  { rsid: 'rs7412',     gene: 'APOE', label: 'APOE e2 determinant', riskAllele: 'T', condition: 'Late-onset Alzheimer risk' },

  // Hereditary hemochromatosis (HFE, chr 6)
  { rsid: 'rs1800562',  gene: 'HFE', label: 'C282Y', riskAllele: 'A', condition: 'Hereditary hemochromatosis' },
  { rsid: 'rs1799945',  gene: 'HFE', label: 'H63D',  riskAllele: 'G', condition: 'Hereditary hemochromatosis' },

  // Clotting factors
  { rsid: 'rs6025',     gene: 'F5', label: 'Factor V Leiden', riskAllele: 'A', condition: 'Hereditary thrombophilia' },
  { rsid: 'rs1799963',  gene: 'F2', label: 'Prothrombin G20210A', riskAllele: 'A', condition: 'Hereditary thrombophilia' },

  // Folate metabolism (chr 1)
  { rsid: 'rs1801133',  gene: 'MTHFR', label: 'C677T', riskAllele: 'A', condition: 'MTHFR variant' },

  // Lactase persistence (MCM6/LCT regulatory region, chr 2)
  { rsid: 'rs4988235',  gene: 'MCM6', label: 'Lactase persistence', riskAllele: 'G', condition: 'Lactose intolerance (ancestral allele)' },

  // Cystic fibrosis carrier screen (CFTR deltaF508 tag, chr 7)
  { rsid: 'rs113993960', gene: 'CFTR', label: 'deltaF508', riskAllele: 'D', condition: 'Cystic fibrosis carrier status' },

  // BRCA founder mutations on the v4 chip (chr 17/13)
  { rsid: 'rs80357906', gene: 'BRCA1', label: '5382insC founder', riskAllele: 'I', condition: 'Hereditary breast/ovarian cancer' },
  { rsid: 'rs80359550', gene: 'BRCA2', label: '6174delT founder', riskAllele: 'D', condition: 'Hereditary breast/ovarian cancer' }
];

function notableRsids() {
  return NOTABLE_MARKERS.map(function(marker) { return marker.rsid; });
}

function notableByRsid() {
  var map = {};
  NOTABLE_MARKERS.forEach(function(marker) { map[marker.rsid] = marker; });
  return map;
}

module.exports = {
  NOTABLE_MARKERS: NOTABLE_MARKERS,
  notableRsids: notableRsids,
  notableByRsid: notableByRsid
};
