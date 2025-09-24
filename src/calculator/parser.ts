import * as math from 'mathjs';
import { use_notebook_store } from '../data/notebook';

export function parse_onyx_to_infix(onyx: string) {
    let infix = onyx;

    infix = infix.replace(/\\(?:d|t)?frac\s*{([^{}]+)}\s*{([^{}]+)}/g, '($1)/($2)'); // common frac variants: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} -> (a)/(b)
    
    infix = infix.replace(/\\sqrt\s*\[([^{}\]]+)\]\s*{([^{}]+)}/g, '($2)^(1/($1))'); // sqrt with index: \sqrt[n]{x} -> (x)^(1/(n))
    infix = infix.replace(/\\sqrt\s*{([^{}]+)}/g, 'sqrt($1)');                       // sqrt: \sqrt{x} -> sqrt(x)

    infix = infix.replace(/\\times\b/g, '*'); // times:  \times -> *
    infix = infix.replace(/\\cdot\b/g, '*');  // times:  \cdot  -> *
    infix = infix.replace(/\\div\b/g, '/');   // divide: \div   -> /
    infix = infix.replace(/\\pm\b/g, '+/-');  // p/m:    \pm    -> +/-
    
    infix = infix.replace(/\\(sin|cos|tan|asin|acos|atan|arcsin|arccos|arctan|log|ln|exp|abs|min|max|mod|floor|ceil|round|sqrt|pow|nthRoot|det)\b/g, '$1'); // common functions

    infix = infix.replace(/\\begin\{(bmatrix|pmatrix|vmatrix)\}/g, '['); // matrix handling: \begin{bmatrix|pmatrix|vmatrix} ... \end{...} -> [a,b;c,d]
    infix = infix.replace(/\\end\{(bmatrix|pmatrix|vmatrix)\}/g, ']');   // allow &, comma as columns; \\ or ; as rows
    infix = infix.replace(/&/g, ',');                                    // column separators
    infix = infix.replace(/\\\\/g, ';');                                 // row separators
    infix = infix.replace(/;/g, ';');                                    // semicolon as row separator (just in case user mixed)

    infix = infix.replace(/\\left/g, '');  // remove \left token
    infix = infix.replace(/\\right/g, ''); // remove \right token

    //infix = infix.replace(/\\to/g, '='); // replace \to with =

    infix = infix.replace(/\^\s*{([^{}]+)}/g, '^($1)');  // convert superscript-braces ^{...} -> ^(...)
    infix = infix.replace(/{/g, '(').replace(/}/g, ')'); // convert remaining grouping braces { ... } -> ( ... )

    infix = infix.replace(/\\(?:,|;|!|quad|qquad|enspace|thinspace|space|,)/g, ''); // strip remaining harmless spacing commands like \, \; \! \quad etc
    infix = infix.replace(/\\[a-zA-Z]+/g, '');                                      // remove any leftover unknown latex macros like \foo -> '' (but leave escaped single chars like \% as needed)
    infix = infix.replace(/\s+/g, ' ').trim();                                      // tidy up spaces
    
    return infix.trim();
}

