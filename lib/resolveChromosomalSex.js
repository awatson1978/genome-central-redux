// packages/genome-central-redux/lib/resolveChromosomalSex.js
import { get } from 'lodash';

// Karyotype SNOMED codes that indicate Y chromosome presence
var MALE_KARYOTYPE_CODES = [
  '734003000', // 46,XY
  '20704005',  // 47,XYY (Jacob's Syndrome)
  '41979000'   // 47,XXY (Klinefelter Syndrome)
];

var FEMALE_KARYOTYPE_CODES = [
  '734002005', // 46,XX
  '30699003',  // 47,XXX (Triple X Syndrome)
  '80427008'   // 45,X0 (Turner Syndrome)
];

// Extension URLs in priority order
var EXT_KARYOTYPE = 'http://hl7.org/fhir/StructureDefinition/patient-karyotype';
var EXT_BIRTHSEX = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex';
var EXT_SEX = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex';
var EXT_RECORDED_SEX = 'http://hl7.org/fhir/StructureDefinition/individual-recordedSexOrGender';
var EXT_SPCU = 'http://hl7.org/fhir/StructureDefinition/patient-sexParameterForClinicalUse';

/**
 * Normalize any sex/gender representation to 'male' or 'female'.
 * Defaults to 'female' for unknown/other/null values (everyone has at least one X).
 */
export function normalizeSexValue(value) {
  if (!value) {
    return 'female';
  }

  var normalized = String(value).trim().toLowerCase();

  switch (normalized) {
    case 'male':
    case 'm':
    case '248153007': // SNOMED male
      return 'male';

    case 'female':
    case 'f':
    case '248152002': // SNOMED female
      return 'female';

    default:
      // unknown, UNK, other, OTH, ASKU, etc.
      return 'female';
  }
}

/**
 * Walk patient.extension[], find matching URL, extract value from
 * valueCode, valueCodeableConcept.coding[0].code, or valueString.
 */
function getExtensionValue(patient, url) {
  var extensions = get(patient, 'extension', []);
  if (!Array.isArray(extensions)) {
    return null;
  }

  var ext = extensions.find(function(e) {
    return get(e, 'url') === url;
  });

  if (!ext) {
    return null;
  }

  // valueCode (most common for birthsex, us-core-sex)
  if (ext.valueCode) {
    return ext.valueCode;
  }

  // valueCodeableConcept (karyotype, SPCU, recordedSexOrGender)
  var conceptCode = get(ext, 'valueCodeableConcept.coding.0.code');
  if (conceptCode) {
    return conceptCode;
  }

  // valueString (fallback)
  if (ext.valueString) {
    return ext.valueString;
  }

  return null;
}

/**
 * Resolve chromosomal sex from a Patient FHIR resource.
 * Returns 'male' or 'female' based on priority-ordered extraction.
 *
 * Priority:
 *   1. Karyotype extension (SNOMED codes → direct mapping)
 *   2. US Core Birth Sex (USCDI v1-v3)
 *   3. US Core Sex (USCDI v4+)
 *   4. Recorded Sex or Gender (R5 backport / USCDI v5+)
 *   5. Sex Parameter for Clinical Use (USCDI v3+)
 *   6. Patient.gender (FHIR base field)
 *   7. Patient.sex (nonstandard legacy)
 *   8. Default → 'female'
 */
export function resolveChromosomalSex(patient) {
  if (!patient) {
    return 'female';
  }

  // 1. Karyotype extension (most precise)
  var karyotypeCode = getExtensionValue(patient, EXT_KARYOTYPE);
  if (karyotypeCode) {
    if (MALE_KARYOTYPE_CODES.indexOf(karyotypeCode) !== -1) {
      return 'male';
    }
    if (FEMALE_KARYOTYPE_CODES.indexOf(karyotypeCode) !== -1) {
      return 'female';
    }
    // Unknown karyotype code (261665006, OTH) — fall through
  }

  // 2. US Core Birth Sex (USCDI v1-v3)
  var birthSex = getExtensionValue(patient, EXT_BIRTHSEX);
  if (birthSex) {
    var resolved = normalizeSexValue(birthSex);
    if (birthSex.toUpperCase() === 'M' || birthSex.toUpperCase() === 'F') {
      return resolved;
    }
    // UNK, ASKU — fall through to try other sources
  }

  // 3. US Core Sex (USCDI v4+)
  var coreSex = getExtensionValue(patient, EXT_SEX);
  if (coreSex) {
    var coreResolved = normalizeSexValue(coreSex);
    if (coreSex.toUpperCase() === 'M' || coreSex.toUpperCase() === 'F') {
      return coreResolved;
    }
  }

  // 4. Recorded Sex or Gender (R5 backport / USCDI v5+)
  var recordedSex = getExtensionValue(patient, EXT_RECORDED_SEX);
  if (recordedSex) {
    var recordedResolved = normalizeSexValue(recordedSex);
    if (recordedResolved === 'male' || recordedSex.toUpperCase() === 'M' || recordedSex.toUpperCase() === 'F') {
      return recordedResolved;
    }
  }

  // 5. Sex Parameter for Clinical Use (USCDI v3+)
  var spcu = getExtensionValue(patient, EXT_SPCU);
  if (spcu) {
    var spcuResolved = normalizeSexValue(spcu);
    if (spcu.toUpperCase() === 'M' || spcu.toUpperCase() === 'F' || spcu.toLowerCase() === 'male' || spcu.toLowerCase() === 'female') {
      return spcuResolved;
    }
  }

  // 6. Patient.gender (administrative, but useful fallback)
  var gender = get(patient, 'gender');
  if (gender) {
    var genderResolved = normalizeSexValue(gender);
    if (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'female') {
      return genderResolved;
    }
  }

  // 7. Patient.sex (nonstandard, some legacy systems)
  var sex = get(patient, 'sex');
  if (sex) {
    return normalizeSexValue(sex);
  }

  // 8. Default
  return 'female';
}
