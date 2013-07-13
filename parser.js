//Constants
var tokenTypeDelimiter = '^D';
var tokenTypeNumber = '^N';
var tokenTypeColumnName = '^C';
var tokenTypeEOS = '^#';

var regexWhite = ' ';
var regDelimiter = '[+-/*//()$.]';
var regName = '[a-zA-Z0-9_]';
var regNumber = '[0-9]';
var regLetters = '[a-zA-Z_]+';

//Global Variable
var parser = null;

//Model Class Calculation
function Calculation (operand1, operator, operand2) {
	this.operand1 = operand1;
	this.operator = operator;
	this.operand2 = operand2;
	this.hasParenthesis = false;
	
	this.getValue = getValue;
	function getValue() {
		if(this.operator == null){  // only operand1 available
			if(this.operand1 instanceof Number){  // operand1 is Number
				return operand1;
			} else if (this.operand1 instanceof Calculation){  // operand1 is Calculation
				return operand1.getValue();
			} else { // operand1 is a column name
				for(i in parser.columnList){
					if(parser.columnList[i][0].valueOf() == operand1.valueOf()){
						return new Number(parser.columnList[i][1]);
					}
				}
			}
		} else {
			var num1;
			var num2;
			
			if(this.operand1 instanceof Number){  // operand1 is Number
				num1 = operand1;
			} else if (this.operand1 instanceof Calculation){  // operand1 is Calculation
				num1 = operand1.getValue();
			} else { // operand1 is a column name
				for(i in parser.columnList){
					if(parser.columnList[i][0].valueOf() == operand1.valueOf()){
						num1 = new Number(parser.columnList[i][1]);
					}
				}
			}
			
			if(this.operand2 instanceof Number){  // operand2 is Number
				num2 = operand2;
			} else if (this.operand2 instanceof Calculation){  // operand2 is Calculation
				num2 = operand2.getValue();
			} else { // operand2 is a column name
				for(i in parser.columnList){
					if(parser.columnList[i][0].valueOf() == operand2.valueOf()){
						num2 = new Number(parser.columnList[i][1]);
					}
				}
			}
			
			switch(operator){
			case '+':
				return new Number (num1 + num2);
			case '-':
				return new Number (num1 - num2);
			case '*':
				return new Number (num1 * num2);
			case '/':
				return new Number (num1 / num2);				
			}
		}
	}
}

//Class Tokenizer
function Tokenizer (value) {
	
	this.currentOffset = 0;
	this.length = value.length;
	this.value = value;
	
	this.hasNext = hasNext;
	function hasNext () {
		if(this.currentOffset <= this.length){
			return true;
		} else {
			return false;
		}
	}
	
	this.nextToken = nextToken;
	function nextToken () {
		var currentChar;
		var token = new Object();
		
		// get current char
		if( this.currentOffset < this.length ){
			currentChar = this.value.substr(this.currentOffset, 1);
		}			
				
		// ignore white char
		while (this.currentOffset < this.length && currentChar.match(regexWhite) != null) {
			this.currentOffset++;
			if( this.currentOffset < this.length ){
				currentChar = this.value.substr(this.currentOffset, 1);
			}			
		}
		
		// reaches end of string
		if (this.currentOffset >= this.length){
			token.value = '<END>';
			token.type = tokenTypeEOS;
			this.currentOffset++;
			return token;
		}
		
		// reaches a delimiter
		if (currentChar.match(regDelimiter) != null){
			token.value = currentChar;
			token.type = tokenTypeDelimiter;
			this.currentOffset++;
			return token;
			
		// reaches a word char
		} else if (currentChar.match(regName) != null) {
			var _startOffset = this.currentOffset;
			var _length = 1;
			this.currentOffset++;
			if( this.currentOffset < this.length ){
				currentChar = this.value.substr(this.currentOffset, 1);
			}
			
			while (this.currentOffset < this.length && currentChar.match(regName) != null) {
				_length++;
				this.currentOffset++;
				if( this.currentOffset < this.length ){
					currentChar = this.value.substr(this.currentOffset, 1);
				}			
			}
			
			token.value = this.value.substr(_startOffset, _length);
			if(token.value.match(regLetters) != null){
				token.type = tokenTypeColumnName;  // return a column name token
			} else {  
				token.type = tokenTypeNumber; // return a number token
			}
			return token;
		} else {
			throw "Illegal char '" 
				+ currentChar 
				+  "' is found at offset " 
				+ this.currentOffset 
				+ '.';
		}		
	}	
}