export function parse_infix_to_onyx(infix: string) {
    let onyx = infix;

    // 1. Handle fractional powers more comprehensively
    // First handle cases like 7^(1/2) -> \sqrt{7}
    onyx = onyx.replace(/([a-zA-Z0-9_]+|\([^()]+\))\^\(1\/2\)/g, '\\sqrt{$1}');
    // Then handle nth roots: x^(1/n) -> \sqrt[n]{x}
    onyx = onyx.replace(/([a-zA-Z0-9_]+|\([^()]+\))\^\(1\/([^()]+)\)/g, '\\sqrt[$2]{$1}');
    // Handle negative fractional powers: x^(-1/n) -> 1/\sqrt[n]{x}
    onyx = onyx.replace(/([a-zA-Z0-9_]+|\([^()]+\))\^\(-1\/2\)/g, '\\frac{1}{\\sqrt{$1}}');
    onyx = onyx.replace(/([a-zA-Z0-9_]+|\([^()]+\))\^\(-1\/([^()]+)\)/g, '\\frac{1}{\\sqrt[$2]{$1}}');

    // 2. remaining powers: ^(x) -> ^{x}
    onyx = onyx.replace(/\^\(([^()]+)\)/g, '^{$1}');

    // 3. parenthesized fractions: (a)/(b) -> \dfrac{a}{b}
    onyx = onyx.replace(/\(\s*([^()]+)\s*\)\/\(\s*([^()]+)\s*\)/g, '\\dfrac{$1}{$2}');

    // 4. simple fractions: 1/2, x/y -> \dfrac{1}{2}, \dfrac{x}{y}
    // Be more careful to avoid matching things that are already processed
    onyx = onyx.replace(/(?<!\\[a-zA-Z]*{[^}]*)\b(\w+)\/(\w+)(?![^{]*})/g, '\\dfrac{$1}{$2}');

    // 5. square roots: sqrt(x) -> \sqrt{x}
    onyx = onyx.replace(/sqrt\(([^()]+)\)/g, '\\sqrt{$1}');

    // 6. multiplication
    onyx = onyx.replace(/\*/g, '\\cdot ');

    // 7. plus-minus - fix the pattern
    onyx = onyx.replace(/\+\/-/g, '\\pm ');

    // 8. common functions
    const funcs = ['sin','cos','tan','asin','acos','atan','arcsin','arccos','arctan','log','ln','exp','abs','min','max','mod','floor','ceil','round','pow','nthRoot','det'];
    for (const f of funcs) {
        const re = new RegExp(`\\b${f}\\b`, 'g');
        onyx = onyx.replace(re, `\\${f}`);
    }

    // 9. matrices and lists: [a,b;c,d] -> \begin{bmatrix} a & b \\ c & d \end{bmatrix}
    // Handle single row as list, multi-row as matrix
    onyx = onyx.replace(/\[([^\]]+)\]/g, (_match, content) => {
        if (content.includes(';')) {
            // Multi-row matrix
            const rows = content.split(';');
            const formattedRows = rows.map((r: string) => r.trim().replace(/,/g, ' & '));
            return `\\begin{bmatrix} ${formattedRows.join(' \\\\ ')} \\end{bmatrix}`;
        } else {
            // Single row - treat as list, keep commas
            return `[${content.trim().replaceAll(",", ", \\space ")}]`;
        }
    });

    // 10. equals
    onyx = onyx.replace(/=/g, '\\to');

    // 11. Clean up unnecessary \cdot between different number types
    // Remove \cdot between fraction and number: \dfrac{a}{b}\cdot c -> \dfrac{a}{b}c
    onyx = onyx.replace(/\\dfrac\{[^}]+\}\{[^}]+\}\\cdot(?=\w)/g, (match) => match.replace('\\cdot', ''));
    // Remove \cdot between number and fraction: a\cdot\dfrac{b}{c} -> a\dfrac{b}{c}
    onyx = onyx.replace(/\w\\cdot(?=\\dfrac)/g, (match) => match.replace('\\cdot', ''));
    // Remove \cdot between sqrt and number: \sqrt{a}\cdot b -> \sqrt{a}b
    onyx = onyx.replace(/\\sqrt(\[[^\]]*\])?\{[^}]+\}\\cdot(?=\w)/g, (match) => match.replace('\\cdot', ''));
    // Remove \cdot between number and sqrt: a\cdot\sqrt{b} -> a\sqrt{b}
    onyx = onyx.replace(/\w\\cdot(?=\\sqrt)/g, (match) => match.replace('\\cdot', ''));
    // Remove \cdot between fraction and sqrt: \dfrac{a}{b}\cdot\sqrt{c} -> \dfrac{a}{b}\sqrt{c}
    onyx = onyx.replace(/\\dfrac\{[^}]+\}\{[^}]+\}\\cdot(?=\\sqrt)/g, (match) => match.replace('\\cdot', ''));
    // Remove \cdot between sqrt and fraction: \sqrt{a}\cdot\dfrac{b}{c} -> \sqrt{a}\dfrac{b}{c}
    onyx = onyx.replace(/\\sqrt(\[[^\]]*\])?\{[^}]+\}\\cdot(?=\\dfrac)/g, (match) => match.replace('\\cdot', ''));

    return onyx.trim();
}

