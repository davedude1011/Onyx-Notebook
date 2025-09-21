import { create } from 'zustand'

export type format_tag_t = ".m" | ".r";

export type notebook_line_t = {
    content: string,
    format_tag: format_tag_t,

    declarations?: [string, string][], // x = 12 + 3 -> ["x", "12 + 3"]
    error?: string,
    error_hint?: string,
    result?: string, // entire expression, not just answer "12 + 3 = " -> "12 + 3 = 15"
    answer?: string, // just answer "12 + 3" -> "15"
}

interface NotebookState {
    lines: notebook_line_t[],
    focussed_index: number,
    
    update_line: (index: number, patch: Partial<notebook_line_t>) => void;
    remove_line: (index: number) => void;
    insert_line: (index: number) => void;

    set_focussed_index: (index: number) => void;
    increment_focussed_index: (increment: number) => void;
}

export const use_notebook_store = create<NotebookState>()((set) => ({
    lines: [...Array(30).keys()].map(_ => ({ content: "", format_tag: ".m" })),
    focussed_index: -1,
    
    update_line: (index, patch) => set((state) => {
        const lines = state.lines.map((line, i) => index == i ? { ...line, ...patch } : line);
        console.log(state.lines);
        return { lines };
    }),
    remove_line: (index) => set((state) => ({ lines: state.lines.filter((_, i) => i !== index) })),
    insert_line: (index) => set((state) => {
        const lines = [...state.lines];
        lines.splice(index, 0, { content: "", format_tag: ".m" });
        return { lines };
    }),

    set_focussed_index: (index) => set({ focussed_index: index }),
    increment_focussed_index: (increment) => set((state) => {
        let focussed_index = state.focussed_index + increment;
        let lines = [...state.lines];

        if (focussed_index >= lines.length) {
            const offset = (lines.length - state.focussed_index - 1) + increment;
            for (let i = 0; i < offset; i++) {
                lines.push({ content: "", format_tag: ".m" });
            }
        }

        return { lines, focussed_index };
    }),
}))