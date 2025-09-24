import { create } from 'zustand'

interface PreferencesState {
    algebrite_latex: boolean,

    set_preferences: (preferences: Partial<PreferencesState>) => void;
}

export const use_preferences_store = create<PreferencesState>()((set) => ({
    algebrite_latex: true,

    set_preferences: (patch) => set(patch),
}))