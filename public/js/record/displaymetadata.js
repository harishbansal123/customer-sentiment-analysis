/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global $ */

function showResult(msg, baseString, model) {
  if (msg.results && msg.results.length > 0) {

    var alternatives = msg.results[0].alternatives;
    var text = msg.results[0].alternatives[0].transcript || '';

    // apply mappings to beautify
    text = text.replace(/%HESITATION\s/g, '');
    text = text.replace(/(.)\1{2,}/g, '');
    if (msg.results[0].final)
       console.log('-> ' + text);
    text = text.replace(/D_[^\s]+/g,'');

    // if all words are mapped to nothing then there is nothing else to do
    if ((text.length === 0) || (/^\s+$/.test(text))) {
    	 return baseString;
    }

    // var japanese =  ((model.substring(0,5) === 'ja-JP') || (model.substring(0,5) === 'zh-CN'));

    // capitalize first word
    // if final results, append a new paragraph
    if (msg.results && msg.results[0] && msg.results[0].final) {
       text = text.slice(0, -1);
       text = text.charAt(0).toUpperCase() + text.substring(1);
       /*if (japanese) {
         text = text.trim() + '。';
         text = text.replace(/ /g,'');
       } else {*/
       text = text.trim() + '. ';
       //}
       baseString += text;
       console.log(baseString);
       //console.log('final');
       $('#resultsText').val(baseString);
       //showMetaData(alternatives[0]);
       // Only show alternatives if we're final
       //alternativePrototype.showAlternatives(alternatives);
    } else {
      /*if(japanese) {
        text = text.replace(/ /g,'');      // remove whitespaces
      } else {*/
      //text = text.charAt(0).toUpperCase() + text.substring(1);
      // }
      //$('#resultsText').val(baseString + text);
      //console.log('not final');
      //console.log(baseString + text);
    }
  }

  //updateScroll();
  //updateTextScroll();
  return baseString;
};