export function parse_declaration(infix: string): { variable: string, equation: string } | void {
    if (!infix.includes("=")) return;

    const [left, right] = infix.split("=");
    if (!left?.trim().length) return;
    if (!right?.trim().length) return;

    const trimmed_left = left.trimStart().trimEnd();
    const filtered_left = trimmed_left
                            .split("")
                            .filter(ch => /\p{L}|\p{Extended_Pictographic}/u.test(ch))

    if (trimmed_left.length != filtered_left.length) return;
    return { variable: trimmed_left, equation: right }
}

export function parse_declaration_insertion(index: number, infix: string): string {
    const notebook_store = use_notebook_store.getState();
    const lines = notebook_store.lines;

    const declarations: Record<string, string> = {};

    for (let i = 0; i < index; i++) {
        // for each line up to the current one, gather all declared values
        // overwriting previous ones, in order to gather the current lines
        // variable "state"

        const line = lines[i];
        if (!line) return infix;
        if (!line.declaration) continue;

        declarations[line.declaration[0]] = line.declaration[1];
    }

    let parsed_infix = infix;
    const sortedKeys = Object.keys(declarations).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        parsed_infix = parsed_infix.replace(new RegExp(`(\\d)(${escapedKey})\\b`, 'g'), `$1\\cdot ${declarations[key]}`);
        parsed_infix = parsed_infix.replace(new RegExp(`\\b(${escapedKey})\\b`, 'g'), declarations[key]);
    }

    return parsed_infix;
}

// Character mapping for bases up to 62 (0-9, A-Z, a-z)
const CHAR_TO_VALUE: { [key: string]: number } = {};
const VALUE_TO_CHAR: { [key: number]: string } = {};

// Initialize character mappings
function initializeCharMappings() {
    // 0-9
    for (let i = 0; i <= 9; i++) {
        CHAR_TO_VALUE[i.toString()] = i;
        VALUE_TO_CHAR[i] = i.toString();
    }
    // A-Z (values 10-35)
    for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i); // A-Z
        CHAR_TO_VALUE[char] = 10 + i;
        VALUE_TO_CHAR[10 + i] = char;
    }
    // a-z (values 36-61)
    for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(97 + i); // a-z
        CHAR_TO_VALUE[char] = 36 + i;
        VALUE_TO_CHAR[36 + i] = char;
    }
}

initializeCharMappings();

function charToValue(char: string): number {
    return CHAR_TO_VALUE[char] ?? NaN;
}

function valueToChar(value: number): string {
    return VALUE_TO_CHAR[value] ?? '?';
}

function isValidChar(char: string, base: number): boolean {
    const value = charToValue(char);
    return !isNaN(value) && value < base;
}

function base_n_to_base_10(number: string, sourceBase: number): string {
    if (number.includes('.')) {
        // Handle decimal numbers
        const [intPart, fracPart] = number.split('.');
        
        // Integer part
        let intSum = math.bignumber(0);
        for (let i = 0; i < intPart.length; i++) {
            const digit = math.bignumber(charToValue(intPart[i]));
            const power = intPart.length - i - 1;
            const base = math.bignumber(sourceBase);
            const basePower = math.pow(base, power) as math.BigNumber;
            const term = math.multiply(digit, basePower);
            intSum = math.add(intSum, term) as math.BigNumber;
        }
        
        // Fractional part
        let fracSum = math.bignumber(0);
        for (let i = 0; i < fracPart.length; i++) {
            const digit = math.bignumber(charToValue(fracPart[i]));
            const power = -(i + 1);
            const base = math.bignumber(sourceBase);
            const basePower = math.pow(base, power) as math.BigNumber;
            const term = math.multiply(digit, basePower);
            fracSum = math.add(fracSum, term) as math.BigNumber;
        }
        
        return math.add(intSum, fracSum).toString();
    } else {
        // Handle integer numbers
        let sum = math.bignumber(0);
        for (let i = 0; i < number.length; i++) {
            const digit = math.bignumber(charToValue(number[i]));
            const power = number.length - i - 1;
            const base = math.bignumber(sourceBase);
            const basePower = math.pow(base, power) as math.BigNumber;
            const term = math.multiply(digit, basePower);
            sum = math.add(sum, term) as math.BigNumber;
        }
        return sum.toString();
    }
}

