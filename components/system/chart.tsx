"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChartConfiguration, ChartData, ChartOptions, ChartType } from "chart.js";
import { Chart as ChartJS } from "chart.js/auto";

type ChartProps<TType extends ChartType = ChartType> = {
  type: TType;
  data: ChartData<TType>;
  options?: ChartOptions<TType>;
  className?: string;
};

export function ChartCanvas<TType extends ChartType>({
  type,
  data,
  options,
  className,
}: ChartProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  const config = useMemo(
    () => ({
      type,
      data,
      options,
    }),
    [type, data, options],
  );

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    chartInstance.current?.destroy();

    chartInstance.current = new ChartJS(
      canvasRef.current,
      config as ChartConfiguration,
    );

    return () => {
      chartInstance.current?.destroy();
    };
  }, [config]);

  return <canvas ref={canvasRef} className={className} />;
}
