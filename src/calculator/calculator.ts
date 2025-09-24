// @ts-expect-error
import algebrite from "algebrite"

import { use_notebook_store } from "../data/notebook";
import { convert_based_numbers_to_decimal, parse_declaration, parse_declaration_insertion, parse_infix_to_onyx, parse_onyx_to_infix } from "./parser";
import { use_preferences_store } from "../data/preferences";

export default function calculate(index: number) {
    const preferences_store = use_preferences_store.getState();
    const notebook_store = use_notebook_store.getState();
    const line_data = notebook_store.lines[index];

    if (line_data.format_tag != ".m") return;
    if (!line_data) return;

    const original_content = line_data.content
                                .replace(line_data.format_tag, "")
                                .trimStart();

    // replace based values with denary
    let content = convert_based_numbers_to_decimal(line_data.content)
                    .replace(line_data.format_tag, "")
                    .trimStart();
    
    // replace all declared variables, with their values
    content = parse_declaration_insertion(index, content);

    const declaration = parse_declaration(content);
    if (declaration) {
        content = declaration.equation;
    }

    let infix_content = parse_onyx_to_infix(content);

    const infix_content_ends_with_equals = infix_content.endsWith("=");
    if (infix_content_ends_with_equals) {
        infix_content = infix_content
                            .slice(0, infix_content.length-1)
                            .trim();
    }
    
    const algebrite_result: string = algebrite.run(
        preferences_store.algebrite_latex
            ? `printlatex(${infix_content})`
            : infix_content
    );

    if (algebrite_result.includes("\n")) {
        const error_hint = algebrite_result
                                .split("\n")[1]
                                .replace("Stop:", "")
                                .trim();

        notebook_store.update_line(index, {
            error: algebrite_result,
            error_hint: error_hint,
            result: `${original_content} \\quad \\color{red}{\\text{${error_hint}}}`,
            answer: undefined,
            declaration: undefined,
            plot_data: undefined,
        });

        return;
    }

    const mathjax_algebrite_result = parse_infix_to_onyx(algebrite_result);
    
    if (declaration) {
        notebook_store.update_line(index, {
            error: undefined,
            error_hint: undefined,
            result: undefined,
            answer: mathjax_algebrite_result,
            declaration: [declaration.variable, mathjax_algebrite_result],
            plot_data: undefined,
        });
        console.log([declaration.variable, mathjax_algebrite_result])
        return;
    }

    if (infix_content_ends_with_equals) { // only append answer to result, if equation ends with "="
        notebook_store.update_line(index, {
            error: undefined,
            error_hint: undefined,
            result: `${original_content} \\color{#c084fc}{${mathjax_algebrite_result}}`,
            answer: undefined,
            declaration: undefined,
            plot_data: undefined,
        });

        return;
    }

    notebook_store.update_line(index, { // other wise just add the answer to the answer column
        error: undefined,
        error_hint: undefined,
        result: original_content,
        answer: mathjax_algebrite_result,
        declaration: undefined,
        plot_data: undefined,
    });
}