function base_10_to_base_n(decimal: string, targetBase: number, precision: number = 10): string {
    const num = math.bignumber(decimal);
    
    if (math.equal(num, 0)) return "0";
    
    const isNegative = math.smaller(num, 0);
    const absNum = math.abs(num) as math.BigNumber;
    
    // Separate integer and fractional parts
    const intPart = math.floor(absNum) as math.BigNumber;
    const fracPart = math.subtract(absNum, intPart) as math.BigNumber;
    
    let result = "";
    const base = math.bignumber(targetBase);
    
    // Convert integer part
    if (math.equal(intPart, 0)) {
        result = "0";
    } else {
        let temp = intPart;
        while (math.larger(temp, 0)) {
            const remainder = math.mod(temp, base) as math.BigNumber;
            result = valueToChar(remainder.toNumber()) + result;
            // @ts-expect-error
            temp = math.floor(math.divide(temp, base)) as math.BigNumber;
        }
    }
    
    // Convert fractional part if it exists
    if (math.larger(fracPart, 0)) {
        result += ".";
        let temp = fracPart;
        let count = 0;
        
        while (math.larger(temp, 0) && count < precision) {
            temp = math.multiply(temp, base) as math.BigNumber;
            const digit = math.floor(temp) as math.BigNumber;
            result += valueToChar(digit.toNumber());
            temp = math.subtract(temp, digit) as math.BigNumber;
            count++;
        }
        
        // Remove trailing zeros
        result = result.replace(/0+$/, "").replace(/\.$/, "");
    }
    
    return isNegative ? "-" + result : result;
}

function twos_complement_to_decimal(bits: string, base: number): string {
    if (bits.length === 0) return '0';
    
    // If the most significant bit is 0, it's positive
    if (charToValue(bits[0]) === 0) {
        return base_n_to_base_10(bits, base);
    }
    
    // If the most significant bit is 1, it's negative (two's complement)
    const baseNum = math.bignumber(base);
    const bitsLength = bits.length - 1;
    const basePower = math.pow(baseNum, bitsLength) as math.BigNumber;
    const negative = math.multiply(math.bignumber(-1), basePower);
    const positive = math.bignumber(base_n_to_base_10(bits.slice(1), base));
    return math.add(negative, positive).toString();
}

function decimal_to_twos_complement(decimal: string, base: number, bitLength: number): string {
    const num = math.bignumber(decimal);
    
    // @ts-expect-error
    if (math.greaterEq(num, 0)) {
        // Positive number - convert normally and pad
        const converted = base_10_to_base_n(decimal, base);
        return converted.padStart(bitLength, '0');
    } else {
        // Negative number - use two's complement
        const baseNum = math.bignumber(base);
        const maxValue = math.pow(baseNum, bitLength) as math.BigNumber;
        const twosComp = math.add(maxValue, num) as math.BigNumber;
        const converted = base_10_to_base_n(twosComp.toString(), base);
        return converted.padStart(bitLength, '0');
    }
}

