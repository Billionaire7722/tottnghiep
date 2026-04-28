import type { SVGProps } from "react";

export type IconName =
  | "arrowLeft"
  | "award"
  | "book"
  | "briefcase"
  | "check"
  | "clipboard"
  | "download"
  | "edit"
  | "file"
  | "fileText"
  | "home"
  | "image"
  | "leaf"
  | "logOut"
  | "more"
  | "play"
  | "plus"
  | "search"
  | "shield"
  | "spark"
  | "stethoscope"
  | "trash"
  | "trophy"
  | "upload"
  | "user"
  | "video"
  | "x";

const paths: Record<IconName, string[]> = {
  arrowLeft: ["M19 12H5", "M12 19l-7-7 7-7"],
  award: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M9 14l-1 7 4-2 4 2-1-7"],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"],
  briefcase: ["M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1", "M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z", "M3 13h18"],
  check: ["M20 6 9 17l-5-5"],
  clipboard: ["M9 4h6", "M9 2h6v4H9z", "M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1", "M8 13l3 3 5-6"],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6"],
  fileText: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6", "M8 13h8", "M8 17h5"],
  home: ["M3 11 12 3l9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  image: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M8.5 9.5h.01", "M21 15l-5-5L5 21"],
  leaf: ["M5 21c8-1 14-7 14-18-8 0-14 6-14 14v4Z", "M5 21c3-5 7-8 14-11"],
  logOut: ["M10 17l5-5-5-5", "M15 12H3", "M21 3v18h-6"],
  more: ["M12 5h.01", "M12 12h.01", "M12 19h.01"],
  play: ["M8 5v14l11-7Z"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "M21 21l-4.3-4.3"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "M9 12l2 2 4-5"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z", "M19 16v4", "M17 18h4"],
  stethoscope: ["M6 4v5a4 4 0 0 0 8 0V4", "M14 13a4 4 0 0 0 8 0v-2", "M22 11a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 16h10l1-16", "M10 11v6", "M14 11v6"],
  trophy: ["M8 21h8", "M12 17v4", "M7 4h10v6a5 5 0 0 1-10 0V4Z", "M7 6H4a3 3 0 0 0 3 5", "M17 6h3a3 3 0 0 1-3 5"],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M5 20h14"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  video: ["M4 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z", "M18 10l4-2v8l-4-2"],
  x: ["M18 6 6 18", "M6 6l12 12"]
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      {paths[name].map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ))}
    </svg>
  );
}
