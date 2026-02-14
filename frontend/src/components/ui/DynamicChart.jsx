import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

// Professional color palette
const COLORS = [
  'rgba(59, 130, 246, 0.85)',   // Blue
  'rgba(16, 185, 129, 0.85)',   // Emerald
  'rgba(245, 158, 11, 0.85)',   // Amber
  'rgba(239, 68, 68, 0.85)',    // Red
  'rgba(139, 92, 246, 0.85)',   // Purple
  'rgba(236, 72, 153, 0.85)',   // Pink
  'rgba(6, 182, 212, 0.85)',    // Cyan
  'rgba(249, 115, 22, 0.85)',   // Orange
  'rgba(34, 197, 94, 0.85)',    // Green
  'rgba(168, 85, 247, 0.85)',   // Violet
];

const BORDER_COLORS = [
  'rgba(59, 130, 246, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(245, 158, 11, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(236, 72, 153, 1)',
  'rgba(6, 182, 212, 1)',
  'rgba(249, 115, 22, 1)',
  'rgba(34, 197, 94, 1)',
  'rgba(168, 85, 247, 1)',
];

// Gradient colors for line/bar charts
const GRADIENT_COLORS = [
  { start: 'rgba(59, 130, 246, 0.3)', end: 'rgba(59, 130, 246, 0.02)' },
  { start: 'rgba(16, 185, 129, 0.3)', end: 'rgba(16, 185, 129, 0.02)' },
  { start: 'rgba(245, 158, 11, 0.3)', end: 'rgba(245, 158, 11, 0.02)' },
  { start: 'rgba(239, 68, 68, 0.3)', end: 'rgba(239, 68, 68, 0.02)' },
];

