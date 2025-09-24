import Graph from "./components/base/graph";
import NotebookLineElement from "./components/notebook/line";
import { use_notebook_store } from "./data/notebook"

export default function App() {
  const line_count = use_notebook_store((state) => state.lines.length);

  return (
    <div className="py-4 bg-[#1a1a1a] text-white min-h-screen h-fit w-screen">
      {
        [...Array(line_count).keys()] // [0 ... line_count-1]
          .map(index => <NotebookLineElement index={index} />)
      }
    </div>
  )
}