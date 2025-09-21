import NotebookLineElement from "./components/notebook/line";
import { use_notebook_store } from "./data/store"

export default function App() {
  const line_count = use_notebook_store((state) => state.lines.length);

  return (
    <div className="py-4 bg-white min-w-screen min-h-screen h-fit w-fit overflow-scroll">
      {
        [...Array(line_count).keys()] // [0 ... line_count-1]
          .map(index => <NotebookLineElement index={index} />)
      }
    </div>
  )
}