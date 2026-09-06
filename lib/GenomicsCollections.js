// extensions/genome-central-redux/lib/GenomicsCollections.js
//
// Genomics collections for the import pipeline. Plain Mongo.Collections
// (SimpleSchema is retired — do NOT resurrect lib/MyGenotype.js, whose
// attachSchema call crashes boot). Registered into global.Collections on the
// server so importRuns.census/flush cover them: both collections' rows carry
// meta.tag run tags, which is the flushability contract.
//
// MyGenotype row (per SNP, ~600K per full 23andMe import):
//   { _id, marker: 'rs28929474', chromosome: '14' (STRING '1'..'22','X','Y','MT'),
//     position: 94844947 (int, GRCh37), genotype: 'AG' ('--' = no-call),
//     patientId, meta: { tag: [runTag] } }
//
// GenomeAnnotationSets doc (one per track per import; ideogram raw-annots
// format — see lib/buildAnnotationSets.js).

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const MyGenotype = new Mongo.Collection('MyGenotype');
export const GenomeAnnotationSets = new Mongo.Collection('GenomeAnnotationSets');

if (Meteor.isServer) {
  Meteor.startup(async function() {
    // Defensive: this workflow's startup may run before the host populates
    // global.Collections (lib/collections.js precedent). Late registration is
    // fine — census/flush enumerate Object.keys(global.Collections) per call.
    global.Collections = global.Collections || {};
    global.Collections.MyGenotype = MyGenotype;
    global.Collections.GenomeAnnotationSets = GenomeAnnotationSets;

    // Without the meta.tag.code index, census/flush collscan 600K rows.
    await MyGenotype.createIndexAsync({ marker: 1 });
    await MyGenotype.createIndexAsync({ patientId: 1, chromosome: 1 });
    await MyGenotype.createIndexAsync({ 'meta.tag.code': 1 });
    await GenomeAnnotationSets.createIndexAsync({ patientId: 1, trackType: 1 });
  });
}
