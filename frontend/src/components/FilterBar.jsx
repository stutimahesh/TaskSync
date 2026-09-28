import { useEffect, useRef } from "react";
import { PRIORITIES } from "../lib/constants.js";
import { EMPTY_FILTERS, isFiltering } from "../lib/filters.js";
import { CloseIcon, FilterIcon, SearchIcon } from "./Icons.jsx";

export default function FilterBar({ filters, onChange, members, shown, total }) {
  const searchRef = useRef(null);
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const active = isFiltering(filters);

  // Press "/" anywhere on the board to jump to search.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="toolbar">
      <label className="search-box">
        <SearchIcon size={16} />
        <input
          ref={searchRef}
          value={filters.q}
          onChange={set("q")}
          onKeyDown={(e) => e.key === "Escape" && onChange({ ...filters, q: "" })}
          placeholder="Search tasks..."
          aria-label="Search tasks"
        />
        <kbd>/</kbd>
      </label>

      <div className="toolbar-filters">
        <FilterIcon size={16} className="toolbar-icon" />
        <select className={`select chip-select ${filters.priority ? "active" : ""}`} value={filters.priority} onChange={set("priority")} aria-label="Filter by priority">
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select className={`select chip-select ${filters.assignee ? "active" : ""}`} value={filters.assignee} onChange={set("assignee")} aria-label="Filter by assignee">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select className={`select chip-select ${filters.due ? "active" : ""}`} value={filters.due} onChange={set("due")} aria-label="Filter by due date">
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Due in 7 days</option>
          <option value="none">No due date</option>
        </select>

        {active && (
          <button className="btn btn-ghost btn-sm" onClick={() => onChange(EMPTY_FILTERS)}>
            <CloseIcon size={14} /> Clear
          </button>
        )}
      </div>

      <span className="toolbar-count">
        {active ? `${shown} of ${total} tasks` : `${total} task${total === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}
