// @ts-expect-error
import algebrite from "algebrite"

import { use_notebook_store } from "../data/notebook";
import { FunctionPlotDatum } from "function-plot";

export default function plot(index: number) {
    const notebook_store = use_notebook_store.getState();
    const line_data = notebook_store.lines[index];

    if (line_data.format_tag != ".p") return;
    if (!line_data) return;

    const content = line_data.content
                        .replace(line_data.format_tag, "")
                        .trimStart()
                        .split(",");
    
    const plot_data = [] as FunctionPlotDatum[];

    for (let part of content) {
        part = part.trimStart().trimEnd();

        const polynomial_regex = /^[+-]?\s*(\d+(\.\d+)?\s*\*?\s*)?[a-zA-Z](\^\d+)?(\s*[+-]\s*(\d+(\.\d+)?\s*\*?\s*)?[a-zA-Z](\^\d+)?|\s*[+-]\s*\d+(\.\d+)?)*$/;
        if (polynomial_regex.test(part.trim())) {
            plot_data.push({
                fn: part,
            })
        }
    }

    notebook_store.update_line(index, {
        error: undefined,
        error_hint: undefined,
        result: content.join(", "),
        answer: undefined,
        declaration: undefined,
        plot_data: plot_data,
    });

    console.log(content)
}