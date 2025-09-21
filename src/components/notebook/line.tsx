import { type ChangeEvent, memo, useEffect, useRef } from "react";
import calculate from "../../calculator/calculator";
import { type format_tag_t, use_notebook_store } from "../../data/store"
import { MathJax } from "better-react-mathjax";

const MemoizedMathjaxLine = memo(({ content, onClick, className }: { content: string, onClick: () => void, className: string }) => {
    return (
        <MathJax className={className} onClick={onClick}>
            $$
            {content}
            $$
        </MathJax>
    );
}, (prev_props, next_props) => {
    // Only re-render if content actually changed
    return prev_props.content === next_props.content;
})

export default function NotebookLineElement({ index }: { index: number }) {
    const focussed_index = use_notebook_store((state) => state.focussed_index);
    const line_data = use_notebook_store((state) => state.lines[index]);

    const update_line = use_notebook_store((state) => state.update_line);

    const set_focussed_index = use_notebook_store((state) => state.set_focussed_index);
    const increment_focussed_index = use_notebook_store((state) => state.increment_focussed_index);
    const remove_line = use_notebook_store((state) => state.remove_line);
    const insert_line = use_notebook_store((state) => state.insert_line);


    const input_ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!input_ref.current) return;
        if (focussed_index != index) return;
        input_ref.current.focus();
    }, [input_ref, focussed_index])


    const on_input_change = (e: ChangeEvent<HTMLInputElement>) => {
        let content = e.target.value;
        const format_tag = (content.match(/^\.(.)/)?.[0] ?? ".m") as format_tag_t;

        update_line(index, { content, format_tag });

        if (format_tag == ".m") calculate(index);
    }


    return (
        <div className="flex flex-row">
            <div className="min-w-12 flex items-center justify-center">
                {
                    line_data.content.length > 0 ? <div>{index + 1}</div> :
                    focussed_index == index ? <div className="font-thin">{index + 1}</div> :
                    null
                }
            </div>

            {
                focussed_index === index ? (
                    <input
                        className="flex-1 h-10 focus:outline-none border-b border-b-gray-500/10 focus:border-b-gray-500/40 rounded-sm px-2"

                        ref={input_ref}

                        value={line_data.content}
                        onChange={on_input_change}

                        onBlur={() => set_focussed_index(-1)}

                        onKeyDown={(e) => {
                            switch (e.key) {
                                case "ArrowUp":
                                    if (e.ctrlKey) { break; } // goes to start of line

                                    e.preventDefault();
                                    if (e.shiftKey) { set_focussed_index(0); break; } // focusses first line
                                    
                                    if (index == 0) break;
                                    increment_focussed_index(-1);
                                    break
                                
                                case "Backspace":
                                    if (index == 0) break;
                                    if (line_data.content.length > 0 || e.shiftKey) break;
                                    e.preventDefault();
                                    remove_line(index);
                                    increment_focussed_index(-1);
                                    break;
                                
                                case "ArrowDown":
                                    if (e.ctrlKey) { break; } // goes to end of line

                                    e.preventDefault();
                                    
                                    increment_focussed_index(+1);
                                    break;
                                
                                case "Enter":
                                    if (e.shiftKey) { // creates new line above
                                        insert_line(index);
                                        increment_focussed_index(0);
                                        break;
                                    }

                                    insert_line(index+1);
                                    increment_focussed_index(+1);
                                    break;
                            }
                        }}
                    />
                ) :

                line_data.format_tag === ".m" ? (
                    <MemoizedMathjaxLine
                        className="flex-1 flex items-center min-h-10 focus:outline-none border-b border-b-gray-500/10 focus:border-b-gray-500/40 rounded-sm px-2"
                        onClick={() => set_focussed_index(index)}
                        content={line_data.result ?? line_data.content}
                    />
                ) :

                line_data.format_tag === ".r" ? (
                    <div
                        className="flex-1 flex items-center min-h-10 focus:outline-none border-b border-b-gray-500/10 focus:border-b-gray-500/40 rounded-sm px-2"
                        onClick={() => set_focussed_index(index)}
                    >
                        {line_data.content.replace(".r", "").trimStart()}
                    </div>
                ) :

                null
            }

            {
                line_data.answer && (
                    <div className="w-fit text-blue-500 font-bold px-2 flex items-center justify-center">
                        {line_data.answer}
                    </div>
                )
            }

            {
                line_data.error_hint && (
                    <div
                        className="w-fit px-2 flex items-center justify-center"
                        title={line_data.error}
                    >
                        {line_data.error_hint}
                    </div>
                )
            }

            <div className="min-w-12 flex items-center justify-center text-center">
                {
                    focussed_index == index ? <div className="font-thin">{line_data.format_tag}</div> :
                    null
                }
            </div>
        </div>
    )
}