// Format numbers for display
function formatNumber(value, options = {}) {
  const { format = 'number', decimals = 0, currency = 'USD' } = options;

  if (value === null || value === undefined) return '';

  const num = Number(value);

  if (format === 'currency') {
    if (Math.abs(num) >= 1e9) {
      return `$${(num / 1e9).toFixed(1)}B`;
    } else if (Math.abs(num) >= 1e6) {
      return `$${(num / 1e6).toFixed(1)}M`;
    } else if (Math.abs(num) >= 1e3) {
      return `$${(num / 1e3).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: decimals }).format(num);
  }

  if (format === 'percent') {
    return `${num.toFixed(decimals)}%`;
  }

  if (format === 'compact') {
    if (Math.abs(num) >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    } else if (Math.abs(num) >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (Math.abs(num) >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    }
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(num);
}

// Calculate percentage for pie/doughnut
function calculatePercentage(value, total) {
  return ((value / total) * 100).toFixed(1);
}

export default function DynamicChart({ chartData }) {
  const chartRef = useRef(null);

  if (!chartData || !chartData.type) {
    return null;
  }

  const {
    type,
    labels,
    datasets,
    title,
    options: customOptions,
    format = 'number', // 'number', 'currency', 'percent', 'compact'
    showDataLabels = true,
    showGrid = true,
    animated = true,
  } = chartData;

  const isPieOrDoughnut = type === 'pie' || type === 'doughnut';

  // Calculate total for percentage calculations
  const total = isPieOrDoughnut && datasets[0]?.data
    ? datasets[0].data.reduce((a, b) => a + b, 0)
    : 0;

  // Process datasets with enhanced styling
  const processedDatasets = datasets.map((dataset, index) => {
    const baseConfig = {
      ...dataset,
      borderWidth: dataset.borderWidth || (isPieOrDoughnut ? 2 : 2),
    };

    if (isPieOrDoughnut) {
      return {
        ...baseConfig,
        backgroundColor: dataset.backgroundColor || COLORS.slice(0, dataset.data?.length || COLORS.length),
        borderColor: dataset.borderColor || BORDER_COLORS.slice(0, dataset.data?.length || BORDER_COLORS.length),
        hoverOffset: 8,
        hoverBorderWidth: 3,
      };
    }

    if (type === 'line') {
      return {
        ...baseConfig,
        backgroundColor: dataset.backgroundColor || COLORS[index % COLORS.length],
        borderColor: dataset.borderColor || BORDER_COLORS[index % BORDER_COLORS.length],
        tension: dataset.tension ?? 0.4,
        fill: dataset.fill ?? true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: BORDER_COLORS[index % BORDER_COLORS.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
      };
    }

    // Bar chart
    return {
      ...baseConfig,
      backgroundColor: dataset.backgroundColor || COLORS[index % COLORS.length],
      borderColor: dataset.borderColor || BORDER_COLORS[index % BORDER_COLORS.length],
      borderRadius: 6,
      borderSkipped: false,
      hoverBackgroundColor: BORDER_COLORS[index % BORDER_COLORS.length],
    };
  });

  const data = {
    labels,
    datasets: processedDatasets,
  };

  // Enhanced options with better formatting
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 800,
      easing: 'easeOutQuart',
    } : false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: isPieOrDoughnut ? 'right' : 'top',
        align: 'center',
        labels: {
          color: 'rgb(156, 163, 175)',
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
            weight: '500',
          },
          generateLabels: isPieOrDoughnut ? (chart) => {
            const dataset = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => ({
              text: `${label} (${calculatePercentage(dataset.data[i], total)}%)`,
              fillStyle: COLORS[i % COLORS.length],
              strokeStyle: BORDER_COLORS[i % BORDER_COLORS.length],
              lineWidth: 2,
              hidden: false,
              index: i,
              pointStyle: 'circle',
            }));
          } : undefined,
        },
      },
      title: {
        display: !!title,
        text: title || '',
        color: 'rgb(209, 213, 219)',
        font: {
          size: 16,
          weight: '600',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgb(243, 244, 246)',
        bodyColor: 'rgb(209, 213, 219)',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        titleFont: {
          size: 13,
          weight: '600',
        },
        bodyFont: {
          size: 12,
        },
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? context.parsed;
            const label = context.dataset.label || context.label || '';

            if (isPieOrDoughnut) {
              const percentage = calculatePercentage(context.raw, total);
              return `${label}: ${formatNumber(context.raw, { format })} (${percentage}%)`;
            }

            return `${label}: ${formatNumber(value, { format })}`;
          },
        },
      },
      datalabels: {
        display: showDataLabels,
        color: isPieOrDoughnut ? '#fff' : 'rgb(107, 114, 128)',
        font: {
          size: isPieOrDoughnut ? 11 : 10,
          weight: '600',
        },
        formatter: (value, context) => {
          if (isPieOrDoughnut) {
            const percentage = calculatePercentage(value, total);
            return percentage > 5 ? `${percentage}%` : '';
          }
          if (type === 'bar' && showDataLabels) {
            return formatNumber(value, { format: 'compact' });
          }
          return '';
        },
        anchor: isPieOrDoughnut ? 'center' : 'end',
        align: isPieOrDoughnut ? 'center' : 'top',
        offset: isPieOrDoughnut ? 0 : 4,
      },
    },
    scales: !isPieOrDoughnut ? {
      x: {
        grid: {
          display: showGrid,
          color: 'rgba(75, 85, 99, 0.15)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
            weight: '500',
          },
          padding: 8,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          display: showGrid,
          color: 'rgba(75, 85, 99, 0.15)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
            weight: '500',
          },
          padding: 12,
          callback: (value) => formatNumber(value, { format: format === 'currency' ? 'currency' : 'compact' }),
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    } : undefined,
    layout: {
      padding: {
        top: 10,
        right: isPieOrDoughnut ? 20 : 10,
        bottom: 10,
        left: 10,
      },
    },
  };

  // Merge with custom options
  const options = {
    ...defaultOptions,
    ...customOptions,
    plugins: {
      ...defaultOptions.plugins,
      ...customOptions?.plugins,
    },
  };

  const ChartComponent = {
    bar: Bar,
    line: Line,
    pie: Pie,
    doughnut: Doughnut,
  }[type] || Bar;

  // Calculate chart height based on type
  const chartHeight = isPieOrDoughnut ? '320px' : '300px';

  return (
    <div className="w-full my-4 p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800/80 dark:to-slate-900/80 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="relative" style={{ height: chartHeight }}>
        <ChartComponent ref={chartRef} data={data} options={options} />
      </div>
      {/* Data summary footer */}
      {isPieOrDoughnut && total > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
            Total: <span className="font-semibold text-gray-700 dark:text-slate-300">{formatNumber(total, { format })}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Utility function to parse chart data from message content (supports multiple charts)
export function parseChartFromContent(content) {
  if (!content || typeof content !== 'string') {
    return { text: content, charts: [] };
  }

  const chartRegex = /<<<chart>>>([\s\S]*?)<<<chart>>>/g;
  const charts = [];
  let text = content;
  let match;

  while ((match = chartRegex.exec(content)) !== null) {
    try {
      const chartJson = match[1].trim();
      const chartData = JSON.parse(chartJson);
      charts.push(chartData);
    } catch (error) {
      console.error('Failed to parse chart data:', error);
    }
  }

  // Remove all chart blocks from text
  text = content.replace(/<<<chart>>>[\s\S]*?<<<chart>>>/g, '').trim();

  return { text, charts };
}