export function convert_based_numbers_to_decimal(input: string): string {
    let result = input;
    let i = 0;
    
    while (i < result.length) {
        // Skip if we're inside LaTeX commands
        if (result[i] === '\\') {
            // Look for \to pattern
            if (result.slice(i, i + 3) === '\\to') {
                i += 3;
                continue;
            }
            i += 2;
            continue;
        }
        
        if (isValidChar(result[i], 62)) { // Check if it's a valid character for any base
            // Start parsing a potential number conversion
            let start_pos = i;
            let source_number = '';
            let source_base = 10;
            let source_variant = 'integer';
            let source_mantissa: number | undefined = undefined;
            let source_exponent: number | undefined = undefined;
            
            // Parse the source number
            while (i < result.length && (isValidChar(result[i], 62) || result[i] === '.')) {
                source_number += result[i];
                if (result[i] === '.') {
                    source_variant = 'decimal';
                }
                i++;
            }
            
            // Check for source base specification
            if (i < result.length && result[i] === '_') {
                i++; // consume _
                
                let base_str = '';
                if (i < result.length && result[i] === '{') {
                    i++; // consume {
                    while (i < result.length && result[i] !== '}' && isValidChar(result[i], 10)) {
                        base_str += result[i];
                        i++;
                    }
                    if (i < result.length && result[i] === '}') {
                        i++; // consume }
                    }
                } else if (i < result.length && isValidChar(result[i], 10)) {
                    while (i < result.length && (isValidChar(result[i], 10) || result[i] === '.')) {
                        base_str += result[i];
                        i++;
                    }
                }
                
                if (base_str) {
                    // Handle decimal bases
                    if (base_str.includes('.')) {
                        source_base = parseFloat(base_str);
                    } else {
                        source_base = parseInt(base_str);
                    }
                }
            }
            
            // Check for source variant specification
            if (i < result.length && result[i] === ':') {
                i++; // consume :
                
                if (i < result.length) {
                    const variant = result[i];
                    i++; // consume variant character
                    
                    switch (variant) {
                        case "u":
                            source_variant = "unsigned";
                            break;
                        case "s":
                            source_variant = "twos-compliment";
                            break;
                        case "m":
                            source_variant = "sign-and-magnitude";
                            break;
                        case "x":
                            source_variant = "fixed";
                            // Parse mantissa.exponent format
                            if (i < result.length && isValidChar(result[i], 10)) {
                                let mantissa_str = '';
                                while (i < result.length && isValidChar(result[i], 10)) {
                                    mantissa_str += result[i];
                                    i++;
                                }
                                if (i < result.length && result[i] === '.') {
                                    i++; // consume .
                                    let exponent_str = '';
                                    while (i < result.length && isValidChar(result[i], 10)) {
                                        exponent_str += result[i];
                                        i++;
                                    }
                                    source_mantissa = Number(mantissa_str);
                                    source_exponent = Number(exponent_str);
                                }
                            }
                            break;
                        case "f":
                            source_variant = "floating";
                            // Parse mantissa.exponent format
                            if (i < result.length && isValidChar(result[i], 10)) {
                                let mantissa_str = '';
                                while (i < result.length && isValidChar(result[i], 10)) {
                                    mantissa_str += result[i];
                                    i++;
                                }
                                if (i < result.length && result[i] === '.') {
                                    i++; // consume .
                                    let exponent_str = '';
                                    while (i < result.length && isValidChar(result[i], 10)) {
                                        exponent_str += result[i];
                                        i++;
                                    }
                                    source_mantissa = Number(mantissa_str);
                                    source_exponent = Number(exponent_str);
                                }
                            }
                            break;
                        case "n":
                            source_variant = "normalized";
                            // Parse mantissa.exponent format
                            if (i < result.length && isValidChar(result[i], 10)) {
                                let mantissa_str = '';
                                while (i < result.length && isValidChar(result[i], 10)) {
                                    mantissa_str += result[i];
                                    i++;
                                }
                                if (i < result.length && result[i] === '.') {
                                    i++; // consume .
                                    let exponent_str = '';
                                    while (i < result.length && isValidChar(result[i], 10)) {
                                        exponent_str += result[i];
                                        i++;
                                    }
                                    source_mantissa = Number(mantissa_str);
                                    source_exponent = Number(exponent_str);
                                }
                            }
                            break;
                    }
                }
            }
            
            // Check for conversion operator (\to)
            let target_base = 10;
            let target_variant = 'integer';
            let target_mantissa: number | undefined = undefined;
            let target_exponent: number | undefined = undefined;
            let has_conversion = false;
            
            // Skip whitespace
            while (i < result.length && result[i] === ' ') {
                i++;
            }
            
            if (i < result.length - 2 && result.slice(i, i + 3) === '\\to') {
                has_conversion = true;
                i += 3; // consume \to
                
                // Skip whitespace
                while (i < result.length && result[i] === ' ') {
                    i++;
                }
                
                // Parse target base specification
                if (i < result.length && result[i] === 'b' && i + 1 < result.length && result[i + 1] === '_') {
                    i += 2; // consume b_
                    
                    let base_str = '';
                    if (i < result.length && result[i] === '{') {
                        i++; // consume {
                        while (i < result.length && result[i] !== '}' && (isValidChar(result[i], 10) || result[i] === '.')) {
                            base_str += result[i];
                            i++;
                        }
                        if (i < result.length && result[i] === '}') {
                            i++; // consume }
                        }
                    } else if (i < result.length && (isValidChar(result[i], 10) || result[i] === '.')) {
                        while (i < result.length && (isValidChar(result[i], 10) || result[i] === '.')) {
                            base_str += result[i];
                            i++;
                        }
                    }
                    
                    if (base_str) {
                        // Handle decimal bases
                        if (base_str.includes('.')) {
                            target_base = parseFloat(base_str);
                        } else {
                            target_base = parseInt(base_str);
                        }
                    }
                    
                    // Check for target variant specification
                    if (i < result.length && result[i] === ':') {
                        i++; // consume :
                        
                        if (i < result.length) {
                            const variant = result[i];
                            i++; // consume variant character
                            
                            switch (variant) {
                                case "u":
                                    target_variant = "unsigned";
                                    break;
                                case "s":
                                    target_variant = "twos-compliment";
                                    break;
                                case "m":
                                    target_variant = "sign-and-magnitude";
                                    break;
                                case "x":
                                    target_variant = "fixed";
                                    // Parse mantissa.exponent format
                                    if (i < result.length && isValidChar(result[i], 10)) {
                                        let mantissa_str = '';
                                        while (i < result.length && isValidChar(result[i], 10)) {
                                            mantissa_str += result[i];
                                            i++;
                                        }
                                        if (i < result.length && result[i] === '.') {
                                            i++; // consume .
                                            let exponent_str = '';
                                            while (i < result.length && isValidChar(result[i], 10)) {
                                                exponent_str += result[i];
                                                i++;
                                            }
                                            target_mantissa = Number(mantissa_str);
                                            target_exponent = Number(exponent_str);
                                        }
                                    }
                                    break;
                                case "f":
                                    target_variant = "floating";
                                    // Parse mantissa.exponent format
                                    if (i < result.length && isValidChar(result[i], 10)) {
                                        let mantissa_str = '';
                                        while (i < result.length && isValidChar(result[i], 10)) {
                                            mantissa_str += result[i];
                                            i++;
                                        }
                                        if (i < result.length && result[i] === '.') {
                                            i++; // consume .
                                            let exponent_str = '';
                                            while (i < result.length && isValidChar(result[i], 10)) {
                                                exponent_str += result[i];
                                                i++;
                                            }
                                            target_mantissa = Number(mantissa_str);
                                            target_exponent = Number(exponent_str);
                                        }
                                    }
                                    break;
                                case "n":
                                    target_variant = "normalized";
                                    // Parse mantissa.exponent format
                                    if (i < result.length && isValidChar(result[i], 10)) {
                                        let mantissa_str = '';
                                        while (i < result.length && isValidChar(result[i], 10)) {
                                            mantissa_str += result[i];
                                            i++;
                                        }
                                        if (i < result.length && result[i] === '.') {
                                            i++; // consume .
                                            let exponent_str = '';
                                            while (i < result.length && isValidChar(result[i], 10)) {
                                                exponent_str += result[i];
                                                i++;
                                            }
                                            target_mantissa = Number(mantissa_str);
                                            target_exponent = Number(exponent_str);
                                        }
                                    }
                                    break;
                            }
                        }
                    }
                }
            }
            
            // Validate that all characters in source_number are valid for source_base
            let valid_source = true;
            for (const char of source_number) {
                if (char !== '.' && !isValidChar(char, Math.floor(source_base))) {
                    valid_source = false;
                    break;
                }
            }
            
            if (!valid_source) {
                i = start_pos + 1;
                continue;
            }
            
            // Skip conversion if no base change and no variant change needed
            if (!has_conversion && source_base === 10 && source_variant === "decimal") {
                i = start_pos + source_number.length;
                continue;
            }
            
            // Convert the number
            try {
                let converted_value: string;
                let decimal_value: string;
                
                // First convert source to decimal (base 10)
                if (source_variant === "fixed") {
                    if (!source_mantissa || !source_exponent) {
                        i = start_pos + 1;
                        continue;
                    }
                    if (source_mantissa + source_exponent !== source_number.replace('.', '').length) {
                        i = start_pos + 1;
                        continue;
                    }
                    
                    let sum = math.bignumber(0);
                    const base = math.bignumber(source_base);
                    const clean_number = source_number.replace('.', '');
                    
                    // Calculate integer mantissa portion
                    for (let j = 0; j < source_mantissa; j++) {
                        const digit = math.bignumber(charToValue(clean_number[j]));
                        const power = source_mantissa - j - 1;
                        const basePower = math.pow(base, power) as math.BigNumber;
                        const term = math.multiply(digit, basePower);
                        sum = math.add(sum, term) as math.BigNumber;
                    }
                    
                    // Calculate fractional exponent portion
                    for (let j = 0; j < source_exponent; j++) {
                        const digit = math.bignumber(charToValue(clean_number[source_mantissa + j]));
                        const power = -1 * (j + 1);
                        const basePower = math.pow(base, power) as math.BigNumber;
                        const term = math.multiply(digit, basePower);
                        sum = math.add(sum, term) as math.BigNumber;
                    }
                    
                    decimal_value = sum.toString();
                }
                else if (source_variant === "floating") {
                    if (!source_mantissa || !source_exponent) {
                        i = start_pos + 1;
                        continue;
                    }
                    const clean_number = source_number.replace('.', '');
                    if (source_mantissa + source_exponent !== clean_number.length) {
                        i = start_pos + 1;
                        continue;
                    }
                    
                    const mantissa_bits = clean_number.slice(0, source_mantissa);
                    const exponent_bits = clean_number.slice(source_mantissa);
                    
                    const mantissa_value = math.bignumber(twos_complement_to_decimal(mantissa_bits, Math.floor(source_base)));
                    const exponent_value = math.bignumber(twos_complement_to_decimal(exponent_bits, Math.floor(source_base)));
                    
                    const mantissaBits = source_mantissa - 1;
                    const two = math.bignumber(2);
                    const mantissa_scale = math.pow(two, mantissaBits) as math.BigNumber;
                    const mantissa_fractional = math.divide(mantissa_value, mantissa_scale);
                    const exponentPower = math.pow(two, exponent_value) as math.BigNumber;
                    const result_val = math.multiply(mantissa_fractional, exponentPower);
                    
                    decimal_value = result_val.toString();
                }
                else if (source_variant === "normalized") {
                    if (!source_mantissa || !source_exponent) {
                        i = start_pos + 1;
                        continue;
                    }
                    const clean_number = source_number.replace('.', '');
                    if (source_mantissa + source_exponent !== clean_number.length) {
                        i = start_pos + 1;
                        continue;
                    }
                    
                    const mantissa_bits = clean_number.slice(0, source_mantissa);
                    const exponent_bits = clean_number.slice(source_mantissa);
                    
                    const mantissa_value = math.bignumber(twos_complement_to_decimal(mantissa_bits, Math.floor(source_base)));
                    const exponent_value = math.bignumber(twos_complement_to_decimal(exponent_bits, Math.floor(source_base)));
                    
                    const mantissaBitsNorm = source_mantissa - 1;
                    const twoNorm = math.bignumber(2);
                    const mantissa_scale = math.pow(twoNorm, mantissaBitsNorm) as math.BigNumber;
                    const mantissa_fractional = math.divide(mantissa_value, mantissa_scale);
                    const exponentPowerNorm = math.pow(twoNorm, exponent_value) as math.BigNumber;
                    const result_val = math.multiply(mantissa_fractional, exponentPowerNorm);
                    
                    decimal_value = result_val.toString();
                }
                else if (source_variant === "sign-and-magnitude") {
                    const sign = charToValue(source_number[0]) > 0 ? math.bignumber(-1) : math.bignumber(1);
                    const magnitude = math.bignumber(base_n_to_base_10(source_number.slice(1), source_base));
                    const result_val = math.multiply(sign, magnitude);
                    decimal_value = result_val.toString();
                }
                else if (source_variant === "twos-compliment") {
                    decimal_value = twos_complement_to_decimal(source_number.replace('.', ''), Math.floor(source_base));
                }
                else {
                    // Regular base conversion (including decimal support)
                    decimal_value = base_n_to_base_10(source_number, source_base);
                }
                
                // Now convert to target base if conversion is specified
                if (has_conversion) {
                    if (target_variant === "twos-compliment") {
                        // Need to specify bit length for two's complement
                        const bit_length = source_number.replace('.', '').length;
                        converted_value = decimal_to_twos_complement(decimal_value, Math.floor(target_base), bit_length);
                    } else {
                        converted_value = base_10_to_base_n(decimal_value, target_base);
                    }
                } else {
                    converted_value = decimal_value;
                }
                
                // Replace the original expression with the converted value
                const original_length = i - start_pos;
                result = result.slice(0, start_pos) + converted_value + result.slice(i);
                i = start_pos + converted_value.length;
                
            } catch (error) {
                // If conversion fails, skip this number
                i = start_pos + 1;
            }
        } else {
            i++;
        }
    }
    
    return result;
}