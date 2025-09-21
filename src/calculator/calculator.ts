// @ts-expect-error
import algebrite from "algebrite"

import { use_notebook_store } from "../data/store";
import { convert_based_numbers_to_decimal, parse_infix_to_onyx, parse_onyx_to_infix } from "./parser";

export default function calculate(index: number) {
    const notebook_store = use_notebook_store.getState();
    const line_data = notebook_store.lines[index];

    if (line_data.format_tag != ".m") return;
    if (!line_data) return;

    const content_with_bases = line_data.content
                        .replace(line_data.format_tag, "")
                        .trimStart();

    const content = convert_based_numbers_to_decimal(line_data.content)
                        .replace(line_data.format_tag, "")
                        .trimStart();

    let infix_content = parse_onyx_to_infix(content);

    const infix_content_ends_with_equals = infix_content.endsWith("=");
    if (infix_content_ends_with_equals) {
        infix_content = infix_content
                            .slice(0, infix_content.length-1)
                            .trim();
    }
    
    const algebrite_result: string = algebrite.run(infix_content);
    console.log("after", algebrite_result)

    if (algebrite_result.includes("\n")) {
        const error_hint = algebrite_result
                                .split("\n")[1]
                                .replace("Stop:", "")
                                .trim();

        notebook_store.update_line(index, {
            error: algebrite_result,
            error_hint: error_hint,
            result: `${content_with_bases} \\quad \\color{red}{\\text{${error_hint}}}`,
            answer: undefined,
        });

        return;
    }

    const mathjax_algebrite_result = parse_infix_to_onyx(algebrite_result);

    if (infix_content_ends_with_equals) { // only append answer to result, if equation ends with "="
        notebook_store.update_line(index, {
            error: undefined,
            error_hint: undefined,
            result: `${content_with_bases} \\color{blue}{${mathjax_algebrite_result}}`,
            answer: undefined,
        });

        console.log(`${content_with_bases} \\color{blue}{${mathjax_algebrite_result}}`)

        return;
    }

    notebook_store.update_line(index, { // other wise just add the answer to the answer column
        error: undefined,
        error_hint: undefined,
        result: content_with_bases,
        answer: mathjax_algebrite_result,
    });
}