//Class Parser
/***************************************************
 *<expression> ::= <formula> ##
*<formula> ::= < muldiv> '+' <formula>
*                      | < muldiv>  '-' <formula>
*                      | < muldiv> 
*<muldiv> ::= <operand> '*' <muldiv>
*                     | <operand> '/' <muldiv>
*                     | <operand>
*<operand> ::= '$' <columnName> '$'
*              | <number>
*              | '(' <formula> ')'
*<number> ::= [\d]+(.[\d]+)*
*<columnName> ::= [\w]+
****************************************************
*<expression> ::= <formula> ##
*<formula> ::= < muldiv> <formula-rest>
*<formula-rest> := '+' <formula>
*               | '-' <formula>
*               | #
*<muldiv>::=<operand><muldiv-rest>
*<muldiv-rest>::= '*'  <muldiv>
*               | '/' <muldiv>
*               | #
*<operand> ::= '$' <columnName> '$'
*              | <number>
*              | '(' <formula> ')'
*<number> ::= digitTOKEN <number-rest>
*<number-rest> ::= #
*                   | '.' digitTOKEN
*<columnName> ::= [\w]+
***************************************************/
function Parser (value) {
	
	this.tokenizer = new Tokenizer( value );
	this.currentMatchResult = true;
	this.currentToken = null;
	this.value = value;
	
	this.testTokenString = '';
	this.calculation = null;
	this.columnList = new Array();
	
	this.lookahead = lookahead;
	function lookahead (target) {
		if(this.tokenizer.hasNext() && this.currentMatchResult){
			this.currentToken = this.tokenizer.nextToken();
			this.testTokenString += '[' 
								+ this.currentToken.value 
								+ ']';
		}
		
		switch(target){
		case tokenTypeDelimiter:
			if(this.currentToken.type == tokenTypeDelimiter){
				this.currentMatchResult = true;
			}else{
				this.currentMatchResult = false;
			}
			break;
			
		case tokenTypeNumber:
			if(this.currentToken.type == tokenTypeNumber){
				this.currentMatchResult = true;
			}else{
				this.currentMatchResult = false;
			}
			break;
			
		case tokenTypeColumnName:
			if(this.currentToken.type == tokenTypeColumnName){
				this.currentMatchResult = true;
			}else{
				this.currentMatchResult = false;
			}
			break;
			
		case tokenTypeEOS:
			if(this.currentToken.type == tokenTypeEOS){
				this.currentMatchResult = true;
			}else{
				this.currentMatchResult = false;
			}
			break;
			
		default:
			if(this.currentToken.value == target){
				this.currentMatchResult = true;
			}else{
				this.currentMatchResult = false;
			}
		}
		
		return this.currentMatchResult;
	}
	
	this.parse = parse;
	function parse () {
		this.calculation = this.parseFormula();
		
		if(!this.lookahead(tokenTypeEOS)){
			throw "Unexpected string '" 
				+ this.currentToken.value 
				+ "' is found at the end of string.";
		}
	}
	
	this.parseFormula = parseFormula;
	function parseFormula () {
		var muldiv = this.parseMuldiv();
		var formulaRest = this.parseFormulaRest();
		
		if (formulaRest == null){
			return muldiv;
		}else {
			return this.organizeFormula(muldiv, formulaRest.operator, formulaRest.operand2);
			
		}
	}
	
	// switch from back seq to front seq
	this.organizeFormula = organizeFormula;
	function organizeFormula (operand1, plusMinus, operand2) {
		if(operand2 instanceof Calculation && !operand2.hasParenthesis && (operand2.operator == '+' || operand2.operator == '-')){			
			return new Calculation (this.organizeFormula(operand1, plusMinus, operand2.operand1), 
					operand2.operator, 
					operand2.operand2);
		}else{
			return new Calculation(operand1, plusMinus, operand2);
		}
	}
	
	this.parseFormulaRest = parseFormulaRest;
	function parseFormulaRest () {
		if(this.lookahead('+') || this.lookahead('-')){
			var operator = this.currentToken.value;
			var operand2 = this.parseFormula();
			return new Calculation(null, operator, operand2);
		} else {
			return null;
		}
	}
	
	this.parseMuldiv = parseMuldiv;
	function parseMuldiv() {
		var operand = this.parseOperand();
		var muldivRest = this.parseMuldivRest(); 
		
		if(muldivRest == null){
			return operand;
		}else {
			return this.organizeMuldiv(operand, muldivRest.operator, muldivRest.operand2);		
		}
	}
	
	this.organizeMuldiv = organizeMuldiv;
	function organizeMuldiv(operand1, muldiv, operand2) {
		if(operand2 instanceof Calculation && !operand2.hasParenthesis && (operand2.operator == '*' || operand2.operator == '/')){
			return new Calculation (this.organizeMuldiv(operand1, muldiv, operand2.operand1), 
					operand2.operator, 
					operand2.operand2);	
		}else{
			return new Calculation(operand1, muldiv, operand2);
		}
	}
	
	this.parseMuldivRest = parseMuldivRest;
	function parseMuldivRest() {
		if(this.lookahead('*') || this.lookahead('/')){
			var operator = this.currentToken.value;
			var operand2 = this.parseMuldiv();
			return new Calculation(null, operator, operand2);
		} else {
			return null;
		}
	}
	
	this.parseOperand = parseOperand;
	function parseOperand () {
		var retObj = null;
		
		if(this.lookahead('$')){
			retObj = new String('$' +  this.parseColumnName() + '$');
			
			if(!this.lookahead('$')){
				throw "'$' is expected but '" 
					+ this.currentToken.value
					+ "' is found at offset "
					+ this.tokenizer.currentOffset
					+ ".";
			}
			
			for(i in this.columnList){
				if (this.columnList[i][0].valueOf() == retObj.valueOf()){
					return retObj;
				}
			}
			this.columnList[this.columnList.length] = new Array();
			this.columnList[this.columnList.length-1][0] = retObj;
			
		} else if (this.lookahead('(')) {
			retObj = this.parseFormula();
			
			if(!this.lookahead(')')){
				throw "')' is expected but '" 
					+ this.currentToken.value
					+ "' is found at offset "
					+ this.tokenizer.currentOffset
					+ ".";
			}
			
			if(retObj instanceof Calculation){
				retObj.hasParenthesis = true;
			}
		} else {
			retObj = this.parseNumber();
		}
		return retObj;
	}
	
	this.parseNumber = parseNumber;
	function parseNumber () {
		if(this.lookahead(tokenTypeNumber)){
			var integer = this.currentToken.value;
			var decimal = this.parseNumberRest();
			if(decimal == null){
				return new Number(integer);
			}else{
				return new Number(integer+decimal);
			}
		} else {
			throw "Number is expected but '"
				+ this.currentToken.value
				+ "' is found at offset "
				+ this.tokenizer.currentOffset
				+ ".";
		}
	}
	
	this.parseNumberRest = parseNumberRest;
	function parseNumberRest () {
		if(this.lookahead('.')){
			if(this.lookahead(tokenTypeNumber)){
				return '.' + this.currentToken.value;
			}else{
				throw "Number is expected but '"
					+ this.currentToken.value
					+ "' is found at offset "
					+ this.tokenizer.currentOffset
					+ ".";
			}
		}else{
			return null;
		}
	}
	
	this.parseColumnName = parseColumnName;
	function parseColumnName () {
		if(this.lookahead(tokenTypeColumnName)){
			return this.currentToken.value;
		} else {
			throw "Column name is expected but '"
				+ this.currentToken.value
				+ "' is found at offset "
				+ this.tokenizer.currentOffset
				+ ".";
		}
	}
}

