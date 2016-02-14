'use strict';

String.prototype.insert = function (index, string) {
  if (index > 0) {
    return this.substring(0, index) + string + this.substring(index, this.length);
  } else {
    return string + this;
  }
};

function matchTerm (text, term) {
  var re = new RegExp(term, 'ig');
  var matchPos = [];
  if (!text) {
    return matchPos;
  }
  var match = re.exec(text);
  while (match) {
    matchPos.push(match.index);
    match = re.exec(text);
  }
  return matchPos;
}

export function highlightText (text, term) {
  var matchedFragments = matchTerm(text, term);
  if (text && matchedFragments.length) {
    for (var i = matchedFragments.length - 1; i >= 0; i--) {
      var startingIndex = matchedFragments[i];
      var endingIndex = startingIndex + term.length;
      text = text.insert(endingIndex, '</span>');
      text = text.insert(startingIndex, '<span class="highlight">');
    }
  }
  return text;
}

