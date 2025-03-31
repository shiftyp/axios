import crypto from 'crypto';
import URLSearchParams from './classes/URLSearchParams.js';
import FormData from './classes/FormData.js';

interface Alphabet {
  DIGIT: string;
  ALPHA: string;
  ALPHA_DIGIT: string;
}

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

const DIGIT = '0123456789';

const ALPHABET: Alphabet = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};

const generateString = (size: number = 16, alphabet: string = ALPHABET.ALPHA_DIGIT): string => {
  let str = '';
  const {length} = alphabet;
  const randomValues = new Uint32Array(size);
  crypto.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }

  return str;
};

export default {
  isNode: true,
  classes: {
    URLSearchParams,
    FormData,
    Blob: typeof Blob !== 'undefined' && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ['http', 'https', 'file', 'data']
};
