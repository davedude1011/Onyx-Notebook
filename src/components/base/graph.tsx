import { useEffect, useRef } from "react"
import functionPlot, { type FunctionPlotDatum } from "function-plot"

export default function Graph({data}: {data: FunctionPlotDatum[]}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      functionPlot({
        target: ref.current,
        width: 800,
        height: 400,
        grid: true,
        data: data
      })
    }
  }, [])

  return <div ref={ref} />
}
