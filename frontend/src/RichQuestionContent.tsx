type RichQuestionContentProps = {
  content: string;
};

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "chart"; rows: Array<{ label: string; value: number }> };

export function RichQuestionContent({ content }: RichQuestionContentProps) {
  const blocks = parseContentBlocks(content);

  return (
    <div className="rich-question-content">
      {blocks.map((block, index) => {
        if (block.type === "table") {
          const [head, ...body] = block.rows;

          return (
            <div className="question-table-wrap" key={index}>
              <table className="question-table">
                {head && (
                  <thead>
                    <tr>
                      {head.map((cell, cellIndex) => (
                        <th key={cellIndex}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "chart") {
          const maxValue = Math.max(...block.rows.map((row) => row.value), 1);

          return (
            <div className="question-chart" key={index}>
              {block.rows.map((row) => (
                <div className="question-chart-row" key={row.label}>
                  <span>{row.label}</span>
                  <div>
                    <i style={{ width: `${Math.max(8, (row.value / maxValue) * 100)}%` }} />
                  </div>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          );
        }

        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}

function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();

    if (text) {
      blocks.push({ type: "paragraph", text });
    }

    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (isChartStart(line)) {
      flushParagraph();
      const chartLines: string[] = [];
      index += 1;

      while (index < lines.length && !isChartEnd(lines[index].trim())) {
        if (lines[index].trim()) {
          chartLines.push(lines[index].trim());
        }
        index += 1;
      }

      const chartRows = chartLines.map(parseChartRow).filter((row): row is { label: string; value: number } => Boolean(row));

      if (chartRows.length > 0) {
        blocks.push({ type: "chart", rows: chartRows });
      }

      continue;
    }

    if (looksLikeTableLine(line)) {
      flushParagraph();
      const tableLines = [line];

      while (index + 1 < lines.length && looksLikeTableLine(lines[index + 1].trim())) {
        index += 1;
        tableLines.push(lines[index].trim());
      }

      const rows = tableLines
        .filter((row) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row))
        .map(parseTableRow)
        .filter((row) => row.length > 0);

      if (rows.length > 0) {
        blocks.push({ type: "table", rows });
      }

      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: content.trim() }];
}

function isChartStart(line: string) {
  return /^\[(?:chart|biểu\s*đồ|bieu\s*do)\]$/i.test(line);
}

function isChartEnd(line: string) {
  return /^\[\/(?:chart|biểu\s*đồ|bieu\s*do)\]$/i.test(line);
}

function parseChartRow(line: string) {
  const parts = line.includes("|") ? line.split("|") : line.split(":");
  const label = parts[0]?.trim();
  const value = Number(parts.slice(1).join(":").trim().replace(",", "."));

  if (!label || !Number.isFinite(value)) {
    return null;
  }

  return { label, value };
}

function looksLikeTableLine(line: string) {
  return line.includes("|") && line.split("|").filter((cell) => cell.trim()).length >= 2;
}

function parseTableRow(line: string) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}