//UI function
function testParsing () {
	parser = new Parser( $("#inputValue").val() );
	try{
		parser.parse();
		$("#tokens").text(parser.testTokenString);
		$("#error").text('');
		$("#columnList").attr("hidden","hidden");
		$("#columnList").empty();
	}catch(error){
		$("#tokens").text(parser.testTokenString);
		$("#error").text(error);
	}	
}

//UI function
function generate(){
	$("#columnList").removeAttr("hidden");
	$("#columnList").empty();
	for(i in parser.columnList){
		$("#columnList").append(
			"<tr>"
			+ "<td><b><label>" + parser.columnList[i][0]  + "</label></b></td>"
			+ "<td><input class='generated' type='text' onInput='fillValue("+i+")' dataoffset='" + i + "'/></td>"
			+ "</tr>");
	}
	$("#columnList").append(
		"<tr>"
		+ "<td><input type='submit' value='Calculate' onClick='go()'></td>"
		+ "<td><label id='result'/></td>"
		+ "</tr>");
	
}

// UI function
function fillValue(dataoffset) {
	parser.columnList[dataoffset][1] = $("input.generated")[dataoffset].value;
}

//UI function
function go() {
	var result = null;
	
	if(parser.calculation instanceof Calculation){
		result = parser.calculation;
	}else{
		result = new Calculation(parser.calculation, null, null);
	}
		
	$("#result").text(result.getValue());
}