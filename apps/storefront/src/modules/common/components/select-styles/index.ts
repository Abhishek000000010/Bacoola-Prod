import type { StylesConfig } from "react-select"

/**
 * Shared react-select look, kept in step with NativeSelect's dropdown so the
 * State/City fields and the Country field read as the same control.
 */
export const formSelectStyles: StylesConfig<any, false> = {
  // `inherit` everywhere keeps react-select on the wrapper's responsive
  // text-[12px] lg:text-[14px] instead of its own fixed size.
  control: (base, state) => ({
    ...base,
    fontSize: "inherit",
    // Exactly the h-12 of the Input/NativeSelect fields, not react-select's
    // taller default -- the height difference is what made these two look big.
    minHeight: "48px",
    height: "48px",
    borderRadius: 0,
    boxShadow: "none",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderColor: state.isFocused ? "#000000" : "#d4d4d4",
    ":hover": { borderColor: state.isFocused ? "#000000" : "#a3a3a3" },
    paddingLeft: "8px",
    transition: "border-color 150ms",
  }),
  valueContainer: (base) => ({ ...base, paddingTop: "16px" }),
  indicatorSeparator: () => ({ display: "none" }),
  // react-select's own indicator is a 20px glyph in 8px padding; the Country
  // field's chevron is 14px sitting 16px from the edge, so match that.
  dropdownIndicator: (base, state) => ({
    ...base,
    color: "#404040",
    padding: "0 16px 0 8px",
    transition: "transform 200ms",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
    ":hover": { color: "#404040" },
    "& svg": { width: "14px", height: "14px" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    marginTop: "-1px",
    borderRadius: 0,
    border: "1px solid #000000",
    boxShadow: "none",
    overflow: "hidden",
    fontSize: "inherit",
    animation: "select-slide-down 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: "240px",
    paddingTop: "4px",
    paddingBottom: "4px",
  }),
  placeholder: (base) => ({ ...base, fontSize: "inherit", color: "#a3a3a3" }),
  singleValue: (base) => ({ ...base, fontSize: "inherit", color: "#0a0a0a" }),
  input: (base) => ({ ...base, fontSize: "inherit", color: "#0a0a0a" }),
  option: (base, state) => ({
    ...base,
    fontSize: "inherit",
    cursor: state.isDisabled ? "default" : "pointer",
    padding: "10px 16px",
    backgroundColor: state.isFocused ? "#f5f5f5" : "#ffffff",
    color: state.isDisabled ? "#d4d4d4" : "#0a0a0a",
    fontWeight: state.isSelected ? 500 : 400,
    ":active": { backgroundColor: "#f5f5f5" },
  }),
}
