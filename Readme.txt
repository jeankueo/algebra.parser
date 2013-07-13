I. Function:
Parse algebra string which contains
  numbers (with decimal),
  +, -, *, /
  variables surrounded by $
Provide input of variables
Calculate final result.

II. Steps of testing:
1. Input an expression in 'Value"'.
    for example: $a$/$b$
2. Click Generate Input Form.
    You will see a form appear below, all varibles are listed.
3. Input values (number) of variables
4. Click Calculate.



III. Supported expresison grammar:
<expression> ::= <formula> ##
<formula> ::= < muldiv> '+' <formula>
                      | < muldiv>  '-' <formula>
                      | < muldiv> 
<muldiv> ::= <operand> '*' <muldiv>
                     | <operand> '/' <muldiv>
                     | <operand>
<operand> ::= ¡®$¡¯ <columnName> ¡®$¡¯
              | <number>
              | '(' <formula> ')'
<number> ::= [\d]+(.[\d]+)*
<columnName> ::= [\w]+
