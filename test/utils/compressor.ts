import { ethers } from 'hardhat';

// https://www.geocities.ws/diogok_br/lz77/index-2.html

const ReferencePrefix = '`';

const ReferenceIntBase = 96;
const ReferenceIntFloorCode = ' '.charCodeAt(0);

const MaxStringDistance = Math.pow(ReferenceIntBase, 2) - 1;
const MinStringLength = 5;
const MaxStringLength = Math.pow(ReferenceIntBase, 1) - 1 + MinStringLength;

const MaxWindowLength = MaxStringDistance + MinStringLength;

function encodeReferenceInt(value: any, width: any) {
  if (value >= 0 && value < Math.pow(ReferenceIntBase, width) - 1) {
    var encoded = '';
    while (value > 0) {
      encoded = String.fromCharCode((value % ReferenceIntBase) + ReferenceIntFloorCode) + encoded;
      value = Math.floor(value / ReferenceIntBase);
    }

    var missingLength = width - encoded.length;
    for (var i = 0; i < missingLength; i++) {
      encoded = String.fromCharCode(ReferenceIntFloorCode) + encoded;
    }

    return encoded;
  } else {
    throw 'Reference int out of range: ' + value + ' (width = ' + width + ')';
  }
}

function encodeReferenceLength(length: any) {
  return encodeReferenceInt(length - MinStringLength, 1);
}

function compress(data: string, windowLength: number): string {
  if (windowLength > MaxWindowLength) {
    throw 'Window length too large';
  }

  var compressed = '';
  var pos = 0;
  var lastPos = data.length - MinStringLength;
  while (pos < lastPos) {
    var searchStart = Math.max(pos - windowLength, 0);
    var matchLength = MinStringLength;
    var foundMatch = false;
    var bestMatch = { distance: MaxStringDistance, length: 0 };
    var newCompressed = null;

    while (searchStart + matchLength < pos) {
      var isValidMatch = data.substr(searchStart, matchLength) == data.substr(pos, matchLength) && matchLength < MaxStringLength;
      if (isValidMatch) {
        matchLength++;
        foundMatch = true;
      } else {
        var realMatchLength = matchLength - 1;
        if (foundMatch && realMatchLength > bestMatch.length) {
          bestMatch.distance = pos - searchStart - realMatchLength;
          bestMatch.length = realMatchLength;
        }
        matchLength = MinStringLength;
        searchStart++;
        foundMatch = false;
      }
    }

    if (bestMatch.length) {
      newCompressed = ReferencePrefix + encodeReferenceInt(bestMatch.distance, 2) + encodeReferenceLength(bestMatch.length);
      pos += bestMatch.length;
    } else {
      if (data.charAt(pos) != ReferencePrefix) {
        newCompressed = data.charAt(pos);
      } else {
        newCompressed = ReferencePrefix + ReferencePrefix;
      }
      pos++;
    }

    compressed += newCompressed;
  }
  return compressed + data.slice(pos).replace(/`/g, '``');
}

export function compressAndHexifly(data: string): string {
  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(compress(data, 9200)));
}
