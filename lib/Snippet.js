




export default Snippet = {
  constructor(document) {
    if (document) {
      Object.assign(this, document);
    }
  },
  isTrue() {
    return true;
  },
  parseFoo(){

  },
  toString(){

  },
  parseString(){

  },
  toFoo(){

  },
  parseBasePairs(){

  },
  toBasePairs(){

  },
  parseCodons(){

  },
  toCodons(){

  },
  parseAminoAcids(){

  },
  toCodonChain(dna){
    var aminoAcidChain = '';
    var codon = '';

    for (var letterIndex = 0; letterIndex < dna.length; letterIndex++) {

      // we're using the modulo operator; compensating for a count-from-zero offset
      if ((letterIndex + 1) % 3 === 0) {

        codon = dna[letterIndex - 2] + dna[letterIndex - 1] + dna[letterIndex];

        if (letterIndex === 2) {
          aminoAcidChain = codon;
        } else {
          aminoAcidChain = aminoAcidChain + "-" + codon;
        }
      }
    }
    return aminoAcidChain;
  },
  toAminoAcids(dna){
    var aminoAcidChain = '';
    var codon = '';
    var aminoAcid = ''

    for (var letterIndex = 0; letterIndex < dna.length; letterIndex++) {

      if ((letterIndex + 1) % 3 === 0) {

        codon = dna[letterIndex - 2] + dna[letterIndex - 1] + dna[letterIndex];

        switch (codon) {
          case "AAA":
            aminoAcid = "Lys";
            break;
          case "AAC":
            aminoAcid = "Lys";
            break;
          case "AAG":
            aminoAcid = "Lys";
            break;
          case "AAT":
            aminoAcid = "Lys";
            break;
          case "ACA":
            aminoAcid = "Thr";
            break;
          case "ACC":
            aminoAcid = "Thr";
            break;
          case "ACG":
            aminoAcid = "Thr";
            break;
          case "ACT":
            aminoAcid = "Thr";
            break;
          case "AGA":
            aminoAcid = "Arg";
            break;
          case "AGC":
            aminoAcid = "Ser";
            break;
          case "AGG":
            aminoAcid = "Arg";
            break;
          case "AGT":
            aminoAcid = "Ser";
            break;
          case "ATA":
            aminoAcid = "Ile";
            break;
          case "ATC":
            aminoAcid = "Ile";
            break;
          case "ATG":
            aminoAcid = "Met";
            break;
          case "ATT":
            aminoAcid = "Ile";
            break;



          case "CAA":
            aminoAcid = "Gln";
            break;
          case "CAC":
            aminoAcid = "His";
            break;
          case "CAG":
            aminoAcid = "Gln";
            break;
          case "CAT":
            aminoAcid = "His";
            break;
          case "CCA":
            aminoAcid = "Pro";
            break;
          case "CCC":
            aminoAcid = "Pro";
            break;
          case "CCG":
            aminoAcid = "Pro";
            break;
          case "CCT":
            aminoAcid = "Pro";
            break;
          case "CGA":
            aminoAcid = "Arg";
            break;
          case "CGC":
            aminoAcid = "Arg";
            break;
          case "CGG":
            aminoAcid = "Arg";
            break;
          case "CGT":
            aminoAcid = "Arg";
            break;
          case "CTA":
            aminoAcid = "Leu";
            break;
          case "CTC":
            aminoAcid = "Leu";
            break;
          case "CTG":
            aminoAcid = "Leu";
            break;
          case "CTT":
            aminoAcid = "Leu";
            break;

          case "GAA":
            aminoAcid = "Glu";
            break;
          case "GAC":
            aminoAcid = "Asp";
            break;
          case "GAG":
            aminoAcid = "Glu";
            break;
          case "GAT":
            aminoAcid = "Asp";
            break;
          case "GCA":
            aminoAcid = "Ala";
            break;
          case "GCC":
            aminoAcid = "Ala";
            break;
          case "GCG":
            aminoAcid = "Ala";
            break;
          case "GCT":
            aminoAcid = "Ala";
            break;
          case "GGA":
            aminoAcid = "Gly";
            break;
          case "GGC":
            aminoAcid = "Gly";
            break;
          case "GGG":
            aminoAcid = "Gly";
            break;
          case "GGT":
            aminoAcid = "Gly";
            break;
          case "GTA":
            aminoAcid = "Val";
            break;
          case "GTC":
            aminoAcid = "Val";
            break;
          case "GTG":
            aminoAcid = "Val";
            break;
          case "GTT":
            aminoAcid = "Val";
            break;

          case "TAA":
            aminoAcid = "Ter";
            break;
          case "TAC":
            aminoAcid = "Tyr";
            break;
          case "TAG":
            aminoAcid = "Ter";
            break;
          case "TAT":
            aminoAcid = "Tyr";
            break;
          case "TCA":
            aminoAcid = "Ser";
            break;
          case "TCC":
            aminoAcid = "Ser";
            break;
          case "TCG":
            aminoAcid = "Ser";
            break;
          case "TCT":
            aminoAcid = "Ser";
            break;
          case "TGA":
            aminoAcid = "Ter";
            break;
          case "TGC":
            aminoAcid = "Cys";
            break;
          case "TGG":
            aminoAcid = "Trp";
            break;
          case "TGT":
            aminoAcid = "Cys";
            break;
          case "TTA":
            aminoAcid = "Leu";
            break;
          case "TTC":
            aminoAcid = "Phe";
            break;
          case "TTG":
            aminoAcid = "Leu";
            break;
          case "TTT":
            aminoAcid = "Phe";
            break;

          default:
            aminoAcid = "???";
            break;
        }


        if (letterIndex === 2) {
          aminoAcidChain = aminoAcid;
        } else {
          aminoAcidChain = aminoAcidChain + "-" + aminoAcid;
        }

      }
    }
    return aminoAcidChain;
  },
  toAminoAcidCode(dna){
    var aminoAcidChain = '';
    var codon = '';
    var aminoAcid = ''

    for (var letterIndex = 0; letterIndex < dna.length; letterIndex++) {

      if ((letterIndex + 1) % 3 === 0) {

        codon = dna[letterIndex - 2] + dna[letterIndex - 1] + dna[letterIndex];

        switch (codon) {
          case "AAA":
            aminoAcid = "K";
            break;
          case "AAC":
            aminoAcid = "K";
            break;
          case "AAG":
            aminoAcid = "K";
            break;
          case "AAT":
            aminoAcid = "K";
            break;
          case "ACA":
            aminoAcid = "T";
            break;
          case "ACC":
            aminoAcid = "T";
            break;
          case "ACG":
            aminoAcid = "T";
            break;
          case "ACT":
            aminoAcid = "T";
            break;
          case "AGA":
            aminoAcid = "R";
            break;
          case "AGC":
            aminoAcid = "S";
            break;
          case "AGG":
            aminoAcid = "R";
            break;
          case "AGT":
            aminoAcid = "S";
            break;
          case "ATA":
            aminoAcid = "I";
            break;
          case "ATC":
            aminoAcid = "I";
            break;
          case "ATG":
            aminoAcid = "M";
            break;
          case "ATT":
            aminoAcid = "I";
            break;



          case "CAA":
            aminoAcid = "Q";
            break;
          case "CAC":
            aminoAcid = "H";
            break;
          case "CAG":
            aminoAcid = "Q";
            break;
          case "CAT":
            aminoAcid = "H";
            break;
          case "CCA":
            aminoAcid = "P";
            break;
          case "CCC":
            aminoAcid = "P";
            break;
          case "CCG":
            aminoAcid = "P";
            break;
          case "CCT":
            aminoAcid = "P";
            break;
          case "CGA":
            aminoAcid = "R";
            break;
          case "CGC":
            aminoAcid = "R";
            break;
          case "CGG":
            aminoAcid = "R";
            break;
          case "CGT":
            aminoAcid = "R";
            break;
          case "CTA":
            aminoAcid = "L";
            break;
          case "CTC":
            aminoAcid = "L";
            break;
          case "CTG":
            aminoAcid = "L";
            break;
          case "CTT":
            aminoAcid = "L";
            break;

          case "GAA":
            aminoAcid = "E";
            break;
          case "GAC":
            aminoAcid = "D";
            break;
          case "GAG":
            aminoAcid = "E";
            break;
          case "GAT":
            aminoAcid = "D";
            break;
          case "GCA":
            aminoAcid = "A";
            break;
          case "GCC":
            aminoAcid = "A";
            break;
          case "GCG":
            aminoAcid = "A";
            break;
          case "GCT":
            aminoAcid = "A";
            break;
          case "GGA":
            aminoAcid = "G";
            break;
          case "GGC":
            aminoAcid = "G";
            break;
          case "GGG":
            aminoAcid = "G";
            break;
          case "GGT":
            aminoAcid = "G";
            break;
          case "GTA":
            aminoAcid = "V";
            break;
          case "GTC":
            aminoAcid = "V";
            break;
          case "GTG":
            aminoAcid = "V";
            break;
          case "GTT":
            aminoAcid = "V";
            break;

          case "TAA":
            aminoAcid = "Ter";
            break;
          case "TAC":
            aminoAcid = "Y";
            break;
          case "TAG":
            aminoAcid = "Ter";
            break;
          case "TAT":
            aminoAcid = "Y";
            break;
          case "TCA":
            aminoAcid = "S";
            break;
          case "TCC":
            aminoAcid = "S";
            break;
          case "TCG":
            aminoAcid = "S";
            break;
          case "TCT":
            aminoAcid = "S";
            break;
          case "TGA":
            aminoAcid = "Ter";
            break;
          case "TGC":
            aminoAcid = "C";
            break;
          case "TGG":
            aminoAcid = "W";
            break;
          case "TGT":
            aminoAcid = "C";
            break;
          case "TTA":
            aminoAcid = "L";
            break;
          case "TTC":
            aminoAcid = "F";
            break;
          case "TTG":
            aminoAcid = "L";
            break;
          case "TTT":
            aminoAcid = "F";
            break;

          default:
            aminoAcid = "-";
            break;
        }


        if (letterIndex === 2) {
          aminoAcidChain = aminoAcid;
        } else {
          aminoAcidChain = aminoAcidChain + aminoAcid;
        }

      }
    }
    return aminoAcidChain;
  },

  parseDna(){

  },
  toRna(dna){
    var rnaTrnascription = '';
    for (letter of dna){
      rnaTrnascription = rnaTrnascription + letter;
    }
    return rnaTrnascription;
  },
  parseRna(){
  },
  toDna(rna){
    var dnaTrnascription = '';
    for (letter of rna){
      switch (letter) {
        case "G":
          dnaTrnascription = dnaTrnascription + "C";
          break;
        case "A":
          dnaTrnascription = dnaTrnascription + "U";
          break;
        case "T":
          dnaTrnascription = dnaTrnascription + "A";
          break;
        case "C":
          dnaTrnascription = dnaTrnascription + "G";
          break;
        default:

      }
    }
    return dnaTrnascription;
  }
};
