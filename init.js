//////////////////////////////////////////////////////////////////////////////80
// Atheos-Beautify: Beautify PHP, CSS, JS & HTML for the Atheos IDE
//////////////////////////////////////////////////////////////////////////////80
// Copyright (c) 2020 Liam Siira (liam@siira.io), distributed as-is and without
// warranty under the MIT License. See [root]/license.md for more.
// This information must remain intact.
//////////////////////////////////////////////////////////////////////////////80
// Copyright (c) 2015 Andr3as
// Source: https://github.com/Andr3as/Codiad-AutoAlignment
//////////////////////////////////////////////////////////////////////////////80

(function(global) {

	var atheos = global.atheos,
		Range = ace.require('ace/range').Range;

	var self = null;


	amplify.subscribe('system.loadExtra', () => atheos.AutoAlign.init());


	atheos.AutoAlign = {

		path: atheos.path + 'plugins/AutoAlign/',
		controller: atheos.path + 'controller.php',
		dialog: atheos.path + 'dialog.php',
		tabWidth: 4,
		secondMode: false,

		wordPre: ["+", "-", "*", "/", "%", ":", "!", "."],

		init: function() {
			self = this;
			amplify.subscribe('active.focus', function(path) {
				if (atheos.editor.getActive() === null) return;
				var manager = atheos.editor.getActive().commands;
				self.tabWidth = atheos.editor.getActive().getSession().getTabSize();

				manager.addCommand({
					name: 'alignSign',
					bindKey: {
						"win": "Ctrl-Alt-A",
						"mac": "Command-Alt-A"
					},
					exec: function() {
						self.secondMode = false;
						self.alignSign();
					}
				});

				manager.addCommand({
					name: 'alignLine',
					bindKey: {
						"win": "Ctrl-Alt-Shift-A",
						"mac": "Command-Alt-Shift-A"
					},
					exec: function() {
						self.alignLines();
					}
				});

				manager.addCommand({
					name: 'alignKeys',
					bindKey: {
						"win": "Alt-A",
						"mac": "Alt-A"
					},
					exec: function() {
						self.secondMode = true;
						self.alignSign();
					}
				});
			});
		},

		//////////////////////////////////////////////////////////
		//
		//  Run alignment to correct the style of the signs
		//
		//////////////////////////////////////////////////////////
		alignSign: function() {
			var trimedArray = [];
			var editor = atheos.editor.getActive();
			var session = editor.getSession();
			var selText = atheos.editor.getSelectedText();
			if (selText === "") {
				atheos.message.error("Nothing selected!");
				return false;
			}

			if (editor.inMultiSelectMode) {
				//Multiselection
				var multiRanges = editor.multiSelect.getAllRanges();
				for (var i = 0; i < multiRanges.length; i++) {
					self.runCommandForRange(multiRanges[i], self.alignSignInSelection.bind(self));
				}
			} else {
				//Singleselection
				self.runCommandForRange(editor.getSelectionRange(), self.alignSignInSelection.bind(self));
			}
			return true;
		},

		//////////////////////////////////////////////////////////
		//
		//  Align content
		//
		//  Parameters
		//
		//  content - {String} - Content to align
		//
		//  Result
		//
		//  {String} - Aligned content
		//
		//////////////////////////////////////////////////////////
		alignSignInSelection: function(content) {
			var trimedArray = [];
			//Get line ending
			var type = self.getLineEnding(content);
			//Split selected text
			var selArray = content.split(type);
			//Generate space
			var space = "";
			for (var i = 0; i < self.tabWidth; i++) {
				space += " ";
			}
			//Trim whitespace at the start of each line
			for (var j = 0; j < selArray.length; j++) {
				var obj = self.trimStartSpace(selArray[j]);
				obj.string = obj.string.replace(new RegExp("\t", "g"), space);
				selArray[j] = obj.string;
				trimedArray.push(obj.trimed);
			}

			//Check whether to handle an equal sign or a colon
			var sign = "";
			var lastPos = self.findLastPos(selArray, "=");
			if (lastPos == -1) {
				lastPos = self.findLastPos(selArray, ":");
				if (lastPos == -1) {
					//neither an equal sing nor a colon
					return false;
				}
				sign = ":";
			} else {
				sign = "=";
			}
			//Check if sign is on a "tab position"
			var rest = lastPos % self.tabWidth;

			//Insert space until sign is on a "tab position"
			while ((lastPos % self.tabWidth) !== 0) {
				lastPos++;
			}
			//Edit each line and insert space until the sign of this line 
			//  is on the "lastposition"
			for (var n = 0; n < selArray.length; n++) {
				selArray[n] = self.moveSign(selArray[n], lastPos, sign);
			}
			//Insert Text
			insText = "";
			for (var t = 0; t < (selArray.length - 1); t++) {
				insText += trimedArray[t] + selArray[t] + "\n";
			}
			insText += trimedArray[selArray.length - 1] + selArray[selArray.length - 1];
			//Normalize line endings
			insText = self.normalizeLineEnding(insText, type);
			//Return result
			return insText;
		},

		//////////////////////////////////////////////////////////
		//
		//  Trim all space at the beginning of the string
		//
		//  Parameter
		//
		//  str - {String} - Untrimmed string
		//
		//  Result
		//
		//  obj - {Object} - string -> string without space, 
		//                              trimed -> space
		//
		//////////////////////////////////////////////////////////
		trimStartSpace: function(str) {
			trimedSpace = "";
			while ((str[0] == " ") || (str[0] == "\t")) {
				if (str[0] == " ") {
					trimedSpace += " ";
					str = this.minusFirstChar(str);
				} else if (str[0] == "\t") {
					trimedSpace += "\t";
					str = this.minusFirstChar(str);
				}
			}
			var obj = {
				"string": str,
				"trimed": trimedSpace
			};
			return obj;
		},

		//////////////////////////////////////////////////////////
		//
		//  Delete the first char of the string
		//
		//  Parameter
		//
		//  str - {String} - String to edit
		//
		//////////////////////////////////////////////////////////
		minusFirstChar: function(str) {
			backStr = "";
			for (var j = 1; j < str.length; j++) {
				backStr += str[j];
			}
			return backStr;
		},

		//////////////////////////////////////////////////////////
		//
		//  Find the highest position of the first occurance of the char
		//
		//  Parameters
		//
		//  strArray - {Array} - Array to search in
		//  char - {String} - Character to search for
		//
		//  Result
		//
		//  {Integer} - Highest position
		//
		//////////////////////////////////////////////////////////
		findLastPos: function(strArray, char) {
			var lastPos = -2;
			var findPos = 0;
			for (var m = 0; m < strArray.length; m++) {
				findPos = strArray[m].indexOf(char);
				if (findPos > lastPos) {
					lastPos = findPos;
				}
			}
			return lastPos;
		},

		//////////////////////////////////////////////////////////
		//
		//  Insert space before the first occurance of sign until
		//      the position of the first occurance of sign 
		//      is equal to lastPos
		//
		//  Parameters
		//
		//  bufferStr - {String} - String to edit
		//  lastPos - {Integer} - Position
		//  sign - {String} - Sign to move
		//
		//////////////////////////////////////////////////////////
		moveSign: function(bufferStr, lastPos, sign) {
			var bufferPos;
			var preSign = "";
			//Line contains no sign
			if (bufferStr.indexOf(sign) != -1) {
				bufferPos = bufferStr.indexOf(sign);
				preSign = bufferStr.charAt(bufferPos - 1);
				var length = lastPos - bufferPos;
				var indent = "";
				for (var i = 0; i < length; i++) {
					indent += " ";
				}
				if (this.wordPre.indexOf(preSign) != -1) {
					bufferPos = bufferPos - 1;
				} else if (sign == ":") {
					if (this.secondMode) {
						//Align sign
						bufferPos = bufferStr.search(/^[\s]/);
					} else {
						//Align value
						bufferPos = bufferPos;
					}
				}
				bufferStr = this.insertSign(bufferStr, bufferPos, indent);
			}
			return bufferStr;
		},

		//////////////////////////////////////////////////////////
		//
		//  Instert String at position
		//
		//  Parameters
		//
		//  str - {String} - String to edit
		//  pos - {Integer} - Position to insert string
		//  value - {String} - String to insert
		//
		//  Result
		//
		//  {String} - String with inserted sign
		//
		//////////////////////////////////////////////////////////
		insertSign: function(str, pos, value) {
			var firstStr = str.substring(0, pos);
			var secondStr = str.substring(pos, str.length);
			return (firstStr + value + secondStr);
		},

		//////////////////////////////////////////////////////////
		//
		//  Normalize line ending
		//
		//  Parameters
		//
		//  str - {String} - String to edit
		//  ending - {String} - Ending to replace with
		//
		//  Result
		//
		//  {String} - Normalized String
		//
		//////////////////////////////////////////////////////////
		normalizeLineEnding: function(str, ending) {
			return str.replace(new RegExp("\n", "g"), ending);
		},

		//////////////////////////////////////////////////////////
		//
		//  Get line ending
		//
		//  Parameters
		//
		//  str - {String} - String to search in
		//
		//  Result
		//
		//  {String} - typical line ending
		//
		//////////////////////////////////////////////////////////
		getLineEnding: function(str) {
			//Insert tabs
			if (str.search("\r\n") != -1) {
				//Windows
				return "\r\n";
			} else if (str.search("\r") != -1) {
				//Mac
				return "\r";
			} else {
				//Unix
				return "\n";
			}
		},

		//////////////////////////////////////////////////////////
		//
		//  Align all lines to the same column
		//
		//////////////////////////////////////////////////////////
		alignLines: function() {
			var editor = atheos.editor.getActive();
			//Expand selections to start of the line
			if (editor.inMultiSelectMode) {
				var ranges = editor.selection.ranges;
				var buffer = [];
				for (var i = 0; i < ranges.length; i++) {
					buffer[i] = new Range(ranges[i].start.row, 0, ranges[i].end.row, ranges[i].end.column);
				}

				editor.exitMultiSelectMode();
				editor.clearSelection();

				for (var j = 0; j < buffer.length; j++) {
					editor.selection.addRange(buffer[j]);
					this.runCommandForRange(buffer[j], this.alignLinesInSelection.bind(this));
				}
			} else {
				var range = atheos.editor.getActive().selection.getRange();
				range = new Range(range.start.row, 0, range.end.row, range.end.column);
				atheos.editor.getActive().selection.setRange(range);
				this.runCommandForRange(editor.getSelectionRange(), this.alignLinesInSelection.bind(this));
			}
		},

		//////////////////////////////////////////////////////////
		//
		//  Align Lines content
		//
		//  Parameters
		//
		//  lines - {String} - Lines to align
		//
		//  Result
		//
		//  {String} - Aligned content
		//
		//////////////////////////////////////////////////////////
		alignLinesInSelection: function(content) {
			if (content === "") {
				return false;
			}
			var trimedArray = [];
			//Get line ending
			var type = this.getLineEnding(content);
			//Split selected text
			var selArray = content.split(type);
			//Generate space
			var space = "";
			for (var i = 0; i < this.tabWidth; i++) {
				space += " ";
			}
			//Trim whitespace at the start of each line
			for (var j = 0; j < selArray.length; j++) {
				var obj = this.trimStartSpace(selArray[j]);
				obj.string = obj.string.replace(new RegExp("\t", "g"), space);
				selArray[j] = obj.string;
				if (trimedArray == []) {
					trimedArray[0] = obj.trimed;
				} else {
					trimedArray.push(obj.trimed);
				}
			}
			//Get the longest trimed whitespace
			var longest = 0;
			var buffer = 0;
			var bufStr = "";
			for (var k = 0; k < trimedArray.length; k++) {
				buffer = this.getLength(trimedArray[k]);
				if (buffer > longest) {
					longest = buffer;
					bufStr = trimedArray[k];
				}
			}
			//Insert Text
			insText = "";
			for (var t = 0; t < (selArray.length - 1); t++) {
				insText += bufStr + selArray[t] + "\n";
			}
			insText += bufStr + selArray[selArray.length - 1];
			//Normalize line endings
			return this.normalizeLineEnding(insText, type);
		},

		//////////////////////////////////////////////////////////
		//
		//  Get the length of the string
		//
		//  Parameters
		//
		//  str - {String} - String
		//
		//  Result
		//
		//  {Integer} - Length of the string
		//
		//////////////////////////////////////////////////////////
		getLength: function(str) {
			var len = 0;
			for (var i = 0; i < str.length; i++) {
				if (str[i] == "\t") {
					len += this.tabWidth;
				} else {
					len++;
				}
			}
			return len;
		},

		runCommandForRange: function(range, handler) {
			var session = atheos.editor.getActive().getSession();
			if ((range.start.row == range.end.row) && (range.start.column == range.end.column)) {
				return false;
			}
			//Get selection
			var selection = session.getTextRange(range);
			if (selection === "") {
				/* No selection at the given position. */
				return false;
			}
			selection = handler(selection);
			if (selection === false) {
				return false;
			}
			session.replace(range, selection);
			return true;
		}
	};
})(this);